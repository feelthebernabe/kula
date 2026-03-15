import { OnboardingChatClient } from "@/components/onboarding-chat/OnboardingChatClient";

export const metadata = {
  title: "Discover Kula",
  description:
    "Chat with Kula to discover what you can share and what you might find in your community.",
};

export default function OnboardingChatPage() {
  return <OnboardingChatClient />;
}
