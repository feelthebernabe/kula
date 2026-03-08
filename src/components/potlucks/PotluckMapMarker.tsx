"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { PotluckMapPopup } from "./PotluckMapPopup";
import type { MapPotluck } from "@/types/database";

function createPotluckIcon() {
  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      width: 28px; height: 28px;
      background: #E97316;
      border: 3px solid white;
      border-radius: 4px;
      transform: rotate(45deg);
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

const potluckIcon = createPotluckIcon();

export function PotluckMapMarker({ potluck }: { potluck: MapPotluck }) {
  return (
    <Marker
      position={[potluck.latitude, potluck.longitude]}
      icon={potluckIcon}
    >
      <Popup maxWidth={280} minWidth={240}>
        <PotluckMapPopup potluck={potluck} />
      </Popup>
    </Marker>
  );
}
