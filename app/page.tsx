"use client";

import {useEffect,useState} from "react";

type RecordItem={p:string;e:string;s:string;n:string;d:string;t:string;r:string;v:string;o:string};
const officers=["Sh. Parveen Kumar","Sh. Rakesh Kumar","Sh. Subhashish","Sh. Virender","Smt. Parul Gupta","Smt. Shashi Bala"];
const reasons=[
 {id:"R01",label:"R01 — Elector absent; no supporting document received"},
 {id:"R02",label:"R02 — Elector appeared but did not produce prescribed documents"},
 {id:"R03",label:"R03 — Documents produced were found insufficient / inadmissible"}
];

export default function Page(){
 const [data,setData]=useState<RecordItem[]>([]);
 const [officer,setOfficer]=useState("");
 const [epic,setEpic]=useState("");
 const [elector,setElector]=useState<RecordItem|null>(null);
 const [reason,setReason]=useState("");
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");

 useEffect(()=>{
  fetch("/rejection-records.json").then(r=>r.json()).then((x)=>setData(x)).catch(()=>setMessage("Master data could not be loaded.")).finally(()=>setLoading(false));
 },[]);

 function findElector(){
  setMessage(""); setElector(null); setReason("");
  const q=epic.trim().toUpperCase();
  if(!officer){setMessage("Please select the Officer.");return;}
  if(!q){setMessage("Please enter the EPIC No.");return;}
  const found=data.find(x=>x.e.toUpperCase()===q && x.o===officer);
  if(!found){
   const any=data.find(x=>x.e.toUpperCase()===q);
   setMessage(any ? "This EPIC is not assigned to the selected Officer." : "EPIC No. not found in the AC-34 master data.");
   return;
  }
  setElector(found);
 }

 function generate(){
  if(!elector||!reason)return;
  const params=new URLSearchParams({reason,...{name:elector.n,epic:elector.e,serial:elector.s,ps:elector.p,date:elector.d,time:elector.t,venue:elector.v,officer:elector.o}});
  window.location.href="/rejection?"+params.toString();
 }

 return <main className="rejectHome">
  <div className="portalHeader">
   <div className="brand">
    <div className="crest">ECI</div>
    <div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Rejection Order Portal</h1><p>Elector-wise online rejection order generation</p></div>
   </div>
   <div className="status">{loading?"Loading master data…":"Master data loaded • "+data.length.toLocaleString("en-IN")+" electors"}</div>
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
    <button onClick={findElector}>SEARCH ELECTOR</button>
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
