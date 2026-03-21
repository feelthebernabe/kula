import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGroqClient } from "@/lib/groq";
import { CATEGORIES } from "@/lib/constants/categories";
import { AI_ENABLED } from "@/lib/flags";
import type { ChatPost } from "@/types/chat";
import { collectFallbackStream, parseFunctionTags } from "@/lib/groq-fallback";

// Rate limit by IP: 30 requests per 5 minutes
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

const SYSTEM_INSTRUCTION = `You are Kula — the onboarding guide for a peer-to-peer community exchange platform. Your goal: quickly understand what a new visitor can offer and what they need, show them relevant community posts, then invite them to join.

Kula is a peer-to-peer network where neighbors exchange goods, skills, time, space, and experiences without money. The philosophy: everyone has something to give and something they need.

---

CONVERSATION FLOW — move through these phases efficiently:

Phase 1 — Welcome & hook (opening message only)
Brief, warm intro. One sentence on what Kula is. Ask directly: what brings them here, or what do they love doing / what are they good at? Don't spend more than a few sentences on the intro.

Phase 2 — Discover offers and needs (2-3 exchanges total, not each)
Ask about what they can share AND what they're looking for. You can cover both in 2-3 exchanges. Keep questions focused, not open-ended monologues. Offerings can be goods (tools, food), skills (cooking, coding, music), time (moving help, childcare, errands), space (rooms, gardens), or experiences (workshops, walks). Needs can be practical, social, educational, or creative.

Phase 3 — Show community matches (use search tools)
Once you have something to work with, search the community for relevant posts. Show them real neighbors they could connect with. Be specific about what you found, not vague.

Phase 4 — Invite to join
After 3-4 exchanges and showing some community matches, call extract_profile_data with everything you've learned. Then invite them to create a free account.

---

TONE:
- Warm and direct -- not gushing
- Do NOT echo-validate: skip "that's wonderful!", "how great!", "I love that" -- just respond and move on
- Don't restate what they said back to them
- Ask one question at a time
- Do NOT ask for email, password, or account details -- those come later automatically
- Do NOT make up posts or people -- only reference real search results`;

const categoryEnum = CATEGORIES.map((c) => c.value);

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_posts",
      description:
        "Search community posts by keywords to find offers or requests that match what the visitor mentioned.",
      parameters: {
        type: "object",
        properties: {
          keywords: {
            type: "string",
            description: "Search keywords based on their interests or needs",
          },
          category: {
            type: "string",
            description: `Optional category filter. One of: ${categoryEnum.join(", ")}`,
          },
          type: {
            type: "string",
            description:
              'Optional: "offer" to find things available, "request" to find people seeking help',
          },
        },
        required: ["keywords"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_category",
      description:
        "Browse active posts in a specific category — good for showing what's available in an area of interest.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: `Category to browse. One of: ${categoryEnum.join(", ")}`,
          },
          type: {
            type: "string",
            description: 'Optional: "offer" or "request"',
          },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extract_profile_data",
      description:
        "Call this after at least 4 exchanges when you have a good picture of what the visitor can offer and what they need. Extracts their profile data to pre-fill the account creation form.",
      parameters: {
        type: "object",
        properties: {
          offers: {
            type: "array",
            description:
              "List of things they can offer (skills, goods, time, space, experiences) — short phrases",
            items: { type: "string" },
          },
          needs: {
            type: "array",
            description:
              "List of things they are looking for or need help with — short phrases",
            items: { type: "string" },
          },
          skills: {
            type: "array",
            description:
              "Specific skills or expertise they mentioned — short phrases",
            items: { type: "string" },
          },
          display_name: {
            type: "string",
            description: "Their name if they mentioned it during the conversation",
          },
          location: {
            type: "string",
            description:
              "Their location or neighborhood if they mentioned it during the conversation",
          },
        },
        required: ["offers", "needs", "skills"],
      },
    },
  },
];

