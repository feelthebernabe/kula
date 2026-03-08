import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";

interface PotluckCardProps {
  potluck: {
    id: string;
    title: string;
    event_date: string;
    location_name: string | null;
    capacity: number | null;
    rsvp_count: number | null;
    status: string | null;
    host: { display_name: string };
  };
}

export function PotluckCard({ potluck }: PotluckCardProps) {
  const eventDate = new Date(potluck.event_date);

  return (
    <Link href={`/potlucks/${potluck.id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UtensilsCrossed className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground truncate">
                {potluck.title}
              </p>
            </div>
            {potluck.status === "cancelled" && (
              <Badge variant="destructive" className="text-[10px] shrink-0">
                Cancelled
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(eventDate, "MMM d, h:mm a")}
            </span>
            {potluck.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {potluck.location_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {potluck.rsvp_count ?? 0}
              {potluck.capacity ? `/${potluck.capacity}` : ""} going
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Hosted by {potluck.host.display_name}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
