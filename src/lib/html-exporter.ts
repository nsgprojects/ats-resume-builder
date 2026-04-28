import mammoth from "mammoth";
import type { RolePoints } from "@/lib/analyzer";

/**
 * Format-Preserving Export via HTML
 * 
 * Strategy: Convert original DOCX to HTML (preserves ALL formatting),
 * then insert AI points into the HTML at correct role positions.
 * The resulting HTML opens perfectly in Word with all original formatting intact.
 */

/**
 * Generate an enhanced resume by converting the original DOCX to HTML
 * and inserting AI points at the correct positions.
 */
export async function generateFormatPreservingHtml(
  fileBlob: Blob,
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): Promise<string> {
  // 1. Convert original DOCX to HTML (preserves ALL formatting)
  const arrayBuffer = await fileBlob.arrayBuffer();
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const originalHtml = htmlResult.value;

  // 2. Build lookup: company name -> selected points
  const pointsByCompany = new Map<string, string[]>();
  for (const rp of rolePoints) {
    const key = rp.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const selected = rp.newPoints
      .filter(p => selectedPointIds.includes(p.id))
      .map(p => `${rp.bulletStyle || "*"} ${p.text}`);
    if (selected.length > 0) {
      pointsByCompany.set(key, selected);
    }
  }

  if (pointsByCompany.size === 0) {
    // No points selected — return original HTML as-is
    return wrapInDocument(originalHtml, false);
  }

  // 3. Parse HTML and insert points
  const parser = new DOMParser();
  const doc = parser.parseFromString(originalHtml, "text/html");

  // Find all paragraph elements
  const paragraphs = doc.querySelectorAll("p");

  // Track which roles we've processed (max 3)
  let rolesProcessed = 0;
  const processedCompanies = new Set<string>();

  for (let i = 0; i < paragraphs.length && rolesProcessed < 3; i++) {
    const p = paragraphs[i];
    const text = p.textContent || "";
    const trimmed = text.trim();

    // Check if this paragraph contains a Client: line (role header)
    const clientMatch = trimmed.match(/Client\s*:\s*(.+?)(?:\s+[–-]|\s+Duration|$)/i);
    if (clientMatch) {
      const company = clientMatch[1].replace(/\*\*/g, "").replace(/\t+/g, " ").trim();
      const companyKey = company.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check if we have points for this company
      const pointsToInsert = pointsByCompany.get(companyKey);
      if (pointsToInsert && !processedCompanies.has(companyKey)) {
        processedCompanies.add(companyKey);

        // Find where to insert: after the last bullet of this role
        // Walk forward to find the Environment: line or next Client: line
        let insertAfterIdx = -1;
        let j = i + 1;
        for (; j < paragraphs.length; j++) {
          const nextText = (paragraphs[j].textContent || "").trim();
          // Stop at next Client: line, Environment: line, or major section header
          if (/^\*?\*?Client\s*:/i.test(nextText)) break;
          if (/^\*?\*?Environment\s*:/i.test(nextText)) {
            insertAfterIdx = j - 1; // Insert before Environment
            break;
          }
          // Also check if we've reached a new major section
          if (/^(CERTIFICATIONS|EDUCATION|TECHNICAL\s+SKILLS|PROFESSIONAL\s+EXPERIENCE)/i.test(nextText)) {
            insertAfterIdx = j - 1;
            break;
          }
          // Track the last bullet/text line
          if (nextText.length > 0) {
            insertAfterIdx = j;
          }
        }

        if (insertAfterIdx > 0) {
          // Insert AI points after the last bullet
          const insertAfter = paragraphs[insertAfterIdx];
          for (const pointText of pointsToInsert) {
            const newP = doc.createElement("p");
            newP.innerHTML = `<strong>${escapeHtml(pointText)}</strong>`;
            newP.style.marginLeft = "36pt"; // Indent like bullets
            insertAfter.parentNode?.insertBefore(newP, insertAfter.nextSibling);
          }
          rolesProcessed++;
        }
      }
    }
  }

  // 4. Serialize back to HTML
  const serializer = new XMLSerializer();
  const enhancedHtml = serializer.serializeToString(doc.body);
  // Extract just the body content (remove <body> tags)
  const bodyContent = enhancedHtml.replace(/^<body[^>]*>/i, "").replace(/<\/body>$/i, "");

  return wrapInDocument(bodyContent, true);
}

