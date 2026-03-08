"use client";

import { Sparkles } from "lucide-react";
import { useAskKula } from "@/lib/contexts/AskKulaContext";

export function AskKulaBanner() {
  const { setIsOpen } = useAskKula();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          Not sure what to search for?
        </p>
        <p className="text-xs text-muted-foreground">
          Ask Kula AI to find what you need in your community
        </p>
      </div>
    </button>
  );
}
