import { Router } from "express";

import { listDoctors } from "../controllers/doctors.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const doctorsRouter = Router();

doctorsRouter.get("/", verifyJwt, requireRole(["user"]), listDoctors);

export { doctorsRouter };
