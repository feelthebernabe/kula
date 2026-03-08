import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MainNotFound() {
  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/feed">
            <Button>Go to Feed</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
