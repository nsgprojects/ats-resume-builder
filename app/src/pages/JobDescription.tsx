import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import WizardStepper from "@/components/WizardStepper";
import { db } from "@/lib/db";

export default function JobDescription() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resumeId = parseInt(params.get("resumeId") || "0");
  const [jdText, setJdText] = useState("");
  const [parsing, setParsing] = useState(false);

  const handleSubmit = async () => {
    if (!jdText.trim() || jdText.length < 50) return;
    setParsing(true);
    try {
      const resume = await db.resumes.get(resumeId);
      if (!resume) { alert("Resume not found"); return; }

      // Extract skills from JD text
      const requiredSkills: string[] = [];
      const preferredSkills: string[] = [];
      const lines = jdText.split("\n");
      let inRequired = false;
      let inPreferred = false;

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes("required") || lower.includes("must have") || lower.includes("essential")) { inRequired = true; inPreferred = false; continue; }
        if (lower.includes("preferred") || lower.includes("nice to have") || lower.includes("desirable")) { inRequired = false; inPreferred = true; continue; }
        if (line.trim().startsWith("- ") || line.trim().startsWith("• ") || /^\d+\./.test(line.trim())) {
          const skill = line.replace(/^[-•\d.\s]+/, "").trim().split(/[:\(]/)[0].trim();
          if (skill.length > 2) {
            if (inRequired) requiredSkills.push(skill);
            else if (inPreferred) preferredSkills.push(skill);
            else requiredSkills.push(skill);
          }
        }
      }

      const jdId = await db.jobDescs.add({
        sessionId: resume.sessionId,
        resumeId,
        rawText: jdText,
        skillsDetected: { required: requiredSkills, preferred: preferredSkills },
        createdAt: new Date(),
      });

      navigate(`/analysis?resumeId=${resumeId}&jdId=${jdId}`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <WizardStepper currentStep={2} />
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Paste Job Description</h2>
          <p className="text-sm text-slate-500 mb-8">Copy and paste the full job description. No character limits.</p>
          <div className="space-y-4">
            <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the job description here..."
              className="w-full h-80 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{jdText.length.toLocaleString()} chars {jdText.length > 0 && jdText.length < 50 && <span className="ml-2 text-amber-500">Min 50 chars</span>}</span>
              <button onClick={handleSubmit} disabled={jdText.length < 50 || parsing}
                className="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50">
                {parsing ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Analyzing...</> : <><Sparkles className="h-4 w-4" />Analyze</>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
