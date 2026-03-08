import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { Users } from "lucide-react";
import type { PotluckRsvpWithProfile, PotluckDishSlotWithClaimer } from "@/types/database";

interface AttendeeListProps {
  rsvps: PotluckRsvpWithProfile[];
  dishSlots: PotluckDishSlotWithClaimer[];
  hostId: string;
  capacity: number | null;
}

export function AttendeeList({
  rsvps,
  dishSlots,
  hostId,
  capacity,
}: AttendeeListProps) {
  const confirmed = rsvps.filter((r) => r.status === "confirmed");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Attendees
        </h3>
        <span className="text-xs text-muted-foreground">
          {confirmed.length}
          {capacity ? `/${capacity}` : ""} going
        </span>
      </div>

      <div className="space-y-2">
        {confirmed.map((rsvp) => {
          const profile = rsvp.profile;
          const isHost = rsvp.user_id === hostId;
          const bringing = dishSlots
            .filter((s) => s.claimed_by === rsvp.user_id && s.dish_name)
            .map((s) => s.dish_name)
            .join(", ");

          return (
            <Link
              key={rsvp.id}
              href={`/profile/${rsvp.user_id}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {profile.display_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {profile.display_name}
                  </span>
                  <TrustScoreBadge score={profile.trust_score} size="sm" />
                  {isHost && (
                    <Badge variant="secondary" className="text-[10px]">
                      Host
                    </Badge>
                  )}
                </div>
                {bringing && (
                  <p className="text-xs text-muted-foreground truncate">
                    Bringing: {bringing}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
