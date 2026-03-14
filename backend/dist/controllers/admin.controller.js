"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDoctor = createDoctor;
exports.getAdminStats = getAdminStats;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const createDoctorSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
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
    const { name, email, password, specialty } = parseResult.data;
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
    })
        .returning();
    return res.status(201).json({
        doctor: {
            id: doctor.id.toString(),
            name: doctor.name,
            email: doctor.email,
            role: doctor.role,
            specialty: doctor.specialty,
        },
    });
}
async function getAdminStats(_req, res) {
    const [allUsers, doctors, allAppointments] = await Promise.all([
        client_1.db.select().from(schema_1.users),
        client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.role, "doctor")),
        client_1.db.select().from(schema_1.appointments),
    ]);
    const totalUsers = allUsers.length;
    const totalDoctors = doctors.length;
    const totalAppointments = allAppointments.length;
    return res.json({
        stats: {
            totalUsers,
            totalDoctors,
            totalAppointments,
        },
    });
}
