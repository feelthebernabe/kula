import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrustTier } from "./TrustScoreBadge";
import { cn } from "@/lib/utils";

interface DimensionAverages {
  reliability: number;
  communication: number;
  accuracy: number;
  generosity: number;
  community: number;
}

interface TrustBreakdownProps {
  score: number | null | undefined;
  totalExchanges: number | null | undefined;
  totalGiven: number | null | undefined;
  totalReceived: number | null | undefined;
  verificationMethods: string[] | null | undefined;
  verificationTier: string | null | undefined;
  referenceCount: number;
  reviewCount: number;
  avgRating: number | null | undefined;
  ratingStddev: number | null | undefined;
  responseRate: number | null | undefined;
  lastActive: string | null | undefined;
  dimensionAverages?: DimensionAverages | null;
}

function ProgressBar({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {Math.round(value * 10) / 10}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TrustBreakdown({
  score,
  totalExchanges,
  totalGiven,
  totalReceived,
  verificationMethods,
  verificationTier,
  referenceCount,
  reviewCount,
  avgRating,
  ratingStddev,
  responseRate,
  lastActive,
  dimensionAverages,
}: TrustBreakdownProps) {
  const safeScore = score ?? 30;
  const tier = getTrustTier(safeScore);
  const displayScore = Math.round(safeScore);

  // Calculate 7 component scores (mirroring the SQL formula)
  const exchangeCount = totalExchanges ?? 0;
  const givenCount = totalGiven ?? 0;
  const receivedCount = totalReceived ?? 0;
  const verifyCount = verificationMethods?.length ?? 0;
  const vTier = verificationTier ?? "basic";

  // 1. Reviews (max 25) — Bayesian with platform prior of 3.0
  // Zero if no reviews; Bayesian prior only kicks in once there's real data
  let reviewPoints: number;
  if (reviewCount === 0) {
    reviewPoints = 0;
  } else {
    const platformAvg = 3.0;
    const priorWeight = 6;
    const bayesianAvg = ((avgRating ?? 3) * reviewCount + platformAvg * priorWeight) / (reviewCount + priorWeight);
    reviewPoints = Math.min(25, Math.max(0, (bayesianAvg / 5) * 25));
  }

  // 2. Exchange volume (max 15, logarithmic)
  let volumePoints: number;
  if (exchangeCount > 0) {
    volumePoints = Math.min(15, 15 * Math.log(exchangeCount + 1) / Math.log(51));
  } else {
    volumePoints = 0;
  }

  // 3. Generosity ratio (max 20) — zero if no exchanges at all
  let generosityPoints: number;
  if (givenCount === 0 && receivedCount === 0) {
    generosityPoints = 0;
  } else {
    const generosityRatio = receivedCount > 0 ? givenCount / receivedCount : 2.0;
    generosityPoints = Math.min(20, (Math.min(generosityRatio, 2.0) / 2.0) * 20);
  }

  // 4. Consistency (max 15) — zero until first review, partial credit with <3
  let consistencyPoints: number;
  if (reviewCount === 0) {
    consistencyPoints = 0;
  } else if (reviewCount >= 3) {
    consistencyPoints = Math.min(15, Math.max(0, 15 * (1 - (ratingStddev ?? 0) / 2)));
  } else {
    consistencyPoints = 7.5;
  }

  // 5. Verification (max 10)
  let verificationPoints = Math.min(4, verifyCount * 2);
  if (vTier === "verified" || vTier === "community_vouched") {
    verificationPoints += 6;
  }
  verificationPoints = Math.min(10, verificationPoints);

  // 6. Response rate (max 10) — zero if no messages received yet
  const responsePoints = responseRate !== null && responseRate !== undefined
    ? Math.min(10, responseRate / 10)
    : 0;

  // 7. Activity recency (max 5)
  let recencyPoints: number;
  if (lastActive) {
    const daysInactive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
    if (daysInactive <= 30) {
      recencyPoints = 5;
    } else if (daysInactive <= 60) {
      recencyPoints = 5 * (1 - (daysInactive - 30) / 30);
    } else {
      recencyPoints = 0;
    }
  } else {
    recencyPoints = 5;
  }

  // Next tier info
  let nextTier = "";
  let pointsToNext = 0;
  if (safeScore < 60) {
    nextTier = "Established";
    pointsToNext = 60 - safeScore;
  } else if (safeScore < 85) {
    nextTier = "Highly Trusted";
    pointsToNext = 85 - safeScore;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Trust Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score circle */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold",
              tier.color
            )}
          >
            {displayScore}
          </div>
          <div>
            <p className={cn("text-sm font-semibold", tier.color.split(" ")[0])}>
              {tier.label}
            </p>
            {nextTier && (
              <p className="text-xs text-muted-foreground">
                {Math.round(pointsToNext)} points to {nextTier}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {reviewCount} review{reviewCount !== 1 ? "s" : ""} &middot;{" "}
              {referenceCount} reference{referenceCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-2.5">
          <ProgressBar
            value={reviewPoints}
            max={25}
            label="Reviews"
            color="bg-yellow-500"
          />
          <ProgressBar
            value={generosityPoints}
            max={20}
            label="Generosity"
            color="bg-pink-500"
          />
          <ProgressBar
            value={volumePoints}
            max={15}
            label="Exchange Volume"
            color="bg-blue-500"
          />
          <ProgressBar
            value={consistencyPoints}
            max={15}
            label="Consistency"
            color="bg-indigo-500"
          />
          <ProgressBar
            value={verificationPoints}
            max={10}
            label="Verification"
            color="bg-violet-500"
          />
          <ProgressBar
            value={responsePoints}
            max={10}
            label="Response Rate"
            color="bg-cyan-500"
          />
          <ProgressBar
            value={recencyPoints}
            max={5}
            label="Activity"
            color="bg-emerald-500"
          />
        </div>

        {/* Dimension averages (from structured reviews) */}
        {dimensionAverages && (
          <>
            <div className="border-t pt-3 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Review Dimensions
              </p>
              <div className="space-y-2">
                <ProgressBar value={dimensionAverages.reliability} max={5} label="Reliability" color="bg-orange-500" />
                <ProgressBar value={dimensionAverages.communication} max={5} label="Communication" color="bg-teal-500" />
                <ProgressBar value={dimensionAverages.accuracy} max={5} label="Accuracy" color="bg-sky-500" />
                <ProgressBar value={dimensionAverages.generosity} max={5} label="Generosity" color="bg-rose-500" />
                <ProgressBar value={dimensionAverages.community} max={5} label="Community Spirit" color="bg-lime-500" />
              </div>
            </div>
          </>
        )}

        {reviewCount < 3 && (
          <p className="text-xs text-muted-foreground border-t pt-2 mt-1">
            New member &mdash; trust score stabilizes after 3+ reviews
          </p>
        )}
      </CardContent>
    </Card>
  );
}
