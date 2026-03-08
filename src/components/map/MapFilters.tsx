"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";

interface MapFiltersProps {
  category: string | undefined;
  type: string | undefined;
  query: string;
  showPotlucks: boolean;
  onCategoryChange: (category: string | undefined) => void;
  onTypeChange: (type: string | undefined) => void;
  onQueryChange: (query: string) => void;
  onShowPotlucksChange: (show: boolean) => void;
}

export function MapFilters({
  category,
  type,
  query,
  showPotlucks,
  onCategoryChange,
  onTypeChange,
  onQueryChange,
  onShowPotlucksChange,
}: MapFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(value);
    }, 400);
  }

  function handleClearSearch() {
    onQueryChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search on map..."
          defaultValue={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9 h-9 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type + Category filters in a single scrollable row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Badge
          variant={!type ? "default" : "outline"}
          className="cursor-pointer shrink-0"
          onClick={() => onTypeChange(undefined)}
        >
          All
        </Badge>
        <Badge
          variant={type === "offer" ? "default" : "outline"}
          className="cursor-pointer shrink-0"
          onClick={() => onTypeChange(type === "offer" ? undefined : "offer")}
        >
          Offers
        </Badge>
        <Badge
          variant={type === "request" ? "default" : "outline"}
          className="cursor-pointer shrink-0"
          onClick={() =>
            onTypeChange(type === "request" ? undefined : "request")
          }
        >
          Requests
        </Badge>
        <Badge
          variant={showPotlucks ? "default" : "outline"}
          className="cursor-pointer shrink-0"
          onClick={() => onShowPotlucksChange(!showPotlucks)}
        >
          Potlucks
        </Badge>

        <div className="w-px bg-border shrink-0" />

        {category ? (
          <Badge
            variant="secondary"
            className="cursor-pointer shrink-0"
            onClick={() => onCategoryChange(undefined)}
          >
            {CATEGORIES.find((c) => c.value === category)?.label || category}{" "}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        ) : (
          CATEGORIES.map((cat) => (
            <Badge
              key={cat.value}
              variant="outline"
              className="cursor-pointer shrink-0 text-xs"
              onClick={() => onCategoryChange(cat.value)}
            >
              {cat.label}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
