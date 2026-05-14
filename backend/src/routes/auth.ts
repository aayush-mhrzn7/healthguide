import { Router } from "express";

import {
  getMe,
  login,
  logout,
  requestPasswordReset,
  refresh,
  resetPassword,
  resendVerificationEmail,
  signup,
  updateMe,
  verifyEmail,
} from "../controllers/auth.controller";
import { verifyJwt } from "../middleware/verifyJwt";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerificationEmail);
authRouter.post("/request-password-reset", requestPasswordReset);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", verifyJwt, getMe);
authRouter.patch("/me", verifyJwt, updateMe);

export { authRouter };
