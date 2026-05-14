"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtpExpiryMinutes = getOtpExpiryMinutes;
exports.getPasswordResetExpiryMinutes = getPasswordResetExpiryMinutes;
exports.sendVerificationOtpEmail = sendVerificationOtpEmail;
exports.sendAppointmentBookedEmails = sendAppointmentBookedEmails;
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
async function sendVerificationOtpEmail(toEmail, code) {
    await sendMail({
        to: toEmail,
        subject: "Your HealthGuide verification code",
        html: `<p>Your verification code is <strong style="font-size:1.25em;letter-spacing:0.1em">${code}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not sign up, you can ignore this email.</p>`,
        text: `Your verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    });
}
async function sendAppointmentBookedEmails(params) {
    const { patientName, patientEmail, doctorName, doctorEmail, startsAt, endsAt } = params;
    const slotLabel = `${startsAt.toLocaleString()} - ${endsAt.toLocaleString()}`;
    await Promise.all([
        sendMail({
            to: patientEmail,
            subject: "Appointment confirmed",
            html: `<p>Hi ${patientName},</p><p>Your appointment with Dr. ${doctorName} is confirmed for <strong>${slotLabel}</strong>.</p>`,
            text: `Hi ${patientName}, your appointment with Dr. ${doctorName} is confirmed for ${slotLabel}.`,
        }),
        sendMail({
            to: doctorEmail,
            subject: "New appointment booked",
            html: `<p>Hi Dr. ${doctorName},</p><p>${patientName} has booked an appointment for <strong>${slotLabel}</strong>.</p>`,
            text: `Hi Dr. ${doctorName}, ${patientName} has booked an appointment for ${slotLabel}.`,
        }),
    ]);
}
async function sendDoctorWelcomeEmail(params) {
    const { doctorName, doctorEmail, temporaryPassword, changePasswordUrl } = params;
    await sendMail({
        to: doctorEmail,
        subject: "Your HealthGuide doctor account is ready",
        html: `<p>Hi Dr. ${doctorName},</p>
<p>Your doctor account has been created.</p>
<p><strong>Temporary password:</strong> <code>${temporaryPassword}</code></p>
<p>For security, please change your password immediately:</p>
<p><a href="${changePasswordUrl}">${changePasswordUrl}</a></p>
<p>This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p>`,
        text: `Hi Dr. ${doctorName}, your account has been created. Temporary password: ${temporaryPassword}. Change it now: ${changePasswordUrl}. This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.`,
    });
}
async function sendPasswordResetEmail(params) {
    const { userName, userEmail, resetUrl } = params;
    await sendMail({
        to: userEmail,
        subject: "Reset your HealthGuide password",
        html: `<p>Hi ${userName},</p>
<p>We received a request to reset your password.</p>
<p>Use this secure link to set a new password:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p>
<p>If you did not request this, you can safely ignore this email.</p>`,
        text: `Hi ${userName}, reset your password using this link: ${resetUrl}. It expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes. If you did not request this, ignore this email.`,
    });
}
