import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Info } from "lucide-react";
import * as XLSX from "xlsx";

export interface ImportedActuals {
  product: string;
  quarter: string;
  renewal: number;
  expansion: number;
  netNew: number;
  rowCount: number;
}

interface ColumnMapping {
  productCol: string;
  quarterCol: string;
  categoryCol: string;
  valueCol: string;
  clientCol: string;
}

interface ProductMapping {
  nuro: string;
  accessHub: string;
  evidenceHub: string;
}

interface CategoryMapping {
  renewal: string;
  expansion: string;
  netNew: string;
  renewalExpansion: string;
}

const DEFAULT_PRODUCT_MAPPING: ProductMapping = {
  nuro: "Nuro",
  accessHub: "Access Hub",
  evidenceHub: "Evidence Hub",
};

const DEFAULT_CATEGORY_MAPPING: CategoryMapping = {
  renewal: "Renewal",
  expansion: "Expansion",
  netNew: "New",
  renewalExpansion: "Renewal&Expansion",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (actuals: ImportedActuals[]) => void;
}

type Step = "upload" | "map" | "preview";

export default function ExcelImportPanel({ open, onClose, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [colMap, setColMap] = useState<ColumnMapping>({
    productCol: "",
    quarterCol: "",
    categoryCol: "",
    valueCol: "",
    clientCol: "",
  });

  const [productMap, setProductMap] = useState<ProductMapping>(DEFAULT_PRODUCT_MAPPING);
  const [catMap, setCatMap] = useState<CategoryMapping>(DEFAULT_CATEGORY_MAPPING);

  const [preview, setPreview] = useState<ImportedActuals[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  function reset() {
    setStep("upload");
    setFileName("");
    setColumns([]);
    setRawRows([]);
    setParseError(null);
    setColMap({ productCol: "", quarterCol: "", categoryCol: "", valueCol: "", clientCol: "" });
    setProductMap(DEFAULT_PRODUCT_MAPPING);
    setCatMap(DEFAULT_CATEGORY_MAPPING);
    setPreview([]);
    setImportWarnings([]);
  }

  function handleFile(file: File) {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Read raw headers first (row 1) so we capture multi-line / special chars
        const rawHeaders: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false }) as string[][];
        if (!rawHeaders.length) { setParseError("Sheet appears to be empty."); return; }

        // Flatten multi-line header cells: replace newlines and trim whitespace
        const headerRow = rawHeaders[0].map((h: any) =>
          String(h ?? "").replace(/[\r\n]+/g, " ").trim()
        );

        // Build rows using the cleaned headers
        const dataRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        // Remap rows using cleaned headers
        const rawKeyMap: Record<string, string> = {}; // original key -> cleaned key
        if (dataRows.length > 0) {
          Object.keys(dataRows[0]).forEach((origKey, idx) => {
            rawKeyMap[origKey] = headerRow[idx] ?? origKey;
          });
        }
        const rows: Record<string, any>[] = dataRows.map(row => {
          const cleaned: Record<string, any> = {};
          Object.entries(row).forEach(([k, v]) => {
            cleaned[rawKeyMap[k] ?? k] = v;
          });
          return cleaned;
        });

        if (!rows.length) { setParseError("No data rows found in the first sheet."); return; }

        // Use cleaned headers as column list
        const cols = headerRow.filter(h => h !== "");
        setColumns(cols);
        setRawRows(rows);
        setFileName(file.name);

        // Auto-detect columns by fuzzy match against cleaned headers
        function best(hints: string[]): string {
          for (const hint of hints) {
            const found = cols.find(c => c.toLowerCase().includes(hint.toLowerCase()));
            if (found) return found;
          }
          return "";
        }
        setColMap({
          productCol: best(["Product Type", "Product"]),
          quarterCol: best(["Quarter win", "Quarter"]),
          categoryCol: best(["Client Type", "Client Type "]),
          valueCol: best(["ARR - MGMT", "ARR", "Value"]),
          clientCol: best(["Client company", "Client", "Company"]),
        });

        setStep("map");
      } catch (err: any) {
        setParseError("Could not parse file: " + (err.message ?? "Unknown error"));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function buildPreview() {
    const warnings: string[] = [];
    const agg: Record<string, Record<string, { renewal: number; expansion: number; netNew: number; count: number }>> = {};

    const PRODUCT_MAP: Record<string, string> = {
      [productMap.nuro.toLowerCase()]: "Nuro",
      [productMap.accessHub.toLowerCase()]: "Access Hub",
      [productMap.evidenceHub.toLowerCase()]: "Evidence Hub",
    };

    function normalizeQuarter(raw: string): string | null {
      const s = String(raw).toUpperCase().trim();
      const m = s.match(/Q[1-4]/);
      return m ? m[0] : null;
    }

    let skipped = 0;
    rawRows.forEach((row) => {
      const rawProduct = String(row[colMap.productCol] ?? "").trim().toLowerCase();
      const product = PRODUCT_MAP[rawProduct];
      const quarter = normalizeQuarter(String(row[colMap.quarterCol] ?? ""));
      const rawCat = String(row[colMap.categoryCol] ?? "").trim();
      const rawVal = parseFloat(String(row[colMap.valueCol] ?? "0").replace(/[^0-9.\-]/g, "")) || 0;

      if (!product || !quarter) { skipped++; return; }

      if (!agg[product]) agg[product] = {};
      if (!agg[product][quarter]) agg[product][quarter] = { renewal: 0, expansion: 0, netNew: 0, count: 0 };

      const bucket = agg[product][quarter];
      const catLower = rawCat.toLowerCase();

      if (catLower === catMap.renewalExpansion.toLowerCase()) {
        // Split 50/50 or treat as renewal; we'll put it in renewal
        bucket.renewal += rawVal * 0.5;
        bucket.expansion += rawVal * 0.5;
      } else if (catLower === catMap.renewal.toLowerCase()) {
        bucket.renewal += rawVal;
      } else if (catLower === catMap.expansion.toLowerCase()) {
        bucket.expansion += rawVal;
      } else if (catLower === catMap.netNew.toLowerCase()) {
        bucket.netNew += rawVal;
      } else {
        skipped++;
        return;
      }

      bucket.count++;
    });

    if (skipped > 0) warnings.push(`${skipped} rows skipped (unrecognised product, quarter, or category).`);

    const results: ImportedActuals[] = [];
    Object.entries(agg).forEach(([product, quarters]) => {
      Object.entries(quarters).forEach(([quarter, vals]) => {
        results.push({ product, quarter, ...vals, rowCount: vals.count });
      });
    });

    results.sort((a, b) => {
      if (a.product < b.product) return -1;
      if (a.product > b.product) return 1;
      return a.quarter.localeCompare(b.quarter);
    });

    setPreview(results);
    setImportWarnings(warnings);
    setStep("preview");
  }

  function confirmImport() {
    onImport(preview);
    reset();
    onClose();
  }

  const fmt = (n: number) => n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(1)}K`
    : `$${n.toFixed(0)}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-gray-800 font-bold text-base">Import from Excel</h2>
              <p className="text-gray-400 text-xs">Upload your revenue file to populate actuals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step !== "upload" && (
              <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-100 bg-white shrink-0">
          {(["upload", "map", "preview"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                step === s ? "bg-violet-100 text-violet-700" : step === "preview" && s === "map" ? "text-emerald-600" : step !== "upload" && s === "upload" ? "text-emerald-600" : "text-gray-400"
              }`}>
                {((step === "preview" && s !== "preview") || (step === "map" && s === "upload")) ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-current/10 text-[10px]">{i + 1}</span>
                )}
                {s === "upload" ? "Upload" : s === "map" ? "Map Columns" : "Preview & Import"}
              </div>
              {i < 2 && <ArrowRight className="w-3 h-3 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Step 1: Upload ─────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-violet-600 transition-colors" />
                </div>
                <div className="text-center">
                  <div className="text-gray-700 font-semibold text-sm">Drop your Excel file here</div>
                  <div className="text-gray-400 text-xs mt-1">or click to browse · .xlsx and .xls supported</div>
                </div>
                <div className="text-[11px] text-gray-400 text-center max-w-xs">
                  The first sheet will be read. Ensure your data has column headers in row 1.
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {parseError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Expected columns</div>
                <ul className="space-y-1 text-blue-600 list-disc list-inside">
                  <li><span className="font-medium">Product Type</span> — Nuro / Access Hub / Evidence Hub</li>
                  <li><span className="font-medium">Quarter win</span> — Q1 FY26, Q2 FY26… or just Q1, Q2…</li>
                  <li><span className="font-medium">Client Type</span> — Renewal / Expansion / New / Renewal&Expansion</li>
                  <li><span className="font-medium">ARR - MGMT reporting</span> — numeric ARR value</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Step 2: Column Mapping ─────────────────────────────────── */}
          {step === "map" && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span><span className="font-semibold">{fileName}</span> loaded — {rawRows.length} rows, {columns.length} columns</span>
              </div>

              <div>
                <h3 className="text-gray-700 font-bold text-sm mb-3">Column mapping</h3>
                <p className="text-gray-400 text-xs mb-4">Confirm which Excel column maps to each field. Columns are auto-detected but you can adjust.</p>
                <div className="space-y-3">
                  {([
                    { key: "productCol", label: "Product Type", hint: "Which product line" },
                    { key: "quarterCol", label: "Quarter won", hint: "Q1, Q2, Q3, Q4" },
                    { key: "categoryCol", label: "Client Type / Category", hint: "Renewal, Expansion, New…" },
                    { key: "valueCol", label: "ARR / Revenue value", hint: "Numeric ARR column" },
                    { key: "clientCol", label: "Client company", hint: "Used for display only" },
                  ] as { key: keyof ColumnMapping; label: string; hint: string }[]).map(({ key, label, hint }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <div className="text-xs font-semibold text-gray-700">{label}</div>
                        <div className="text-[11px] text-gray-400">{hint}</div>
                      </div>
                      <select
                        value={colMap[key]}
                        onChange={(e) => setColMap(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                      >
                        <option value="">— skip —</option>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-gray-700 font-bold text-sm mb-1">Product name matching</h3>
                <p className="text-gray-400 text-xs mb-3">Enter the exact text used in your Excel for each product (case-insensitive).</p>
                <div className="space-y-2">
                  {([
                    { key: "nuro", label: "Nuro" },
                    { key: "accessHub", label: "Access Hub" },
                    { key: "evidenceHub", label: "Evidence Hub" },
                  ] as { key: keyof ProductMapping; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs font-semibold text-gray-600">{label} →</span>
                      <input
                        type="text"
                        value={productMap[key]}
                        onChange={(e) => setProductMap(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                        placeholder={`e.g. ${label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-gray-700 font-bold text-sm mb-1">Category name matching</h3>
                <p className="text-gray-400 text-xs mb-3">Enter the exact text used in your Excel for each revenue category.</p>
                <div className="space-y-2">
                  {([
                    { key: "renewal", label: "ER (Renewal)" },
                    { key: "expansion", label: "EN (Expansion)" },
                    { key: "netNew", label: "NN (Net New)" },
                    { key: "renewalExpansion", label: "ER+EN (Renewal & Expansion)" },
                  ] as { key: keyof CategoryMapping; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-xs font-semibold text-gray-600">{label} →</span>
                      <input
                        type="text"
                        value={catMap[key]}
                        onChange={(e) => setCatMap(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Note: <span className="font-medium">Renewal &amp; Expansion</span> rows will be split 50/50 between ER and EN.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Preview ────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              {importWarnings.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">Warnings</div>
                    <ul className="space-y-0.5">
                      {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {preview.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  No matching data found. Check your column and category mappings.
                </div>
              ) : (
                <div>
                  <div className="text-xs text-gray-500 mb-3">
                    <span className="font-semibold text-gray-700">{preview.length} aggregated records</span> will be imported as actuals. Existing custom actuals will be replaced.
                  </div>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Product</th>
                          <th className="px-3 py-2.5 text-center text-gray-500 font-semibold">Qtr</th>
                          <th className="px-3 py-2.5 text-right text-sky-600 font-semibold">ER</th>
                          <th className="px-3 py-2.5 text-right text-violet-600 font-semibold">EN</th>
                          <th className="px-3 py-2.5 text-right text-amber-600 font-semibold">NN</th>
                          <th className="px-3 py-2.5 text-right text-gray-500 font-semibold">Rows</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-700">{r.product}</td>
                            <td className="px-3 py-2.5 text-center text-gray-500">{r.quarter}</td>
                            <td className="px-3 py-2.5 text-right text-sky-700 font-semibold">{fmt(r.renewal)}</td>
                            <td className="px-3 py-2.5 text-right text-violet-700 font-semibold">{fmt(r.expansion)}</td>
                            <td className="px-3 py-2.5 text-right text-amber-700 font-semibold">{fmt(r.netNew)}</td>
                            <td className="px-3 py-2.5 text-right text-gray-400">{r.rowCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
            Cancel
          </button>
          {step === "map" && (
            <button
              onClick={buildPreview}
              disabled={!colMap.productCol || !colMap.quarterCol || !colMap.categoryCol || !colMap.valueCol}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Preview Import <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === "preview" && preview.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("map")} className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors px-3">
                ← Back
              </button>
              <button
                onClick={confirmImport}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Import {preview.length} records
              </button>
            </div>
          )}
          {step === "preview" && preview.length === 0 && (
            <button onClick={() => setStep("map")} className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
              ← Back to mapping
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
