import { FeedSkeleton } from "@/components/shared/Skeletons";

export default function FeedLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <FeedSkeleton />
    </div>
  );
}
