import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM
    const date = searchParams.get("date");   // YYYY-MM-DD (single check)

    if (date) {
      // Single date check
      const { rows: booked } = await db.execute({
        sql: `SELECT id FROM bookings WHERE booking_date = ? AND status != 'cancelled'`,
        args: [date],
      });
      const { rows: blocked } = await db.execute({
        sql: `SELECT id FROM blocked_dates WHERE date = ?`,
        args: [date],
      });
      return NextResponse.json({
        available: booked.length === 0 && blocked.length === 0,
        date,
      });
    }

    if (month) {
      // Return all booked/blocked dates in a month
      const { rows: bookedRows } = await db.execute({
        sql: `SELECT booking_date as date FROM bookings
              WHERE booking_date LIKE ? AND status != 'cancelled'`,
        args: [`${month}%`],
      });
      const { rows: blockedRows } = await db.execute({
        sql: `SELECT date FROM blocked_dates WHERE date LIKE ?`,
        args: [`${month}%`],
      });

      const unavailable = [
        ...bookedRows.map((r) => String(r.date)),
        ...blockedRows.map((r) => String(r.date)),
      ];

      return NextResponse.json({ month, unavailable: [...new Set(unavailable)] });
    }

    return NextResponse.json({ error: "Provide ?month=YYYY-MM or ?date=YYYY-MM-DD" }, { status: 400 });
  } catch (err) {
    console.error("check-availability error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
