import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    // Generate mock token and reset URL
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // ALWAYS log the reset URL to server terminal for local testing
    console.log("==========================================");
    console.log("PASSWORD RESET LINK FOR:", email);
    console.log(resetUrl);
    console.log("==========================================");

    let emailSent = false;
    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "AuraSync Security <onboarding@resend.dev>",
          to: [email],
          subject: "AuraSync - Password Reset Request",
          html: `
            <div style="background-color: #020617; color: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 16px; border: 1px solid #1e293b; max-w: 500px; margin: 0 auto;">
              <div style="display: flex; align-items: center; margin-bottom: 24px;">
                <h2 style="color: #38bdf8; margin: 0; font-size: 20px; letter-spacing: 0.1em;">AURASYNC SECURITY</h2>
              </div>
              <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 12px; color: #f8fafc;">Reset Your Password</h1>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset the password for your AuraSync account (<strong style="color: #e2e8f0;">${email}</strong>).
              </p>
              <div style="margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #ffffff; color: #020617; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; pt: 16px; margin-top: 24px;">
                This link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.warn("Resend API email dispatch failed, falling back to terminal logs:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      email,
      resetUrl,
      mode: emailSent ? "email_sent" : "dev_terminal",
      notice: emailSent
        ? "Password reset email dispatched via Resend."
        : "Development mode: Reset link printed to server terminal.",
    });
  } catch (error) {
    console.error("Forgot password endpoint error:", error);
    return NextResponse.json(
      { error: "Unable to process password reset request. Please try again." },
      { status: 500 }
    );
  }
}
