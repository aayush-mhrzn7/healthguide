import { api } from "@/lib/apiClient";

type CloudinarySignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

function formatCloudinaryError(message: string) {
  if (message.includes('missing permissions') && message.includes("create")) {
    return "Cloudinary API key does not have upload permission. Enable Upload access for this key in Cloudinary Settings → Security → API Keys, or create an unsigned upload preset.";
  }
  if (message.includes("Upload preset not found")) {
    return "Cloudinary upload preset not found. Create an unsigned preset named in NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (e.g. aayush) in Cloudinary Settings → Upload → Upload presets.";
  }
  return message;
}

async function readCloudinaryError(response: Response) {
  let message = "Cloudinary upload failed.";
  try {
    const data = (await response.json()) as {
      error?: { message?: string };
    };
    message = data.error?.message ?? message;
  } catch {
    // Keep the generic message when Cloudinary does not return JSON.
  }
  return formatCloudinaryError(message);
}

async function uploadSignedProfileImage(file: File): Promise<string> {
  const signatureResponse = await api.post<CloudinarySignatureResponse>(
    "/uploads/cloudinary/signature",
  );
  const { cloudName, apiKey, timestamp, folder, signature } =
    signatureResponse.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await readCloudinaryError(response));
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data.secure_url;
}

async function uploadUnsignedProfileImage(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary upload is not configured. Set an unsigned upload preset or add CLOUDINARY_API_SECRET for signed uploads.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "healthguide/profiles");
  if (apiKey) formData.append("api_key", apiKey);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await readCloudinaryError(response));
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data.secure_url;
}

export async function uploadProfileImage(file: File): Promise<string> {
  try {
    return await uploadSignedProfileImage(file);
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 503) {
      throw error;
    }
  }
  return uploadUnsignedProfileImage(file);
}
