"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ScrollText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityRulesEditor } from "./CommunityRulesEditor";

interface CommunityRulesSectionProps {
  communityId: string;
  rules: string[];
  isAdmin: boolean;
}

export function CommunityRulesSection({
  communityId,
  rules,
  isAdmin,
}: CommunityRulesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [currentRules, setCurrentRules] = useState(rules);

  if (currentRules.length === 0 && !isAdmin) return null;

  if (editing && isAdmin) {
    return (
      <CommunityRulesEditor
        communityId={communityId}
        rules={currentRules}
        onSave={(updated) => {
          setCurrentRules(updated);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <ScrollText className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">
          Community Rules
          {currentRules.length > 0 && (
            <span className="text-muted-foreground font-normal ml-1">
              ({currentRules.length})
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 pl-6">
          {currentRules.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground">
                No community rules set
              </p>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setEditing(true)}
                >
                  Add rules
                </Button>
              )}
            </div>
          ) : (
            <>
              <ol className="space-y-1.5">
                {currentRules.map((rule, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex gap-2"
                  >
                    <span className="text-primary font-medium shrink-0">
                      {i + 1}.
                    </span>
                    {rule}
                  </li>
                ))}
              </ol>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit rules
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
