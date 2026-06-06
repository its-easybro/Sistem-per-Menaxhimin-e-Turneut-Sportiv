// Configures email delivery helpers used for authentication and user notifications.
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetEmail = async (toEmail, resetLink) => {
  await transporter.sendMail({
    from: `"Sports Tournament" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); text-align: left;">
          
          <div style="background-color: #3b82f6; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Sports Tournament</h1>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Reset Your Password</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset the password for your account. Click the button below to choose a new password.
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.3);">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin-top: 0;">
              <a href="${resetLink}" style="color: #3b82f6; word-break: break-all; font-size: 14px;">${resetLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
              This link will expire in 1 hour.<br>
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
        </div>
      </div>
    `,
  });
};
