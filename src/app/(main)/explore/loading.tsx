import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function ExploreLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-1 h-4 w-60" />
      </div>
      {/* Categories grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Communities */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-48 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Recent posts */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
