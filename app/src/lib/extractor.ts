import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export interface ExtractResult {
  text: string;
  html?: string;
  wordCount: number;
  charCount: number;
  sentenceCount: number;
}

export interface DetectedRole {
  title: string;
  company: string;
  location: string;
  duration: string;
  bullets: string[];
  startIndex: number;
  endIndex: number;
  bulletStyle: string;
  environment: string;
}

export interface ParsedResume {
  text: string;
  html?: string;
  roles: DetectedRole[];
  skills: string[];
  summary: string;
  summaryBullets: string[];
  contactInfo: { name?: string; email?: string; phone?: string; linkedin?: string };
  education: string[];
  certifications: string[];
}

/**
 * Extract text from any file type
 */
export async function extractText(file: File): Promise<ExtractResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  let text = "";
  let html = "";

  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    html = htmlResult.value;
  } else if (ext === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    text = await extractPdfText(arrayBuffer);
  } else {
    text = await file.text();
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();

  return {
    text,
    html,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    charCount: text.length,
    sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 5).length,
  };
}

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return fullText;
  } catch (e) {
    return "";
  }
}

// ===================================================================
// SECTION HEADER DETECTION
// Only matches TRUE section headers — short, standalone lines
// ===================================================================
const SECTION_HEADERS = [
  { type: "summary", patterns: [/^PROFESSIONAL\s+SUMMARY$/i, /^SUMMARY$/i, /^PROFILE$/i, /^OBJECTIVE$/i] },
  { type: "certifications", patterns: [/^CERTIFICATIONS?$/i, /^CERTIFICATES?$/i, /^LICENSES?$/i] },
  { type: "education", patterns: [/^EDUCATION:?$/i, /^ACADEMIC\s+BACKGROUND$/i, /^QUALIFICATIONS$/i] },
  { type: "skills", patterns: [/^TECHNICAL\s+SKILLS?$/i, /^SKILLS?$/i, /^CORE\s+COMPETENCIES$/i, /^TECHNOLOGIES$/i, /^TECHNICAL\s+PROFICIENCIES$/i] },
  { type: "experience", patterns: [/^PROFESSIONAL\s+EXPERIENCE$/i, /^WORK\s+EXPERIENCE$/i, /^EMPLOYMENT\s+HISTORY$/i, /^EXPERIENCE$/i, /^RELEVANT\s+EXPERIENCE$/i, /^CAREER\s+HISTORY$/i] },
];

function isSectionHeader(line: string): { type: string; title: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Section headers are typically short (< 40 chars) and standalone
  if (trimmed.length > 50) return null;
  for (const section of SECTION_HEADERS) {
    for (const pattern of section.patterns) {
      if (pattern.test(trimmed)) {
        return { type: section.type, title: trimmed };
      }
    }
  }
  return null;
}

/**
 * Parse resume text — ROBUST VERSION
 * Uses section header detection + fallback Client: line scanning
 */
