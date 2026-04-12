import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://127.0.0.1:8000";

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hearingDate = new Date(dateStr);
  hearingDate.setHours(0, 0, 0, 0);
  return Math.ceil((hearingDate - today) / (1000 * 60 * 60 * 24));
}

function getUrgency(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days < 0)   return { label: "Past",         color: "#94a3b8", bg: "#f1f5f9", border: "#cbd5e1" };
  if (days === 0) return { label: "TODAY",         color: "#fff",    bg: "#ef4444", border: "#ef4444" };
  if (days === 1) return { label: "TOMORROW",      color: "#fff",    bg: "#f97316", border: "#f97316" };
  if (days <= 10) return { label: `${days}d left`, color: "#92400e", bg: "#fef3c7", border: "#f59e0b" };
  return           { label: `${days}d left`,       color: "#065f46", bg: "#d1fae5", border: "#10b981" };
}

function getCardAccent(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days < 0)  return "#94a3b8";
  if (days <= 1) return "#ef4444";
  if (days <= 10) return "#f59e0b";
  return "#10b981";
}

const COUNTY_COLORS = [
  "#6366f1","#ec4899","#14b8a6","#f97316","#8b5cf6",
  "#06b6d4","#84cc16","#f43f5e","#3b82f6","#a855f7"
];
const countyColorMap = {};
function getCountyColor(county) {
  if (!countyColorMap[county]) {
    const keys = Object.keys(countyColorMap);
    countyColorMap[county] = COUNTY_COLORS[keys.length % COUNTY_COLORS.length];
  }
  return countyColorMap[county];
}

