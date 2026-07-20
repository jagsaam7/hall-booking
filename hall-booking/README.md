# 🏛️ Sri Mahalakshmi Community Hall — Booking Portal

A full-stack hall booking web application built with **Next.js 15**, **Turso (libSQL)**, and deployed on **Vercel**.

## Features

- 📱 Mobile OTP login (Fast2SMS / MSG91)
- 📅 Live availability calendar backed by Turso DB
- 💍 4 function types: Wedding Muhurtham, Reception, Family Function, Puberty Function
- 💳 UPI QR code payment + transaction reference confirmation
- 📧 Automated email receipt via SMTP (Gmail)
- 📱 WhatsApp receipt sharing
- 🛡️ Admin dashboard at `/admin`

---

## Tech Stack

| Layer      | Tech |
|------------|------|
| Framework  | Next.js 15 (App Router) |
| Database   | Turso (libSQL / SQLite edge) |
| ORM        | `@libsql/client` (raw SQL) |
| Email      | Nodemailer (Gmail SMTP) |
| SMS OTP    | Fast2SMS API |
| Deployment | Vercel |

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/hall-booking.git
cd hall-booking
npm install
```

### 2. Create Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create mahalakshmi-hall

# Get the URL
turso db show mahalakshmi-hall --url

# Create auth token
turso db tokens create mahalakshmi-hall
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and fill in all values
```

Required variables:
```env
TURSO_DATABASE_URL=libsql://mahalakshmi-hall-YOURNAME.turso.io
TURSO_AUTH_TOKEN=eyJ...your-token...

SMS_API_KEY=your-fast2sms-api-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=your-gmail-app-password   # https://myaccount.google.com/apppasswords
EMAIL_FROM=Sri Mahalakshmi Hall <youremail@gmail.com>

ADMIN_SECRET=change-this-to-something-strong
```

### 4. Run database migration

```bash
npm run db:migrate
```

This creates all tables and seeds a few sample booked dates.

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel

# Set environment variables
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add SMS_API_KEY
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add EMAIL_FROM
vercel env add ADMIN_SECRET

# Deploy to production
vercel --prod
```

### Option B: GitHub → Vercel (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**
5. Click **Deploy**

---

## Project Structure

```
hall-booking/
├── app/
│   ├── api/
│   │   ├── send-otp/route.ts       # POST: generate & send OTP via SMS
│   │   ├── verify-otp/route.ts     # POST: verify OTP code
│   │   ├── check-availability/route.ts  # GET: booked dates for calendar
│   │   ├── bookings/route.ts       # POST: create booking | GET: admin list
│   │   └── confirm-payment/route.ts # POST: confirm payment, send email
│   ├── admin/page.tsx              # Admin dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── BookingPortal.tsx           # Full booking UI (client component)
├── lib/
│   ├── db.ts                       # Turso client
│   ├── mailer.ts                   # Email receipts
│   ├── sms.ts                      # SMS OTP
│   ├── pricing.ts                  # Rates & booking ref generation
│   └── migrate.js                  # DB schema + seed script
├── .env.example
├── vercel.json
└── package.json
```

---

## Database Schema

```sql
-- OTP sessions (5 min expiry)
CREATE TABLE otp_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mobile TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  verified INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Bookings
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_ref TEXT NOT NULL UNIQUE,
  name TEXT, mobile TEXT, email TEXT, whatsapp TEXT, address TEXT,
  purpose TEXT, booking_date TEXT, guests INTEGER,
  special_req TEXT, hall_charge INTEGER, deposit INTEGER,
  total_amount INTEGER, status TEXT DEFAULT 'pending',
  txn_ref TEXT, payment_method TEXT,
  created_at INTEGER, updated_at INTEGER
);

-- Admin-blocked dates (holidays, maintenance, etc.)
CREATE TABLE blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at INTEGER
);
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/send-otp` | POST | `{ mobile }` → sends SMS OTP |
| `/api/verify-otp` | POST | `{ mobile, otp }` → verifies OTP |
| `/api/check-availability` | GET | `?month=YYYY-MM` or `?date=YYYY-MM-DD` |
| `/api/bookings` | POST | Create pending booking |
| `/api/bookings` | GET | Admin: list all (requires `x-admin-secret` header) |
| `/api/confirm-payment` | POST | Confirm payment, send email receipt |

---

## Admin Dashboard

Visit `/admin` and enter your `ADMIN_SECRET` to view all bookings, statuses, and revenue.

---

## Pricing

| Function | Hall Charge | + Deposit | Total |
|----------|-------------|-----------|-------|
| Wedding Muhurtham | ₹35,000 | ₹5,000 | ₹40,000 |
| Reception | ₹25,000 | ₹5,000 | ₹30,000 |
| Family Function | ₹18,000 | ₹5,000 | ₹23,000 |
| Puberty Function | ₹15,000 | ₹5,000 | ₹20,000 |

Edit rates in `lib/pricing.ts`.

---

## SMS Provider Setup

### Fast2SMS (recommended for India)
1. Register at [fast2sms.com](https://www.fast2sms.com)
2. Get your API key from the dashboard
3. Add to `SMS_API_KEY` env var

### Gmail SMTP Setup
1. Enable 2-factor authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail"
4. Use that 16-character password as `SMTP_PASS`
