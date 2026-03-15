import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/gemini";
import { AI_ENABLED } from "@/lib/flags";
import type { Content, FunctionDeclaration, Part, Type } from "@google/genai";

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

const SYSTEM_INSTRUCTION = `You are curious and unhurried. Your job is to have a genuine conversation that helps someone map out what they're into, what they're good at, and what they've been exploring — so their community can find them for the right things.

You're not a hype machine. You don't need to react enthusiastically to everything they say. Just be interested. Ask real follow-up questions. Let the conversation go where it goes. When someone mentions something, dig into it a little rather than moving on immediately.

---

WHAT YOU'RE LOOKING FOR:
- **Practical skills**: carpentry, plumbing, car repair, cooking, sewing, electronics, gardening
- **Knowledge & teaching**: languages, coding, instruments, tutoring, coaching, mentoring
- **Physical & sporty**: yoga, tennis, cycling, hiking, climbing, dancing, martial arts, pickleball
- **Creative**: photography, painting, music, writing, design, ceramics, jewellery-making, knitting
- **Social & emotional**: hosting events, facilitation, listening, debate, philosophy, storytelling
- **Experiential**: guided city walks, foraging trips, cooking together, movie nights, book clubs
- **Bodywork & care**: massage, breathwork, meditation, hair styling, nail art
- **Practical life**: financial literacy, job coaching, navigating bureaucracy, first aid, driving
- **Niche weirdness**: obscure knowledge, unusual hobbies, weird skills — these are often the most sought-after

---

CONVERSATION APPROACH:
Have a real conversation. Ask ONE open-ended question at a time. The question opens the space; the prompt chips (see below) give people concrete directions to step into. Together they work as a pair — your question is the invitation, the chips are the menu.

Questions should be open and inviting, not closed yes/no gates. The chips handle specificity — your question just needs to open the right door.

Good question shapes:
- "What are some things you find totally effortless — stuff that just comes naturally to you?"
- "What are you into these days? Hobbies, interests, anything you've been spending time on?"
- "What do people in your life tend to come to you for — like the thing you're the go-to person for?"
- "What have you been learning or getting curious about lately?"
- "What kinds of things do you love doing, even just for yourself?"
- "Is there anything you've been doing for years that you've never really thought of as a skill?"
- "What are some things from your past — hobbies, interests, roles — that have stuck with you?"
- "What do you find yourself doing when you actually have free time?"

Avoid closed questions like "Do you cook?" or "Are you sporty?" — those invite a flat yes/no. Let the chips give them the specific directions to pick from. Follow threads that feel alive — if someone picks something, ask a natural follow-up before moving on.

Never ask "what could you offer others" or "what would people pay for." The goal is to understand the person first — the shareable things emerge naturally from that.

Keep the conversation alive for at least 5-6 exchanges before generating suggestions. Celebrate everything — nothing is too small or too niche.

---

PROMPT SUGGESTIONS (required every turn):
After every message, call suggest_prompts with 3-5 short options the user could tap to reply. This replaces typing for people who aren't sure what to say.

Options must be:
- Phrased as something the user would naturally say themselves (first person, casual)
- Specific enough to be meaningful — "I love cooking" not just "yes"

CRITICAL — how to scope the options depends on where you are in the conversation:

Early turns (first 1-3 exchanges): options should span DIFFERENT life domains, not variations of one topic. The goal is to invite the user to self-select the territory they want to explore. Spread across things like food, movement, making, music, nature, tech, people, creativity, etc.

Good early options:
→ "I love cooking / food" · "I'm into sport or fitness" · "I make or build things" · "I play music" · "I'm pretty creative" · "I work a lot with tech"
→ "I spend a lot of time outdoors" · "I'm a big reader / learner" · "I work with people / care roles" · "I'm into wellness stuff" · "Something else entirely"

Once the user has picked a direction: options can go deeper into that domain — variations, levels, sub-topics.

Good deeper options after someone says they're into fitness:
→ "Running mostly" · "Gym / weights" · "Yoga or something gentler" · "Team sports" · "Cycling or swimming"

Good deeper options after someone mentions music:
→ "I play an instrument" · "I sing" · "I DJ or produce" · "I just love listening" · "I used to play"

Always include one option that opens a new direction ("Something else too" or "Actually a few things") so the conversation doesn't get too narrow.

Do NOT call suggest_prompts when calling generate_skill_suggestions — those two tools are mutually exclusive in a given turn.

---

WHEN TO GENERATE SUGGESTIONS:
After 5-8 exchanges, once you have a rich picture, call generate_skill_suggestions. Structure your suggestions into three tiers:
1. **confirmed**: things they clearly already do and enjoy
2. **potential**: things strongly implied by what they said — they might not have named them directly
3. **explore**: things they could grow into, try, or hadn't considered — based on adjacent interests

Each skill gets a short label (2-4 words, fits on a tag) and a one-line description explaining WHY you're suggesting it.

Be generous and creative with suggestions — aim for 4-6 per tier. People are often surprised and delighted by what the AI surfaces.

---

TONE:
- Genuinely curious, not performatively enthusiastic
- Don't say things like "That's awesome!", "Love that!", "How cool!" — just respond naturally
- Short acknowledgements are fine ("nice", "oh interesting", "hah") but don't over-react
- Ask follow-up questions that show you actually heard what they said
- Conversational and easy, not coaching-speak`;

