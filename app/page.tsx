"use client";

import {useMemo,useState} from "react";
import * as XLSX from "xlsx";
import {FileSpreadsheet,Upload} from "lucide-react";

type SheetData={matrix:any[][]};
type Report=Record<string,SheetData>;

const show=(v:any)=>v===null||v===undefined?"":String(v);

function ExcelSheet({name,sheet}:{name:string;sheet:SheetData}){
  const rows=sheet.matrix||[];
  const maxCols=Math.max(1,...rows.map(r=>r?.length||0));
  const titleRow=rows.findIndex((r,i)=>i<3 && r.filter((x:any)=>show(x).trim()!=="").length===1);
  const headerRow=titleRow===0?1:(titleRow===1?1:rows.length>2?2:0);
  return <section className="sheetCard">
    <div className="sheetInfo"><b>{name}</b><span>{rows.length} rows × {maxCols} columns</span></div>
    <div className="sheetScroll">
      <table className="excelTable"><tbody>
        {rows.map((row,ri)=>{
          const title=ri===titleRow, header=ri===headerRow;
          const total=row.some((x:any)=>/total/i.test(show(x)));
          return <tr key={ri} className={title?"titleRow":header?"headerRow":total?"totalRow":""}>
            {Array.from({length:maxCols},(_,ci)=><td key={ci}>{show(row?.[ci])}</td>)}
          </tr>
        })}
      </tbody></table>
    </div>
  </section>;
}

export default function Page(){
  const [report,setReport]=useState<Report>({});
  const [active,setActive]=useState("Dashboard");
  const [fileName,setFileName]=useState("");
  const [search,setSearch]=useState("");

  async function upload(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file)return;
    const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
    const next:Report={};
    wb.SheetNames.forEach(name=>{
      next[name]={matrix:XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name],{header:1,defval:"",raw:true})};
    });
    setReport(next);
    setActive(wb.SheetNames.includes("Dashboard")?"Dashboard":(wb.SheetNames[0]||""));
    setFileName(file.name);
    setSearch("");
  }

  const sheets=Object.keys(report);
  const current=report[active];
  const filtered=useMemo(()=>{
    if(!current)return current;
    if(!search.trim())return current;
    const q=search.toLowerCase();
    return {matrix:current.matrix.filter((r:any[],i:number)=>i<3||r.some(v=>show(v).toLowerCase().includes(q)))};
  },[current,search]);

  return <main>
    <header className="topbar">
      <div>
        <div className="eyebrow">SIR-2026 • AC-34 MATIALA</div>
        <h1>Hearing Report Dashboard</h1>
        <div className="sub">Simple online version of the Excel workbook</div>
      </div>
      <label className="uploadBtn"><Upload size={17}/> Upload Excel
        <input type="file" accept=".xlsx,.xls" onChange={upload}/>
      </label>
    </header>

    <div className="fileBar">
      <FileSpreadsheet size={18}/>
      <b>{fileName||"No Excel file loaded"}</b>
      <span>Upload the same Excel report to view all sheets.</span>
      {current&&<input className="search" placeholder="Search current sheet..." value={search} onChange={e=>setSearch(e.target.value)}/>}
    </div>

    {sheets.length>0 ? <>
      <nav className="sheetTabs">
        {sheets.map(n=><button key={n} className={active===n?"active":""} onClick={()=>{setActive(n);setSearch("")}}>{n}</button>)}
      </nav>
      {filtered&&<ExcelSheet name={active} sheet={filtered}/>}
    </> : <div className="welcome">
      <FileSpreadsheet size={48}/>
      <h2>Upload the Excel report</h2>
      <p>Use <b>REPORT DATED 20.09.2026 4PM.xlsx</b>. The dashboard will show all 8 sheets as separate tabs:</p>
      <div className="sheetList">Dashboard • Part Wise Report • Supervisor Wise Report • Officer Wise Report • ECI Raw Data • BLO Doc Upload Raw Data • PS Mapping • Hearing Dates</div>
    </div>}
  </main>;
}
