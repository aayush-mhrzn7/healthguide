"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./loadEnv");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("./routes/auth");
const admin_1 = require("./routes/admin");
const appointments_1 = require("./routes/appointments");
const assessments_1 = require("./routes/assessments");
const doctors_1 = require("./routes/doctors");
const uploads_1 = require("./routes/uploads");
const client_1 = require("./db/client");
const schema_1 = require("./db/schema");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", auth_1.authRouter);
app.use("/api/admin", admin_1.adminRouter);
app.use("/api/appointments", appointments_1.appointmentsRouter);
app.use("/api/assessments", assessments_1.assessmentsRouter);
app.use("/api/doctors", doctors_1.doctorsRouter);
app.use("/api/uploads", uploads_1.uploadsRouter);
async function ensureAdminUser() {
    const adminEmail = "admin@gmail.com";
    const adminPassword = "Admin@123";
    const existing = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, adminEmail))
        .limit(1);
    if (existing[0]) {
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
    await client_1.db.insert(schema_1.users).values({
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: "admin",
        emailVerified: true,
    });
}
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
    void ensureAdminUser().catch((error) => {
        console.error("Failed to ensure admin user", error);
    });
});
