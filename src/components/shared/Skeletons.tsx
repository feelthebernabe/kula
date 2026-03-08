import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-2/3" />
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <div className="mt-4 flex gap-6">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ExchangeListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ThreadListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start gap-3 py-4">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
