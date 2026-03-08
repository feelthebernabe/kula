"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { SuspendDialog } from "./SuspendDialog";
import { MOD_ACTION_LABELS } from "@/lib/constants/moderation";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type {
  FlagQueueItem,
  ModActionWithDetails,
  CommunityBanWithDetails,
} from "@/types/database";

interface DisputedExchange {
  id: string;
  status: string;
  dispute_reason: string | null;
  dispute_filed_by: string | null;
  dispute_filed_at: string | null;
  exchange_mode: string;
  provider: { id: string; display_name: string; avatar_url: string | null };
  receiver: { id: string; display_name: string; avatar_url: string | null };
  post: { id: string; title: string };
}
import { formatDistanceToNow } from "date-fns";

interface ModPanelProps {
  communityId: string;
  currentUserId: string;
}

function getContentHref(contentType: string, contentId: string): string {
  switch (contentType) {
    case "post":
      return `/posts/${contentId}`;
    case "thread":
      return `/discuss/${contentId}`;
    case "reply":
      return `/discuss/${contentId}`;
    case "profile":
      return `/profile/${contentId}`;
    default:
      return "#";
  }
}

export function ModPanel({ communityId, currentUserId }: ModPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  const [flags, setFlags] = useState<FlagQueueItem[]>([]);
  const [disputes, setDisputes] = useState<DisputedExchange[]>([]);
  const [modActions, setModActions] = useState<ModActionWithDetails[]>([]);
  const [bans, setBans] = useState<CommunityBanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});
  const [suspendTarget, setSuspendTarget] = useState<{
    userId: string;
    userName: string;
    flagId?: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch flag queue via RPC
      const { data: flagData } = await supabase.rpc("get_flag_queue", {
        p_community_id: communityId,
      });
      setFlags((flagData ?? []) as unknown as FlagQueueItem[]);

      // Fetch disputed exchanges in this community
      const { data: disputeData } = await supabase
        .from("exchange_agreements")
        .select(
          "id, status, dispute_reason, dispute_filed_by, dispute_filed_at, exchange_mode, provider:profiles!provider_id(id, display_name, avatar_url), receiver:profiles!receiver_id(id, display_name, avatar_url), post:posts!post_id(id, title, community_id)"
        )
        .eq("status", "disputed");
      // Filter to this community's posts
      const communityDisputes = ((disputeData ?? []) as unknown as (DisputedExchange & { post: { id: string; title: string; community_id: string | null } })[])
        .filter((d) => d.post && (d.post as unknown as { community_id: string | null }).community_id === communityId);
      setDisputes(communityDisputes);

      // Fetch mod actions
      const { data: actionData } = await supabase
        .from("mod_actions")
        .select(
          "*, moderator:profiles!moderator_id(id, display_name, avatar_url), target_user:profiles!target_user_id(id, display_name, avatar_url)"
        )
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(50);
      setModActions(
        (actionData ?? []) as unknown as ModActionWithDetails[]
      );

      // Fetch active bans only (filter expired)
      const { data: banData } = await supabase
        .from("community_bans")
        .select(
          "*, user:profiles!user_id(id, display_name, avatar_url), banner:profiles!banned_by(id, display_name, avatar_url)"
        )
        .eq("community_id", communityId)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      setBans(
        (banData ?? []) as unknown as CommunityBanWithDetails[]
      );

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  async function handleDismissFlag(flagId: string) {
    const { data } = await supabase
      .from("content_flags")
      .update({
        status: "dismissed",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", flagId)
      .eq("status", "pending")
      .select("id");

    if (!data || data.length === 0) {
      toast.error("Flag was already resolved by another moderator");
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
      return;
    }

    await supabase.from("mod_actions").insert({
      community_id: communityId,
      moderator_id: currentUserId,
      action_type: "flag_dismissed",
      flag_id: flagId,
    });

    setFlags((prev) => prev.filter((f) => f.id !== flagId));
    toast.success("Flag dismissed");
    router.refresh();
  }

  async function handleRemoveContent(flag: FlagQueueItem, alsoWarn = false) {
    // Race condition guard: only resolve if still pending
    const { data: resolved } = await supabase
      .from("content_flags")
      .update({
        status: "actioned",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", flag.id)
      .eq("status", "pending")
      .select("id");

    if (!resolved || resolved.length === 0) {
      toast.error("Flag was already resolved by another moderator");
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      return;
    }

    // Set removed_by_mod on the content (skip for profile reports)
    if (flag.content_type !== "profile") {
      const table =
        flag.content_type === "post"
          ? "posts"
          : flag.content_type === "thread"
            ? "discussion_threads"
            : flag.content_type === "reply"
              ? "discussion_replies"
              : "potluck_comments";

      await supabase
        .from(table)
        .update({
          removed_by_mod: currentUserId,
          removed_reason: `Flagged for: ${flag.reason}`,
          removed_at: new Date().toISOString(),
        })
        .eq("id", flag.content_id);
    }

    // Log mod action
    await supabase.from("mod_actions").insert({
      community_id: communityId,
      moderator_id: currentUserId,
      action_type: "content_removed",
      target_user_id: flag.content_author_id,
      target_content_type: flag.content_type,
      target_content_id: flag.content_id,
      flag_id: flag.id,
      reason: `Flagged for: ${flag.reason}`,
    });

    // Notify content author
    await supabase.from("notifications").insert({
      recipient_id: flag.content_author_id,
      type: "content_removed",
      title: "Your content was removed",
      body: `A moderator removed your ${flag.content_type} for: ${flag.reason}`,
      data: { community_id: communityId },
    });

    // Combined Remove & Warn (#17)
    if (alsoWarn) {
      await supabase.from("user_warnings").insert({
        community_id: communityId,
        user_id: flag.content_author_id,
        moderator_id: currentUserId,
        reason: `Warned for: ${flag.reason}`,
        flag_id: flag.id,
      });

      await supabase.from("mod_actions").insert({
        community_id: communityId,
        moderator_id: currentUserId,
        action_type: "user_warned",
        target_user_id: flag.content_author_id,
        flag_id: flag.id,
        reason: `Warned for: ${flag.reason}`,
      });

      await supabase.from("notifications").insert({
        recipient_id: flag.content_author_id,
        type: "user_warned",
        title: "You received a warning",
        body: `A moderator warned you for: ${flag.reason}`,
        data: { community_id: communityId },
      });
    }

    setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    toast.success(alsoWarn ? "Content removed & user warned" : "Content removed");
    router.refresh();
  }

  async function handleWarnUser(flag: FlagQueueItem) {
    const { data: resolved } = await supabase
      .from("content_flags")
      .update({
        status: "actioned",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", flag.id)
      .eq("status", "pending")
      .select("id");

    if (!resolved || resolved.length === 0) {
      toast.error("Flag was already resolved by another moderator");
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      return;
    }

    await supabase.from("user_warnings").insert({
      community_id: communityId,
      user_id: flag.content_author_id,
      moderator_id: currentUserId,
      reason: `Warned for: ${flag.reason}`,
      flag_id: flag.id,
    });

    await supabase.from("mod_actions").insert({
      community_id: communityId,
      moderator_id: currentUserId,
      action_type: "user_warned",
      target_user_id: flag.content_author_id,
      flag_id: flag.id,
      reason: `Warned for: ${flag.reason}`,
    });

    await supabase.from("notifications").insert({
      recipient_id: flag.content_author_id,
      type: "user_warned",
      title: "You received a warning",
      body: `A moderator warned you for: ${flag.reason}`,
      data: { community_id: communityId },
    });

    setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    toast.success("User warned");
    router.refresh();
  }

  async function handleLiftBan(banId: string) {
    const ban = bans.find((b) => b.id === banId);
    if (!ban) return;

    await supabase.from("community_bans").delete().eq("id", banId);

    await supabase.from("mod_actions").insert({
      community_id: communityId,
      moderator_id: currentUserId,
      action_type: "user_unsuspended",
      target_user_id: ban.user_id,
    });

    setBans((prev) => prev.filter((b) => b.id !== banId));
    toast.success("Ban lifted");
    router.refresh();
  }

  async function resolveDispute(exchangeId: string, resolution: "completed" | "cancelled", providerId: string, receiverId: string) {
    const notes = resolutionText[exchangeId]?.trim();
    if (!notes) {
      toast.error("Please add resolution notes");
      return;
    }

    const { error } = await supabase
      .from("exchange_agreements")
      .update({
        status: resolution,
        dispute_resolved_by: currentUserId,
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: notes,
      })
      .eq("id", exchangeId)
      .eq("status", "disputed");

    if (error) {
      toast.error("Failed to resolve dispute: " + error.message);
      return;
    }

    // Log mod action
    await supabase.from("mod_actions").insert({
      community_id: communityId,
      moderator_id: currentUserId,
      action_type: "dispute_resolved",
      target_content_id: exchangeId,
      reason: `Resolved as ${resolution}: ${notes}`,
    });

    // Notify both parties
    for (const recipientId of [providerId, receiverId]) {
      await supabase.from("notifications").insert({
        recipient_id: recipientId,
        type: "dispute_resolved",
        title: "Dispute Resolved",
        body: `A moderator resolved the dispute. Outcome: ${resolution}. ${notes}`,
        data: { exchange_id: exchangeId },
      });
    }

    setDisputes((prev) => prev.filter((d) => d.id !== exchangeId));
    toast.success(`Dispute resolved as ${resolution}`);
    router.refresh();
  }

  const reasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case "harassment":
        return "destructive" as const;
      case "spam":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Moderation</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Moderation</h3>
        {flags.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {flags.length}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="flags">
        <TabsList className="w-full">
          <TabsTrigger value="flags" className="flex-1">
            Flags{flags.length > 0 ? ` (${flags.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex-1">
            Disputes{disputes.length > 0 ? ` (${disputes.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1">
            Log
          </TabsTrigger>
          <TabsTrigger value="bans" className="flex-1">
            Bans{bans.length > 0 ? ` (${bans.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-3 mt-3">
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending flags
            </p>
          ) : (
            flags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant={reasonBadgeVariant(flag.reason)} className="text-xs">
                      {flag.reason}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">
                      {flag.content_type}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(flag.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {flag.content_preview && (
                  <Link
                    href={getContentHref(flag.content_type, flag.content_id)}
                    className="flex items-center gap-1.5 text-sm text-foreground line-clamp-2 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {flag.content_preview}
                  </Link>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    By:{" "}
                    <Link href={`/profile/${flag.content_author_id}`} className="hover:underline">
                      {flag.author_display_name}
                    </Link>
                  </span>
                  <span>|</span>
                  <span>Reported by: {flag.reporter_display_name}</span>
                </div>

                {flag.description && (
                  <p className="text-xs text-muted-foreground italic">
                    &ldquo;{flag.description}&rdquo;
                  </p>
                )}

                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDismissFlag(flag.id)}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Dismiss
                  </Button>
                  {flag.content_type !== "profile" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemoveContent(flag)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-orange-600 hover:text-orange-600"
                    onClick={() => handleWarnUser(flag)}
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Warn
                  </Button>
                  {flag.content_type !== "profile" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-orange-600 hover:text-orange-600"
                      onClick={() => handleRemoveContent(flag, true)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove & Warn
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() =>
                      setSuspendTarget({
                        userId: flag.content_author_id,
                        userName: flag.author_display_name,
                        flagId: flag.id,
                      })
                    }
                  >
                    <Ban className="mr-1 h-3 w-3" />
                    Suspend
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="disputes" className="space-y-3 mt-3">
          {disputes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active disputes
            </p>
          ) : (
            disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-lg border border-orange-200 p-3 space-y-2 dark:border-orange-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      {dispute.exchange_mode}
                    </Badge>
                    {dispute.dispute_filed_at && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(dispute.dispute_filed_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <Link href={`/exchanges/${dispute.id}`} className="text-xs text-primary hover:underline shrink-0">
                    View Exchange
                  </Link>
                </div>

                <Link href={`/posts/${dispute.post.id}`} className="text-sm font-medium hover:text-primary transition-colors block">
                  {dispute.post.title}
                </Link>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Provider: <Link href={`/profile/${dispute.provider.id}`} className="hover:underline">{dispute.provider.display_name}</Link></span>
                  <span>Receiver: <Link href={`/profile/${dispute.receiver.id}`} className="hover:underline">{dispute.receiver.display_name}</Link></span>
                </div>

                {dispute.dispute_reason && (
                  <p className="text-xs text-muted-foreground italic">
                    &ldquo;{dispute.dispute_reason}&rdquo;
                  </p>
                )}

                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Resolution notes</Label>
                    <Textarea
                      placeholder="Explain the resolution..."
                      value={resolutionText[dispute.id] || ""}
                      onChange={(e) => setResolutionText((prev) => ({ ...prev, [dispute.id]: e.target.value }))}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => resolveDispute(dispute.id, "completed", dispute.provider.id, dispute.receiver.id)}
                      disabled={!resolutionText[dispute.id]?.trim()}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Complete Exchange
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => resolveDispute(dispute.id, "cancelled", dispute.provider.id, dispute.receiver.id)}
                      disabled={!resolutionText[dispute.id]?.trim()}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Cancel Exchange
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="log" className="space-y-2 mt-3">
          {modActions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No mod actions yet
            </p>
          ) : (
            modActions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 py-2 border-b last:border-b-0"
              >
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarImage
                    src={action.moderator.avatar_url || undefined}
                  />
                  <AvatarFallback className="text-[10px]">
                    {action.moderator.display_name?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">
                      {action.moderator.display_name}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {MOD_ACTION_LABELS[action.action_type] ||
                        action.action_type}
                    </Badge>
                    {action.target_user && (
                      <Link
                        href={`/profile/${action.target_user.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        → {action.target_user.display_name}
                      </Link>
                    )}
                  </div>
                  {action.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.reason}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(action.created_at!), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="bans" className="space-y-2 mt-3">
          {bans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active bans
            </p>
          ) : (
            bans.map((ban) => (
              <div
                key={ban.id}
                className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={ban.user.avatar_url || undefined}
                      />
                      <AvatarFallback className="text-[10px]">
                        {ban.user.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/profile/${ban.user.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {ban.user.display_name}
                    </Link>
                    <Badge
                      variant={ban.expires_at ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {ban.expires_at ? "Temporary" : "Permanent"}
                    </Badge>
                  </div>
                  {ban.reason && (
                    <p className="text-xs text-muted-foreground mt-1 pl-8">
                      {ban.reason}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-8">
                    By {ban.banner.display_name}{" "}
                    {ban.created_at &&
                      formatDistanceToNow(new Date(ban.created_at), {
                        addSuffix: true,
                      })}
                    {ban.expires_at &&
                      ` · Expires ${formatDistanceToNow(
                        new Date(ban.expires_at),
                        { addSuffix: true }
                      )}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => handleLiftBan(ban.id)}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Lift
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {suspendTarget && (
        <SuspendDialog
          open={!!suspendTarget}
          onOpenChange={(open) => !open && setSuspendTarget(null)}
          communityId={communityId}
          targetUserId={suspendTarget.userId}
          targetUserName={suspendTarget.userName}
          moderatorId={currentUserId}
          flagId={suspendTarget.flagId}
        />
      )}
    </div>
  );
}
