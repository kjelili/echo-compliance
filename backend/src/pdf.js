import PDFDocument from "pdfkit";
import { formatStructuredReportText } from "./summarizer.js";

export function createPdfForLog(log, response) {
  const doc = new PDFDocument({ margin: 48 });
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="echo-compliance-${log.id}.pdf"`);
  doc.pipe(response);

  doc.fontSize(20).text("Echo Compliance Daily Report", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Site: ${log.siteName}`);
  doc.text(`Foreman: ${log.foreman}`);
  doc.text(`Created: ${new Date(log.createdAt).toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(14).text("Summary");
  doc.fontSize(11).text(log.summary);
  doc.moveDown();

  doc.fontSize(14).text("Tags");
  doc.fontSize(11).text(log.tags.join(", "));
  doc.moveDown();

  doc.fontSize(14).text("Structured Report");
  doc.fontSize(11).text(formatStructuredReportText(log.structured));
  doc.moveDown();

  doc.fontSize(14).text("Attachments");
  if (log.attachments.length === 0) {
    doc.fontSize(11).text("No photo attachments.");
  } else {
    log.attachments.forEach((photo, index) => {
      doc.fontSize(11).text(`${index + 1}. ${photo.filename}`);
    });
  }

  doc.end();
}
