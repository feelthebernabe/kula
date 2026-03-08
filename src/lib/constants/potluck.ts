export const DISH_SLOT_CATEGORIES = [
  { value: "main", label: "Main Dish", emoji: "🍖" },
  { value: "side", label: "Side Dish", emoji: "🥗" },
  { value: "appetizer", label: "Appetizer", emoji: "🧀" },
  { value: "dessert", label: "Dessert", emoji: "🍰" },
  { value: "drink", label: "Drink", emoji: "🥤" },
  { value: "other", label: "Other", emoji: "🍽️" },
] as const;

export type DishSlotCategory = (typeof DISH_SLOT_CATEGORIES)[number]["value"];

export const DIETARY_OPTIONS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "nut-free", label: "Nut-free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
] as const;
