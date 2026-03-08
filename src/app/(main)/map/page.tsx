import { MapView } from "@/components/map/MapView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map",
  description: "Browse offers and requests near you on the map",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    type?: string;
    q?: string;
    lat?: string;
    lng?: string;
    zoom?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <MapView
      initialCategory={params.category}
      initialType={params.type}
      initialQuery={params.q}
      initialLat={params.lat ? parseFloat(params.lat) : undefined}
      initialLng={params.lng ? parseFloat(params.lng) : undefined}
      initialZoom={params.zoom ? parseInt(params.zoom, 10) : undefined}
    />
  );
}
