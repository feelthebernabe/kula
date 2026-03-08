"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  userId: string;
  trigger?: React.ReactNode;
}

export function InviteDialog({ userId, trigger }: InviteDialogProps) {
  const [inviteLink, setInviteLink] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  async function generateInvite() {
    setLoading(true);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("invites").insert({
      inviter_id: userId,
      code,
      invited_email: email || null,
    });
    if (error) {
      toast.error("Failed to create invite");
    } else {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/invite/${code}`;
      setInviteLink(link);
      toast.success("Invite link created!");
    }
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Kula",
          text: "Join our sharing network! Gift, lend, barter, and exchange time with neighbors.",
          url: inviteLink,
        });
      } catch {
        // User cancelled share
      }
    } else {
      copyLink();
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <UserPlus className="mr-1.5 h-4 w-4" /> Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Neighbor</DialogTitle>
        </DialogHeader>
        {!inviteLink ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Grow your sharing network! Send an invite to someone you trust.
            </p>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input
                type="email"
                placeholder="neighbor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Track who you invited
              </p>
            </div>
            <Button
              onClick={generateInvite}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Creating..." : "Generate Invite Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="mb-1 text-xs text-muted-foreground">
                Share this link
              </p>
              <p className="break-all font-mono text-sm">{inviteLink}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyLink} variant="outline" className="flex-1">
                {copied ? (
                  <Check className="mr-1.5 h-4 w-4" />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button onClick={shareLink} className="flex-1">
                <Share2 className="mr-1.5 h-4 w-4" /> Share
              </Button>
            </div>
            <div className="flex gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent("Join our sharing network on Kula! " + inviteLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full text-xs">
                  WhatsApp
                </Button>
              </a>
              <a
                href={`sms:?body=${encodeURIComponent("Join me on Kula, a sharing network for neighbors! " + inviteLink)}`}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full text-xs">
                  iMessage
                </Button>
              </a>
              <a
                href={`mailto:${email || ""}?subject=${encodeURIComponent("Join me on Kula")}&body=${encodeURIComponent("Hey! I'd love for you to join Kula, our neighborhood sharing network.\n\n" + inviteLink)}`}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Email
                </Button>
              </a>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setInviteLink("");
                setEmail("");
              }}
              className="w-full text-xs"
            >
              Create another invite
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
