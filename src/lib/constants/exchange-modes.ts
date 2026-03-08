export const EXCHANGE_MODES = [
  {
    value: "gift",
    label: "Gift",
    description: "Free transfer with no expectation of return",
    icon: "Gift",
  },
  {
    value: "loan",
    label: "Loan",
    description: "Temporary transfer with expected return",
    icon: "ArrowLeftRight",
  },
  {
    value: "time_dollar",
    label: "Time Dollar",
    description: "Exchange denominated in hours of labor",
    icon: "Clock",
  },
  {
    value: "barter",
    label: "Barter",
    description: "Direct trade negotiated between parties",
    icon: "Repeat",
  },
  {
    value: "flexible",
    label: "Flexible",
    description: "Open to any exchange mode",
    icon: "Sparkles",
  },
] as const;

export type ExchangeModeValue = (typeof EXCHANGE_MODES)[number]["value"];
