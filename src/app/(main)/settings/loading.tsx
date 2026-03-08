import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-1 h-4 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
