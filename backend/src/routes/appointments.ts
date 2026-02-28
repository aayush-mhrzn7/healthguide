import { Router } from "express";

import {
  createAppointment,
  getDoctorAppointments,
} from "../controllers/appointments.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const appointmentsRouter = Router();

// General user creates appointment
appointmentsRouter.post(
  "/",
  verifyJwt,
  requireRole(["user"]),
  createAppointment,
);

// Doctor views their appointments (for calendar)
appointmentsRouter.get(
  "/doctor",
  verifyJwt,
  requireRole(["doctor"]),
  getDoctorAppointments,
);

export { appointmentsRouter };

