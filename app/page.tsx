"use client";

import {useMemo,useState} from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {FileSpreadsheet,Upload,RefreshCw,Download,Users,FileCheck2,CalendarCheck,AlertTriangle,Search,FileArchive} from "lucide-react";
import {jsPDF} from "jspdf";
import autoTable from "jspdf-autotable";

type Row=Record<string,any>;
type Sheet={name:string;rows:Row[];headers:string[]};

const norm=(v:any)=>String(v??"").trim();
const num=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const keyNorm=(v:any)=>norm(v).toLowerCase().replace(/[^a-z0-9]/g,"");

function findKey(row:Row,names:string[]){
  const keys=Object.keys(row);
  const exact=new Map(keys.map(k=>[keyNorm(k),k]));
  for(const n of names){const k=exact.get(keyNorm(n));if(k)return k}
  for(const n of names){
    const x=keyNorm(n);
    if(x.length<5) continue;
    const k=keys.find(k=>keyNorm(k).includes(x));
    if(k)return k;
  }
  return "";
}
function val(row:Row,names:string[]){const k=findKey(row,names);return k?row[k]:""}
function splitPerson(v:any){
  const s=norm(v);
  const m=s.match(/\(\s*([^()]+?)\s*\)\s*$/);
  if(!m)return {name:s,contact:""};
  return {name:s.slice(0,m.index).trim(),contact:m[1].trim()};
}

async function parseWorkbook(file:File):Promise<Sheet[]>{
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:"array",cellDates:true});
  return wb.SheetNames.map(name=>{
    const matrix:any[][]=XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name],{header:1,defval:""});
    let headerIndex=0,best=-1;
    matrix.slice(0,12).forEach((row,i)=>{
      const text=row.map((x:any)=>keyNorm(x)).join(" ");
      const score=(/psno|partno|partnumber/.test(text)?3:0)+(/officername|officerlookup|officer/.test(text)?2:0)+(/supervisorname|supervisorlookup|supervisor/.test(text)?2:0)+(/documentsuploadedbyblo/.test(text)?4:0)+(/hearingstatus/.test(text)?3:0)+(/noticedelivered/.test(text)?2:0)+(/noticegenerated/.test(text)?2:0);
      if(score>best){best=score;headerIndex=i}
    });
    const rawHeader=matrix[headerIndex]||[];
    const headers=rawHeader.map((h:any,i:number)=>norm(h)||`Column ${i+1}`);
    const rows=matrix.slice(headerIndex+1).filter(r=>r.some((x:any)=>norm(x))).map(r=>{
      const o:Row={};headers.forEach((h:string,i:number)=>o[h]=r[i]??"");return o;
    });
    return {name,rows,headers};
  });
}
function scoreSheet(s:Sheet,type:"eci"|"blo"){
  const ks=s.headers.map(keyNorm).join(" ");
  if(type==="blo"){
    return (ks.includes("documentsuploadedbyblo")?60:0)+(ks.includes("psno")?30:0)+(ks.includes("officerlookup")?20:0)+(ks.includes("supervisorlookup")?20:0)+(ks.includes("hearingnoticescheduled")?5:0)+Math.min(10,Math.floor(s.rows.length/100));
  }
  return (ks.includes("partno")?35:0)+(ks.includes("hearingstatus")?35:0)+(ks.includes("officername")?20:0)+(ks.includes("bloname")?20:0)+(ks.includes("blosupervisorname")?20:0)+(ks.includes("noticedelivered")?15:0)+(ks.includes("noticegenerated")?10:0)+(ks.includes("hearingdates")?10:0)+Math.min(10,Math.floor(s.rows.length/100));
}
function chooseSheet(sheets:Sheet[],type:"eci"|"blo"){
  return [...sheets].sort((a,b)=>scoreSheet(b,type)-scoreSheet(a,type))[0]||{name:"",rows:[],headers:[]};
}
function pct(v:number){return (v*100).toFixed(2)+"%"}
function dateText(v:any){
  if(v instanceof Date && !isNaN(v.getTime())) return v.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).replaceAll(" ","-");
  return norm(v);
}
function filenameSafe(v:string){return v.replace(/[^a-z0-9._-]+/gi,"_").replace(/^_+|_+$/g,"")}

