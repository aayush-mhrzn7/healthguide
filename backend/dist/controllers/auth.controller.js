"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.verifyEmail = verifyEmail;
exports.resendVerificationEmail = resendVerificationEmail;
exports.login = login;
exports.refresh = refresh;
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.logout = logout;
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const sendVerificationEmail_1 = require("../lib/sendVerificationEmail");
const passwordSchema = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain at least one letter and one number");
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Name is required"),
    email: zod_1.z.string().trim().min(1, "Email is required").email("Invalid email"),
    password: passwordSchema,
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().min(1, "Email is required").email("Invalid email"),
    password: zod_1.z.string().min(1, "Password is required"),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
const verifyEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});
const resendVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const updateProfileSchema = zod_1.z.object({
    dateOfBirth: zod_1.z.string().optional().nullable(),
    gender: zod_1.z.string().optional().nullable(),
    bloodType: zod_1.z.string().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    latitude: zod_1.z.number().finite().optional().nullable(),
    longitude: zod_1.z.number().finite().optional().nullable(),
    specialty: zod_1.z.string().optional().nullable(),
    bio: zod_1.z.string().optional().nullable(),
    preferredCommunication: zod_1.z.string().optional().nullable(),
    primaryCarePreference: zod_1.z.string().optional().nullable(),
});
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
function generateTokens(user) {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtSecret || !refreshSecret) {
        throw new Error("JWT secrets are not configured");
    }
    const payload = {
        sub: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, refreshSecret, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    return { accessToken, refreshToken };
}
function otpExpiresAt() {
    return new Date(Date.now() + (0, sendVerificationEmail_1.getOtpExpiryMinutes)() * 60 * 1000);
}
async function createOtpForUser(userId, email) {
    const code = (0, crypto_1.randomInt)(0, 1000000).toString().padStart(6, "0");
    const codeHash = await bcryptjs_1.default.hash(code, 10);
    await client_1.db.delete(schema_1.emailOtps).where((0, drizzle_orm_1.eq)(schema_1.emailOtps.userId, userId));
    await client_1.db.insert(schema_1.emailOtps).values({
        userId,
        codeHash,
        expiresAt: otpExpiresAt(),
    });
    await (0, sendVerificationEmail_1.sendVerificationOtpEmail)(email, code);
}
function publicUserFields(user) {
    return {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodType: user.bloodType,
        phone: user.phone,
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        preferredCommunication: user.preferredCommunication,
        primaryCarePreference: user.primaryCarePreference,
    };
}
async function signup(req, res) {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { name, email, password } = parseResult.data;
    const existing = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
        .limit(1);
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    if (existing[0]) {
        const prev = existing[0];
        if (prev.emailVerified) {
            return res.status(400).json({ error: "User already exists" });
        }
        await client_1.db
            .update(schema_1.users)
            .set({ name, passwordHash })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, prev.id));
        try {
            await createOtpForUser(prev.id, prev.email);
        }
        catch (e) {
            console.error("OTP email failed", e);
            return res.status(503).json({
                error: "Could not send verification email. Try again later or contact support.",
            });
        }
        return res.status(200).json({
            needsVerification: true,
            email: prev.email,
        });
    }
    const [user] = await client_1.db
        .insert(schema_1.users)
        .values({
        name,
        email,
        passwordHash,
        emailVerified: false,
    })
        .returning();
    try {
        await createOtpForUser(user.id, user.email);
    }
    catch (e) {
        console.error("OTP email failed", e);
        await client_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
        return res.status(503).json({
            error: "Could not send verification email. Try again later or contact support.",
        });
    }
    return res.status(201).json({
        needsVerification: true,
        email: user.email,
    });
}
async function verifyEmail(req, res) {
    const parseResult = verifyEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { email, code } = parseResult.data;
    const found = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
        .limit(1);
    const user = found[0];
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    if (user.emailVerified) {
        const { accessToken, refreshToken } = generateTokens(user);
        return res
            .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
            .json({
            user: publicUserFields(user),
            accessToken,
            alreadyVerified: true,
        });
    }
    const otpRows = await client_1.db
        .select()
        .from(schema_1.emailOtps)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.emailOtps.userId, user.id), (0, drizzle_orm_1.gt)(schema_1.emailOtps.expiresAt, new Date())))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.emailOtps.createdAt))
        .limit(1);
    const otpRow = otpRows[0];
    if (!otpRow) {
        return res.status(400).json({
            error: "Code expired or not found. Request a new code.",
        });
    }
    const valid = await bcryptjs_1.default.compare(code, otpRow.codeHash);
    if (!valid) {
        return res.status(400).json({ error: "Invalid verification code" });
    }
    await client_1.db.delete(schema_1.emailOtps).where((0, drizzle_orm_1.eq)(schema_1.emailOtps.userId, user.id));
    const [updated] = await client_1.db
        .update(schema_1.users)
        .set({ emailVerified: true })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
        .returning();
    if (!updated) {
        return res.status(500).json({ error: "Verification failed" });
    }
    const { accessToken, refreshToken } = generateTokens(updated);
    return res
        .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })
        .json({
        user: publicUserFields(updated),
        accessToken,
    });
}
async function resendVerificationEmail(req, res) {
    const parseResult = resendVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { email } = parseResult.data;
    const found = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
        .limit(1);
    const user = found[0];
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
    }
    try {
        await createOtpForUser(user.id, user.email);
    }
    catch (e) {
        console.error("Resend OTP email failed", e);
        return res.status(503).json({
            error: "Could not send email. Try again later.",
        });
    }
    return res.json({ message: "Verification code sent" });
}
async function login(req, res) {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { email, password } = parseResult.data;
    const found = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
        .limit(1);
    const existingUser = found[0];
    if (!existingUser) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, existingUser.passwordHash);
    if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!existingUser.emailVerified) {
        return res.status(403).json({
            error: "Please verify your email before signing in.",
            code: "EMAIL_NOT_VERIFIED",
        });
    }
    const { accessToken, refreshToken } = generateTokens(existingUser);
    return res
        .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })
        .json({
        user: publicUserFields(existingUser),
        accessToken,
    });
}
async function refresh(req, res) {
    const cookieToken = req.cookies?.refreshToken;
    const bodyParse = refreshSchema.safeParse(req.body);
    const refreshToken = cookieToken ?? (bodyParse.success ? bodyParse.data.refreshToken : undefined);
    if (!refreshToken) {
        return res.status(401).json({ error: "No refresh token provided" });
    }
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const jwtSecret = process.env.JWT_SECRET;
    if (!refreshSecret || !jwtSecret) {
        return res.status(500).json({ error: "JWT secrets are not configured" });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
        const userId = Number(payload.sub);
        if (Number.isNaN(userId)) {
            return res.status(401).json({ error: "Invalid refresh token" });
        }
        const found = await client_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        const user = found[0];
        if (!user) {
            return res.status(401).json({ error: "Invalid refresh token" });
        }
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        return res
            .cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
            .json({
            accessToken,
        });
    }
    catch {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
}
async function getMe(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const found = await client_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, authUser.id))
        .limit(1);
    const user = found[0];
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    return res.json({
        user: {
            ...publicUserFields(user),
            specialty: user.specialty,
            bio: user.bio,
        },
    });
}
async function updateMe(req, res) {
    const { authUser } = req;
    if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { dateOfBirth, gender, bloodType, phone, address, latitude, longitude, specialty, bio, preferredCommunication, primaryCarePreference, } = parseResult.data;
    const updateValues = {};
    if (typeof specialty !== "undefined") {
        updateValues.specialty =
            specialty && specialty.trim().length > 0 ? specialty.trim() : null;
    }
    if (typeof bio !== "undefined") {
        updateValues.bio =
            bio && bio.trim().length > 0 ? bio.trim() : null;
    }
    if (typeof preferredCommunication !== "undefined") {
        updateValues.preferredCommunication =
            preferredCommunication && preferredCommunication.trim().length > 0
                ? preferredCommunication.trim()
                : null;
    }
    if (typeof primaryCarePreference !== "undefined") {
        updateValues.primaryCarePreference =
            primaryCarePreference && primaryCarePreference.trim().length > 0
                ? primaryCarePreference.trim()
                : null;
    }
    if (typeof dateOfBirth !== "undefined") {
        updateValues.dateOfBirth =
            dateOfBirth && dateOfBirth.trim().length > 0
                ? new Date(dateOfBirth)
                : null;
    }
    if (typeof gender !== "undefined") {
        updateValues.gender =
            gender && gender.trim().length > 0 ? gender.trim() : null;
    }
    if (typeof bloodType !== "undefined") {
        updateValues.bloodType =
            bloodType && bloodType.trim().length > 0 ? bloodType.trim() : null;
    }
    if (typeof phone !== "undefined") {
        updateValues.phone =
            phone && phone.trim().length > 0 ? phone.trim() : null;
    }
    if (typeof address !== "undefined") {
        updateValues.address =
            address && address.trim().length > 0 ? address.trim() : null;
    }
    if (typeof latitude !== "undefined") {
        updateValues.latitude = latitude ?? null;
    }
    if (typeof longitude !== "undefined") {
        updateValues.longitude = longitude ?? null;
    }
    const [updated] = await client_1.db
        .update(schema_1.users)
        .set(updateValues)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, authUser.id))
        .returning();
    if (!updated) {
        return res.status(404).json({ error: "User not found" });
    }
    return res.json({
        user: {
            ...publicUserFields(updated),
            specialty: updated.specialty,
            bio: updated.bio,
        },
    });
}
async function logout(req, res) {
    return res
        .clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    })
        .status(200)
        .json({ message: "Logged out" });
}
