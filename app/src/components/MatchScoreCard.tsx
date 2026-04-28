import { motion } from "framer-motion";
import { TrendingUp, Target } from "lucide-react";

export default function MatchScoreCard({ before, after, summary }: { before: number; after: number; summary?: string }) {
  const diff = after - before;
  const color = after >= 80 ? "emerald" : after >= 60 ? "amber" : "rose";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><Target className="h-5 w-5 text-blue-500" /><h3 className="text-lg font-semibold text-slate-800">Match Score</h3></div>
      <div className="flex items-center gap-8">
        <div className="text-center"><div className="text-sm text-slate-500 mb-1">Before</div><div className="text-3xl font-bold text-slate-700">{before}%</div></div>
        <div className="flex flex-col items-center"><TrendingUp className="h-5 w-5 text-emerald-500" /><span className="text-sm font-medium text-emerald-600">+{diff}%</span></div>
        <div className="text-center"><div className="text-sm text-slate-500 mb-1">After</div>
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className={`text-4xl font-bold text-${color}-600`}>{after}%</motion.div>
        </div>
      </div>
      {summary && <p className="mt-4 text-sm text-slate-600 leading-relaxed">{summary}</p>}
    </motion.div>
  );
}
