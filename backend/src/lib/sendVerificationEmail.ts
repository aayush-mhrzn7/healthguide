import { Resend } from "resend";

const OTP_EXPIRY_MINUTES = 15;

export function getOtpExpiryMinutes() {
  return OTP_EXPIRY_MINUTES;
}

export async function sendVerificationOtpEmail(
  toEmail: string,
  code: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "HealthGuide <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[email] RESEND_API_KEY missing or empty — OTP for ${toEmail}: ${code}`,
      );
      return;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: "Your HealthGuide verification code",
    html: `<p>Your verification code is <strong style="font-size:1.25em;letter-spacing:0.1em">${code}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not sign up, you can ignore this email.</p>`,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send verification email");
  }

  if (process.env.NODE_ENV === "development" && data?.id) {
    console.log(`[email] Resend queued message id=${data.id} to=${toEmail}`);
  }
}
