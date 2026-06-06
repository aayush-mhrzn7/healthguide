"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./loadEnv");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("./db/client");
const schema_1 = require("./db/schema");
const users_json_1 = __importDefault(require("../users.json"));
async function seed() {
    console.log("🗑️  Dropping all rows (appointments → assessments → users)…");
    await client_1.db.delete(schema_1.appointments);
    await client_1.db.delete(schema_1.assessments);
    await client_1.db.delete(schema_1.emailOtps);
    await client_1.db.delete(schema_1.users);
    const { sql } = await Promise.resolve().then(() => __importStar(require("drizzle-orm")));
    await client_1.db.execute(sql `ALTER SEQUENCE users_id_seq RESTART WITH 1`);
    await client_1.db.execute(sql `ALTER SEQUENCE email_otps_id_seq RESTART WITH 1`);
    await client_1.db.execute(sql `ALTER SEQUENCE assessments_id_seq RESTART WITH 1`);
    await client_1.db.execute(sql `ALTER SEQUENCE appointments_id_seq RESTART WITH 1`);
    console.log("   Done.\n");
    console.log(`👤  Seeding admin: ${users_json_1.default.admin.email}`);
    await client_1.db.insert(schema_1.users).values({
        name: "Admin",
        email: users_json_1.default.admin.email,
        passwordHash: await bcryptjs_1.default.hash(users_json_1.default.admin.password, 10),
        role: "admin",
        emailVerified: true,
    });
    console.log(`👤  Seeding user:  ${users_json_1.default.user.email}`);
    const [primaryUser] = await client_1.db.insert(schema_1.users).values({
        name: "Aayush",
        email: users_json_1.default.user.email,
        passwordHash: await bcryptjs_1.default.hash(users_json_1.default.user.password, 10),
        role: "user",
        emailVerified: true,
        phone: users_json_1.default.user.phone ?? "+977 9800000000",
        address: users_json_1.default.user.address ?? "Kathmandu, Nepal",
        latitude: users_json_1.default.user.latitude ?? 27.7172,
        longitude: users_json_1.default.user.longitude ?? 85.324,
    }).returning();
    const userByEmail = new Map([[users_json_1.default.user.email, primaryUser.id]]);
    const patients = (users_json_1.default.patients ?? []);
    for (const patient of patients) {
        console.log(`👤  Seeding patient: ${patient.email}`);
        const [created] = await client_1.db.insert(schema_1.users).values({
            name: patient.name,
            email: patient.email,
            passwordHash: await bcryptjs_1.default.hash(patient.password, 10),
            role: "user",
            emailVerified: true,
            phone: patient.phone,
            address: patient.address,
            latitude: patient.latitude,
            longitude: patient.longitude,
        }).returning();
        userByEmail.set(patient.email, created.id);
    }
    const doctorByEmail = new Map();
    for (const doc of users_json_1.default.doctors) {
        console.log(`🩺  Seeding doctor: ${doc.email} (${doc.specialty})`);
        const [created] = await client_1.db.insert(schema_1.users).values({
            name: doc.name,
            email: doc.email,
            passwordHash: await bcryptjs_1.default.hash(doc.password, 10),
            role: "doctor",
            specialty: doc.specialty,
            bio: doc.bio,
            phone: doc.phone,
            address: doc.address,
            latitude: doc.latitude,
            longitude: doc.longitude,
            emailVerified: true,
        }).returning();
        doctorByEmail.set(doc.email, created.id);
    }
    const now = new Date();
    for (const item of users_json_1.default.assessments ?? []) {
        const userId = userByEmail.get(item.userEmail);
        if (!userId)
            continue;
        console.log(`🧾  Seeding assessment: ${item.predictedDisease}`);
        await client_1.db.insert(schema_1.assessments).values({
            userId,
            answers: item.answers,
            predictedDisease: item.predictedDisease,
            recommendedSpecialty: item.recommendedSpecialty,
            confidence: item.confidence,
            topPredictions: item.topPredictions,
            reasoning: item.reasoning,
            llmAdvice: item.llmAdvice,
            selectedSymptoms: item.selectedSymptoms,
            createdAt: new Date(now.getTime() - item.daysAgo * 24 * 60 * 60 * 1000),
        });
    }
    for (const item of users_json_1.default.appointments ?? []) {
        const patientId = userByEmail.get(item.patientEmail);
        const doctorId = doctorByEmail.get(item.doctorEmail);
        if (!patientId || !doctorId)
            continue;
        const startsAt = new Date(now.getTime() + item.startsInHours * 60 * 60 * 1000);
        console.log(`📅  Seeding appointment: ${item.status} (${item.patientEmail})`);
        await client_1.db.insert(schema_1.appointments).values({
            patientId,
            doctorId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
            status: item.status,
        });
    }
    console.log("\n✅  Seed complete.");
    process.exit(0);
}
seed().catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
});
