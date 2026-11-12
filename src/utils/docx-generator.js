/**
 * Mentari Mod Modern Edition - DOCX Generator
 * Menghasilkan file Microsoft Word (.docx) OpenXML standar secara client-side menggunakan JSZip.
 * 100% mematuhi standar penulisan akademik UNPAM:
 * - Font: Times New Roman 12pt (Judul 13pt-16pt Bold)
 * - Warna: Hitam Standar (Otomatis / #000000) - Nol font warna-warni
 * - Margin: Standar A4 (Atas 4cm, Kiri 4cm, Bawah 3cm, Kanan 3cm)
 * - Spasi Baris: 1.5 spasi
 * - Kepatuhan Skema: ISO/IEC 29500 & ECMA-376 Transisi (Bebas Dialog Error di MS Word / WPS / Google Docs)
 */

import JSZip from 'jszip';

/**
 * Escape string untuk format XML 1.0
 */
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Hapus karakter kontrol ASCII non-printable yang dilarang di XML 1.0
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitasi dan hilangkan redundansi penamaan pertemuan
 * Mengubah "Pertemuan 7 - Pertemuan 7" menjadi "Pertemuan 7"
 * Mengubah "Pertemuan 7 - Materi Statistika" menjadi "Pertemuan 7 - Materi Statistika"
 */
function cleanMeetingTitle(meetingNum, sectionName) {
  const mNumStr = (meetingNum !== null && meetingNum !== undefined) ? String(meetingNum).trim() : '';
  const sName = (sectionName || '').trim();

  if (!mNumStr && !sName) return 'Pertemuan Forum Diskusi';
  if (!mNumStr) return sName;
  if (!sName) return `Pertemuan ${mNumStr}`;

  // Kasus 1: sectionName persis "Pertemuan X"
  const regexExact = new RegExp(`^(?:Pertemuan|Meeting)\\s*0*${mNumStr}$`, 'i');
  if (regexExact.test(sName)) {
    return `Pertemuan ${mNumStr}`;
  }

  // Kasus 2: sectionName berawalan "Pertemuan X - ..."
  const regexPrefix = new RegExp(`^(?:Pertemuan|Meeting)\\s*0*${mNumStr}\\s*[:\\-–—.]?\\s*`, 'i');
  const cleanedSuffix = sName.replace(regexPrefix, '').trim();

  if (cleanedSuffix) {
    return `Pertemuan ${mNumStr} - ${cleanedSuffix}`;
  }

  return `Pertemuan ${mNumStr}`;
}

/**
 * Traversal rekursif elemen DOM untuk mengekstrak array run inline berformat
 */
function parseInlineRuns(element, inheritedStyle = {}) {
  const runs = [];

  function traverse(node, currentStyle) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        runs.push({
          text,
          bold: Boolean(currentStyle.bold),
          italic: Boolean(currentStyle.italic),
          underline: Boolean(currentStyle.underline),
          strike: Boolean(currentStyle.strike),
          fontSize: currentStyle.fontSize || 24,
          color: '000000'
        });
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'br') {
        runs.push({ text: '\n', isBreak: true });
        return;
      }

      const nextStyle = { ...currentStyle };
      if (tag === 'strong' || tag === 'b') nextStyle.bold = true;
      if (tag === 'em' || tag === 'i') nextStyle.italic = true;
      if (tag === 'u') nextStyle.underline = true;
      if (tag === 's' || tag === 'strike' || tag === 'del') nextStyle.strike = true;

      for (const child of node.childNodes) {
        traverse(child, nextStyle);
      }
    }
  }

  for (const child of element.childNodes) {
    traverse(child, inheritedStyle);
  }

  return runs;
}

/**
 * Generate XML untuk sebuah Run Word (<w:r>)
 */
