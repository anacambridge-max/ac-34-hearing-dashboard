"use client";
import {useMemo,useState} from "react";
import * as XLSX from "xlsx";
import {FileSpreadsheet,Upload,RefreshCw,Download,Users,FileCheck2,CalendarCheck,AlertTriangle,Search} from "lucide-react";
import {jsPDF} from "jspdf";
import autoTable from "jspdf-autotable";

type Row=Record<string,any>;
const norm=(v:any)=>String(v??"").trim();
const num=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:0};
function findKey(row:Row,names:string[]){const keys=Object.keys(row);const low=keys.map(k=>k.toLowerCase().replace(/[^a-z0-9]/g,""));for(const n of names){const x=n.toLowerCase().replace(/[^a-z0-9]/g,"");const i=low.findIndex(k=>k===x||k.includes(x));if(i>=0)return keys[i]}return ""}

function parseWorkbook(file:File){return file.arrayBuffer().then(buf=>{const wb=XLSX.read(buf,{type:"array",cellDates:true});return wb.SheetNames.map(name=>({name,rows:XLSX.utils.sheet_to_json<Row>(wb.Sheets[name],{defval:""})}))})}

function downloadPdf(title:string,headers:string[],rows:any[][],filename:string){
 const doc=new jsPDF({orientation:headers.length>6?"landscape":"portrait",unit:"mm",format:"a4"});
 doc.setFontSize(16);doc.text(title,14,15);doc.setFontSize(8);doc.text("Generated: "+new Date().toLocaleString("en-IN"),14,21);
 autoTable(doc,{startY:26,head:[headers],body:rows.map(r=>r.map(x=>String(x??""))),styles:{fontSize:7,cellPadding:2},headStyles:{fillColor:[23,54,93]},alternateRowStyles:{fillColor:[242,242,242]}});
 doc.save(filename);
}

