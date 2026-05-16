import type { Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { users } from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthKm * c;
}

export async function listDoctors(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  const specialty = req.query.specialty as string | undefined;
  const maxDistanceRaw = Number(req.query.maxDistanceKm ?? 10);
  const maxDistanceKm =
    Number.isFinite(maxDistanceRaw) && maxDistanceRaw > 0
      ? Math.min(maxDistanceRaw, 1000)
      : 10;

  let userCoordinates: { latitude: number; longitude: number } | null = null;
  if (authUser) {
    const profile = await db
      .select({
        latitude: users.latitude,
        longitude: users.longitude,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    const me = profile[0];
    if (
      me &&
      typeof me.latitude === "number" &&
      typeof me.longitude === "number"
    ) {
      userCoordinates = { latitude: me.latitude, longitude: me.longitude };
    }
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      specialty: users.specialty,
      bio: users.bio,
      profileImageUrl: users.profileImageUrl,
      clinicLocation: users.address,
      clinicLatitude: users.latitude,
      clinicLongitude: users.longitude,
    })
    .from(users)
    .where(eq(users.role, "doctor"));

  const filtered = specialty
    ? rows.filter(
        (d) => (d.specialty ?? "general") === specialty
      )
    : rows;

  const withDistance = filtered
    .map((d) => {
      let distanceKm: number | null = null;
      if (
        userCoordinates &&
        typeof d.clinicLatitude === "number" &&
        typeof d.clinicLongitude === "number"
      ) {
        distanceKm = haversineKm(
          userCoordinates.latitude,
          userCoordinates.longitude,
          d.clinicLatitude,
          d.clinicLongitude,
        );
      }
      return {
        ...d,
        distanceKm,
      };
    })
    .filter((d) => {
      if (!userCoordinates) return true;
      if (d.distanceKm == null) return false;
      return d.distanceKm <= maxDistanceKm;
    })
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  return res.json({
    maxDistanceKm,
    doctors: withDistance.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone ?? null,
      specialty: d.specialty ?? "general",
      bio: d.bio ?? null,
      profileImageUrl: d.profileImageUrl ?? null,
      clinicLocation: d.clinicLocation ?? null,
      clinicLatitude: d.clinicLatitude ?? null,
      clinicLongitude: d.clinicLongitude ?? null,
      distanceKm: d.distanceKm == null ? null : Number(d.distanceKm.toFixed(2)),
    })),
  });
}