const suggestPromptsTool: FunctionDeclaration = {
  name: "suggest_prompts",
  description:
    "Call this after every conversational message to offer the user 3-4 short reply options they can tap instead of typing. Do NOT call this in the same turn as generate_skill_suggestions.",
  parameters: {
    type: "OBJECT" as Type,
    properties: {
      options: {
        type: "ARRAY" as Type,
        description:
          "3-4 short first-person phrases the user could naturally say. Always include one gentle exit option.",
        items: { type: "STRING" as Type },
      },
    },
    required: ["options"],
  },
};

const generateSkillTool: FunctionDeclaration = {
  name: "generate_skill_suggestions",
  description:
    "Call this after at least 5-6 exchanges when you have enough material to generate a rich set of skill suggestions. Produces a structured set of confirmed, potential, and exploratory skills.",
  parameters: {
    type: "OBJECT" as Type,
    properties: {
      confirmed: {
        type: "ARRAY" as Type,
        description:
          "Skills and offerings the person clearly already does and enjoys",
        items: {
          type: "OBJECT" as Type,
          properties: {
            label: {
              type: "STRING" as Type,
              description: "Short skill label (2-4 words, suitable for a profile tag)",
            },
            description: {
              type: "STRING" as Type,
              description: "One sentence explaining why this is suggested",
            },
            category: {
              type: "STRING" as Type,
              description:
                "One of: practical, creative, physical, knowledge, social, care, experiential",
            },
          },
          required: ["label", "description", "category"],
        },
      },
      potential: {
        type: "ARRAY" as Type,
        description:
          "Skills strongly implied by what they said — they may not have named them but clearly have them",
        items: {
          type: "OBJECT" as Type,
          properties: {
            label: { type: "STRING" as Type, description: "Short skill label" },
            description: { type: "STRING" as Type, description: "One sentence explaining why" },
            category: { type: "STRING" as Type, description: "Category" },
          },
          required: ["label", "description", "category"],
        },
      },
      explore: {
        type: "ARRAY" as Type,
        description:
          "Things they could try or grow into based on adjacent interests — aspirational but grounded",
        items: {
          type: "OBJECT" as Type,
          properties: {
            label: { type: "STRING" as Type, description: "Short skill label" },
            description: { type: "STRING" as Type, description: "One sentence explaining why" },
            category: { type: "STRING" as Type, description: "Category" },
          },
          required: ["label", "description", "category"],
        },
      },
      summary: {
        type: "STRING" as Type,
        description:
          "A warm 1-2 sentence summary of what makes this person's profile interesting and what the community might love about them",
      },
    },
    required: ["confirmed", "potential", "explore", "summary"],
  },
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
        const client = getGeminiClient();

        let contents: Content[];

        if (messages.length === 0) {
          contents = [
            {
              role: "user",
              parts: [
                {
                  text: "The user has just opened the profile builder. Please introduce yourself warmly and ask your first question to start discovering their skills and interests.",
                },
              ] as Part[],
            },
          ];
        } else {
          contents = messages.map((m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }] as Part[],
          }));
        }

        let loopCount = 0;

        while (loopCount < 6) {
          loopCount++;

          const response = await client.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations: [suggestPromptsTool, generateSkillTool] }],
            },
          });

          let fullText = "";
          let functionCalls: { name: string; args: Record<string, unknown> }[] = [];

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
                    args: (part.functionCall.args as Record<string, unknown>) || {},
                  });
                }
              }
            }
          }

          if (functionCalls.length === 0) break;

          const modelParts: Part[] = [];
          if (fullText) modelParts.push({ text: fullText });
          for (const fc of functionCalls) {
            modelParts.push({ functionCall: { name: fc.name, args: fc.args } });
          }
          contents.push({ role: "model", parts: modelParts });

          const functionResponseParts: Part[] = [];
          let shouldBreak = false;

          for (const fc of functionCalls) {
            if (fc.name === "suggest_prompts") {
              const options = (fc.args.options as string[]) ?? [];
              send({ type: "prompt_options", options });
              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: { result: { success: true, message: "Options displayed to user. Waiting for their reply." } },
                },
              });
              shouldBreak = true;
            } else if (fc.name === "generate_skill_suggestions") {
              send({ type: "suggestions_ready", data: fc.args });
              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: {
                    result: {
                      success: true,
                      message:
                        "Suggestions have been shown to the user. Please now write a warm, brief closing message that celebrates what you found and invites them to pick the skills they want to add to their profile.",
                    },
                  },
                },
              });
            }
          }

          contents.push({ role: "user", parts: functionResponseParts });

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
