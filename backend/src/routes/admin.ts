import { Router } from "express";

import {
  createDoctor,
  getAdminHealth,
  getAdminStats,
} from "../controllers/admin.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const adminRouter = Router();

adminRouter.post(
  "/doctors",
  verifyJwt,
  requireRole(["admin"]),
  createDoctor,
);

adminRouter.get("/stats", verifyJwt, requireRole(["admin"]), getAdminStats);
adminRouter.get("/health", verifyJwt, requireRole(["admin"]), getAdminHealth);

export { adminRouter };

