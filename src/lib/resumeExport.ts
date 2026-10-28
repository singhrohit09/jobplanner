import { GeneratedResume } from "../types";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generates and downloads the currently displayed resume as a properly formatted PDF.
 * Uses html2canvas to capture the exact rendered styling, font pairings, margins,
 * and template structure, and saves it as a clean multi-page or single-page PDF document.
 * Includes a direct vector PDF fallback if canvas capture cannot be completed.
 */
export async function downloadResumeAsPdf(
  resume: GeneratedResume,
  elementId: string = "resumePrintSheet"
): Promise<void> {
  const safeName = (resume.personalInfo.fullName || "Candidate").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${safeName}_Resume.pdf`;

  const element = document.getElementById(elementId);

  if (element) {
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution (retina quality)
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.borderRadius = "0px";
            clonedElement.style.border = "none";
            clonedElement.style.boxShadow = "none";
            clonedElement.style.backgroundColor = "#ffffff";
            clonedElement.style.maxWidth = "800px";
            clonedElement.style.margin = "0 auto";
            clonedElement.style.padding = "32px 36px";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // Additional pages if resume exceeds single A4 page
      while (heightLeft > 5) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      return;
    } catch (err) {
      console.warn("DOM canvas capture for PDF encountered an error, falling back to direct PDF generation:", err);
    }
  }

  // Fallback direct vector PDF generator
  generateVectorPdfFallback(resume, filename);
}

function generateVectorPdfFallback(resume: GeneratedResume, filename: string): void {
  const { personalInfo, summary, skills, education, projects, experience, certifications, achievements } = resume;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header - Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(25, 25, 25);
  doc.text((personalInfo.fullName || "Candidate Name").toUpperCase(), pageWidth / 2, y, { align: "center" });
  y += 6;

  // Contact Info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const contacts = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : "",
    personalInfo.github ? `GitHub: ${personalInfo.github}` : "",
    personalInfo.portfolio ? `Portfolio: ${personalInfo.portfolio}` : "",
  ].filter(Boolean).join("  |  ");

  const contactLines = doc.splitTextToSize(contacts, contentWidth);
  doc.text(contactLines, pageWidth / 2, y, { align: "center" });
  y += contactLines.length * 4 + 2;

  // Horizontal line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const addSectionHeading = (title: string) => {
    checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(title.toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(200, 100, 60);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  // Summary
  if (summary) {
    addSectionHeading("Professional Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const summaryLines = doc.splitTextToSize(summary, contentWidth);
    checkPageBreak(summaryLines.length * 3.8);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 3.8 + 3;
  }

  // Education
  if (education && education.length > 0) {
    addSectionHeading("Education");
    education.forEach((edu) => {
      checkPageBreak(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      doc.text(edu.institution, margin, y);
      doc.text(edu.graduationYear || "", pageWidth - margin, y, { align: "right" });
      y += 4;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const degreeText = `${edu.degree}${edu.branch ? ` in ${edu.branch}` : ""}`;
      doc.text(degreeText, margin, y);
      if (edu.cgpa) {
        doc.text(`CGPA: ${edu.cgpa}`, pageWidth - margin, y, { align: "right" });
      }
      y += 5;
    });
  }

  // Technical Skills
  if (skills && skills.length > 0) {
    addSectionHeading("Technical Competencies");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text("Skills & Technologies: ", margin, y);
    const skillsOffset = margin + 38;
    doc.setFont("helvetica", "normal");
    const skillsText = skills.join(", ");
    const skillLines = doc.splitTextToSize(skillsText, contentWidth - 38);
    doc.text(skillLines, skillsOffset, y);
    y += skillLines.length * 4 + 3;
  }

  // Projects
  if (projects && projects.length > 0) {
    addSectionHeading("Technical Projects");
    projects.forEach((proj) => {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      const titleText = `${proj.title}${proj.techStack ? ` (${proj.techStack})` : ""}`;
      doc.text(titleText, margin, y);
      if (proj.link) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(proj.link, pageWidth - margin, y, { align: "right" });
      }
      y += 4;

      if (proj.points && proj.points.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        proj.points.forEach((pt) => {
          const ptLines = doc.splitTextToSize(`• ${pt}`, contentWidth - 4);
          checkPageBreak(ptLines.length * 3.5);
          doc.text(ptLines, margin + 2, y);
          y += ptLines.length * 3.5 + 1;
        });
      }
      y += 2;
    });
  }

  // Experience
  if (experience && experience.length > 0) {
    addSectionHeading("Work Experience & Internships");
    experience.forEach((exp) => {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      doc.text(`${exp.role} — ${exp.company}`, margin, y);
      doc.text(exp.duration || "", pageWidth - margin, y, { align: "right" });
      y += 4;

      if (exp.points && exp.points.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        exp.points.forEach((pt) => {
          const ptLines = doc.splitTextToSize(`• ${pt}`, contentWidth - 4);
          checkPageBreak(ptLines.length * 3.5);
          doc.text(ptLines, margin + 2, y);
          y += ptLines.length * 3.5 + 1;
        });
      }
      y += 2;
    });
  }

  // Certifications
  if (certifications && certifications.length > 0) {
    addSectionHeading("Certifications");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    certifications.forEach((c) => {
      checkPageBreak(5);
      doc.text(`• ${c.title} — ${c.issuer} (${c.year})`, margin + 2, y);
      y += 4;
    });
    y += 2;
  }

  // Achievements
  if (achievements && achievements.length > 0) {
    addSectionHeading("Honors & Achievements");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    achievements.forEach((a) => {
      checkPageBreak(5);
      const achText = `• ${a.title}${a.description ? `: ${a.description}` : ""}`;
      const achLines = doc.splitTextToSize(achText, contentWidth - 4);
      doc.text(achLines, margin + 2, y);
      y += achLines.length * 4;
    });
  }

  doc.save(filename);
}

/**
 * Downloads the resume as a formatted Word (.doc) document that opens natively
 * in Microsoft Word, Google Docs, and LibreOffice with proper styles and hierarchy.
 */
export function downloadResumeAsDoc(resume: GeneratedResume): void {
  const { personalInfo, summary, skills, education, projects, experience, certifications, achievements } = resume;

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${personalInfo.fullName || "Candidate"} - Resume</title>
      <style>
        body {
          font-family: Arial, Calibri, sans-serif;
          font-size: 10.5pt;
          line-height: 1.35;
          color: #111111;
          margin: 0.5in;
        }
        h1 {
          font-size: 18pt;
          text-align: center;
          margin: 0 0 4pt 0;
          text-transform: uppercase;
          color: #111111;
          letter-spacing: 0.5pt;
        }
        .contact-info {
          text-align: center;
          font-size: 9.5pt;
          color: #444444;
          margin-bottom: 12pt;
          border-bottom: 1.5pt solid #222222;
          padding-bottom: 6pt;
        }
        h2 {
          font-size: 11pt;
          text-transform: uppercase;
          border-bottom: 1pt solid #333333;
          padding-bottom: 2pt;
          margin: 10pt 0 4pt 0;
          color: #222222;
          letter-spacing: 0.5pt;
        }
        p { margin: 3pt 0; }
        ul { margin: 2pt 0 6pt 18pt; padding: 0; }
        li { margin-bottom: 2pt; }
        .entry-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        .entry-sub {
          display: flex;
          justify-content: space-between;
          font-style: italic;
          color: #333333;
          margin-bottom: 2pt;
        }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${personalInfo.fullName || "Candidate Name"}</h1>
      <div class="contact-info">
        ${[
          personalInfo.email,
          personalInfo.phone,
          personalInfo.location,
          personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : "",
          personalInfo.github ? `GitHub: ${personalInfo.github}` : "",
          personalInfo.portfolio ? `Portfolio: ${personalInfo.portfolio}` : "",
        ].filter(Boolean).join("  |  ")}
      </div>

      ${summary ? `
        <h2>Professional Summary</h2>
        <p>${summary}</p>
      ` : ""}

      ${education && education.length > 0 ? `
        <h2>Education</h2>
        ${education.map(edu => `
          <div>
            <table width="100%" style="margin-bottom: 2pt;">
              <tr>
                <td style="font-weight:bold;">${edu.institution}</td>
                <td style="text-align:right; font-weight:bold;">${edu.graduationYear || ""}</td>
              </tr>
              <tr>
                <td style="font-style:italic;">${edu.degree}${edu.branch ? ` in ${edu.branch}` : ""}</td>
                <td style="text-align:right;">${edu.cgpa ? `CGPA: ${edu.cgpa}` : ""}</td>
              </tr>
            </table>
          </div>
        `).join("")}
      ` : ""}

      ${skills && skills.length > 0 ? `
        <h2>Technical Competencies</h2>
        <p><span class="bold">Skills & Technologies:</span> ${skills.join(", ")}</p>
      ` : ""}

      ${projects && projects.length > 0 ? `
        <h2>Technical Projects</h2>
        ${projects.map(p => `
          <div>
            <table width="100%">
              <tr>
                <td style="font-weight:bold;">${p.title} ${p.techStack ? `<span style="font-weight:normal; font-style:italic;">(${p.techStack})</span>` : ""}</td>
                <td style="text-align:right;">${p.link || ""}</td>
              </tr>
            </table>
            ${p.points && p.points.length > 0 ? `
              <ul>
                ${p.points.map(pt => `<li>${pt}</li>`).join("")}
              </ul>
            ` : ""}
          </div>
        `).join("")}
      ` : ""}

      ${experience && experience.length > 0 ? `
        <h2>Work Experience & Internships</h2>
        ${experience.map(exp => `
          <div>
            <table width="100%">
              <tr>
                <td style="font-weight:bold;">${exp.role} — ${exp.company}</td>
                <td style="text-align:right; font-weight:bold;">${exp.duration || ""}</td>
              </tr>
              ${exp.location ? `<tr><td colspan="2" style="font-size:9pt; color:#555;">${exp.location}</td></tr>` : ""}
            </table>
            ${exp.points && exp.points.length > 0 ? `
              <ul>
                ${exp.points.map(pt => `<li>${pt}</li>`).join("")}
              </ul>
            ` : ""}
          </div>
        `).join("")}
      ` : ""}

      ${certifications && certifications.length > 0 ? `
        <h2>Certifications</h2>
        <ul>
          ${certifications.map(c => `
            <li><span class="bold">${c.title}</span> — ${c.issuer} (${c.year})</li>
          `).join("")}
        </ul>
      ` : ""}

      ${achievements && achievements.length > 0 ? `
        <h2>Honors & Achievements</h2>
        <ul>
          ${achievements.map(a => `
            <li><span class="bold">${a.title}</span>${a.description ? `: ${a.description}` : ""}</li>
          `).join("")}
        </ul>
      ` : ""}
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff" + docContent], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `${(personalInfo.fullName || "Candidate").replace(/[^a-zA-Z0-9]/g, "_")}_Resume.doc`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads clean plain text / Markdown format suitable for automated ATS entry forms.
 */
export function downloadResumeAsTxt(resume: GeneratedResume): void {
  const { personalInfo, summary, skills, education, projects, experience, certifications, achievements } = resume;

  let txt = `${(personalInfo.fullName || "CANDIDATE").toUpperCase()}\n`;
  txt += `Email: ${personalInfo.email} | Phone: ${personalInfo.phone} | Location: ${personalInfo.location}\n`;
  if (personalInfo.linkedin) txt += `LinkedIn: ${personalInfo.linkedin}\n`;
  if (personalInfo.github) txt += `GitHub: ${personalInfo.github}\n`;
  if (personalInfo.portfolio) txt += `Portfolio: ${personalInfo.portfolio}\n`;
  txt += "=".repeat(60) + "\n\n";

  if (summary) {
    txt += "PROFESSIONAL SUMMARY\n";
    txt += "-".repeat(30) + "\n";
    txt += `${summary}\n\n`;
  }

  if (education && education.length > 0) {
    txt += "EDUCATION\n";
    txt += "-".repeat(30) + "\n";
    education.forEach((edu) => {
      txt += `${edu.institution} (${edu.graduationYear})\n`;
      txt += `${edu.degree} in ${edu.branch || "Engineering"}`;
      if (edu.cgpa) txt += ` - CGPA: ${edu.cgpa}`;
      txt += "\n\n";
    });
  }

  if (skills && skills.length > 0) {
    txt += "TECHNICAL SKILLS\n";
    txt += "-".repeat(30) + "\n";
    txt += skills.join(", ") + "\n\n";
  }

  if (projects && projects.length > 0) {
    txt += "TECHNICAL PROJECTS\n";
    txt += "-".repeat(30) + "\n";
    projects.forEach((p) => {
      txt += `${p.title} [Stack: ${p.techStack || "N/A"}]\n`;
      if (p.link) txt += `Link: ${p.link}\n`;
      p.points?.forEach((pt) => {
        txt += `• ${pt}\n`;
      });
      txt += "\n";
    });
  }

  if (experience && experience.length > 0) {
    txt += "WORK EXPERIENCE & INTERNSHIPS\n";
    txt += "-".repeat(30) + "\n";
    experience.forEach((exp) => {
      txt += `${exp.role} - ${exp.company} (${exp.duration})\n`;
      if (exp.location) txt += `Location: ${exp.location}\n`;
      exp.points?.forEach((pt) => {
        txt += `• ${pt}\n`;
      });
      txt += "\n";
    });
  }

  if (certifications && certifications.length > 0) {
    txt += "CERTIFICATIONS\n";
    txt += "-".repeat(30) + "\n";
    certifications.forEach((c) => {
      txt += `• ${c.title} - ${c.issuer} (${c.year})\n`;
    });
    txt += "\n";
  }

  if (achievements && achievements.length > 0) {
    txt += "ACHIEVEMENTS\n";
    txt += "-".repeat(30) + "\n";
    achievements.forEach((a) => {
      txt += `• ${a.title}${a.description ? `: ${a.description}` : ""}\n`;
    });
    txt += "\n";
  }

  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `${(personalInfo.fullName || "Candidate").replace(/[^a-zA-Z0-9]/g, "_")}_Resume.txt`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers native browser print formatted specifically for the resume canvas.
 */
export function triggerPrintResume(): void {
  window.print();
}
