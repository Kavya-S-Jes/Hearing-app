import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE  = "http://127.0.0.1:8000";
const PAGE_SIZE = 100;

// ─── Email Configuration (add/remove here freely) ────────────────────────────
const TUAN_EMAIL = "TTran@poconnor.com";

// "From" / "Team" list — everyone in this list appears as sender options
// and is also a valid login user. Add new members here only.
const TEAM_EMAILS = [
  "gokulkrishnab@poconnor.com",
  "princyj@poconnor.com",
  "rofinah@poconnor.com",
  "mohankumare@poconnor.com",
  "sreeram@poconnor.com",
  "radhikaj@poconnor.com",
  "karthik.padmanathan@poconnor.com",
  "ravikumar.duraisamy@poconnor.com",
  "praveenkp@poconnor.com",
  "dinesha@poconnor.com",
  "kavyas@poconnor.com",
];

const KAVYA_TO = "kavyas@poconnor.com";

// CC list for Kavya mail — edit here as needed
const KAVYA_CC = [
  "karthik.padmanathan@poconnor.com",
  "praveenkp@poconnor.com",
  "mpeddi@poconnor.com",
  "salesprocessing@POCONNOR.COM",
  "oboddy@poconnor.com",
];

// ─── Auth Configuration ───────────────────────────────────────────────────────
// Usernames (first part before @, lowercased)
const ALL_USERS = [
  { username: "gokulkrishnab",        password: "test@123", isAdmin: true  },
  { username: "princyj",              password: "test@123", isAdmin: true  },
  { username: "rofinah",              password: "test@123", isAdmin: true  },
  { username: "mohankumare",          password: "test@123", isAdmin: true  },
  { username: "kavyas",               password: "test@123", isAdmin: true  },
  { username: "sreeram",              password: "test@123", isAdmin: false },
  { username: "radhikaj",             password: "test@123", isAdmin: false },
  { username: "karthik.padmanathan",  password: "test@123", isAdmin: false },
  { username: "ravikumar.duraisamy",  password: "test@123", isAdmin: false },
  { username: "praveenkp",            password: "test@123", isAdmin: false },
  { username: "dinesha",              password: "test@123", isAdmin: false },
];

// ─── Column definitions ───────────────────────────────────────────────────────
const COLUMNS = [
  { key: "IsUdiAccount",           label: "Is UDI Account" },
  { key: "Countyname",             label: "County Name" },
  { key: "ClientStatus",           label: "Client Status" },
  { key: "accountnumber",          label: "Account Number" },
  { key: "CADLegalName",           label: "CAD Legal Name" },
  { key: "Acc.property address",   label: "Property Address" },
  { key: "cityid",                 label: "City ID" },
  { key: "zipcode",                label: "Zip Code" },
  { key: "StartDate",              label: "Start Date" },
  { key: "EndDate",                label: "End Date" },
  { key: "clientnumber",           label: "Client Number" },
  { key: "OCALUC",                 label: "OCALUC" },
  { key: "NeighbourhoodCode",      label: "Neighbourhood Code" },
  { key: "completionDateAndTime",  label: "Completion Date & Time" },
  { key: "accountstatusid",        label: "Account Status ID" },
  { key: "Accountstatus",          label: "Account Status" },
  { key: "NoticedDate",            label: "Noticed Date" },
  { key: "HearingType",            label: "Hearing Type" },
  { key: "HearingResolutionId",    label: "Hearing Resolution ID" },
  { key: "ProtestCodeValues",      label: "Protest Code Values" },
  { key: "ProtestReason",          label: "Protest Reason" },
  { key: "HearingFinalized",       label: "Hearing Finalized" },
  { key: "HearingStatus",          label: "Hearing Status" },
  { key: "InformalHearingDate",    label: "Informal Hearing Date" },
  { key: "FormalHearingDate",      label: "Formal Hearing Date" },
  { key: "CADEvidenceLetterDate",  label: "CAD Evidence Letter Date" },
  { key: "CADEvidenceScanDate",    label: "CAD Evidence Scan Date" },
  { key: "CADUEValue",             label: "CAD UE Value" },
  { key: "CADMarketMeanValue",     label: "CAD Market Mean Value" },
  { key: "CADMarketMedianValue",   label: "CAD Market Median Value" },
  { key: "OfferDate",              label: "Offer Date" },
  { key: "OfferValue",             label: "Offer Value" },
  { key: "NoticeMarketValue",      label: "Notice Market Value" },
  { key: "NoticeTotalValue",       label: "Notice Total Value" },
  { key: "PostHearingMarketValue", label: "Post Hearing Market Value" },
  { key: "PostHearingTotalValue",  label: "Post Hearing Total Value" },
  { key: "ReceivedDate",           label: "Received Date" },
  { key: "ExpiryDate",             label: "Expiry Date" },
  { key: "DateCoded",              label: "Date Coded" },
  { key: "OriginalDateCoded",      label: "Original Date Coded" },
  { key: "DateCodedEnd",           label: "Date Coded End" },
  { key: "CodedStatus",            label: "Coded Status" },
  { key: "AofAStatus",             label: "A of A Status" },
];

// ─── HB201 Excel column definitions (computed, appended after normal cols) ───
const HB201_EXTRA_COLS = [
  { key: "HB status",    label: "HB Status"     },   // right of CADEvidenceScanDate
  { key: "A of A Status",label: "A of A Status" },   // right of ExpiryDate
  { key: "Coded Status", label: "Coded Status"   },   // right of DateCoded
];

