import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface BookingDetails {
  bookingRef: string;
  name: string;
  email: string;
  mobile: string;
  whatsapp: string;
  purpose: string;
  bookingDate: string;
  guests: number;
  specialReq: string;
  hallCharge: number;
  deposit: number;
  totalAmount: number;
  txnRef: string;
  paymentMethod: string;
}

export async function sendBookingConfirmationEmail(booking: BookingDetails) {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #7c3a3a, #b85c38); padding: 32px 24px; text-align: center; color: #fff; }
  .header h1 { margin: 0 0 4px; font-size: 22px; }
  .header p { margin: 0; opacity: 0.85; font-size: 13px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 16px; font-size: 13px; margin-top: 12px; }
  .body { padding: 24px; }
  .success-icon { text-align: center; font-size: 48px; margin-bottom: 16px; }
  .title { text-align: center; font-size: 20px; font-weight: 600; color: #2e7d32; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 13px; color: #666; margin-bottom: 24px; }
  .ref-box { background: #fdf3e7; border: 1px solid #e6c88a; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 20px; }
  .ref-box .label { font-size: 11px; color: #6d4c1a; text-transform: uppercase; letter-spacing: 1px; }
  .ref-box .ref { font-size: 20px; font-weight: 700; color: #7c3a3a; letter-spacing: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  tr td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; font-weight: 700; font-size: 15px; color: #7c3a3a; }
  .label-col { color: #888; width: 45%; }
  .footer { background: #f9f9f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  .contact { color: #7c3a3a; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🏛️ Sri Mahalakshmi Community Hall</h1>
    <p>Premium venue for all your celebrations</p>
    <div class="badge">✅ Booking Confirmed</div>
  </div>
  <div class="body">
    <div class="success-icon">🎉</div>
    <div class="title">Your booking is confirmed!</div>
    <div class="subtitle">Thank you, ${booking.name}. We look forward to hosting your ${booking.purpose}.</div>
    <div class="ref-box">
      <div class="label">Booking Reference</div>
      <div class="ref">${booking.bookingRef}</div>
    </div>
    <table>
      <tr><td class="label-col">Guest name</td><td>${booking.name}</td></tr>
      <tr><td class="label-col">Mobile</td><td>+91 ${booking.mobile}</td></tr>
      <tr><td class="label-col">Function type</td><td>${booking.purpose}</td></tr>
      <tr><td class="label-col">Booking date</td><td>${new Date(booking.bookingDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>
      <tr><td class="label-col">Number of guests</td><td>${booking.guests} approx.</td></tr>
      ${booking.specialReq ? `<tr><td class="label-col">Special requests</td><td>${booking.specialReq}</td></tr>` : ""}
      <tr><td class="label-col">Hall charge</td><td>${fmt(booking.hallCharge)}</td></tr>
      <tr><td class="label-col">Security deposit</td><td>${fmt(booking.deposit)}</td></tr>
      <tr><td class="label-col">Payment method</td><td>${booking.paymentMethod}</td></tr>
      <tr><td class="label-col">Transaction ref</td><td>${booking.txnRef}</td></tr>
      <tr><td class="label-col">Total paid</td><td>${fmt(booking.totalAmount)}</td></tr>
    </table>
  </div>
  <div class="footer">
    Sri Mahalakshmi Community Hall &bull; 📞 +91 98765 43210 &bull;
    <a href="mailto:info@mahalakshmihall.in" class="contact">info@mahalakshmihall.in</a>
    <br><br>
    Please carry this confirmation email on the day of your function.
    <br>Security deposit is refundable within 7 days after the event.
  </div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Sri Mahalakshmi Hall <noreply@example.com>",
    to: booking.email,
    subject: `Booking Confirmed – ${booking.bookingRef} | Sri Mahalakshmi Community Hall`,
    html,
  });
}
