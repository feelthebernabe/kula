import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/gemini";
import { CATEGORIES } from "@/lib/constants/categories";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query } = await request.json();

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const client = getGeminiClient();
    const categoryList = CATEGORIES.map(
      (c) => `${c.value} (${c.description})`
    ).join("\n");

    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse this community search query into structured search parameters.

Query: "${query}"

Available categories:
${categoryList}

Rules:
- "keywords": array of 2-5 expanded search terms including synonyms and related words. These will be used for ILIKE matching so include variations.
- "suggestedCategory": the single best matching category value from the list above, or null if unclear.
- "suggestedType": if the user says "I need", "looking for", "who can help" → "offer" (they want to find offers). If they say "I can", "I want to share" → "request" (they want to find requests). Otherwise null.
- "searchQuery": the single best keyword to use as the primary database search term.

Respond with ONLY valid JSON, no markdown fences:
{"keywords": [...], "suggestedCategory": "..." | null, "suggestedType": "offer" | "request" | null, "searchQuery": "..."}`,
    });

    let text = result.text?.trim() || "";
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(text);

    return NextResponse.json({
      keywords: parsed.keywords || [],
      suggestedCategory: parsed.suggestedCategory || null,
      suggestedType: parsed.suggestedType || null,
      searchQuery: parsed.searchQuery || query,
    });
  } catch {
    // Fallback: return original query
    return NextResponse.json({
      keywords: [],
      suggestedCategory: null,
      suggestedType: null,
      searchQuery: query,
    });
  }
}
