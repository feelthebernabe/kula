import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiClient } from "@/lib/gemini";
import { CATEGORIES } from "@/lib/constants/categories";
import type { ChatPost } from "@/types/chat";
import type { Content, FunctionDeclaration, Part, Type } from "@google/genai";

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

const SYSTEM_INSTRUCTION = `You are Kula — a warm, wise guide welcoming new visitors to the Kula sharing community.

Kula is a peer-to-peer network where neighbors exchange goods, skills, time, space, and experiences — no money needed. Named after the ancient Kula Ring, a ceremonial exchange system from the Pacific Islands that built trust across communities for generations. The philosophy: everyone has something to give, and everyone has something they need. There is room for everyone, regardless of what they have materially.

YOUR ROLE: Welcome each new visitor with warmth. Help them discover what they might offer and what they're hoping to find. Then show them what's already alive in the community. Finally, invite them to join.

---

CONVERSATION FLOW — move through these phases naturally over the course of the conversation:

**Phase 1 — Welcome & Explain** (your opening message)
Greet them warmly. Explain what Kula is about in an inviting, human way. Emphasize that exchange takes many forms: lending a power drill, sharing a meal, teaching a skill, offering a spare room, giving an hour of your time. There is room for everyone.

**Phase 2 — Discover Their Gifts** (2–3 exchanges)
Gently explore what this person might be able to share. Use open-ended questions. Some people don't immediately see what they have to offer — help them discover it. Offerings can be:
- Goods: things they own and could lend, share, or give away
- Skills: things they're good at (cooking, fixing things, teaching, languages, making art, coding, music)
- Time: helping someone move, childcare, companionship, errands, cooking for someone
- Space: spare rooms, studios, gardens, driveways, communal space
- Experiences: guided walks, workshops, creative sessions, storytelling, cooking together

**Phase 3 — Discover Their Needs** (2–3 exchanges)
Ask what they're looking for, hoping for, or could use some help with. Be curious and non-judgmental. Needs can be practical (borrowing a ladder), social (finding community), educational (learning a language), or creative (collaborating on a project).

**Phase 4 — Show Community Matches** (use search tools)
Once you have a sense of their interests, search the community for relevant posts. Show them what's already happening — real neighbors they could connect with. Present these warmly as exciting possibilities, not a product catalog.

**Phase 5 — Invite to Join**
After at least 4 back-and-forth exchanges AND after showing some community matches, call extract_profile_data with everything you've learned. Then warmly invite them to create a free account and step fully into the Kula circle.

---

TONE & STYLE:
- Warm, curious, celebratory — every contribution matters, no matter how small
- Conversational — ask one or two questions at a time, never a questionnaire
- Empowering — help people realize the value they already carry
- Community-focused — use words like "neighbors," "the circle," "the community"
- Never pushy, never sales-y, never transactional
- Keep responses focused — this is a chat, not a lecture
- Do NOT ask for email, password, or any account details — those come later, automatically
- Do NOT make up posts or people — only reference real search results`;

const categoryEnum = CATEGORIES.map((c) => c.value);

