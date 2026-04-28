import Dexie, { type Table } from "dexie";

export interface Session {
  id?: number;
  sid: string;
  createdAt: Date;
}

export interface Resume {
  id?: number;
  sessionId: number;
  rawText: string;
  fileName: string;
  fileType: string;
  fileBlob?: Blob; // Original file stored for format-preserving output
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  parsedData?: any; // { contactInfo, summary, roles, skills, education, certifications }
  createdAt: Date;
}

export interface JobDesc {
  id?: number;
  sessionId: number;
  resumeId: number;
  rawText: string;
  skillsDetected?: { required: string[]; preferred: string[] };
  createdAt: Date;
}

export interface Analysis {
  id?: number;
  sessionId: number;
  resumeId: number;
  jdId: number;
  gapAnalysis?: any;
  rolePoints?: any; // Array of RolePoints from analyzer
  matchScoreBefore: number;
  matchScoreAfter: number;
  status: string;
  createdAt: Date;
}

export interface EnhancedResume {
  id?: number;
  sessionId: number;
  resumeId: number;
  analysisId: number;
  content: string;
  originalHash: string;
  enhancedHash: string;
  selectedPoints: string[];
  createdAt: Date;
}

class ATSDB extends Dexie {
  sessions!: Table<Session>;
  resumes!: Table<Resume>;
  jobDescs!: Table<JobDesc>;
  analyses!: Table<Analysis>;
  enhanced!: Table<EnhancedResume>;

  constructor() {
    super("ATSResumeDB");
    this.version(2).stores({
      sessions: "++id, sid",
      resumes: "++id, sessionId",
      jobDescs: "++id, sessionId, resumeId",
      analyses: "++id, sessionId, resumeId, jdId",
      enhanced: "++id, sessionId, resumeId",
    });
  }
}

export const db = new ATSDB();

export function generateSid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
