"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface PreviewResult {
  id: string;
  title: string;
  type: "offer" | "request";
  category: string;
  exchangeModes: string[];
}

export function SearchPreviewResults({
  results,
  loading,
}: {
  results: PreviewResult[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No results found. Be the first to offer this!
        </p>
        <Link
          href="/signup"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Sign up to post
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {results.map((result) => (
        <div
          key={result.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {result.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  result.type === "offer"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    : "bg-blue-500/10 text-blue-600 border-blue-200"
                }
              >
                {result.type === "offer" ? "Offering" : "Looking for"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.category}
              </span>
            </div>
          </div>
          <Link
            href="/signup"
            className="ml-3 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign up to connect
          </Link>
        </div>
      ))}

      <div className="text-center">
        <Link
          href="/signup"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Sign up to see all results
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
