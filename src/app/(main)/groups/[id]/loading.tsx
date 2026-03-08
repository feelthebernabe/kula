import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function GroupDetailLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