function makePdf(title:string,meta:string,headers:string[],rows:any[][],opts:{landscape?:boolean;redHeader?:boolean;percentCols?:number[];statusCol?:number;total?:any[]}={}){
  const doc=new jsPDF({orientation:opts.landscape===false?"portrait":"landscape",unit:"mm",format:"a4"});
  const navy=[31,56,100] as [number,number,number], red=[174,0,0] as [number,number,number], green=[198,239,206] as [number,number,number], lightRed=[252,221,221] as [number,number,number];
  doc.setTextColor(...navy);doc.setFontSize(16);doc.setFont("helvetica","bold");doc.text(title,14,14);
  doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text(meta,14,21);
  autoTable(doc,{
    startY:25,head:[headers],body:rows.map(r=>r.map(x=>String(x??""))),
    theme:"grid",
    styles:{fontSize:7,cellPadding:1.7,lineColor:[205,205,205],lineWidth:.15,textColor:[25,25,25],valign:"middle"},
    headStyles:{fillColor:opts.redHeader?red:navy,textColor:[255,255,255],fontStyle:"bold",halign:"center"},
    alternateRowStyles:{fillColor:[247,247,247]},
    didParseCell:(d:any)=>{
      if(d.section==="body" && opts.percentCols?.includes(d.column.index)){
        const raw=String(d.cell.raw??"").replace("%","");
        const n=parseFloat(raw);
        d.cell.styles.fillColor=n<50?lightRed:n<75?[255,242,204]:[198,239,206];
      }
      if(d.section==="body" && opts.statusCol!==undefined && d.column.index===opts.statusCol){
        d.cell.styles.fillColor=green;
        d.cell.styles.halign="center";
      }
    }
  });
  if(opts.total){
    const y=(doc as any).lastAutoTable.finalY+3;
    autoTable(doc,{startY:y,body:[opts.total.map(x=>String(x??""))],theme:"grid",styles:{fontSize:7,fontStyle:"bold",fillColor:[255,192,0],cellPadding:1.8},columnStyles:Object.fromEntries(headers.map((_,i)=>[i,{halign:i===0?"left":"center"}]))});
  }
  return doc;
}
function savePdf(doc:jsPDF,name:string){doc.save(name)}

