"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const canDelete = password.length > 0 && confirmText === "DELETE";

  async function handleDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to delete account");
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      router.push("/login");
      toast.success("Your account has been deleted.");
    } catch {
      toast.error("An unexpected error occurred");
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setPassword("");
          setConfirmText("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <span>This action is permanent and cannot be undone.</span>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>
                  Your profile will be anonymized to &quot;Deleted User&quot;
                </li>
                <li>
                  Posts, reviews, and discussions will remain but show
                  &quot;Deleted User&quot;
                </li>
                <li>
                  Messages, notifications, and community memberships will be
                  removed
                </li>
                <li>Pending exchanges will be cancelled</li>
                <li>
                  If you sign up again, it will be a brand new account
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="delete-password">Enter your password</Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={deleting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Type{" "}
              <span className="font-mono font-bold">DELETE</span> to
              confirm
            </Label>
            <Input
              id="delete-confirm"
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? "Deleting..." : "Permanently Delete Account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
