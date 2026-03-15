"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  MicOff,
  SendHorizonal,
  Sparkles,
  Trash2,
  ChevronLeft,
  Zap,
  Compass,
  Star,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillItem {
  label: string;
  description: string;
  category: string;
}

interface SkillSuggestions {
  confirmed: SkillItem[];
  potential: SkillItem[];
  explore: SkillItem[];
  summary: string;
}

type PanelMessage =
  | { id: string; role: "assistant"; content: string; isStreaming: boolean; options?: string[] }
  | { id: string; role: "user"; content: string };

type PanelMode = "chat" | "review" | "saved";


// ─── Review screen ────────────────────────────────────────────────────────────

const SECTION_CONFIG = [
  {
    tier: "confirmed" as const,
    icon: <Star className="h-3.5 w-3.5 text-amber-500" />,
    label: "Things you already do",
    selectedRing: "border-amber-400 bg-amber-50 text-amber-900",
    hoverRing: "hover:border-amber-300 hover:bg-amber-50/50",
  },
  {
    tier: "potential" as const,
    icon: <Zap className="h-3.5 w-3.5 text-primary" />,
    label: "You might not have realised…",
    selectedRing: "border-primary bg-primary text-primary-foreground",
    hoverRing: "hover:border-primary/40 hover:bg-primary/5",
  },
  {
    tier: "explore" as const,
    icon: <Compass className="h-3.5 w-3.5 text-purple-500" />,
    label: "Could grow into",
    selectedRing: "border-purple-400 bg-purple-50 text-purple-900",
    hoverRing: "hover:border-purple-300 hover:bg-purple-50/50",
  },
];