function ReminderPopup({ hearings, onClose }) {
  const urgent   = hearings.filter(h => { const d=getDaysUntil(h.hearing_date); return d>=0&&d<=1; });
  const upcoming = hearings.filter(h => { const d=getDaysUntil(h.hearing_date); return d>1&&d<=10; });
  if (urgent.length === 0 && upcoming.length === 0) return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:"2rem",maxWidth:400,width:"90%",textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:12 }}>🎉</div>
        <p style={{ fontWeight:700,fontSize:18,color:"#1e293b",margin:"0 0 8px" }}>No urgent hearings!</p>
        <p style={{ color:"#64748b",fontSize:14,margin:"0 0 20px" }}>All hearings are scheduled well ahead.</p>
        <button onClick={onClose} style={{ background:"#6366f1",color:"#fff",border:"none",borderRadius:10,padding:"10px 32px",cursor:"pointer",fontWeight:600,fontSize:14 }}>Great!</button>
      </div>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:"1.75rem",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#f97316,#ef4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>⏰</div>
            <div>
              <p style={{ margin:0,fontWeight:700,fontSize:17,color:"#1e293b" }}>Hearing Reminders</p>
              <p style={{ margin:0,fontSize:12,color:"#94a3b8" }}>{urgent.length+upcoming.length} upcoming alerts</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9",border:"none",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:18,color:"#64748b" }}>×</button>
        </div>
        {urgent.length > 0 && (
          <div style={{ background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:14,padding:"1rem",marginBottom:12 }}>
            <p style={{ color:"#ef4444",fontWeight:700,margin:"0 0 10px",fontSize:13 }}>🔴 URGENT — Today / Tomorrow</p>
            {urgent.map(h => (
              <div key={h.case_id} style={{ background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:6,border:"1px solid #fecaca" }}>
                <p style={{ margin:0,fontWeight:600,fontSize:13,color:"#1e293b" }}>{h.case_id}</p>
                <p style={{ margin:"3px 0 0",fontSize:12,color:"#64748b" }}>{h.county} · {h.hearing_date}</p>
              </div>
            ))}
          </div>
        )}
        {upcoming.length > 0 && (
          <div style={{ background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:"1rem" }}>
            <p style={{ color:"#f59e0b",fontWeight:700,margin:"0 0 10px",fontSize:13 }}>🟠 UPCOMING — Within 10 Days</p>
            {upcoming.map(h => (
              <div key={h.case_id} style={{ background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:6,border:"1px solid #fde68a" }}>
                <p style={{ margin:0,fontWeight:600,fontSize:13,color:"#1e293b" }}>{h.case_id}</p>
                <p style={{ margin:"3px 0 0",fontSize:12,color:"#64748b" }}>{h.county} · {h.hearing_date} · {getDaysUntil(h.hearing_date)} days left</p>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop:16,width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontSize:14,fontWeight:600,cursor:"pointer" }}>
          Got it!
        </button>
      </div>
    </div>
  );
}

function DetailModal({ hearing, onClose }) {
  if (!hearing) return null;
  const urgency = getUrgency(hearing.hearing_date);
  const accent  = getCardAccent(hearing.hearing_date);
  const rows = [
    ["📋 Case ID",   hearing.case_id],
    ["📅 Date",      hearing.hearing_date],
    ["📍 County",    hearing.county],
    ["🔖 Status",    hearing.status],
    ["👤 Plaintiff", hearing.plaintiff],
    ["👤 Defendant", hearing.defendant],
    ["⚖️ Judge",     hearing.judge || "—"],
    ["🏛️ Courtroom", hearing.courtroom || "—"],
    ["📝 Notes",     hearing.notes || "—"],
  ];
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ height:6,background:`linear-gradient(90deg,${accent},${accent}66)`,borderRadius:"20px 20px 0 0" }} />
        <div style={{ padding:"1.5rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <p style={{ margin:0,fontWeight:700,fontSize:18,color:"#1e293b" }}>Hearing Details</p>
            <button onClick={onClose} style={{ background:"#f1f5f9",border:"none",width:34,height:34,borderRadius:10,cursor:"pointer",fontSize:18,color:"#64748b" }}>×</button>
          </div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:urgency.bg,border:`1.5px solid ${urgency.border}`,borderRadius:10,padding:"8px 16px",marginBottom:20 }}>
            <span style={{ width:8,height:8,borderRadius:"50%",background:urgency.border,display:"inline-block" }}></span>
            <span style={{ color:urgency.color==="#fff"?urgency.border:urgency.color,fontWeight:700,fontSize:13 }}>{urgency.label}</span>
          </div>
          {rows.map(([label, val]) => (
            <div key={label} style={{ display:"flex",padding:"11px 0",borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ width:130,fontSize:13,color:"#94a3b8",flexShrink:0 }}>{label}</span>
              <span style={{ fontSize:13,color:"#1e293b",fontWeight:500 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HearingCard({ h, onClick }) {
  const urgency     = getUrgency(h.hearing_date);
  const accent      = getCardAccent(h.hearing_date);
  const countyColor = getCountyColor(h.county);
  return (
    <div
      onClick={() => onClick(h)}
      style={{ background:"#fff",borderRadius:16,border:`1.5px solid ${accent}40`,cursor:"pointer",overflow:"hidden",transition:"all 0.2s",boxShadow:`0 4px 20px ${accent}18` }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 32px ${accent}35`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=`0 4px 20px ${accent}18`; }}
    >
      <div style={{ height:5,background:`linear-gradient(90deg,${accent},${accent}66)` }} />
      <div style={{ padding:"1rem 1.1rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
          <span style={{ fontWeight:700,fontSize:15,color:"#1e293b" }}>{h.case_id}</span>
          <span style={{ fontSize:11,fontWeight:700,color:urgency.color==="#fff"?urgency.border:urgency.color,background:urgency.bg,border:`1px solid ${urgency.border}`,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap" }}>{urgency.label}</span>
        </div>
        <div style={{ marginBottom:10 }}>
          <span style={{ fontSize:11,fontWeight:600,color:"#fff",background:countyColor,padding:"3px 10px",borderRadius:20 }}>📍 {h.county}</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8,fontSize:13,color:"#475569" }}>
          <span>📅</span> {h.hearing_date}
        </div>
        <div style={{ background:"#f8fafc",borderRadius:10,padding:"10px 12px",marginBottom:8 }}>
          <div style={{ fontSize:12,color:"#94a3b8",marginBottom:3 }}>Plaintiff</div>
          <div style={{ fontSize:13,fontWeight:500,color:"#1e293b",marginBottom:6 }}>{h.plaintiff}</div>
          <div style={{ fontSize:12,color:"#94a3b8",marginBottom:3 }}>Defendant</div>
          <div style={{ fontSize:13,fontWeight:500,color:"#1e293b" }}>{h.defendant}</div>
        </div>
        <div style={{ fontSize:12,color:"#94a3b8" }}>Status: <strong style={{ color:"#475569" }}>{h.status}</strong></div>
      </div>
    </div>
  );
}

function StatsBar({ hearings }) {
  const urgent    = hearings.filter(h=>{ const d=getDaysUntil(h.hearing_date); return d>=0&&d<=1; }).length;
  const upcoming  = hearings.filter(h=>{ const d=getDaysUntil(h.hearing_date); return d>1&&d<=10; }).length;
  const scheduled = hearings.filter(h=>getDaysUntil(h.hearing_date)>10).length;
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:"1.5rem" }}>
      {[
        { label:"Urgent",    count:urgent,    color:"#ef4444", bg:"#fef2f2", icon:"🔴" },
        { label:"Upcoming",  count:upcoming,  color:"#f59e0b", bg:"#fffbeb", icon:"🟠" },
        { label:"Scheduled", count:scheduled, color:"#10b981", bg:"#f0fdf4", icon:"🟢" },
      ].map(s=>(
        <div key={s.label} style={{ background:s.bg,borderRadius:14,padding:"1rem",border:`1.5px solid ${s.color}30`,textAlign:"center" }}>
          <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
          <div style={{ fontSize:26,fontWeight:800,color:s.color }}>{s.count}</div>
          <div style={{ fontSize:12,color:"#64748b",fontWeight:500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function HearingApp() {
  const [hearings, setHearings]         = useState([]);
  const [counties, setCounties]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [selected, setSelected]         = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [county, setCounty]             = useState("");
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");

  const fetchCounties = useCallback(async () => {
    try { const res=await fetch(`${API_BASE}/counties`); setCounties(await res.json()); } catch {}
  }, []);

  const fetchHearings = useCallback(async () => {
    setLoading(true); setError(null);
    const p = new URLSearchParams();
    if (county)    p.set("county", county);
    if (startDate) p.set("start_date", startDate);
    if (endDate)   p.set("end_date", endDate);
    try {
      const res = await fetch(`${API_BASE}/hearings?${p}`);
      if (!res.ok) throw new Error();
      setHearings(await res.json());
    } catch {
      setError("Backend connect ஆகலை. FastAPI server running-ஆ இருக்கா check பண்ணுங்க.");
    } finally { setLoading(false); }
  }, [county, startDate, endDate]);

  useEffect(() => { fetchCounties(); }, [fetchCounties]);
  useEffect(() => { fetchHearings(); }, [fetchHearings]);
  useEffect(() => {
    if (hearings.length > 0) {
      const hasUrgent = hearings.some(h=>{ const d=getDaysUntil(h.hearing_date); return d>=0&&d<=10; });
      if (hasUrgent) setShowReminder(true);
    }
  }, [hearings]);

  const inputStyle = { width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,color:"#1e293b",background:"#fff",outline:"none",boxSizing:"border-box" };

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:"linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdf4 100%)",paddingBottom:"3rem" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)",padding:"2rem 1.5rem 3rem",marginBottom:"-1.5rem" }}>
        <div style={{ maxWidth:960,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28 }}>⚖️</div>
            <div>
              <h1 style={{ margin:0,fontSize:24,fontWeight:800,color:"#fff",letterSpacing:"-0.5px" }}>Hearing Accounts</h1>
              <p style={{ margin:"3px 0 0",fontSize:13,color:"#a5b4fc" }}>Court Hearing Management System</p>
            </div>
          </div>
          <button onClick={()=>setShowReminder(true)} style={{ background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:12,padding:"10px 18px",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8 }}>
            ⏰ Reminders
          </button>
        </div>
      </div>

      <div style={{ maxWidth:960,margin:"0 auto",padding:"0 1rem" }}>

        {/* Filter Card */}
        <div style={{ background:"#fff",borderRadius:20,padding:"1.5rem",marginBottom:"1.5rem",boxShadow:"0 8px 32px rgba(0,0,0,0.08)",border:"1px solid #f1f5f9" }}>
          <p style={{ margin:"0 0 14px",fontWeight:700,fontSize:14,color:"#475569" }}>🔍 Filter Hearings</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12 }}>
            <div>
              <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:6,fontWeight:600 }}>COUNTY</label>
              <select value={county} onChange={e=>setCounty(e.target.value)} style={inputStyle}>
                <option value="">All Counties</option>
                {counties.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:6,fontWeight:600 }}>FROM DATE</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:6,fontWeight:600 }}>TO DATE</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display:"flex",alignItems:"flex-end" }}>
              <button onClick={()=>{ setCounty(""); setStartDate(""); setEndDate(""); }} style={{ width:"100%",padding:"10px 0",borderRadius:10,border:"1.5px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:14,fontWeight:600,color:"#64748b" }}>
                ✕ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && !error && hearings.length > 0 && <StatsBar hearings={hearings} />}

        {/* Legend + count */}
        <div style={{ display:"flex",gap:16,marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center" }}>
          {[{ color:"#ef4444",label:"Today / Tomorrow" },{ color:"#f59e0b",label:"Within 10 days" },{ color:"#10b981",label:"Scheduled" }].map(l=>(
            <span key={l.label} style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#64748b" }}>
              <span style={{ width:10,height:10,borderRadius:"50%",background:l.color,display:"inline-block" }}></span>
              {l.label}
            </span>
          ))}
          <span style={{ marginLeft:"auto",fontSize:13,color:"#94a3b8" }}>{hearings.length} hearing{hearings.length!==1?"s":""} found</span>
        </div>

        {/* Error */}
        {error && <div style={{ background:"#fef2f2",color:"#dc2626",borderRadius:14,padding:"1rem 1.25rem",fontSize:14,marginBottom:"1rem",border:"1.5px solid #fecaca" }}>⚠️ {error}</div>}

        {/* Loading */}
        {loading && <div style={{ textAlign:"center",padding:"4rem 0",color:"#94a3b8",fontSize:14 }}>⏳ Loading hearings...</div>}

        {/* Cards */}
        {!loading && !error && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16 }}>
            {hearings.map(h=><HearingCard key={h.id} h={h} onClick={setSelected} />)}
            {hearings.length===0 && <div style={{ gridColumn:"1/-1",textAlign:"center",padding:"4rem 0",color:"#94a3b8",fontSize:14 }}>📭 No hearings found. Try different filters.</div>}
          </div>
        )}
      </div>

      <DetailModal hearing={selected} onClose={()=>setSelected(null)} />
      {showReminder && <ReminderPopup hearings={hearings} onClose={()=>setShowReminder(false)} />}
    </div>
  );
}
