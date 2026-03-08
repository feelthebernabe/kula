"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPostPopup } from "./MapPostPopup";
import type { MapPost } from "@/types/database";

const CATEGORY_COLORS: Record<string, string> = {
  "housing-space": "#4A7C59",
  "tools-equipment": "#8B6914",
  "wellness-bodywork": "#C44569",
  "food-garden": "#38A169",
  "kids-family": "#D69E2E",
  "creative-services": "#9F7AEA",
  transport: "#3182CE",
  "education-skills": "#DD6B20",
  household: "#718096",
  "professional-services": "#2D3748",
};

function createCategoryIcon(category: string, type: "offer" | "request") {
  const color = CATEGORY_COLORS[category] || "#4A7C59";

  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid ${type === "request" ? "#E53E3E" : "white"};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "><div style="
      width: 10px; height: 10px;
      background: white;
      border-radius: 50%;
      margin: 6px auto;
    "></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

interface MapMarkerProps {
  post: MapPost;
}

export function MapMarker({ post }: MapMarkerProps) {
  const icon = createCategoryIcon(post.category, post.type);

  return (
    <Marker position={[post.latitude, post.longitude]} icon={icon}>
      <Popup maxWidth={280} minWidth={240}>
        <MapPostPopup post={post} />
      </Popup>
    </Marker>
  );
}
