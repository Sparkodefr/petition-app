// Génération du PDF de la pétition : page de présentation puis tableau des signataires.
import PDFDocument from 'pdfkit';
import { petition } from './petition.js';

const MARGIN = 40;
const ROW_HEIGHT = 46;
const COLS = [
  { key: 'num', label: 'N°', width: 30 },
  { key: 'name', label: 'Nom et prénom', width: 130 },
  { key: 'adresse', label: 'Adresse', width: 175 },
  { key: 'date', label: 'Date', width: 75 },
  { key: 'signature', label: 'Signature', width: 105 },
];
const INK = '#1f2937';
const MUTED = '#6b7280';
const LINE = '#d1d5db';
const ACCENT = '#1e3a5f';

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

export function renderPetitionPdf(signatures, out) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: `${petition.title} – ${petition.subject}`, Author: 'Collectif des riverains' },
  });
  doc.pipe(out);

  const pageWidth = doc.page.width - MARGIN * 2;
  const generatedAt = dateFmt.format(new Date());

  // En-tête
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(20).text(petition.title.toUpperCase(), { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(petition.subject, { align: 'center' });
  doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(petition.location, { align: 'center' });
  doc.moveDown(1);

  // Faits
  for (const [label, value] of petition.facts) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT).text(`${label} : `, { continued: true });
    doc.font('Helvetica').fillColor(INK).text(value);
    doc.moveDown(0.3);
  }
  doc.moveDown(0.7);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(petition.statement, { align: 'justify' });
  doc.moveDown(0.5);
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED).text(petition.certification, { align: 'justify' });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
    .text(`Nombre de signataires : ${signatures.length}`, { continued: true })
    .font('Helvetica').fillColor(MUTED).text(`   —   Document généré le ${generatedAt}`);
  doc.moveDown(1);

  // Tableau
  drawHeader(doc);
  signatures.forEach((sig, i) => {
    if (doc.y + ROW_HEIGHT > doc.page.height - MARGIN - 20) {
      doc.addPage();
      drawHeader(doc);
    }
    drawRow(doc, i + 1, sig);
  });

  // Pied de page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    // Écrire sous la marge basse sans déclencher de saut de page automatique
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
      `${petition.subject} — page ${i + 1} / ${range.count}`,
      MARGIN, doc.page.height - MARGIN + 10,
      { width: pageWidth, align: 'center', lineBreak: false },
    );
  }

  doc.end();
}

function drawHeader(doc) {
  const y = doc.y;
  let x = MARGIN;
  doc.rect(MARGIN, y, COLS.reduce((w, c) => w + c.width, 0), 20).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
  for (const col of COLS) {
    doc.text(col.label, x + 4, y + 6, { width: col.width - 8, lineBreak: false });
    x += col.width;
  }
  doc.y = y + 20;
}

function drawRow(doc, num, sig) {
  const y = doc.y;
  const cells = {
    num: String(num),
    name: `${sig.nom.toUpperCase()} ${sig.prenom}`,
    adresse: sig.adresse,
    date: dateFmt.format(new Date(sig.createdAt)),
  };

  let x = MARGIN;
  doc.font('Helvetica').fontSize(8.5).fillColor(INK);
  for (const col of COLS) {
    if (col.key === 'signature') {
      try {
        const png = Buffer.from(sig.signature.split(',')[1], 'base64');
        doc.image(png, x + 3, y + 3, { fit: [col.width - 6, ROW_HEIGHT - 6], align: 'center', valign: 'center' });
      } catch {
        doc.fillColor(MUTED).text('(illisible)', x + 4, y + 18, { width: col.width - 8 }).fillColor(INK);
      }
    } else {
      doc.text(cells[col.key], x + 4, y + 5, { width: col.width - 8, height: ROW_HEIGHT - 8, ellipsis: true });
    }
    x += col.width;
  }

  doc.lineWidth(0.5).strokeColor(LINE)
    .moveTo(MARGIN, y + ROW_HEIGHT).lineTo(x, y + ROW_HEIGHT).stroke();
  doc.y = y + ROW_HEIGHT;
}
