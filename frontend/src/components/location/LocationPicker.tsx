"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type LocationPickerProps = {
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  onAddressChange: (value: string) => void;
  onLocationChange: (payload: {
    address: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  placeholder?: string;
};

export function LocationPicker({
  label,
  address,
  latitude,
  longitude,
  onAddressChange,
  onLocationChange,
  placeholder = "Search location",
}: LocationPickerProps) {
  const [query, setQuery] = useState(address);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setQuery(address);
  }, [address]);

  const mapUrl = useMemo(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      return `https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`;
    }
    if (address.trim().length > 0) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=13&output=embed`;
    }
    return "https://maps.google.com/maps?q=world&z=1&output=embed";
  }, [address, latitude, longitude]);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`,
      );
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = (await res.json()) as SearchResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const useCurrentLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      let resolvedAddress = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      try {
        const reverseRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
        );
        if (reverseRes.ok) {
          const reverseData = (await reverseRes.json()) as {
            display_name?: string;
          };
          if (reverseData.display_name) {
            resolvedAddress = reverseData.display_name;
          }
        }
      } catch {
      }

      onLocationChange({
        address: resolvedAddress,
        latitude: lat,
        longitude: lon,
      });
      setQuery(resolvedAddress);
      setResults([]);
    } catch {
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="grid gap-2 text-xs">
      <label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            onAddressChange(value);
          }}
          placeholder={placeholder}
          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={() => void runSearch()}
          disabled={isSearching}
        >
          <Search className="mr-1 h-3.5 w-3.5" />
          {isSearching ? "..." : "Search"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 px-3 text-xs"
          onClick={() => void useCurrentLocation()}
          disabled={isLocating}
        >
          <MapPin className="mr-1 h-3.5 w-3.5" />
          {isLocating ? "Locating..." : "Use my current location"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="max-h-36 overflow-auto rounded-md border border-border bg-background p-1">
          {results.map((result) => (
            <button
              key={`${result.lat},${result.lon},${result.display_name}`}
              type="button"
              className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
              onClick={() => {
                const lat = Number(result.lat);
                const lon = Number(result.lon);
                const selectedAddress = result.display_name;
                onLocationChange({
                  address: selectedAddress,
                  latitude: Number.isFinite(lat) ? lat : null,
                  longitude: Number.isFinite(lon) ? lon : null,
                });
                setResults([]);
              }}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-[11px] text-foreground">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border/70 bg-muted/20">
        <iframe
          title={`${label} map`}
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-44 w-full"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Lat/Lng:{" "}
        {typeof latitude === "number" && typeof longitude === "number"
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : "Not selected"}
      </p>
    </div>
  );
}

