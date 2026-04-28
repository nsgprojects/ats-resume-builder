import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, Check, Info, ChevronDown, ChevronUp } from "lucide-react";
import WizardStepper from "@/components/WizardStepper";
import { db } from "@/lib/db";
import { parseResume } from "@/lib/extractor";
import { generatePointsForRoles } from "@/lib/analyzer";

export default function Preview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resumeId = parseInt(params.get("resumeId") || "0");
  const jdId = parseInt(params.get("jdId") || "0");
  const analysisId = parseInt(params.get("analysisId") || "0");

  const [rolePoints, setRolePoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[Preview] Loading analysis #", analysisId);
      let analysis = await db.analyses.get(analysisId);
      console.log("[Preview] Found:", analysis ? "YES" : "NO", "rolePoints:", analysis?.rolePoints?.length);

      if (!analysis || !analysis.rolePoints || analysis.rolePoints.length === 0) {
        console.log("[Preview] Missing data — regenerating...");
        await regenerateAnalysis();
        return;
      }

      const hasPoints = analysis.rolePoints.some((rp: any) => rp.newPoints && rp.newPoints.length > 0);
      if (!hasPoints) {
        console.log("[Preview] Empty points — regenerating...");
        await regenerateAnalysis();
        return;
      }

      console.log("[Preview] Loaded", analysis.rolePoints.length, "roles");
      setRolePoints(analysis.rolePoints);
    } catch (e: any) {
      console.error("[Preview] Error:", e);
      setError("Failed to load: " + (e.message || "Unknown"));
    }
    setLoading(false);
  };

  const regenerateAnalysis = async () => {
    try {
      const resume = await db.resumes.get(resumeId);
      const jd = await db.jobDescs.get(jdId);
      if (!resume || !jd) {
        setError("Resume or JD not found. Please start over.");
        setLoading(false);
        return;
      }

      let roles: any[] = [];
      if (resume.parsedData?.roles && resume.parsedData.roles.length > 0) {
        roles = resume.parsedData.roles;
      } else if (resume.rawText) {
        const reparsed = parseResume(resume.rawText);
        roles = reparsed.roles || [];
        await db.resumes.update(resumeId, { parsedData: reparsed });
      }

      if (roles.length === 0) {
        setError("No job roles detected. Ensure resume has 'Professional Experience' with 'Client:' entries.");
        setLoading(false);
        return;
      }

      const analysis = generatePointsForRoles(resume.rawText, jd.rawText, roles);
      if (!analysis.rolePoints || analysis.rolePoints.length === 0) {
        setError("Point generation failed. Try a different JD.");
        setLoading(false);
        return;
      }

      const newId = await db.analyses.add({
        sessionId: resume.sessionId,
        resumeId,
        jdId,
        gapAnalysis: { skillGaps: analysis.skillGaps },
        rolePoints: analysis.rolePoints,
        matchScoreBefore: analysis.matchScore,
        matchScoreAfter: analysis.matchScore,
        status: "analyzed",
        createdAt: new Date(),
      });

      window.history.replaceState(null, "", `/preview?resumeId=${resumeId}&jdId=${jdId}&analysisId=${newId}`);
      setRolePoints(analysis.rolePoints);
    } catch (e: any) {
      console.error("[Preview] Regen error:", e);
      setError("Regeneration failed: " + (e.message || "Unknown"));
    }
    setLoading(false);
  };

  const togglePoint = (roleIdx: number, ptId: string) => {
    setRolePoints(prev => prev.map((role, ri) => {
      if (ri !== roleIdx) return role;
      return {
        ...role,
        newPoints: role.newPoints.map((pt: any) =>
          pt.id === ptId ? { ...pt, selected: !pt.selected } : pt
        ),
      };
    }));
  };

  const selectAllInRole = (roleIdx: number) => {
    setRolePoints(prev => prev.map((role, ri) => {
      if (ri !== roleIdx) return role;
      return { ...role, newPoints: role.newPoints.map((pt: any) => ({ ...pt, selected: true })) };
    }));
  };

  const clearAllInRole = (roleIdx: number) => {
    setRolePoints(prev => prev.map((role, ri) => {
      if (ri !== roleIdx) return role;
      return { ...role, newPoints: role.newPoints.map((pt: any) => ({ ...pt, selected: false })) };
    }));
  };

  const selectedCount = rolePoints.reduce((sum, r) => sum + r.newPoints.filter((p: any) => p.selected).length, 0);

  const handleContinue = async () => {
    try {
      const url = new URL(window.location.href);
      const currentAnalysisId = parseInt(url.searchParams.get("analysisId") || String(analysisId));
      await db.analyses.update(currentAnalysisId, { rolePoints });
    } catch (e) {
      console.error("[Preview] Save error:", e);
    }
    navigate(`/confirm?resumeId=${resumeId}&jdId=${jdId}&analysisId=${analysisId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
          <p className="text-lg font-medium text-slate-700">Loading AI-suggested points...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={loadData} className="rounded-xl bg-blue-500 px-6 py-2 text-white text-sm font-medium hover:bg-blue-400">Retry</button>
        </div>
      </div>
    );
  }

  if (rolePoints.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <p className="text-slate-600">No points available.</p>
          <button onClick={regenerateAnalysis} className="rounded-xl bg-blue-500 px-6 py-2 text-white text-sm font-medium hover:bg-blue-400">Regenerate Points</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <WizardStepper currentStep={4} />
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Review AI-Suggested Points</h2>
              <p className="text-sm text-slate-500 mt-1">
                {rolePoints.length} roles | {selectedCount} of {rolePoints.reduce((s, r) => s + r.newPoints.length, 0)} points selected
              </p>
            </div>
            <button onClick={handleContinue} className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-6">
            {rolePoints.map((role, roleIdx) => (
              <div key={roleIdx} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{roleIdx + 1}</span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">{role.roleTitle}</h3>
                      <p className="text-sm text-slate-500">{role.company} {role.duration ? "| " + role.duration : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                      {role.newPoints.filter((p: any) => p.selected).length} / {role.newPoints.length}
                    </span>
                    <button onClick={() => selectAllInRole(roleIdx)} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">All</button>
                    <button onClick={() => clearAllInRole(roleIdx)} className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Clear</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {role.newPoints.map((pt: any) => (
                    <div key={pt.id} onClick={() => togglePoint(roleIdx, pt.id)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${pt.selected ? "border-emerald-400 bg-emerald-50" : "border-transparent bg-slate-50 hover:border-slate-200"}`}>
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${pt.selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                        {pt.selected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${pt.confidence === "HIGH" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : pt.confidence === "MEDIUM" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}>
                            {pt.confidence}
                          </span>
                          <span className="text-xs text-slate-500">{pt.targetSkill}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700">{pt.text}</p>
                        <button className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600"
                          onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [pt.id]: !prev[pt.id] })); }}>
                          <Info className="h-3 w-3" />
                          {expanded[pt.id] ? "Hide" : "Why?"}
                          {expanded[pt.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {expanded[pt.id] && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            className="mt-2 rounded-lg bg-white p-3 text-xs text-slate-600 space-y-1 border">
                            <p><strong>Rationale:</strong> {pt.rationale}</p>
                            <p><strong>Target:</strong> {pt.targetSkill}</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-slate-500">{selectedCount} points selected across {rolePoints.length} roles</p>
            <button onClick={handleContinue} className="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400">
              Continue to Confirmation <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
