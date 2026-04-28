import { Routes, Route } from "react-router";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Upload from "@/pages/Upload";
import JobDescription from "@/pages/JobDescription";
import Analysis from "@/pages/Analysis";
import Preview from "@/pages/Preview";
import Confirm from "@/pages/Confirm";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/jd" element={<JobDescription />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/confirm" element={<Confirm />} />
      </Routes>
    </div>
  );
}
