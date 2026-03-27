"use client";

import * as React from "react";
import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";

const AVATAR_STORAGE_KEY = "healthguide_avatar";

export type AvatarProps = {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  editable?: boolean;
  onImageChange?: (dataUrl: string) => void;
};

const sizeClasses = {
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
};

export function Avatar({
  src,
  alt = "Profile",
  size = "md",
  className,
  editable = false,
  onImageChange,
}: AvatarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localSrc, setLocalSrc] = React.useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(AVATAR_STORAGE_KEY) : null) ?? src ?? null
  );

  React.useEffect(() => {
    if (src && !localSrc) {
      setLocalSrc(src);
    }
  }, [src]);

  const displaySrc = localSrc ?? src;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLocalSrc(dataUrl);
      if (typeof window !== "undefined") {
        localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
      }
      onImageChange?.(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleClick = () => {
    if (editable) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted",
        sizeClasses[size],
        editable && "cursor-pointer ring-2 ring-offset-2 ring-offset-background hover:ring-primary/50",
        className
      )}
      onClick={handleClick}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }
          : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={alt}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          {editable ? (
            <Camera className="h-8 w-8" />
          ) : (
            <span className="text-lg font-semibold">
              {alt.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function getStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_STORAGE_KEY);
}