const MLS_DEFAULTS = {
  hearingResolutionIds: ["8", "26", "(blank)"],
  protestCodes:         ["Protested", "Protested by client"],
  protestReason:        "(blank)",
  hearingFinalized:     "false",
  hearingStatus:        "(blank)",
  codedStatus:          ["Coded"],
  aofaStatus:           ["Valid A of A"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatVal(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) return val.split("T")[0];
  return String(val);
}
function formatDisplay(val) {
  const v = formatVal(val);
  return v === "" ? "—" : v;
}
function getToday() {
  return new Date().toISOString().split("T")[0];
}
function getTodayFormatted() {
  // "Apr 17" style for subject line
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function getDatePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── HB201 Evidence: compute 3 status columns from raw backend data ──────────
function computeHB201Columns(row) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Step 1: Coded Status — DateCoded has value → "Coded", blank → "Not Coded"
  const dateCoded = row["DateCoded"];
  const codedStatus = (dateCoded && String(dateCoded).trim() !== "" && dateCoded !== "—")
    ? "Coded" : "Not Coded";

  // Step 2/3/4: A of A Status
  const expiryRaw    = row["ExpiryDate"];
  const receivedRaw  = row["ReceivedDate"];
  const hasExpiry    = expiryRaw && String(expiryRaw).trim() !== "" && expiryRaw !== "—";
  const hasReceived  = receivedRaw && String(receivedRaw).trim() !== "" && receivedRaw !== "—";
  let aofaStatus;
  if (!hasExpiry && !hasReceived) {
    aofaStatus = "No A of A";
  } else if (!hasExpiry) {
    aofaStatus = "No A of A";
  } else {
    const expDate = new Date(expiryRaw.split("T")[0]);
    expDate.setHours(0, 0, 0, 0);
    aofaStatus = expDate < today ? "A of A expired" : "Valid A of A";
  }

  // Step 5: HB status — CADEvidenceScanDate has value → "HB received", blank → "HB not received"
  const scanDate = row["CADEvidenceScanDate"];
  const hbStatus = (scanDate && String(scanDate).trim() !== "" && scanDate !== "—")
    ? "HB received" : "HB not received";

  return { codedStatus, aofaStatus, hbStatus };
}



function getRowColor(row, index) {
  const dateStr = row["FormalHearingDate"];
  if (!dateStr) return index % 2 === 0 ? "#fff" : "#f8fafc";
  const hearingDate = new Date(dateStr.split("T")[0]);
  const today = new Date();
  today.setHours(0,0,0,0);
  hearingDate.setHours(0,0,0,0);
  const diffDays = Math.ceil((hearingDate - today) / (1000*60*60*24));
  if (diffDays >= 0 && diffDays <= 2) return "#fff1f2";
  if (diffDays >= 3 && diffDays <= 5) return "#fff7ed";
  if (diffDays > 5)                   return "#f0fdf4";
  return index % 2 === 0 ? "#fff" : "#f8fafc";
}
function getRowHoverColor(row) {
  const dateStr = row["FormalHearingDate"];
  if (!dateStr) return "#eff6ff";
  const hearingDate = new Date(dateStr.split("T")[0]);
  const today = new Date();
  today.setHours(0,0,0,0);
  hearingDate.setHours(0,0,0,0);
  const diffDays = Math.ceil((hearingDate - today) / (1000*60*60*24));
  if (diffDays >= 0 && diffDays <= 2) return "#ffe4e6";
  if (diffDays >= 3 && diffDays <= 5) return "#ffedd5";
  return "#eff6ff";
}
function getReminderRows(hearings, days = 5) {
  const today = new Date();
  today.setHours(0,0,0,0);
  return hearings.filter(row => {
    const dateStr = row["FormalHearingDate"];
    if (!dateStr) return false;
    const d = new Date(dateStr.split("T")[0]);
    d.setHours(0,0,0,0);
    const diff = Math.ceil((d - today) / (1000*60*60*24));
    return diff >= 0 && diff <= days;
  });
}

function buildCSV(hearings, hb201Mode = false) {
  const bom = "\uFEFF";

  if (hb201Mode) {
    // HB201 mode: insert computed columns at correct positions
    // Build column list: normal COLUMNS but replace CADEvidenceScanDate slot to insert HB status,
    // ExpiryDate slot to insert A of A Status, DateCoded slot to insert Coded Status
    const hb201Cols = [];
    for (const col of COLUMNS) {
      hb201Cols.push(col);
      if (col.key === "CADEvidenceScanDate") hb201Cols.push({ key: "__hbStatus",  label: "HB Status" });
      if (col.key === "ExpiryDate")          hb201Cols.push({ key: "__aofaStatus",label: "A of A Status" });
      if (col.key === "DateCoded")           hb201Cols.push({ key: "__codedStatus",label: "Coded Status" });
    }
    const header = hb201Cols.map(c => `"${c.label}"`).join(",");
    const rows = hearings.map(row => {
      const { codedStatus, aofaStatus, hbStatus } = computeHB201Columns(row);
      return hb201Cols.map(c => {
        if (c.key === "__hbStatus")    return `"${hbStatus}"`;
        if (c.key === "__aofaStatus")  return `"${aofaStatus}"`;
        if (c.key === "__codedStatus") return `"${codedStatus}"`;
        return `"${formatVal(row[c.key]).replace(/"/g,'""')}"`; 
      }).join(",");
    });
    return bom + [header, ...rows].join("\n");
  }

  // Normal mode
  const header = COLUMNS.map(c => `"${c.label}"`).join(",");
  const rows   = hearings.map(row =>
    COLUMNS.map(c => `"${formatVal(row[c.key]).replace(/"/g,'""')}"`).join(",")
  );
  return bom + [header, ...rows].join("\n");
}
function downloadExcel(hearings, county, hb201Mode = false) {
  const today   = new Date().toISOString().split("T")[0];
  const fname   = hb201Mode
    ? `HB201_Evidence_${county || "All"}_${today}.csv`
    : `hearings_${county || "all"}_${today}.csv`;
  const csv  = buildCSV(hearings, hb201Mode);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = fname; a.click();
  URL.revokeObjectURL(url);
}
async function downloadAllExcel(filters, county, hb201Mode = false) {
  const p = new URLSearchParams();
  if (filters.county)                            p.set("county", filters.county);
  if (filters.startDate)                         p.set("start_date", filters.startDate);
  if (filters.endDate)                           p.set("end_date", filters.endDate);
  if (filters.hearingResolutionId?.length > 0)   p.set("hearing_resolution_id", filters.hearingResolutionId.join(","));
  if (filters.protestCode?.length > 0)           p.set("protest_code", filters.protestCode.join(","));
  if (filters.protestReason)                     p.set("protest_reason", filters.protestReason);
  if (filters.hearingFinalized)                  p.set("hearing_finalized", filters.hearingFinalized);
  if (filters.hearingStatus)                     p.set("hearing_status", filters.hearingStatus);
  if (filters.codedStatus?.length > 0)           p.set("coded_status", filters.codedStatus.join(","));
  if (filters.aofaStatus?.length > 0)            p.set("aofa_status", filters.aofaStatus.join(","));
  const res  = await fetch(`${API_BASE}/export-all?${p}`);
  const json = await res.json();
  const all  = json.data;
  const csv  = buildCSV(all, hb201Mode);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `hearings_ALL_${county || "all"}_${getToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return all.length;
}

// ─── Feature 1: Send to Kavya ─────────────────────────────────────────────────
function triggerKavyaMail(hearings, county) {
  const csvFileName = `Missing_HB201_Evidence_${getTodayFormatted().replace(" ","")}_${county || "All"}.csv`;
  const subject     = `Missing HB 201 Evidence - upcoming 25 days Hearing - ORR-${getTodayFormatted()}`;
  const body        = `Hello Kavya,\n\nPlease find the attached list of accounts scheduled within 25 days future hearing that don't have HB 201 evidence in our record. Please review and do the needful.\n\n⚠️ Please attach the downloaded file "${csvFileName}" before sending.\n\nTotal Records : ${hearings.length}\nCounty        : ${county || "All Counties"}\nDate Range    : ${getToday()} → ${getDatePlusDays(25)}`;

  // 1. Download CSV
  const csv = buildCSV(hearings, true);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = csvFileName; a.click();
  URL.revokeObjectURL(url);

  // 2. Open Desktop Outlook via mailto
  window.location.href = `mailto:${KAVYA_TO}?cc=${encodeURIComponent(KAVYA_CC.join(";"))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Feature 1: Send to Tuan ──────────────────────────────────────────────────
function triggerOutlookDraft(hearings, county, toEmail, recipientName) {
  const csvFileName = `Missing_HB201_Evidence_${getTodayFormatted().replace(" ","")}_${county || "All"}.csv`;
  const subject     = `Missing HB 201 Evidence - upcoming 25 days Hearing - ORR-${getTodayFormatted()}${county ? ` (${county})` : ""}`;
  const body        = `Hello ${recipientName},\n\nPlease find the attached list of accounts scheduled within 25 days future hearing that don't have HB 201 evidence in our record. Please review and do the needful.\n\n⚠️ Please attach the downloaded file "${csvFileName}" before sending.\n\nTotal Records : ${hearings.length}\nCounty        : ${county || "All Counties"}\nDate Range    : ${getToday()} → ${getDatePlusDays(25)}`;

  // 1. Download CSV
  const csv = buildCSV(hearings, true);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = csvFileName; a.click();
  URL.revokeObjectURL(url);

  // 2. Open Desktop Outlook via mailto
  window.location.href = `mailto:${toEmail}?cc=${encodeURIComponent(KAVYA_CC.join(";"))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const iStyle = {
  width: "100%", padding: "7px 10px", borderRadius: 7,
  border: "1.5px solid #e2e8f0", fontSize: 12, color: "#1e293b",
  background: "#fff", outline: "none", boxSizing: "border-box"
};

function FilterSelect({ label, value, onChange, options, placeholder = "All" }) {
  return (
    <div>
      <label style={{ fontSize:10, color:"#94a3b8", display:"block", marginBottom:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={iStyle}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function MultiSelectDropdown({ label, values, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const allSelected = values.length === options.length && options.length > 0 && values.length > 0;
  const toggleAll   = () => onChange(allSelected ? [] : [...options]);
  const toggleOne   = (opt) => {
    if (values.includes(opt)) onChange(values.filter(v => v !== opt));
    else onChange([...values, opt]);
  };
  const displayText = values.length === 0 ? "All"
    : values.length === options.length ? "All selected"
    : values.length === 1 ? values[0]
    : `${values.length} selected`;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={{ fontSize:10, color:"#94a3b8", display:"block", marginBottom:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>
      <button onClick={() => setOpen(o => !o)} style={{ ...iStyle, display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", textAlign:"left" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayText}</span>
        <span style={{ fontSize:9, marginLeft:6, flexShrink:0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:999, background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:8, minWidth:"100%", maxHeight:220, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", cursor:"pointer", fontWeight:600, fontSize:12, color:"#1e293b", borderBottom:"1px solid #f1f5f9" }}
            onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor:"#4f46e5", width:14, height:14 }} />
            All
          </label>
          {options.map(opt => (
            <label key={opt} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"#334155" }}
              onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <input type="checkbox" checked={values.includes(opt)} onChange={() => toggleOne(opt)} style={{ accentColor:"#4f46e5", width:14, height:14 }} />
              {opt}
            </label>
          ))}
        </div>
      )}
      {values.length > 0 && values.length < options.length && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:5 }}>
          {values.map(v => (
            <span key={v} style={{ display:"inline-flex", alignItems:"center", gap:3, background:"#eef2ff", color:"#4338ca", fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:999 }}>
              {v}<span onClick={() => toggleOne(v)} style={{ cursor:"pointer", opacity:0.7, fontSize:11 }}>✕</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function paginationBtnStyle(disabled) {
  return {
    padding:"6px 12px", borderRadius:8, fontSize:13, fontWeight:600,
    border:"1.5px solid #e2e8f0",
    background: disabled ? "#f8fafc" : "#fff",
    color: disabled ? "#cbd5e1" : "#475569",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

// ─── Feature 2: Login Modal ───────────────────────────────────────────────────
function LoginModal({ onSuccess, onClose }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const user = ALL_USERS.find(u => u.username === username.trim() && u.password === password);
      if (user) {
        onSuccess(user);
      } else {
        setError("Invalid username or password.");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"2rem", width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", fontSize:22 }}>⚖️</div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#1e1b4b" }}>HB201 Login</h2>
          <p style={{ margin:"4px 0 0", fontSize:12, color:"#94a3b8" }}>Enter your credentials to continue</p>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>Username</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="e.g. gokulkrishnab"
            style={{ ...iStyle, marginTop:4 }}
          />
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ ...iStyle, marginTop:4 }}
          />
        </div>
        {error && (
          <div style={{ background:"#fef2f2", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:12, marginBottom:12, border:"1px solid #fecaca" }}>
            ⚠️ {error}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={loading || !username || !password}
          style={{ width:"100%", padding:"10px 0", borderRadius:10, border:"none", background: loading ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff", fontWeight:700, fontSize:14, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Verifying..." : "Login →"}
        </button>
      </div>
    </div>
  );
}

// ─── Feature 2: Admin Panel Modal ─────────────────────────────────────────────
function AdminPanel({ currentUser, users, setUsers, onClose }) {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("test@123");
  const [newIsAdmin,  setNewIsAdmin]  = useState(false);
  const [msg, setMsg]                 = useState("");

  const addUser = () => {
    if (!newUsername.trim()) return;
    if (users.find(u => u.username === newUsername.trim())) {
      setMsg("User already exists."); return;
    }
    setUsers(prev => [...prev, { username: newUsername.trim(), password: newPassword, isAdmin: newIsAdmin }]);
    setNewUsername(""); setNewPassword("test@123"); setNewIsAdmin(false);
    setMsg("✅ User added!");
    setTimeout(() => setMsg(""), 2000);
  };

  const removeUser = (uname) => {
    if (uname === currentUser.username) { setMsg("Cannot remove yourself!"); return; }
    setUsers(prev => prev.filter(u => u.username !== uname));
  };

  const toggleAdmin = (uname) => {
    setUsers(prev => prev.map(u => u.username === uname ? { ...u, isAdmin: !u.isAdmin } : u));
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"1.5rem", width:520, maxHeight:"80vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        <h2 style={{ margin:"0 0 1rem", fontSize:17, fontWeight:800, color:"#1e1b4b" }}>👑 Admin — User Management</h2>

        {/* Add user */}
        <div style={{ background:"#f8fafc", borderRadius:10, padding:"1rem", marginBottom:"1rem", border:"1px solid #e2e8f0" }}>
          <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#475569" }}>Add New User</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Username" style={{ ...iStyle }} />
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" style={{ ...iStyle }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} id="isAdminChk" style={{ accentColor:"#4f46e5", width:14, height:14 }} />
            <label htmlFor="isAdminChk" style={{ fontSize:12, color:"#475569", cursor:"pointer" }}>Admin user</label>
          </div>
          <button onClick={addUser} style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#4f46e5", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Add User</button>
          {msg && <span style={{ marginLeft:10, fontSize:12, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg}</span>}
        </div>

        {/* User list */}
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f1f5f9" }}>
              <th style={{ padding:"6px 10px", textAlign:"left", color:"#64748b", fontWeight:700 }}>Username</th>
              <th style={{ padding:"6px 10px", textAlign:"center", color:"#64748b", fontWeight:700 }}>Admin</th>
              <th style={{ padding:"6px 10px", textAlign:"center", color:"#64748b", fontWeight:700 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={{ padding:"6px 10px", color:"#1e293b", fontWeight: u.username === currentUser.username ? 700 : 400 }}>
                  {u.username} {u.username === currentUser.username && <span style={{ fontSize:10, color:"#4f46e5" }}>(you)</span>}
                </td>
                <td style={{ padding:"6px 10px", textAlign:"center" }}>
                  <input type="checkbox" checked={u.isAdmin} onChange={() => toggleAdmin(u.username)} style={{ accentColor:"#4f46e5", width:14, height:14 }} />
                </td>
                <td style={{ padding:"6px 10px", textAlign:"center" }}>
                  <button onClick={() => removeUser(u.username)} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:11, fontWeight:600, cursor:"pointer" }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tuan Mail Modal ──────────────────────────────────────────────────────────
function TuanMailModal({ hearings, county, currentUser, onClose }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  const todayFormatted = getTodayFormatted();
  const fileName       = `Missing_HB201_Evidence_${todayFormatted.replace(" ","")}_${county || "All"}.csv`;
  const subject        = `Missing HB 201 Evidence - upcoming 25 days Hearing - ORR-${todayFormatted}${county ? ` (${county})` : ""}`;

  const mailBody = `Hello Tuan,\n\nPlease find the attached list of accounts scheduled within 25 days future hearing that don't have HB 201 evidence in our record. Please review and do the needful.`;

  const handleSend = () => {
    setSending(true);
    // 1. Download CSV
    const csv  = buildCSV(hearings, true);
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    // 2. Open Desktop Outlook via mailto
    const fullBody = `${mailBody}\n\n⚠️ Please attach the downloaded file "${fileName}" before sending.\n\nTotal Records : ${hearings.length}\nCounty        : ${county || "All Counties"}\nDate Range    : ${getToday()} → ${getDatePlusDays(25)}`;
    window.location.href = `mailto:${TUAN_EMAIL}?cc=${encodeURIComponent(KAVYA_CC.join(";"))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    setSending(false);
    setSent(true);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"1.5rem", width:520, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        <h2 style={{ margin:"0 0 1rem", fontSize:17, fontWeight:800, color:"#1e1b4b" }}>📧 Send Report to Tuan</h2>
        <div style={{ background:"#f8fafc", borderRadius:10, padding:"1rem", marginBottom:"1rem", border:"1px solid #e2e8f0", fontSize:12 }}>
          <div style={{ marginBottom:6 }}><strong style={{ color:"#64748b" }}>To:</strong> <span style={{ color:"#1e293b" }}>{TUAN_EMAIL}</span></div>
          <div style={{ marginBottom:6 }}>
            <strong style={{ color:"#64748b" }}>CC:</strong>{" "}
            <span style={{ color:"#1e293b" }}>{KAVYA_CC.join("; ")}</span>
          </div>
          <div style={{ marginBottom:6 }}><strong style={{ color:"#64748b" }}>Subject:</strong> <span style={{ color:"#1e293b" }}>{subject}</span></div>
          <div style={{ marginBottom:6 }}><strong style={{ color:"#64748b" }}>Attachment:</strong> <span style={{ color:"#4f46e5" }}>📎 {fileName} (manually attach after download)</span></div>
        {sent ? (
          <div style={{ textAlign:"center", padding:"12px 0", color:"#16a34a", fontWeight:700, fontSize:14 }}>✅ Outlook draft opened! Attach the CSV and send.</div>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontWeight:700, fontSize:13, cursor:"pointer" }}>Cancel</button>
            <button onClick={handleSend} disabled={sending} style={{ flex:2, padding:"10px 0", borderRadius:10, border:"none", background: sending ? "#a5b4fc" : "linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontWeight:700, fontSize:13, cursor: sending ? "not-allowed":"pointer" }}>
              {sending ? "⏳ Preparing..." : "📤 Download CSV & Open Draft"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feature 2: MLS Screenshot Mail Modal ────────────────────────────────────
// Shows a preview of what will be sent, then triggers mailto
function MLSMailModal({ hearings, county, currentUser, onClose }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  const todayFormatted = getTodayFormatted();
  const fileName       = `Missing_HB201_Evidence_${todayFormatted.replace(" ","")}_${county || "All"}.csv`;
  const subject        = `Missing HB 201 Evidence - upcoming 25 days Hearing - ORR-${todayFormatted}`;

  const mailBody = `Hello Kavya,\n\nPlease find the attached list of accounts scheduled within 25 days future hearing that don't have HB 201 evidence in our record. Please review and do the needful.`;

  const handleSend = () => {
    setSending(true);
    // 1. Download CSV
    const csv  = buildCSV(hearings, true);
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    // 2. Open Desktop Outlook via mailto
    const fullBody = `${mailBody}\n\n⚠️ Please attach the downloaded file "${fileName}" before sending.\n\nTotal Records : ${hearings.length}\nCounty        : ${county || "All Counties"}\nDate Range    : ${getToday()} → ${getDatePlusDays(25)}\n\nSent by: ${currentUser.username}`;
    window.location.href = `mailto:${KAVYA_TO}?cc=${encodeURIComponent(KAVYA_CC.join(";"))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    setSending(false);
    setSent(true);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"1.5rem", width:500, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        <h2 style={{ margin:"0 0 1rem", fontSize:17, fontWeight:800, color:"#1e1b4b" }}>📧 Send MLS Report to Kavya</h2>

        {/* Mail preview */}
        <div style={{ background:"#f8fafc", borderRadius:10, padding:"1rem", marginBottom:"1rem", border:"1px solid #e2e8f0", fontSize:12 }}>
          <div style={{ marginBottom:6 }}><strong style={{ color:"#64748b" }}>To:</strong> <span style={{ color:"#1e293b" }}>{KAVYA_TO}</span></div>
          <div style={{ marginBottom:6 }}>
            <strong style={{ color:"#64748b" }}>CC:</strong>{" "}
            <span style={{ color:"#1e293b" }}>{KAVYA_CC.join("; ")}</span>
          </div>
          <div style={{ marginBottom:6 }}><strong style={{ color:"#64748b" }}>Subject:</strong> <span style={{ color:"#1e293b" }}>{subject}</span></div>
          <div style={{ marginBottom:6 }}><strong style={{ color:"#64748b" }}>Attachment:</strong> <span style={{ color:"#4f46e5" }}>📎 {fileName} (manually attach after download)</span></div>
          <hr style={{ border:"none", borderTop:"1px solid #e2e8f0", margin:"8px 0" }} />
          <div style={{ color:"#334155", lineHeight:1.6 }}>
            Hello Kavya,<br /><br />
            Please find the attached list of accounts scheduled within 25 days future hearing that don't have HB 201 evidence in our record. Please review and do the needful.
          </div>
        </div>
        <div style={{ background:"#fffbeb", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#92400e", marginBottom:"1rem", border:"1px solid #fde68a" }}>
          ⚠️ CSV will be downloaded automatically. Please attach it to the Outlook draft before sending.
        </div>

        {sent ? (
          <div style={{ textAlign:"center", padding:"12px 0", color:"#16a34a", fontWeight:700, fontSize:14 }}>
            ✅ Outlook draft opened! Attach the CSV and send.
          </div>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending} style={{ flex:2, padding:"10px 0", borderRadius:10, border:"none", background: sending ? "#a5b4fc" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff", fontWeight:700, fontSize:13, cursor: sending ? "not-allowed":"pointer" }}>
              {sending ? "⏳ Preparing..." : "📤 Download CSV & Open Draft"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App-level Login Form ─────────────────────────────────────────────────────
function AppLoginForm({ onSuccess, users }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = () => {
    if (!username || !password) return;
    setLoading(true); setError("");
    setTimeout(() => {
      const user = users.find(u => u.username === username.trim() && u.password === password);
      if (user) { onSuccess(user); }
      else { setError("Invalid username or password."); }
      setLoading(false);
    }, 400);
  };

  return (
    <div>
      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:4 }}>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="e.g. gokulkrishnab"
          style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, color:"#1e293b", background:"#fff", outline:"none", boxSizing:"border-box" }} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:4 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="••••••••"
          style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, color:"#1e293b", background:"#fff", outline:"none", boxSizing:"border-box" }} />
      </div>
      {error && (
        <div style={{ background:"#fef2f2", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:12, marginBottom:12, border:"1px solid #fecaca" }}>⚠️ {error}</div>
      )}
      <button onClick={handleLogin} disabled={loading || !username || !password}
        style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"none", background: (loading || !username || !password) ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff", fontWeight:700, fontSize:14, cursor: (loading || !username || !password) ? "not-allowed":"pointer" }}>
        {loading ? "Verifying..." : "Login →"}
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HearingApp() {
  const [hearings, setHearings]         = useState([]);
  const [counties, setCounties]         = useState([]);
  const [filterOpts, setFilterOpts]     = useState({
    hearingResolutionIds: [], protestCodes: [], protestReasons: [],
    hearingStatuses: [], hearingFinalized: ["true","false"],
    codedStatus: ["Coded","Not Coded"], aofaStatus: ["Valid A of A","Expired","No A of A"],
  });
  const [loading, setLoading]           = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [error, setError]               = useState(null);
  const [hasFetched, setHasFetched]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [showFilters, setShowFilters]   = useState(false);
  const [mlsActive, setMlsActive]       = useState(false);
  const [sendingTuan, setSendingTuan]   = useState(false);
  const [sendingKavya, setSendingKavya] = useState(false);
  const [sortCol, setSortCol]           = useState(null);
  const [sortDir, setSortDir]           = useState("asc");
  const [showReminder, setShowReminder] = useState(true);
  const [reminderDays, setReminderDays]   = useState(5);
  const [showReminderSetting, setShowReminderSetting] = useState(false);

  // Feature 2 state
  const [users, setUsers]               = useState(ALL_USERS);
  const [showLogin, setShowLogin]       = useState(false);
  const [currentUser, setCurrentUser]   = useState(null);
  const [appUser, setAppUser]           = useState(null);   // App-level login gate
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMLSMailModal, setShowMLSMailModal] = useState(false);
  const [showTuanModal, setShowTuanModal]       = useState(false);

  const [county, setCounty]                           = useState("");
  const [startDate, setStartDate]                     = useState("");
  const [endDate, setEndDate]                         = useState("");
  const [hearingResolutionId, setHearingResolutionId] = useState([]);
  const [protestCode, setProtestCode]                 = useState([]);
  const [protestReason, setProtestReason]             = useState("");
  const [hearingFinalized, setHearingFinalized]       = useState("");
  const [hearingStatus, setHearingStatus]             = useState("");
  const [codedStatus, setCodedStatus]                 = useState([]);
  const [aofaStatus, setAofaStatus]                   = useState([]);

  const filterRef = useRef({});
  filterRef.current = {
    county, startDate, endDate, hearingResolutionId,
    protestCode, protestReason, hearingFinalized,
    hearingStatus, codedStatus, aofaStatus,
  };

  useEffect(() => {
    fetch(`${API_BASE}/counties`).then(r => r.json()).then(setCounties).catch(() => {});
    fetch(`${API_BASE}/filter-options`).then(r => r.json()).then(setFilterOpts).catch(() => {});
  }, []);

  const fetchHearings = useCallback(async (pageNum = 1) => {
    setLoading(true); setError(null);
    const f = filterRef.current;
    const p = new URLSearchParams();
    if (f.county)                          p.set("county", f.county);
    if (f.startDate)                       p.set("start_date", f.startDate);
    if (f.endDate)                         p.set("end_date", f.endDate);
    if (f.hearingResolutionId?.length > 0) p.set("hearing_resolution_id", f.hearingResolutionId.join(","));
    if (f.protestCode?.length > 0)         p.set("protest_code", f.protestCode.join(","));
    if (f.protestReason)                   p.set("protest_reason", f.protestReason);
    if (f.hearingFinalized)                p.set("hearing_finalized", f.hearingFinalized);
    if (f.hearingStatus)                   p.set("hearing_status", f.hearingStatus);
    if (f.codedStatus?.length > 0)         p.set("coded_status", f.codedStatus.join(","));
    if (f.aofaStatus?.length > 0)          p.set("aofa_status", f.aofaStatus.join(","));
    p.set("page", pageNum); p.set("page_size", PAGE_SIZE);
    try {
      const res = await fetch(`${API_BASE}/hearings?${p}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setHearings(json.data); setTotalRecords(json.total);
      setTotalPages(json.total_pages); setPage(pageNum);
      setHasFetched(true); setShowReminder(true);
    } catch {
      setError("Backend connect ஆகலை. FastAPI server running-ஆ இருக்கா check பண்ணுங்க.");
    } finally { setLoading(false); }
  }, []);

  const fetchWithOverride = useCallback(async (overrides, pageNum = 1) => {
    setLoading(true); setError(null);
    const p = new URLSearchParams();
    if (overrides.county)                          p.set("county", overrides.county);
    if (overrides.startDate)                       p.set("start_date", overrides.startDate);
    if (overrides.endDate)                         p.set("end_date", overrides.endDate);
    if (overrides.hearingResolutionId?.length > 0) p.set("hearing_resolution_id", overrides.hearingResolutionId.join(","));
    if (overrides.protestCode?.length > 0)         p.set("protest_code", overrides.protestCode.join(","));
    if (overrides.protestReason)                   p.set("protest_reason", overrides.protestReason);
    if (overrides.hearingFinalized)                p.set("hearing_finalized", overrides.hearingFinalized);
    if (overrides.hearingStatus)                   p.set("hearing_status", overrides.hearingStatus);
    if (overrides.codedStatus?.length > 0)         p.set("coded_status", overrides.codedStatus.join(","));
    if (overrides.aofaStatus?.length > 0)          p.set("aofa_status", overrides.aofaStatus.join(","));
    p.set("page", pageNum); p.set("page_size", PAGE_SIZE);
    try {
      const res = await fetch(`${API_BASE}/hearings?${p}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setHearings(json.data); setTotalRecords(json.total);
      setTotalPages(json.total_pages); setPage(pageNum);
      setHasFetched(true); setShowReminder(true);
    } catch {
      setError("Backend connect ஆகலை. FastAPI server running-ஆ இருக்கா check பண்ணுங்க.");
    } finally { setLoading(false); }
  }, []);

  // MLS Filter click → always show login modal first
  const handleMLSClick = () => {
    if (mlsActive) {
      setHearingResolutionId([]); setProtestCode([]); setProtestReason("");
      setHearingFinalized(""); setHearingStatus("");
      setCodedStatus([]); setAofaStatus([]);
      setStartDate(""); setEndDate("");
      setMlsActive(false); setCurrentUser(null);
      return;
    }
    setShowLogin(true);
  };

  const activateMLS = () => {
    const today  = getToday();
    const plus25 = getDatePlusDays(25);
    setHearingResolutionId(MLS_DEFAULTS.hearingResolutionIds);
    setProtestCode(MLS_DEFAULTS.protestCodes);
    setProtestReason(MLS_DEFAULTS.protestReason);
    setHearingFinalized(MLS_DEFAULTS.hearingFinalized);
    setHearingStatus(MLS_DEFAULTS.hearingStatus);
    setCodedStatus(MLS_DEFAULTS.codedStatus);
    setAofaStatus(MLS_DEFAULTS.aofaStatus);
    setStartDate(today); setEndDate(plus25);
    setShowFilters(true); setMlsActive(true);
    setTimeout(() => fetchWithOverride({
      hearingResolutionId: MLS_DEFAULTS.hearingResolutionIds,
      protestCode:         MLS_DEFAULTS.protestCodes,
      protestReason:       MLS_DEFAULTS.protestReason,
      hearingFinalized:    MLS_DEFAULTS.hearingFinalized,
      hearingStatus:       MLS_DEFAULTS.hearingStatus,
      codedStatus:         MLS_DEFAULTS.codedStatus,
      aofaStatus:          MLS_DEFAULTS.aofaStatus,
      startDate:           today, endDate: plus25, county,
    }), 0);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setShowLogin(false);
    activateMLS();
  };

  const handleSearch = () => fetchHearings(1);
  const clearAll = () => {
    setCounty(""); setStartDate(""); setEndDate("");
    setHearingResolutionId([]); setProtestCode([]); setProtestReason("");
    setHearingFinalized(""); setHearingStatus(""); setCodedStatus([]); setAofaStatus([]);
    setMlsActive(false); setCurrentUser(null);
    setHearings([]); setTotalRecords(0); setTotalPages(0);
    setHasFetched(false); setPage(1);
  };

  // Send to Tuan → open modal
  const handleSendTuan = () => {
    if (hearings.length === 0) return;
    setShowTuanModal(true);
  };

  // Send to Kavya → open modal
  const handleSendKavya = () => {
    if (hearings.length === 0) return;
    setShowMLSMailModal(true);
  };

  const handleDownloadAll = async () => {
    setExporting(true);
    try {
      const count = await downloadAllExcel(filterRef.current, county, mlsActive);
      alert(`✅ ${count.toLocaleString()} records downloaded!`);
    } catch {
      alert("Export failed. Backend check பண்ணுங்க.");
    } finally { setExporting(false); }
  };

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  };
  const sorted = [...hearings].sort((a, b) => {
    if (!sortCol) return 0;
    const av = formatVal(a[sortCol]), bv = formatVal(b[sortCol]);
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const activeFilterCount = [county, startDate, endDate, protestReason, hearingFinalized, hearingStatus].filter(Boolean).length
    + (hearingResolutionId.length > 0 ? 1 : 0) + (protestCode.length > 0 ? 1 : 0)
    + (codedStatus.length > 0 ? 1 : 0) + (aofaStatus.length > 0 ? 1 : 0);
  const pageNumbers = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, page-delta); i <= Math.min(totalPages, page+delta); i++) pages.push(i);
    return pages;
  };
  const reminderRows = getReminderRows(hearings, reminderDays);

  // ─── Render ────────────────────────────────────────────────────────────────
  // App-level login gate
  if (!appUser) {
    return (
      <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", minHeight:"100vh", background:"linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"2.5rem", width:380, boxShadow:"0 24px 64px rgba(0,0,0,0.4)", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
            <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:26 }}>⚖️</div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:"#1e1b4b" }}>Hearing Accounts</h2>
            <p style={{ margin:"4px 0 0", fontSize:12, color:"#94a3b8" }}>Court Hearing Management System</p>
          </div>
          <AppLoginForm onSuccess={setAppUser} users={users} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", minHeight:"100vh", background:"#f0f4ff" }}>

      {/* Modals */}
      {showLogin && (
        <LoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}
      {showAdminPanel && currentUser?.isAdmin && (
        <AdminPanel
          currentUser={currentUser}
          users={users}
          setUsers={setUsers}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
      {showMLSMailModal && (
        <MLSMailModal
          hearings={hearings}
          county={county}
          currentUser={currentUser}
          onClose={() => setShowMLSMailModal(false)}
        />
      )}
      {showTuanModal && (
        <TuanMailModal
          hearings={hearings}
          county={county}
          currentUser={currentUser}
          onClose={() => setShowTuanModal(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)", padding:"1rem 1.5rem" }}>
        <div style={{ maxWidth:1600, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⚖️</div>
            <div>
              <h1 style={{ margin:0, fontSize:19, fontWeight:800, color:"#fff" }}>Hearing Accounts</h1>
              <p style={{ margin:0, fontSize:11, color:"#a5b4fc" }}>Court Hearing Management System</p>
            </div>
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>

            {/* MLS Filter — Feature 2: login gate */}
            <button onClick={handleMLSClick} style={{
              background: mlsActive ? "#f59e0b" : "rgba(255,255,255,0.15)",
              border: mlsActive ? "1.5px solid #f59e0b" : "1.5px solid rgba(255,255,255,0.4)",
              color:"#fff", borderRadius:10, padding:"8px 14px",
              cursor:"pointer", fontSize:12, fontWeight:700
            }}>
              {mlsActive ? "✓ HB201 Active" : "⚡ HB201 Evidence"}
            </button>

            {/* Logged in user + Send buttons + Admin panel */}
            {currentUser && (
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <span style={{ background:"rgba(255,255,255,0.15)", color:"#fff", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:600 }}>
                  👤 {currentUser.username} {currentUser.isAdmin && "👑"}
                </span>

                {/* Send to Tuan — visible only after login */}
                <button onClick={handleSendTuan} disabled={hearings.length === 0} style={{
                  background: hearings.length === 0 ? "rgba(255,255,255,0.1)" : "rgba(16,185,129,0.85)",
                  border:"1.5px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:10,
                  padding:"8px 14px", cursor: hearings.length === 0 ? "not-allowed":"pointer",
                  fontSize:12, fontWeight:700, opacity: hearings.length === 0 ? 0.5 : 1
                }}>
                  📧 Send to Tuan
                </button>

                {/* Send to Kavya — visible only after login */}
                <button onClick={handleSendKavya} disabled={hearings.length === 0} style={{
                  background: hearings.length === 0 ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.85)",
                  border:"1.5px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:10,
                  padding:"8px 14px", cursor: hearings.length === 0 ? "not-allowed":"pointer",
                  fontSize:12, fontWeight:700, opacity: hearings.length === 0 ? 0.5 : 1
                }}>
                  📧 Send to Kavya
                </button>

                {currentUser.isAdmin && (
                  <button onClick={() => setShowAdminPanel(true)} style={{ background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.3)", color:"#e0e7ff", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:11, fontWeight:600 }}>
                    ⚙️ Admin
                  </button>
                )}
                <button onClick={() => { setCurrentUser(null); setMlsActive(false); }} style={{ background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)", color:"#fca5a5", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:11 }}>
                  Logout
                </button>
              </div>
            )}

            {/* Download current page */}
            <button onClick={() => downloadExcel(hearings, county, mlsActive)} disabled={hearings.length === 0} style={{
              background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.4)",
              color:"#fff", borderRadius:10, padding:"8px 14px",
              cursor: hearings.length === 0 ? "not-allowed":"pointer",
              fontSize:12, fontWeight:600, opacity: hearings.length === 0 ? 0.5 : 1
            }}>
              ⬇️ Page ({hearings.length})
            </button>

            {/* Download ALL */}
            <button onClick={handleDownloadAll} disabled={!hasFetched || exporting} style={{
              background: exporting ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.85)",
              border:"1.5px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:10,
              padding:"8px 14px", cursor: (!hasFetched || exporting) ? "not-allowed":"pointer",
              fontSize:12, fontWeight:700, opacity: (!hasFetched || exporting) ? 0.5 : 1
            }}>
              {exporting ? "⏳ Exporting..." : `📊 Excel Download (${totalRecords.toLocaleString()})`}
            </button>

          </div>
        </div>
      </div>

      <div style={{ maxWidth:1600, margin:"0 auto", padding:"1rem" }}>

        {/* MLS Banner */}
        {mlsActive && (
          <div style={{ background:"#fffbeb", border:"1.5px solid #f59e0b", borderRadius:10, padding:"0.6rem 1rem", marginBottom:"0.75rem", fontSize:12, color:"#92400e", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <span>
              ⚡ <strong>HB201 Evidence active</strong> — HearingResolutionId: 8, 26, blanks · ProtestCode: Protested, Protested by client · ProtestReason: blank · HearingFinalized: False · HearingStatus: blank · CodedStatus: Coded · AofAStatus: Valid A of A ·{" "}
              <strong>Formal Hearing Date: {getToday()} → {getDatePlusDays(25)}</strong>
            </span>
            {currentUser && (
              <span style={{ fontSize:11, color:"#b45309", fontWeight:600, whiteSpace:"nowrap" }}>
                Logged as: {currentUser.username}
              </span>
            )}
          </div>
        )}

        {/* Color Legend */}
        {hasFetched && hearings.length > 0 && (
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:"0.6rem", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>Row color:</span>
            <span style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:6, padding:"2px 10px", fontSize:11, color:"#be123c", fontWeight:600 }}>🔴 Hearing in 0–2 days (Urgent)</span>
            <span style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:6, padding:"2px 10px", fontSize:11, color:"#c2410c", fontWeight:600 }}>🟠 Hearing in 3–5 days (Reminder)</span>
            <span style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, padding:"2px 10px", fontSize:11, color:"#15803d", fontWeight:600 }}>🟢 Hearing &gt; 5 days (Scheduled)</span>
          </div>
        )}

        {/* Reminder Settings */}
        {showReminderSetting && (
          <div style={{ background:"#eff6ff", border:"1.5px solid #93c5fd", borderRadius:10, padding:"0.7rem 1rem", marginBottom:"0.5rem", fontSize:12, color:"#1e40af", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontWeight:700 }}>🔔 Reminder Settings:</span>
            <span>Alert when Formal Hearing Date is within</span>
            <input
              type="number" min={1} max={30} value={reminderDays}
              onChange={e => setReminderDays(Number(e.target.value))}
              style={{ width:52, padding:"3px 6px", borderRadius:6, border:"1.5px solid #93c5fd", fontSize:12, fontWeight:700, color:"#1e40af", textAlign:"center" }}
            />
            <span>days</span>
            <button onClick={() => setShowReminderSetting(false)} style={{ marginLeft:"auto", background:"transparent", border:"none", cursor:"pointer", fontSize:15, color:"#1e40af" }}>✕</button>
          </div>
        )}

        {/* Reminder Banner */}
        {showReminder && reminderRows.length > 0 && (
          <div style={{ background:"#fff7ed", border:"1.5px solid #fb923c", borderRadius:10, padding:"0.7rem 1rem", marginBottom:"0.75rem", fontSize:12, color:"#9a3412", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <span>
              🔔 <strong>Reminder:</strong> {reminderRows.length} record{reminderRows.length > 1 ? "s" : ""} have a Formal Hearing Date within the next <strong>{reminderDays} days</strong>!
              {" "}Accounts: {reminderRows.slice(0, 5).map(r => r.accountnumber).join(", ")}{reminderRows.length > 5 ? ` +${reminderRows.length - 5} more` : ""}
            </span>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <button onClick={() => setShowReminderSetting(s => !s)} style={{ background:"#fb923c", border:"none", borderRadius:7, padding:"3px 10px", cursor:"pointer", fontSize:11, color:"#fff", fontWeight:700 }}>⚙️ Set Days</button>
              <button onClick={() => setShowReminder(false)} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:16, color:"#9a3412" }}>✕</button>
            </div>
          </div>
        )}
        {hasFetched && !loading && reminderRows.length === 0 && (
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"0.25rem" }}>
            <button onClick={() => setShowReminderSetting(s => !s)} style={{ background:"transparent", border:"1px solid #cbd5e1", borderRadius:7, padding:"3px 10px", cursor:"pointer", fontSize:11, color:"#94a3b8", fontWeight:600 }}>🔔 Reminder ({reminderDays}d)</button>
          </div>
        )}

        {/* Filter Panel */}
        <div style={{ background:"#fff", borderRadius:14, padding:"1rem 1.25rem", marginBottom:"1rem", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", border:"1px solid #f1f5f9" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:"0.75rem" }}>
            <FilterSelect label="County" value={county} onChange={setCounty} options={counties} />
            <div>
              <label style={{ fontSize:10, color:"#94a3b8", display:"block", marginBottom:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>From Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={iStyle} />
            </div>
            <div>
              <label style={{ fontSize:10, color:"#94a3b8", display:"block", marginBottom:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>To Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={iStyle} />
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
              <button onClick={handleSearch} disabled={loading} style={{
                flex:2, padding:"7px 0", borderRadius:7,
                border:"none", background: loading ? "#a5b4fc" : "#4f46e5",
                cursor: loading ? "not-allowed":"pointer",
                fontSize:12, fontWeight:700, color:"#fff"
              }}>
                {loading ? "⏳..." : "🔎 Search"}
              </button>
              <button onClick={() => setShowFilters(f => !f)} style={{
                flex:2, padding:"7px 0", borderRadius:7,
                border:"1.5px solid #6366f1",
                background: showFilters ? "#6366f1" : "#fff",
                cursor:"pointer", fontSize:12, fontWeight:600,
                color: showFilters ? "#fff" : "#6366f1"
              }}>
                {showFilters ? "▲ Less" : "▼ More"}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
              <button onClick={clearAll} style={{
                flex:1, padding:"7px 0", borderRadius:7,
                border:"1.5px solid #e2e8f0", background:"#f8fafc",
                cursor:"pointer", fontSize:12, fontWeight:600, color:"#64748b"
              }}>✕</button>
            </div>
          </div>

          {showFilters && (
            <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:"1rem", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
              <MultiSelectDropdown label="Hearing Resolution ID" values={hearingResolutionId} onChange={setHearingResolutionId} options={filterOpts.hearingResolutionIds} />
              <MultiSelectDropdown label="Protest Code"          values={protestCode}         onChange={setProtestCode}         options={filterOpts.protestCodes} />
              <FilterSelect label="Protest Reason"    value={protestReason}    onChange={setProtestReason}   options={filterOpts.protestReasons} />
              <FilterSelect label="Hearing Finalized" value={hearingFinalized} onChange={setHearingFinalized} options={filterOpts.hearingFinalized} />
              <FilterSelect label="Hearing Status"    value={hearingStatus}    onChange={setHearingStatus}   options={filterOpts.hearingStatuses} />
              <MultiSelectDropdown label="Coded Status"  values={codedStatus}  onChange={setCodedStatus}  options={filterOpts.codedStatus} />
              <MultiSelectDropdown label="A of A Status" values={aofaStatus}   onChange={setAofaStatus}   options={filterOpts.aofaStatus} />
            </div>
          )}
        </div>

        {/* Count Bar */}
        {hasFetched && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.75rem" }}>
            <span style={{ fontSize:13, color:"#64748b" }}>
              {loading ? "Loading..." : `Showing ${hearings.length} of ${totalRecords.toLocaleString()} total records · Page ${page} of ${totalPages}`}
            </span>
            {!loading && hearings.length > 0 && (
              <span style={{ fontSize:11, color:"#94a3b8" }}>Click column header to sort · Scroll right for all columns</span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:"#fef2f2", color:"#dc2626", borderRadius:10, padding:"0.75rem 1rem", fontSize:13, marginBottom:"1rem", border:"1.5px solid #fecaca" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"4rem 0", color:"#94a3b8", fontSize:14 }}>⏳ Loading hearings...</div>
        )}

        {/* Initial state */}
        {!hasFetched && !loading && (
          <div style={{ textAlign:"center", padding:"4rem 0", color:"#94a3b8", fontSize:14 }}>
            🔍 Use filters above and click <strong>Search</strong> to load hearings.
          </div>
        )}

        {/* Table */}
        {!loading && !error && hearings.length > 0 && (
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)" }}>
                    <th style={{ padding:"10px 12px", color:"#a5b4fc", fontWeight:600, textAlign:"left", whiteSpace:"nowrap", position:"sticky", left:0, background:"#1e1b4b", zIndex:2, fontSize:11 }}>#</th>
                    {COLUMNS.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        style={{ padding:"10px 12px", color:"#e0e7ff", fontWeight:600, textAlign:"left", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none", fontSize:11 }}>
                        {col.label}{sortCol === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const bg      = getRowColor(row, i);
                    const hoverBg = getRowHoverColor(row);
                    return (
                      <tr key={i}
                        style={{ borderBottom:"1px solid #f1f5f9", background:bg }}
                        onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                        onMouseLeave={e => e.currentTarget.style.background = bg}>
                        <td style={{ padding:"7px 12px", color:"#94a3b8", fontWeight:500, whiteSpace:"nowrap", position:"sticky", left:0, background:"inherit", zIndex:1, fontSize:11 }}>
                          {(page-1) * PAGE_SIZE + i + 1}
                        </td>
                        {COLUMNS.map(col => (
                          <td key={col.key} style={{ padding:"7px 12px", color:"#334155", whiteSpace:"nowrap", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis" }}>
                            {formatDisplay(row[col.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && hasFetched && !error && hearings.length === 0 && (
          <div style={{ textAlign:"center", padding:"4rem 0", color:"#94a3b8", fontSize:14 }}>
            📭 No hearings found. Try different filters.
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:6, marginTop:"1.25rem", flexWrap:"wrap" }}>
            <button onClick={() => fetchHearings(1)}          disabled={page === 1}          style={paginationBtnStyle(page === 1)}>« First</button>
            <button onClick={() => fetchHearings(page - 1)}   disabled={page === 1}          style={paginationBtnStyle(page === 1)}>‹ Prev</button>
            {page > 3 && <span style={{ color:"#94a3b8", fontSize:13 }}>…</span>}
            {pageNumbers().map(p => (
              <button key={p} onClick={() => fetchHearings(p)} style={{
                padding:"6px 12px", borderRadius:8, fontSize:13, fontWeight: p === page ? 700 : 500,
                border: p === page ? "2px solid #4f46e5" : "1.5px solid #e2e8f0",
                background: p === page ? "#4f46e5" : "#fff",
                color: p === page ? "#fff" : "#475569", cursor:"pointer"
              }}>{p}</button>
            ))}
            {page < totalPages - 2 && <span style={{ color:"#94a3b8", fontSize:13 }}>…</span>}
            <button onClick={() => fetchHearings(page + 1)}   disabled={page === totalPages} style={paginationBtnStyle(page === totalPages)}>Next ›</button>
            <button onClick={() => fetchHearings(totalPages)}  disabled={page === totalPages} style={paginationBtnStyle(page === totalPages)}>Last »</button>
            <span style={{ fontSize:12, color:"#94a3b8", marginLeft:8 }}>{totalRecords.toLocaleString()} total records</span>
          </div>
        )}

      </div>
    </div>
  );
}