/**
 * Generate format-preserving enhanced DOCX by converting to HTML,
 * inserting points, then creating a Word-compatible document.
 */
export async function generateFormatPreservingDocx(
  fileBlob: Blob,
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): Promise<Blob> {
  const html = await generateFormatPreservingHtml(fileBlob, rolePoints, selectedPointIds);

  // Create a Word-compatible HTML document
  const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name=ProgId content=Word.Document>
<title>Enhanced Resume</title>
<style>
/* Word-compatible styles */
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.15; }
p { margin: 0; padding: 0; }
table { border-collapse: collapse; }
td, th { border: 1px solid #000; padding: 4pt; }
img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${html}
</body>
</html>`;

  return new Blob([wordHtml], { type: "application/msword" });
}

/**
 * Build enhanced resume as TXT — preserves original text exactly,
 * inserts points inline under correct roles.
 */
export function buildEnhancedText(
  originalText: string,
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): string {
  const lines = originalText.split("\n");
  const result: string[] = [];

  // Build lookup
  const pointsByCompany = new Map<string, string[]>();
  for (const rp of rolePoints) {
    const key = rp.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const selected = rp.newPoints
      .filter(p => selectedPointIds.includes(p.id))
      .map(p => `${rp.bulletStyle || "*"} ${p.text}`);
    if (selected.length > 0) pointsByCompany.set(key, selected);
  }

  let currentRoleIndex = 0;
  const processedCompanies = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    result.push(line);

    // Check for Client: line (role start)
    const clientMatch = trimmed.match(/Client\s*:\s*(.+?)(?:\s+[–-]|\s+Duration|$)/i);
    if (clientMatch && currentRoleIndex < 3) {
      const company = clientMatch[1].replace(/\*\*/g, "").replace(/\t+/g, " ").trim();
      const companyKey = company.toLowerCase().replace(/[^a-z0-9]/g, "");

      const points = pointsByCompany.get(companyKey);
      if (points && !processedCompanies.has(companyKey)) {
        processedCompanies.add(companyKey);

        // Walk forward to find insert position (before Environment: or next Client:)
        let insertPos = -1;
        let j = i + 1;
        for (; j < lines.length; j++) {
          const next = lines[j].trim();
          if (/^\*?\*?Client\s*:/i.test(next)) break;
          if (/^\*?\*?Environment\s*:/i.test(next)) {
            insertPos = j; // Insert before Environment
            break;
          }
          if (/^(CERTIFICATIONS|EDUCATION|TECHNICAL\s+SKILLS)/i.test(next)) {
            insertPos = j;
            break;
          }
          if (next.length > 0) insertPos = j + 1;
        }

        if (insertPos > 0) {
          // Insert blank line + points
          result.push("");
          for (const pt of points) result.push(pt);
          result.push("");
        }
        currentRoleIndex++;
      }
    }
  }

  return result.join("\n");
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function wrapInDocument(bodyContent: string, isEnhanced: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${isEnhanced ? "Enhanced Resume" : "Resume"}</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.15; max-width: 850px; margin: 20px auto; padding: 20px; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; }
td, th { border: 1px solid #ccc; padding: 6px; }
</style>
</head>
<body>
${isEnhanced ? '<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:6px;margin-bottom:20px;font-size:10pt;color:#3b82f6;"><strong>Enhanced by ATS Resume Builder v3.1</strong> — AI points added under latest 3 roles. All original formatting preserved.</div>' : ""}
${bodyContent}
</body>
</html>`;
}
