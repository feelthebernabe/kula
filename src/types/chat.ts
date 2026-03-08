export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  posts?: ChatPost[];
  isStreaming?: boolean;
}

export interface ChatPost {
  id: string;
  title: string;
  body: string | null;
  type: "offer" | "request";
  category: string;
  exchange_modes: string[];
  status: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_trust_score: number | null;
}

export type SSEEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; data: ChatPost[] }
  | { type: "done" }
  | { type: "error"; message: string };
