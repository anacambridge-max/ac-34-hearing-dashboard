"use client";

import {useEffect,useMemo,useState} from "react";
import {jsPDF} from "jspdf";

const get=(k:string)=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get(k)||"";
const reasonText:Record<string,string>={
R01:"The elector did not appear before the undersigned on the notified date and time, and no document in support of the claim has been received till date.",
R02:"The elector appeared but did not produce any of the documents prescribed by the Election Commission of India in support of the claim.",
R03:"The elector appeared and produced the following document(s), which on scrutiny were found insufficient to establish linkage/eligibility, for the reason(s) recorded below:"
};
const dec=(v:string)=>{try{return decodeURIComponent(v.replace(/\+/g," "))}catch{return v}};

export default function RejectionPage(){
 const [pdfUrl,setPdfUrl]=useState("");
 const [error,setError]=useState("");
 const data=useMemo(()=>({
  reason:(get("reason")||"R01").toUpperCase(),
  name:dec(get("name")),epic:dec(get("epic")),serial:dec(get("serial")),ps:dec(get("ps")),
  date:dec(get("date")),time:dec(get("time")),venue:dec(get("venue")),officer:dec(get("officer"))
 }),[]);
 useEffect(()=>{
  let url="";
  try{
   const doc=new jsPDF({unit:"mm",format:"a4"});
   const left=22,width=166; let y=22;
   doc.setFont("times","bold");doc.setFontSize(14);doc.text("ORDER",105,y,{align:"center"});y+=12;
   doc.setFontSize(11);
   const fields=[["Elector Name",data.name],["EPIC No.",data.epic],["Serial No. / Part No.",data.serial+" / "+data.ps],["Hearing Date & Venue",data.date+"  "+data.time+"  "+data.venue]];
   fields.forEach(([k,v])=>{doc.setFont("times","bold");doc.text(k,left,y);doc.setFont("times","normal");doc.text(v||"—",70,y,{maxWidth:118});y+=7});
   y+=5;
   const para=(t:string)=>{const lines=doc.splitTextToSize(t,width);if(y+lines.length*5.2>270){doc.addPage();y=22}doc.text(lines,left,y,{lineHeightFactor:1.25});y+=lines.length*5.2+5};
   para("Whereas, in the course of the Special Intensive Revision of the electoral roll of the Assembly Constituency-34, Matiala, it was observed that the above elector's/relative's entry could not be linked with the electoral roll prepared during the previous Special Intensive Revision, and a notice under the SIR was accordingly issued to the elector requiring appearance before the undersigned, along with the documents prescribed by the Election Commission of India, to substantiate the claim for retention of the name in the electoral roll;");
   para("And whereas, on the date and at the venue so notified, the elector was afforded a reasonable opportunity of being heard, and upon such hearing it is recorded that:");
   (["R01","R02","R03"] as const).forEach(code=>{const lines=doc.splitTextToSize((code===data.reason?"☒ ":"☐ ")+reasonText[code],162);if(y+lines.length*5.2>270){doc.addPage();y=22}doc.text(lines,left+2,y,{lineHeightFactor:1.25});y+=lines.length*5.2+3});
   para("Now, therefore, in exercise of the powers vested under Section 22 of the Representation of the People Act, 1950, and having considered the material and, where applicable, the submissions made at the hearing, I am satisfied for the reason(s) recorded above that the claim of the elector for retention of the entry in the electoral roll of AC No. 34-Matiala is not established.");
   para("It is accordingly ORDERED that the entry relating to the above elector be deleted / not included in the electoral roll of AC No. 34-Matiala, subject to the right of appeal below.");
   doc.setFont("times","bold");doc.text("Right of Appeal:",left,y);y+=6;doc.setFont("times","normal");
   para("An appeal against this order lies under Section 24 of the Representation of the People Act, 1950, before the District Magistrate / designated appellate authority, within the period prescribed, along with the fee, if any, prescribed under the Registration of Electors Rules, 1960.");
   y=Math.min(y+10,255);doc.text("Date: ____________________    Place: New Delhi",left,y);y+=16;
   doc.setFont("times","bold");doc.text(data.officer||"HEARING OFFICER / ADDL. AERO",left,y);y+=6;doc.text("AC 34 – Matiala",left,y);
   url=URL.createObjectURL(doc.output("blob"));setPdfUrl(url);
  }catch(e){console.error(e);setError("Unable to generate this PDF.");}
  return()=>{if(url)URL.revokeObjectURL(url)};
 },[data]);
 return <main style={{fontFamily:"Arial,sans-serif",background:"#f4f5f7",minHeight:"100vh",padding:24}}>
  <div style={{maxWidth:1100,margin:"auto"}}>
   <div style={{background:"#fff",padding:"18px 22px",borderRadius:10,marginBottom:16}}>
    <h2 style={{margin:"0 0 8px"}}>AC-34 Matiala — Rejection Order</h2>
    <div><b>{data.reason}</b> · {data.name} · EPIC {data.epic} · PS {data.ps} · Serial {data.serial}</div>
    {error&&<p style={{color:"#b00020"}}>{error}</p>}
    {pdfUrl&&<a href={pdfUrl} download={`AC34_${data.epic||"Elector"}_${data.reason}_Rejection_Order.pdf`} style={{display:"inline-block",marginTop:12,padding:"10px 16px",background:"#111",color:"#fff",borderRadius:7,textDecoration:"none"}}>Download PDF</a>}
   </div>
   {pdfUrl?<iframe title="Rejection Order PDF" src={pdfUrl} style={{width:"100%",height:"78vh",border:"1px solid #ccc",background:"#fff"}}/>:<div style={{background:"#fff",padding:30}}>Generating PDF…</div>}
  </div>
 </main>
}
