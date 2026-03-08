"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-[calc(100vh-16rem)] w-full rounded-xl" />
    </div>
  ),
});

interface MapViewProps {
  initialCategory?: string;
  initialType?: string;
  initialQuery?: string;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
}

export function MapView(props: MapViewProps) {
  return <MapViewInner {...props} />;
}
