"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDoctors = listDoctors;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
async function listDoctors(req, res) {
    const specialty = req.query.specialty;
    const rows = await client_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        specialty: schema_1.users.specialty,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.role, "doctor"));
    const filtered = specialty
        ? rows.filter((d) => (d.specialty ?? "general") === specialty)
        : rows;
    return res.json({
        doctors: filtered.map((d) => ({
            id: d.id,
            name: d.name,
            email: d.email,
            specialty: d.specialty ?? "general",
        })),
    });
}
