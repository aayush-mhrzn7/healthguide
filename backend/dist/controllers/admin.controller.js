"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDoctor = createDoctor;
exports.getAdminStats = getAdminStats;
exports.getAdminHealth = getAdminHealth;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const passwordSchema = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain at least one letter and one number");
const createDoctorSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email(),
    password: passwordSchema,
    clinicLocation: zod_1.z.string().optional().nullable(),
    clinicLatitude: zod_1.z.number().finite().optional().nullable(),
    clinicLongitude: zod_1.z.number().finite().optional().nullable(),
    specialty: zod_1.z
        .enum(["general", "respiratory", "allergy", "cardiology"])
        .optional()
        .default("general"),
});
async function createDoctor(req, res) {
    const parseResult = createDoctorSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { name, email, password, specialty, clinicLocation, clinicLatitude, clinicLongitude, } = parseResult.data;
    const existing = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
        .limit(1);
    if (existing[0]) {
        return res.status(400).json({ error: "User with this email already exists" });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const [doctor] = await client_1.db
        .insert(schema_1.users)
        .values({
        name,
        email,
        passwordHash,
        role: "doctor",
        specialty,
        address: clinicLocation && clinicLocation.trim() ? clinicLocation.trim() : null,
        latitude: clinicLatitude ?? null,
        longitude: clinicLongitude ?? null,
        emailVerified: true,
    })
        .returning();
    return res.status(201).json({
        doctor: {
            id: doctor.id.toString(),
            name: doctor.name,
            email: doctor.email,
            role: doctor.role,
            specialty: doctor.specialty,
            clinicLocation: doctor.address,
            clinicLatitude: doctor.latitude,
            clinicLongitude: doctor.longitude,
        },
    });
}
async function getAdminStats(_req, res) {
    const [allUsers, doctors, allAppointments, allAssessments] = await Promise.all([
        client_1.db.select().from(schema_1.users),
        client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.role, "doctor")),
        client_1.db.select().from(schema_1.appointments),
        client_1.db.select().from(schema_1.assessments),
    ]);
    const totalUsers = allUsers.length;
    const totalDoctors = doctors.length;
    const totalAppointments = allAppointments.length;
    const assessmentRows = allAssessments;
    const byDisease = new Map();
    const byConfidence = new Map();
    const byAppointmentStatus = new Map();
    for (const row of assessmentRows) {
        byDisease.set(row.predictedDisease, (byDisease.get(row.predictedDisease) ?? 0) + 1);
        byConfidence.set(row.confidence, (byConfidence.get(row.confidence) ?? 0) + 1);
    }
    for (const row of allAppointments) {
        const status = row.status || "unknown";
        byAppointmentStatus.set(status, (byAppointmentStatus.get(status) ?? 0) + 1);
    }
    const diseaseDistribution = Array.from(byDisease.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);
    const confidenceDistribution = ["high", "medium", "low"].map((key) => ({
        label: key,
        value: byConfidence.get(key) ?? 0,
    }));
    const appointmentStatusDistribution = Array.from(byAppointmentStatus.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    return res.json({
        stats: {
            totalUsers,
            totalDoctors,
            totalAppointments,
            totalAssessments: assessmentRows.length,
            diseaseDistribution,
            confidenceDistribution,
            appointmentStatusDistribution,
        },
    });
}
async function getAdminHealth(_req, res) {
    const startedAt = Date.now();
    const mlApiUrl = process.env.ML_API_URL ?? "http://localhost:8001";
    const dbHealthPromise = (async () => {
        const t0 = Date.now();
        try {
            await client_1.db.execute((0, drizzle_orm_1.sql) `select 1`);
            return { status: "healthy", latencyMs: Date.now() - t0 };
        }
        catch {
            return { status: "degraded", latencyMs: null };
        }
    })();
    const modelHealthPromise = (async () => {
        const t0 = Date.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${mlApiUrl.replace(/\/$/, "")}/health`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                return { status: "degraded", latencyMs: Date.now() - t0 };
            }
            return { status: "healthy", latencyMs: Date.now() - t0 };
        }
        catch {
            return { status: "degraded", latencyMs: null };
        }
    })();
    const [database, modelApi] = await Promise.all([dbHealthPromise, modelHealthPromise]);
    const backendLatencyMs = Date.now() - startedAt;
    return res.json({
        health: {
            backend: {
                status: "healthy",
                latencyMs: backendLatencyMs,
            },
            database,
            modelApi,
            checkedAt: new Date().toISOString(),
        },
    });
}
