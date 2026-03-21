/**
 * When Groq fails with failed_generation, it retries without tools.
 * In that mode the model sometimes emits tool calls as literal text in a
 * variety of formats depending on the model version and failure mode.
 *
 * Formats handled:
 *   1. <function=name>{"args": ...}</function>          — standard Groq fallback
 *   2. <function=name [{"args": ...}]</function>        — array-wrapped args
 *   3. <function=name>{"args": ...}                     — unclosed tag (no </function>)
 *   4. <tool_call>{"name":"...","arguments":{...}}</tool_call>  — OpenAI-style XML
 *   5. [TOOL_CALLS] [{"function":{"name":"...","arguments":"..."}}]  — Mistral/Llama style
 *   6. <|python_tag|>name({"args": ...})<|eom_id|>      — Llama 3.2 python tool style
 *   7. {"name":"...","arguments":{...}}                 — bare JSON at start of line
 */

type ExtractedCall = { name: string; args: Record<string, unknown> };

function tryParseArgs(
  name: string,
  argsStr: string,
  out: ExtractedCall[]
): void {
  const trimmed = argsStr.trim();
  if (!name.trim()) return;

  // Unwrap markdown code fences: ```json\n{...}\n```
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  const jsonStr = fenced ? fenced[1].trim() : trimmed;

  if (!jsonStr) {
    out.push({ name: name.trim(), args: {} });
    return;
  }

  try {
    let parsed = JSON.parse(jsonStr);
    // Unwrap single-element array: [{"options":[...]}] → {"options":[...]}
    if (Array.isArray(parsed)) parsed = parsed[0] ?? {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      out.push({ name: name.trim(), args: parsed as Record<string, unknown> });
    }
  } catch {
    // Ignore malformed JSON
  }
}

/**
 * Strip all known function-call tag formats from text, returning clean text
 * and any tool calls that were embedded inline.
 */
export function parseFunctionTags(raw: string): { text: string; toolCalls: ExtractedCall[] } {
  const toolCalls: ExtractedCall[] = [];
  let text = raw;

  // ── Format 1 & 2: <function=name>args</function>  or  <function=name [args]</function>
  // The separator after the name can be >, space, or [ (array-wrapped args)
  text = text.replace(
    /<function=(\w+)[>\s\[]([\s\S]*?)<\/function>/g,
    (_, name, argsStr) => { tryParseArgs(name, argsStr, toolCalls); return ""; }
  );

  // ── Format 3: <function=name>args  (unclosed — no </function>)
  // Stop capture at the next < to avoid eating unrelated HTML/tags
  if (text.includes("<function=")) {
    text = text.replace(
      /<function=(\w+)[>\s\[]([^<]*)/g,
      (_, name, argsStr) => { tryParseArgs(name, argsStr, toolCalls); return ""; }
    );
  }

  // ── Format 4: <tool_call>{"name":"...","arguments":{...}}</tool_call>
  if (text.includes("<tool_call>")) {
    text = text.replace(
      /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g,
      (_, content) => {
        try {
          const parsed = JSON.parse(content);
          const name = parsed.name ?? parsed.function?.name;
          const rawArgs = parsed.arguments ?? parsed.parameters ?? parsed.args ?? {};
          const args: Record<string, unknown> =
            typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
          if (name && typeof name === "string") toolCalls.push({ name, args });
        } catch { /* malformed */ }
        return "";
      }
    );
  }

  // ── Format 5: [TOOL_CALLS] [{"type":"function","function":{"name":"...","arguments":"..."}}]
  if (text.includes("[TOOL_CALLS]")) {
    text = text.replace(
      /\[TOOL_CALLS\]\s*(\[[\s\S]*?\])/g,
      (_, jsonStr) => {
        try {
          const calls = JSON.parse(jsonStr);
          for (const call of Array.isArray(calls) ? calls : [calls]) {
            const name = call.function?.name ?? call.name;
            const rawArgs = call.function?.arguments ?? call.arguments ?? {};
            const args: Record<string, unknown> =
              typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
            if (name && typeof name === "string") toolCalls.push({ name, args });
          }
        } catch { /* malformed */ }
        return "";
      }
    );
  }

  // ── Format 6: <|python_tag|>func_name({"key": val})<|eom_id|>
  if (text.includes("<|python_tag|>")) {
    text = text.replace(
      /<\|python_tag\|>([\s\S]*?)<\|eom_id\|>/g,
      (_, content) => {
        // Matches: func_name(json) or func_name json
        const parenMatch = content.trim().match(/^(\w+)\s*\(([\s\S]*)\)\s*$/);
        if (parenMatch) {
          tryParseArgs(parenMatch[1], parenMatch[2], toolCalls);
        } else {
          const spaceMatch = content.trim().match(/^(\w+)\s+([\s\S]+)$/);
          if (spaceMatch) tryParseArgs(spaceMatch[1], spaceMatch[2], toolCalls);
        }
        return "";
      }
    );
  }

  // ── Format 7: bare JSON object on its own line: {"name":"func","arguments":{...}}
  // Only attempt if text looks like it starts with a JSON function call object
  if (text.trimStart().startsWith('{"name"')) {
    text = text.replace(
      /^\s*(\{"name"\s*:\s*"(\w+)"[\s\S]*?\})\s*$/m,
      (_, jsonStr, name) => {
        try {
          const parsed = JSON.parse(jsonStr);
          const rawArgs = parsed.arguments ?? parsed.parameters ?? parsed.args ?? {};
          const args: Record<string, unknown> =
            typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
          toolCalls.push({ name, args });
        } catch { /* malformed */ }
        return "";
      }
    );
  }

  // Clean up any leftover empty lines from removed tags
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text, toolCalls };
}

export async function collectFallbackStream(
  stream: AsyncIterable<{ choices: Array<{ delta?: { content?: string | null } }> }>
): Promise<{ text: string; toolCalls: ExtractedCall[] }> {
  let raw = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) raw += content;
  }

  return parseFunctionTags(raw);
}