function createRunXml(run) {
  if (run.isBreak) {
    return '<w:r><w:br/></w:r>';
  }
  let rPr = '<w:rPr>';
  rPr += '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
  if (run.bold) rPr += '<w:b/>';
  if (run.italic) rPr += '<w:i/>';
  if (run.strike) rPr += '<w:strike/>';
  rPr += `<w:color w:val="${run.color || '000000'}"/>`;
  const sz = run.fontSize || 24;
  rPr += `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
  if (run.underline) rPr += '<w:u w:val="single"/>';
  rPr += '<w:lang w:val="id-ID"/>';
  rPr += '</w:rPr>';

  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

/**
 * Generate XML untuk sebuah paragraph Word (<w:p>)
 * Mematuhi urutan kanonikal XSD ECMA-376
 */
function createParagraphXml({
  text = '',
  runs = null,
  bold = false,
  italic = false,
  underline = false,
  fontSize = 24,
  align = 'left',
  indentLeft = 0,
  hangingIndent = 0,
  spaceBefore = 60,
  spaceAfter = 60,
  lineSpacing = 360,
  borders = null,
  shading = null
}) {
  let pPr = '<w:pPr>';
  if (borders) pPr += borders;
  if (shading) pPr += `<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`;
  pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${lineSpacing}" w:lineRule="auto"/>`;
  if (indentLeft > 0 || hangingIndent > 0) {
    pPr += `<w:ind ${indentLeft > 0 ? `w:left="${indentLeft}"` : ''} ${hangingIndent > 0 ? `w:hanging="${hangingIndent}"` : ''}/>`;
  }
  if (align && align !== 'left') {
    pPr += `<w:jc w:val="${align}"/>`;
  }
  pPr += '</w:pPr>';

  let rXml = '';
  if (Array.isArray(runs) && runs.length > 0) {
    for (const run of runs) {
      rXml += createRunXml(run);
    }
  } else if (text) {
    rXml = createRunXml({ text, bold, italic, underline, fontSize, color: '000000' });
  }

  return `<w:p>${pPr}${rXml}</w:p>`;
}

/**
 * Generate XML Tabel Resmi OpenXML (<w:tbl>) dari elemen <table> HTML
 * 100% Valid ECMA-376: Selalu ada minimal 1 <w:p> di dalam setiap <w:tc>
 */