function ReviewScreen({
  suggestions,
  onBack,
  onSave,
  saving,
}: {
  suggestions: SkillSuggestions;
  onBack: () => void;
  onSave: (selected: SkillItem[]) => void;
  saving: boolean;
}) {
  const allSkills = useMemo(
    () => [
      ...suggestions.confirmed.map((s) => ({ ...s, tier: "confirmed" as const })),
      ...suggestions.potential.map((s) => ({ ...s, tier: "potential" as const })),
      ...suggestions.explore.map((s) => ({ ...s, tier: "explore" as const })),
    ],
    [suggestions]
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.confirmed.map((s) => s.label))
  );

  function toggle(label: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  const selectedSkills = allSkills.filter((s) => selected.has(s.label));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <button
          onClick={onBack}
          className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to chat
        </button>
        <p className="text-sm font-semibold text-foreground">Pick your skills</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tap to select or deselect. Tap a selected skill again to see why it was suggested.
        </p>
        {suggestions.summary && (
          <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground border-t pt-2">
            &ldquo;{suggestions.summary}&rdquo;
          </p>
        )}
      </div>

      {/* Skill chips by section */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-5 pb-4">
          {SECTION_CONFIG.map((section) => {
            const items =
              section.tier === "confirmed"
                ? suggestions.confirmed
                : section.tier === "potential"
                ? suggestions.potential
                : suggestions.explore;
            if (items.length === 0) return null;
            return (
              <div key={section.tier}>
                <div className="mb-2 flex items-center gap-1.5">
                  {section.icon}
                  <p className="text-xs font-semibold text-foreground">{section.label}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((skill) => {
                    const isSelected = selected.has(skill.label);
                    return (
                      <div key={skill.label} className="flex flex-col gap-1">
                        <button
                          onClick={() => toggle(skill.label)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? section.selectedRing
                              : `border-border bg-card text-foreground ${section.hoverRing}`
                          }`}
                        >
                          {isSelected && <span className="mr-1 opacity-70">✓</span>}
                          {skill.label}
                        </button>
                        {isSelected && (
                          <p className="max-w-[220px] rounded-lg bg-muted px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                            {skill.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-3 space-y-3">
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedSkills.map((s) => (
              <span
                key={s.label}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {s.label}
                <button
                  onClick={() => toggle(s.label)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label={`Remove ${s.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} skill{selected.size !== 1 ? "s" : ""} selected
          </span>
          {selected.size > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(new Set())}
            >
              Clear all
            </button>
          )}
        </div>
        <Button
          className="w-full"
          disabled={selected.size === 0 || saving}
          onClick={() => onSave(selectedSkills)}
        >
          {saving ? "Saving…" : `Add ${selected.size > 0 ? selected.size : ""} skill${selected.size !== 1 ? "s" : ""} to my profile`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ProfileBuilderPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<SkillSuggestions | null>(null);
  const [mode, setMode] = useState<PanelMode>("chat");
  const [saving, setSaving] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const hasInit = useRef(false);

  // Scroll management
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── SSE send ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (userText: string | null) => {
      if (isStreaming) return;
      setIsStreaming(true);

      let updatedMessages = messages;

      if (userText !== null) {
        const userMsg: PanelMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: userText,
        };
        // Clear chips when user replies
        setSelectedOptions([]);
        updatedMessages = [
          ...messages.map((m) =>
            m.role === "assistant" ? { ...m, options: undefined } : m
          ),
          userMsg,
        ];
        setMessages(updatedMessages);
      }

      const history = updatedMessages
        .filter((m): m is Extract<PanelMessage, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant"
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);

      try {
        const res = await fetch("/api/profile-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let pendingSuggestions: SkillSuggestions | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? { ...m, content: m.content + (event.content as string) }
                    : m
                )
              );
            } else if (event.type === "prompt_options") {
              const opts = event.options as string[];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? { ...m, options: opts }
                    : m
                )
              );
            } else if (event.type === "suggestions_ready") {
              pendingSuggestions = event.data as SkillSuggestions;
              setSuggestions(pendingSuggestions);
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? { ...m, isStreaming: false }
                    : m
                )
              );
              // Transition to review after a short delay so the closing message renders first
              if (pendingSuggestions) {
                setTimeout(() => setMode("review"), 800);
              }
            } else if (event.type === "error") {
              toast.error(event.message as string);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? {
                        ...m,
                        isStreaming: false,
                        content: m.content || "Something went wrong. Please try again.",
                      }
                    : m
                )
              );
            }
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Connection error");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? {
                  ...m,
                  isStreaming: false,
                  content: m.content || "Sorry, I had trouble connecting. Please try again.",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isStreaming]
  );

  // ── Voice ──────────────────────────────────────────────────────────────────

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as unknown[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript as string)
        .join("");
      setInput(transcript);
    };
    rec.onend = () => { setIsListening(false); recognitionRef.current = null; };
    rec.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    rec.start();
    setIsListening(true);
    recognitionRef.current = rec;
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value.slice(0, 1000));
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // ── Save skills ────────────────────────────────────────────────────────────

  async function handleSave(selected: SkillItem[]) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const newSkills = selected.map((s) => s.label);
    const newOffers = selected.map((s) => s.label);

    // Merge with existing profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("skills, offers_list")
      .eq("id", user.id)
      .single();

    const existingSkills: string[] = profile?.skills ?? [];
    const existingOffers: string[] = profile?.offers_list ?? [];

    const mergedSkills = Array.from(new Set([...existingSkills, ...newSkills]));
    const mergedOffers = Array.from(new Set([...existingOffers, ...newOffers]));

    const { error } = await supabase
      .from("profiles")
      .update({ skills: mergedSkills, offers_list: mergedOffers })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setMode("saved");
    toast.success(`${selected.length} skill${selected.length !== 1 ? "s" : ""} added to your profile!`);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleClear() {
    setMessages([]);
    setSuggestions(null);
    setMode("chat");
    hasInit.current = false;
  }

  // Re-init after clear (messages becomes [] → triggers the init effect)
  useEffect(() => {
    if (!open || hasInit.current || messages.length > 0 || isStreaming) return;
    hasInit.current = true;
    sendMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages.length]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Build Your Profile</SheetTitle>
                <SheetDescription className="text-xs">
                  Discover what you have to share
                </SheetDescription>
              </div>
            </div>
            {messages.length > 0 && mode === "chat" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-8 w-8 text-muted-foreground"
                aria-label="Start over"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Body — switches between chat / review / saved */}
        {mode === "saved" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Profile updated!</h3>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              Your new skills are live on your profile. The community can now find you for them.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                handleClear();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : mode === "review" && suggestions ? (
          <ReviewScreen
            suggestions={suggestions}
            onBack={() => setMode("chat")}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <>
            {/* Chat messages */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Starting the conversation…
                  </p>
                </div>
              )}

              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="max-w-[85%] space-y-2">
                      <div className="rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground">
                        {msg.content ? (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="animate-pulse">Thinking</span>
                            <span className="animate-bounce [animation-delay:0.1s]">.</span>
                            <span className="animate-bounce [animation-delay:0.2s]">.</span>
                            <span className="animate-bounce [animation-delay:0.3s]">.</span>
                          </span>
                        )}
                        {msg.isStreaming && msg.content && (
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
                        )}
                      </div>
                      {msg.options && msg.options.length > 0 && !isStreaming && (
                        <div className="space-y-2 pt-0.5">
                          <div className="flex flex-wrap gap-1.5">
                            {msg.options.map((opt) => {
                              const isSelected = selectedOptions.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  onClick={() =>
                                    setSelectedOptions((prev) =>
                                      isSelected
                                        ? prev.filter((o) => o !== opt)
                                        : [...prev, opt]
                                    )
                                  }
                                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15"
                                  }`}
                                >
                                  {isSelected && <span className="mr-1">✓</span>}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {selectedOptions.length > 0 && (
                            <button
                              onClick={() => {
                                const text = selectedOptions.join(", ");
                                setSelectedOptions([]);
                                sendMessage(text);
                              }}
                              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <SendHorizonal className="h-3 w-3" />
                              Send{selectedOptions.length > 1 ? ` (${selectedOptions.length})` : ""}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Teaser when suggestions have arrived but review hasn't shown yet */}
              {suggestions && mode === "chat" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center text-xs text-primary">
                  <Sparkles className="mx-auto mb-1 h-4 w-4" />
                  Getting your skill suggestions ready…
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t px-4 py-3">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={isStreaming}
                  aria-label={isListening ? "Stop recording" : "Start voice input"}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                    isListening
                      ? "animate-pulse bg-red-500 text-white shadow-md shadow-red-200"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening ? "Listening… speak now" : "Share anything…"
                  }
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />

                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim()}
                  className="h-9 w-9 shrink-0"
                  aria-label="Send message"
                >
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
