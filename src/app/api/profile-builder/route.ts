import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient } from "@/lib/groq";
import { AI_ENABLED } from "@/lib/flags";

// In-memory rate limit: 20 req / 5 min per user
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(
    (t) => now - t < 5 * 60_000
  );
  if (timestamps.length >= 20) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

const SYSTEM_INSTRUCTION = `You are running a quick skills intake for a community platform. Your job: find out what someone is into and good at, in as few exchanges as possible.

---

WHAT YOU'RE LOOKING FOR:
- Practical skills: carpentry, cooking, car repair, electronics, sewing, gardening, plumbing
- Teaching / knowledge: languages, coding, instruments, tutoring, coaching
- Physical: yoga, tennis, cycling, hiking, climbing, dancing, martial arts
- Creative: photography, painting, music, writing, design, ceramics
- Social: hosting, facilitation, storytelling, debate
- Experiential: guided walks, workshops, cooking together, foraging
- Care: massage, breathwork, meditation, hair/nails
- Life skills: financial literacy, job coaching, first aid, bureaucracy navigation
- Niche: anything obscure or unusual -- often the most sought-after

---

CONVERSATION APPROACH:
Ask ONE focused question at a time. Use the prompt chips to surface specific options -- your question just opens the door. After they respond, ask ONE follow-up to go a level deeper on something interesting they mentioned. Then move on.

Do NOT echo or validate: skip phrases like "that's great", "love that", "nice!", "how interesting" -- just pivot straight to the next question. Don't restate what they said back to them. Don't add filler.

After 3-4 exchanges you should have enough to generate suggestions. Don't drag it out.

---

PROMPT CHIPS (required every turn):
After every message, call suggest_prompts with 3-5 short options.

Options must be phrased as what the user would say (first person, casual) and specific enough to be meaningful.

Early turns (first 1-2 exchanges): span DIFFERENT life domains so users can self-select direction.
Good: "I love cooking" / "I'm into fitness" / "I make or build things" / "I play music" / "I work in tech" / "I'm outdoorsy" / "I work with people"

After they pick a direction: go deeper into that domain.
Good after fitness: "Running" / "Gym or weights" / "Yoga" / "Team sports" / "Cycling or swimming"
Good after music: "I play an instrument" / "I sing" / "I DJ or produce" / "I used to play"

Always include one option that opens a new direction so the conversation doesn't get tunnel-vision.

Do NOT call suggest_prompts in the same turn as generate_skill_suggestions.

---

WHEN TO GENERATE:
After 3-4 exchanges with enough material, call generate_skill_suggestions. Don't wait for a perfect picture -- generate early and let users refine from there.

Structure into three tiers:
1. confirmed: things they clearly do and enjoy
2. potential: things strongly implied but not directly named
3. explore: adjacent things they could try or grow into

Each skill: short label (2-4 words), one-line reason WHY. Aim for 4-6 per tier.

---

TONE:
- Direct, curious, efficient
- No validation phrases: no "That's awesome!", "Love that!", "How cool!", "Fascinating!"
- No restating what they just said
- Short pivots are fine: "got it", "and" -- but skip even those if they add nothing
- Move forward, not sideways`;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "suggest_prompts",
      description:
        "Call this after every conversational message to offer the user 3-4 short reply options they can tap instead of typing. Do NOT call this in the same turn as generate_skill_suggestions.",
      parameters: {
        type: "object",
        properties: {
          options: {
            type: "array",
            description:
              "3-4 short first-person phrases the user could naturally say. Always include one gentle exit option.",
            items: { type: "string" },
          },
        },
        required: ["options"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_skill_suggestions",
      description:
        "Call this after at least 3-4 exchanges when you have enough material to generate a rich set of skill suggestions. Produces a structured set of confirmed, potential, and exploratory skills.",
      parameters: {
        type: "object",
        properties: {
          confirmed: {
            type: "array",
            description:
              "Skills and offerings the person clearly already does and enjoys",
            items: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Short skill label (2-4 words, suitable for a profile tag)",
                },
                description: {
                  type: "string",
                  description: "One sentence explaining why this is suggested",
                },
                category: {
                  type: "string",
                  description:
                    "One of: practical, creative, physical, knowledge, social, care, experiential",
                },
              },
              required: ["label", "description", "category"],
            },
          },
          potential: {
            type: "array",
            description:
              "Skills strongly implied by what they said -- they may not have named them but clearly have them",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "Short skill label" },
                description: { type: "string", description: "One sentence explaining why" },
                category: { type: "string", description: "Category" },
              },
              required: ["label", "description", "category"],
            },
          },
          explore: {
            type: "array",
            description:
              "Things they could try or grow into based on adjacent interests -- aspirational but grounded",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "Short skill label" },
                description: { type: "string", description: "One sentence explaining why" },
                category: { type: "string", description: "Category" },
              },
              required: ["label", "description", "category"],
            },
          },
          summary: {
            type: "string",
            description:
              "A warm 1-2 sentence summary of what makes this person's profile interesting and what the community might love about them",
          },
        },
        required: ["confirmed", "potential", "explore", "summary"],
      },
    },
  },
];

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

  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Missing messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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
          groqMessages.push({
            role: "user",
            content:
              "The user has just opened the profile builder. Please introduce yourself briefly and ask your first question to start discovering their skills and interests.",
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

        while (loopCount < 6) {
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

          let shouldBreak = false;

          for (const tc of toolCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.arguments);
            } catch {
              args = {};
            }

            if (tc.name === "suggest_prompts") {
              const options = (args.options as string[]) ?? [];
              send({ type: "prompt_options", options });
              groqMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify({
                  success: true,
                  message: "Options displayed to user. Waiting for their reply.",
                }),
              });
              shouldBreak = true;
            } else if (tc.name === "generate_skill_suggestions") {
              send({ type: "suggestions_ready", data: args });
              groqMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify({
                  success: true,
                  message:
                    "Suggestions have been shown to the user. Please now write a warm, brief closing message that celebrates what you found and invites them to pick the skills they want to add to their profile.",
                }),
              });
            }
          }

          // After suggest_prompts we pause and wait for user input
          if (shouldBreak) break;
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[profile-builder] Error:", err);
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
