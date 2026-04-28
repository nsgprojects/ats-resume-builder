import { Link } from "react-router";
import { Sparkles } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <span>ATS Resume Builder</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">v3.0</span>
        </Link>
        <Link to="/upload" className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors">
          New Resume
        </Link>
      </div>
    </nav>
  );
}
