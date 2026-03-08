"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type ReferenceRelationship =
  Database["public"]["Enums"]["reference_relationship"];

const RELATIONSHIP_OPTIONS: { value: ReferenceRelationship; label: string }[] =
  [
    { value: "exchanged", label: "We completed an exchange" },
    { value: "messaged", label: "We messaged each other" },
    { value: "community_member", label: "We're in the same community" },
    { value: "other", label: "Other interaction" },
  ];

export function WriteReferenceForm({
  subjectId,
  subjectName,
  currentUserId,
  hasInteracted,
}: {
  subjectId: string;
  subjectName: string;
  currentUserId: string;
  hasInteracted: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [relationship, setRelationship] =
    useState<ReferenceRelationship | null>(null);
  const [body, setBody] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  if (!hasInteracted) return null;
  if (currentUserId === subjectId) return null;

  async function handleSubmit() {
    if (!relationship) {
      toast.error("Please select how you know this person");
      return;
    }
    if (body.length < 20) {
      toast.error("Reference must be at least 20 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("references").insert({
      author_id: currentUserId,
      subject_id: subjectId,
      relationship,
      body,
      is_positive: isPositive,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You've already written a reference for this person");
      } else {
        toast.error("Failed to submit: " + error.message);
      }
    } else {
      toast.success("Reference submitted!");
      setShowForm(false);
      setBody("");
      router.refresh();
    }
    setLoading(false);
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
      >
        Write a Reference
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label>How do you know {subjectName}?</Label>
        <Select
          value={relationship ?? undefined}
          onValueChange={(v) =>
            setRelationship(v as ReferenceRelationship)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select relationship..." />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Your reference</Label>
        <Textarea
          placeholder={`What was your experience with ${subjectName}?`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          {body.length}/20 minimum characters
        </p>
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isPositive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPositive(true)}
          >
            Positive
          </Button>
          <Button
            type="button"
            variant={!isPositive ? "destructive" : "outline"}
            size="sm"
            onClick={() => setIsPositive(false)}
          >
            Negative
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setShowForm(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !relationship || body.length < 20}
        >
          {loading ? "Submitting..." : "Submit Reference"}
        </Button>
      </div>
    </div>
  );
}
