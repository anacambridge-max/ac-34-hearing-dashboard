"use client";

import {useEffect,useState} from "react";

type RecordItem={p:string;e:string;s:string;n:string;d:string;t:string;r:string;v:string;o:string};
type DbRow={part:string;epic:string;serial_no:string;elector_name:string;hearing_date:string|null;hearing_time:string;hearing_ref:string;venue:string;officer:string};

const officers=["Sh. Parveen Kumar","Sh. Rakesh Kumar","Sh. Subhashish","Sh. Virender","Smt. Parul Gupta","Smt. Shashi Bala"];
const reasons=[
 {id:"R01",label:"R01 — Elector absent; no supporting document received"},
 {id:"R02",label:"R02 — Elector appeared but did not produce prescribed documents"},
 {id:"R03",label:"R03 — Documents produced were found insufficient / inadmissible"}
];
const LOGIN_URL="https://giqybxcoireaxidokqwf.supabase.co/functions/v1/sir-officer-login";
const SEARCH_URL="https://giqybxcoireaxidokqwf.supabase.co/functions/v1/sir-rejection-search";

const formatDate=(v:string)=>{if(!v)return "";const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"-"+m[2]+"-"+m[1]:v};
function mapRow(row:DbRow):RecordItem{return {p:String(row.part??""),e:String(row.epic??""),s:String(row.serial_no??""),n:String(row.elector_name??"").toUpperCase(),d:formatDate(String(row.hearing_date??"")),t:String(row.hearing_time??""),r:String(row.hearing_ref??""),v:String(row.venue??""),o:String(row.officer??"")};}

export default function Page(){
 const [officer,setOfficer]=useState("");
 const [password,setPassword]=useState("");
 const [token,setToken]=useState("");
 const [epic,setEpic]=useState("");
 const [elector,setElector]=useState<RecordItem|null>(null);
 const [reason,setReason]=useState("");
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");

 useEffect(()=>{setToken(sessionStorage.getItem("ac34_token")||"");setOfficer(sessionStorage.getItem("ac34_officer")||"");},[]);

 async function login(){
  setMessage("");
  if(!officer||!password){setMessage("Please select your Officer and enter the access code.");return;}
  setLoading(true);
  try{
   const res=await fetch(LOGIN_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({officer,password})});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Invalid login");
   sessionStorage.setItem("ac34_token",data.token);sessionStorage.setItem("ac34_officer",data.officer);
   setToken(data.token);setOfficer(data.officer);setPassword("");
  }catch(e:any){setMessage(e.message||"Login failed.");}
  finally{setLoading(false);}
 }
 function logout(){sessionStorage.removeItem("ac34_token");sessionStorage.removeItem("ac34_officer");setToken("");setOfficer("");setElector(null);setEpic("");setReason("");setMessage("");}
 async function findElector(){
  setMessage("");setElector(null);setReason("");
  const q=epic.trim().toUpperCase();
  if(!q){setMessage("Please enter the EPIC No.");return;}
  setLoading(true);
  try{
   const res=await fetch(SEARCH_URL+"?epic="+encodeURIComponent(q),{headers:{Authorization:"Bearer "+token}});
   const rows=(await res.json()) as DbRow[];
   if(res.status===401){logout();setMessage("Session expired. Please login again.");return;}
   if(!res.ok)throw new Error("Database search failed");
   const found=rows[0]?mapRow(rows[0]):undefined;
   if(!found){setMessage("EPIC No. not found in your assigned records.");return;}
   setElector(found);
  }catch{setMessage("Database connection error. Please try again.");}
  finally{setLoading(false);}
 }
 function generate(){
  if(!elector||!reason)return;
  const params=new URLSearchParams({reason,name:elector.n,epic:elector.e,serial:elector.s,ps:elector.p,date:elector.d,time:elector.t,venue:elector.v,officer:elector.o});
  window.location.href="/rejection?"+params.toString();
 }

 if(!token)return <main className="rejectHome">
  <div className="portalHeader"><div className="brand"><div className="crest">ECI</div><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Rejection Order Portal</h1><p>Officer-secured access</p></div></div><div className="status">Private officer login</div></div>
  <section className="panel">
   <div className="step"><span>1</span><div><h2>Officer Login</h2><p>Select your officer account and enter your private access code.</p></div></div>
   <select value={officer} onChange={e=>setOfficer(e.target.value)}><option value="">— Select Officer —</option>{officers.map(x=><option key={x}>{x}</option>)}</select>
   <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Private access code" autoComplete="current-password" />
   {message&&<div className="alert">{message}</div>}
   <button className="generate" onClick={login} disabled={loading}>{loading?"AUTHENTICATING…":"LOGIN SECURELY"}</button>
  </section>
  <footer>AC-34 Matiala • SIR-2026 • Authorised officer access only</footer>
 </main>;

 return <main className="rejectHome">
  <div className="portalHeader"><div className="brand"><div className="crest">ECI</div><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Rejection Order Portal</h1><p>Logged in as <b>{officer}</b></p></div></div><div className="status"><button onClick={logout} style={{background:"transparent",border:"1px solid rgba(255,255,255,.5)",color:"#fff",padding:"8px 14px",borderRadius:7,cursor:"pointer"}}>LOG OUT</button></div></div>
  <section className="panel">
   <div className="step"><span>1</span><div><h2>Officer Account</h2><p>Your account is locked to <b>{officer}</b>. You cannot search another officer's records.</p></div></div>
   <div style={{padding:"14px 16px",background:"#eef7ff",borderRadius:10,fontWeight:700,color:"#173a63"}}>{officer}</div>
   <div className="step"><span>2</span><div><h2>Enter EPIC No.</h2><p>Search only within your assigned elector records.</p></div></div>
   <div className="searchRow"><input value={epic} onChange={e=>setEpic(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&findElector()} placeholder="e.g. WGO9877069" /><button onClick={findElector} disabled={loading}>{loading?"SEARCHING…":"SEARCH ELECTOR"}</button></div>
   {message&&<div className="alert">{message}</div>}
   {elector&&<div className="electorCard"><div className="found"><span>✓</span> Elector Found</div><div className="details">
    <div><small>Elector Name</small><b>{elector.n}</b></div><div><small>EPIC No.</small><b>{elector.e}</b></div><div><small>PS No.</small><b>{elector.p}</b></div><div><small>Serial No.</small><b>{elector.s}</b></div><div><small>Hearing Date</small><b>{elector.d}</b></div><div><small>Hearing Time</small><b>{elector.t}</b></div>
   </div><div className="venue"><small>Hearing Venue</small><b>{elector.v||"—"}</b></div></div>}
   <div className="step"><span>3</span><div><h2>Select Rejection Reason</h2><p>Only the selected reason will appear in the order.</p></div></div>
   <select value={reason} onChange={e=>setReason(e.target.value)} disabled={!elector}><option value="">— Select Rejection Reason —</option>{reasons.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}</select>
   <button className="generate" disabled={!elector||!reason} onClick={generate}>GENERATE REJECTION ORDER</button>
  </section>
  <footer>AC-34 Matiala • SIR-2026 • Authorised officer access only</footer>
 </main>
}
