"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            We ran into an unexpected error. Please try again.
          </p>
          <Button onClick={reset}>Try Again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
