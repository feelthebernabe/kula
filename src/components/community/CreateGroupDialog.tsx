"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  currentUserTrustScore?: number;
}

export function CreateGroupDialog({ currentUserTrustScore = 0 }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"geographic" | "affinity">("geographic");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate() {
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      setLoading(false);
      return;
    }

    const { data: community, error } = await supabase
      .from("communities")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        type,
        location: type === "geographic" ? (location.trim() || null) : null,
        moderators: [user.id],
        settings: { allow_posts: true, require_approval: false },
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create group");
      setLoading(false);
      return;
    }

    // Auto-join as admin
    await supabase.from("community_members").insert({
      community_id: community.id,
      user_id: user.id,
      role: "admin",
    });

    toast.success("Group created!");
    setOpen(false);
    setName("");
    setDescription("");
    setType("geographic");
    setLocation("");
    router.push(`/groups/${community.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Group</DialogTitle>
          <DialogDescription>
            Start a community for your neighborhood or interest group.
          </DialogDescription>
        </DialogHeader>
        {currentUserTrustScore < 60 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Trust score too low
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  You need a trust score of at least 60 (Established tier) to create a group.
                  Your current score is {Math.round(currentUserTrustScore)}.
                  Build trust by completing exchanges, getting reviews, and verifying your identity.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Name *</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Park Slope Sharers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Description</Label>
                <Textarea
                  id="group-desc"
                  placeholder="What is this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as "geographic" | "affinity")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geographic">
                      Geographic (neighborhood)
                    </SelectItem>
                    <SelectItem value="affinity">
                      Affinity (interest-based)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "geographic" && (
                <div className="space-y-2">
                  <Label htmlFor="group-location">Location</Label>
                  <Input
                    id="group-location"
                    placeholder="e.g., Brooklyn, Park Slope"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading || name.trim().length < 2}
              >
                {loading ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
