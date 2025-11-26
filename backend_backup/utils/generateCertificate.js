// functions/utils/generateCertificate.js
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

/**
 * Generates a PDF certificate
 * @param {string} userName - Name of the student
 * @param {string} courseName - Name of the completed course
 * @param {string} date - Completion date string
 * @returns {Promise<Uint8Array>} - The generated PDF bytes
 */
async function generateCertificatePDF(userName, courseName, date) {
  try {
    // 1. Load the template
    // Ensure 'certificate-bg.png' exists in the root of 'functions' folder or 'utils'
    const templatePath = path.join(__dirname, "../certificate-bg.png");
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
        throw new Error("Certificate template not found at " + templatePath);
    }

    const templateBytes = fs.readFileSync(templatePath);

    // 2. Create a new PDF and embed the image
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 Landscape (approx)
    
    const image = await pdfDoc.embedPng(templateBytes);
    const { width, height } = page.getSize();
    
    // Draw background to fill page
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    // 3. Embed Fonts
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 4. Draw Text
    // Logic to center text: x = (pageWidth - textWidth) / 2
    
    // User Name (Center, Large)
    const nameSize = 50;
    const nameText = userName || "Student Name";
    const nameWidth = font.widthOfTextAtSize(nameText, nameSize);
    page.drawText(nameText, {
      x: (width - nameWidth) / 2,
      y: height / 2 + 20, // Adjust Y based on your template design
      size: nameSize,
      font: font,
      color: rgb(0.2, 0.2, 0.2), // Dark Gray
    });

    // "For successfully completing" (Static)
    const staticText = "For successfully completing the course";
    const staticSize = 18;
    const staticWidth = regularFont.widthOfTextAtSize(staticText, staticSize);
    page.drawText(staticText, {
        x: (width - staticWidth) / 2,
        y: height / 2 - 20,
        size: staticSize,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Course Name (Center, Medium)
    const courseSize = 30;
    const courseText = courseName || "Course Title";
    const courseWidth = font.widthOfTextAtSize(courseText, courseSize);
    page.drawText(courseText, {
      x: (width - courseWidth) / 2,
      y: height / 2 - 60,
      size: courseSize,
      font: font,
      color: rgb(0.98, 0.8, 0.08), // Brand Yellow-ish (Gold)
    });

    // Date (Bottom Right or Center)
    const dateSize = 14;
    const dateText = `Date: ${date}`;
    const dateWidth = regularFont.widthOfTextAtSize(dateText, dateSize);
    page.drawText(dateText, {
        x: (width - dateWidth) / 2,
        y: height / 2 - 100, // Move down
        size: dateSize,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3)
    });

    // 5. Serialize
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

module.exports = { generateCertificatePDF };
