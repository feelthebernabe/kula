"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Locate, MapPin, X } from "lucide-react";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import {
  DEFAULT_CENTER,
  TILE_URL,
  TILE_ATTRIBUTION,
} from "@/lib/constants/map-defaults";

interface LocationPickerInnerProps {
  value: { lat: number; lng: number; name: string } | null;
  onChange: (
    location: { lat: number; lng: number; name: string } | null
  ) => void;
}

// Reverse geocode using Nominatim (free, no API key)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`
    );
    const data = await res.json();
    const addr = data.address;
    return (
      addr?.neighbourhood ||
      addr?.suburb ||
      addr?.city_district ||
      addr?.city ||
      addr?.town ||
      data.display_name?.split(",").slice(0, 2).join(",") ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

function ClickHandler({
  onLocationSet,
}: {
  onLocationSet: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click: (e) => {
      onLocationSet(e.latlng);
    },
  });
  return null;
}

// Fix Leaflet default marker icon paths
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LocationPickerInner({
  value,
  onChange,
}: LocationPickerInnerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    value ? new L.LatLng(value.lat, value.lng) : null
  );
  const [locationName, setLocationName] = useState(value?.name || "");
  const [geocoding, setGeocoding] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const geo = useGeolocation();

  async function handleLocationSet(latlng: L.LatLng) {
    setPosition(latlng);
    setGeocoding(true);
    const name = await reverseGeocode(latlng.lat, latlng.lng);
    setLocationName(name);
    setGeocoding(false);
    onChange({ lat: latlng.lat, lng: latlng.lng, name });
  }

  function handleUseMyLocation() {
    if (geo.latitude && geo.longitude) {
      const latlng = new L.LatLng(geo.latitude, geo.longitude);
      mapRef.current?.flyTo(latlng, 15);
      handleLocationSet(latlng);
    } else {
      geo.requestLocation();
    }
  }

  // Fly to user location when it resolves (only if no value was set)
  useEffect(() => {
    if (geo.latitude && geo.longitude && !value && mapRef.current) {
      mapRef.current.flyTo([geo.latitude, geo.longitude], 15);
    }
  }, [geo.latitude, geo.longitude, value]);

  function handleClear() {
    setPosition(null);
    setLocationName("");
    onChange(null);
  }

  const center: [number, number] = value
    ? [value.lat, value.lng]
    : geo.latitude && geo.longitude
      ? [geo.latitude, geo.longitude]
      : DEFAULT_CENTER;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={geo.loading}
        >
          <Locate className="mr-1.5 h-3.5 w-3.5" />
          {geo.loading ? "Locating..." : "Use my location"}
        </Button>
        {position && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <MapContainer
          center={center}
          zoom={14}
          className="h-48 w-full"
          ref={mapRef}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickHandler onLocationSet={handleLocationSet} />
          {position && <Marker position={position} icon={markerIcon} />}
        </MapContainer>
      </div>

      {geocoding && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Finding location name...
        </p>
      )}

      {position && locationName && !geocoding && (
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{locationName}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Click on the map to set your post location, or use your current
        location. Location is optional.
      </p>
    </div>
  );
}
