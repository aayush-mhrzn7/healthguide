"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorsRouter = void 0;
const express_1 = require("express");
const doctors_controller_1 = require("../controllers/doctors.controller");
const verifyJwt_1 = require("../middleware/verifyJwt");
const doctorsRouter = (0, express_1.Router)();
exports.doctorsRouter = doctorsRouter;
doctorsRouter.get("/", verifyJwt_1.verifyJwt, (0, verifyJwt_1.requireRole)(["user"]), doctors_controller_1.listDoctors);
