import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { generateBookingRef, getRate, DEPOSIT } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile, name, email, whatsapp, address, purpose, bookingDate, guests, specialReq } = body;

    // Validate required fields
    if (!mobile || !name || !email || !address || !purpose || !bookingDate || !guests) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
    }

    // Verify OTP was completed for this mobile
    const { rows: otpRows } = await db.execute({
      sql: `SELECT id FROM otp_sessions WHERE mobile = ? AND verified = 1 ORDER BY created_at DESC LIMIT 1`,
      args: [mobile],
    });
    if (otpRows.length === 0) {
      return NextResponse.json({ error: "OTP not verified for this mobile" }, { status: 403 });
    }

    // Check date availability
    const { rows: existingBookings } = await db.execute({
      sql: `SELECT id FROM bookings WHERE booking_date = ? AND status != 'cancelled'`,
      args: [bookingDate],
    });
    const { rows: blockedRows } = await db.execute({
      sql: `SELECT id FROM blocked_dates WHERE date = ?`,
      args: [bookingDate],
    });
    if (existingBookings.length > 0 || blockedRows.length > 0) {
      return NextResponse.json({ error: "Selected date is not available" }, { status: 409 });
    }

    const hallCharge = getRate(purpose);
    const totalAmount = hallCharge + DEPOSIT;
    const bookingRef = generateBookingRef();

    await db.execute({
      sql: `INSERT INTO bookings
            (booking_ref, name, mobile, email, whatsapp, address, purpose,
             booking_date, guests, special_req, hall_charge, deposit, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      args: [
        bookingRef, name, mobile, email, whatsapp || mobile,
        address, purpose, bookingDate, Number(guests),
        specialReq || "", hallCharge, DEPOSIT, totalAmount,
      ],
    });

    return NextResponse.json({ success: true, bookingRef, hallCharge, deposit: DEPOSIT, totalAmount });
  } catch (err) {
    console.error("create-booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Admin: list bookings
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await db.execute(
    `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100`
  );
  return NextResponse.json({ bookings: rows });
}
