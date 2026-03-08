"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";

const PLACEHOLDER_EXAMPLES = [
  "power drill",
  "babysitting",
  "guitar lessons",
  "moving help",
  "home cooking",
  "garden tools",
];

export function ExploreFilters({
  currentCategory,
  currentType,
  currentQuery,
}: {
  currentCategory?: string;
  currentType?: string;
  currentQuery?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery || "");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!typingRef.current) setQuery(currentQuery || "");
  }, [currentQuery]);

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/browse?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setQuery(value);
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
      router.push(`/browse?${params.toString()}`);
    }, 400);
  }

  function clearSearch() {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/browse?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
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
        {query && (
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

      <div className="flex items-center gap-2">
        <Badge
          variant={!currentType ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter("type", null)}
        >
          All
        </Badge>
        <Badge
          variant={currentType === "offer" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter("type", currentType === "offer" ? null : "offer")}
        >
          Offers
        </Badge>
        <Badge
          variant={currentType === "request" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter("type", currentType === "request" ? null : "request")}
        >
          Requests
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {currentCategory ? (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setFilter("category", null)}
          >
            {CATEGORIES.find((c) => c.value === currentCategory)?.label || currentCategory} ×
          </Badge>
        ) : (
          CATEGORIES.map((cat) => (
            <Badge
              key={cat.value}
              variant="outline"
              className="cursor-pointer text-xs"
              onClick={() => setFilter("category", cat.value)}
            >
              {cat.label}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
