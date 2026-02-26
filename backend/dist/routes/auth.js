"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const authRouter = (0, express_1.Router)();
exports.authRouter = authRouter;
const users = new Map();
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
function generateTokens(user) {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtSecret || !refreshSecret) {
        throw new Error("JWT secrets are not configured");
    }
    const payload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, refreshSecret, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    return { accessToken, refreshToken };
}
authRouter.post("/signup", async (req, res) => {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { name, email, password } = parseResult.data;
    if (users.has(email)) {
        return res.status(400).json({ error: "User already exists" });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = {
        id: (users.size + 1).toString(),
        name,
        email,
        passwordHash,
    };
    users.set(email, user);
    const { accessToken, refreshToken } = generateTokens(user);
    res
        .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })
        .status(201)
        .json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
        accessToken,
    });
});
authRouter.post("/login", async (req, res) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid payload",
            issues: parseResult.error.flatten(),
        });
    }
    const { email, password } = parseResult.data;
    const existingUser = users.get(email);
    if (!existingUser) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, existingUser.passwordHash);
    if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const { accessToken, refreshToken } = generateTokens(existingUser);
    res
        .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })
        .json({
        user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
        },
        accessToken,
    });
});
authRouter.post("/refresh", (req, res) => {
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
        const user = Array.from(users.values()).find((u) => u.id === payload.sub);
        if (!user) {
            return res.status(401).json({ error: "Invalid refresh token" });
        }
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        res
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
    catch (err) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});