function createTableXml(tableElement) {
  const rows = Array.from(tableElement.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  let maxCols = 1;
  rows.forEach(r => {
    const cells = r.querySelectorAll('th, td');
    if (cells.length > maxCols) maxCols = cells.length;
  });

  const totalWidth = 7937; // Total dxa bidang tulis A4 (11906 - 2268 - 1701)
  const colWidth = Math.floor(totalWidth / maxCols);

  let gridXml = '<w:tblGrid>';
  for (let c = 0; c < maxCols; c++) {
    gridXml += `<w:gridCol w:w="${colWidth}"/>`;
  }
  gridXml += '</w:tblGrid>';

  let rowsXml = '';
  rows.forEach((row, rowIndex) => {
    const isHeadRow = rowIndex === 0 || row.closest('thead') !== null || row.querySelector('th') !== null;
    let trPr = '<w:trPr>';
    if (isHeadRow) trPr += '<w:tblHeader/>';
    trPr += '<w:cantSplit/></w:trPr>';

    let cellsXml = '';
    const cells = Array.from(row.querySelectorAll('th, td'));
    cells.forEach((cell) => {
      const isHeaderCell = isHeadRow || cell.tagName.toLowerCase() === 'th';
      const cellRuns = parseInlineRuns(cell, {
        bold: isHeaderCell,
        fontSize: 22 // 11pt standar tabel akademik
      });

      let tcPr = '<w:tcPr>';
      tcPr += `<w:tcW w:w="${colWidth}" w:type="dxa"/>`;
      if (isHeaderCell) {
        tcPr += '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>';
      }
      tcPr += '<w:vAlign w:val="center"/>';
      tcPr += '</w:tcPr>';

      let cellPXml = '';
      if (cellRuns.length > 0) {
        cellPXml = createParagraphXml({
          runs: cellRuns,
          fontSize: 22,
          spaceBefore: 60,
          spaceAfter: 60,
          lineSpacing: 280,
          align: isHeaderCell ? 'center' : 'left'
        });
      } else {
        // Fallback mutlak skema ECMA-376: tc wajib memiliki w:p
        cellPXml = '<w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="280" w:lineRule="auto"/></w:pPr></w:p>';
      }

      cellsXml += `<w:tc>${tcPr}${cellPXml}</w:tc>`;
    });

    // Isi cell kosong jika jumlah sel kurang dari maxCols
    for (let c = cells.length; c < maxCols; c++) {
      cellsXml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="280" w:lineRule="auto"/></w:pPr></w:p></w:tc>`;
    }

    rowsXml += `<w:tr>${trPr}${cellsXml}</w:tr>`;
  });

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${totalWidth}" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="333333"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="333333"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:left w:w="160" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:right w:w="160" w:type="dxa"/>
        </w:tblCellMar>
        <w:tblLayout w:type="autofit"/>
      </w:tblPr>
      ${gridXml}
      ${rowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:before="60" w:after="80" w:line="360" w:lineRule="auto"/></w:pPr></w:p>
  `;
}

/**
 * Generate Lembar Jawaban Mahasiswa Berformat Kotak Rapi
 */
function createAnswerBoxXml() {
  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="140" w:after="60" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="24"/>
          <w:color w:val="000000"/>
        </w:rPr>
        <w:t>Lembar Jawaban Mahasiswa :</w:t>
      </w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="7937" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="999999"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="999999"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="999999"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="999999"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="160" w:type="dxa"/>
          <w:left w:w="200" w:type="dxa"/>
          <w:bottom w:w="160" w:type="dxa"/>
          <w:right w:w="200" w:type="dxa"/>
        </w:tblCellMar>
        <w:tblLayout w:type="autofit"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="7937"/>
      </w:tblGrid>
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="7937" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="FAFAFA"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
                <w:i/>
                <w:sz w:val="22"/>
                <w:color w:val="666666"/>
              </w:rPr>
              <w:t xml:space="preserve">[Ketik atau tuliskan tanggapan / jawaban Anda di sini]</w:t>
            </w:r>
          </w:p>
          <w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/></w:pPr></w:p>
          <w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/></w:pPr></w:p>
          <w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/></w:pPr></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:before="120" w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:p>
  `;
}

/**
 * Konversi HTML dari CKEditor Dosen menjadi OpenXML Semantik & Rapi
 * Mendukung Heading, Paragraph, Unordered/Ordered List, Table, Blockquote
 */
function convertHtmlToOpenXml(html) {
  if (!html || typeof html !== 'string') {
    return createParagraphXml({ text: '(Tidak ada materi atau instruksi soal terlampir dari dosen)', italic: true });
  }

  // Jika input berupa plain text mentah tanpa tag HTML, bungkus baris ke dalam <p>
  let contentHtml = html;
  if (!/<[a-z][\s\S]*>/i.test(contentHtml)) {
    contentHtml = contentHtml
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${line}</p>`)
      .join('');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml, 'text/html');
  const body = doc.body;

  let outXml = '';

  for (const node of body.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent.trim();
      if (txt) {
        outXml += createParagraphXml({ text: txt, fontSize: 24, spaceBefore: 40, spaceAfter: 60, lineSpacing: 360 });
      }
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();

      // 1. Headings (h1 - h6)
      if (/^h[1-6]$/.test(tag)) {
        const hRuns = parseInlineRuns(node, { bold: true, fontSize: 26 });
        outXml += createParagraphXml({
          runs: hRuns,
          bold: true,
          fontSize: 26,
          spaceBefore: 180,
          spaceAfter: 80,
          lineSpacing: 360
        });
        continue;
      }

      // 2. Tables (<figure class="table"> atau <table>)
      if (tag === 'table') {
        outXml += createTableXml(node);
        continue;
      }
      if (tag === 'figure' && node.querySelector('table')) {
        outXml += createTableXml(node.querySelector('table'));
        continue;
      }

      // 3. Unordered Lists (<ul>)
      if (tag === 'ul') {
        const items = Array.from(node.querySelectorAll('li'));
        items.forEach(li => {
          let liRuns = parseInlineRuns(li);
          // Bersihkan sisa bullet string dari text node awal jika ada
          if (liRuns.length > 0 && liRuns[0].text) {
            liRuns[0].text = liRuns[0].text.replace(/^[•\-\*]\s*/, '');
          }
          const bulletRun = { text: '• ', bold: true, fontSize: 24, color: '000000' };
          outXml += createParagraphXml({
            runs: [bulletRun, ...liRuns],
            fontSize: 24,
            indentLeft: 480,
            hangingIndent: 280,
            spaceBefore: 40,
            spaceAfter: 40,
            lineSpacing: 360
          });
        });
        continue;
      }

      // 4. Ordered Lists (<ol>)
      if (tag === 'ol') {
        const items = Array.from(node.querySelectorAll('li'));
        items.forEach((li, idx) => {
          let liRuns = parseInlineRuns(li);
          if (liRuns.length > 0 && liRuns[0].text) {
            liRuns[0].text = liRuns[0].text.replace(/^\d+[\.\)]\s*/, '');
          }
          const numRun = { text: `${idx + 1}. `, bold: true, fontSize: 24, color: '000000' };
          outXml += createParagraphXml({
            runs: [numRun, ...liRuns],
            fontSize: 24,
            indentLeft: 480,
            hangingIndent: 280,
            spaceBefore: 40,
            spaceAfter: 40,
            lineSpacing: 360
          });
        });
        continue;
      }

      // 5. Blockquotes (<blockquote>)
      if (tag === 'blockquote') {
        const bqRuns = parseInlineRuns(node, { italic: true, fontSize: 24 });
        outXml += createParagraphXml({
          runs: bqRuns,
          italic: true,
          fontSize: 24,
          indentLeft: 567, // 1cm indent
          spaceBefore: 80,
          spaceAfter: 80,
          lineSpacing: 360
        });
        continue;
      }

      // 6. Paragraphs (<p>) & Divs (<div>) dengan Heuristik Heading Cerdas
      if (tag === 'p' || tag === 'div') {
        // Cek jika ada table di dalam div
        const innerTable = node.querySelector('table');
        if (innerTable) {
          outXml += createTableXml(innerTable);
          continue;
        }

        const textContent = node.textContent.trim();
        if (!textContent) continue;

        // Heuristik Heading: Teks berawalan pola bab/kategori dosen seperti "A. ", "B. ", "1. ", "F. Kriteria Penilaian"
        const isHeadingPattern = /^[A-Z]\.\s+|^[0-9]{1,2}\.\s+[A-Za-z]|^(?:BAB|BAGIAN|TOPIK|KASUS|LATIHAN|PETUNJUK|KRITERIA)\s+[IVX0-9A-Z]*/i.test(textContent);
        const hasBoldChild = node.querySelector('strong, b') !== null;
        const isShortHeader = textContent.length <= 100;

        if (isHeadingPattern && (hasBoldChild || isShortHeader)) {
          const headRuns = parseInlineRuns(node, { bold: true, fontSize: 26 });
          outXml += createParagraphXml({
            runs: headRuns,
            bold: true,
            fontSize: 26,
            spaceBefore: 180,
            spaceAfter: 80,
            lineSpacing: 360
          });
        } else {
          const pRuns = parseInlineRuns(node, { fontSize: 24 });
          outXml += createParagraphXml({
            runs: pRuns,
            fontSize: 24,
            spaceBefore: 40,
            spaceAfter: 60,
            lineSpacing: 360
          });
        }
        continue;
      }
    }
  }

  return outXml || createParagraphXml({ text: '(Konten materi kosong)', italic: true });
}

