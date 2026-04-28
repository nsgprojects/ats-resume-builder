import { useState, useCallback } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";

interface Props {
  onUpload: (file: File, text: string, stats: { wordCount: number; charCount: number; sentenceCount: number }) => void;
  isProcessing?: boolean;
}

export default function FileUploadZone({ onUpload, isProcessing }: Props) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["docx", "pdf", "txt", "md"].includes(ext)) {
      setError("Please upload .docx, .pdf, .txt, or .md files only");
      return;
    }
    try {
      const { extractText } = await import("@/lib/extractor");
      const result = await extractText(file);
      onUpload(file, result.text, {
        wordCount: result.wordCount,
        charCount: result.charCount,
        sentenceCount: result.sentenceCount,
      });
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          drag ? "border-blue-500 bg-blue-50 shadow-lg" : "border-slate-300 bg-slate-50 hover:border-blue-400"
        }`}
      >
        <input
          type="file"
          accept=".docx,.pdf,.txt,.md"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isProcessing}
        />
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" /><p className="text-sm font-medium text-blue-600">Parsing resume...</p></>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">Drop resume here or <span className="text-blue-600">click to browse</span></p>
              <p className="text-xs text-slate-400">DOCX, PDF, TXT, MD — No file size limits</p>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
                <Check className="h-3 w-3" />No upload limits
              </div>
            </>
          )}
        </div>
      </div>
      {error && <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    </div>
  );
}
