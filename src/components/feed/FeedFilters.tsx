"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, Sparkles, LayoutGrid, List, Map, ChevronDown, Gift, HandHeart, Plus, Loader2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { useAskKula } from "@/lib/contexts/AskKulaContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ViewMode } from "./FeedList";
import type { ExchangeMode } from "@/types/database";

const FIND_PLACEHOLDER = "Find something you need...";
const SHARE_PLACEHOLDER = "Share something you can offer...";

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
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState(currentQuery || "");
  const [offerText, setOfferText] = useState("");
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [quickCategory, setQuickCategory] = useState("");
  const [quickExchangeModes, setQuickExchangeModes] = useState<ExchangeMode[]>(["flexible"]);
  const [posting, setPosting] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<string[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [aiSearchFailed, setAiSearchFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typingRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { setIsOpen: openAskKula } = useAskKula();

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
    setAiSearchFailed(false);
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
    setAiSearchFailed(false);
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
      // Fallback to regular search — show feedback
      setAiSearchFailed(true);
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
    setAiSearchFailed(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/feed?${params.toString()}`);
  }

  // Focus the title input when quick post form expands
  useEffect(() => {
    if (showQuickPost) {
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }, [showQuickPost]);

  async function handleQuickPost() {
    const trimmed = offerText.trim();
    if (trimmed.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (!quickCategory) {
      toast.error("Please pick a category");
      return;
    }
    if (quickExchangeModes.length === 0) {
      toast.error("Please pick at least one exchange mode");
      return;
    }

    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to post");
        router.push("/login");
        return;
      }

      // RLS requires community_id to be a community the user belongs to
      const { data: membership } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        type: "offer" as const,
        title: trimmed,
        category: quickCategory,
        exchange_modes: quickExchangeModes,
        community_id: membership?.community_id ?? null,
      });

      if (error) throw error;

      toast.success("Posted!");
      setOfferText("");
      setQuickCategory("");
      setQuickExchangeModes(["flexible"]);
      setShowQuickPost(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPosting(false);
    }
  }

  function toggleExchangeMode(val: ExchangeMode) {
    setQuickExchangeModes((prev) =>
      prev.includes(val)
        ? prev.filter((m) => m !== val)
        : [...prev, val]
    );
  }

  return (
    <div className="space-y-3">
      {/* Dual Input — Find & Share */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Find / Search box */}
        <form onSubmit={handleSmartSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={FIND_PLACEHOLDER}
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search for something you need"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-8 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && !parsing && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Share / Offer box */}
        <div className="relative">
          <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            type="text"
            placeholder={SHARE_PLACEHOLDER}
            value={offerText}
            onChange={(e) => {
              setOfferText(e.target.value);
              if (e.target.value && !showQuickPost) setShowQuickPost(true);
            }}
            onFocus={() => { if (offerText) setShowQuickPost(true); }}
            aria-label="Share something you can offer"
            className="w-full rounded-xl border border-primary/40 bg-primary/5 py-2.5 pl-9 pr-3 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Inline Quick Post Form */}
      {showQuickPost && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Quick offer</span>
            <button
              type="button"
              onClick={() => { setShowQuickPost(false); setOfferText(""); setQuickCategory(""); setQuickExchangeModes(["flexible"]); }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close quick post"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="What are you offering?"
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            aria-label="Offer title"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Select value={quickCategory} onValueChange={setQuickCategory}>
            <SelectTrigger className="w-full" aria-label="Category">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Exchange modes">
            {EXCHANGE_MODES.map((mode) => {
              const val = mode.value as ExchangeMode;
              const selected = quickExchangeModes.includes(val);
              return (
                <button
                  key={mode.value}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleExchangeMode(val)}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <Link
              href={`/posts/new?type=offer${offerText.trim() ? `&title=${encodeURIComponent(offerText.trim())}` : ""}${quickCategory ? `&category=${encodeURIComponent(quickCategory)}` : ""}`}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Add photos, description & more
            </Link>
            <Button
              size="sm"
              onClick={handleQuickPost}
              disabled={posting}
            >
              {posting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Gift className="mr-1.5 h-3.5 w-3.5" />}
              Post
            </Button>
          </div>
        </div>
      )}

      {/* Helper links */}
      {!showQuickPost && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => openAskKula(true)}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Sparkles className="h-3 w-3" />
            Ask Kula AI
          </button>
        </div>
      )}

      {/* AI Parsing Indicator */}
      {parsing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Understanding your search...
        </div>
      )}

      {/* AI search fallback notice */}
      {aiSearchFailed && (
        <p className="text-xs text-muted-foreground" role="status">
          Smart search unavailable — showing regular results
        </p>
      )}

      {/* AI Keywords */}
      {aiKeywords && aiKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="status" aria-label="AI-detected keywords">
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
        <div className="flex flex-1 rounded-xl border border-border bg-muted/40 p-1" role="tablist" aria-label="Filter by type">
          <button
            type="button"
            role="tab"
            aria-selected={!currentType}
            onClick={() => setFilter("type", null)}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-primary ${
              !currentType
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentType === "offer"}
            onClick={() => setFilter("type", currentType === "offer" ? null : "offer")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-center text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-primary ${
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
            role="tab"
            aria-selected={currentType === "request"}
            onClick={() => setFilter("type", currentType === "request" ? null : "request")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-center text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-primary ${
              currentType === "request"
                ? "bg-amber-600 text-white shadow-sm"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Map view"
          >
            <Map className="h-4 w-4" />
          </Link>
          <div className="flex rounded-lg border border-border">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`flex h-9 w-9 items-center justify-center rounded-l-lg transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Switch to list view"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Switch to grid view"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter — collapsed with "+ More" */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
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
