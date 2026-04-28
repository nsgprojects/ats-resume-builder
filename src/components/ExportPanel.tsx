import { useState } from "react";
import { Download, FileText, FileCode, Check, Loader2 } from "lucide-react";
import { generateDocx, generatePdf } from "@/lib/docx-generator";
import { generateFormatPreservingHtml, generateFormatPreservingDocx, buildEnhancedText } from "@/lib/html-exporter";
import type { RolePoints } from "@/lib/analyzer";
import type { DetectedRole } from "@/lib/extractor";

interface ExportPanelProps {
  enhancedText: string;
  resume: any;
  analysis: any;
  selectedPointsByRole: { roleTitle: string; company: string; count: number }[];
}

export default function ExportPanel({ enhancedText, resume, analysis }: ExportPanelProps) {
  const [exported, setExported] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState<Record<string, boolean>>({});

  const parsed = resume?.parsedData || {};
  const contactInfo = parsed.contactInfo || {};
  const summary = parsed.summary || "";
  const summaryBullets = parsed.summaryBullets || [];
  const certifications = parsed.certifications || [];
  const education = parsed.education || [];
  const skills = parsed.skills || [];
  const allRoles: DetectedRole[] = parsed.roles || [];
  const fileBlob: Blob | undefined = resume?.fileBlob;

  const getSelectedPointIds = (): string[] => {
    const ids: string[] = [];
    const rolePoints: RolePoints[] = analysis?.rolePoints || [];
    rolePoints.forEach((rp) => {
      rp.newPoints.forEach((p: any) => { if (p.selected) ids.push(p.id); });
    });
    return ids;
  };

  const getRolePoints = (): RolePoints[] => {
    return analysis?.rolePoints || [];
  };

  // ─── TXT: Original text with points inserted ───
  const exportTxt = () => {
    const rolePoints = getRolePoints();
    const selectedIds = getSelectedPointIds();
    const text = buildEnhancedText(resume?.rawText || enhancedText, rolePoints, selectedIds);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enhanced-resume.txt";
    a.click();
    URL.revokeObjectURL(url);
    setExported(p => ({ ...p, txt: true }));
  };

  // ─── HTML: Format-preserving via original DOCX→HTML ───
  const exportHtml = async () => {
    setExporting(p => ({ ...p, html: true }));
    try {
      let html: string;
      if (fileBlob) {
        // TRUE format preservation: convert original DOCX to HTML + insert points
        html = await generateFormatPreservingHtml(fileBlob, getRolePoints(), getSelectedPointIds());
      } else {
        // Fallback: generate from scratch
        const name = contactInfo.name || "Enhanced Resume";
        html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${name}</title></head><body><pre>${enhancedText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
      }
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "enhanced-resume.html";
      a.click();
      URL.revokeObjectURL(url);
      setExported(p => ({ ...p, html: true }));
    } catch (e) {
      console.error("HTML export error:", e);
      alert("HTML export failed.");
    }
    setExporting(p => ({ ...p, html: false }));
  };

  // ─── DOCX (Format-Preserving): Original DOCX → HTML → Word doc ───
  const exportDocx = async () => {
    setExporting(p => ({ ...p, docx: true }));
    try {
      let blob: Blob;
      if (fileBlob) {
        // TRUE format preservation path
        blob = await generateFormatPreservingDocx(fileBlob, getRolePoints(), getSelectedPointIds());
      } else {
        // Fallback: regenerate from parsed data
        blob = await generateDocx(contactInfo, summary, summaryBullets, certifications, education, skills, allRoles, getRolePoints(), getSelectedPointIds());
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "enhanced-resume.docx";
      a.click();
      URL.revokeObjectURL(url);
      setExported(p => ({ ...p, docx: true }));
    } catch (e) {
      console.error("DOCX export error:", e);
      alert("DOCX export failed. Try HTML format for best format preservation.");
    }
    setExporting(p => ({ ...p, docx: false }));
  };

  // ─── PDF: All roles with points ───
  const exportPdf = async () => {
    setExporting(p => ({ ...p, pdf: true }));
    try {
      const blob = await generatePdf(contactInfo, summary, summaryBullets, certifications, education, skills, allRoles, getRolePoints(), getSelectedPointIds());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "enhanced-resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setExported(p => ({ ...p, pdf: true }));
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDF export failed. Try HTML or TXT format.");
    }
    setExporting(p => ({ ...p, pdf: false }));
  };

  const formats = [
    { key: "docx" as const, label: "Word (.docx)", desc: fileBlob ? "Format-preserving — original styling kept" : "Reconstructed from data", icon: FileText, handler: exportDocx, primary: !!fileBlob },
    { key: "html" as const, label: "Web Page (.html)", desc: fileBlob ? "Best format preservation — opens in Word" : "Formatted view", icon: FileCode, handler: exportHtml, primary: !!fileBlob },
    { key: "txt" as const, label: "Plain Text (.txt)", desc: "Original text + AI points inserted", icon: FileCode, handler: exportTxt, primary: false },
    { key: "pdf" as const, label: "PDF (.pdf)", desc: "Print-ready — all roles included", icon: FileText, handler: exportPdf, primary: false },
  ];

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-2">Export Enhanced Resume</h3>
      <p className="text-xs text-slate-500 mb-4">
        {fileBlob
          ? "Format-preserving export available. Original DOCX styling (images, tables, fonts) is kept intact."
          : "All " + allRoles.length + " roles included. Points added to latest 3 only."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {formats.map(({ key, label, desc, icon: Icon, handler, primary }) => (
          <button key={key} onClick={handler} disabled={exporting[key]}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
              exported[key] ? "border-emerald-400 bg-emerald-50" :
              primary ? "border-blue-400 bg-blue-50 hover:border-blue-500" :
              "border-slate-200 bg-white hover:border-blue-300"
            }`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              exported[key] ? "bg-emerald-100" : primary ? "bg-blue-100" : "bg-blue-50"
            }`}>
              {exporting[key] ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" /> :
               exported[key] ? <Check className="h-5 w-5 text-emerald-600" /> :
               <Icon className="h-5 w-5 text-blue-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <Download className={`ml-auto h-4 w-4 shrink-0 ${exported[key] ? "text-emerald-500" : "text-slate-400"}`} />
          </button>
        ))}
      </div>
      {fileBlob && (
        <p className="text-xs text-blue-600 mt-3 bg-blue-50 p-2 rounded-lg">
          <strong>Tip:</strong> The HTML export preserves your original formatting most accurately (images, tables, fonts). Download as HTML, then open in Microsoft Word and &quot;Save As&quot; DOCX if needed.
        </p>
      )}
    </div>
  );
}
