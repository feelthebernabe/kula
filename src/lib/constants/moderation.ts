export const FLAG_REASONS = [
  { value: "spam" as const, label: "Spam", description: "Unsolicited or irrelevant content" },
  { value: "harassment" as const, label: "Harassment", description: "Abusive or threatening behavior" },
  { value: "misinformation" as const, label: "Misinformation", description: "Misleading or false information" },
  { value: "inappropriate" as const, label: "Inappropriate", description: "Content that violates community standards" },
  { value: "other" as const, label: "Other", description: "Another reason not listed above" },
] as const;

export const DEFAULT_COMMUNITY_RULES = [
  "Be respectful and kind to all community members",
  "No spam, scams, or misleading posts",
  "Keep exchanges fair and transparent",
  "Respect others' privacy and personal boundaries",
  "Report concerns to moderators rather than engaging in conflict",
];

export const SUSPEND_DURATIONS = [
  { value: "1d", label: "1 day", days: 1 },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "permanent", label: "Permanent", days: null },
] as const;

export const MOD_ACTION_LABELS: Record<string, string> = {
  flag_dismissed: "Flag Dismissed",
  content_removed: "Content Removed",
  user_warned: "User Warned",
  user_suspended: "User Suspended",
  user_unsuspended: "User Unsuspended",
  thread_pinned: "Thread Pinned",
  thread_unpinned: "Thread Unpinned",
  role_changed: "Role Changed",
  dispute_resolved: "Dispute Resolved",
};
