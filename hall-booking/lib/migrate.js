// Run: node lib/migrate.js
// Make sure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in .env.local

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log("Running migrations...");

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS otp_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile      TEXT NOT NULL,
      otp         TEXT NOT NULL,
      expires_at  INTEGER NOT NULL,
      verified    INTEGER DEFAULT 0,
      created_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref     TEXT NOT NULL UNIQUE,
      name            TEXT NOT NULL,
      mobile          TEXT NOT NULL,
      email           TEXT NOT NULL,
      whatsapp        TEXT NOT NULL,
      address         TEXT NOT NULL,
      purpose         TEXT NOT NULL,
      booking_date    TEXT NOT NULL,
      guests          INTEGER NOT NULL,
      special_req     TEXT DEFAULT '',
      hall_charge     INTEGER NOT NULL,
      deposit         INTEGER NOT NULL DEFAULT 5000,
      total_amount    INTEGER NOT NULL,
      status          TEXT DEFAULT 'pending',
      txn_ref         TEXT DEFAULT '',
      payment_method  TEXT DEFAULT '',
      created_at      INTEGER DEFAULT (unixepoch()),
      updated_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL UNIQUE,
      reason      TEXT DEFAULT '',
      created_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date   ON bookings(booking_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_mobile ON bookings(mobile);
    CREATE INDEX IF NOT EXISTS idx_otp_mobile      ON otp_sessions(mobile);
  `);

  // Seed some blocked dates for demo
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dates = [3, 7, 12, 18, 25].map((d) => {
    const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  });

  for (const date of dates) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO blocked_dates (date, reason) VALUES (?, 'Pre-booked')`,
      args: [date],
    });
  }

  console.log("✅ Migration complete. Blocked dates seeded:", dates);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
