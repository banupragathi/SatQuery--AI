// We lazily load pdfmake and fonts inside generatePDF
// to prevent legacy CommonJS/AMD bundler crashes from breaking Vite on startup.

const getBase64ImageWithGrounding = async (imageUrl, groundingBox) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // If there is no grounding box, we can just return the native image via canvas to base64
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      if (groundingBox && groundingBox.box) {
        const { x, y, w, h } = groundingBox.box;
        const boxX = x * img.width;
        const boxY = y * img.height;
        const boxW = w * img.width;
        const boxH = h * img.height;

        // Draw bounding box
        ctx.lineWidth = Math.max(3, img.width * 0.005);
        ctx.strokeStyle = '#4FD8EE';
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Draw label background
        const label = groundingBox.label || 'REGION';
        ctx.font = `bold ${Math.max(14, img.width * 0.02)}px monospace`;
        const textWidth = ctx.measureText(label).width;
        const textHeight = Math.max(14, img.width * 0.02) + 4;
        
        ctx.fillStyle = '#2AA7BE';
        ctx.fillRect(boxX, boxY - textHeight, textWidth + 10, textHeight);

        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label.toUpperCase(), boxX + 5, boxY - 5);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error("Failed to load image for canvas composition"));
    img.src = imageUrl;
  });
};

