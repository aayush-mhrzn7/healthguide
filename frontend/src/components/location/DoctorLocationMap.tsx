"use client";

import { useEffect, useRef } from "react";

type DoctorLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  label: string;
};

export function DoctorLocationMap({
  latitude,
  longitude,
  label,
}: DoctorLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (!mapContainerRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!mounted || !mapContainerRef.current) return;

      const lat = typeof latitude === "number" ? latitude : 27.7172;
      const lon = typeof longitude === "number" ? longitude : 85.324;
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([lat, lon], 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({
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

      markerRef.current = L.marker([lat, lon], { icon }).addTo(map);
      markerRef.current.bindPopup(label);
    })();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || typeof latitude !== "number" || typeof longitude !== "number") {
      return;
    }
    marker.setLatLng([latitude, longitude]);
    marker.bindPopup(label);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 14));
  }, [latitude, longitude, label]);

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-muted/20">
      <div ref={mapContainerRef} className="h-[360px] w-full" />
    </div>
  );
}
