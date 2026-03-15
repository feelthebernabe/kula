"use client";

import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileBuilderPanel } from "./ProfileBuilderPanel";
import { useProfileBuilder } from "@/lib/contexts/ProfileBuilderContext";

export function ProfileBuilderButton() {
  const { isOpen, setIsOpen } = useProfileBuilder();

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        className="fixed bottom-36 right-4 z-40 h-12 rounded-full shadow-lg md:bottom-20 md:right-6 md:h-11 md:w-auto md:rounded-2xl md:px-4"
      >
        <UserCog className="h-5 w-5 md:mr-2" />
        <span className="sr-only md:not-sr-only md:text-sm md:font-medium">
          Build Your Profile
        </span>
      </Button>

      <ProfileBuilderPanel open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
