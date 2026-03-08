"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AskKulaContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AskKulaContext = createContext<AskKulaContextValue | null>(null);

export function AskKulaProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AskKulaContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </AskKulaContext.Provider>
  );
}

export function useAskKula() {
  const ctx = useContext(AskKulaContext);
  if (!ctx) throw new Error("useAskKula must be used within AskKulaProvider");
  return ctx;
}
