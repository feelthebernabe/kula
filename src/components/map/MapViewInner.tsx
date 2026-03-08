"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { MapMarker } from "./MapMarker";
import { MapFilters } from "./MapFilters";
import { PotluckMapMarker } from "@/components/potlucks/PotluckMapMarker";
import { Button } from "@/components/ui/button";
import { Locate, List } from "lucide-react";
import Link from "next/link";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  TILE_URL,
  TILE_ATTRIBUTION,
} from "@/lib/constants/map-defaults";
import type { MapPost, MapPotluck } from "@/types/database";

interface MapViewInnerProps {
  initialCategory?: string;
  initialType?: string;
  initialQuery?: string;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
}

function MapEventHandler({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  useMapEvents({
    moveend: (e) => {
      onBoundsChange(e.target.getBounds());
    },
    zoomend: (e) => {
      onBoundsChange(e.target.getBounds());
    },
  });
  return null;
}

export default function MapViewInner({
  initialCategory,
  initialType,
  initialQuery,
  initialLat,
  initialLng,
  initialZoom,
}: MapViewInnerProps) {
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [potlucks, setPotlucks] = useState<MapPotluck[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState(initialType);
  const [query, setQuery] = useState(initialQuery || "");
  const [showPotlucks, setShowPotlucks] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createClient();
  const geo = useGeolocation();

  const center: [number, number] =
    initialLat && initialLng
      ? [initialLat, initialLng]
      : DEFAULT_CENTER;
  const zoom = initialZoom || DEFAULT_ZOOM;

  // Fetch posts (and optionally potlucks) within current map bounds
  const fetchPosts = useCallback(
    async (bounds: L.LatLngBounds) => {
      setLoading(true);
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      const postsPromise = supabase.rpc("get_posts_in_bounds", {
        min_lat: sw.lat,
        min_lng: sw.lng,
        max_lat: ne.lat,
        max_lng: ne.lng,
        filter_category: category ?? undefined,
        filter_type: type ?? undefined,
        search_query: query || undefined,
        result_limit: 200,
      });

      const potlucksPromise = showPotlucks
        ? supabase.rpc("get_potlucks_in_bounds", {
            min_lat: sw.lat,
            min_lng: sw.lng,
            max_lat: ne.lat,
            max_lng: ne.lng,
            result_limit: 100,
          })
        : Promise.resolve({ data: null, error: null });

      const [postsRes, potlucksRes] = await Promise.all([
        postsPromise,
        potlucksPromise,
      ]);

      if (!postsRes.error && postsRes.data) {
        setPosts(postsRes.data as unknown as MapPost[]);
      }
      if (!potlucksRes.error && potlucksRes.data) {
        setPotlucks(potlucksRes.data as unknown as MapPotluck[]);
      } else if (!showPotlucks) {
        setPotlucks([]);
      }
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, type, query, showPotlucks]
  );

  // Debounced handler for map movement
  const handleBoundsChange = useCallback(
    (bounds: L.LatLngBounds) => {
      boundsRef.current = bounds;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchPosts(bounds);
      }, 300);
    },
    [fetchPosts]
  );

  // Re-fetch when filters change
  useEffect(() => {
    if (boundsRef.current) {
      fetchPosts(boundsRef.current);
    }
  }, [category, type, query, showPotlucks, fetchPosts]);

  // Request geolocation on mount if no initial coords
  useEffect(() => {
    if (!initialLat && !initialLng) {
      geo.requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to user location when geolocation resolves
  useEffect(() => {
    if (geo.latitude && geo.longitude && mapRef.current && !initialLat) {
      mapRef.current.flyTo([geo.latitude, geo.longitude], DEFAULT_ZOOM);
    }
  }, [geo.latitude, geo.longitude, initialLat]);

  function handleLocateMe() {
    if (geo.latitude && geo.longitude && mapRef.current) {
      mapRef.current.flyTo([geo.latitude, geo.longitude], DEFAULT_ZOOM);
    } else {
      geo.requestLocation();
    }
  }

  // Build filter query string for the list view link
  const filterParams = new URLSearchParams();
  if (category) filterParams.set("category", category);
  if (type) filterParams.set("type", type);
  const filterString = filterParams.toString();

  return (
    <div className="space-y-3">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Map</h1>
          <p className="text-sm text-muted-foreground">
            Browse offers and requests near you
          </p>
        </div>
        <Link href={`/feed${filterString ? `?${filterString}` : ""}`}>
          <Button variant="outline" size="sm">
            <List className="mr-1.5 h-4 w-4" />
            List view
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <MapFilters
        category={category}
        type={type}
        query={query}
        showPotlucks={showPotlucks}
        onCategoryChange={setCategory}
        onTypeChange={setType}
        onQueryChange={setQuery}
        onShowPotlucksChange={setShowPotlucks}
      />

      {/* Map container */}
      <div className="relative overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          className="h-[calc(100vh-16rem)] md:h-[calc(100vh-14rem)] w-full"
          ref={mapRef}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <MapEventHandler onBoundsChange={handleBoundsChange} />

          {posts.map((post) => (
            <MapMarker key={post.id} post={post} />
          ))}
          {potlucks.map((potluck) => (
            <PotluckMapMarker key={`potluck-${potluck.id}`} potluck={potluck} />
          ))}
        </MapContainer>

        {/* Locate me button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-4 right-4 z-[1000] shadow-md"
          onClick={handleLocateMe}
          title="Center on my location"
          aria-label="Center map on my location"
        >
          <Locate className="h-4 w-4" />
        </Button>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm border border-border">
            Loading posts...
          </div>
        )}

        {/* Post count */}
        {!loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm border border-border">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
            {potlucks.length > 0 &&
              ` · ${potlucks.length} potluck${potlucks.length !== 1 ? "s" : ""}`}{" "}
            in view
          </div>
        )}
      </div>
    </div>
  );
}
