"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { DisputeDialog } from "@/components/exchanges/DisputeDialog";
import { DimensionRatingInput, getDimensionPrompts } from "@/components/exchanges/DimensionRatingInput";
import { AlertTriangle, Clock, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { ExchangeAgreement, Profile, Post, Database } from "@/types/database";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  proposed: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "disputed", "cancelled"],
  completed: [],
  disputed: ["cancelled"],
  cancelled: [],
};

interface ExchangeDetailProps {
  exchange: ExchangeAgreement & {
    post: Pick<Post, "id" | "title" | "type" | "category">;
    provider: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
    receiver: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
  };
  currentUserId: string;
  hasReviewed: boolean;
  userTotalExchanges?: number;
}

export function ExchangeDetail({
  exchange,
  currentUserId,
  hasReviewed,
  userTotalExchanges = 0,
}: ExchangeDetailProps) {
  const [loading, setLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewBody, setReviewBody] = useState("");
  const [dimReliability, setDimReliability] = useState(0);
  const [dimCommunication, setDimCommunication] = useState(0);
  const [dimAccuracy, setDimAccuracy] = useState(0);
  const [dimGenerosity, setDimGenerosity] = useState(0);
  const [dimCommunity, setDimCommunity] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Computed overall rating from dimensions
  const filledDimensions = [dimReliability, dimCommunication, dimAccuracy, dimGenerosity, dimCommunity].filter(d => d > 0);
  const rating = filledDimensions.length === 5
    ? Math.round(filledDimensions.reduce((a, b) => a + b, 0) / 5)
    : 0;
  const router = useRouter();
  const supabase = createClient();

  const isProvider = exchange.provider_id === currentUserId;
  const otherParty = isProvider ? exchange.receiver : exchange.provider;
  const isPostAuthor = exchange.post.type === "offer" ? isProvider : !isProvider;
  const modeInfo = EXCHANGE_MODES.find(
    (m) => m.value === exchange.exchange_mode
  );

  async function updateStatus(newStatus: Database["public"]["Enums"]["exchange_status"]) {
    const currentStatus = exchange.status ?? "proposed";
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed?.includes(newStatus)) {
      toast.error(`Cannot transition from ${currentStatus} to ${newStatus}`);
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("exchange_agreements")
      .update({ status: newStatus })
      .eq("id", exchange.id);

    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success("Exchange updated!");
      router.refresh();
    }
    setLoading(false);
  }

  async function confirmCompletion() {
    setLoading(true);
    const field = isProvider ? "provider_confirmed" : "receiver_confirmed";
    const { error } = await supabase
      .from("exchange_agreements")
      .update({ [field]: true })
      .eq("id", exchange.id);

    if (error) {
      toast.error("Failed to confirm: " + error.message);
      setLoading(false);
      return;
    }

    // Check if both parties have now confirmed
    const { data: updated } = await supabase
      .from("exchange_agreements")
      .select("provider_confirmed, receiver_confirmed")
      .eq("id", exchange.id)
      .single();

    if (updated?.provider_confirmed && updated?.receiver_confirmed) {
      await supabase
        .from("exchange_agreements")
        .update({ status: "completed" })
        .eq("id", exchange.id);
      toast.success("Exchange completed!");
    } else {
      toast.success("Confirmed! Waiting for the other party.");
    }

    router.refresh();
    setLoading(false);
  }

  async function submitReview() {
    if (filledDimensions.length < 5) {
      toast.error("Please rate all 5 dimensions");
      return;
    }
    if (reviewBody.length < 20) {
      toast.error("Review must be at least 20 characters");
      return;
    }

    setLoading(true);

    const subjectId = isProvider ? exchange.receiver_id : exchange.provider_id;

    const { error } = await supabase.from("reviews").insert({
      exchange_id: exchange.id,
      author_id: currentUserId,
      subject_id: subjectId,
      rating,
      body: reviewBody,
      dim_reliability: dimReliability,
      dim_communication: dimCommunication,
      dim_accuracy: dimAccuracy,
      dim_generosity: dimGenerosity,
      dim_community: dimCommunity,
    });

    if (error) {
      toast.error("Failed to submit review: " + error.message);
    } else {
      setShowReviewForm(false);
      setReviewSubmitted(true);
      router.refresh();
    }
    setLoading(false);
  }

  const myConfirmation = isProvider
    ? exchange.provider_confirmed
    : exchange.receiver_confirmed;

  return (
    <div className="space-y-6">
      {/* Prominent review banner at the top */}
      {exchange.status === "completed" && !hasReviewed && !showReviewForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                How was your exchange with {otherParty.display_name}?
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Your review helps build trust in the community
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowReviewForm(true)}
              className="shrink-0 bg-amber-600 hover:bg-amber-700"
            >
              Leave a Review
            </Button>
          </div>
        </div>
      )}

      {/* Review form with 5 dimensions (shown inline at top when activated) */}
      {exchange.status === "completed" && !hasReviewed && !reviewSubmitted && showReviewForm && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {(() => {
                const prompts = getDimensionPrompts(exchange.exchange_mode);
                return (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Rate your experience</Label>
                    <DimensionRatingInput label="Reliability" prompt={prompts.reliability} value={dimReliability} onChange={setDimReliability} />
                    <DimensionRatingInput label="Communication" prompt={prompts.communication} value={dimCommunication} onChange={setDimCommunication} />
                    <DimensionRatingInput label="Accuracy" prompt={prompts.accuracy} value={dimAccuracy} onChange={setDimAccuracy} />
                    <DimensionRatingInput label="Generosity" prompt={prompts.generosity} value={dimGenerosity} onChange={setDimGenerosity} />
                    <DimensionRatingInput label="Community Spirit" prompt={prompts.community} value={dimCommunity} onChange={setDimCommunity} />
                  </div>
                );
              })()}
              {userTotalExchanges < 5 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  New members (fewer than 5 exchanges) can rate up to 4 stars.
                </p>
              )}
              <div className="space-y-2">
                <Label>Written feedback</Label>
                <Textarea
                  placeholder={`What was it like sharing with ${otherParty.display_name}?`}
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={3}
                  minLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {reviewBody.length}/20 minimum characters
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950/30">
                <EyeOff className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your review is blind. Neither party sees the other&apos;s review until both submit, or after 7 days.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowReviewForm(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitReview}
                  disabled={
                    loading || filledDimensions.length < 5 || reviewBody.length < 20
                  }
                >
                  {loading ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blind review confirmation after submission */}
      {exchange.status === "completed" && !hasReviewed && reviewSubmitted && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <EyeOff className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Review submitted!
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                It will be visible once {otherParty.display_name} also submits their review, or after 7 days.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Exchange Details</CardTitle>
            <Badge variant="outline" className="capitalize">
              {(exchange.status ?? "proposed").replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Post reference */}
          <Link
            href={`/posts/${exchange.post.id}`}
            className="block rounded-lg border border-border p-3 hover:bg-accent"
          >
            <p className="text-xs text-muted-foreground">
              {exchange.post.type === "offer" ? "Offer" : "Request"}
            </p>
            <p className="text-sm font-medium">{exchange.post.title}</p>
          </Link>

          <Separator />

          {/* Participants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Provider
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={exchange.provider.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {exchange.provider.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {exchange.provider.display_name}
                    {isProvider && " (you)"}
                  </p>
                  <TrustScoreBadge
                    score={exchange.provider.trust_score}
                    size="sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Receiver
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={exchange.receiver.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {exchange.receiver.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {exchange.receiver.display_name}
                    {!isProvider && " (you)"}
                  </p>
                  <TrustScoreBadge
                    score={exchange.receiver.trust_score}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Exchange details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Mode:
              </span>
              <Badge variant="outline">{modeInfo?.label}</Badge>
            </div>
            {exchange.terms && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Terms
                </p>
                <p className="mt-1 text-sm">{exchange.terms}</p>
              </div>
            )}

            {/* Loan return date & countdown */}
            {exchange.exchange_mode === "loan" && exchange.loan_return_date && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Return Date
                </p>
                <LoanCountdown
                  returnDate={exchange.loan_return_date}
                  lateFlag={exchange.late_flag}
                />
              </div>
            )}

            {/* Late flag */}
            {exchange.late_flag && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                  This loan is significantly overdue
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Condition photos for loan exchanges */}
      {exchange.exchange_mode === "loan" && (exchange.status === "in_progress" || exchange.status === "completed") && (
        <LoanConditionPhotos
          exchangeId={exchange.id}
          beforePhotos={exchange.condition_photos_before ?? []}
          afterPhotos={exchange.condition_photos_after ?? []}
          isProvider={isProvider}
          status={exchange.status}
        />
      )}

      {/* Action buttons based on status */}
      {exchange.status === "proposed" && isPostAuthor && (
        <div className="flex gap-3">
          <Button
            onClick={() => updateStatus("accepted")}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Updating..." : "Accept"}
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus("cancelled")}
            disabled={loading}
          >
            Decline
          </Button>
        </div>
      )}

      {exchange.status === "proposed" && !isPostAuthor && (
        <p className="text-center text-sm text-muted-foreground">
          Waiting for {otherParty.display_name} to accept your proposal.
        </p>
      )}

      {exchange.status === "accepted" && (
        <Button
          onClick={() => updateStatus("in_progress")}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Updating..." : "Mark as In Progress"}
        </Button>
      )}

      {exchange.status === "in_progress" && !myConfirmation && (
        <div className="space-y-3">
          <Button
            onClick={confirmCompletion}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Confirming..." : "Confirm Completion"}
          </Button>
          <div className="flex justify-center">
            <DisputeDialog
              exchangeId={exchange.id}
              currentUserId={currentUserId}
              otherPartyName={otherParty.display_name}
            />
          </div>
        </div>
      )}

      {exchange.status === "in_progress" && myConfirmation && (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            You&apos;ve confirmed. Waiting for {otherParty.display_name} to
            confirm.
          </p>
          <div className="flex justify-center">
            <DisputeDialog
              exchangeId={exchange.id}
              currentUserId={currentUserId}
              otherPartyName={otherParty.display_name}
            />
          </div>
        </div>
      )}

      {/* Dispute details */}
      {exchange.status === "disputed" && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                Dispute Filed
              </p>
            </div>
            {exchange.dispute_reason && (
              <p className="text-sm text-muted-foreground">{exchange.dispute_reason}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This exchange is under review by community moderators.
            </p>
            {exchange.dispute_resolution && (
              <div className="mt-3 rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Resolution</p>
                <p className="mt-1 text-sm">{exchange.dispute_resolution}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {exchange.status === "completed" && hasReviewed && !reviewSubmitted && (
        <p className="text-center text-sm text-muted-foreground">
          You&apos;ve reviewed this exchange. Thank you!
        </p>
      )}
    </div>
  );
}

function LoanCountdown({ returnDate, lateFlag }: { returnDate: string; lateFlag?: boolean | null }) {
  const due = new Date(returnDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let text: string;
  let color: string;

  if (diffDays > 1) {
    text = `${diffDays} days remaining`;
    color = "text-muted-foreground";
  } else if (diffDays === 1) {
    text = "Due tomorrow";
    color = "text-amber-600 dark:text-amber-400";
  } else if (diffDays === 0) {
    text = "Due today";
    color = "text-amber-600 dark:text-amber-400";
  } else {
    text = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`;
    color = "text-red-600 dark:text-red-400";
  }

  return (
    <div className={`flex items-center gap-1.5 text-sm font-medium ${color}`}>
      <Clock className="h-4 w-4" />
      <span>{due.toLocaleDateString()}</span>
      <span className="text-xs">({text})</span>
      {lateFlag && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">LATE</Badge>}
    </div>
  );
}

function LoanConditionPhotos({
  exchangeId,
  beforePhotos,
  afterPhotos,
  isProvider,
  status,
}: {
  exchangeId: string;
  beforePhotos: string[];
  afterPhotos: string[];
  isProvider: boolean;
  status: string;
}) {
  const [before, setBefore] = useState<string[]>(beforePhotos);
  const [after, setAfter] = useState<string[]>(afterPhotos);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function savePhotos(field: "condition_photos_before" | "condition_photos_after", photos: string[]) {
    setSaving(true);
    const { error } = await supabase
      .from("exchange_agreements")
      .update({ [field]: photos })
      .eq("id", exchangeId);
    if (error) {
      toast.error("Failed to save photos");
    } else {
      toast.success("Photos saved");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Condition Photos</CardTitle>
        <p className="text-xs text-muted-foreground">
          Document the item&apos;s condition before and after the loan
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase text-muted-foreground">Before</Label>
          {isProvider && status === "in_progress" && before.length === 0 ? (
            <ImageUploader
              bucket="post-images"
              folder="condition"
              maxFiles={3}
              value={before}
              onChange={(photos) => {
                setBefore(photos);
                savePhotos("condition_photos_before", photos);
              }}
            />
          ) : before.length > 0 ? (
            <div className="flex gap-2">
              {before.map((url, i) => (
                <img key={i} src={url} alt={`Before ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No photos uploaded</p>
          )}
        </div>
        <Separator />
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase text-muted-foreground">After (on return)</Label>
          {isProvider && (status === "in_progress" || status === "completed") && after.length === 0 ? (
            <ImageUploader
              bucket="post-images"
              folder="condition"
              maxFiles={3}
              value={after}
              onChange={(photos) => {
                setAfter(photos);
                savePhotos("condition_photos_after", photos);
              }}
            />
          ) : after.length > 0 ? (
            <div className="flex gap-2">
              {after.map((url, i) => (
                <img key={i} src={url} alt={`After ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No photos uploaded yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
