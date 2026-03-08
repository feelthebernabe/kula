import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-1 h-4 w-52" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
