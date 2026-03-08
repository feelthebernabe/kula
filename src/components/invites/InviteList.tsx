"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { InviteWithInvitee } from "@/types/database";

interface InviteListProps {
  invites: InviteWithInvitee[];
}

export function InviteList({ invites }: InviteListProps) {
  const accepted = invites.filter((i) => i.used_by);

  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Your Invites</CardTitle>
          <Badge variant="outline">{accepted.length} accepted</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {accepted.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Users className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-foreground">
              You&apos;ve grown the community by{" "}
              <span className="font-semibold">{accepted.length}</span>{" "}
              {accepted.length === 1 ? "member" : "members"}!
            </p>
          </div>
        )}
        <div className="space-y-3">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  invite.used_by
                    ? "bg-emerald-500/10"
                    : "bg-amber-500/10"
                }`}
              >
                {invite.used_by ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {invite.used_by && invite.invitee
                    ? invite.invitee.display_name
                    : invite.invited_email || `Invite code: ${invite.code}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invite.used_at
                    ? `Joined ${formatDistanceToNow(new Date(invite.used_at), { addSuffix: true })}`
                    : `Sent ${formatDistanceToNow(new Date(invite.created_at!), { addSuffix: true })}`}
                </p>
              </div>
              <Badge
                variant={invite.used_by ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {invite.used_by ? "Joined" : "Pending"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
