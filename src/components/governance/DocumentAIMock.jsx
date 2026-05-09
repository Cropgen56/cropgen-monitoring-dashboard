import React, { useState } from "react";
import { FileText, ScanLine } from "lucide-react";

const MOCK_712 = {
  docType: "7/12 extract",
  farmerName: "Sample Patil",
  surveyNumber: "SN-DEMO-2045-101",
  areaHa: "1.24",
  village: "Demo Village",
  taluka: "Demo Taluka",
  confidence: 0.91,
};

/**
 * OCR & document AI — upload UI with deterministic mock extraction (no backend).
 */
export default function DocumentAIMock() {
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  function runMockExtract(name) {
    setBusy(true);
    setResult(null);
    window.setTimeout(() => {
      setResult({
        ...MOCK_712,
        sourceFile: name || "upload.pdf",
        extractedAt: new Date().toISOString(),
      });
      setBusy(false);
    }, 900);
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-[#0a0a12] p-4 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <ScanLine className="h-5 w-5 text-violet-400" />
        <div>
          <p className="text-sm font-bold text-white">Document AI (OCR)</p>
          <p className="text-[10px] text-gray-500">
            7/12, Aadhaar, insurance, applications — demo extraction only
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-6 hover:border-violet-500/40 transition">
        <FileText className="h-8 w-8 text-violet-300/80 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-white">Drop or choose a document</p>
          <p className="text-[10px] text-gray-500 mt-0.5">PDF / image — processed locally (mock)</p>
        </div>
        <input
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f?.name || "");
            if (f) runMockExtract(f.name);
          }}
        />
      </label>

      {fileName && (
        <p className="mt-2 text-[10px] text-gray-400 truncate" title={fileName}>
          Selected: {fileName}
        </p>
      )}

      {busy && (
        <p className="mt-4 text-xs text-violet-200 animate-pulse">Extracting fields…</p>
      )}

      {result && !busy && (
        <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 text-xs space-y-1.5">
          <p className="font-bold text-violet-200 mb-2">Extracted (mock)</p>
          {Object.entries(result).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 text-[11px]">
              <span className="text-gray-500 shrink-0">{k}</span>
              <span className="text-gray-200 text-right break-all">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
