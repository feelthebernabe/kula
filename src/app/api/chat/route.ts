import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiClient } from "@/lib/gemini";
import { CATEGORIES } from "@/lib/constants/categories";
import type { ChatPost } from "@/types/chat";
import type {
  Content,
  FunctionDeclaration,
  Part,
  Type,
} from "@google/genai";

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

const tools: FunctionDeclaration[] = [
  {
    name: "search_posts",
    description:
      "Search community posts by keywords. Use this to find offers or requests matching what the user is looking for.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        keywords: {
          type: "STRING" as Type,
          description: "Search keywords",
        },
        category: {
          type: "STRING" as Type,
          description: `Optional category filter. One of: ${categoryEnum.join(", ")}`,
        },
        type: {
          type: "STRING" as Type,
          description:
            'Optional type filter: "offer" or "request". Use "offer" when user is LOOKING FOR something, "request" when user WANTS TO HELP with something.',
        },
        limit: {
          type: "NUMBER" as Type,
          description: "Max results to return (default 5)",
        },
      },
      required: ["keywords"],
    },
  },
  {
    name: "get_post_details",
    description:
      "Get full details of a specific post including the author's bio and skills.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        post_id: {
          type: "STRING" as Type,
          description: "The post ID to look up",
        },
      },
      required: ["post_id"],
    },
  },
  {
    name: "browse_category",
    description:
      "Browse all active posts in a specific category. Good for exploring what's available.",
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
          description: "Max results (default 5)",
        },
      },
      required: ["category"],
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
      result_limit: (args.limit as number) || 5,
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
      .limit((args.limit as number) || 5);

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        const client = getGeminiClient();

        // Build Gemini contents from message history
        const contents: Content[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }] as Part[],
          })
        );

        // Agentic loop: keep calling until no more function calls
        let loopCount = 0;
        const maxLoops = 5;

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
            // Handle text parts
            if (chunk.text) {
              fullText += chunk.text;
              send({ type: "text", content: chunk.text });
            }

            // Handle function calls
            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                if (part.functionCall) {
                  functionCalls.push({
                    name: part.functionCall.name!,
                    args: (part.functionCall.args as Record<string, unknown>) || {},
                  });
                }
              }
            }
          }

          // If no function calls, we're done
          if (functionCalls.length === 0) {
            break;
          }

          // Add the model's response to contents
          const modelParts: Part[] = [];
          if (fullText) {
            modelParts.push({ text: fullText });
          }
          for (const fc of functionCalls) {
            modelParts.push({
              functionCall: { name: fc.name, args: fc.args },
            });
          }
          contents.push({ role: "model", parts: modelParts });

          // Execute function calls and add responses
          const functionResponseParts: Part[] = [];
          for (const fc of functionCalls) {
            send({ type: "tool_call", name: fc.name, input: fc.args });

            let result;
            try {
              result = await executeToolCall(fc.name, fc.args);
            } catch (err) {
              result = {
                posts: [],
                raw: { error: `Tool ${fc.name} failed: ${err instanceof Error ? err.message : "unknown error"}` },
              };
            }

            if (result.posts.length > 0) {
              send({
                type: "tool_result",
                name: fc.name,
                data: result.posts,
              });
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
        console.error("[chat] Error:", err);
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