export default function Page(){
 const [eci,setEci]=useState<Row[]>([]),[blo,setBlo]=useState<Row[]>([]),[eciName,setEciName]=useState(""),[bloName,setBloName]=useState("");
 const [query,setQuery]=useState(""),[tab,setTab]=useState("overview"),[threshold,setThreshold]=useState(50);
 const [loading,setLoading]=useState(false);
 const ingest=async(setter:any,setName:any,e:any)=>{
   const f=e.target.files?.[0]; if(!f)return;
   setLoading(true);
   try{const sheets=await parseWorkbook(f);const preferred=sheets.find(s=>/eci|part|officer/i.test(s.name))||sheets[0];setter(preferred.rows);setName(f.name)}
   finally{setLoading(false)}
 };
 const data=useMemo(()=>{
   const pmEci:any[]=eci.map(r=>({ps:norm(r[findKey(r,["PS No","Part No","Part Number","PS"])]),officer:norm(r[findKey(r,["Officer Name","Officer"])]),blo:norm(r[findKey(r,["BLO Name","BLO"])]),supervisor:norm(r[findKey(r,["Supervisor Name","Supervisor"])]),scheduled:num(r[findKey(r,["Hearing Notice Scheduled","Scheduled","Notice Scheduled"])]),generated:num(r[findKey(r,["Total No Mapping Notices Generated","Notice Generated","Generated"])]),delivered:num(r[findKey(r,["Total No Mapping Notices Delivered","Notice Delivered","Delivered"])])}));
   const pmBlo:any[]=blo.map(r=>({ps:norm(r[findKey(r,["PS No","Part No","Part Number","PS"])]),docs:num(r[findKey(r,["Documents Uploaded by BLO","Documents Uploaded","BLO Documents","Docs Uploaded"])]),scheduled:num(r[findKey(r,["Hearing Notice Scheduled","Scheduled"])]),officer:norm(r[findKey(r,["Officer Name","Officer"])]),blo:norm(r[findKey(r,["BLO Name","BLO"])]),supervisor:norm(r[findKey(r,["Supervisor Name","Supervisor"])]),status:norm(r[findKey(r,["Hearing Status","Status"])]),date:norm(r[findKey(r,["Hearing Date","Date"])]),centre:norm(r[findKey(r,["Hearing Centre","Centre"])] )}));
   const byPs=new Map<string,any>();
   [...pmEci,...pmBlo].forEach(r=>{if(!r.ps)return;const x=byPs.get(r.ps)||{ps:r.ps,officer:r.officer,blo:r.blo,supervisor:r.supervisor,generated:r.generated||0,delivered:r.delivered||0,scheduled:r.scheduled||0,docs:0,status:r.status,date:r.date,centre:r.centre};Object.assign(x,{officer:x.officer||r.officer,blo:x.blo||r.blo,supervisor:x.supervisor||r.supervisor,generated:x.generated||r.generated||0,delivered:x.delivered||r.delivered||0,scheduled:x.scheduled||r.scheduled||0,status:x.status||r.status,date:x.date||r.date,centre:x.centre||r.centre,docs:Math.max(x.docs||0,r.docs||0)});byPs.set(r.ps,x)});
   return [...byPs.values()].map(x=>({...x,pct:x.scheduled?x.docs/x.scheduled:0,under:x.scheduled>0&&x.docs/x.scheduled<threshold/100,held:/held|completed|complete/i.test(x.status)}));
 },[eci,blo,threshold]);
 const filtered=data.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()));
 const kpis={ps:data.length,generated:data.reduce((a,r)=>a+r.generated,0),delivered:data.reduce((a,r)=>a+r.delivered,0),docs:data.reduce((a,r)=>a+r.docs,0),held:data.filter(r=>r.held).length,under:data.filter(r=>r.under).length,scheduled:data.reduce((a,r)=>a+r.scheduled,0)};
 const officer=useMemo(()=>{const m=new Map<string,any>();data.forEach(r=>{const k=r.officer||"Unmapped";const x=m.get(k)||{officer:k,ps:0,held:0,docs:0,scheduled:0};x.ps++;if(r.held)x.held++;x.docs+=r.docs;x.scheduled+=r.scheduled;m.set(k,x)});return [...m.values()].map(x=>({...x,pct:x.scheduled?x.docs/x.scheduled:0,hearingPct:x.ps?x.held/x.ps:0})).sort((a,b)=>b.pct-a.pct)},[data]);
 const under=data.filter(r=>r.under);
 const exportUnder=()=>downloadPdf("AC-34 MATIALA — UNDERPERFORMER BLO REPORT",["PS","BLO","Officer","Supervisor","Scheduled","Docs","Upload %"],under.map(r=>[r.ps,r.blo,r.officer,r.supervisor,r.scheduled,r.docs,(r.pct*100).toFixed(1)+"%"]),"Underperformer_BLO.pdf");
 const exportOfficer=()=>downloadPdf("AC-34 MATIALA — OFFICER-WISE HEARING COMPLETED",["Officer","PS Count","Held","Hearing %","Docs","Scheduled"],officer.map(r=>[r.officer,r.ps,r.held,(r.hearingPct*100).toFixed(1)+"%",r.docs,r.scheduled]),"Officer_Wise_Hearing_Held.pdf");
 const exportPS=()=>downloadPdf("AC-34 MATIALA — OFFICER-WISE / PS-WISE HEARING COMPLETED",["Officer","PS","BLO","Supervisor","Hearing Date","Centre"],data.filter(r=>r.held).map(r=>[r.officer,r.ps,r.blo,r.supervisor,r.date,r.centre]),"Officer_PS_Wise_Hearing_Held.pdf");
 const exportDocs=()=>downloadPdf("AC-34 MATIALA — PS-WISE DOCUMENTS UPLOADED BY BLO",["PS","Documents Uploaded by BLO"],data.map(r=>[r.ps,r.docs]),"PS_Wise_BLO_Documents.pdf");

 return <main>
  <header><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Hearing & BLO Performance Dashboard</h1><p>Upload the latest ECI report and BLO document report. All views recalculate automatically.</p></div><button className="ghost" onClick={()=>location.reload()}><RefreshCw size={16}/>Refresh</button></header>
  <section className="uploadGrid">
   <label className="upload"><FileSpreadsheet/><span><b>Upload ECI Report</b><small>{eciName||"Excel / XLSX • Part / Officer data"}</small></span><input type="file" accept=".xlsx,.xls,.csv" onChange={e=>ingest(setEci,setEciName,e)}/><Upload/></label>
   <label className="upload"><FileCheck2/><span><b>Upload BLO Documents Report</b><small>{bloName||"Excel / XLSX • PS + documents uploaded"}</small></span><input type="file" accept=".xlsx,.xls,.csv" onChange={e=>ingest(setBlo,setBloName,e)}/><Upload/></label>
  </section>
  <section className="toolbar"><div className="tabs">{["overview","ps","officer","underperformer","hearing"].map(t=><button className={tab===t?"active":""} onClick={()=>setTab(t)} key={t}>{t==="ps"?"PS Wise":t[0].toUpperCase()+t.slice(1)}</button>)}</div><div className="search"><Search size={16}/><input placeholder="Search PS, officer, BLO, supervisor..." value={query} onChange={e=>setQuery(e.target.value)}/></div></section>
  <section className="kpis">{[["Total PS",kpis.ps,Users],["Notices Generated",kpis.generated,FileSpreadsheet],["Notices Delivered",kpis.delivered,FileCheck2],["BLO Documents",kpis.docs,FileCheck2],["Hearing Held",kpis.held,CalendarCheck],["Underperformer PS",kpis.under,AlertTriangle]].map(([label,value,Icon])=><div className="card" key={label as string}><Icon size={19}/><span>{label}</span><strong>{value as number}</strong></div>)}</section>
  {tab==="overview"&&<><section className="panel"><div className="panelHead"><div><h2>Live Summary</h2><p>{data.length} PS currently loaded</p></div><div className="threshold">Underperformer threshold <input type="number" min="1" max="100" value={threshold} onChange={e=>setThreshold(Number(e.target.value)||50)}/>%</div></div><div className="progress"><div style={{width:Math.min(100,kpis.scheduled?100*kpis.docs/kpis.scheduled:0)+"%"}}/></div><div className="summaryline"><b>{kpis.scheduled?((100*kpis.docs/kpis.scheduled).toFixed(1)):0}%</b> document upload rate against scheduled hearing notices <span>{kpis.scheduled} scheduled</span></div></section><section className="panel"><h2>Officer-wise performance</h2><Table rows={officer} cols={["officer","ps","held","hearingPct","scheduled","docs","pct"]}/></section></>}
  {tab==="ps"&&<section className="panel"><h2>PS-wise Documents Uploaded by BLO</h2><Table rows={filtered} cols={["ps","docs","scheduled","pct","officer","blo","supervisor"]}/></section>}
  {tab==="officer"&&<section className="panel"><h2>Officer-wise performance</h2><Table rows={officer.filter(r=>String(r.officer).toLowerCase().includes(query.toLowerCase()))} cols={["officer","ps","held","hearingPct","scheduled","docs","pct"]}/></section>}
  {tab==="underperformer"&&<section className="panel"><div className="panelHead"><div><h2>Underperformer BLO / PS</h2><p>Below {threshold}% documents uploaded against scheduled notices</p></div><button className="download" onClick={exportUnder}><Download size={15}/> PDF</button></div><Table rows={under.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()))} cols={["ps","blo","officer","supervisor","scheduled","docs","pct"]}/></section>}
  {tab==="hearing"&&<section className="panel"><div className="panelHead"><div><h2>Hearing Completed — Officer / PS Wise</h2><p>Records identified as Hearing Held / Completed</p></div><button className="download" onClick={exportPS}><Download size={15}/> PDF</button></div><Table rows={data.filter(r=>r.held)} cols={["officer","ps","blo","supervisor","date","centre","status"]}/></section>}
  <section className="exports"><h2>Reports & PDFs</h2><button onClick={exportDocs}><Download/>PS-wise BLO Documents</button><button onClick={exportUnder}><Download/>Underperformer BLO</button><button onClick={exportOfficer}><Download/>Officer-wise Hearing Held</button><button onClick={exportPS}><Download/>Officer + PS-wise Hearing Held</button></section>
  {loading&&<div className="loading">Reading Excel…</div>}
 </main>
}
function Table({rows,cols}:{rows:any[],cols:string[]}){return <div className="tableWrap"><table><thead><tr>{cols.map(c=><th key={c}>{c==="pct"?"Upload %":c==="hearingPct"?"Hearing %":c}</th>)}</tr></thead><tbody>{rows.slice(0,500).map((r,i)=><tr key={i}>{cols.map(c=><td key={c}>{c==="pct"||c==="hearingPct"?((Number(r[c]||0)*100).toFixed(1)+"%"):String(r[c]??"")}</td>)}</tr>)}</tbody></table>{rows.length>500&&<div className="muted">Showing first 500 matching records.</div>}</div>}
