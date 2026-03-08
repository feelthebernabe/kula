import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  heading: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  heading,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
      <p className="text-lg font-medium text-foreground">{heading}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
