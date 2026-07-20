import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { sendBookingConfirmationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { bookingRef, txnRef, paymentMethod } = await req.json();

    if (!bookingRef || !txnRef) {
      return NextResponse.json({ error: "Booking ref and transaction ref required" }, { status: 400 });
    }

    // Fetch booking
    const { rows } = await db.execute({
      sql: `SELECT * FROM bookings WHERE booking_ref = ?`,
      args: [bookingRef],
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = rows[0];

    if (String(booking.status) === "confirmed") {
      return NextResponse.json({ error: "Booking already confirmed" }, { status: 409 });
    }

    // Update booking status
    const now = Math.floor(Date.now() / 1000);
    await db.execute({
      sql: `UPDATE bookings SET status = 'confirmed', txn_ref = ?, payment_method = ?, updated_at = ? WHERE booking_ref = ?`,
      args: [txnRef, paymentMethod || "UPI", now, bookingRef],
    });

    // Send email receipt
    try {
      await sendBookingConfirmationEmail({
        bookingRef: String(booking.booking_ref),
        name: String(booking.name),
        email: String(booking.email),
        mobile: String(booking.mobile),
        whatsapp: String(booking.whatsapp),
        purpose: String(booking.purpose),
        bookingDate: String(booking.booking_date),
        guests: Number(booking.guests),
        specialReq: String(booking.special_req || ""),
        hallCharge: Number(booking.hall_charge),
        deposit: Number(booking.deposit),
        totalAmount: Number(booking.total_amount),
        txnRef,
        paymentMethod: paymentMethod || "UPI",
      });
    } catch (mailErr) {
      console.error("Email send failed (non-fatal):", mailErr);
    }

    return NextResponse.json({
      success: true,
      booking: {
        bookingRef: booking.booking_ref,
        name: booking.name,
        mobile: booking.mobile,
        email: booking.email,
        whatsapp: booking.whatsapp,
        purpose: booking.purpose,
        bookingDate: booking.booking_date,
        guests: booking.guests,
        hallCharge: booking.hall_charge,
        deposit: booking.deposit,
        totalAmount: booking.total_amount,
        txnRef,
        paymentMethod: paymentMethod || "UPI",
      },
    });
  } catch (err) {
    console.error("confirm-payment error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
