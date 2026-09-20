# AC-34 Matiala SIR Hearing Dashboard

A Next.js dashboard for uploading the latest ECI report and the PS-wise "Documents Uploaded by BLO" report, then recalculating PS, officer, BLO and hearing views.

## Features
- ECI Excel upload
- BLO document Excel upload
- PS-wise document upload table
- Officer-wise performance
- Underperformer threshold control
- Hearing-held Officer + PS view
- PDF exports for all requested reports
- Client-side processing: uploaded spreadsheets are processed in the browser

## Run
```bash
npm install
npm run dev
```

## Deploy
Designed for Vercel/Next.js deployment.

## Expected column matching
The parser uses flexible header matching, including:
- PS No / Part No / Part Number
- Officer Name / Officer
- BLO Name / BLO
- Supervisor Name / Supervisor
- Hearing Notice Scheduled
- Documents Uploaded by BLO
- Hearing Status / Hearing Date / Hearing Centre
- Notice Generated / Notice Delivered

For best results, upload the same ECI/BLO report formats used by the AC-34 workflow.
