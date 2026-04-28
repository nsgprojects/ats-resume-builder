import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, Brain } from "lucide-react";
import WizardStepper from "@/components/WizardStepper";
import MatchScoreCard from "@/components/MatchScoreCard";
import { db } from "@/lib/db";
import { parseResume } from "@/lib/extractor";
import { generatePointsForRoles } from "@/lib/analyzer";

export default function Analysis() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resumeId = parseInt(params.get("resumeId") || "0");
  const jdId = parseInt(params.get("jdId") || "0");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { runAnalysis(); }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("[Analysis] Starting analysis for resumeId=", resumeId, "jdId=", jdId);

      const resume = await db.resumes.get(resumeId);
      const jd = await db.jobDescs.get(jdId);

      if (!resume) { setError("Resume not found. Please upload again."); setLoading(false); return; }
      if (!jd) { setError("Job description not found. Please enter again."); setLoading(false); return; }

      console.log("[Analysis] Loaded resume:", resume.fileName, "has rawText:", !!resume.rawText, "chars:", resume.rawText?.length);
      console.log("[Analysis] Loaded JD, chars:", jd.rawText?.length);

      // CRITICAL: Get roles — use stored parsed data or re-parse
      let roles: any[] = [];
      if (resume.parsedData?.roles && resume.parsedData.roles.length > 0) {
        roles = resume.parsedData.roles;
        console.log("[Analysis] Using stored roles:", roles.length, roles.map((r: any) => r.company));
      } else if (resume.rawText) {
        console.log("[Analysis] No stored roles — re-parsing resume...");
        const reparsed = parseResume(resume.rawText);
        roles = reparsed.roles || [];
        console.log("[Analysis] Re-parsed roles:", roles.length, roles.map((r: any) => r.company));
        // Save re-parsed data back to DB
        await db.resumes.update(resumeId, { parsedData: reparsed });
      }

      if (roles.length === 0) {
        setError("Could not detect any job roles in your resume. Please ensure it has a 'Professional Experience' section with 'Client:' entries.");
        setLoading(false);
        return;
      }

      // Run the analysis
      console.log("[Analysis] Calling generatePointsForRoles with", roles.length, "roles...");
      const analysis = generatePointsForRoles(resume.rawText, jd.rawText, roles);
      console.log("[Analysis] Result: score=", analysis.matchScore, "rolePoints entries=", analysis.rolePoints?.length);
      console.log("[Analysis] Points per role:", analysis.rolePoints?.map((r: any) => r.newPoints?.length || 0));

      if (!analysis.rolePoints || analysis.rolePoints.length === 0) {
        setError("Analysis completed but no points were generated. Please try again.");
        setLoading(false);
        return;
      }

      // Store in DB
      const record = {
        sessionId: resume.sessionId,
        resumeId,
        jdId,
        gapAnalysis: { skillGaps: analysis.skillGaps },
        rolePoints: analysis.rolePoints,
        matchScoreBefore: analysis.matchScore,
        matchScoreAfter: analysis.matchScore,
        status: "analyzed",
        createdAt: new Date(),
      };
      console.log("[Analysis] Storing analysis record:", JSON.stringify({ ...record, rolePoints: "[" + analysis.rolePoints.length + " entries]" }));

      const analysisId = await db.analyses.add(record);
      console.log("[Analysis] Stored with analysisId=", analysisId);

      // Verify storage
      const verify = await db.analyses.get(analysisId);
      console.log("[Analysis] Verification: rolePoints entries=", verify?.rolePoints?.length);

      setResult({ ...analysis, analysisId });
    } catch (e: any) {
      console.error("[Analysis] Error:", e);
      setError("Analysis failed: " + (e.message || "Unknown error"));
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
        <p className="text-lg font-medium text-slate-700">AI analyzing resume...</p>
        <p className="text-sm text-slate-400 mt-1">Detecting roles and generating targeted points</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button onClick={runAnalysis} className="rounded-xl bg-blue-500 px-6 py-2 text-white text-sm font-medium hover:bg-blue-400">Retry Analysis</button>
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">No analysis result. <button onClick={runAnalysis} className="text-blue-500 underline ml-2">Retry</button></p>
    </div>
  );

  const totalPoints = result.rolePoints?.reduce((sum: number, r: any) => sum + (r.newPoints?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <WizardStepper currentStep={3} />
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2"><Brain className="h-5 w-5 text-blue-500" /><h2 className="text-2xl font-bold text-slate-900">AI Analysis Results</h2></div>
          <p className="text-sm text-slate-500 mb-8">{result.rolePoints?.length || 0} roles analyzed. {totalPoints} points generated.</p>

          <div className="mb-8"><MatchScoreCard before={result.matchScore} after={result.matchScore} summary={result.summary} /></div>

          {/* Role Summary Cards */}
          {result.rolePoints?.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {result.rolePoints.map((role: any, i: number) => (
                <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{role.roleTitle}</p>
                      <p className="text-xs text-slate-500">{role.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">{role.newPoints?.length || 0} points</div>
                    <div className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500">{role.existingBullets?.length || 0} existing</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {role.newPoints?.slice(0, 3).map((pt: any, j: number) => (
                      <span key={j} className="block text-xs text-slate-400 truncate">{pt.text?.substring(0, 60)}...</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skill Gaps */}
          {result.skillGaps?.length > 0 && (
            <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Skill Analysis</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {result.skillGaps.slice(0, 12).map((gap: any, i: number) => (
                  <div key={i} className={`rounded-lg px-4 py-3 border ${gap.status === "MATCHED" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gap.status === "MATCHED" ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"}`}>{gap.status}</span>
                      <span className="text-sm font-medium text-slate-700">{gap.skill}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => {
            console.log("[Analysis] Navigating to preview with analysisId=", result.analysisId);
            navigate(`/preview?resumeId=${resumeId}&jdId=${jdId}&analysisId=${result.analysisId}`);
          }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
            Continue to Point Selection <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
