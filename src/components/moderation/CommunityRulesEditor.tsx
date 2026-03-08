"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, ScrollText } from "lucide-react";
import { toast } from "sonner";

interface CommunityRulesEditorProps {
  communityId: string;
  rules: string[];
  onSave: (rules: string[]) => void;
  onCancel: () => void;
}

export function CommunityRulesEditor({
  communityId,
  rules,
  onSave,
  onCancel,
}: CommunityRulesEditorProps) {
  const supabase = createClient();
  const [items, setItems] = useState<string[]>(rules.length > 0 ? [...rules] : [""]);
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);

  function handleRemove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAdd() {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, trimmed]);
    setNewRule("");
  }

  async function handleSave() {
    const filtered = items.filter((r) => r.trim().length > 0);
    setSaving(true);

    const { error } = await supabase
      .from("communities")
      .update({ rules: filtered })
      .eq("id", communityId);

    if (error) {
      toast.error("Failed to save rules");
    } else {
      toast.success("Community rules updated");
      onSave(filtered);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Edit Community Rules
        </span>
      </div>

      <div className="space-y-2 pl-6">
        {items.map((rule, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0 w-5">
              {i + 1}.
            </span>
            <Input
              value={rule}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = e.target.value;
                setItems(updated);
              }}
              className="h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(i)}
              aria-label={`Delete rule ${i + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a rule..."
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleAdd}
            disabled={!newRule.trim()}
            aria-label="Add rule"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-6">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Rules"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
