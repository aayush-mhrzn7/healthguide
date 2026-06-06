import { Router } from "express";

import { createCloudinaryUploadSignature } from "../controllers/uploads.controller";
import { verifyJwt } from "../middleware/verifyJwt";

const uploadsRouter = Router();

uploadsRouter.post("/cloudinary/signature", verifyJwt, createCloudinaryUploadSignature);

export { uploadsRouter };
