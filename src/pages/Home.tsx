import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, Upload, Brain, FileCheck, Shield, Zap, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-300 border border-blue-500/20">
            <Zap className="h-4 w-4" />ATS Resume Builder v3.0 — No Login Required
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight">Optimize Your Resume<br /><span className="text-blue-400">with AI Precision</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">Upload your resume, paste a job description, and let AI generate targeted experience points that match exactly what recruiters are looking for.</p>
          <div className="mt-10 flex justify-center gap-4">
            <Link to="/upload" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 transition-colors">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { icon: Upload, title: "Upload Resume", desc: "Drag & drop DOCX, PDF, TXT. No file size limits. Auto-extracts all text." },
            { icon: Brain, title: "AI Analysis", desc: "Compares your resume against the JD. Identifies gaps and generates targeted points." },
            { icon: FileCheck, title: "Preview & Export", desc: "Side-by-side comparison. Select points you want. Export as TXT or HTML." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10"><Icon className="h-6 w-6 text-blue-400" /></div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-16 flex justify-center gap-8 text-sm text-slate-500">
          <span className="flex items-center gap-2"><Lock className="h-4 w-4" />No data leaves your device</span>
          <span className="flex items-center gap-2"><Shield className="h-4 w-4" />Format Immutability guaranteed</span>
          <span className="flex items-center gap-2"><Zap className="h-4 w-4" />No login required</span>
        </motion.div>
      </div>
    </div>
  );
}
