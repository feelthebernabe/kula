import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ReferenceWithAuthor } from "@/types/database";

const RELATIONSHIP_LABELS: Record<string, string> = {
  exchanged: "Exchanged together",
  messaged: "Connected via messages",
  community_member: "Same community",
  other: "Community interaction",
};

export function ReferencesList({
  references,
}: {
  references: ReferenceWithAuthor[];
}) {
  if (references.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No references yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {references.map((ref) => {
        const initials =
          ref.author?.display_name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

        return (
          <div key={ref.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${ref.author_id}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={ref.author?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {ref.author?.display_name}
                </span>
              </Link>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  ref.is_positive
                    ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
                    : "border-red-200 bg-red-500/10 text-red-600"
                }`}
              >
                {ref.is_positive ? "Positive" : "Negative"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ref.created_at!), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {RELATIONSHIP_LABELS[ref.relationship] || ref.relationship}
            </p>
            <p className="text-sm text-muted-foreground">{ref.body}</p>
          </div>
        );
      })}
    </div>
  );
}
