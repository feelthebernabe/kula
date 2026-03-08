import { ExchangeListSkeleton } from "@/components/shared/Skeletons";

export default function ExchangesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="mt-1 h-4 w-48 animate-pulse rounded-md bg-muted" />
      </div>
      <ExchangeListSkeleton />
    </div>
  );
}
