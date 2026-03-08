"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
import type { MapPotluck } from "@/types/database";

export function PotluckMapPopup({ potluck }: { potluck: MapPotluck }) {
  const eventDate = new Date(potluck.event_date);

  return (
    <Link
      href={`/potlucks/${potluck.id}`}
      className="block space-y-2 no-underline"
    >
      <div className="flex items-center gap-2">
        <Badge className="text-[10px] bg-orange-500 hover:bg-orange-600">
          <UtensilsCrossed className="h-3 w-3 mr-1" />
          Potluck
        </Badge>
      </div>

      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
        {potluck.title}
      </p>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {format(eventDate, "MMM d, h:mm a")}
        </p>
        {potluck.location_name && (
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {potluck.location_name}
          </p>
        )}
        <p className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {potluck.rsvp_count}
          {potluck.capacity ? `/${potluck.capacity}` : ""} going
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Hosted by {potluck.host_display_name} &middot;{" "}
        {potluck.community_name}
      </p>
    </Link>
  );
}
