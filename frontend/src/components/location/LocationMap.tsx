"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LocationMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  className?: string;
};

export function LocationMap({
  latitude,
  longitude,
  address,
  className,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [resolvedCoords, setResolvedCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isResolving, setIsResolving] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const trimmedAddress = address?.trim() ?? "";
  const isVirtual =
    !hasCoords &&
    (!trimmedAddress || trimmedAddress === "HealthGuide Virtual");

  const createPinIcon = () => {
    const L = leafletRef.current;
    if (!L) return undefined;
    return L.divIcon({
      className: "healthguide-map-pin-wrapper",
      html: `
        <div class="healthguide-map-pin">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
            <circle cx="12" cy="10" r="2.8" />
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -28],
    });
  };

  const upsertMarker = (lat: number, lon: number) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lon], {
        draggable: false,
        icon: createPinIcon(),
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lon]);
    }

    map.setView([lat, lon], Math.max(map.getZoom(), 13));
    window.setTimeout(() => map.invalidateSize(), 0);
    window.setTimeout(() => map.invalidateSize(), 150);
  };

  useEffect(() => {
    if (hasCoords) {
      setResolvedCoords({ lat: latitude!, lon: longitude! });
      setUnavailable(false);
      setIsResolving(false);
      return;
    }

    if (isVirtual) {
      setResolvedCoords(null);
      setUnavailable(true);
      setIsResolving(false);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    setUnavailable(false);

    void (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmedAddress)}&limit=1`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        const lat = Number(data[0]?.lat);
        const lon = Number(data[0]?.lon);
        if (cancelled) return;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setResolvedCoords({ lat, lon });
          setUnavailable(false);
        } else {
          setResolvedCoords(null);
          setUnavailable(true);
        }
      } catch {
        if (!cancelled) {
          setResolvedCoords(null);
          setUnavailable(true);
        }
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasCoords, latitude, longitude, trimmedAddress, isVirtual]);

  useEffect(() => {
    if (!resolvedCoords) return;

    let mounted = true;

    void (async () => {
      if (!mapContainerRef.current) return;

      const L = await import("leaflet");
      if (!mounted || !mapContainerRef.current) return;

      leafletRef.current = L;

      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current).setView(
          [resolvedCoords.lat, resolvedCoords.lon],
          13,
        );
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        setIsMapReady(true);
      }

      upsertMarker(resolvedCoords.lat, resolvedCoords.lon);
    })();

    return () => {
      mounted = false;
    };
  }, [resolvedCoords]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        leafletRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !resolvedCoords || !mapRef.current) return;
    upsertMarker(resolvedCoords.lat, resolvedCoords.lon);
  }, [isMapReady, resolvedCoords]);

  if (isVirtual) {
    return (
      <div
        className={cn(
          "rounded-md border border-border/60 bg-muted/20 px-3 py-2.5",
          className,
        )}
      >
        <p className="text-[11px] text-muted-foreground">
          Virtual visit — no clinic map available.
        </p>
      </div>
    );
  }

  if (unavailable && !isResolving) {
    return (
      <div
        className={cn(
          "rounded-md border border-border/60 bg-muted/20 px-3 py-2.5",
          className,
        )}
      >
        <p className="text-[11px] text-muted-foreground">
          Map unavailable for this location.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden rounded-md border border-border/70 bg-muted/20">
        <div ref={mapContainerRef} className="h-44 w-full" />
      </div>
      {isResolving && (
        <Skeleton
          className="absolute inset-0 h-44 w-full rounded-md"
          aria-label="Loading map"
        />
      )}
    </div>
  );
}