export function parseResume(text: string): ParsedResume {
  const lines = text.split("\n");
  const roles: DetectedRole[] = [];
  const skills: string[] = [];
  const education: string[] = [];
  const certifications: string[] = [];
  const summaryBullets: string[] = [];
  let summary = "";
  let contactInfo: any = {};

  // === PASS 1: Contact info (first 15 lines) ===
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch && !contactInfo.email) contactInfo.email = emailMatch[0];
    const phoneMatch = line.match(/[\d\s\-\(\)\+]{10,20}/);
    if (phoneMatch && !contactInfo.phone) contactInfo.phone = phoneMatch[0];
    const linkedinMatch = line.match(/linkedin\.com\/in\/[\w\-]+/i);
    if (linkedinMatch && !contactInfo.linkedin) contactInfo.linkedin = linkedinMatch[0];
    if (!contactInfo.name && line.length > 3 && line.length < 60) {
      const words = line.split(/\s+/).filter(w => w.length > 1);
      if (words.length >= 2 && words.length <= 5 && !line.includes("@") && !line.includes("linkedin") && !line.includes("P.NO") && !line.includes("PROFESSIONAL")) {
        const cleanName = line.replace(/\*\*/g, "").trim();
        if (cleanName && !/engineer|cloud|devops/i.test(cleanName)) {
          contactInfo.name = cleanName;
        }
      }
    }
  }
  if (!contactInfo.name) {
    for (const line of lines) {
      const trimmed = line.trim().replace(/\*\*/g, "");
      if (trimmed && /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed) && trimmed.split(" ").length <= 4) {
        contactInfo.name = trimmed;
        break;
      }
    }
  }

  // === PASS 2: Find TRUE section boundaries ===
  type Boundary = { type: string; title: string; lineIndex: number };
  const boundaries: Boundary[] = [];
  for (let i = 0; i < lines.length; i++) {
    const header = isSectionHeader(lines[i]);
    if (header) {
      // Avoid duplicates — if same type found within 3 lines, skip
      const lastSame = boundaries.filter(b => b.type === header.type).pop();
      if (lastSame && i - lastSame.lineIndex < 5) continue;
      boundaries.push({ type: header.type, title: header.title, lineIndex: i });
    }
  }

  // === PASS 3: Extract sections ===
  type SectionData = { type: string; title: string; content: string[]; startIndex: number; endIndex: number };
  const sections: SectionData[] = [];
  for (let b = 0; b < boundaries.length; b++) {
    const start = boundaries[b].lineIndex;
    const end = b + 1 < boundaries.length ? boundaries[b + 1].lineIndex : lines.length;
    const content = lines.slice(start + 1, end);
    sections.push({
      type: boundaries[b].type,
      title: boundaries[b].title,
      content,
      startIndex: start,
      endIndex: end,
    });
    // Extract data
    if (boundaries[b].type === "certifications") {
      for (const cl of content) {
        const t = cl.trim().replace(/\*\*/g, "");
        if (t.length > 5 && !/certifications?/i.test(t)) certifications.push(t);
      }
    }
    if (boundaries[b].type === "education") {
      for (const el of content) {
        const t = el.trim().replace(/\*\*/g, "");
        if (t.length > 10 && !/education/i.test(t.toLowerCase())) education.push(t);
      }
    }
    if (boundaries[b].type === "summary") {
      for (const sl of content) {
        const t = sl.trim();
        if (t.length > 50 && !t.startsWith("*") && !t.startsWith("-")) {
          if (!summary) summary = t;
        }
        if ((t.startsWith("*") || t.startsWith("-")) && t.length > 10) {
          summaryBullets.push(t.replace(/^\s*[-*\s]+/, "").trim());
        }
      }
      // Also capture long lines as summary even without bullet markers
      if (!summary) {
        const longLine = content.find(l => l.trim().length > 50);
        if (longLine) summary = longLine.trim();
      }
    }
  }

  // === PASS 4: Find EXPERIENCE section and parse roles ===
  const expSections = sections.filter(s => s.type === "experience");
  let expContent: string[] = [];
  let expStartLine = 0;

  if (expSections.length > 0) {
    // Use the LAST experience section (most reliable — usually the real one)
    const expSection = expSections[expSections.length - 1];
    expContent = expSection.content;
    expStartLine = expSection.startIndex;
  }

  // === PASS 5: Parse roles from Client: lines ===
  if (expContent.length > 0) {
    const clientIndices: number[] = [];
    for (let i = 0; i < expContent.length; i++) {
      if (/^\*?\*?Client\s*:/i.test(expContent[i].trim())) {
        clientIndices.push(i);
      }
    }

    // Merge consecutive same-company clients
    const mergedClients: number[] = [];
    for (let c = 0; c < clientIndices.length; c++) {
      if (c === 0) { mergedClients.push(clientIndices[c]); continue; }
      const prevCompany = extractCompanyName(expContent[clientIndices[c - 1]]);
      const currCompany = extractCompanyName(expContent[clientIndices[c]]);
      if (prevCompany && currCompany && prevCompany.toLowerCase() === currCompany.toLowerCase()) continue;
      mergedClients.push(clientIndices[c]);
    }

    // Parse each role
    for (let c = 0; c < mergedClients.length; c++) {
      const start = mergedClients[c];
      const end = c + 1 < mergedClients.length ? mergedClients[c + 1] : expContent.length;
      const roleLines = expContent.slice(start, end);

      let company = "";
      let location = "";
      let title = "";
      let environment = "";
      const allDurations: string[] = [];
      const roleBullets: string[] = [];

      for (const line of roleLines) {
        const trimmed = line.trim();

        if (/^\*?\*?Client\s*:/i.test(trimmed)) {
          const match = trimmed.match(/Client\s*:\s*(.+?)(?:\s+[–-]\s+(.+?))?\s*(?:Duration|$)/i);
          if (match) {
            company = match[1].replace(/\*\*/g, "").replace(/\t+/g, " ").trim();
            if (match[2]) location = match[2].replace(/\*\*/g, "").trim();
          }
          const durMatch = trimmed.match(/Duration\s*:\s*(.+?)$/i);
          if (durMatch) allDurations.push(durMatch[1].replace(/\*\*/g, "").trim());
          continue;
        }

        if (/^\*?\*?Duration\s*:/i.test(trimmed) && !/^\*?\*?Client\s*:/i.test(trimmed)) {
          const match = trimmed.match(/Duration\s*:?\s*(.+?)$/i);
          if (match) allDurations.push(match[1].replace(/\*\*/g, "").trim());
          continue;
        }

        if (/^\*?\*?Role\s*:/i.test(trimmed)) {
          const match = trimmed.match(/Role\s*:?\s*(.+?)$/i);
          if (match) title = match[1].replace(/\*\*/g, "").trim();
          continue;
        }

        if (/Roles\s*(and|&)?\s*Responsibilities/i.test(trimmed)) continue;

        if (/^\*?\*?Environment\s*:/i.test(trimmed)) {
          const match = trimmed.match(/Environment\s*:?\s*(.+?)$/i);
          if (match) environment = match[1].replace(/\*\*/g, "").trim();
          continue;
        }

        // Collect bullets (content after Role: line)
        if (title && trimmed.length > 15 && trimmed.length < 500) {
          if (/^(Client|Role|Duration|Environment)\s*:/i.test(trimmed)) continue;
          if (/Roles\s*(and|&)?\s*Responsibilities/i.test(trimmed)) continue;
          roleBullets.push(trimmed.replace(/\*\*/g, ""));
        }
      }

      const duration = mergeDurations(allDurations);

      if ((company || title) && roleBullets.length > 0) {
        roles.push({
          title: title || "Unknown Role",
          company: company || "Unknown Company",
          location,
          duration,
          bullets: roleBullets,
          startIndex: expStartLine + start,
          endIndex: expStartLine + end,
          bulletStyle: "*",
          environment,
        });
      }
    }
  }

  // === PASS 6: FALLBACK — if no roles found, scan entire document for Client: lines ===
  if (roles.length === 0) {
    console.log("[parseResume] Section-based parsing found 0 roles — scanning entire document...");
    const allClientIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^\*?\*?Client\s*:/i.test(lines[i].trim())) {
        allClientIndices.push(i);
      }
    }
    if (allClientIndices.length > 0) {
      for (let c = 0; c < allClientIndices.length; c++) {
        const start = allClientIndices[c];
        const end = c + 1 < allClientIndices.length ? allClientIndices[c + 1] : lines.length;
        const roleLines = lines.slice(start, end);
        let company = "";
        let title = "";
        let location = "";
        const allDurations: string[] = [];
        const roleBullets: string[] = [];

        for (const line of roleLines) {
          const trimmed = line.trim();
          if (/^\*?\*?Client\s*:/i.test(trimmed)) {
            const match = trimmed.match(/Client\s*:\s*(.+?)(?:\s+[–-]\s+(.+?))?\s*(?:Duration|$)/i);
            if (match) {
              company = match[1].replace(/\*\*/g, "").replace(/\t+/g, " ").trim();
              if (match[2]) location = match[2].replace(/\*\*/g, "").trim();
            }
            const dm = trimmed.match(/Duration\s*:\s*(.+?)$/i);
            if (dm) allDurations.push(dm[1].replace(/\*\*/g, "").trim());
            continue;
          }
          if (/^\*?\*?Role\s*:/i.test(trimmed)) {
            const match = trimmed.match(/Role\s*:?\s*(.+?)$/i);
            if (match) title = match[1].replace(/\*\*/g, "").trim();
            continue;
          }
          if (/^\*?\*?Duration\s*:/i.test(trimmed)) {
            const match = trimmed.match(/Duration\s*:?\s*(.+?)$/i);
            if (match) allDurations.push(match[1].replace(/\*\*/g, "").trim());
            continue;
          }
          if (/^\*?\*?Environment\s*:/i.test(trimmed)) continue;
          if (/Roles\s*(and|&)?\s*Responsibilities/i.test(trimmed)) continue;
          if (title && trimmed.length > 15 && trimmed.length < 500) {
            if (/^(Client|Role|Duration|Environment)\s*:/i.test(trimmed)) continue;
            roleBullets.push(trimmed.replace(/\*\*/g, ""));
          }
        }

        if ((company || title) && roleBullets.length > 0) {
          roles.push({
            title: title || "Unknown Role",
            company: company || "Unknown Company",
            location,
            duration: mergeDurations(allDurations),
            bullets: roleBullets,
            startIndex: start,
            endIndex: end,
            bulletStyle: "*",
            environment: "",
          });
        }
      }
    }
  }

  // Sort roles by date
  const sortedRoles = sortRolesByDate(roles);

  // Extract skills
  const skillKeywords = [
    "AWS", "Azure", "GCP", "OpenStack", "Docker", "Kubernetes", "Terraform", "Ansible", "Chef", "Puppet",
    "Jenkins", "Maven", "Git", "Bitbucket", "SVN", "Python", "Bash", "PowerShell", "Java", "Go",
    "Oracle", "MySQL", "MongoDB", "DynamoDB", "PostgreSQL", "Redis", "Cassandra",
    "Splunk", "Datadog", "Prometheus", "Grafana", "ELK", "Nagios", "New Relic",
    "VMware", "Hyper-V", "VirtualBox", "Vagrant", "TCP/IP", "DNS", "LDAP", "DHCP", "SSH", "NFS", "VPN",
    "CI/CD", "DevOps", "GitOps", "Microservices", "Helm", "OpenShift",
    "Nginx", "Apache", "Tomcat", "JBoss", "WebLogic", "WebSphere",
    "JIRA", "Confluence", "Nexus", "JFrog", "SonarQube",
    "Snowflake", "Kafka", "Hadoop", "Spark", "Databricks",
    "CircleCI", "GitHub Actions", "GitLab CI", "Travis CI",
  ];
  for (const skill of skillKeywords) {
    if (text.toLowerCase().includes(skill.toLowerCase())) skills.push(skill);
  }

  return {
    text,
    contactInfo,
    summary,
    summaryBullets,
    roles: sortedRoles,
    skills: [...new Set(skills)],
    education,
    certifications,
  };
}

