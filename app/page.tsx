"use client";

import {useEffect,useState} from "react";
import {generateRejectionPdf} from "../lib/rejectionPdf";

type RecordItem={p:string;e:string;s:string;n:string;d:string;t:string;r:string;v:string;o:string};
type DbRow={part:string;epic:string;serial_no:string;elector_name:string;hearing_date:string|null;hearing_time:string;hearing_ref:string;venue:string;officer:string};
type Slot={epic:string;elector:RecordItem|null;reason:string;loading:boolean;message:string};

const officers=["Sh. Parveen Kumar","Sh. Rakesh Kumar","Sh. Subhashish","Sh. Virender","Smt. Parul Gupta","Smt. Shashi Bala"];
const reasons=[
 {id:"R01",label:"R01 — Elector absent; no supporting document received"},
 {id:"R02",label:"R02 — Elector appeared but did not produce prescribed documents"},
 {id:"R03",label:"R03 — Documents produced were found insufficient / inadmissible"}
];
const SEARCH_URL="https://giqybxcoireaxidokqwf.supabase.co/functions/v1/sir-rejection-search";
const LOGIN_URL="https://giqybxcoireaxidokqwf.supabase.co/functions/v1/sir-officer-login";
const formatDate=(v:string)=>{if(!v)return "";const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"-"+m[2]+"-"+m[1]:v};
function mapRow(row:DbRow):RecordItem{return {p:String(row.part??""),e:String(row.epic??""),s:String(row.serial_no??""),n:String(row.elector_name??"").toUpperCase(),d:formatDate(String(row.hearing_date??"")),t:String(row.hearing_time??""),r:String(row.hearing_ref??""),v:String(row.venue??""),o:String(row.officer??"")};}
const emptySlot=():Slot=>({epic:"",elector:null,reason:"",loading:false,message:""});