export default function Page(){
  const [eci,setEci]=useState<Row[]>([]);
  const [blo,setBlo]=useState<Row[]>([]);
  const [eciName,setEciName]=useState("");
  const [bloName,setBloName]=useState("");
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState("overview");
  const [threshold,setThreshold]=useState(50);
  const [selectedOfficer,setSelectedOfficer]=useState("");
  const [loading,setLoading]=useState(false);

  const ingest=async(setter:(r:Row[])=>void,setName:(s:string)=>void,e:React.ChangeEvent<HTMLInputElement>,type:"eci"|"blo")=>{
    const file=e.target.files?.[0];if(!file)return;
    setLoading(true);
    try{const sheets=await parseWorkbook(file);const chosen=chooseSheet(sheets,type);setter(chosen.rows);setName(file.name);}
    finally{setLoading(false);}
  };

  const data=useMemo(()=>{
    const eciRows=eci.map(r=>{
      const op=splitPerson(val(r,["Officer Name","Officer"]));
      const bp=splitPerson(val(r,["BLO Name","BLO Name ","BLO"]));
      const sp=splitPerson(val(r,["BLO Supervisor Name","Supervisor Name","Supervisor"]));
      return {ps:norm(val(r,["PS No","Part No","Part Number","Part"])),officer:op.name,officerContact:op.contact,blo:bp.name,bloContact:bp.contact,supervisor:sp.name,supervisorContact:sp.contact,centre:norm(val(r,["Hearing Centre","Centre"])),generated:num(val(r,["Notice Generated (NO MAP + ANOMALLY)","Notice Generated","NO MAPPING NOTICE GENERATED","Generated"])),scheduled:num(val(r,["Hearing Notice Scheduled NO MAPPING","Hearing Notice Sched. (NM)","Hearing Notice Scheduled","Scheduled"])),delivered:num(val(r,["Notice Delivered","NO MAP NOTICE DELIVERED","Delivered"])),docs:num(val(r,["Documents Uploaded by BLO","Docs Uploaded"])),date:norm(val(r,["Hearing Date(s)","Hearing Date","Date"])),status:norm(val(r,["Hearing Status","Status"]))};
    });
    const bloRows=blo.map(r=>{
      const op=splitPerson(val(r,["Officer (lookup)","Officer Name","Officer"]));
      const bp=splitPerson(val(r,["BLO Name","BLO"]));
      const sp=splitPerson(val(r,["Supervisor (lookup)","Supervisor Name","Supervisor"]));
      return {ps:norm(val(r,["PS No","Part No","Part Number"])),officer:op.name,officerContact:op.contact,blo:bp.name,bloContact:bp.contact,supervisor:sp.name,supervisorContact:sp.contact,centre:norm(val(r,["Hearing Centre","Centre"])),generated:0,scheduled:num(val(r,["Hearing Notice Scheduled","Hearing Notice Sched. (NM)","Scheduled"])),delivered:num(val(r,["Notice Delivered","Delivered"])),docs:num(val(r,["Documents Uploaded by BLO","Docs Uploaded"])),date:"",status:""};
    });
    const m=new Map<string,any>();
    [...eciRows,...bloRows].forEach(r=>{
      if(!r.ps)return;
      const x=m.get(r.ps)||{ps:r.ps,officer:"",officerContact:"",blo:"",bloContact:"",supervisor:"",supervisorContact:"",centre:"",generated:0,scheduled:0,delivered:0,docs:0,date:"",status:""};
      x.officer=x.officer||r.officer;x.officerContact=x.officerContact||r.officerContact;x.blo=x.blo||r.blo;x.bloContact=x.bloContact||r.bloContact;x.supervisor=x.supervisor||r.supervisor;x.supervisorContact=x.supervisorContact||r.supervisorContact;x.centre=x.centre||r.centre;
      x.generated=x.generated||r.generated;x.scheduled=x.scheduled||r.scheduled;x.delivered=x.delivered||r.delivered;x.docs=Math.max(x.docs||0,r.docs||0);
      x.date=x.date||r.date;x.status=x.status||r.status;m.set(r.ps,x);
    });
    return [...m.values()].map(x=>({...x,pct:x.delivered?x.docs/x.delivered:0,held:/hearing\s*held|completed|complete/i.test(x.status)})).sort((a,b)=>Number(a.ps)-Number(b.ps));
  },[eci,blo]);

  const officers=useMemo(()=>[...new Set(data.map(r=>r.officer).filter(Boolean))].sort(),[data]);
  const currentOfficer=selectedOfficer||officers[0]||"";
  const officerData=data.filter(r=>r.officer===currentOfficer);
  const filtered=data.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()));

  const officerSummary=useMemo(()=>officers.map(name=>{
    const rows=data.filter(r=>r.officer===name);
    const held=rows.filter(r=>r.held);
    const scheduled=rows.reduce((a,r)=>a+r.scheduled,0),docs=rows.reduce((a,r)=>a+r.docs,0);
    return {officer:name,officerContact:rows[0]?.officerContact||"",ps:rows.length,held:held.length,scheduled,delivered:rows.reduce((a,r)=>a+r.delivered,0),docs,pct:scheduled?docs/scheduled:0,hearingPct:rows.length?held.length/rows.length:0};
  }),[data,officers]);

  const kpis={ps:data.length,generated:data.reduce((a,r)=>a+r.generated,0),delivered:data.reduce((a,r)=>a+r.delivered,0),docs:data.reduce((a,r)=>a+r.docs,0),held:data.filter(r=>r.held).length,under:data.filter(r=>r.delivered>0&&r.pct<threshold/100).length,scheduled:data.reduce((a,r)=>a+r.scheduled,0)};

  const underperformers=useMemo(()=>data.filter(r=>r.held&&r.delivered>0&&r.pct<threshold/100).sort((a,b)=>a.pct-b.pct),[data,threshold]);
  const officerUnder=useMemo(()=>officerData.filter(r=>r.held&&r.delivered>0).sort((a,b)=>a.pct-b.pct).slice(0,5),[officerData]);
  const supervisorUnder=useMemo(()=>{
    const m=new Map<string,any>();
    officerData.forEach(r=>{
      const s=r.supervisor||"Unmapped";const x=m.get(s)||{supervisor:s,held:0,total:0,generated:0,delivered:0,docs:0,seenHeld:new Set<string>()};
      x.total++;x.generated+=r.generated;x.delivered+=r.delivered;x.docs+=r.docs;
      if(r.held)x.seenHeld.add(r.ps);m.set(s,x);
    });
    return [...m.values()].map(x=>({...x,held:x.seenHeld.size,pct:x.delivered?x.docs/x.delivered:0})).filter(x=>x.delivered>0).sort((a,b)=>a.pct-b.pct).slice(0,5);
  },[officerData]);

  const hearingRows=officerData.filter(r=>r.held).sort((a,b)=>Number(a.ps)-Number(b.ps));
  const exportOfficerWise=()=>{
    const rows=officerSummary.map(r=>[r.officer,r.officerContact,r.ps,r.scheduled,r.delivered,pct(r.scheduled?r.delivered/r.scheduled:0),r.docs,pct(r.delivered?r.docs/r.delivered:0),r.held,pct(r.hearingPct)]);
    const totals=["TOTAL","",officerSummary.reduce((a,r)=>a+r.ps,0),officerSummary.reduce((a,r)=>a+r.scheduled,0),officerSummary.reduce((a,r)=>a+r.delivered,0),pct(officerSummary.reduce((a,r)=>a+r.delivered,0)/Math.max(1,officerSummary.reduce((a,r)=>a+r.scheduled,0))),officerSummary.reduce((a,r)=>a+r.docs,0),pct(officerSummary.reduce((a,r)=>a+r.docs,0)/Math.max(1,officerSummary.reduce((a,r)=>a+r.delivered,0))),officerSummary.reduce((a,r)=>a+r.held,0),""]);
    const doc=makePdf("AC-34 MATIALA — SIR-2026 : OFFICER WISE HEARING / BLO PERFORMANCE REPORT", "Total Officers: "+officerSummary.length+"  |  Total Parts (PS): "+data.length+"  |  Report generated: "+new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),["Officer Name","Officer Contact","No. of PS","Hearing Notice Scheduled","Notice Delivered","% Notice Delivered","Documents Uploaded by BLO","% Docs Uploaded","Hearing Held","Hearing %"],rows,{percentCols:[5,7,9],total:totals});
    savePdf(doc,"AC34_Officer_Wise_Report.pdf");
  };

  const exportOfficerHearing=(name:string)=>{
    const rows=data.filter(r=>r.officer===name&&r.held).sort((a,b)=>Number(a.ps)-Number(b.ps));
    const body=rows.map((r,i)=>[i+1,r.ps,r.blo,r.bloContact,r.supervisor,r.supervisorContact,r.generated,r.scheduled,r.delivered,pct(r.delivered?r.delivered/r.scheduled:0),r.docs,pct(r.delivered?r.docs/r.delivered:0),r.date,"Hearing Held"]);
    const totals=["TOTAL","","","","","",rows.reduce((a,r)=>a+r.generated,0),rows.reduce((a,r)=>a+r.scheduled,0),rows.reduce((a,r)=>a+r.delivered,0),pct(rows.reduce((a,r)=>a+r.delivered,0)/Math.max(1,rows.reduce((a,r)=>a+r.scheduled,0))),rows.reduce((a,r)=>a+r.docs,0),pct(rows.reduce((a,r)=>a+r.docs,0)/Math.max(1,rows.reduce((a,r)=>a+r.delivered,0))),"",""];
    const doc=makePdf("AC-34 MATIALA — SIR-2026 : PART WISE / PS WISE HEARING REPORT (HEARING ALREADY HELD)",`Officer: ${name}  |  Total Parts (PS): ${rows.length}  |  Report generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`,["S.No","Part No.","BLO Name","BLO Contact","Supervisor Name","Supervisor Contact","Notice Generated","Hearing Notice Sched. (NM)","Notice Delivered","% Notice Delivered","Docs Uploaded","% Docs Uploaded","Hearing Date(s)","Hearing Status"],body,{percentCols:[9,11],statusCol:13,total:totals});
    const y=(doc as any).lastAutoTable.finalY+10;doc.setFontSize(8);doc.setTextColor(70);doc.text(`Hearing Held: ${rows.length}  |  Hearing Pending: 0  |  Partially Held: 0  |  No Hearing Scheduled: 0`,14,y);
    savePdf(doc,`${filenameSafe(name)}_Part_Wise_Report_HearingHeld.pdf`);
  };
  const exportOfficerUnder=(name:string)=>{
    const rows=data.filter(r=>r.officer===name&&r.held&&r.delivered>0).sort((a,b)=>a.pct-b.pct).slice(0,5);
    const sups=new Map<string,any>();
    data.filter(r=>r.officer===name).forEach(r=>{const s=r.supervisor||"Unmapped";const x=sups.get(s)||{supervisor:s,heldSet:new Set<string>(),total:0,generated:0,delivered:0,docs:0};x.total++;x.generated+=r.generated;x.delivered+=r.delivered;x.docs+=r.docs;if(r.held)x.heldSet.add(r.ps);sups.set(s,x)});
    const supRows=[...sups.values()].map(x=>({...x,held:x.heldSet.size,pct:x.delivered?x.docs/x.delivered:0})).filter(x=>x.delivered>0).sort((a,b)=>a.pct-b.pct).slice(0,5);
    const body=rows.map(r=>[r.ps,r.blo,r.bloContact,r.supervisor,r.supervisorContact,r.generated,r.delivered,pct(r.delivered?r.delivered/r.generated:0),r.docs,pct(r.delivered?r.docs/r.delivered:0),`Hearing Held\n(${r.date})`]);
    const supBody=supRows.map(r=>[r.supervisor,r.held,r.total,r.generated,r.delivered,pct(r.delivered?r.delivered/r.generated:0),r.docs,pct(r.delivered?r.docs/r.delivered:0)]);
    const doc=makePdf("AC-34 MATIALA — SIR-2026 : UNDERPERFORMANCE REPORT (BLO / SUPERVISOR) — HEARING ALREADY HELD",`Officer: ${name}  |  Total Parts (PS): ${data.filter(r=>r.officer===name).length}  |  Report generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`,["Part No.","BLO Name","BLO Contact","Supervisor Name","Supervisor Contact","NO MAPPING NOTICE GENERATED","Notice Delivered","% Notice Delivered","Docs Uploaded","% Docs Uploaded","Hearing Status (Date(s))"],body,{redHeader:true,percentCols:[7,9],statusCol:10});
    let y=(doc as any).lastAutoTable.finalY+6;
    doc.setTextColor(174,0,0);doc.setFontSize(10);doc.setFont("helvetica","bold");doc.text("■ TOP 5 UNDERPERFORMING SUPERVISORS — Hearing Already Held (lowest weighted % Docs Uploaded across their BLOs)",14,y);y+=4;
    autoTable(doc,{startY:y,head:[["Supervisor Name","BLOs (Hearing Held)","Total BLOs (PS, all)","NO MAPPING NOTICE GENERATED","Notice Delivered","% Notice Delivered","Docs Uploaded","% Docs Uploaded"]],body:supBody,theme:"grid",styles:{fontSize:7,cellPadding:1.7,lineColor:[205,205,205],textColor:[25,25,25]},headStyles:{fillColor:[174,0,0],textColor:[255,255,255],fontStyle:"bold",halign:"center"},alternateRowStyles:{fillColor:[252,238,238]},didParseCell:(d:any)=>{if(d.section==="body"&&(d.column.index===5||d.column.index===7)){const n=parseFloat(String(d.cell.raw).replace("%",""));d.cell.styles.fillColor=n<50?[252,221,221]:n<75?[255,242,204]:[234,246,234]}}});
    y=(doc as any).lastAutoTable.finalY+5;doc.setFontSize(7);doc.setFont("helvetica","normal");doc.setTextColor(80);doc.text("Note: This report is restricted to PS whose hearing has ALREADY BEEN HELD (Hearing Status = \"Hearing Held\") and which had at least one Notice Delivered. Underperforming is based on lowest % Documents Uploaded (Documents Uploaded by BLO / Notice Delivered) among completed-hearing PS/Supervisors.",14,y,{maxWidth:270});
    savePdf(doc,`${filenameSafe(name)}_Underperforming_BLO_Supervisor_HearingHeld.pdf`);
  };
  const downloadZip=async(type:"hearing"|"under")=>{
    const zip=new JSZip();
    for(const name of officers){
      const original=(jsPDF.prototype as any).save;
      let blob:Blob|null=null;
      const rows=data.filter(r=>r.officer===name&&r.held);
      if(type==="hearing"){
        const body=rows.sort((a,b)=>Number(a.ps)-Number(b.ps)).map((r,i)=>[i+1,r.ps,r.blo,r.bloContact,r.supervisor,r.supervisorContact,r.generated,r.scheduled,r.delivered,pct(r.scheduled?r.delivered/r.scheduled:0),r.docs,pct(r.delivered?r.docs/r.delivered:0),r.date,"Hearing Held"]);
        const totals=["TOTAL","","","","","",rows.reduce((a,r)=>a+r.generated,0),rows.reduce((a,r)=>a+r.scheduled,0),rows.reduce((a,r)=>a+r.delivered,0),"",rows.reduce((a,r)=>a+r.docs,0),"","",""];
        const doc=makePdf("AC-34 MATIALA — SIR-2026 : PART WISE / PS WISE HEARING REPORT (HEARING ALREADY HELD)",`Officer: ${name}  |  Total Parts (PS): ${rows.length}  |  Report generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`,["S.No","Part No.","BLO Name","BLO Contact","Supervisor Name","Supervisor Contact","Notice Generated","Hearing Notice Sched. (NM)","Notice Delivered","% Notice Delivered","Docs Uploaded","% Docs Uploaded","Hearing Date(s)","Hearing Status"],body,{percentCols:[9,11],statusCol:13,total:totals});
        blob=doc.output("blob");zip.file(`${filenameSafe(name)}_Part_Wise_Report_HearingHeld.pdf`,blob);
      }else{
        const rows2=data.filter(r=>r.officer===name&&r.held&&r.delivered>0).sort((a,b)=>a.pct-b.pct).slice(0,5);
        const body=rows2.map(r=>[r.ps,r.blo,r.bloContact,r.supervisor,r.supervisorContact,r.generated,r.delivered,pct(r.generated?r.delivered/r.generated:0),r.docs,pct(r.delivered?r.docs/r.delivered:0),`Hearing Held\n(${r.date})`]);
        const doc=makePdf("AC-34 MATIALA — SIR-2026 : UNDERPERFORMANCE REPORT (BLO / SUPERVISOR) — HEARING ALREADY HELD",`Officer: ${name}  |  Total Parts (PS): ${data.filter(r=>r.officer===name).length}  |  Report generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`,["Part No.","BLO Name","BLO Contact","Supervisor Name","Supervisor Contact","NO MAPPING NOTICE GENERATED","Notice Delivered","% Notice Delivered","Docs Uploaded","% Docs Uploaded","Hearing Status (Date(s))"],body,{redHeader:true,percentCols:[7,9],statusCol:10});
        blob=doc.output("blob");zip.file(`${filenameSafe(name)}_Underperforming_BLO_Supervisor_HearingHeld.pdf`,blob);
      }
    }
    const blob=await zip.generateAsync({type:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=type==="hearing"?"AC34_All_Officer_HearingHeld_Reports.zip":"AC34_All_Officer_Underperformance_Reports.zip";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };

  const exportDocs=()=>{const rows=data.map(r=>[r.ps,r.officer,r.officerContact,r.blo,r.bloContact,r.supervisor,r.supervisorContact,r.delivered,r.docs,pct(r.delivered?r.docs/r.delivered:0)]);const doc=makePdf("AC-34 MATIALA — PS-WISE DOCUMENTS UPLOADED BY BLO",`Total Parts (PS): ${data.length}  |  Report generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`,["PS","Officer Name","Officer Contact","BLO Name","BLO Contact","Supervisor Name","Supervisor Contact","Notice Delivered","Docs Uploaded","% Docs Uploaded"],rows,{percentCols:[9]});savePdf(doc,"AC34_PS_Wise_BLO_Documents.pdf")};

  return <main>
    <header><div><div className="eyebrow">SIR-2026 • AC-34 MATIALA</div><h1>Hearing & BLO Performance Dashboard</h1><p>Latest ECI + BLO reports • officer, supervisor, PS and hearing reports update automatically.</p></div><button className="ghost" onClick={()=>location.reload()}><RefreshCw size={16}/>Refresh</button></header>
    <section className="uploadGrid">
      <label className="upload"><FileSpreadsheet/><span><b>Upload ECI Report</b><small>{eciName||"Excel / XLSX • Part-wise / hearing data"}</small></span><input type="file" accept=".xlsx,.xls,.csv" onChange={e=>ingest(setEci,setEciName,e,"eci")}/><Upload/></label>
      <label className="upload"><FileCheck2/><span><b>Upload BLO Documents Report</b><small>{bloName||"Excel / XLSX • PS-wise documents uploaded"}</small></span><input type="file" accept=".xlsx,.xls,.csv" onChange={e=>ingest(setBlo,setBloName,e,"blo")}/><Upload/></label>
    </section>
    <section className="toolbar"><div className="tabs">{["overview","ps","officer","underperformer","hearing"].map(t=><button className={tab===t?"active":""} onClick={()=>setTab(t)} key={t}>{t==="ps"?"PS Wise":t[0].toUpperCase()+t.slice(1)}</button>)}</div><div className="search"><Search size={16}/><input placeholder="Search PS, officer, BLO, supervisor..." value={query} onChange={e=>setQuery(e.target.value)}/></div></section>
    <section className="kpis">{[["Total PS",kpis.ps,Users],["Notices Generated",kpis.generated,FileSpreadsheet],["Notices Delivered",kpis.delivered,FileCheck2],["BLO Documents",kpis.docs,FileCheck2],["Hearing Held",kpis.held,CalendarCheck],["Underperformer PS",kpis.under,AlertTriangle]].map(([label,value,Icon])=><div className="card" key={String(label)}><Icon size={19}/><span>{label}</span><strong>{value as number}</strong></div>)}</section>

    {tab==="overview"&&<><section className="panel"><div className="panelHead"><div><h2>Live Summary</h2><p>{data.length} PS currently loaded</p></div><div className="threshold">Underperformer threshold <input type="number" min="1" max="100" value={threshold} onChange={e=>setThreshold(Number(e.target.value)||50)}/>%</div></div><div className="progress"><div style={{width:Math.min(100,kpis.delivered?100*kpis.docs/kpis.delivered:0)+"%"}}/></div><div className="summaryline"><b>{kpis.delivered?pct(kpis.docs/kpis.delivered):"0.00%"}</b> document upload rate against delivered notices <span>{kpis.delivered} delivered</span></div></section><section className="panel"><div className="panelHead"><div><h2>Officer-wise performance</h2><p>Same officer names used in the source reports.</p></div></div><Table rows={officerSummary} cols={["officer","officerContact","ps","held","hearingPct","scheduled","delivered","docs","pct"]}/></section></>}

    {tab==="ps"&&<section className="panel"><h2>PS-wise Documents Uploaded by BLO</h2><Table rows={filtered} cols={["ps","officer","officerContact","blo","bloContact","supervisor","supervisorContact","delivered","docs","pct","date","status"]}/></section>}

    {tab==="officer"&&<section className="panel"><div className="panelHead"><div><h2>Officer-wise performance</h2><p>Download the same officer-wise PDF reports as the source format.</p></div><select value={currentOfficer} onChange={e=>setSelectedOfficer(e.target.value)}>{officers.map(o=><option key={o}>{o}</option>)}</select></div><Table rows={officerSummary.filter(r=>String(r.officer).toLowerCase().includes(query.toLowerCase()))} cols={["officer","officerContact","ps","held","hearingPct","scheduled","delivered","docs","pct"]}/><div className="reportActions"><button className="download" onClick={()=>exportOfficerHearing(currentOfficer)}><Download size={15}/> Selected Officer — Hearing Held PDF</button><button className="download" onClick={()=>exportOfficerUnder(currentOfficer)}><Download size={15}/> Selected Officer — Underperformance PDF</button><button className="download" onClick={()=>downloadZip("hearing")}><FileArchive size={15}/> All Officer Hearing PDFs (ZIP)</button><button className="download" onClick={()=>downloadZip("under")}><FileArchive size={15}/> All Officer Underperformance PDFs (ZIP)</button><button className="download" onClick={exportOfficerWise}><FileArchive size={15}/> Officer-wise Full Report PDF</button></div></section>}

    {tab==="underperformer"&&<section className="panel"><div className="panelHead"><div><h2>Underperformer BLO / PS — Hearing Already Held</h2><p>Restricted to hearing-held PS with at least one notice delivered, matching the source report logic.</p></div><div className="reportActions"><button className="download" onClick={()=>exportOfficerUnder(currentOfficer)}><Download size={15}/> Current Officer PDF</button><button className="download" onClick={()=>downloadZip("under")}><FileArchive size={15}/> All Officers ZIP</button></div></div><Table rows={underperformers.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()))} cols={["ps","officer","officerContact","blo","bloContact","supervisor","supervisorContact","generated","delivered","pct","docs","date"]}/></section>}

    {tab==="hearing"&&<section className="panel"><div className="panelHead"><div><h2>Hearing Completed — Officer / PS Wise</h2><p>Same part-wise structure as the uploaded Hearing Held reports.</p></div><div className="reportActions"><button className="download" onClick={()=>exportOfficerHearing(currentOfficer)}><Download size={15}/> Current Officer PDF</button><button className="download" onClick={()=>downloadZip("hearing")}><FileArchive size={15}/> All Officers ZIP</button></div></div><Table rows={hearingRows.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()))} cols={["ps","officer","officerContact","blo","bloContact","supervisor","supervisorContact","generated","scheduled","delivered","docs","pct","date","status"]}/></section>}

    <section className="exports"><h2>Reports & PDFs</h2><button onClick={exportDocs}><Download/>PS-wise BLO Documents</button><button onClick={()=>exportOfficerUnder(currentOfficer)}><Download/>Underperformance — Current Officer</button><button onClick={()=>exportOfficerHearing(currentOfficer)}><Download/>Hearing Held — Current Officer</button><button onClick={()=>downloadZip("under")}><FileArchive/>All Underperformance PDFs ZIP</button><button onClick={()=>downloadZip("hearing")}><FileArchive/>All Hearing Held PDFs ZIP</button><button onClick={exportOfficerWise}><FileArchive/>Officer-wise Full Report PDF</button></section>
    {loading&&<div className="loading">Reading Excel…</div>}
  </main>
}

function Table({rows,cols}:{rows:any[],cols:string[]}){
  return <div className="tableWrap"><table><thead><tr>{cols.map(c=><th key={c}>{(({pct:"Upload %",hearingPct:"Hearing %",generated:"Notice Generated",delivered:"Notice Delivered",docs:"Docs Uploaded",scheduled:"Hearing Sched. (NM)",ps:"PS",officer:"Officer Name",officerContact:"Officer Contact",blo:"BLO Name",bloContact:"BLO Contact",supervisor:"Supervisor Name",supervisorContact:"Supervisor Contact",held:"Hearing Held"}) as any)[c]||c}</th>)}</tr></thead><tbody>{rows.slice(0,1000).map((r,i)=><tr key={i}>{cols.map(c=>{const v=r[c];const isP=c==="pct"||c==="hearingPct";const n=Number(v||0);return <td className={isP?(n<.5?"bad":n<.75?"warn":"good"):c==="status"&&r.held?"good":""} key={c}>{isP?pct(n):String(v??"")}</td>})}</tr>)}</tbody></table>{rows.length>1000&&<div className="muted">Showing first 1000 matching records.</div>}</div>
}