"use client";

import {useEffect, useMemo, useState} from "react";
import {jsPDF} from "jspdf";

const p = (key:string) => new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get(key) || "";

const reasonText:Record<string,string> = {
  R01:"The elector did not appear before the undersigned on the notified date and time, and no document in support of the claim has been received till date.",
  R02:"The elector appeared but did not produce any of the documents prescribed by the Election Commission of India in support of the claim.",
  R03:"The elector appeared and produced the following document(s), which on scrutiny were found insufficient to establish linkage/eligibility, for the reason(s) recorded below:"
};

function safe(v:string){return decodeURIComponent(v.replace(/\+/g," "));}

export default function RejectionPage(){
  const [status,setStatus]=useState("Preparing rejection order PDF...");
  const [pdfUrl,setPdfUrl]=useState("");
  const data=useMemo(()=>({
    reason:p("reason").toUpperCase() || "R01",
    name:safe(p("name")),
    epic:safe(p("epic")),
    serial:safe(p("serial")),
    ps:safe(p("ps")),
    date:safe(p("date")),
    time:safe(p("time")),
    venue:safe(p("venue")),
    officer:safe(p("officer"))
  }),[]);

  useEffect(()=>{
    try{
      const doc=new jsPDF({unit:"mm",format:"a4"});
      const left=22, right=188, width=166;
      let y=22;
      doc.setFont("times","bold"); doc.setFontSize(14);
      doc.text("ORDER",105,y,{align:"center"}); y+=12;

      doc.setFont("times","normal"); doc.setFontSize(11);
      const fields=[
        ["Elector Name",data.name],["EPIC No.",data.epic],
        ["Serial No. / Part No.",`${data.serial} / ${data.ps}`],
        ["Hearing Date & Venue",`${data.date}  ${data.time}  ${data.venue}`]
      ];
      fields.forEach(([k,v])=>{
        doc.setFont("times","bold"); doc.text(k, left,y);
        doc.setFont("times","normal"); doc.text(v||"—",70,y,{maxWidth:118}); y+=7;
      });
      y+=5;

      const paras=[
        "Whereas, in the course of the Special Intensive Revision of the electoral roll of the Assembly Constituency-34, Matiala, it was observed that the above elector's/relative's entry could not be linked with the electoral roll prepared during the previous Special Intensive Revision, and a notice under the SIR was accordingly issued to the elector requiring appearance before the undersigned, along with the documents prescribed by the Election Commission of India, to substantiate the claim for retention of the name in the electoral roll;",
        "And whereas, on the date and at the venue so notified, the elector was afforded a reasonable opportunity of being heard, and upon such hearing it is recorded that:"
      ];
      const addPara=(t:string)=>{
        const lines=doc.splitTextToSize(t,width);
        if(y+lines.length*5.2>270){doc.addPage();y=22;}
        doc.text(lines,left,y,{lineHeightFactor:1.25}); y+=lines.length*5.2+5;
      };
      paras.forEach(addPara);

      const checks=[
        ["R01",reasonText.R01],["R02",reasonText.R02],["R03",reasonText.R03]
      ];
      checks.forEach(([code,text])=>{
        const mark=code===data.reason?"☒":"☐";
        const lines=doc.splitTextToSize(mark+" "+text,width-4);
        if(y+lines.length*5.2>270){doc.addPage();y=22;}
        doc.text(lines,left+2,y,{lineHeightFactor:1.25}); y+=lines.length*5.2+3;
      });

      addPara("Now, therefore, in exercise of the powers vested under Section 22 of the Representation of the People Act, 1950, and having considered the material and, where applicable, the submissions made at the hearing, I am satisfied for the reason(s) recorded above that the claim of the elector for retention of the entry in the electoral roll of AC No. 34-Matiala is not established.");
      addPara("It is accordingly ORDERED that the entry relating to the above elector be deleted / not included in the electoral roll of AC No. 34-Matiala, subject to the right of appeal below.");
      doc.setFont("times","bold"); doc.text("Right of Appeal:",left,y); y+=6;
      doc.setFont("times","normal");
      addPara("An appeal against this order lies under Section 24 of the Representation of the People Act, 1950, before the District Magistrate / designated appellate authority, within the period prescribed, along with the fee, if any, prescribed under the Registration of Electors Rules, 1960.");

      y=Math.min(y+10,255);
      doc.text("Date: ____________________    Place: New Delhi",left,y);
      y+=16;
      doc.setFont("times","bold"); doc.text(data.officer||"HEARING OFFICER / ADDL. AERO",left,y);
      y+=6; doc.text("AC 34 – Matiala",left,y);

      const blob=doc.output("blob");
      const url=URL.createObjectURL(blob);
      setPdfUrl(url);
      setStatus("PDF generated successfully.");
      window.open(url,"_blank","noopener,noreferrer");
      return ()=>URL.revokeObjectURL(url);
    }catch(e){console.error(e);setStatus("PDF generation failed. Use Download PDF below.");}
  },[data]);

  return <main style={{fontFamily:"Arial,sans-serif",padding:40,maxWidth:800,margin:"auto"}}>
    <h2>AC-34 Matiala — Rejection Order Generator</h2>
    <p>{status}</p>
    <div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
      <b>{data.reason}</b> — {data.name} — EPIC {data.epic}
    </div>
    {pdfUrl && <a href={pdfUrl} download={`AC34_${data.epic||"Elector"}_${data.reason}_Rejection_Order.pdf`} style={{display:"inline-block",marginTop:20,padding:"12px 18px",background:"#111",color:"#fff",borderRadius:8,textDecoration:"none"}}>Download PDF</a>}
  </main>;
}
