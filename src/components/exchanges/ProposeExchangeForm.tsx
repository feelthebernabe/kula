"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import type { Database, TablesInsert } from "@/types/database";

interface ProposeExchangeFormProps {
  postId: string;
  postTitle: string;
  postAuthorId: string;
  postType: "offer" | "request";
  postExchangeModes: string[];
  currentUserId: string;
  conversationId?: string;
  currentTdBalance?: number;
}

export function ProposeExchangeForm({
  postId,
  postTitle,
  postAuthorId,
  postType,
  postExchangeModes,
  currentUserId,
  conversationId,
  currentTdBalance,
}: ProposeExchangeFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedMode, setSelectedMode] = useState("");
  const [terms, setTerms] = useState("");
  const [timeDollarAmount, setTimeDollarAmount] = useState("");
  const [loanReturnDate, setLoanReturnDate] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  const availableModes = EXCHANGE_MODES.filter(
    (m) =>
      postExchangeModes.includes(m.value) ||
      postExchangeModes.includes("flexible")
  );

  async function handlePropose() {
    if (submittingRef.current) return;
    if (!selectedMode) {
      toast.error("Please select an exchange mode");
      return;
    }

    // TD balance validation
    if (selectedMode === "time_dollar" && timeDollarAmount) {
      const amount = parseFloat(timeDollarAmount);
      if (amount < 0.25) {
        toast.error("Minimum time-dollar amount is 0.25 (15 minutes)");
        return;
      }
      // Check if the receiver (spender) would go below -3 TD floor
      if (currentTdBalance !== undefined) {
        const isCurrentUserReceiver = postType === "offer";
        if (isCurrentUserReceiver && currentTdBalance - amount < -3) {
          toast.error(`This would put your balance below the -3 TD floor. Your balance: ${currentTdBalance.toFixed(1)} TD`);
          return;
        }
      }
    }

    submittingRef.current = true;
    setLoading(true);

    // Determine provider/receiver based on post type
    // For offers: post author provides, responder receives
    // For requests: responder provides, post author receives
    const isPostAuthorProvider = postType === "offer";
    const providerId = isPostAuthorProvider ? postAuthorId : currentUserId;
    const receiverId = isPostAuthorProvider ? currentUserId : postAuthorId;

    const insertData: TablesInsert<"exchange_agreements"> = {
      post_id: postId,
      provider_id: providerId,
      receiver_id: receiverId,
      exchange_mode: selectedMode as Database["public"]["Enums"]["exchange_mode"],
      terms: terms.trim() || null,
      time_dollar_amount: selectedMode === "time_dollar" && timeDollarAmount ? parseFloat(timeDollarAmount) : null,
      loan_return_date: selectedMode === "loan" && loanReturnDate ? loanReturnDate : null,
    };

    const { data, error } = await supabase
      .from("exchange_agreements")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to propose exchange: " + error.message);
    } else {
      // Link the exchange to the conversation
      if (conversationId) {
        await supabase
          .from("conversations")
          .update({ exchange_agreement_id: data.id })
          .eq("id", conversationId);
      }
      toast.success("Exchange proposed!");
      router.push(`/exchanges/${data.id}`);
    }

    setLoading(false);
  }

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        variant="outline"
        className="w-full"
      >
        <Handshake className="mr-2 h-4 w-4" />
        Propose Exchange
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Propose Exchange</CardTitle>
        <p className="text-xs text-muted-foreground">
          For: {postTitle}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exchange Mode */}
        <div className="space-y-2">
          <Label>Exchange Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setSelectedMode(mode.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedMode === mode.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-sm font-medium">{mode.label}</p>
                <p className="text-xs text-muted-foreground">
                  {mode.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Conditional fields */}
        {selectedMode === "time_dollar" && (
          <div className="space-y-2">
            <Label htmlFor="timeDollar">Time-Dollar Amount (hours)</Label>
            <Input
              id="timeDollar"
              type="number"
              min="0.25"
              step="0.25"
              placeholder="e.g. 1.5"
              value={timeDollarAmount}
              onChange={(e) => setTimeDollarAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Min: 0.25 TD (15 min). 1 TD = 1 hour of service.
            </p>
            {currentTdBalance !== undefined && postType === "offer" && (
              <p className="text-xs text-muted-foreground">
                Your balance: {currentTdBalance.toFixed(1)} TD (floor: -3 TD)
              </p>
            )}
          </div>
        )}

        {selectedMode === "loan" && (
          <div className="space-y-2">
            <Label htmlFor="returnDate">Expected Return Date</Label>
            <Input
              id="returnDate"
              type="date"
              value={loanReturnDate}
              onChange={(e) => setLoanReturnDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        )}

        {/* Terms */}
        <div className="space-y-2">
          <Label htmlFor="terms">Terms (optional)</Label>
          <Textarea
            id="terms"
            placeholder="Any specific terms or details about this exchange..."
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowForm(false);
              setSelectedMode("");
              setTerms("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePropose}
            disabled={loading || !selectedMode}
          >
            {loading ? "Proposing..." : "Send Proposal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
