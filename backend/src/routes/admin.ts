import { Router } from "express";

import { createDoctor, getAdminStats } from "../controllers/admin.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const adminRouter = Router();

adminRouter.post(
  "/doctors",
  verifyJwt,
  requireRole(["admin"]),
  createDoctor,
);

adminRouter.get("/stats", verifyJwt, requireRole(["admin"]), getAdminStats);

export { adminRouter };