export class DocxGenerator {
  /**
   * Bangun dokumen Word Rekap Tugas Forum Diskusi
   * @param {Object} data
   * @param {string} data.studentName
   * @param {string} data.studentNim
   * @param {string} data.dateString
   * @param {Array}  data.courses
   * @returns {Promise<Blob>}
   */
  static async generateForumRecap({ studentName, studentNim, dateString, courses }) {
    const zip = new JSZip();

    // 1. [Content_Types].xml
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
    );

    // 2. _rels/.rels
    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    // 3. word/_rels/document.xml.rels
    zip.file(
      'word/_rels/document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    );

    // 4. word/styles.xml
    zip.file(
      'word/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:color w:val="000000"/>
        <w:lang w:val="id-ID"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
      <w:sz w:val="24"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>
</w:styles>`
    );

    // 5. word/document.xml
    let bodyXml = '';

    // A. Header Dokumen Akademik
    bodyXml += createParagraphXml({
      text: 'REKAP TUGAS FORUM DISKUSI',
      bold: true,
      fontSize: 30, // 15pt
      align: 'center',
      spaceBefore: 0,
      spaceAfter: 40
    });

    bodyXml += createParagraphXml({
      text: 'UNIVERSITAS PAMULANG',
      bold: true,
      fontSize: 26, // 13pt
      align: 'center',
      spaceBefore: 0,
      spaceAfter: 160
    });

    // Garis pembatas horizontal ganda
    bodyXml += createParagraphXml({
      text: '════════════════════════════════════════════════════════════════════════════════',
      bold: true,
      align: 'center',
      fontSize: 20,
      spaceBefore: 0,
      spaceAfter: 160
    });

    // Informasi Mahasiswa & Dokumen
    bodyXml += createParagraphXml({
      runs: [
        { text: 'Nama Mahasiswa : ', bold: true },
        { text: studentName || 'Mahasiswa UNPAM' }
      ],
      fontSize: 24,
      spaceBefore: 40,
      spaceAfter: 40
    });

    bodyXml += createParagraphXml({
      runs: [
        { text: 'NIM            : ', bold: true },
        { text: studentNim || '-' }
      ],
      fontSize: 24,
      spaceBefore: 40,
      spaceAfter: 40
    });

    bodyXml += createParagraphXml({
      runs: [
        { text: 'Tanggal Rekap  : ', bold: true },
        { text: dateString || new Date().toLocaleDateString('id-ID') }
      ],
      fontSize: 24,
      spaceBefore: 40,
      spaceAfter: 40
    });

    bodyXml += createParagraphXml({
      runs: [
        { text: 'Status Tugas   : ', bold: true },
        { text: 'Belum Dikerjakan / Belum Dijawab' }
      ],
      fontSize: 24,
      spaceBefore: 40,
      spaceAfter: 240
    });

    // B. Iterasi Mata Kuliah dan Forum
    let courseIndex = 1;
    for (const course of courses) {
      if (!course.meetings || course.meetings.length === 0) continue;

      // Judul Mata Kuliah (Nomor Urut 1, 2, 3...)
      const courseTitleDisplay = `${courseIndex}. ${course.courseTitle || course.courseCode || 'Mata Kuliah'}`;
      bodyXml += createParagraphXml({
        text: courseTitleDisplay,
        bold: true,
        fontSize: 28, // 14pt
        spaceBefore: 280,
        spaceAfter: 120
      });

      if (course.lecturerName) {
        bodyXml += createParagraphXml({
          runs: [
            { text: 'Dosen Pengampu: ', bold: true, italic: true },
            { text: course.lecturerName, italic: true }
          ],
          fontSize: 22,
          spaceBefore: 20,
          spaceAfter: 80
        });
      }

      for (const meeting of course.meetings) {
        // Sub Kategori: Pertemuan x (Redundansi dibersihkan!)
        const meetingTitle = cleanMeetingTitle(meeting.meetingNum, meeting.sectionName);
        bodyXml += createParagraphXml({
          text: meetingTitle,
          bold: true,
          fontSize: 26, // 13pt
          spaceBefore: 160,
          spaceAfter: 80
        });

        // Judul Topik Diskusi jika ada
        if (meeting.topicTitle) {
          bodyXml += createParagraphXml({
            runs: [
              { text: 'Topik: ', bold: true, italic: true },
              { text: meeting.topicTitle, italic: true }
            ],
            fontSize: 24,
            spaceBefore: 40,
            spaceAfter: 60
          });
        }

        // Subheader Instruksi & Soal Forum
        bodyXml += createParagraphXml({
          text: 'Instruksi & Soal Forum Diskusi :',
          bold: true,
          fontSize: 24,
          spaceBefore: 80,
          spaceAfter: 40
        });

        // Konten OpenXML Asli hasil konversi HTML semantik dosen
        const rawContent = meeting.rawMessage || meeting.forumContent || '';
        bodyXml += convertHtmlToOpenXml(rawContent);

        // Lembar Jawaban Mahasiswa Berformat Kotak Rapi
        bodyXml += createAnswerBoxXml();
      }

      courseIndex++;
    }

    // C. Section Properties (Ukuran Kertas A4 & Margin Standar 4-4-3-3 cm)
    // 1 cm = 567 dxa
    // A4 = 210mm x 297mm = 11906 x 16838 dxa
    // Margin Top: 4cm = 2268 dxa, Left: 4cm = 2268 dxa
    // Margin Bottom: 3cm = 1701 dxa, Right: 3cm = 1701 dxa
    const sectPr = `<w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>`;

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    ${sectPr}
  </w:body>
</w:document>`;

    zip.file('word/document.xml', documentXml);

    // Hasilkan file Blob .docx
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Unduh file blob di browser dengan nama file yang ditentukan
   */
  static downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
  }

  /**
   * Format hari dan tanggal bahasa Indonesia untuk nama file dan isi dokumen
   * Contoh: 'Senin, 28 September 2026'
   */
  static getIndonesianDayAndDate(date = new Date()) {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch {
      return date.toLocaleDateString('id-ID');
    }
  }

  /**
   * Sanitasi string agar aman dijadikan nama file di Windows/Mac/Linux
   */
  static sanitizeFileName(name) {
    if (!name) return 'Mahasiswa';
    return name
      .replace(/[\\/*?:"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
