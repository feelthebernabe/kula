import { ThreadListSkeleton } from "@/components/shared/Skeletons";

export default function DiscussLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
      </div>
      <ThreadListSkeleton />
    </div>
  );
}