export default function Page(){
 const [officer,setOfficer]=useState("");const [password,setPassword]=useState("");const [token,setToken]=useState("");
 const [slots,setSlots]=useState<Slot[]>(()=>Array.from({length:5},emptySlot));const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{setToken(sessionStorage.getItem("ac34_token")||"");setOfficer(sessionStorage.getItem("ac34_officer")||"");},[]);
 async function login(){setMessage("");if(!officer||!password){setMessage("Please select your Officer and enter the access code.");return;}setBusy(true);
  try{const res=await fetch(LOGIN_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({officer,password})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Invalid login");
   sessionStorage.setItem("ac34_token",data.token);sessionStorage.setItem("ac34_officer",data.officer);setToken(data.token);setOfficer(data.officer);setPassword("");
  }catch(e:any){setMessage(e.message||"Login failed.");}finally{setBusy(false);}
 }
 function logout(){sessionStorage.removeItem("ac34_token");sessionStorage.removeItem("ac34_officer");setToken("");setOfficer("");setSlots(Array.from({length:5},emptySlot));setMessage("");}
 function updateSlot(i:number,patch:Partial<Slot>){setSlots(prev=>prev.map((s,idx)=>idx===i?{...s,...patch}:s));}
 async function searchSlot(i:number){const q=slots[i].epic.trim().toUpperCase();if(!q){updateSlot(i,{message:"Enter EPIC No."});return;}updateSlot(i,{loading:true,elector:null,reason:"",message:""});
  try{const res=await fetch(SEARCH_URL+"?epic="+encodeURIComponent(q),{headers:{Authorization:"Bearer "+token}});const rows=(await res.json()) as DbRow[];if(res.status===401){logout();setMessage("Session expired. Please login again.");return;}if(!res.ok)throw new Error("Database search failed");
   const found=rows[0]?mapRow(rows[0]):undefined;if(!found){updateSlot(i,{message:"EPIC not found in your assigned records.",loading:false});return;}updateSlot(i,{elector:found,loading:false,message:""});
  }catch{updateSlot(i,{message:"Database connection error. Please try again.",loading:false});}
 }
 function clearSlot(i:number){updateSlot(i,{epic:"",elector:null,reason:"",message:""});}
 async function generateFive(){const ready=slots.filter(s=>s.elector&&s.reason);if(!ready.length){setMessage("Verify at least 1 EPIC and select a reason before generating.");return;}setMessage("");setBusy(true);
  try{for(let i=0;i<ready.length;i++){const s=ready[i];const e=s.elector!;const blob=generateRejectionPdf({reason:s.reason,name:e.n,epic:e.e,serial:e.s,ps:e.p,date:e.d,time:e.t,venue:e.v,officer:e.o});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`AC34_${e.e}_${s.reason}_Rejection_Order.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);if(i<ready.length-1)await new Promise(r=>setTimeout(r,700));}
   setMessage(`${ready.length} separate PDF order${ready.length===1?"":"s"} generated. Check your Downloads folder.`);}finally{setBusy(false);}
 }
 if(!token)return <main className="rejectHome"><div className="portalHeader"><div className="brand"><div className="crest">ECI</div><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Hearing & Rejection Order Module</h1><p>Authorised Hearing Officer / AERO • AC-34 MATIALA</p></div></div><div className="status">AUTHORISED ACCESS</div></div>
  <section className="panel"><div className="moduleTitle"><div className="moduleIcon">01</div><div><div className="moduleEyebrow">SECURE OFFICER ACCESS</div><h2>Officer Authentication</h2><p>Sign in with your authorised AC-34 Hearing Officer / AERO credentials.</p></div></div>
   <select value={officer} onChange={e=>setOfficer(e.target.value)}><option value="">— Select Officer —</option>{officers.map(x=><option key={x}>{x}</option>)}</select>
   <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Private access code" autoComplete="current-password" />
   {message&&<div className="alert">{message}</div>}<button className="generate" onClick={login} disabled={busy}>{busy?"AUTHENTICATING…":"LOGIN SECURELY"}</button>
  </section><footer>AC-34 Matiala • SIR-2026 • Authorised officer access only</footer></main>;
 return <main className="rejectHome"><div className="portalHeader"><div className="brand"><div className="crest">ECI</div><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Hearing & Rejection Order Module</h1><p><b>{officer.toUpperCase()}</b> • HEARING OFFICER / AERO, AC-34 MATIALA</p></div></div><div className="status"><button onClick={logout} style={{background:"transparent",border:"1px solid rgba(255,255,255,.5)",color:"#fff",padding:"8px 14px",borderRadius:7,cursor:"pointer"}}>LOG OUT</button></div></div>
  <section className="panel batchPanel"><div className="moduleTitle"><div className="moduleIcon">01</div><div><div className="moduleEyebrow">SIR-2026 • HEARING DISPOSAL</div><h2>Elector Verification & Rejection Order Generation</h2><p>Verify elector particulars and select the applicable reason for order generation.</p></div></div>
   <div className="batchGrid">{slots.map((s,i)=><div className="batchCard" key={i}><div className="slotTitle">ELECTOR {i+1}</div>
    <div className="searchRow"><input value={s.epic} onChange={e=>updateSlot(i,{epic:e.target.value.toUpperCase(),message:""})} onKeyDown={e=>e.key==="Enter"&&searchSlot(i)} placeholder="EPIC No."/><button onClick={()=>searchSlot(i)} disabled={s.loading}>{s.loading?"…":"VERIFY"}</button></div>
    {s.message&&<div className="slotAlert">{s.message}</div>}{s.elector&&<div className="miniDetails">
     <div><small>NAME</small><b>{s.elector.n}</b></div><div><small>EPIC</small><b>{s.elector.e}</b></div><div><small>PS / SERIAL</small><b>{s.elector.p} / {s.elector.s}</b></div><div><small>HEARING DATE</small><b>{s.elector.d}</b></div><div><small>HEARING TIME</small><b>{s.elector.t}</b></div><div className="full"><small>VENUE</small><b>{s.elector.v||"—"}</b></div>
    </div>}{s.elector&&<select value={s.reason} onChange={e=>updateSlot(i,{reason:e.target.value})}><option value="">— Select Reason —</option>{reasons.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}</select>}
    <button className="clearBtn" onClick={()=>clearSlot(i)}>CLEAR</button></div>)}</div>
   {message&&<div className="alert">{message}</div>}<button className="generate batchGenerate" disabled={busy||!slots.some(s=>s.elector&&s.reason)} onClick={generateFive}>{busy?"GENERATING PDFS…":`GENERATE ${slots.filter(s=>s.elector&&s.reason).length||""} REJECTION ORDER${slots.filter(s=>s.elector&&s.reason).length===1?"":"S"}`}</button>
  </section><footer>AC-34 Matiala • SIR-2026 • Authorised officer access only</footer></main>;
}
