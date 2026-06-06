"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtpExpiryMinutes = getOtpExpiryMinutes;
exports.getPasswordResetExpiryMinutes = getPasswordResetExpiryMinutes;
exports.sendVerificationOtpEmail = sendVerificationOtpEmail;
exports.sendAppointmentBookedEmails = sendAppointmentBookedEmails;
exports.sendAppointmentStatusEmail = sendAppointmentStatusEmail;
exports.sendDoctorWelcomeEmail = sendDoctorWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const OTP_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
function getOtpExpiryMinutes() {
    return OTP_EXPIRY_MINUTES;
}
function getPasswordResetExpiryMinutes() {
    return PASSWORD_RESET_EXPIRY_MINUTES;
}
const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpSecure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const fromEmail = process.env.EMAIL_FROM?.trim() || "HealthGuide <no-reply@healthguide.local>";
function getTransporter() {
    if (!smtpHost || !smtpUser || !smtpPass || !Number.isFinite(smtpPort)) {
        return null;
    }
    return nodemailer_1.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
}
async function sendMail(params) {
    const transporter = getTransporter();
    if (!transporter) {
        if (process.env.NODE_ENV === "development") {
            console.warn(`[email] SMTP not configured. Skipping email to ${params.to}`);
            return;
        }
        throw new Error("SMTP configuration is missing");
    }
    await transporter.sendMail({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
    });
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function emailTemplate(params) {
    const { eyebrow, title, body, actionHref, actionLabel, note } = params;
    const action = actionHref && actionLabel
        ? `<tr><td style="padding:4px 0 22px"><a href="${escapeHtml(actionHref)}" style="display:inline-block;border-radius:10px;background:#0f766e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 18px">${escapeHtml(actionLabel)}</a></td></tr>`
        : "";
    const noteBlock = note
        ? `<tr><td style="border-top:1px solid #e5e7eb;padding-top:16px;color:#64748b;font-size:12px;line-height:1.6">${note}</td></tr>`
        : "";
    return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fb;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-radius:18px;overflow:hidden;background:#ffffff;border:1px solid #e5e7eb;box-shadow:0 18px 45px rgba(15,23,42,0.08)">
            <tr>
              <td style="background:#0f766e;padding:22px 26px;color:#ffffff">
                <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.86">HealthGuide</div>
                <div style="font-size:22px;font-weight:800;margin-top:8px">${escapeHtml(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0f766e;padding-bottom:10px">${escapeHtml(eyebrow)}</td></tr>
                  <tr><td style="font-size:14px;line-height:1.7;color:#334155;padding-bottom:20px">${body}</td></tr>
                  ${action}
                  ${noteBlock}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
function pill(value) {
    return `<span style="display:inline-block;border-radius:999px;background:#ecfdf5;color:#0f766e;font-weight:800;letter-spacing:.14em;padding:8px 12px">${escapeHtml(value)}</span>`;
}
async function sendVerificationOtpEmail(toEmail, code) {
    await sendMail({
        to: toEmail,
        subject: "Your HealthGuide verification code",
        html: emailTemplate({
            eyebrow: "Email verification",
            title: "Verify your email",
            body: `<p style="margin:0 0 14px">Use this code to finish setting up your HealthGuide account.</p><p style="margin:0">${pill(code)}</p>`,
            note: `This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not sign up, you can ignore this email.`,
        }),
        text: `Your verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    });
}
async function sendAppointmentBookedEmails(params) {
    const { patientName, patientEmail, doctorName, doctorEmail, doctorPhone, startsAt, endsAt, } = params;
    const slotLabel = `${startsAt.toLocaleString()} - ${endsAt.toLocaleString()}`;
    const doctorContact = doctorPhone
        ? ` You can contact the doctor at <strong>${escapeHtml(doctorPhone)}</strong>.`
        : doctorEmail
            ? ` You can contact the doctor by email at <strong>${escapeHtml(doctorEmail)}</strong>.`
            : "";
    const doctorContactText = doctorPhone
        ? ` You can contact the doctor at ${doctorPhone}.`
        : doctorEmail
            ? ` You can contact the doctor by email at ${doctorEmail}.`
            : "";
    await Promise.all([
        sendMail({
            to: patientEmail,
            subject: "Appointment request received",
            html: emailTemplate({
                eyebrow: "Appointment request",
                title: "Request received",
                body: `<p style="margin:0 0 12px">Hi ${escapeHtml(patientName)},</p><p style="margin:0">Your appointment request is booked with <strong>Dr. ${escapeHtml(doctorName)}</strong> for <strong>${escapeHtml(slotLabel)}</strong>.${doctorContact} We will email you when the doctor accepts or denies it.</p>`,
            }),
            text: `Hi ${patientName}, your appointment request is booked with Dr. ${doctorName} for ${slotLabel}.${doctorContactText} We will email you when the doctor accepts or denies it.`,
        }),
        sendMail({
            to: doctorEmail,
            subject: "New appointment request",
            html: emailTemplate({
                eyebrow: "Doctor dashboard",
                title: "New appointment request",
                body: `<p style="margin:0 0 12px">Hi Dr. ${escapeHtml(doctorName)},</p><p style="margin:0">${escapeHtml(patientName)} requested an appointment for <strong>${escapeHtml(slotLabel)}</strong>. Please accept or deny it from your HealthGuide doctor dashboard.</p>`,
            }),
            text: `Hi Dr. ${doctorName}, ${patientName} requested an appointment for ${slotLabel}. Please accept or deny it from your HealthGuide doctor dashboard.`,
        }),
    ]);
}
async function sendAppointmentStatusEmail(params) {
    const { patientName, patientEmail, doctorName, startsAt, endsAt, status } = params;
    const slotLabel = `${startsAt.toLocaleString()} - ${endsAt.toLocaleString()}`;
    const accepted = status === "accepted";
    await sendMail({
        to: patientEmail,
        subject: accepted ? "Appointment accepted" : "Appointment denied",
        html: emailTemplate({
            eyebrow: "Appointment update",
            title: accepted ? "Appointment accepted" : "Appointment denied",
            body: accepted
                ? `<p style="margin:0 0 12px">Hi ${escapeHtml(patientName)},</p><p style="margin:0">Dr. ${escapeHtml(doctorName)} accepted your appointment for <strong>${escapeHtml(slotLabel)}</strong>.</p>`
                : `<p style="margin:0 0 12px">Hi ${escapeHtml(patientName)},</p><p style="margin:0">Dr. ${escapeHtml(doctorName)} denied your appointment request for <strong>${escapeHtml(slotLabel)}</strong>. Please choose another time or doctor from HealthGuide.</p>`,
            note: accepted ? "You can review doctor contact details in your appointment dashboard." : undefined,
        }),
        text: accepted
            ? `Hi ${patientName}, Dr. ${doctorName} accepted your appointment for ${slotLabel}.`
            : `Hi ${patientName}, Dr. ${doctorName} denied your appointment request for ${slotLabel}. Please choose another time or doctor from HealthGuide.`,
    });
}
async function sendDoctorWelcomeEmail(params) {
    const { doctorName, doctorEmail, temporaryPassword, changePasswordUrl } = params;
    await sendMail({
        to: doctorEmail,
        subject: "Your HealthGuide doctor account is ready",
        html: emailTemplate({
            eyebrow: "Doctor account",
            title: "Your workspace is ready",
            body: `<p style="margin:0 0 12px">Hi Dr. ${escapeHtml(doctorName)},</p><p style="margin:0 0 12px">Your doctor account has been created.</p><p style="margin:0">Temporary password: <strong>${escapeHtml(temporaryPassword)}</strong></p>`,
            actionHref: changePasswordUrl,
            actionLabel: "Change password",
            note: `For security, change your password immediately. This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.`,
        }),
        text: `Hi Dr. ${doctorName}, your account has been created. Temporary password: ${temporaryPassword}. Change it now: ${changePasswordUrl}. This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.`,
    });
}
async function sendPasswordResetEmail(params) {
    const { userName, userEmail, resetUrl } = params;
    await sendMail({
        to: userEmail,
        subject: "Reset your HealthGuide password",
        html: emailTemplate({
            eyebrow: "Password reset",
            title: "Reset your password",
            body: `<p style="margin:0 0 12px">Hi ${escapeHtml(userName)},</p><p style="margin:0">We received a request to reset your HealthGuide password.</p>`,
            actionHref: resetUrl,
            actionLabel: "Set new password",
            note: `This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes. If you did not request this, you can safely ignore this email.`,
        }),
        text: `Hi ${userName}, reset your password using this link: ${resetUrl}. It expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes. If you did not request this, ignore this email.`,
    });
}
