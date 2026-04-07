const { Resend } = require('resend');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const sizeOf = require('image-size');

// Initialize Resend with API key, or null if not provided
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Check if Resend is properly configured
if (!resendApiKey) {
  console.warn('⚠️  RESEND_API_KEY not found in environment variables. Email functionality will be disabled.');
  console.warn('   To enable email functionality:');
  console.warn('   1. Get your API key from https://resend.com');
  console.warn('   2. Add RESEND_API_KEY=re_your_key_here to your .env file');
}

// Simple i18n helpers for emails and PDFs
const getReportLanguage = (reportData) => {
  return (
    (reportData && (reportData.language || reportData.lang)) ||
    (reportData && reportData.content && (reportData.content.language || reportData.content.lang)) ||
    (reportData && reportData.client && (reportData.client.language || reportData.client.lang)) ||
    (reportData && reportData.agent && (reportData.agent.language || reportData.agent.lang)) ||
    'en'
  );
};

const getAgreementNotice = (lang = 'en') => {
  const text = {
    en: 'The agent and the client have reached an agreement for the apartment, following a detailed inspection of the exterior conditions, interior conditions, electrical system, HVAC system, and the security deposit. After reviewing these elements, both parties signed the agreement in accordance with the specified terms.',
    alb: 'Agjenti dhe klienti kanë arritur një marrëveshje për apartamentin, pas inspektimit të detajuar të kushteve të jashtme, kushteve të brendshme, sistemit elektrik, sistemit HVAC dhe depozitës së sigurimit (kaution). Pas shqyrtimit të këtyre elementëve, të dy palët kanë nënshkruar marrëveshjen në përputhje me kushtet e përcaktuara.',
    de: 'Der Makler und der Kunde haben nach einer detaillierten Inspektion der Außenbedingungen, der Innenbedingungen, der Elektroanlage, des HVAC-Systems und der Kaution eine Einigung über die Wohnung erzielt. Nach Prüfung dieser Elemente haben beide Parteien die Vereinbarung gemäß den festgelegten Bedingungen unterzeichnet.'
  };
  return text[lang] || text.en;
};

