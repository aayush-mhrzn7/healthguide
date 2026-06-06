"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsRouter = void 0;
const express_1 = require("express");
const uploads_controller_1 = require("../controllers/uploads.controller");
const verifyJwt_1 = require("../middleware/verifyJwt");
const uploadsRouter = (0, express_1.Router)();
exports.uploadsRouter = uploadsRouter;
uploadsRouter.post("/cloudinary/signature", verifyJwt_1.verifyJwt, uploads_controller_1.createCloudinaryUploadSignature);
