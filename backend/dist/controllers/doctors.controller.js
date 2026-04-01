"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDoctors = listDoctors;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthKm * c;
}
async function listDoctors(req, res) {
    const { authUser } = req;
    const specialty = req.query.specialty;
    let userCoordinates = null;
    if (authUser) {
        const profile = await client_1.db
            .select({
            latitude: schema_1.users.latitude,
            longitude: schema_1.users.longitude,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, authUser.id))
            .limit(1);
        const me = profile[0];
        if (me &&
            typeof me.latitude === "number" &&
            typeof me.longitude === "number") {
            userCoordinates = { latitude: me.latitude, longitude: me.longitude };
        }
    }
    const rows = await client_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        specialty: schema_1.users.specialty,
        clinicLocation: schema_1.users.address,
        clinicLatitude: schema_1.users.latitude,
        clinicLongitude: schema_1.users.longitude,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.role, "doctor"));
    const filtered = specialty
        ? rows.filter((d) => (d.specialty ?? "general") === specialty)
        : rows;
    const withDistance = filtered
        .map((d) => {
        let distanceKm = null;
        if (userCoordinates &&
            typeof d.clinicLatitude === "number" &&
            typeof d.clinicLongitude === "number") {
            distanceKm = haversineKm(userCoordinates.latitude, userCoordinates.longitude, d.clinicLatitude, d.clinicLongitude);
        }
        return {
            ...d,
            distanceKm,
        };
    })
        .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null)
            return 0;
        if (a.distanceKm == null)
            return 1;
        if (b.distanceKm == null)
            return -1;
        return a.distanceKm - b.distanceKm;
    });
    return res.json({
        doctors: withDistance.map((d) => ({
            id: d.id,
            name: d.name,
            email: d.email,
            specialty: d.specialty ?? "general",
            clinicLocation: d.clinicLocation ?? null,
            clinicLatitude: d.clinicLatitude ?? null,
            clinicLongitude: d.clinicLongitude ?? null,
            distanceKm: d.distanceKm == null ? null : Number(d.distanceKm.toFixed(2)),
        })),
    });
}
