export interface TrustBadge {
  key: string;
  label: string;
  icon: "Zap" | "Gift" | "RefreshCw" | "Activity" | "Users";
  color: string;
}

interface UserStats {
  giftExchangesCompleted: number;
  loanExchangesCompleted: number;
  negativeReviewCount: number;
  recentActivity: boolean; // posted or exchanged in last 30 days
  acceptedInvites: number;
}

/**
 * Compute trust badges from user stats.
 * These are calculated from existing data, no new DB table needed.
 */
export function computeTrustBadges(stats: UserStats): TrustBadge[] {
  const badges: TrustBadge[] = [];

  if (stats.giftExchangesCompleted >= 3) {
    badges.push({
      key: "generous_giver",
      label: "Generous Giver",
      icon: "Gift",
      color: "text-pink-600",
    });
  }

  if (
    stats.loanExchangesCompleted >= 3 &&
    stats.negativeReviewCount === 0
  ) {
    badges.push({
      key: "reliable_returner",
      label: "Reliable Returner",
      icon: "RefreshCw",
      color: "text-blue-600",
    });
  }

  if (stats.recentActivity) {
    badges.push({
      key: "active_neighbor",
      label: "Active Neighbor",
      icon: "Activity",
      color: "text-emerald-600",
    });
  }

  if (stats.acceptedInvites >= 3) {
    badges.push({
      key: "community_builder",
      label: "Community Builder",
      icon: "Users",
      color: "text-violet-600",
    });
  }

  return badges;
}
