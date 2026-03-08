"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { SearchPreviewResults } from "./SearchPreviewResults";

const SUGGESTION_CHIPS = [
  "Power tools",
  "Tutoring",
  "Home cooking",
  "Moving help",
  "Babysitting",
  "Guitar lessons",
];

interface PreviewResult {
  id: string;
  title: string;
  type: "offer" | "request";
  category: string;
  exchangeModes: string[];
}

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PreviewResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch(searchQuery: string) {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/search/preview?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function handleChipClick(chip: string) {
    setQuery(chip);
    handleSearch(chip);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you need from your neighbors?"
          className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-base shadow-sm transition-shadow placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      {/* Suggestion chips */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleChipClick(chip)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Preview results */}
      {searched && (
        <SearchPreviewResults results={results} loading={loading} />
      )}

      {/* AskKula AI hint */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Need something specific?</span>
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up to ask Kula AI
        </Link>
      </div>
    </div>
  );
}
