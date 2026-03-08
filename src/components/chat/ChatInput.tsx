"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizonal } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    // Enforce max 500 characters
    const newValue = e.target.value.slice(0, 500);
    setValue(newValue);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask Kula anything..."
        aria-label="Message to Kula AI"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="h-9 w-9 shrink-0"
        aria-label="Send message"
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </div>
  );
}
