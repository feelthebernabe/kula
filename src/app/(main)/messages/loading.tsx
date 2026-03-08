import { ConversationListSkeleton } from "@/components/shared/Skeletons";

export default function MessagesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="mt-1 h-4 w-56 animate-pulse rounded-md bg-muted" />
      </div>
      <ConversationListSkeleton />
    </div>
  );
}
