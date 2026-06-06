import type { Request, Response } from "express";
import { createHash } from "crypto";

import type { AuthRequest } from "../middleware/verifyJwt";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

function signCloudinaryParams(params: Record<string, string | number>) {
  if (!apiSecret) {
    throw new Error("Cloudinary API secret is not configured");
  }

  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

export async function createCloudinaryUploadSignature(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      error:
        "Cloudinary signed upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or configure an unsigned upload preset.",
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "healthguide/profiles";
  const signature = signCloudinaryParams({ folder, timestamp });

  return res.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  });
}
