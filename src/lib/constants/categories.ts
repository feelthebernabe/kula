export const CATEGORIES = [
  {
    value: "housing-space",
    label: "Housing & Space",
    description: "Guest rooms, studios, co-living, land access, storage",
    icon: "Home",
  },
  {
    value: "tools-equipment",
    label: "Tools & Equipment",
    description: "Power tools, kitchen equipment, camping gear, electronics",
    icon: "Wrench",
  },
  {
    value: "wellness-bodywork",
    label: "Wellness & Bodywork",
    description: "Massage, yoga, coaching, therapy, meditation",
    icon: "Heart",
  },
  {
    value: "food-garden",
    label: "Food & Garden",
    description: "Surplus produce, meals, seeds, composting, garden space",
    icon: "Leaf",
  },
  {
    value: "kids-family",
    label: "Kids & Family",
    description: "Clothes, gear, childcare, tutoring, toys",
    icon: "Baby",
  },
  {
    value: "creative-services",
    label: "Creative Services",
    description: "Photography, design, writing, editing, music",
    icon: "Palette",
  },
  {
    value: "transport",
    label: "Transport",
    description: "Rides, car sharing, bikes, moving help",
    icon: "Car",
  },
  {
    value: "education-skills",
    label: "Education & Skills",
    description: "Language, coding, cooking, crafts, mentorship",
    icon: "GraduationCap",
  },
  {
    value: "household",
    label: "Household",
    description: "Furniture, appliances, cleaning, repairs",
    icon: "Sofa",
  },
  {
    value: "professional-services",
    label: "Professional Services",
    description: "Legal, accounting, consulting, admin support",
    icon: "Briefcase",
  },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
