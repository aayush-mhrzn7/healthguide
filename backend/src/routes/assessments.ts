import { Router } from "express";

import {
  submitAssessment,
  getUserAssessments,
} from "../controllers/assessments.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const assessmentsRouter = Router();

assessmentsRouter.post(
  "/",
  verifyJwt,
  requireRole(["user"]),
  submitAssessment
);

assessmentsRouter.get(
  "/",
  verifyJwt,
  requireRole(["user"]),
  getUserAssessments
);

export { assessmentsRouter };
