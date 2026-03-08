import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WalletBalance } from "@/components/wallet/WalletBalance";
import { TransactionList } from "@/components/wallet/TransactionList";
import type { Metadata } from "next";
import type { LedgerEntryWithExchange } from "@/types/database";

export const metadata: Metadata = {
  title: "Time-Dollar Wallet",
  description: "Track your time-dollar balance and transaction history",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get current balance (latest ledger entry)
  const { data: latestEntry } = await supabase
    .from("time_dollar_ledger")
    .select("balance_after")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const balance = (latestEntry?.balance_after as number) ?? 0;

  // Get transaction history
  const { data: rawTransactions } = await supabase
    .from("time_dollar_ledger")
    .select(
      `
      *,
      exchange:exchange_agreements!exchange_id(id, terms, exchange_mode)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const transactions = (rawTransactions ??
    []) as unknown as LedgerEntryWithExchange[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Time-Dollar Wallet
        </h1>
        <p className="text-sm text-muted-foreground">
          Your time is valuable — track your time-dollar balance
        </p>
      </div>
      <WalletBalance balance={balance} />
      <TransactionList transactions={transactions} />
    </div>
  );
}
