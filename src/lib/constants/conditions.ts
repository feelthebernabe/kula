export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "well_loved", label: "Well-Loved" },
] as const;

export type ConditionValue = (typeof CONDITIONS)[number]["value"];

// Categories that represent physical goods where condition is relevant
export const PHYSICAL_GOODS_CATEGORIES = [
  "tools-equipment",
  "household",
  "kids-family",
  "food-garden",
] as const;
