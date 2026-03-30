"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppointment = createAppointment;
exports.getDoctorAppointments = getDoctorAppointments;
exports.getUserAppointments = getUserAppointments;
exports.getDoctorBookedSlots = getDoctorBookedSlots;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const createAppointmentSchema = zod_1.z.object({
    doctorId: zod_1.z.number().int().positive(),
    startsAt: zod_1.z.string().min(1),
    endsAt: zod_1.z.string().min(1),
});
async function createAppointment(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { doctorId, startsAt, endsAt } = parseResult.data;
    const doctor = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, doctorId), (0, drizzle_orm_1.eq)(schema_1.users.role, "doctor")))
        .limit(1);
    if (!doctor[0]) {
        return res.status(400).json({ error: "Invalid doctor" });
    }
    const [created] = await client_1.db
        .insert(schema_1.appointments)
        .values({
        doctorId,
        patientId: authUser.id,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
    })
        .returning();
    return res.status(201).json({
        appointment: serializeAppointment(created),
    });
}
function serializeAppointment(appt) {
    return {
        id: appt.id,
        doctorId: appt.doctorId,
        patientId: appt.patientId,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        status: appt.status,
    };
}
async function getDoctorAppointments(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const rows = await client_1.db
        .select({
        appointment: schema_1.appointments,
        patient: schema_1.users,
    })
        .from(schema_1.appointments)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.appointments.patientId))
        .where((0, drizzle_orm_1.eq)(schema_1.appointments.doctorId, authUser.id));
    const data = rows.map((row) => ({
        id: row.appointment.id,
        startsAt: row.appointment.startsAt,
        endsAt: row.appointment.endsAt,
        status: row.appointment.status,
        patientName: row.patient?.name ?? "Unknown patient",
    }));
    return res.json({ appointments: data });
}
async function getUserAppointments(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const rows = await client_1.db
        .select({
        appointment: schema_1.appointments,
        doctor: schema_1.users,
    })
        .from(schema_1.appointments)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.appointments.doctorId))
        .where((0, drizzle_orm_1.eq)(schema_1.appointments.patientId, authUser.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.appointments.startsAt));
    const data = rows.map((row) => ({
        id: row.appointment.id,
        doctorId: row.appointment.doctorId,
        doctorName: row.doctor?.name ?? "Unknown doctor",
        doctorEmail: row.doctor?.email,
        startsAt: row.appointment.startsAt,
        endsAt: row.appointment.endsAt,
        status: row.appointment.status,
    }));
    return res.json({ appointments: data });
}
async function getDoctorBookedSlots(req, res) {
    const doctorId = Number(req.query.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
        return res.status(400).json({ error: "Valid doctorId is required" });
    }
    const rows = await client_1.db
        .select({ startsAt: schema_1.appointments.startsAt, endsAt: schema_1.appointments.endsAt })
        .from(schema_1.appointments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.appointments.doctorId, doctorId), (0, drizzle_orm_1.eq)(schema_1.appointments.status, "scheduled")));
    return res.json({
        slots: rows.map((r) => ({
            startsAt: r.startsAt,
            endsAt: r.endsAt,
        })),
    });
}
