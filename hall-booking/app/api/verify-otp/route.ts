import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { mobile, otp } = await req.json();

    if (!mobile || !otp) {
      return NextResponse.json({ error: "Mobile and OTP required" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    const { rows } = await db.execute({
      sql: `SELECT id, otp, expires_at, verified
            FROM otp_sessions
            WHERE mobile = ? AND verified = 0
            ORDER BY created_at DESC LIMIT 1`,
      args: [mobile],
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "OTP not found. Request a new one." }, { status: 400 });
    }

    const session = rows[0];

    if (Number(session.expires_at) < now) {
      return NextResponse.json({ error: "OTP has expired. Request a new one." }, { status: 400 });
    }

    if (String(session.otp) !== String(otp)) {
      return NextResponse.json({ error: "Incorrect OTP. Try again." }, { status: 400 });
    }

    // Mark as verified
    await db.execute({
      sql: `UPDATE otp_sessions SET verified = 1 WHERE id = ?`,
      args: [session.id],
    });

    return NextResponse.json({ success: true, mobile });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