async function executeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ posts: ChatPost[]; raw: unknown }> {
  const admin = createAdminClient();

  if (name === "search_posts") {
    const { data } = await admin.rpc("search_posts", {
      search_query: args.keywords as string,
      filter_category: (args.category as string) || undefined,
      filter_type: (args.type as string) || undefined,
      result_limit: Number(args.limit) || 4,
    });

    const posts: ChatPost[] = (data || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      title: p.title as string,
      body: p.body as string | null,
      type: p.type as "offer" | "request",
      category: p.category as string,
      exchange_modes: (p.exchange_modes as string[]) || [],
      status: p.status as string,
      author_id: p.author_id as string,
      author_name: p.author_display_name as string,
      author_avatar: p.author_avatar_url as string | null,
      author_trust_score: p.author_trust_score as number | null,
    }));

    return {
      posts,
      raw: posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body?.slice(0, 200),
        type: p.type,
        category: p.category,
        exchange_modes: p.exchange_modes,
        author_name: p.author_name,
        author_trust_score: p.author_trust_score,
      })),
    };
  }

  if (name === "browse_category") {
    let query = admin
      .from("posts")
      .select(
        `*, author:profiles!author_id(id, display_name, avatar_url, trust_score)`
      )
      .eq("category", args.category as string)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(Number(args.limit) || 4);

    if (args.type) {
      query = query.eq("type", args.type as "offer" | "request");
    }

    const { data } = await query;

    const posts: ChatPost[] = (data || []).map((p: Record<string, unknown>) => {
      const author = p.author as Record<string, unknown> | null;
      return {
        id: p.id as string,
        title: p.title as string,
        body: p.body as string | null,
        type: p.type as "offer" | "request",
        category: p.category as string,
        exchange_modes: (p.exchange_modes as string[]) || [],
        status: p.status as string,
        author_id: author?.id as string,
        author_name: (author?.display_name as string) || "Unknown",
        author_avatar: (author?.avatar_url as string) || null,
        author_trust_score: (author?.trust_score as number) || null,
      };
    });

    return {
      posts,
      raw: posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body?.slice(0, 200),
        type: p.type,
        exchange_modes: p.exchange_modes,
        author_name: p.author_name,
        author_trust_score: p.author_trust_score,
      })),
    };
  }

  return { posts: [], raw: { error: "Unknown tool" } };
}

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export async function POST(request: NextRequest) {
  if (!AI_ENABLED) {
    return new Response(JSON.stringify({ error: "AI features are temporarily disabled." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const { messages } = body;

  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Missing messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate messages
  for (const msg of messages) {
    if (typeof msg.content !== "string" || msg.content.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 1000 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      return new Response(JSON.stringify({ error: "Invalid message role" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      try {
        const client = getGroqClient();

        const groqMessages: GroqMessage[] = [
          { role: "system", content: SYSTEM_INSTRUCTION },
        ];

        if (messages.length === 0) {
          // First visit — inject a trigger to generate the welcome message
          groqMessages.push({
            role: "user",
            content:
              "A new visitor has just arrived and is exploring Kula for the first time. Please welcome them warmly to the community.",
          });
        } else {
          for (const m of messages as { role: string; content: string }[]) {
            groqMessages.push({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content,
            });
          }
        }

        let loopCount = 0;
        const maxLoops = 6;

        while (loopCount < maxLoops) {
          loopCount++;

          let groqStream;
          try {
            groqStream = await client.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              messages: groqMessages as any,
              tools,
              tool_choice: "auto",
              parallel_tool_calls: false,
              stream: true,
            });
          } catch (toolErr) {
            // Groq failed_generation: model couldn't produce a valid tool call.
            // Retry without tools so the conversation continues as plain text.
            const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
            if (msg.includes("failed_generation") || msg.includes("Failed to call a function")) {
              groqStream = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                messages: groqMessages as any,
                stream: true,
              });
            } else {
              throw toolErr;
            }
          }

          let fullText = "";
          const toolCallAccumulator: Record<
            number,
            { id: string; name: string; arguments: string }
          > = {};

          try {
            for await (const chunk of groqStream) {
              const delta = chunk.choices[0]?.delta;

              if (delta?.content) {
                if (
                  delta.content.includes("failed_generation") ||
                  delta.content.includes("Failed to call a function")
                ) {
                  throw new Error("failed_generation");
                }
                fullText += delta.content;
                send({ type: "text", content: delta.content });
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index;
                  if (!toolCallAccumulator[idx]) {
                    toolCallAccumulator[idx] = { id: "", name: "", arguments: "" };
                  }
                  if (tc.id) toolCallAccumulator[idx].id = tc.id;
                  if (tc.function?.name) toolCallAccumulator[idx].name = tc.function.name;
                  if (tc.function?.arguments) {
                    toolCallAccumulator[idx].arguments += tc.function.arguments;
                  }
                }
              }
            }
          } catch (streamErr) {
            const streamMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
            if (
              streamMsg.includes("tool call validation failed") ||
              streamMsg.includes("failed_generation") ||
              streamMsg.includes("Failed to call a function")
            ) {
              const fallbackStream = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                messages: groqMessages as any,
                stream: true,
              });
              const { text: fbText } = await collectFallbackStream(fallbackStream);
              if (fbText) {
                fullText = fbText;
                send({ type: "replace_text", content: fbText });
              }
              break;
            }
            throw streamErr;
          }

          // Groq sometimes streams args embedded in the name field (e.g. voice input).
          // Sanitize: extract clean name and rescue any args that ended up there.
          const toolCalls = Object.values(toolCallAccumulator).map((tc) => {
            const braceIdx = tc.name.indexOf("{");
            if (braceIdx !== -1) {
              return {
                id: tc.id,
                name: tc.name.slice(0, braceIdx).trim(),
                arguments: tc.arguments || tc.name.slice(braceIdx),
              };
            }
            return tc;
          });

          // Groq sometimes emits tool calls as inline text instead of proper deltas.
          if (toolCalls.length === 0 && fullText.includes("<function=")) {
            const { text: cleanText } = parseFunctionTags(fullText);
            if (cleanText !== fullText) send({ type: "replace_text", content: cleanText });
          }

          if (toolCalls.length === 0) break;

          // Add assistant message with tool calls
          groqMessages.push({
            role: "assistant",
            content: fullText || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          // Execute tool calls and add responses
          for (const tc of toolCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.arguments);
            } catch {
              args = {};
            }

            send({ type: "tool_call", name: tc.name });

            // Handle extract_profile_data specially — no DB call needed
            if (tc.name === "extract_profile_data") {
              send({ type: "extracted_data", data: args });
              send({ type: "signup_ready" });

              groqMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify({
                  success: true,
                  message:
                    "Profile data captured successfully. Please now warmly invite the visitor to create their free account and join the Kula community.",
                }),
              });
              continue;
            }

            let result;
            try {
              result = await executeToolCall(tc.name, args);
            } catch (err) {
              result = {
                posts: [],
                raw: {
                  error: `Tool ${tc.name} failed: ${err instanceof Error ? err.message : "unknown"}`,
                },
              };
            }

            if (result.posts.length > 0) {
              send({ type: "tool_result", name: tc.name, data: result.posts });
            }

            groqMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result.raw),
            });
          }
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[onboarding-chat] Error:", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
