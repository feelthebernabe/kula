"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskKulaPanel } from "./AskKulaPanel";
import { useAskKula } from "@/lib/contexts/AskKulaContext";

export function AskKulaButton() {
  const { isOpen, setIsOpen } = useAskKula();

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 h-12 rounded-full shadow-lg md:bottom-6 md:right-6 md:h-11 md:w-auto md:rounded-2xl md:px-4"
      >
        <Sparkles className="h-5 w-5 md:mr-2" />
        <span className="sr-only md:not-sr-only md:text-sm md:font-medium">
          Ask Kula AI
        </span>
      </Button>

      <AskKulaPanel open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