const formatDate = () => {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const cleanAnswerText = (text) => {
    if (!text) return "";
    return text
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/([*_])([^\s*_.][^*_]*?[^\s*_.]|[^\s*_.])\1/g, "$2")
        .replace(/```([\s\S]*?)```/g, "$1")
        .replace(/`([^`]+)`/g, "$1");
};

export const generatePDF = async (query, results, changeResult, changeImages) => {
  // Dynamically import pdfmake at runtime to avoid Vite startup crashes
  const pdfMakeLib = await import("pdfmake/build/pdfmake");
  const pdfFontsLib = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfMakeLib.default || pdfMakeLib;
  const pdfFonts = pdfFontsLib.default || pdfFontsLib;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const content = [];

  // Header
  content.push({ text: "SATQUERY AI", style: "header" });
  content.push({ text: "Remote Sensing Intelligence Report", style: "subHeader" });
  content.push({ text: `Generated: ${formatDate()}`, style: "metaData", margin: [0, 0, 0, 20] });

  // Query
  content.push({ text: "USER QUERY", style: "sectionTitle" });
  content.push({ text: query || "—", style: "bodyText", margin: [0, 0, 0, 20] });

  // Images
  const hasImages = (results && results.length > 0) || (changeImages && changeImages.length > 0);
  if (hasImages) {
      if (changeImages && changeImages.length >= 2) {
          content.push({ text: "INPUT IMAGES", style: "sectionTitle" });
          for (let i = 0; i < changeImages.length; i++) {
              if (changeImages[i].isTiff) continue; 
              // We do not have grounding boxes in mult-image changes usually, but we pass null
              const b64 = await getBase64ImageWithGrounding(changeImages[i].previewUrl, null);
              if (b64) {
                  content.push({ text: `Image ${i + 1} - ${changeImages[i].meta?.filename || 'Earlier'}`, style: "subTitle" });
                  content.push({ image: b64, width: 400, margin: [0, 5, 0, 15], alignment: 'center' });
              }
          }
      } else if (results && results.length > 0) {
          content.push({ text: results.length > 1 ? "INPUT IMAGES" : "INPUT SATELLITE IMAGE", style: "sectionTitle" });
          for (let i = 0; i < results.length; i++) {
              if (results[i].isTiff) continue;
              
              // Extract grounding box for this individual result if available
              const groundBox = (results[i].result?.evidence?.type === "bounding_box") 
                  ? results[i].result.evidence 
                  : null;

              const b64 = await getBase64ImageWithGrounding(results[i].previewUrl, groundBox);
              if (b64) {
                 if (results.length > 1) {
                     content.push({ text: `Image ${i + 1} - ${results[i].meta?.filename || ''}`, style: "subTitle" });
                 }
                 content.push({ image: b64, width: 400, margin: [0, 5, 0, 20], alignment: 'center' });
              }
          }
      }
  }

  // Result parsing
  const displayResult = changeResult ? changeResult : (results && results.length > 0 ? results[0].result : null);

  if (displayResult) {
      // Aggregate executed specialists mapping
      const agentResults = displayResult.agent_results || [];
      const executedAgents = agentResults.filter(ar => ar.status !== "skipped");
      
      // Multi-Agent Analysis Segment
      if (executedAgents.length > 1) {
          content.push({ text: "ANALYSIS SUMMARY", style: "sectionTitle" });
          executedAgents.forEach((agent, index) => {
              content.push({ text: `${index + 1}. ${agent.specialist}`, style: "subTitle" });
              content.push({ text: cleanAnswerText(agent.answer), style: "bodyText", margin: [0, 0, 0, 15] });
          });
      } else if (displayResult.answer) {
          content.push({ text: "AI ANALYSIS", style: "sectionTitle" });
          content.push({ text: cleanAnswerText(displayResult.answer), style: "bodyText", margin: [0, 0, 0, 20] });
      }

      // Metadata section
      content.push({ text: "ANALYSIS DETAILS", style: "sectionTitle", margin: [0, 10, 0, 5] });
      const detailsMap = [];
      if (displayResult.specialist) detailsMap.push(`Agent(s): ${displayResult.specialist}`);
      if (displayResult.model) detailsMap.push(`Model: ${displayResult.model}`);
      if (displayResult.confidence) detailsMap.push(`Confidence: ${displayResult.confidence}`);
      
      const imgMeta = changeImages && changeImages.length > 0 ? changeImages[0].meta : (results && results.length > 0 ? results[0].meta : null);
      if (imgMeta?.format) detailsMap.push(`Input type: ${imgMeta.format}`);

      if (detailsMap.length > 0) {
          content.push({
              ul: detailsMap,
              style: "bodyText",
              margin: [0, 0, 0, 20]
          });
      }
      
      // Land cover specific parsing
      const isLandCover = displayResult.evidence?.type === "land_cover_scores" && displayResult.evidence?.predictions;
      if (isLandCover) {
          content.push({ text: "LAND COVER ANALYSIS", style: "sectionTitle" });
          const tableBody = [
              [{ text: "Class", bold: true }, { text: "Confidence", bold: true }]
          ];
          displayResult.evidence.predictions.forEach(p => {
              const conf = Number(p.confidence) || 0;
              const pct = Math.max(0, Math.min(100, conf * 100));
              tableBody.push([ p.class, `${pct.toFixed(1)}%` ]);
          });
          
          content.push({
              table: {
                  headerRows: 1,
                  widths: ['*', 'auto'],
                  body: tableBody
              },
              layout: 'lightHorizontalLines',
              margin: [0, 5, 0, 20]
          });
      }
  }

  // Document Definition
  const docDefinition = {
    content: content,
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        color: '#2a3b5c',
        margin: [0, 0, 0, 5]
      },
      subHeader: {
        fontSize: 16,
        color: '#2aa7be',
        margin: [0, 0, 0, 5]
      },
      metaData: {
        fontSize: 10,
        color: '#666666',
        italics: true
      },
      sectionTitle: {
        fontSize: 14,
        bold: true,
        color: '#333333',
        margin: [0, 10, 0, 5],
      },
      subTitle: {
        fontSize: 12,
        bold: true,
        color: '#444444',
        margin: [0, 5, 0, 5]
      },
      bodyText: {
        fontSize: 11,
        color: '#222222',
        lineHeight: 1.4
      }
    },
    footer: function(currentPage, pageCount) {
        return {
            text: `SatQuery AI | Remote Sensing Intelligence   —   Page ${currentPage} of ${pageCount}`,
            alignment: 'center',
            fontSize: 9,
            color: '#999999',
            margin: [0, 10, 0, 0]
        };
    },
    defaultStyle: {
        font: 'Roboto'
    }
  };

  const filenameDate = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
  const pdfFileName = `SatQuery_Report_${filenameDate}.pdf`;

  pdfMake.createPdf(docDefinition).download(pdfFileName);
};
