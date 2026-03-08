import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function PostDetailLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="aspect-video w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
