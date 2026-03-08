"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlagContentDialog } from "./FlagContentDialog";

interface FlagContentButtonProps {
  contentType: "post" | "thread" | "reply" | "potluck_comment";
  contentId: string;
  contentAuthorId: string;
  communityId: string;
  currentUserId: string | null;
}

export function FlagContentButton({
  contentType,
  contentId,
  contentAuthorId,
  communityId,
  currentUserId,
}: FlagContentButtonProps) {
  const [open, setOpen] = useState(false);

  // Don't show if not logged in or viewing own content
  if (!currentUserId || currentUserId === contentAuthorId) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
        title="Report content"
        aria-label="Report content"
      >
        <Flag className="h-3.5 w-3.5" />
      </Button>
      <FlagContentDialog
        open={open}
        onOpenChange={setOpen}
        contentType={contentType}
        contentId={contentId}
        contentAuthorId={contentAuthorId}
        communityId={communityId}
        reporterId={currentUserId}
      />
    </>
  );
}
