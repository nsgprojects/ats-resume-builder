import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Info, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { RolePoint } from "@/lib/analyzer";

interface Props {
  originalResume: string;
  suggestedPoints: RolePoint[];
  onSelectionChange: (points: RolePoint[]) => void;
}

export default function SideBySidePreview({ originalResume, suggestedPoints, onSelectionChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => onSelectionChange(suggestedPoints.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  const selectAll = () => onSelectionChange(suggestedPoints.map(p => ({ ...p, selected: true })));
  const deselectAll = () => onSelectionChange(suggestedPoints.map(p => ({ ...p, selected: false })));
  const selectHigh = () => onSelectionChange(suggestedPoints.map(p => ({ ...p, selected: p.confidence === "HIGH" })));
  const selectedCount = suggestedPoints.filter(p => p.selected).length;

  const confColor = (c: string) => c === "HIGH" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : c === "MEDIUM" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-4">
        <span className="text-sm font-medium text-slate-700 mr-2">{selectedCount} of {suggestedPoints.length} selected</span>
        <button onClick={selectAll} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">Select All</button>
        <button onClick={deselectAll} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">Deselect All</button>
        <button onClick={selectHigh} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100">Top HIGH</button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: Original */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-red-200 bg-red-50/30 p-5">
          <div className="mb-3 flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-400" /><h4 className="text-sm font-semibold text-red-700">Current Resume</h4><span className="ml-auto text-xs text-slate-400">Preserved verbatim</span></div>
          <div className="max-h-[600px] overflow-y-auto rounded-lg bg-white p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{originalResume}</div>
        </motion.div>

        {/* RIGHT: Suggested */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5">
          <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-500" /><h4 className="text-sm font-semibold text-emerald-700">AI Suggested Points</h4></div>
          <div className="max-h-[600px] space-y-3 overflow-y-auto">
            {suggestedPoints.map((pt, i) => (
              <motion.div key={pt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${pt.selected ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-transparent bg-white hover:border-slate-200"}`}
                onClick={() => toggle(pt.id)}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${pt.selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                    {pt.selected && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confColor(pt.confidence)}`}>{pt.confidence}</span>
                      <span className="text-xs text-slate-500">{pt.targetSkill}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">{pt.text}</p>
                    <button className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600" onClick={e => { e.stopPropagation(); setExpanded(expanded === pt.id ? null : pt.id); }}>
                      <Info className="h-3 w-3" />{expanded === pt.id ? "Hide" : "Why?"}{expanded === pt.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {expanded === pt.id && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1"><p><strong>Rationale:</strong> {pt.rationale}</p><p><strong>Target:</strong> {pt.targetSkill}</p></motion.div>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
