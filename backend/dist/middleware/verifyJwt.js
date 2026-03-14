"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = verifyJwt;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv/config");
function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.slice("Bearer ".length);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ error: "JWT secrets are not configured" });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        const userId = Number(payload.sub);
        if (Number.isNaN(userId)) {
            return res.status(401).json({ error: "Invalid token" });
        }
        req.authUser = {
            id: userId,
            email: payload.email,
            name: payload.name,
            role: payload.role ?? "user",
        };
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const { authUser } = req;
        if (!authUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!allowedRoles.includes(authUser.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        return next();
    };
}
