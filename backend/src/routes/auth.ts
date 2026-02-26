import { Router } from "express";

import {
  getMe,
  login,
  logout,
  refresh,
  signup,
  updateMe,
} from "../controllers/auth.controller";
import { verifyJwt } from "../middleware/verifyJwt";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", verifyJwt, getMe);
authRouter.patch("/me", verifyJwt, updateMe);

export { authRouter };
