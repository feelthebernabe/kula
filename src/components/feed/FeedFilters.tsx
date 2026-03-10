"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Search, X, Sparkles, LayoutGrid, List, Map, ChevronDown, Gift, HandHeart } from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { useAskKula } from "@/lib/contexts/AskKulaContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ViewMode } from "./FeedList";

const PLACEHOLDER_EXAMPLES = [
  "power drill",
  "babysitting",
  "guitar lessons",
  "moving help",
  "home cooking",
  "garden tools",
];

export function FeedFilters({
  currentCategory,
  currentType,
  currentQuery,
  viewMode,
  onViewModeChange,
}: {
  currentCategory?: string;
  currentType?: string;
  currentQuery?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery || "");
  const [aiKeywords, setAiKeywords] = useState<string[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typingRef = useRef(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const { setIsOpen: openAskKula } = useAskKula();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Don't overwrite what the user is actively typing
    if (!typingRef.current) {
      setQuery(currentQuery || "");
    }
  }, [currentQuery]);

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/feed?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setAiKeywords(null);
    typingRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      typingRef.current = false;
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      router.push(`/feed?${params.toString()}`);
    }, 400);
  }

  async function handleSmartSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const wordCount = trimmed.split(/\s+/).length;

    // Short queries: just search directly
    if (wordCount < 3) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", trimmed);
      router.push(`/feed?${params.toString()}`);
      return;
    }

    // Natural language: call AI parse endpoint
    setParsing(true);
    try {
      const res = await fetch("/api/search/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) throw new Error("Parse failed");

      const data = await res.json();
      setAiKeywords(data.keywords);

      const params = new URLSearchParams(searchParams.toString());
      if (data.searchQuery) params.set("q", data.searchQuery);
      if (data.suggestedCategory) params.set("category", data.suggestedCategory);
      if (data.suggestedType) params.set("type", data.suggestedType);
      router.push(`/feed?${params.toString()}`);
    } catch {
      // Fallback to regular search
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", trimmed);
      router.push(`/feed?${params.toString()}`);
    } finally {
      setParsing(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setAiKeywords(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/feed?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <form onSubmit={handleSmartSearch}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search for ${PLACEHOLDER_EXAMPLES[placeholderIdx]}...`}
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search posts"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-10 text-base shadow-sm transition-shadow placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && !parsing && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>or</span>
          <button
            type="button"
            onClick={() => openAskKula(true)}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Sparkles className="h-3 w-3" />
            Ask Kula AI
          </button>
        </div>
      </form>

      {/* AI Parsing Indicator */}
      {parsing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Understanding your search...
        </div>
      )}

      {/* AI Keywords */}
      {aiKeywords && aiKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {aiKeywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      )}

      {/* Type Tabs — equal-weight Offers / Needs */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFilter("type", null)}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
              !currentType
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("type", currentType === "offer" ? null : "offer")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-center text-sm font-medium transition-all ${
              currentType === "offer"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gift className="h-4 w-4" />
            Offers
          </button>
          <button
            type="button"
            onClick={() => setFilter("type", currentType === "request" ? null : "request")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-center text-sm font-medium transition-all ${
              currentType === "request"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HandHeart className="h-4 w-4" />
            Needs
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/map${currentCategory ? `?category=${currentCategory}` : ""}${
              currentType
                ? `${currentCategory ? "&" : "?"}type=${currentType}`
                : ""
            }`}
            className="flex items-center gap-1 rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Map view"
          >
            <Map className="h-4 w-4" />
          </Link>
          <div className="flex rounded-lg border border-border">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`rounded-l-lg p-1.5 ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List view"
              aria-label="Switch to list view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`rounded-r-lg p-1.5 ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid view"
              aria-label="Switch to grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter — collapsed with "+ More" */}
      <div className="flex flex-wrap items-center gap-1.5">
        {currentCategory ? (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setFilter("category", null)}
          >
            {CATEGORIES.find((c) => c.value === currentCategory)?.label ||
              currentCategory}{" "}
            ×
          </Badge>
        ) : (
          <>
            {CATEGORIES.slice(0, 4).map((cat) => (
              <Badge
                key={cat.value}
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => setFilter("category", cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-pointer text-xs"
                >
                  + {CATEGORIES.length - 4} more
                  <ChevronDown className="ml-0.5 h-3 w-3" />
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="flex flex-col gap-1">
                  {CATEGORIES.slice(4).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className="rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                      onClick={() => setFilter("category", cat.value)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    </div>
  );
}
