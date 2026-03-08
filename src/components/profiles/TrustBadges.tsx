import { Gift, RefreshCw, Activity, Users } from "lucide-react";
import type { TrustBadge } from "@/lib/utils/trust-badges";

const ICON_MAP: Record<string, React.ElementType> = {
  Gift,
  RefreshCw,
  Activity,
  Users,
};

export function TrustBadges({ badges }: { badges: TrustBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => {
        const Icon = ICON_MAP[badge.icon];
        return (
          <span
            key={badge.key}
            className={`inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium ${badge.color}`}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
