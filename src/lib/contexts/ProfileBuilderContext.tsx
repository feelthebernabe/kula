"use client";

import { createContext, useContext, useState } from "react";

interface ProfileBuilderContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ProfileBuilderContext = createContext<ProfileBuilderContextValue>({
  isOpen: false,
  setIsOpen: () => {},
});

export function ProfileBuilderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ProfileBuilderContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </ProfileBuilderContext.Provider>
  );
}

export function useProfileBuilder() {
  return useContext(ProfileBuilderContext);
}
