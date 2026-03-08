import { cn } from "@/lib/utils";

interface TrustScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function getTrustTier(score: number) {
  if (score >= 85)
    return {
      label: "Highly Trusted",
      color: "text-emerald-600 bg-emerald-500/10",
      icon: "shield-check",
    };
  if (score >= 60)
    return {
      label: "Established",
      color: "text-amber-600 bg-amber-500/10",
      icon: "shield",
    };
  return {
    label: "Building",
    color: "text-orange-500 bg-orange-500/10",
    icon: "shield-alert",
  };
}

export function TrustScoreBadge({
  score,
  size = "md",
  showLabel = false,
}: TrustScoreBadgeProps) {
  const safeScore = score ?? 30;
  const tier = getTrustTier(safeScore);
  const displayScore = Math.round(safeScore);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        tier.color,
        {
          "px-1.5 py-0.5 text-[10px]": size === "sm",
          "px-2 py-0.5 text-xs": size === "md",
          "px-2.5 py-1 text-sm": size === "lg",
        }
      )}
      title={`Trust Score: ${displayScore}/100 — ${tier.label}`}
    >
      <svg
        className={cn("shrink-0", {
          "h-2.5 w-2.5": size === "sm",
          "h-3 w-3": size === "md",
          "h-3.5 w-3.5": size === "lg",
        })}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 1a.75.75 0 0 1 .65.376l1.552 2.7 3.017.56a.75.75 0 0 1 .422 1.259l-2.1 2.19.41 3.057a.75.75 0 0 1-1.1.777L10 10.347l-2.851 1.572a.75.75 0 0 1-1.1-.777l.41-3.057-2.1-2.19a.75.75 0 0 1 .422-1.259l3.017-.56 1.552-2.7A.75.75 0 0 1 10 1Z"
          clipRule="evenodd"
        />
      </svg>
      {displayScore}
      {showLabel && <span className="ml-0.5">{tier.label}</span>}
    </span>
  );
}