// Helper functions
function extractCompanyName(line: string): string {
  const match = line.match(/Client\s*:\s*(.+?)(?:\s+[–-]\s+|\s+Duration|$)/i);
  return match ? match[1].replace(/\*\*/g, "").replace(/\t+/g, " ").trim() : "";
}

function mergeDurations(durations: string[]): string {
  if (durations.length === 0) return "";
  if (durations.length === 1) return durations[0];
  let earliestYear = 9999, latestYear = 0;
  let earliestStart = "", latestEnd = "";
  for (const dur of durations) {
    const parts = dur.split(/[–\-]/);
    if (parts.length >= 2) {
      const startYearMatch = parts[0].trim().match(/\d{4}/);
      const endYearMatch = parts[parts.length - 1].trim().match(/\d{4}/);
      if (startYearMatch) {
        const y = parseInt(startYearMatch[0]);
        if (y < earliestYear) { earliestYear = y; earliestStart = parts[0].trim(); }
      }
      if (endYearMatch) {
        const y = parseInt(endYearMatch[0]);
        if (y > latestYear) { latestYear = y; latestEnd = parts[parts.length - 1].trim(); }
      }
    }
  }
  return earliestStart && latestEnd ? `${earliestStart} – ${latestEnd}` : durations[0];
}

function sortRolesByDate(roles: DetectedRole[]): DetectedRole[] {
  return roles.sort((a, b) => {
    const aYear = extractLatestYear(a.duration);
    const bYear = extractLatestYear(b.duration);
    return bYear - aYear;
  });
}

function extractLatestYear(duration: string): number {
  const years = duration.match(/\d{4}/g);
  if (years) return Math.max(...years.map(Number));
  return 0;
}

export async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
