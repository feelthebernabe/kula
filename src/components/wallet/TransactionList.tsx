"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, Gift } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LedgerEntryWithExchange } from "@/types/database";

interface TransactionListProps {
  transactions: LedgerEntryWithExchange[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No transactions yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete a time-dollar exchange to see activity here
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx) => {
            const isCredit = tx.amount > 0;
            const isBonus = tx.type === "starter_bonus";

            return (
              <div key={tx.id} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isBonus
                      ? "bg-amber-500/10"
                      : isCredit
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10"
                  }`}
                >
                  {isBonus ? (
                    <Gift className="h-4 w-4 text-amber-600" />
                  ) : isCredit ? (
                    <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {tx.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {tx.created_at &&
                        formatDistanceToNow(new Date(tx.created_at), {
                          addSuffix: true,
                        })}
                    </span>
                    {tx.exchange_id && (
                      <Link
                        href={`/exchanges/${tx.exchange_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View exchange
                      </Link>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {isCredit ? "+" : ""}
                    {tx.amount.toFixed(1)} TD
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Bal: {tx.balance_after.toFixed(1)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
