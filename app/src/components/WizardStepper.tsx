import { Upload, FileSearch, Brain, Eye, CheckCircle } from "lucide-react";

const steps = [
  { label: "Upload", icon: Upload },
  { label: "Job Desc", icon: FileSearch },
  { label: "Analysis", icon: Brain },
  { label: "Preview", icon: Eye },
  { label: "Export", icon: CheckCircle },
];

export default function WizardStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = i + 1 < currentStep;
          const active = i + 1 === currentStep;
          return (
            <div key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  done ? "border-emerald-500 bg-emerald-500 text-white" :
                  active ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-200" :
                  "border-slate-200 bg-white text-slate-400"
                }`}><Icon className="h-4 w-4" /></div>
                <span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"}`}>{step.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded-full ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
