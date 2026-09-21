import nodemailer from "nodemailer";

import { env } from "../config/env";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function createTransporter() {
  if (env.EMAIL_MODE !== "smtp") {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
}

const transporter = createTransporter();

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<void> {
  if (env.EMAIL_MODE === "console") {
    console.log("");
    console.log("========================================");
    console.log("LOOP_N_LOOOM EMAIL — DEVELOPMENT MODE");
    console.log("========================================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("");
    console.log(text);
    console.log("========================================");
    console.log("");

    return;
  }

  if (!transporter) {
    throw new Error("SMTP transporter is not configured.");
  }

  await transporter.sendMail({
    from: {
      name: env.EMAIL_FROM_NAME,
      address: env.EMAIL_FROM_ADDRESS,
    },
    to,
    subject,
    text,
    html,
  });
}

export async function sendEmailVerificationOtp(
  email: string,
  code: string,
): Promise<void> {
  const subject = "Verify your LOOP_N_LOOOM email";

  const text = [
    "Welcome to LOOP_N_LOOOM.",
    "",
    `Your verification code is: ${code}`,
    "",
    "This code expires in 10 minutes.",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #4A3B32;">
      <h2 style="margin-bottom: 16px;">Welcome to LOOP_N_LOOOM</h2>

      <p>Use the verification code below to confirm your email address.</p>

      <p
        style="
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 6px;
          margin: 24px 0;
        "
      >
        ${code}
      </p>

      <p>This code expires in 10 minutes.</p>

      <p style="font-size: 13px; color: #8A7B72;">
        If you did not create this account, you can ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}