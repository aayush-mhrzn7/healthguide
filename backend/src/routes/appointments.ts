import { Router } from "express";

import {
  createAppointment,
  getDoctorAppointments,
  getUserAppointments,
  getDoctorBookedSlots,
} from "../controllers/appointments.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const appointmentsRouter = Router();

appointmentsRouter.post(
  "/",
  verifyJwt,
  requireRole(["user"]),
  createAppointment
);

appointmentsRouter.get(
  "/user",
  verifyJwt,
  requireRole(["user"]),
  getUserAppointments
);

appointmentsRouter.get(
  "/doctor",
  verifyJwt,
  requireRole(["doctor"]),
  getDoctorAppointments
);

appointmentsRouter.get(
  "/booked-slots",
  verifyJwt,
  requireRole(["user"]),
  getDoctorBookedSlots
);

export { appointmentsRouter };

