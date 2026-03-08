import Link from "next/link";
import { ShieldAlert, MessageCircle } from "lucide-react";

interface ContentRemovedNoticeProps {
  reason?: string | null;
  communityId?: string | null;
}

export function ContentRemovedNotice({ reason, communityId }: ContentRemovedNoticeProps) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">
          This content has been removed by a moderator
        </p>
      </div>
      {reason && (
        <p className="mt-1.5 text-xs text-muted-foreground pl-6">
          Reason: {reason}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground pl-6">
        If you believe this was a mistake, please{" "}
        {communityId ? (
          <Link
            href={`/messages?context=appeal&community=${communityId}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <MessageCircle className="h-3 w-3" />
            contact a moderator
          </Link>
        ) : (
          <span>contact a community moderator</span>
        )}
        .
      </p>
    </div>
  );
}
