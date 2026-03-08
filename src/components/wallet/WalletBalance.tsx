"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";

const TD_FLOOR = -3;
const TD_CAP = 100;
const TD_WARN_LOW = 0;
const TD_WARN_HIGH = 90;

interface WalletBalanceProps {
  balance: number;
}

export function WalletBalance({ balance }: WalletBalanceProps) {
  const nearFloor = balance <= TD_WARN_LOW;
  const nearCap = balance >= TD_WARN_HIGH;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Balance
            </p>
            <p className="text-3xl font-bold text-foreground">
              {balance.toFixed(1)}{" "}
              <span className="text-lg text-muted-foreground">TD</span>
            </p>
          </div>
        </div>

        {/* Balance limits bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Floor: {TD_FLOOR} TD</span>
            <span>Cap: {TD_CAP} TD</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, ((balance - TD_FLOOR) / (TD_CAP - TD_FLOOR)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {nearFloor && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Low balance — earn more by helping neighbors</span>
          </div>
        )}
        {nearCap && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Approaching cap — spend some TD to keep earning</span>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          1 Time Dollar = 1 hour of service. Earn by helping neighbors, spend to
          receive help.
        </p>
      </CardContent>
    </Card>
  );
}
