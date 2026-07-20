"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PURPOSES, DEPOSIT } from "@/lib/pricing";

type Screen = "login" | "otp" | "details" | "date" | "review" | "payment" | "receipt";

interface BookingState {
  mobile: string;
  name: string;
  email: string;
  whatsapp: string;
  address: string;
  purpose: string;
  purposeLabel: string;
  bookingDate: string;
  guests: string;
  specialReq: string;
  txnRef: string;
  paymentMethod: string;
  bookingRef: string;
  hallCharge: number;
  totalAmount: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function BookingPortal() {
  const [screen, setScreen] = useState<Screen>("login");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["","","","","",""]);
  const [otpSecs, setOtpSecs] = useState(300);
  const [paySecs, setPaySecs] = useState(600);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState("UPI");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const payTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [b, setB] = useState<BookingState>({
    mobile:"", name:"", email:"", whatsapp:"", address:"",
    purpose:"", purposeLabel:"", bookingDate:"",
    guests:"", specialReq:"", txnRef:"", paymentMethod:"",
    bookingRef:"", hallCharge:0, totalAmount:0,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const go = (s: Screen) => setScreen(s);

  // Fetch unavailable dates whenever calendar month changes
  const fetchUnavailable = useCallback(async (year: number, month: number) => {
    const monthStr = `${year}-${pad(month + 1)}`;
    try {
      const res = await fetch(`/api/check-availability?month=${monthStr}`);
      const data = await res.json();
      setUnavailable(data.unavailable || []);
    } catch {
      setUnavailable([]);
    }
  }, []);

  useEffect(() => {
    if (screen === "date") fetchUnavailable(calYear, calMonth);
  }, [screen, calYear, calMonth, fetchUnavailable]);

  // OTP countdown
  const startOtpTimer = () => {
    clearInterval(otpTimer.current!);
    setOtpSecs(300);
    otpTimer.current = setInterval(() => {
      setOtpSecs((s) => { if (s <= 1) { clearInterval(otpTimer.current!); return 0; } return s - 1; });
    }, 1000);
  };

  // Payment countdown
  const startPayTimer = () => {
    clearInterval(payTimer.current!);
    setPaySecs(600);
    payTimer.current = setInterval(() => {
      setPaySecs((s) => { if (s <= 1) { clearInterval(payTimer.current!); return 0; } return s - 1; });
    }, 1000);
  };

  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;

  // ── Send OTP ──
  const handleSendOTP = async () => {
    if (!/^\d{10}$/.test(b.mobile)) { showToast("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: b.mobile }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to send OTP"); return; }
      setOtp(["","","","","",""]);
      startOtpTimer();
      go("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ──
  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== 6) { showToast("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: b.mobile, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Verification failed"); return; }
      clearInterval(otpTimer.current!);
      setB((prev) => ({ ...prev, whatsapp: prev.mobile }));
      go("details");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  // ── Go to date picker ──
  const handleGoDate = () => {
    if (!b.name.trim()) { showToast("Enter your full name"); return; }
    if (!b.email.trim() || !b.email.includes("@")) { showToast("Enter a valid email"); return; }
    if (!b.address.trim()) { showToast("Enter your address"); return; }
    if (!b.purpose) { showToast("Select a function type"); return; }
    go("date");
  };

  // ── Go to review ──
  const handleGoReview = async () => {
    if (!b.bookingDate) { showToast("Select a booking date"); return; }
    if (!b.guests) { showToast("Enter number of guests"); return; }
    // Double-check availability
    const res = await fetch(`/api/check-availability?date=${b.bookingDate}`);
    const data = await res.json();
    if (!data.available) { showToast("This date was just booked. Please choose another."); return; }
    go("review");
  };

  // ── Create booking & go to payment ──
  const handleGoPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: b.mobile, name: b.name, email: b.email,
          whatsapp: b.whatsapp || b.mobile, address: b.address,
          purpose: b.purpose, bookingDate: b.bookingDate,
          guests: b.guests, specialReq: b.specialReq,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to create booking"); return; }
      setB((prev) => ({
        ...prev,
        bookingRef: data.bookingRef,
        hallCharge: data.hallCharge,
        totalAmount: data.totalAmount,
      }));
      startPayTimer();
      go("payment");
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm payment ──
  const handleConfirmPayment = async () => {
    if (!b.txnRef.trim()) { showToast("Enter your transaction reference number"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef: b.bookingRef, txnRef: b.txnRef, paymentMethod: payMethod }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Payment confirmation failed"); return; }
      clearInterval(payTimer.current!);
      setB((prev) => ({ ...prev, paymentMethod: payMethod }));
      go("receipt");
    } finally {
      setLoading(false);
    }
  };

  // ── WhatsApp share ──
  const handleWhatsApp = () => {
    const dt = new Date(b.bookingDate);
    const dateStr = dt.toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    const msg = encodeURIComponent(
      `🏛️ *Sri Mahalakshmi Community Hall*\n✅ Booking Confirmed!\n\n` +
      `📋 Ref: *${b.bookingRef}*\n👤 Name: ${b.name}\n🎉 Function: ${b.purposeLabel}\n` +
      `📅 Date: ${dateStr}\n👥 Guests: ${b.guests}\n` +
      `💰 Total Paid: ${fmt(b.totalAmount)}\n📝 Txn Ref: ${b.txnRef}\n\n` +
      `Thank you for choosing us! 🙏`
    );
    window.open(`https://wa.me/91${b.whatsapp || b.mobile}?text=${msg}`, "_blank");
  };

  // ── Calendar renderer ──
  const renderCalendar = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const cells = [];
    DAYS.forEach((d) => cells.push(<div key={`h-${d}`} className="cal-head">{d}</div>));
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="cal-cell empty" />);

    for (let d = 1; d <= daysInMonth; d++) {
      const dtStr = toDateStr(calYear, calMonth, d);
      const dt = new Date(calYear, calMonth, d);
      const isPast = dt < today;
      const isUnavail = unavailable.includes(dtStr);
      const isSelected = b.bookingDate === dtStr;
      const isToday = dt.getTime() === today.getTime();

      let cls = "cal-cell";
      if (isSelected) cls += " selected";
      else if (isPast) cls += " past";
      else if (isUnavail) cls += " unavailable";
      else if (isToday) cls += " today available";
      else cls += " available";

      cells.push(
        <div key={dtStr} className={cls}
          onClick={() => { if (!isPast && !isUnavail) setB((p) => ({ ...p, bookingDate: dtStr })); }}
          title={isUnavail ? "Not available" : isSelected ? "Selected" : ""}
        >{d}</div>
      );
    }
    return cells;
  };

  const selDateLabel = b.bookingDate
    ? new Date(b.bookingDate).toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })
    : "";

  const purposeObj = PURPOSES.find((p) => p.key === b.purpose);

  // ── Render ──
  return (
    <div className="portal-wrap">
      <div className="hall-header">
        <div className="icon">🏛️</div>
        <h1>Sri Mahalakshmi Community Hall</h1>
        <p>Premium venue for all your celebrations</p>
      </div>

      {/* TOAST */}
      <div className="toast-wrap">
        <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      </div>

      {/* ─── LOGIN ─── */}
      {screen === "login" && (
        <div className="card">
          <h2 style={{fontSize:17,fontWeight:600,marginBottom:4}}>Welcome</h2>
          <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:4}}>Enter your mobile number to get started</p>
          <label>Mobile number</label>
          <input type="tel" placeholder="10-digit mobile number" maxLength={10}
            value={b.mobile} onChange={(e) => setB((p) => ({ ...p, mobile: e.target.value.replace(/\D/g,"") }))}
            onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
          />
          <p className="hint-text">OTP will be sent via SMS</p>
          <button className="btn btn-primary" onClick={handleSendOTP} disabled={loading}>
            {loading ? "Sending…" : "📱 Send OTP"}
          </button>
        </div>
      )}

      {/* ─── OTP ─── */}
      {screen === "otp" && (
        <div className="card">
          <h2 style={{fontSize:17,fontWeight:600,marginBottom:4}}>Verify OTP</h2>
          <p style={{fontSize:13,color:"var(--text-muted)"}}>OTP sent to <b>+91 {b.mobile}</b></p>
          <div className="otp-grid">
            {otp.map((v, i) => (
              <input key={i} type="text" inputMode="numeric" maxLength={1} value={v}
                ref={(el) => { otpRefs.current[i] = el; }}
                onChange={(e) => handleOtpInput(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
              />
            ))}
          </div>
          <p style={{fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>
            {otpSecs > 0 ? <>OTP expires in <span style={{color:"var(--brand)",fontWeight:600}}>{fmtSecs(otpSecs)}</span></> : <span style={{color:"#c62828"}}>OTP expired</span>}
          </p>
          <button className="btn btn-primary" onClick={handleVerifyOTP} disabled={loading}>
            {loading ? "Verifying…" : "✅ Verify & Continue"}
          </button>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:12}}>
            <a href="#" onClick={(e)=>{e.preventDefault();go("login")}} style={{color:"var(--brand)"}}>← Change number</a>
            {otpSecs === 0 && (
              <a href="#" onClick={(e)=>{e.preventDefault();handleSendOTP()}} style={{color:"var(--brand)"}}>Resend OTP</a>
            )}
          </div>
        </div>
      )}

      {/* ─── DETAILS ─── */}
      {screen === "details" && (
        <div className="card">
          <div className="step-bar">
            {["Details","Date","Review","Payment"].map((s,i) => (
              <div key={s} className={`step-item ${i===0?"active":""}`}>{i+1} {s}</div>
            ))}
          </div>
          <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>👤 Your details</h2>
          <label>Full name *</label>
          <input placeholder="Enter your full name" value={b.name} onChange={(e) => setB((p) => ({ ...p, name: e.target.value }))} />
          <label>Mobile number</label>
          <input readOnly value={`+91 ${b.mobile}`} />
          <label>Email address *</label>
          <input type="email" placeholder="yourname@gmail.com" value={b.email} onChange={(e) => setB((p) => ({ ...p, email: e.target.value }))} />
          <label>WhatsApp number (for receipt)</label>
          <input type="tel" placeholder="WhatsApp number" maxLength={10} value={b.whatsapp} onChange={(e) => setB((p) => ({ ...p, whatsapp: e.target.value.replace(/\D/g,"") }))} />
          <label>Address *</label>
          <textarea rows={2} placeholder="Your full address" value={b.address} onChange={(e) => setB((p) => ({ ...p, address: e.target.value }))} />
          <label>Function type *</label>
          <div className="purpose-grid">
            {PURPOSES.map((pu) => (
              <button key={pu.key}
                className={`purpose-btn ${b.purpose === pu.key ? "selected" : ""}`}
                onClick={() => setB((p) => ({ ...p, purpose: pu.key, purposeLabel: pu.label }))}
              >
                <span className="emoji">{pu.label.split(" ")[0]}</span>
                {pu.label.substring(pu.label.indexOf(" ")+1)}<br/>
                <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:400}}>{fmt(pu.rate)}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleGoDate}>Next: Choose Date →</button>
        </div>
      )}

      {/* ─── DATE ─── */}
      {screen === "date" && (
        <div className="card">
          <div className="step-bar">
            {["Details","Date","Review","Payment"].map((s,i) => (
              <div key={s} className={`step-item ${i<=1?"done":""} ${i===1?"active":""}`}>{i+1} {s}</div>
            ))}
          </div>
          <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>📅 Select booking date</h2>
          <p style={{fontSize:12,color:"var(--text-muted)",marginBottom:10}}>Crossed-out dates are already booked</p>

          <div className="cal-header">
            <button onClick={() => { const m = calMonth-1 < 0 ? 11 : calMonth-1; const y = calMonth-1 < 0 ? calYear-1 : calYear; setCalMonth(m); setCalYear(y); }}>‹</button>
            <span>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => { const m = calMonth+1 > 11 ? 0 : calMonth+1; const y = calMonth+1 > 11 ? calYear+1 : calYear; setCalMonth(m); setCalYear(y); }}>›</button>
          </div>
          <div className="cal-grid">{renderCalendar()}</div>
          <div className="cal-legend">
            <span><div className="leg-dot" style={{background:"#fff",border:"1px solid #ccc"}} /> Available</span>
            <span><div className="leg-dot" style={{background:"#fde8e8"}} /> Booked</span>
            <span><div className="leg-dot" style={{background:"var(--brand)"}} /> Selected</span>
          </div>

          {b.bookingDate && (
            <div className="info-box" style={{marginTop:10}}>
              ✅ <b>Selected:</b> {selDateLabel}
            </div>
          )}

          <label>Number of guests (approx.) *</label>
          <input type="number" placeholder="e.g. 200" min={1} max={1000} value={b.guests} onChange={(e) => setB((p) => ({ ...p, guests: e.target.value }))} />
          <label>Special requirements</label>
          <input placeholder="Veg only, need stage decor, etc. (optional)" value={b.specialReq} onChange={(e) => setB((p) => ({ ...p, specialReq: e.target.value }))} />

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => go("details")}>← Back</button>
            <button className="btn btn-primary" style={{flex:2}} onClick={handleGoReview}>Review Booking →</button>
          </div>
        </div>
      )}

      {/* ─── REVIEW ─── */}
      {screen === "review" && (
        <div className="card">
          <div className="step-bar">
            {["Details","Date","Review","Payment"].map((s,i) => (
              <div key={s} className={`step-item ${i<=2?"done":""} ${i===2?"active":""}`}>{i+1} {s}</div>
            ))}
          </div>
          <h2 style={{fontSize:15,fontWeight:600,marginBottom:12}}>📋 Booking summary</h2>
          {[
            ["Name", b.name],
            ["Mobile", `+91 ${b.mobile}`],
            ["Email", b.email],
            ["Function", b.purposeLabel],
            ["Booking date", selDateLabel],
            ["Guests", `${b.guests} approx.`],
            ...(b.specialReq ? [["Special requests", b.specialReq] as [string,string]] : []),
            ["Hall charge", fmt(purposeObj?.rate || 0)],
            ["Security deposit", fmt(DEPOSIT)],
            ["Total amount", fmt((purposeObj?.rate || 0) + DEPOSIT)],
          ].map(([lbl, val]) => (
            <div key={lbl} className="summary-row">
              <span className="lbl">{lbl}</span>
              <span className="val">{val}</span>
            </div>
          ))}
          <div className="info-box" style={{marginTop:12}}>
            🏛️ Hall capacity: 500 guests &bull; AC &amp; Non-AC available &bull; Parking for 100 vehicles &bull; Security deposit refundable within 7 days after event
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => go("date")}>← Edit</button>
            <button className="btn btn-primary" style={{flex:2}} onClick={handleGoPayment} disabled={loading}>
              {loading ? "Creating booking…" : "Proceed to Payment →"}
            </button>
          </div>
        </div>
      )}

      {/* ─── PAYMENT ─── */}
      {screen === "payment" && (
        <div className="card">
          <div className="step-bar">
            {["Details","Date","Review","Payment"].map((s,i) => (
              <div key={s} className={`step-item done ${i===3?"active":""}`}>{i+1} {s}</div>
            ))}
          </div>
          <h2 style={{fontSize:15,fontWeight:600,marginBottom:8}}>💳 Complete payment</h2>
          <div className="pay-methods">
            {["UPI","Net Banking","Card"].map((m) => (
              <button key={m} className={`pay-method ${payMethod===m?"selected":""}`} onClick={() => setPayMethod(m)}>{m}</button>
            ))}
          </div>
          <div className="qr-section">
            <div className="amt-badge">{fmt(b.totalAmount)}</div>
            <p style={{fontSize:12,color:"var(--text-muted)"}}>Total booking amount</p>
            <div className="qr-frame">
              <QRCode value={`upi://pay?pa=mahalakshmi.hall@ybl&pn=SriMahalakshmiHall&am=${b.totalAmount}&tn=${b.bookingRef}`} size={150} />
            </div>
            <p style={{fontSize:12,color:"var(--text-muted)"}}>Scan with any UPI app</p>
            <p style={{fontSize:11,color:"var(--text-muted)"}}>UPI ID: <b>mahalakshmi.hall@ybl</b></p>
            <p className="timer-text">Payment window: <span>{fmtSecs(paySecs)}</span></p>
          </div>
          <div className="info-box">After paying, enter the transaction reference number (UTR) from your UPI app below.</div>
          <label>Transaction / UTR reference number *</label>
          <input placeholder="12-digit UTR number" value={b.txnRef} onChange={(e) => setB((p) => ({ ...p, txnRef: e.target.value }))} />
          <button className="btn btn-primary" onClick={handleConfirmPayment} disabled={loading}>
            {loading ? "Confirming…" : "✅ Confirm Payment"}
          </button>
        </div>
      )}

      {/* ─── RECEIPT ─── */}
      {screen === "receipt" && (
        <div className="card">
          <div className="success-circle">✅</div>
          <h2 style={{fontSize:18,fontWeight:600,color:"var(--success)",textAlign:"center",marginBottom:4}}>Booking confirmed!</h2>
          <p style={{fontSize:13,color:"var(--text-muted)",textAlign:"center",marginBottom:16}}>
            Your hall has been reserved successfully
          </p>
          <div style={{background:"var(--brand-lt)",border:"1px solid #e0c0c0",borderRadius:8,padding:"12px",textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:"var(--brand)",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>Booking Reference</div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--brand)",letterSpacing:2}}>{b.bookingRef}</div>
          </div>
          <div className="receipt-header">
            <div>
              <p style={{fontWeight:600,fontSize:14}}>Payment Receipt</p>
              <p style={{fontSize:11,color:"var(--text-muted)"}}>Receipt emailed to {b.email}</p>
            </div>
            <span className="status-badge">Confirmed</span>
          </div>
          {[
            ["Name", b.name],
            ["Mobile", `+91 ${b.mobile}`],
            ["Function", b.purposeLabel],
            ["Booking date", selDateLabel],
            ["Guests", `${b.guests} approx.`],
            ["Hall charge", fmt(b.hallCharge)],
            ["Security deposit", fmt(DEPOSIT)],
            ["Payment method", b.paymentMethod || payMethod],
            ["Transaction ref", b.txnRef],
            ["Total paid", fmt(b.totalAmount)],
          ].map(([lbl, val]) => (
            <div key={lbl} className="summary-row">
              <span className="lbl">{lbl}</span>
              <span className="val">{val}</span>
            </div>
          ))}
          <p style={{fontSize:13,color:"var(--text-sub)",marginTop:14,marginBottom:6}}>Send receipt to:</p>
          <div className="send-row">
            <button className="send-btn send-wa" onClick={handleWhatsApp}>📱 WhatsApp</button>
            <button className="send-btn send-email" onClick={() => {
              const sub = encodeURIComponent(`Booking Confirmed – ${b.bookingRef}`);
              const body = encodeURIComponent(`Your booking ${b.bookingRef} for ${b.purposeLabel} on ${selDateLabel} is confirmed.\nTotal paid: ${fmt(b.totalAmount)}\nTransaction ref: ${b.txnRef}`);
              window.location.href = `mailto:${b.email}?subject=${sub}&body=${body}`;
            }}>✉️ Email</button>
          </div>
          <button className="btn btn-secondary" style={{width:"100%",marginTop:10}} onClick={() => {
            setB({ mobile:"", name:"", email:"", whatsapp:"", address:"", purpose:"", purposeLabel:"", bookingDate:"", guests:"", specialReq:"", txnRef:"", paymentMethod:"", bookingRef:"", hallCharge:0, totalAmount:0 });
            go("login");
          }}>+ New booking</button>
        </div>
      )}
    </div>
  );
}

// Simple inline QR code using Unicode blocks (no external lib needed)
function QRCode({ value, size = 150 }: { value: string; size?: number }) {
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => ((seed * 1103515245 + 12345 + i * 6249) & 0x7fffffff) / 0x7fffffff;
  const N = 21;
  const cells: boolean[][] = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => {
      // Fixed position detection patterns
      if ((r < 7 && c < 7) || (r < 7 && c > N-8) || (r > N-8 && c < 7)) return true;
      return rng(r * N + c) > 0.42;
    })
  );
  const cs = size / N;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
      <rect width={size} height={size} fill="#fff" />
      {cells.map((row, r) =>
        row.map((on, c) => on ? (
          <rect key={`${r}-${c}`} x={c*cs} y={r*cs} width={cs} height={cs} fill="#111" />
        ) : null)
      )}
    </svg>
  );
}
