import { Router } from "express";

import {
  createAppointment,
  getDoctorAppointments,
  getUserAppointments,
  getDoctorBookedSlots,
} from "../controllers/appointments.controller";
import { verifyJwt, requireRole } from "../middleware/verifyJwt";

const appointmentsRouter = Router();

// User creates appointment
appointmentsRouter.post(
  "/",
  verifyJwt,
  requireRole(["user"]),
  createAppointment
);

// User views their appointments
appointmentsRouter.get(
  "/user",
  verifyJwt,
  requireRole(["user"]),
  getUserAppointments
);

// Doctor views their appointments (for calendar)
appointmentsRouter.get(
  "/doctor",
  verifyJwt,
  requireRole(["doctor"]),
  getDoctorAppointments
);

// User fetches booked slots for a doctor (to grey out unavailable times)
appointmentsRouter.get(
  "/booked-slots",
  verifyJwt,
  requireRole(["user"]),
  getDoctorBookedSlots
);

export { appointmentsRouter };

