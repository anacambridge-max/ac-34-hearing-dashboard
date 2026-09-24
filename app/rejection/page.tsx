"use client";

import {useEffect,useMemo,useState} from "react";
import {jsPDF} from "jspdf";

const get=(k:string)=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get(k)||"";
const reasonText:Record<string,string>={
 R01:"The elector did not appear before the undersigned on the notified date and time, and no document in support of the claim has been received till date.",
 R02:"The elector appeared but did not produce any of the documents prescribed by the Election Commission of India in support of the claim.",
 R03:"The elector appeared and produced document(s), which on scrutiny were found insufficient to establish linkage/eligibility."
};
const dec=(v:string)=>{try{return decodeURIComponent(v.replace(/\+/g," "))}catch{return v}};
const formatDate=(v:string)=>{const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"-"+m[2]+"-"+m[1]:v};

export default function RejectionPage(){
 const [pdfUrl,setPdfUrl]=useState("");
 const [error,setError]=useState("");
 const [loaded,setLoaded]=useState(false);
 const data=useMemo(()=>({
  reason:(get("reason")||"R01").toUpperCase(),
  name:"",epic:dec(get("epic")).toUpperCase(),serial:"",ps:"",
  date:"",time:"",venue:"",officer:""
 }),[]);
 useEffect(()=>{
  let url="";
  async function build(){
   try{
    const token=sessionStorage.getItem("ac34_token");
    const loggedOfficer=sessionStorage.getItem("ac34_officer");
    if(!token||!loggedOfficer){setError("Secure login required. Please return to the portal and login.");return;}
    const res=await fetch("https://giqybxcoireaxidokqwf.supabase.co/functions/v1/sir-rejection-search?epic="+encodeURIComponent(data.epic),{headers:{Authorization:"Bearer "+token}});
    if(!res.ok){setError("This rejection order is not authorised for the logged-in officer.");return;}
    const rows=await res.json(); const row=rows[0];
    if(!row){setError("Elector record not found.");return;}
    const actual={...data,name:String(row.elector_name||"").toUpperCase(),serial:String(row.serial_no||""),ps:String(row.part||""),date:formatDate(String(row.hearing_date||"")),time:String(row.hearing_time||""),venue:String(row.venue||""),officer:String(row.officer||"")};
    if(actual.officer!==loggedOfficer){setError("Access denied: this elector belongs to another officer.");return;}
    setLoaded(true);
    const doc=new jsPDF({unit:"mm",format:"a4"});
    const left=18,width=174,valueX=70,valueWidth=122; let y=20;
    const ensureSpace=(needed:number)=>{if(y+needed>270){doc.addPage();y=20;return true}return false};
    const paragraph=(text:string,spacing=4.5)=>{doc.setFont("times","normal");doc.setFontSize(10.5);const lines=doc.splitTextToSize(text,width) as string[];ensureSpace(lines.length*5.1+spacing);lines.forEach((line:string,index:number)=>{const words=line.trim().split(/\s+/);const last=index===lines.length-1||words.length<2;if(last)doc.text(line,left,y);else{const baseSpace=doc.getTextWidth(" ");const wordWidths=words.reduce((sum,w)=>sum+doc.getTextWidth(w),0);const extra=(width-wordWidths-baseSpace*(words.length-1))/(words.length-1);let x=left;words.forEach((word:string,i:number)=>{doc.text(i<words.length-1?word+" ":word,x,y);x+=doc.getTextWidth(word)+baseSpace+(i<words.length-1?extra:0)})}y+=5.1});y+=spacing};
    doc.setFont("times","bold");doc.setFontSize(14);doc.text("ORDER",105,y,{align:"center"});y+=11;doc.setFontSize(11);
    const fields=[["Elector Name",actual.name],["EPIC No.",actual.epic],["Serial No. / Part No.",actual.serial+" / "+actual.ps]] as [string,string][];
    for(const [label,value] of fields){ensureSpace(8);doc.setFont("times","bold");doc.text(label,left,y);doc.setFont("times","normal");const lines=doc.splitTextToSize(value||"—",valueWidth);doc.text(lines,valueX,y,{lineHeightFactor:1.2});y+=Math.max(6,lines.length*5)+1.5}
    ensureSpace(22);doc.setFont("times","bold");doc.text("Hearing Date & Venue",left,y);doc.setFont("times","normal");const venueLines=doc.splitTextToSize([actual.date,actual.time].filter(Boolean).join("  ")+"  "+(actual.venue||"—"),valueWidth);doc.text(venueLines,valueX,y,{lineHeightFactor:1.2});y+=Math.max(venueLines.length*5,6)+6;
    paragraph("Whereas, in the course of the Special Intensive Revision of the electoral roll of the Assembly Constituency-34, Matiala, it was observed that the above elector's/relative's entry could not be linked with the electoral roll prepared during the previous Special Intensive Revision, and a notice under the SIR was accordingly issued to the elector requiring appearance before the undersigned, along with the documents prescribed by the Election Commission of India, to substantiate the claim for retention of the name in the electoral roll;");
    paragraph("And whereas, on the date and at the venue so notified, the elector was afforded a reasonable opportunity of being heard, and upon such hearing it is recorded that:");
    const selected=reasonText[actual.reason]||reasonText.R01;const reasonLines=doc.splitTextToSize(selected,width-9) as string[];ensureSpace(reasonLines.length*5.1+12);doc.setDrawColor(0,0,0);doc.setLineWidth(0.55);doc.rect(left+1,y-3.5,4,4);doc.line(left+1.7,y-1.5,left+2.7,y-0.35);doc.line(left+2.7,y-0.35,left+4.35,y-2.45);doc.setFont("times","bold");doc.setFontSize(10.5);
    reasonLines.forEach((line:string,index:number)=>{const words=line.trim().split(/\s+/);const last=index===reasonLines.length-1||words.length<2;if(last)doc.text(line,left+8,y);else{const target=width-9,baseSpace=doc.getTextWidth(" "),wordWidths=words.reduce((sum,w)=>sum+doc.getTextWidth(w),0),extra=(target-wordWidths-baseSpace*(words.length-1))/(words.length-1);let x=left+8;words.forEach((word:string,i:number)=>{doc.text(i<words.length-1?word+" ":word,x,y);x+=doc.getTextWidth(word)+baseSpace+(i<words.length-1?extra:0)})}y+=5.1});y+=8;
    paragraph("Now, therefore, in exercise of the powers vested under Section 22 of the Representation of the People Act, 1950, and having considered the material and, where applicable, the submissions made at the hearing, I am satisfied for the reason recorded above that the claim of the elector for retention of the entry in the electoral roll of AC No. 34-Matiala is not established.");
    paragraph("It is accordingly ORDERED that the entry relating to the above elector be deleted / not included in the electoral roll of AC No. 34-Matiala, subject to the right of appeal below.");
    ensureSpace(30);doc.setFont("times","bold");doc.setFontSize(10.5);doc.text("Right of Appeal:",left,y);y+=6;paragraph("An appeal against this order lies under Section 24 of the Representation of the People Act, 1950, before the District Magistrate / designated appellate authority, within the period prescribed, along with the fee, if any, prescribed under the Registration of Electors Rules, 1960.",4);
    const now=new Date(),generatedDate=String(now.getDate()).padStart(2,"0")+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+now.getFullYear();ensureSpace(35);y+=5;doc.setFont("times","normal");doc.text("Date: "+generatedDate,left,y);y+=18;doc.setFont("times","bold");doc.text(actual.officer,192,y,{align:"right"});y+=6;doc.text("AERO AC-34",192,y,{align:"right"});
    url=URL.createObjectURL(doc.output("blob"));setPdfUrl(url);
   }catch(e){console.error(e);setError("Unable to generate this PDF.")}}
  build(); return()=>{if(url)URL.revokeObjectURL(url)}
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
