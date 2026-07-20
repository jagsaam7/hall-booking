import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { sendOTPSms } from "@/lib/sms";

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { mobile } = await req.json();

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

    // Rate limit: max 3 OTPs per mobile per 10 minutes
    const cutoff = Math.floor(Date.now() / 1000) - 600;
    const { rows } = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM otp_sessions WHERE mobile = ? AND created_at > ?`,
      args: [mobile, cutoff],
    });
    if (Number(rows[0].cnt) >= 3) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait 10 minutes." },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const expiresAt = Math.floor(Date.now() / 1000) + Number(process.env.OTP_EXPIRY_SECONDS || 300);

    await db.execute({
      sql: `INSERT INTO otp_sessions (mobile, otp, expires_at) VALUES (?, ?, ?)`,
      args: [mobile, otp, expiresAt],
    });

    const sent = await sendOTPSms(mobile, otp);
    if (!sent) {
      return NextResponse.json({ error: "Failed to send OTP. Try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, expiresAt });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
