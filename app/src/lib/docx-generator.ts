import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } from "docx";
import type { RolePoints } from "@/lib/analyzer";
import type { DetectedRole } from "@/lib/extractor";

/**
 * Generate a professional DOCX with ALL roles preserved.
 * Points are added under the latest 3 roles only; all other roles stay as-is.
 */
export async function generateDocx(
  contactInfo: { name?: string; email?: string; phone?: string; linkedin?: string },
  summary: string,
  summaryBullets: string[],
  certifications: string[],
  education: string[],
  skills: string[],
  allRoles: DetectedRole[],
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): Promise<Blob> {
  const children: any[] = [];

  // --- NAME ---
  if (contactInfo.name) {
    children.push(new Paragraph({
      text: contactInfo.name,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  // --- CONTACT INFO ---
  const contactParts: string[] = [];
  if (contactInfo.email) contactParts.push(contactInfo.email);
  if (contactInfo.phone) contactParts.push(contactInfo.phone);
  if (contactInfo.linkedin) contactParts.push(contactInfo.linkedin);
  if (contactParts.length > 0) {
    children.push(new Paragraph({
      text: contactParts.join(" | "),
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));
  }

  // --- PROFESSIONAL SUMMARY ---
  if (summary || summaryBullets.length > 0) {
    children.push(new Paragraph({
      text: "PROFESSIONAL SUMMARY",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      border: { bottom: { color: "1e293b", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    }));
    if (summary) {
      children.push(new Paragraph({ text: summary, spacing: { after: 100 } }));
    }
    for (const bullet of summaryBullets) {
      children.push(new Paragraph({ text: bullet, bullet: { level: 0 }, spacing: { after: 60 } }));
    }
  }

  // --- CERTIFICATIONS ---
  if (certifications.length > 0) {
    children.push(new Paragraph({
      text: "CERTIFICATIONS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      border: { bottom: { color: "1e293b", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    }));
    for (const cert of certifications) {
      if (cert.trim().length > 3) {
        children.push(new Paragraph({ text: cert.trim(), spacing: { after: 60 } }));
      }
    }
  }

  // --- EDUCATION ---
  if (education.length > 0) {
    children.push(new Paragraph({
      text: "EDUCATION",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      border: { bottom: { color: "1e293b", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    }));
    for (const edu of education) {
      if (edu.trim().length > 5) {
        children.push(new Paragraph({ text: edu.trim(), spacing: { after: 60 } }));
      }
    }
  }

  // --- TECHNICAL SKILLS ---
  if (skills.length > 0) {
    children.push(new Paragraph({
      text: "TECHNICAL SKILLS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      border: { bottom: { color: "1e293b", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    }));
    children.push(new Paragraph({ text: skills.join(", "), spacing: { after: 100 } }));
  }

  // --- PROFESSIONAL EXPERIENCE ---
  children.push(new Paragraph({
    text: "PROFESSIONAL EXPERIENCE",
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 200 },
    border: { bottom: { color: "1e293b", space: 1, style: BorderStyle.SINGLE, size: 6 } },
  }));

  // Build a lookup: company name (normalized) -> rolePoints entry
  const pointsByCompany = new Map<string, RolePoints>();
  for (const rp of rolePoints) {
    const key = rp.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    pointsByCompany.set(key, rp);
  }

  // Output ALL roles from original resume
  for (const role of allRoles) {
    // Find matching rolePoints entry (for the latest 3 roles)
    const companyKey = role.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedPoints = pointsByCompany.get(companyKey);
    const hasSelectedPoints = matchedPoints && matchedPoints.newPoints.some(p => selectedPointIds.includes(p.id));

    // Role header: Role Title | Company | Duration
    children.push(new Paragraph({
      children: [
        new TextRun({ text: role.title || "", bold: true, size: 24 }),
        role.company ? new TextRun({ text: " | " + role.company, bold: true, size: 22 }) : new TextRun(""),
        role.duration ? new TextRun({ text: " | " + role.duration, size: 22 }) : new TextRun(""),
      ],
      spacing: { before: 200, after: 60 },
    }));

    // "Roles & Responsibilities"
    children.push(new Paragraph({
      children: [new TextRun({ text: "Roles & Responsibilities", italics: true })],
      spacing: { before: 60, after: 60 },
    }));

    // Existing bullets (always preserved)
    for (const bullet of role.bullets) {
      children.push(new Paragraph({
        text: bullet,
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
    }

    // NEW: Selected AI points (only for latest 3 roles)
    if (hasSelectedPoints && matchedPoints) {
      const selected = matchedPoints.newPoints.filter(p => selectedPointIds.includes(p.id));
      for (const pt of selected) {
        children.push(new Paragraph({
          text: pt.text,
          bullet: { level: 0 },
          spacing: { after: 40 },
        }));
      }
    }

    // Environment (if present)
    if (role.environment) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Environment: " + role.environment, italics: true })],
        spacing: { before: 40, after: 60 },
      }));
    }

    // Spacing between roles
    children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate PDF with ALL roles preserved.
 */
export async function generatePdf(
  contactInfo: { name?: string; email?: string; phone?: string; linkedin?: string },
  summary: string,
  summaryBullets: string[],
  certifications: string[],
  education: string[],
  skills: string[],
  allRoles: DetectedRole[],
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): Promise<Blob> {
  try {
    const pdfMake = await import("pdfmake/build/pdfmake");
    const pdfFonts = await import("pdfmake/build/vfs_fonts");
    if (!pdfMake.default || !pdfFonts.default) {
      throw new Error("pdfmake failed to load");
    }
    const pdfMakeInstance = pdfMake.default;
    pdfMakeInstance.vfs = pdfFonts.default.pdfMake?.vfs || pdfFonts.default.vfs;

    const contactParts: string[] = [];
    if (contactInfo.email) contactParts.push(contactInfo.email);
    if (contactInfo.phone) contactParts.push(contactInfo.phone);

    const content: any[] = [];

    if (contactInfo.name) {
      content.push({ text: contactInfo.name, style: "header", margin: [0, 0, 0, 5] });
    }
    if (contactParts.length > 0) {
      content.push({ text: contactParts.join(" | "), style: "subheader", margin: [0, 0, 0, 10] });
    }

    if (summary || summaryBullets.length > 0) {
      content.push({ text: "PROFESSIONAL SUMMARY", style: "sectionHeader" });
      if (summary) content.push({ text: summary, style: "body", margin: [0, 0, 0, 8] });
      for (const bullet of summaryBullets) {
        content.push({ text: bullet, style: "bullet", margin: [10, 2, 0, 2] });
      }
      content.push({ text: "", margin: [0, 0, 0, 5] });
    }

    if (certifications.length > 0) {
      content.push({ text: "CERTIFICATIONS", style: "sectionHeader" });
      for (const cert of certifications) {
        if (cert.trim().length > 3) content.push({ text: cert.trim(), style: "body", margin: [0, 1, 0, 1] });
      }
      content.push({ text: "", margin: [0, 0, 0, 5] });
    }

    if (education.length > 0) {
      content.push({ text: "EDUCATION", style: "sectionHeader" });
      for (const edu of education) {
        if (edu.trim().length > 5) content.push({ text: edu.trim(), style: "body", margin: [0, 1, 0, 1] });
      }
      content.push({ text: "", margin: [0, 0, 0, 5] });
    }

    if (skills.length > 0) {
      content.push({ text: "TECHNICAL SKILLS", style: "sectionHeader" });
      content.push({ text: skills.join(", "), style: "body", margin: [0, 0, 0, 10] });
    }

    // Build lookup
    const pointsByCompany = new Map<string, RolePoints>();
    for (const rp of rolePoints) {
      const key = rp.company.toLowerCase().replace(/[^a-z0-9]/g, "");
      pointsByCompany.set(key, rp);
    }

    content.push({ text: "PROFESSIONAL EXPERIENCE", style: "sectionHeader" });

    for (const role of allRoles) {
      const companyKey = role.company.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedPoints = pointsByCompany.get(companyKey);
      const hasSelected = matchedPoints && matchedPoints.newPoints.some(p => selectedPointIds.includes(p.id));

      content.push({
        text: (role.title || "") + (role.company ? " | " + role.company : "") + (role.duration ? " | " + role.duration : ""),
        style: "roleHeader",
      });

      content.push({ text: "Roles & Responsibilities", italics: true, fontSize: 10, margin: [0, 4, 0, 4] });

      const allBullets: any[] = [];
      for (const bullet of role.bullets) {
        allBullets.push({ text: bullet, style: "bullet" });
      }
      if (hasSelected && matchedPoints) {
        const selected = matchedPoints.newPoints.filter(p => selectedPointIds.includes(p.id));
        for (const pt of selected) {
          allBullets.push({ text: pt.text, style: "bullet" });
        }
      }

      content.push({ ul: allBullets, margin: [10, 3, 0, 10], fontSize: 10 });

      if (role.environment) {
        content.push({ text: "Environment: " + role.environment, italics: true, fontSize: 9, margin: [0, 4, 0, 10], color: "#64748b" });
      }
    }

    const docDefinition = {
      content,
      styles: {
        header: { fontSize: 24, bold: true, alignment: "center", color: "#1e293b" },
        subheader: { fontSize: 10, alignment: "center", color: "#64748b", margin: [0, 0, 0, 15] },
        sectionHeader: { fontSize: 13, bold: true, margin: [0, 15, 0, 6], color: "#1e293b" },
        body: { fontSize: 10, lineHeight: 1.3, color: "#334155" },
        roleHeader: { fontSize: 11, bold: true, margin: [0, 10, 0, 3], color: "#1e293b" },
        bullet: { fontSize: 10, lineHeight: 1.3, color: "#334155" },
      },
      defaultStyle: { font: "Helvetica", fontSize: 10 },
      pageMargins: [50, 50, 50, 50],
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
        pdfDoc.getBlob((blob: Blob) => resolve(blob));
      } catch (e) { reject(e); }
    });
  } catch (e) {
    throw new Error("PDF generation failed: " + (e as Error).message);
  }
}
