"use client";

import {useState} from "react";
import * as XLSX from "xlsx";

const IMPORT_URL="https://giqybxcoireaxidokqwf.supabase.co/functions/v1/sir-rejection-import";
const IMPORT_KEY="AC34-SIR-IMPORT-2026";

export default function Import(){
 const [status,setStatus]=useState("Choose the master Excel file.");
 const [progress,setProgress]=useState(0);
 const [running,setRunning]=useState(false);

 async function run(file:File){
  setRunning(true);setProgress(0);
  try{
   setStatus("Reading Excel…");
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
   const ws=wb.Sheets[wb.SheetNames[0]];
   const raw=XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:""});
   const headers=raw[0].map((x:any)=>String(x).trim().toLowerCase());
   const find=(...names:string[])=>{const i=headers.findIndex((h:string)=>names.includes(h));return i};
   const ix={epic:find("epic no.","epic no","epic"),part:find("ps no.","ps no","part no.","part"),serial:find("serial no.","serial no","s.no.","serial"),name:find("name","elector name"),date:find("hearing date"),time:find("hearing time"),ref:find("hearing ref. no.","hearing ref no.","hearing ref"),venue:find("hearing centre","hearing center","hearing venue"),officer:find("officer name","officer")};
   if(ix.epic<0||ix.part<0||ix.name<0||ix.officer<0) throw new Error("Required columns not found. Use the AC-34 master Excel with EPIC, PS/Part, Name and Officer columns.");
   const records=raw.slice(1).map((r:any[])=>({
    epic:String(r[ix.epic]??"").trim().toUpperCase(),part:String(r[ix.part]??"").trim(),serial_no:String(ix.serial>=0?r[ix.serial]??"":"").trim(),
    elector_name:String(r[ix.name]??"").trim(),hearing_date:ix.date>=0?formatDate(r[ix.date]):null,hearing_time:String(ix.time>=0?r[ix.time]??"":"").trim(),
    hearing_ref:String(ix.ref>=0?r[ix.ref]??"":"").trim(),venue:String(ix.venue>=0?r[ix.venue]??"":"").trim(),officer:String(r[ix.officer]??"").trim()
   })).filter(x=>x.epic);
   const batch=500;let done=0;
   for(let i=0;i<records.length;i+=batch){
    const res=await fetch(IMPORT_URL,{method:"POST",headers:{"Content-Type":"application/json","x-import-key":IMPORT_KEY},body:JSON.stringify(records.slice(i,i+batch))});
    if(!res.ok) throw new Error("Batch failed: "+await res.text());
    done=Math.min(i+batch,records.length);setProgress(Math.round(done/records.length*100));setStatus("Imported "+done.toLocaleString("en-IN")+" / "+records.length.toLocaleString("en-IN"));
   }
   setStatus("IMPORT COMPLETE — "+done.toLocaleString("en-IN")+" records loaded.");
  }catch(e:any){setStatus("ERROR: "+(e?.message||"Import failed."));}
  finally{setRunning(false);}
 }
 return <main className="rejectHome"><div className="portalHeader"><div className="brand"><div className="crest">ECI</div><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Master Data Import</h1><p>One-time loading of AC-34 elector master</p></div></div></div><section className="panel"><h2>Upload Master Excel</h2><p>Select the Excel containing all 45,426 No-Mapping elector records.</p><label style={{display:"block",padding:"30px",border:"2px dashed #9aa9bd",borderRadius:14,textAlign:"center",cursor:running?"not-allowed":"pointer"}}><input type="file" accept=".xlsx,.xls" disabled={running} style={{display:"none"}} onChange={e=>e.target.files?.[0]&&run(e.target.files[0])}/><b>{running?"IMPORTING…":"TAP TO SELECT EXCEL"}</b></label><div style={{marginTop:20,height:12,background:"#e8edf3",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:progress+"%",background:"#1f5bd8"}}/></div><p style={{fontWeight:700}}>{status}</p></section><footer>AC-34 Matiala • SIR-2026 • One-time authorised import</footer></main>
}
function formatDate(v:any){if(!v)return null;if(v instanceof Date)return v.toISOString().slice(0,10);const s=String(v);const m=s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);return m?m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"):s}
