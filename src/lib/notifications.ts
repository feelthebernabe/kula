import {
  Bell,
  MessageCircle,
  Handshake,
  Star,
  MessageSquare,
  Megaphone,
  UtensilsCrossed,
  Shield,
  Clock,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Database } from "@/types/database";

type NotificationType = Database["public"]["Enums"]["notification_type"];

export function getNotificationHref(
  type: NotificationType,
  data: Record<string, unknown> | null
): string {
  if (!data) return "/notifications";

  switch (type) {
    case "new_message":
      return data.conversation_id
        ? `/messages/${data.conversation_id}`
        : "/messages";

    case "exchange_proposed":
    case "exchange_accepted":
    case "exchange_completed":
      return data.exchange_id
        ? `/exchanges/${data.exchange_id}`
        : "/exchanges";

    case "review_received":
      return data.exchange_id
        ? `/exchanges/${data.exchange_id}`
        : "/profile";

    case "discussion_reply":
      return data.thread_id
        ? `/discuss/${data.thread_id}`
        : "/discuss";

    case "post_response":
      return data.post_id
        ? `/posts/${data.post_id}`
        : "/feed";

    case "community_announcement":
      return "/feed";

    case "potluck_created":
    case "potluck_rsvp":
    case "potluck_reminder":
    case "potluck_cancelled":
    case "potluck_updated":
      return data.potluck_id
        ? `/potlucks/${data.potluck_id}`
        : "/groups";

    case "content_flagged":
    case "content_removed":
    case "user_warned":
    case "user_suspended":
      return data.community_id
        ? `/groups/${data.community_id}`
        : "/groups";

    case "loan_return_reminder":
    case "loan_overdue":
    case "dispute_filed":
    case "dispute_resolved":
      return data.exchange_id
        ? `/exchanges/${data.exchange_id}`
        : "/exchanges";

    case "trust_milestone":
      return data.user_id
        ? `/profile/${data.user_id}`
        : "/profile";

    case "review_reminder":
      return "/exchanges";

    case "posting_suspended":
      return "/exchanges";

    default:
      return "/notifications";
  }
}

export function getNotificationIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case "new_message":
      return MessageCircle;
    case "exchange_proposed":
    case "exchange_accepted":
    case "exchange_completed":
      return Handshake;
    case "review_received":
      return Star;
    case "discussion_reply":
      return MessageSquare;
    case "post_response":
      return MessageCircle;
    case "community_announcement":
      return Megaphone;
    case "potluck_created":
    case "potluck_rsvp":
    case "potluck_reminder":
    case "potluck_cancelled":
    case "potluck_updated":
      return UtensilsCrossed;
    case "content_flagged":
    case "content_removed":
    case "user_warned":
    case "user_suspended":
      return Shield;
    case "loan_return_reminder":
      return Clock;
    case "loan_overdue":
      return AlertTriangle;
    case "dispute_filed":
    case "dispute_resolved":
      return AlertTriangle;
    case "trust_milestone":
      return Trophy;
    case "review_reminder":
      return Star;
    case "posting_suspended":
      return Shield;
    default:
      return Bell;
  }
}