// Generate a PDF buffer from report data with images
const generateReportPdfBuffer = async (reportData, databaseName = null) => {
  // Convert SVG logo to PNG buffer before creating PDF doc
  const logoPath = path.join(__dirname, '..', '..', 'src', 'assets', 'kurz-immobilien-logo.svg');
  let logoPngBuffer = null;
  
  if (fs.existsSync(logoPath)) {
    try {
      const svgBuffer = fs.readFileSync(logoPath);
      logoPngBuffer = await sharp(svgBuffer)
        .resize(200, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png()
        .toBuffer();
    } catch (logoError) {
      console.log('Could not convert logo:', logoError.message);
    }
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      const bufferStream = new stream.Writable({
        write(chunk, _enc, next) {
          chunks.push(chunk);
          next();
        }
      });

      doc.pipe(bufferStream);

      // Monochrome color scheme (all black accents)
      const colors = {
        primary: '#000000',
        primaryLight: '#000000',
        secondary: '#000000',
        success: '#000000',
        warning: '#000000',
        error: '#000000',
        text: '#000000',
        textSecondary: '#000000',
        textLight: '#000000',
        background: '#ffffff',
        border: '#000000'
      };

      // Add logo if available
      let logoAdded = false;
      if (logoPngBuffer) {
        try {
          // Center the logo horizontally on the page
          const logoWidth = 140;
          const logoHeight = 50;
          const pageWidth = doc.page.width;
          const logoX = (pageWidth - logoWidth) / 2;
          
          doc.image(logoPngBuffer, {
            fit: [logoWidth, logoHeight],
            x: logoX,
            y: doc.y
          });
          doc.moveDown(0.5);
          logoAdded = true;
        } catch (logoError) {
          console.log('Could not add logo to PDF:', logoError.message);
        }
      }

      // Professional header with company branding
      if (!logoAdded) {
        doc
          .fontSize(24)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text('Kurz Immobilien', { align: 'center' });
      }
      
      doc
        .fontSize(16)
        .fillColor(colors.textSecondary)
        .font('Helvetica')
        .text('Property Inspection Report', { align: 'center' })
        .moveDown(0.8);

      // Define centered content area with fixed width
      const pageWidth = doc.page.width; // A4 width = 595.28
      const contentWidth = 480; // Fixed content width
      const contentLeft = (pageWidth - contentWidth) / 2; // Center horizontally

      // Add decorative line (centered)
      doc
        .strokeColor(colors.primary)
        .lineWidth(2)
        .moveTo(contentLeft, doc.y)
        .lineTo(contentLeft + contentWidth, doc.y)
        .stroke();
      
      doc.moveDown(0.3);

      // Agreement notice paragraph (localized) - render ABOVE Report Information (centered)
      try {
        const lang = getReportLanguage(reportData);
        const agreementNotice = getAgreementNotice(lang);

        // Paragraph box (centered)
        const paraStartYTop = doc.y;
        doc
          .rect(contentLeft, paraStartYTop, contentWidth, 60)
          .fillColor(colors.background)
          .fill()
          .strokeColor(colors.border)
          .lineWidth(1)
          .stroke();
        doc
          .fontSize(11)
          .fillColor(colors.text)
          .font('Helvetica')
          .text(agreementNotice, contentLeft + 8, paraStartYTop + 6, { width: contentWidth - 16, align: 'left' });
        doc.y = paraStartYTop + 70;
      } catch (_e) {
        // Ignore localization rendering errors
      }

      // Professional report information section (centered)
      doc
        .fontSize(14)
        .fillColor(colors.primary)
        .font('Helvetica-Bold')
        .text('Report Information', contentLeft, doc.y, { width: contentWidth, align: 'left' });
      
      doc.moveDown(0.3);

      // Create a professional info table
      const info = [
        ['Report ID', String(reportData.id || '—')],
        ['Property Address', String(reportData.propertyAddress || '—')],
        ['Inspection Date', new Date(reportData.inspectionDate || Date.now()).toLocaleString()],
        ['Inspector', String(reportData.inspectorName || '—')],
        ['Client Email', String(reportData.clientEmail || '—')],
      ];

      // Add background for info section (centered)
      const infoStartY = doc.y;
      const infoHeight = info.length * 25 + 20;
      
      doc
        .rect(contentLeft, infoStartY - 5, contentWidth, infoHeight)
        .fillColor(colors.background)
        .fill()
        .strokeColor(colors.border)
        .lineWidth(1)
        .stroke();

      doc.fontSize(11).fillColor(colors.text);
      info.forEach(([label, value], index) => {
        const yPos = infoStartY + (index * 25);
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.text)
          .text(`${label}:`, contentLeft + 10, yPos)
          .font('Helvetica')
          .fillColor(colors.textSecondary)
          .text(value, contentLeft + 160, yPos);
      });

      doc.y = infoStartY + infoHeight + 10;

      // Professional inspection sections
      const sections = reportData.inspectionData || reportData.content?.inspectionData || reportData.content || {};
      const imagesData = reportData.content?.images || {};
      const sectionOrder = ['exterior', 'interior', 'electrical', 'plumbing', 'hvac', 'safety'];

      // Add section divider (centered)
      doc.moveDown(0.2);
      doc
        .strokeColor(colors.border)
        .lineWidth(1)
        .moveTo(contentLeft, doc.y)
        .lineTo(contentLeft + contentWidth, doc.y)
        .stroke();
      doc.moveDown(0.3);

      // Process each section with enhanced styling (centered)
      sectionOrder.forEach((key) => {
        const area = sections[key];
        const areaImages = imagesData[key];
        
        if (!area && !areaImages) return;

        // Section header (centered)
        if (doc.y > doc.page.height - 180) { doc.addPage(); }
        const sectionStartY = doc.y;
        const sectionHeaderText = capitalize(key);
        
        doc
          .fontSize(16)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text(sectionHeaderText, contentLeft, sectionStartY, { width: contentWidth, align: 'center' });
        
        // Add underline for section (centered, fixed width)
        const underlineWidth = 120;
        const underlineX = contentLeft + (contentWidth - underlineWidth) / 2;
        doc
          .strokeColor(colors.primary)
          .lineWidth(2)
          .moveTo(underlineX, sectionStartY + 20)
          .lineTo(underlineX + underlineWidth, sectionStartY + 20)
          .stroke();
        
        doc.y = sectionStartY + 30;

        // Two-column layout when images exist, otherwise single column (centered)
        const rightGap = 20;
        const useTwoColumns = !!(areaImages && Object.keys(areaImages).length);
        const leftW = useTwoColumns ? 280 : contentWidth;
        const rightW = useTwoColumns ? (contentWidth - leftW - rightGap) : 0;
        
        // Center the table within the left column
        const tableWidth = leftW - 20; // Leave 10px margin on each side
        const leftX = useTwoColumns ? (contentLeft + 10) : contentLeft;
        
        // Fixed image width for consistency (centered in right column)
        const imageWidth = useTwoColumns ? Math.min(180, rightW - 20) : 0;

        let yText = doc.y;
        let yImg = doc.y;

        // Render inspection details as a professional table (centered)
        if (area && typeof area === 'object') {
          // Prepare table data
          const tableData = Object.entries(area)
            .filter(([k, v]) => !Array.isArray(v))
            .map(([k, v]) => {
              const label = prettify(k);
              const value = typeof v === 'string' ? v : JSON.stringify(v);
              return [label, value];
            });

          if (tableData.length > 0) {
            // Check if we need a new page for the table
            const estimatedTableHeight = 20 + (tableData.length * 18) + 10; // header + rows + padding
            if (yText + estimatedTableHeight > doc.page.height - 200) {
              doc.addPage();
              yText = doc.y;
              yImg = doc.y;
            }

            // Render the table (centered within its column)
            const tableY = renderTable(doc, tableData, leftX, yText, tableWidth, colors, {
              labelColumnWidth: tableWidth * 0.4,
              fontSize: 9,
              rowHeight: 20
            });

            yText = tableY + 8; // Add spacing after table
          }
        }

        // Render images in right column (fixed size, centered)
        if (useTwoColumns) {
          // Images header on right (centered)
          doc
            .fontSize(12)
            .fillColor(colors.text)
            .font('Helvetica-Bold')
            .text('Images:', contentLeft + leftW + rightGap, yImg, { width: rightW, align: 'center' });
          yImg = doc.y + 4;

          // Process images sequentially to handle async operations properly
          // Use IIFE to handle async operations inside Promise callback
          (async () => {
            for (const [fieldName, images] of Object.entries(areaImages)) {
              if (!Array.isArray(images) || images.length === 0) continue;
              const fieldLabel = prettify(fieldName);

              // Field label (centered)
              doc
                .fontSize(10)
                .fillColor(colors.textSecondary)
                .font('Helvetica-Bold')
                .text(`${fieldLabel}:`, contentLeft + leftW + rightGap, yImg, { width: rightW, align: 'center' });
              yImg = doc.y + 2;

              for (let index = 0; index < images.length; index++) {
                const image = images[index];
                if (!image.uri) continue;
                try {
                  let imageBuffer = null;
                  
                  // Check if URI is in new MongoDB format: /api/images/{imageId}
                  const newFormatMatch = image.uri.match(/^\/api\/images\/([a-f\d]{24})$/i);
                  if (newFormatMatch && databaseName) {
                    // Retrieve from MongoDB GridFS
                    const { getImageFromGridFS } = require('./imageStorage');
                    try {
                      const imageId = newFormatMatch[1];
                      const result = await getImageFromGridFS(imageId, databaseName);
                      imageBuffer = result.buffer;
                    } catch (mongoError) {
                      console.error('Error retrieving image from MongoDB:', mongoError);
                      continue;
                    }
                  } else {
                    // Legacy format: try filesystem (for backward compatibility)
                    const parts = image.uri.split('/');
                    const filename = parts[parts.length - 1];
                    const dateFolder = parts[parts.length - 2];
                    if (!filename || !dateFolder) continue;
                    const filePath = path.join(__dirname, '..', 'uploads', dateFolder, filename);
                    if (fs.existsSync(filePath)) {
                      imageBuffer = fs.readFileSync(filePath);
                    } else {
                      continue; // Image not found
                    }
                  }
                  
                  if (!imageBuffer) continue;
                  
                  // Fixed image size for consistency (110px height x 180px width)
                  const imgH = 110; // Fixed height
                  const imgW = imageWidth; // Fixed width (centered in right column)
                  
                  if (yImg + imgH + 25 > doc.page.height - 50) {
                    doc.addPage();
                    yText = doc.y;
                    doc
                      .fontSize(12)
                      .fillColor(colors.text)
                      .font('Helvetica-Bold')
                      .text('Images:', contentLeft + leftW + rightGap, doc.y, { width: rightW, align: 'center' });
                    yImg = doc.y + 4;
                  }
                  
                  // Calculate centered position for image
                  const imgX = contentLeft + leftW + rightGap + (rightW - imgW) / 2;
                  
                  // Border (fixed size, centered)
                  doc
                    .rect(imgX, yImg, imgW, imgH)
                    .strokeColor(colors.border)
                    .lineWidth(1)
                    .stroke();
                  
                  // Image (centered in frame) - use buffer instead of file path
                  doc.image(imageBuffer, {
                    fit: [imgW - 4, imgH - 4],
                    x: imgX + 2,
                    y: yImg + 2,
                    align: 'center',
                    valign: 'center'
                  });
                  
                  // Caption (centered)
                  doc
                    .fontSize(8)
                    .fillColor(colors.textLight)
                    .font('Helvetica')
                    .text(`${fieldLabel} - Image ${index + 1}`, contentLeft + leftW + rightGap, yImg + imgH + 4, { width: rightW, align: 'center' });
                  yImg = yImg + imgH + 20;
                } catch (e) {
                  console.log(`Error processing image ${image.uri}:`, e.message);
                }
              }
            }
          })();
        }

        // Advance to the lower of the two columns + spacing
        doc.y = Math.max(yText, yImg) + 5;

        // Subtle separator after each section (centered)
        doc
          .strokeColor(colors.border)
          .lineWidth(1)
          .moveTo(contentLeft, doc.y)
          .lineTo(contentLeft + contentWidth, doc.y)
          .stroke();
        doc.moveDown(0.2);
      });

      // Security Deposit section (centered)
      const securityDeposit = reportData.securityDeposit || reportData.content?.securityDeposit;
      if (securityDeposit && securityDeposit.amount) {
        // Add section divider
        doc.moveDown(0.2);
        doc
          .strokeColor(colors.border)
          .lineWidth(1)
          .moveTo(contentLeft, doc.y)
          .lineTo(contentLeft + contentWidth, doc.y)
          .stroke();
        doc.moveDown(0.3);

        // Security Deposit header (centered)
        doc
          .fontSize(16)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text('Security Deposit (Kaution)', contentLeft, doc.y, { width: contentWidth, align: 'center' });
        
        // Add underline for security deposit section (centered, fixed width)
        const underlineWidth = 200;
        const underlineX = contentLeft + (contentWidth - underlineWidth) / 2;
        doc
          .strokeColor(colors.primary)
          .lineWidth(2)
          .moveTo(underlineX, doc.y + 20)
          .lineTo(underlineX + underlineWidth, doc.y + 20)
          .stroke();
        
        doc.y += 30;

        // Security deposit info box (centered)
        const depositStartY = doc.y;
        const depositHeight = 60;
        
        doc
          .rect(contentLeft, depositStartY, contentWidth, depositHeight)
          .fillColor(colors.background)
          .fill()
          .strokeColor(colors.border)
          .lineWidth(1)
          .stroke();

        // Deposit amount (large and prominent, centered)
        doc
          .fontSize(18)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text(`${securityDeposit.currency} ${securityDeposit.amount}`, contentLeft, depositStartY + 10, { width: contentWidth, align: 'center' });

        // Payment method (centered)
        if (securityDeposit.paymentMethod) {
          doc
            .fontSize(11)
            .fillColor(colors.text)
            .font('Helvetica-Bold')
            .text('Payment Method:', contentLeft + 10, depositStartY + 35, { width: 150, align: 'left' })
            .font('Helvetica')
            .fillColor(colors.textSecondary)
            .text(securityDeposit.paymentMethod, contentLeft + 160, depositStartY + 35);
        }

        // Additional notes (centered)
        if (securityDeposit.notes) {
          doc
            .fontSize(9)
            .fillColor(colors.textLight)
            .font('Helvetica')
            .text('Notes:', contentLeft + 10, depositStartY + 50)
            .text(securityDeposit.notes, contentLeft + 10, depositStartY + 50, { width: contentWidth - 20 });
        }

        doc.y = depositStartY + depositHeight + 10;
      }

      // (Agreement notice moved above Report Information)

      // Professional signatures section (centered)
      const signatures = reportData.signatures || reportData.content?.signatures || {};
      if (signatures.agentSignature || signatures.clientSignature || signatures.agent || signatures.client) {
        // Add section divider
        doc.moveDown(0.2);
        doc
          .strokeColor(colors.border)
          .lineWidth(1)
          .moveTo(contentLeft, doc.y)
          .lineTo(contentLeft + contentWidth, doc.y)
          .stroke();
        doc.moveDown(0.3);

        // Signatures header (centered)
        doc
          .fontSize(16)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text('Signatures', contentLeft, doc.y, { width: contentWidth, align: 'center' });
        
        // Add underline for signatures section (centered, fixed width)
        const underlineWidth = 120;
        const underlineX = contentLeft + (contentWidth - underlineWidth) / 2;
        doc
          .strokeColor(colors.primary)
          .lineWidth(2)
          .moveTo(underlineX, doc.y + 20)
          .lineTo(underlineX + underlineWidth, doc.y + 20)
          .stroke();
        
        doc.y += 30;

        // Render signatures in a row (side-by-side, centered)
        const agentSig = signatures.agentSignature || signatures.agent;
        const clientSig = signatures.clientSignature || signatures.client;

        const resolveSigBuffer = async (sig) => {
          if (!sig || !sig.uri) return null;
          
          // Check if URI is in new MongoDB format: /api/images/{imageId}
          const newFormatMatch = sig.uri.match(/^\/api\/images\/([a-f\d]{24})$/i);
          if (newFormatMatch && databaseName) {
            try {
              const { getImageFromGridFS } = require('./imageStorage');
              const imageId = newFormatMatch[1];
              const result = await getImageFromGridFS(imageId, databaseName);
              return result.buffer;
            } catch (mongoError) {
              console.error('Error retrieving signature from MongoDB:', mongoError);
              return null;
            }
          } else {
            // Legacy format: try filesystem (for backward compatibility)
            const parts = sig.uri.split('/');
            const filename = parts[parts.length - 1];
            const dateFolder = parts[parts.length - 2];
            if (!filename || !dateFolder) return null;
            const filePath = path.join(__dirname, '..', 'uploads', dateFolder, filename);
            return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
          }
        };

        const agentBuffer = await resolveSigBuffer(agentSig);
        const clientBuffer = await resolveSigBuffer(clientSig);

        if (agentBuffer || clientBuffer) {
          const availableHeight = 80;
          if (doc.y + availableHeight > doc.page.height - 50) {
            doc.addPage();
          }

          // Center the signature boxes
          const gap = 20;
          const sigWidth = 220; // Fixed width for consistency
          const sigHeight = 70; // Fixed height
          const totalSigWidth = (sigWidth * (agentBuffer && clientBuffer ? 2 : 1)) + (agentBuffer && clientBuffer ? gap : 0);
          const sigStartX = contentLeft + (contentWidth - totalSigWidth) / 2;
          const labelY = doc.y; // draw labels on same baseline
          const topY = labelY + 12; // leave space for labels

          // Left box: Agent
          if (agentBuffer) {
            const agentX = sigStartX;
            // label (centered)
            doc
              .fontSize(12)
              .fillColor(colors.text)
              .font('Helvetica-Bold')
              .text('Agent Signature:', agentX, labelY, { width: sigWidth, align: 'center' });

            // box
            doc
              .rect(agentX, topY, sigWidth, sigHeight)
              .strokeColor(colors.border)
              .lineWidth(1)
              .stroke();
            try {
              const dim = sizeOf(agentBuffer);
              const scale = Math.min((sigWidth - 4) / dim.width, (sigHeight - 4) / dim.height);
              const drawW = Math.max(1, Math.floor(dim.width * scale));
              const drawH = Math.max(1, Math.floor(dim.height * scale));
              const dx = agentX + (sigWidth - drawW) / 2;
              const dy = topY + (sigHeight - drawH) / 2;
              doc.image(agentBuffer, dx, dy, { width: drawW, height: drawH });
            } catch (_e) {
              doc.image(agentBuffer, {
                fit: [sigWidth - 4, sigHeight - 4],
                x: agentX + 2,
                y: topY + 2
              });
            }
          }

          // Right box: Client
          if (clientBuffer) {
            const clientX = agentBuffer ? sigStartX + sigWidth + gap : sigStartX;
            // label (centered)
            doc
              .fontSize(12)
              .fillColor(colors.text)
              .font('Helvetica-Bold')
              .text('Client Signature:', clientX, labelY, { width: sigWidth, align: 'center' });

            doc
              .rect(clientX, topY, sigWidth, sigHeight)
              .strokeColor(colors.border)
              .lineWidth(1)
              .stroke();
            try {
              const dim = sizeOf(clientBuffer);
              const scale = Math.min((sigWidth - 4) / dim.width, (sigHeight - 4) / dim.height);
              const drawW = Math.max(1, Math.floor(dim.width * scale));
              const drawH = Math.max(1, Math.floor(dim.height * scale));
              const dx = clientX + (sigWidth - drawW) / 2;
              const dy = topY + (sigHeight - drawH) / 2;
              doc.image(clientBuffer, dx, dy, { width: drawW, height: drawH });
            } catch (_e) {
              doc.image(clientBuffer, {
                fit: [sigWidth - 4, sigHeight - 4],
                x: clientX + 2,
                y: topY + 2
              });
            }
          }

          // Move cursor below the row
          doc.y = topY + sigHeight + 10;
        }
      }

      // Professional footer
      doc.moveDown(0.5);
      
      // Add footer divider (centered)
      doc
        .strokeColor(colors.border)
        .lineWidth(1)
        .moveTo(contentLeft, doc.y)
        .lineTo(contentLeft + contentWidth, doc.y)
        .stroke();
      
      doc.moveDown(0.2);
      
      // Footer content
      doc
        .fontSize(10)
        .fillColor(colors.textSecondary)
        .font('Helvetica')
        .text('Generated by Kurz Immobilien', { align: 'center' });
      
      doc
        .fontSize(9)
        .fillColor(colors.textLight)
        .text(new Date().toLocaleString(), { align: 'center' });
      
      // Add company contact info
      doc.moveDown(0.1);
      doc
        .fontSize(8)
        .fillColor(colors.textLight)
        .text('Property Inspection Services', { align: 'center' });

      doc.end();
      bufferStream.on('finish', () => resolve(Buffer.concat(chunks)));
      bufferStream.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
};

const prettify = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const capitalize = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

// Helper function to render a professional table
const renderTable = (doc, data, startX, startY, tableWidth, colors, options = {}) => {
  const {
    labelColumnWidth = tableWidth * 0.35,
    fontSize = 9,
    rowHeight = 18,
    headerHeight = 20,
    cellPadding = 6
  } = options;

  const valueColumnWidth = tableWidth - labelColumnWidth;
  const labelX = startX;
  const valueX = startX + labelColumnWidth;
  let currentY = startY;

  // Draw table header background (light gray for monochrome PDF)
  doc
    .rect(startX, currentY, tableWidth, headerHeight)
    .fillColor('#e8e8e8')
    .fill()
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  // Draw header text - center vertically and horizontally in header
  const headerFontSize = fontSize + 1;
  doc
    .fontSize(headerFontSize)
    .fillColor(colors.primary)
    .font('Helvetica-Bold');
  
  // Calculate vertical center for header text (baseline position)
  const headerTextBaseline = currentY + headerHeight / 2 + headerFontSize / 3;
  
  // Center the header text horizontally
  doc.text('Inspection Item', labelX, headerTextBaseline, {
    width: labelColumnWidth,
    align: 'center'
  });
  
  doc.text('Details / Status', valueX, headerTextBaseline, {
    width: valueColumnWidth,
    align: 'center'
  });

  currentY += headerHeight;

  // Draw top border for first row
  doc
    .moveTo(startX, currentY)
    .lineTo(startX + tableWidth, currentY)
    .strokeColor(colors.border)
    .lineWidth(0.5)
    .stroke();

  // Draw table rows
  data.forEach(([label, value], index) => {
    const isEvenRow = index % 2 === 0;
    
    // Calculate actual row height based on content
    doc.fontSize(fontSize);
    const labelHeight = doc.heightOfString(label, { width: labelColumnWidth - cellPadding * 2 });
    const valueHeight = doc.heightOfString(value, { width: valueColumnWidth - cellPadding * 2, lineGap: 2 });
    const actualRowHeight = Math.max(rowHeight, Math.max(labelHeight, valueHeight) + cellPadding);
    
    // Alternate row background (darker for better contrast)
    if (!isEvenRow) {
      doc
        .rect(startX, currentY, tableWidth, actualRowHeight)
        .fillColor('#f0f0f0')
        .fill();
    }

    // Draw labels and values - position at top with proper padding
    const textStartY = currentY + cellPadding;

    // Set font for label
    doc
      .fontSize(fontSize)
      .fillColor(colors.primary)
      .font('Helvetica-Bold');

    // Label (bold) - center horizontally
    doc.text(label, labelX, textStartY, {
      width: labelColumnWidth,
      align: 'center'
    });

    // Set font for value
    doc
      .fontSize(fontSize)
      .fillColor(colors.textSecondary)
      .font('Helvetica');

    // Value - center horizontally
    doc.text(value, valueX, textStartY, {
      width: valueColumnWidth,
      align: 'center',
      lineGap: 2
    });
    
    // Use the maximum calculated height (already computed above)
    const finalRowHeight = actualRowHeight;
    
    // Draw cell borders and divider - ensure they're visible
    // Horizontal row border (bottom)
    doc
      .moveTo(startX, currentY + finalRowHeight)
      .lineTo(startX + tableWidth, currentY + finalRowHeight)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    // Vertical divider between columns
    doc
      .moveTo(valueX, currentY)
      .lineTo(valueX, currentY + finalRowHeight)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    // If row background was drawn and row expanded, extend it
    if (!isEvenRow && finalRowHeight > actualRowHeight) {
      const extraHeight = finalRowHeight - actualRowHeight;
      doc
        .rect(startX, currentY + actualRowHeight, tableWidth, extraHeight)
        .fillColor('#f0f0f0')
        .fill();
    }

    currentY += finalRowHeight;
  });

  // Draw outer border (all four sides) for the entire table
  const tableHeight = currentY - startY;
  
  // Top border
  doc
    .moveTo(startX, startY)
    .lineTo(startX + tableWidth, startY)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();
  
  // Bottom border
  doc
    .moveTo(startX, currentY)
    .lineTo(startX + tableWidth, currentY)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();
  
  // Left border
  doc
    .moveTo(startX, startY)
    .lineTo(startX, currentY)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();
  
  // Right border
  doc
    .moveTo(startX + tableWidth, startY)
    .lineTo(startX + tableWidth, currentY)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  return currentY;
};

const sendInspectionReport = async (to, subject, htmlContent, attachments = [], options = {}) => {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.log('⚠️  Resend not configured - returning mock success for testing');
      return { 
        success: true, 
        data: { id: 'mock-email-id-' + Date.now() },
        mock: true
      };
    }

    // Use appropriate from address based on environment, allow override via env or options
    const defaultFrom = process.env.NODE_ENV === 'production' 
      ? 'Kurz Immobilien <noreply@kurz-immobilien.ch>'
      : 'Kurz Immobilien <noreply@kurz-immobilien.ch>';
    const fromAddress = options.from || process.env.RESEND_FROM || defaultFrom;

    const emailData = {
      from: fromAddress,
      to: [to],
      subject: subject,
      html: htmlContent,
    };

    // Add attachments if provided
    if (attachments.length > 0) {
      emailData.attachments = attachments;
    }
    // Add reply-to if provided
    if (options.replyTo) {
      emailData.reply_to = options.replyTo;
    }

    console.log('Sending email:', {
      from: fromAddress,
      to: to,
      subject: subject,
      environment: process.env.NODE_ENV
    });

    const data = await resend.emails.send(emailData);
    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

const sendReportToClient = async (clientEmail, reportData, options = {}) => {
  console.log('Sending test email to client:', clientEmail);
  
  const subject = `Test Email - Kurz Immobilien Report - ${reportData.propertyAddress || 'Property'}`;
  const lang = getReportLanguage(reportData);
  const agreementNotice = getAgreementNotice(lang);
  
  // Load logo SVG and convert to base64 for email
  const logoPath = path.join(__dirname, '..', '..', 'src', 'assets', 'kurz-immobilien-logo.svg');
  let logoHtml = '<h1 style="margin:0;font-size:28px;font-weight:bold;">Kurz Immobilien</h1>';
  
  if (fs.existsSync(logoPath)) {
    try {
      const svgContent = fs.readFileSync(logoPath, 'utf8');
      const svgBase64 = Buffer.from(svgContent).toString('base64');
      logoHtml = `<img src="data:image/svg+xml;base64,${svgBase64}" alt="Kurz Immobilien" style="display:block;margin:0 auto 15px auto;max-width:180px;height:auto;text-align:center;" />`;
    } catch (e) {
      console.log('Could not load logo for email:', e.message);
    }
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kurz Immobilien Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #111827;
          background-color: #f9fafb;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #8D2138 0%, #A52A3A 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header img {
          display: block;
          margin: 0 auto 15px auto;
          max-width: 180px;
          height: auto;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }
        .info-item {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #8D2138;
        }
        .info-label {
          font-weight: bold;
          color: #8D2138;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          color: #374151;
          font-size: 14px;
          margin-top: 5px;
        }
        .message {
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .company-name {
          color: #8D2138;
          font-weight: bold;
        }
        @media (max-width: 600px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          .container {
            margin: 0;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <p>Property Inspection Report</p>
        </div>
        
        <div class="content">
          <h2>Dear Client,</h2>
          <p>Thank you for choosing Kurz Immobilien for your property inspection. Please find your detailed inspection report attached to this email.</p>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Property</div>
              <div class="info-value">${reportData.propertyAddress || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Inspection Date</div>
              <div class="info-value">${new Date(reportData.inspectionDate).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Inspector</div>
              <div class="info-value">${reportData.inspectorName || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Report ID</div>
              <div class="info-value">${reportData.id}</div>
            </div>
            ${reportData.securityDeposit && reportData.securityDeposit.amount ? `
            <div class="info-item" style="grid-column: 1 / -1; background-color: #fef3c7; border-left-color: #f59e0b;">
              <div class="info-label">Security Deposit (Kaution)</div>
              <div class="info-value" style="font-size: 18px; font-weight: bold; color: #92400e;">
                ${reportData.securityDeposit.currency} ${reportData.securityDeposit.amount}
                ${reportData.securityDeposit.paymentMethod ? ` • ${reportData.securityDeposit.paymentMethod}` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          
          <div class="message">
            <p><strong>Report Details:</strong> Your comprehensive inspection report includes detailed findings, recommendations, photographic documentation of all inspected areas${reportData.securityDeposit && reportData.securityDeposit.amount ? ', and security deposit information' : ''}.</p>
            <p>${agreementNotice}</p>
            <p>If you have any questions about the report or need clarification on any findings, please don't hesitate to contact us.</p>
          </div>
          
          <p>Best regards,<br><span class="company-name">Kurz Immobilien Team</span></p>
        </div>
        
        <div class="footer">
          <p><span class="company-name">Kurz Immobilien</span> - Professional Property Inspection Services</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Attach a PDF version of the report
  const pdfBuffer = await generateReportPdfBuffer(reportData, options?.databaseName || null);
  const attachments = [
    {
      filename: `inspection-report-${reportData.id || 'report'}.pdf`,
      content: pdfBuffer,
    }
  ];

  return await sendInspectionReport(clientEmail, subject, htmlContent, attachments, options);
};

const sendReportToAgent = async (agentEmail, reportData, options = {}) => {
  console.log('Sending test email to agent:', agentEmail);
  
  const subject = `Test Email - New Kurz Immobilien Report - ${reportData.propertyAddress || 'Property'}`;
  const lang = getReportLanguage(reportData);
  const agreementNotice = getAgreementNotice(lang);
  
  // Load logo SVG and convert to base64 for email
  const logoPath = path.join(__dirname, '..', '..', 'src', 'assets', 'kurz-immobilien-logo.svg');
  let logoHtml = '<h1 style="margin:0;font-size:28px;font-weight:bold;">Kurz Immobilien</h1>';
  
  if (fs.existsSync(logoPath)) {
    try {
      const svgContent = fs.readFileSync(logoPath, 'utf8');
      const svgBase64 = Buffer.from(svgContent).toString('base64');
      logoHtml = `<img src="data:image/svg+xml;base64,${svgBase64}" alt="Kurz Immobilien" style="display:block;margin:0 auto 15px auto;max-width:180px;height:auto;text-align:center;" />`;
    } catch (e) {
      console.log('Could not load logo for email:', e.message);
    }
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kurz Immobilien Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #111827;
          background-color: #f9fafb;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #8D2138 0%, #A52A3A 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header img {
          display: block;
          margin: 0 auto 15px auto;
          max-width: 180px;
          height: auto;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }
        .info-item {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #8D2138;
        }
        .info-label {
          font-weight: bold;
          color: #8D2138;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          color: #374151;
          font-size: 14px;
          margin-top: 5px;
        }
        .message {
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .company-name {
          color: #8D2138;
          font-weight: bold;
        }
        @media (max-width: 600px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          .container {
            margin: 0;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Kurz Immobilien</H1>
          <p>New Inspection Report</p>
        </div>
        
        <div class="content">
          <h2>Dear Agent,</h2>
          <p>${agreementNotice}</p>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Property</div>
              <div class="info-value">${reportData.propertyAddress || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Inspection Date</div>
              <div class="info-value">${new Date(reportData.inspectionDate).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Inspector</div>
              <div class="info-value">${reportData.inspectorName || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Client Email</div>
              <div class="info-value">${reportData.clientEmail || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Report ID</div>
              <div class="info-value">${reportData.id}</div>
            </div>
            ${reportData.securityDeposit && reportData.securityDeposit.amount ? `
            <div class="info-item" style="grid-column: 1 / -1; background-color: #fef3c7; border-left-color: #f59e0b;">
              <div class="info-label">Security Deposit (Kaution)</div>
              <div class="info-value" style="font-size: 18px; font-weight: bold; color: #92400e;">
                ${reportData.securityDeposit.currency} ${reportData.securityDeposit.amount}
                ${reportData.securityDeposit.paymentMethod ? ` • ${reportData.securityDeposit.paymentMethod}` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          
          <div class="message">
            <p><strong>Report Summary:</strong> This comprehensive inspection report includes detailed findings, recommendations, photographic documentation, digital signatures from both the agent and client${reportData.securityDeposit && reportData.securityDeposit.amount ? ', and security deposit information' : ''}.</p>
            <p>The report has been automatically generated and sent to the client. Please review the findings and follow up as necessary.</p>
          </div>
          
          <p>Best regards,<br><span class="company-name">Kurz Immobilien Team</span></p>
        </div>
        
        <div class="footer">
          <p><span class="company-name">Kurz Immobilien</span> - Professional Property Inspection Services</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Attach a PDF version of the report
  const pdfBuffer = await generateReportPdfBuffer(reportData, options?.databaseName || null);
  const attachments = [
    {
      filename: `inspection-report-${reportData.id || 'report'}.pdf`,
      content: pdfBuffer,
    }
  ];

  return await sendInspectionReport(agentEmail, subject, htmlContent, attachments, options);
};

module.exports = {
  sendInspectionReport,
  sendReportToClient,
  sendReportToAgent,
};

// Send multiple reports in a single email with all PDFs attached
module.exports.sendReportsBundle = async (to, reportsData, subjectOverride, databaseName = null) => {
  try {
    const subject = subjectOverride || `Kurz Immobilien - ${reportsData.length} Report PDF(s)`;
    const intro = `Attached are ${reportsData.length} inspection report PDF(s).`;

    // Basic HTML without heavy styling for bundle
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Kurz Immobilien</h2>
        <p>${intro}</p>
        <ul>
          ${reportsData.map((r) => `<li>Report ${String(r.id)} • ${r.propertyAddress || 'Property'} • ${new Date(r.inspectionDate || Date.now()).toLocaleDateString()}</li>`).join('')}
        </ul>
      </div>
    `;

    const attachments = [];
    for (const report of reportsData) {
      const pdfBuffer = await generateReportPdfBuffer(report, databaseName);
      attachments.push({
        filename: `inspection-report-${report.id || 'report'}.pdf`,
        content: pdfBuffer,
      });
    }

    return await sendInspectionReport(to, subject, html, attachments);
  } catch (error) {
    console.error('Error sending reports bundle:', error);
    return { success: false, error: error.message };
  }
};