"use client";

interface DimensionRatingInputProps {
  label: string;
  prompt: string;
  value: number;
  onChange: (value: number) => void;
}

export function DimensionRatingInput({
  label,
  prompt,
  value,
  onChange,
}: DimensionRatingInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`text-lg transition-colors ${
                star <= value
                  ? "text-yellow-500"
                  : "text-muted-foreground/30"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{prompt}</p>
    </div>
  );
}

// Exchange-type-aware prompts for each dimension
export function getDimensionPrompts(exchangeType?: string | null): Record<string, string> {
  const base = {
    reliability: "Did they follow through as agreed?",
    communication: "Were they responsive and clear?",
    accuracy: "Did the item/service match what was described?",
    generosity: "Did they go above and beyond?",
    community: "Did they contribute positively to the community?",
  };

  switch (exchangeType) {
    case "loan":
      return {
        ...base,
        reliability: "Did they return the item on time and in good condition?",
        accuracy: "Was the item as described when lent?",
      };
    case "gift":
      return {
        ...base,
        generosity: "Was the gift offered with genuine generosity?",
        accuracy: "Did the gift match what was offered?",
      };
    case "barter":
      return {
        ...base,
        accuracy: "Did the exchanged items/services match what was agreed?",
        generosity: "Was the exchange fair and balanced?",
      };
    case "time_dollar":
      return {
        ...base,
        reliability: "Did they arrive on time and complete the work?",
        accuracy: "Did the work match the agreed scope and hours?",
      };
    default:
      return base;
  }
}
