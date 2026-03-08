"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { DishSignUpBoard } from "./DishSignUpBoard";
import { RsvpButton } from "./RsvpButton";
import { AttendeeList } from "./AttendeeList";
import { PotluckCommentSection } from "./PotluckCommentSection";
import {
  CalendarDays,
  Clock,
  MapPin,
  UtensilsCrossed,
  Pencil,
  XCircle,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import type {
  PotluckWithHost,
  PotluckDishSlotWithClaimer,
  PotluckRsvpWithProfile,
  PotluckCommentWithAuthor,
} from "@/types/database";

interface PotluckDetailProps {
  potluck: PotluckWithHost;
  dishSlots: PotluckDishSlotWithClaimer[];
  rsvps: PotluckRsvpWithProfile[];
  comments: PotluckCommentWithAuthor[];
  currentUserId: string | null;
}

export function PotluckDetail({
  potluck,
  dishSlots,
  rsvps,
  comments,
  currentUserId,
}: PotluckDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [cancelling, setCancelling] = useState(false);

  const isHost = currentUserId === potluck.host_id;
  const eventDate = new Date(potluck.event_date);
  const isCancelled = potluck.status === "cancelled";
  const isPast = potluck.status === "completed";

  const currentRsvp = rsvps.find(
    (r) => r.user_id === currentUserId
  );
  const currentRsvpStatus = currentRsvp?.status === "confirmed"
    ? "confirmed"
    : currentRsvp?.status === "cancelled"
      ? "cancelled"
      : null;

  const isFull =
    potluck.capacity != null &&
    rsvps.filter((r) => r.status === "confirmed").length >= potluck.capacity;

  const hostInitials =
    potluck.host.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this potluck?")) return;
    setCancelling(true);

    const { error } = await supabase
      .from("potlucks")
      .update({ status: "cancelled" })
      .eq("id", potluck.id);

    if (error) {
      toast.error("Failed to cancel potluck");
    } else {
      toast.success("Potluck cancelled");
      router.refresh();
    }
    setCancelling(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {(isCancelled || isPast) && (
          <Badge
            variant={isCancelled ? "destructive" : "secondary"}
            className="mb-2"
          >
            {isCancelled ? "Cancelled" : "Completed"}
          </Badge>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {potluck.title}
            </h1>
            <Link
              href={`/groups/${potluck.community_id}`}
              className="text-sm text-primary hover:underline"
            >
              <Users className="inline h-3.5 w-3.5 mr-1" />
              {potluck.community.name}
            </Link>
          </div>

          {!isCancelled && !isPast && (
            <RsvpButton
              potluckId={potluck.id}
              currentUserId={currentUserId}
              currentRsvpStatus={currentRsvpStatus}
              isFull={isFull}
            />
          )}
        </div>
      </div>

      {/* Date + Host */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {format(eventDate, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(eventDate, "h:mm a")}
                {potluck.end_time &&
                  ` – ${format(new Date(potluck.end_time), "h:mm a")}`}
              </p>
            </div>
          </div>

          {(potluck.location_name || potluck.location_details) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                {potluck.location_name && (
                  <p className="text-sm font-medium text-foreground">
                    {potluck.location_name}
                  </p>
                )}
                {potluck.location_details && (
                  <p className="text-xs text-muted-foreground">
                    {potluck.location_details}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={potluck.host.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {hostInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${potluck.host_id}`}
                className="text-sm font-medium text-foreground hover:underline"
              >
                {potluck.host.display_name}
              </Link>
              <TrustScoreBadge score={potluck.host.trust_score} size="sm" />
              <Badge variant="secondary" className="text-[10px]">
                Host
              </Badge>
            </div>
          </div>

          {potluck.capacity && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                {rsvps.filter((r) => r.status === "confirmed").length}/
                {potluck.capacity} spots filled
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {potluck.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {potluck.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {potluck.images && potluck.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {potluck.images.map((url, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-muted aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${potluck.title} photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Host providing */}
      {potluck.host_providing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Host is providing
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {potluck.host_providing}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dish sign-up board */}
      {!isCancelled && (
        <Card>
          <CardContent className="p-4">
            <DishSignUpBoard
              potluckId={potluck.id}
              slots={dishSlots}
              isHost={isHost}
              currentUserId={currentUserId}
            />
          </CardContent>
        </Card>
      )}

      {/* Attendee list */}
      <Card>
        <CardContent className="p-4">
          <AttendeeList
            rsvps={rsvps}
            dishSlots={dishSlots}
            hostId={potluck.host_id}
            capacity={potluck.capacity}
          />
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardContent className="p-4">
          <PotluckCommentSection
            potluckId={potluck.id}
            comments={comments}
            currentUserId={currentUserId}
            communityId={potluck.community_id}
          />
        </CardContent>
      </Card>

      {/* Host actions */}
      {isHost && !isCancelled && !isPast && (
        <div className="flex items-center gap-2">
          <Link href={`/potlucks/${potluck.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            {cancelling ? "Cancelling..." : "Cancel Potluck"}
          </Button>
        </div>
      )}
    </div>
  );
}
