"use client";
import { useState } from "react";

interface Booking {
  id: number;
  booking_ref: string;
  name: string;
  mobile: string;
  email: string;
  purpose: string;
  booking_date: string;
  guests: number;
  total_amount: number;
  status: string;
  txn_ref: string;
  created_at: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const fetchBookings = async () => {
    if (!secret) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", { headers: { "x-admin-secret": secret } });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Unauthorized"); return; }
      setBookings(data.bookings);
      setAuthed(true);
    } catch {
      setError("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    confirmed: "#2e7d32", pending: "#e65100", cancelled: "#c62828",
  };

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:20,fontFamily:"sans-serif"}}>
      <h1 style={{fontSize:22,fontWeight:600,marginBottom:16,color:"#7c3a3a"}}>🏛️ Admin — Bookings Dashboard</h1>

      {!authed && (
        <div style={{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:20,maxWidth:400}}>
          <label style={{display:"block",fontSize:12,color:"#888",marginBottom:4}}>Admin secret key</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchBookings()}
            placeholder="Enter admin secret" style={{width:"100%",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:14,marginBottom:10}} />
          {error && <p style={{color:"#c62828",fontSize:13,marginBottom:8}}>{error}</p>}
          <button onClick={fetchBookings} disabled={loading}
            style={{background:"#7c3a3a",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",width:"100%",cursor:"pointer",fontSize:14}}>
            {loading ? "Loading…" : "View Bookings"}
          </button>
        </div>
      )}

      {authed && (
        <>
          <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            {[
              { lbl: "Total bookings", val: bookings.length },
              { lbl: "Confirmed", val: bookings.filter(b => b.status === "confirmed").length },
              { lbl: "Pending", val: bookings.filter(b => b.status === "pending").length },
              { lbl: "Revenue", val: fmt(bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + b.total_amount, 0)) },
            ].map((m) => (
              <div key={m.lbl} style={{background:"#fff",border:"1px solid #eee",borderRadius:10,padding:"12px 16px",minWidth:130}}>
                <div style={{fontSize:11,color:"#888",marginBottom:4}}>{m.lbl}</div>
                <div style={{fontSize:22,fontWeight:700,color:"#7c3a3a"}}>{m.val}</div>
              </div>
            ))}
          </div>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",borderRadius:10,overflow:"hidden",fontSize:13}}>
              <thead>
                <tr style={{background:"#f9f3f3"}}>
                  {["Ref","Name","Mobile","Function","Date","Guests","Amount","Txn Ref","Status","Booked On"].map((h) => (
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:"#7c3a3a",borderBottom:"1px solid #eee",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={10} style={{padding:24,textAlign:"center",color:"#999"}}>No bookings yet</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id} style={{borderBottom:"1px solid #f5f5f5"}}>
                    <td style={{padding:"8px 12px",fontWeight:600,color:"#7c3a3a"}}>{b.booking_ref}</td>
                    <td style={{padding:"8px 12px"}}>{b.name}</td>
                    <td style={{padding:"8px 12px"}}>{b.mobile}</td>
                    <td style={{padding:"8px 12px"}}>{b.purpose}</td>
                    <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>{b.booking_date}</td>
                    <td style={{padding:"8px 12px"}}>{b.guests}</td>
                    <td style={{padding:"8px 12px",fontWeight:500}}>{fmt(b.total_amount)}</td>
                    <td style={{padding:"8px 12px",fontSize:11}}>{b.txn_ref || "—"}</td>
                    <td style={{padding:"8px 12px"}}>
                      <span style={{background: b.status === "confirmed" ? "#e8f5e9" : b.status === "pending" ? "#fff3e0" : "#ffebee", color: statusColor[b.status] || "#333", borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600}}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{padding:"8px 12px",fontSize:11,color:"#999",whiteSpace:"nowrap"}}>
                      {new Date(b.created_at * 1000).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={fetchBookings} style={{marginTop:12,background:"none",border:"1px solid #ddd",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13}}>
            🔄 Refresh
          </button>
        </>
      )}
    </div>
  );
}
