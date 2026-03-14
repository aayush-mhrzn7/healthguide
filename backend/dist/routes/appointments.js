"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsRouter = void 0;
const express_1 = require("express");
const appointments_controller_1 = require("../controllers/appointments.controller");
const verifyJwt_1 = require("../middleware/verifyJwt");
const appointmentsRouter = (0, express_1.Router)();
exports.appointmentsRouter = appointmentsRouter;
// User creates appointment
appointmentsRouter.post("/", verifyJwt_1.verifyJwt, (0, verifyJwt_1.requireRole)(["user"]), appointments_controller_1.createAppointment);
// User views their appointments
appointmentsRouter.get("/user", verifyJwt_1.verifyJwt, (0, verifyJwt_1.requireRole)(["user"]), appointments_controller_1.getUserAppointments);
// Doctor views their appointments (for calendar)
appointmentsRouter.get("/doctor", verifyJwt_1.verifyJwt, (0, verifyJwt_1.requireRole)(["doctor"]), appointments_controller_1.getDoctorAppointments);
