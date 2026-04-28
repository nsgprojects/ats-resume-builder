import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Hash } from "lucide-react";
import WizardStepper from "@/components/WizardStepper";
import FileUploadZone from "@/components/FileUploadZone";
import { db, generateSid } from "@/lib/db";
import { parseResume } from "@/lib/extractor";

export default function Upload() {
  const navigate = useNavigate();
  const [uploaded, setUploaded] = useState(false);
  const [stats, setStats] = useState<{ wordCount: number; charCount: number; sentenceCount: number } | null>(null);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [parsedRoles, setParsedRoles] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleUpload = useCallback(async (file: File, text: string, fileStats: { wordCount: number; charCount: number; sentenceCount: number }) => {
    setProcessing(true);
    try {
      const sid = generateSid();
      const sessionId = await db.sessions.add({ sid, createdAt: new Date() });

      // Parse resume structure
      const parsed = parseResume(text);
      setParsedRoles(parsed.roles.slice(0, 3));

      // Store original file blob for format-preserving output
      const rid = await db.resumes.add({
        sessionId,
        rawText: text,
        fileName: file.name,
        fileType: file.name.split(".").pop() || "",
        fileBlob: file, // Store original file
        wordCount: fileStats.wordCount,
        charCount: fileStats.charCount,
        sentenceCount: fileStats.sentenceCount,
        parsedData: parsed,
        createdAt: new Date(),
      });

      setStats(fileStats);
      setResumeId(rid);
      setUploaded(true);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const goToJD = () => {
    if (resumeId) navigate(`/jd?resumeId=${resumeId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <WizardStepper currentStep={1} />
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Resume</h2>
          <p className="text-sm text-slate-500 mb-8">DOCX, PDF, TXT, MD — No file size limits. Format preserved in output.</p>

          {!uploaded ? (
            <FileUploadZone onUpload={handleUpload} isProcessing={processing} />
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><FileText className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="text-sm font-medium text-slate-800">Resume uploaded and parsed</p><p className="text-xs text-slate-500">{parsedRoles.length} roles detected</p></div>
              </div>
              {stats && (
                <div className="mb-6 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3 text-center"><Hash className="mx-auto h-4 w-4 text-blue-500 mb-1" /><p className="text-lg font-bold text-slate-800">{stats.wordCount.toLocaleString()}</p><p className="text-xs text-slate-500">Words</p></div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center"><Hash className="mx-auto h-4 w-4 text-blue-500 mb-1" /><p className="text-lg font-bold text-slate-800">{stats.charCount.toLocaleString()}</p><p className="text-xs text-slate-500">Chars</p></div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center"><FileText className="mx-auto h-4 w-4 text-blue-500 mb-1" /><p className="text-lg font-bold text-slate-800">{stats.sentenceCount}</p><p className="text-xs text-slate-500">Sentences</p></div>
                </div>
              )}
              {parsedRoles.length > 0 && (
                <div className="mb-6 rounded-lg bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Detected Roles (Latest 3):</p>
                  <div className="space-y-1">
                    {parsedRoles.map((role, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-blue-600">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">{i + 1}</span>
                        <span className="font-medium">{role.title}</span>
                        <span className="text-blue-400">|</span>
                        <span>{role.company}</span>
                        <span className="text-blue-400">|</span>
                        <span>{role.duration || "Date not detected"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={goToJD} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
                Continue to Job Description <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
