import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGroqClient } from "@/lib/groq";
import { CATEGORIES } from "@/lib/constants/categories";
import { AI_ENABLED } from "@/lib/flags";
import type { ChatPost } from "@/types/chat";

// Simple in-memory rate limiter: max 10 requests per user per minute
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

const SYSTEM_INSTRUCTION = `You are Kula Assistant, a helpful AI for a neighborhood sharing network called Kula.
Members post offers (things they can share) and requests (things they need).
Help users find what they need by searching the community database.

When presenting results:
- Mention the author's name and trust score
- Highlight exchange modes (gifting, lending, time exchange, barter, etc.)
- Keep responses concise and friendly
- If no results found, suggest broadening the search or trying a different category
- Always search before saying you can't find something

Do NOT make up posts or information. Only reference actual search results.`;

const categoryEnum = CATEGORIES.map((c) => c.value);

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_posts",
      description:
        "Search community posts by keywords. Use this to find offers or requests matching what the user is looking for.",
      parameters: {
        type: "object",
        properties: {
          keywords: { type: "string", description: "Search keywords" },
          category: {
            type: "string",
            description: `Optional category filter. One of: ${categoryEnum.join(", ")}`,
          },
          type: {
            type: "string",
            description:
              'Optional type filter: "offer" or "request". Use "offer" when user is LOOKING FOR something, "request" when user WANTS TO HELP with something.',
          },
        },
        required: ["keywords"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_post_details",
      description:
        "Get full details of a specific post including the author's bio and skills.",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "The post ID to look up" },
        },
        required: ["post_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_category",
      description:
        "Browse all active posts in a specific category. Good for exploring what's available.",
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
];

async function executeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ posts: ChatPost[]; raw: unknown }> {
  const admin = createAdminClient();

  if (name === "search_posts") {
    const { data, error } = await admin.rpc("search_posts", {
      search_query: args.keywords as string,
      filter_category: (args.category as string) || undefined,
      filter_type: (args.type as string) || undefined,
      result_limit: Number(args.limit) || 5,
    });
    if (error) {
      console.error("[chat] search_posts RPC error:", error);
      return { posts: [], raw: { error: error.message } };
    }

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

  if (name === "get_post_details") {
    const { data, error } = await admin
      .from("posts")
      .select(
        `*, author:profiles!author_id(id, display_name, avatar_url, trust_score, bio, skills)`
      )
      .eq("id", args.post_id as string)
      .single();

    if (error) {
      console.error("[chat] get_post_details error:", error);
      return { posts: [], raw: { error: error.message } };
    }
    if (!data) return { posts: [], raw: { error: "Post not found" } };

    const author = data.author as Record<string, unknown> | null;
    const post: ChatPost = {
      id: data.id,
      title: data.title,
      body: data.body,
      type: data.type,
      category: data.category,
      exchange_modes: data.exchange_modes || [],
      status: data.status ?? "active",
      author_id: author?.id as string,
      author_name: (author?.display_name as string) || "Unknown",
      author_avatar: (author?.avatar_url as string) || null,
      author_trust_score: (author?.trust_score as number) || null,
    };

    return {
      posts: [post],
      raw: {
        ...post,
        body: post.body?.slice(0, 300),
        author_bio: (author?.bio as string)?.slice(0, 200),
        author_skills: author?.skills,
      },
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
      .limit(Number(args.limit) || 5);

    if (args.type) {
      query = query.eq("type", args.type as "offer" | "request");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[chat] browse_category error:", error);
      return { posts: [], raw: { error: error.message } };
    }

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!AI_ENABLED) {
    return new Response(JSON.stringify({ error: "AI features are temporarily disabled." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!checkRateLimit(user.id)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Missing messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Server-side validation: enforce 500 char limit and valid roles
  for (const msg of messages) {
    if (typeof msg.content !== "string" || msg.content.length > 500) {
      return new Response(JSON.stringify({ error: "Message too long (max 500 chars)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
          ...messages.map((m: { role: string; content: string }) => ({
            role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: m.content,
          })),
        ];

        let loopCount = 0;
        const maxLoops = 5;

        while (loopCount < maxLoops) {
          loopCount++;

          const groqStream = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: groqMessages as any,
            tools,
            tool_choice: "auto",
            parallel_tool_calls: false,
            stream: true,
          });

          let fullText = "";
          const toolCallAccumulator: Record<
            number,
            { id: string; name: string; arguments: string }
          > = {};

          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
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

            send({ type: "tool_call", name: tc.name, input: args });

            let result;
            try {
              result = await executeToolCall(tc.name, args);
            } catch (err) {
              result = {
                posts: [],
                raw: {
                  error: `Tool ${tc.name} failed: ${err instanceof Error ? err.message : "unknown error"}`,
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
        console.error("[chat] Error:", err);
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