const tools: FunctionDeclaration[] = [
  {
    name: "search_posts",
    description:
      "Search community posts by keywords to find offers or requests that match what the visitor mentioned.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        keywords: {
          type: "STRING" as Type,
          description: "Search keywords based on their interests or needs",
        },
        category: {
          type: "STRING" as Type,
          description: `Optional category filter. One of: ${categoryEnum.join(", ")}`,
        },
        type: {
          type: "STRING" as Type,
          description:
            'Optional: "offer" to find things available, "request" to find people seeking help',
        },
        limit: {
          type: "NUMBER" as Type,
          description: "Max results (default 4)",
        },
      },
      required: ["keywords"],
    },
  },
  {
    name: "browse_category",
    description:
      "Browse active posts in a specific category — good for showing what's available in an area of interest.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        category: {
          type: "STRING" as Type,
          description: `Category to browse. One of: ${categoryEnum.join(", ")}`,
        },
        type: {
          type: "STRING" as Type,
          description: 'Optional: "offer" or "request"',
        },
        limit: {
          type: "NUMBER" as Type,
          description: "Max results (default 4)",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "extract_profile_data",
    description:
      "Call this after at least 4 exchanges when you have a good picture of what the visitor can offer and what they need. Extracts their profile data to pre-fill the account creation form.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        offers: {
          type: "ARRAY" as Type,
          description:
            "List of things they can offer (skills, goods, time, space, experiences) — short phrases",
          items: { type: "STRING" as Type },
        },
        needs: {
          type: "ARRAY" as Type,
          description:
            "List of things they are looking for or need help with — short phrases",
          items: { type: "STRING" as Type },
        },
        skills: {
          type: "ARRAY" as Type,
          description:
            "Specific skills or expertise they mentioned — short phrases",
          items: { type: "STRING" as Type },
        },
        display_name: {
          type: "STRING" as Type,
          description: "Their name if they mentioned it during the conversation",
        },
        location: {
          type: "STRING" as Type,
          description:
            "Their location or neighborhood if they mentioned it during the conversation",
        },
      },
      required: ["offers", "needs", "skills"],
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
      result_limit: (args.limit as number) || 4,
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
      .limit((args.limit as number) || 4);

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

export async function POST(request: NextRequest) {
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
        const client = getGeminiClient();

        // Build Gemini contents
        let contents: Content[];

        if (messages.length === 0) {
          // First visit — inject a trigger to generate the welcome message
          contents = [
            {
              role: "user",
              parts: [
                {
                  text: "A new visitor has just arrived and is exploring Kula for the first time. Please welcome them warmly to the community.",
                },
              ] as Part[],
            },
          ];
        } else {
          contents = messages.map(
            (m: { role: string; content: string }) => ({
              role: m.role === "user" ? "user" : "model",
              parts: [{ text: m.content }] as Part[],
            })
          );
        }

        let loopCount = 0;
        const maxLoops = 6;

        while (loopCount < maxLoops) {
          loopCount++;

          const response = await client.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations: tools }],
            },
          });

          let fullText = "";
          let functionCalls: { name: string; args: Record<string, unknown> }[] =
            [];

          for await (const chunk of response) {
            if (chunk.text) {
              fullText += chunk.text;
              send({ type: "text", content: chunk.text });
            }

            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                if (part.functionCall) {
                  functionCalls.push({
                    name: part.functionCall.name!,
                    args:
                      (part.functionCall.args as Record<string, unknown>) || {},
                  });
                }
              }
            }
          }

          if (functionCalls.length === 0) break;

          // Add model response to contents
          const modelParts: Part[] = [];
          if (fullText) modelParts.push({ text: fullText });
          for (const fc of functionCalls) {
            modelParts.push({
              functionCall: { name: fc.name, args: fc.args },
            });
          }
          contents.push({ role: "model", parts: modelParts });

          // Execute tool calls
          const functionResponseParts: Part[] = [];

          for (const fc of functionCalls) {
            send({ type: "tool_call", name: fc.name });

            // Handle extract_profile_data specially
            if (fc.name === "extract_profile_data") {
              send({ type: "extracted_data", data: fc.args });
              send({ type: "signup_ready" });

              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: {
                    result: {
                      success: true,
                      message:
                        "Profile data captured successfully. Please now warmly invite the visitor to create their free account and join the Kula community.",
                    },
                  },
                },
              });
              continue;
            }

            let result;
            try {
              result = await executeToolCall(fc.name, fc.args);
            } catch (err) {
              result = {
                posts: [],
                raw: {
                  error: `Tool ${fc.name} failed: ${err instanceof Error ? err.message : "unknown"}`,
                },
              };
            }

            if (result.posts.length > 0) {
              send({ type: "tool_result", name: fc.name, data: result.posts });
            }

            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: { result: result.raw },
              },
            });
          }

          contents.push({ role: "user", parts: functionResponseParts });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[onboarding-chat] Error:", err);
        send({
          type: "error",
          message:
            err instanceof Error ? err.message : "Something went wrong",
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
