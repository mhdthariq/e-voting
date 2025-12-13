import nodemailer from 'nodemailer';
import { log } from "@/utils/logger";

// Email configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport(smtpConfig);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  // If SMTP is not configured, log email content in development
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV !== 'production') {
      log.info(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      console.log('--- EMAIL CONTENT ---');
      console.log(text || html);
      console.log('---------------------');
      return true; // Simulate success
    }
    
    log.error("SMTP not configured. Cannot send email.");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'BlockVote'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback text from HTML if not provided
      html,
    });

    log.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    log.exception(error as Error, "EMAIL", { to, subject });
    return false;
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(email: string, token: string, username: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationLink = `${appUrl}/auth/verify-email?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to BlockVote!</h2>
      <p>Hi ${username},</p>
      <p>Please verify your email address to activate your account.</p>
      <p style="margin: 20px 0;">
        <a href="${verificationLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      </p>
      <p>Or click this link: <a href="${verificationLink}">${verificationLink}</a></p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Verify your BlockVote account",
    html,
  });
}
