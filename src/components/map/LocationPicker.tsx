"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LocationPickerInner = dynamic(() => import("./LocationPickerInner"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-lg" />,
});

interface LocationPickerProps {
  value: { lat: number; lng: number; name: string } | null;
  onChange: (
    location: { lat: number; lng: number; name: string } | null
  ) => void;
}

export function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerInner {...props} />;
}
