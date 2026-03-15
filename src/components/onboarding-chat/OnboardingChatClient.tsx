"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PILOT_COMMUNITY_ID } from "@/lib/constants/pilot-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { Mic, MicOff, SendHorizonal, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { ChatPost } from "@/types/chat";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedData {
  offers: string[];
  needs: string[];
  skills: string[];
  display_name?: string;
  location?: string;
}

type OnboardingMessage =
  | {
      id: string;
      role: "assistant";
      content: string;
      posts: ChatPost[];
      isStreaming: boolean;
    }
  | { id: string; role: "user"; content: string }
  | { id: string; role: "signup"; extractedData: ExtractedData };

// ─── Post Card (preview, no auth-gated link) ─────────────────────────────────

function OnboardingPostCard({ post }: { post: ChatPost }) {
  const initials =
    post.author_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Card className="overflow-hidden border-border/60 bg-card/80">
      <CardContent className="space-y-2 px-3 py-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.author_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium text-foreground">
            {post.author_name}
          </span>
          {post.author_trust_score != null && (
            <TrustScoreBadge score={post.author_trust_score} size="sm" />
          )}
        </div>

        <div className="flex items-start gap-2">
          <p className="line-clamp-2 flex-1 text-sm font-medium text-foreground">
            {post.title}
          </p>
          <Badge
            variant={post.type === "offer" ? "default" : "secondary"}
            className="shrink-0 text-[10px]"
          >
            {post.type}
          </Badge>
        </div>

        {post.body && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {post.body}
          </p>
        )}

        {(post.exchange_modes?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {(post.exchange_modes ?? []).map((mode) => {
              const info = EXCHANGE_MODES.find((m) => m.value === mode);
              return (
                <Badge
                  key={mode}
                  variant="outline"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {info?.label || mode}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Signup Form (embedded in chat) ──────────────────────────────────────────

function SignupFormMessage({
  extractedData,
  onSuccess,
}: {
  extractedData: ExtractedData;
  onSuccess: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    extractedData.display_name || ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    });

    if (signupError) {
      toast.error(signupError.message);
      setLoading(false);
      return;
    }

    // Fetch the new user to get their ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Email confirmation likely required — redirect to a friendly message
      toast.success("Check your email to confirm your account, then sign in!");
      router.push("/login");
      return;
    }

    // Update profile with everything gathered in the chat
    await supabase
      .from("profiles")
      .update({
        primary_location: extractedData.location || null,
        bio: null,
        skills: extractedData.skills,
        offers_list: extractedData.offers,
        needs_list: extractedData.needs,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    // Join pilot community
    await supabase
      .from("community_members")
      .upsert(
        { community_id: PILOT_COMMUNITY_ID, user_id: user.id },
        { onConflict: "community_id,user_id" }
      );

    toast.success("Welcome to Kula! 🌿");
    onSuccess();
    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="rounded-2xl rounded-bl-md border border-primary/20 bg-primary/5 p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Create your free account
        </p>
      </div>

      {/* Preview of what will be saved */}
      {(extractedData.offers.length > 0 || extractedData.needs.length > 0) && (
        <div className="mb-4 space-y-2 rounded-lg bg-background/60 p-3 text-xs">
          {extractedData.offers.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">
                Your offers:{" "}
              </span>
              <span className="text-foreground">
                {extractedData.offers.slice(0, 4).join(", ")}
              </span>
            </div>
          )}
          {extractedData.needs.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">
                Looking for:{" "}
              </span>
              <span className="text-foreground">
                {extractedData.needs.slice(0, 4).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ob-name" className="text-xs">
            Your name
          </Label>
          <Input
            id="ob-name"
            type="text"
            placeholder="How should the community know you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-email" className="text-xs">
            Email
          </Label>
          <Input
            id="ob-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-password" className="text-xs">
            Password
          </Label>
          <Input
            id="ob-password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-9 text-sm"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            "Joining..."
          ) : (
            <>
              Join Kula
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingChatClient() {
  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [signupShown, setSignupShown] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isNearBottom = useRef(true);
  const hasInit = useRef(false);

  // Scroll behaviour
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Send message to API ────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (userText: string | null) => {
      if (isStreaming) return;
      setIsStreaming(true);

      // Add user message (skip for init trigger)
      const chatHistory: Array<{ role: "user" | "assistant"; content: string }> =
        [];

      let updatedMessages = messages;

      if (userText !== null) {
        const userMsg: OnboardingMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: userText,
        };
        updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
      }

      // Build history for API (only user/assistant messages)
      for (const m of updatedMessages) {
        if (m.role === "user" || m.role === "assistant") {
          chatHistory.push({ role: m.role, content: m.content });
        }
      }

      // Create streaming assistant message
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          posts: [],
          isStreaming: true,
        },
      ]);

      try {
        const res = await fetch("/api/onboarding-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let pendingExtractedData: ExtractedData | null = null;
        let pendingSignupReady = false;

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
            } else if (event.type === "tool_result") {
              const posts = event.data as ChatPost[];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? { ...m, posts: [...m.posts, ...posts] }
                    : m
                )
              );
            } else if (event.type === "extracted_data") {
              pendingExtractedData = event.data as ExtractedData;
              setExtractedData(pendingExtractedData);
            } else if (event.type === "signup_ready") {
              pendingSignupReady = true;
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? { ...m, isStreaming: false }
                    : m
                )
              );

              // Append signup form after the final assistant message
              if (pendingSignupReady && pendingExtractedData && !signupShown) {
                setSignupShown(true);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "signup",
                    extractedData: pendingExtractedData!,
                  },
                ]);
              }
            } else if (event.type === "error") {
              toast.error(event.message as string);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? { ...m, isStreaming: false, content: m.content || "Sorry, something went wrong. Please try again." }
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
    [messages, isStreaming, signupShown]
  );

  // Auto-trigger welcome message on first load
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    sendMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice input ────────────────────────────────────────────────────────────

  function startListening() {
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      toast.error(
        "Voice input isn't supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as unknown[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript as string)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function toggleVoice() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  // ── Send handler ───────────────────────────────────────────────────────────

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
    const val = e.target.value.slice(0, 1000);
    setInput(val);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting to your community guide…
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === "signup") {
            return (
              <div key={msg.id} className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-[90%] flex-1">
                  <SignupFormMessage
                    extractedData={msg.extractedData}
                    onSuccess={() => {}}
                  />
                </div>
              </div>
            );
          }

          // assistant message
          return (
            <div key={msg.id} className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="max-w-[85%] space-y-3">
                {(msg.content || msg.isStreaming) && (
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm text-foreground">
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
                )}

                {msg.posts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      From your community
                    </p>
                    {msg.posts.map((post) => (
                      <OnboardingPostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Voice button */}
          <button
            type="button"
            onClick={toggleVoice}
            disabled={isStreaming}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
              isListening
                ? "bg-red-500 text-white shadow-md shadow-red-200 animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          {/* Text input */}
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening… speak now"
                : "Type or tap the mic to speak…"
            }
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />

          {/* Send button */}
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

        <p className="mt-2 text-center text-xs text-muted-foreground">
          No account needed to chat · Your data stays with you
        </p>
      </div>
    </div>
  );
}
