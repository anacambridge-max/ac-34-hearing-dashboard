"use client";

import {useState} from "react";

type RecordItem={p:string;e:string;s:string;n:string;d:string;t:string;r:string;v:string;o:string};
const officers=["Sh. Parveen Kumar","Sh. Rakesh Kumar","Sh. Subhashish","Sh. Virender","Smt. Parul Gupta","Smt. Shashi Bala"];
const reasons=[
 {id:"R01",label:"R01 — Elector absent; no supporting document received"},
 {id:"R02",label:"R02 — Elector appeared but did not produce prescribed documents"},
 {id:"R03",label:"R03 — Documents produced were found insufficient / inadmissible"}
];

const SUPABASE_URL="https://giqybxcoireaxidokqwf.supabase.co";
const SUPABASE_KEY="sb_publishable_Xc6dmMjjOC7qv8t4ko_EDQ_-wmH3MNh";

async function searchRecord(epic:string, officer:string){
 const url=new URL(SUPABASE_URL+"/rest/v1/sir_rejection_records");
 url.searchParams.set("select","*");
 url.searchParams.set("epic","eq."+epic);
 url.searchParams.set("officer","eq."+officer);
 url.searchParams.set("limit","1");
 const res=await fetch(url.toString(),{headers:{apikey:SUPABASE_KEY}});
 if(!res.ok) throw new Error("Database search failed");
 const rows=await res.json();
 return rows[0] as RecordItem|undefined;
}

export default function Page(){
 const [officer,setOfficer]=useState("");
 const [epic,setEpic]=useState("");
 const [elector,setElector]=useState<RecordItem|null>(null);
 const [reason,setReason]=useState("");
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");

 async function findElector(){
  setMessage(""); setElector(null); setReason("");
  const q=epic.trim().toUpperCase();
  if(!officer){setMessage("Please select the Officer.");return;}
  if(!q){setMessage("Please enter the EPIC No.");return;}
  setLoading(true);
  try{
   const found=await searchRecord(q,officer);
   if(!found){
    setMessage("EPIC No. not found for the selected Officer.");
    return;
   }
   setElector(found);
  }catch{
   setMessage("Database connection error. Please try again.");
  }finally{setLoading(false);}
 }

 function generate(){
  if(!elector||!reason)return;
  const params=new URLSearchParams({
   reason,name:elector.n,epic:elector.e,serial:elector.s,ps:elector.p,
   date:elector.d,time:elector.t,venue:elector.v,officer:elector.o
  });
  window.location.href="/rejection?"+params.toString();
 }

 return <main className="rejectHome">
  <div className="portalHeader">
   <div className="brand">
    <div className="crest">ECI</div>
    <div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Rejection Order Portal</h1><p>Elector-wise online rejection order generation</p></div>
   </div>
   <div className="status">Secure master-data search • AC-34</div>
  </div>

  <section className="panel">
   <div className="step"><span>1</span><div><h2>Select Officer</h2><p>Select the concerned Hearing Officer / AERO.</p></div></div>
   <select value={officer} onChange={e=>{setOfficer(e.target.value);setElector(null);setMessage("");}}>
    <option value="">— Select Officer —</option>
    {officers.map(x=><option key={x}>{x}</option>)}
   </select>

   <div className="step"><span>2</span><div><h2>Enter EPIC No.</h2><p>Paste the elector's EPIC number and click Search.</p></div></div>
   <div className="searchRow">
    <input value={epic} onChange={e=>setEpic(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&findElector()} placeholder="e.g. WGO9877069" />
    <button onClick={findElector} disabled={loading}>{loading?"SEARCHING…":"SEARCH ELECTOR"}</button>
   </div>

   {message&&<div className="alert">{message}</div>}

   {elector&&<div className="electorCard">
    <div className="found"><span>✓</span> Elector Found</div>
    <div className="details">
     <div><small>Elector Name</small><b>{elector.n}</b></div>
     <div><small>EPIC No.</small><b>{elector.e}</b></div>
     <div><small>PS No.</small><b>{elector.p}</b></div>
     <div><small>Serial No.</small><b>{elector.s}</b></div>
     <div><small>Hearing Date</small><b>{elector.d}</b></div>
     <div><small>Hearing Time</small><b>{elector.t}</b></div>
    </div>
    <div className="venue"><small>Hearing Venue</small><b>{elector.v}</b></div>
   </div>}

   <div className="step"><span>3</span><div><h2>Select Rejection Reason</h2><p>Only the selected reason will appear as checked in the order.</p></div></div>
   <select value={reason} onChange={e=>setReason(e.target.value)} disabled={!elector}>
    <option value="">— Select Rejection Reason —</option>
    {reasons.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}
   </select>

   <button className="generate" disabled={!elector||!reason} onClick={generate}>GENERATE REJECTION ORDER</button>
  </section>
  <footer>AC-34 Matiala • SIR-2026 • For authorised office use</footer>
 </main>
}
