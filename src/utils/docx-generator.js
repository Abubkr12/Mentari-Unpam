/**
 * Mentari Mod Modern Edition - DOCX Generator
 * Menghasilkan file Microsoft Word (.docx) OpenXML standar secara client-side menggunakan JSZip.
 * 100% mematuhi standar penulisan akademik UNPAM:
 * - Font: Times New Roman 12pt (Judul 14pt-16pt Bold)
 * - Warna: Hitam Standar (Otomatis / #000000) - Nol font warna-warni
 * - Margin: Standar A4 (Atas 4cm, Kiri 4cm, Bawah 3cm, Kanan 3cm)
 * - Spasi Baris: 1.5 spasi
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
 * Konversi HTML dari CKEditor dosen menjadi array paragraf teks bersih
 */
function htmlToParagraphs(html) {
  if (!html) return [];

  // Decode HTML entities umum
  let text = html
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Ubah list items menjadi bullet point
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // Ubah block breaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' | ');

  // Bersihkan semua tag HTML yang tersisa
  text = text.replace(/<[^>]+>/g, '');

  // Split menjadi baris-baris paragraf bersih
  const rawLines = text.split('\n');
  const paragraphs = [];
  let prevWasEmpty = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      paragraphs.push(trimmed);
      prevWasEmpty = false;
    } else if (!prevWasEmpty && paragraphs.length > 0) {
      prevWasEmpty = true;
    }
  }

  return paragraphs;
}

/**
 * Generate XML untuk sebuah paragraph Word
 */
function createParagraphXml({
  text = '',
  bold = false,
  italic = false,
  fontSize = 24, // 24 = 12pt (satuan half-point)
  align = 'left',
  indentLeft = 0, // dxa (1cm = 567 dxa)
  spaceBefore = 60,
  spaceAfter = 60,
  lineSpacing = 360, // 360 = 1.5 line spacing
  runs = null
}) {
  let pPr = `<w:pPr>`;
  if (align && align !== 'left') {
    pPr += `<w:jc w:val="${align}"/>`;
  }
  if (indentLeft > 0) {
    pPr += `<w:ind w:left="${indentLeft}"/>`;
  }
  pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${lineSpacing}" w:lineRule="auto"/>`;
  pPr += `</w:pPr>`;

  let rXml = '';
  if (Array.isArray(runs) && runs.length > 0) {
    for (const run of runs) {
      rXml += `<w:r><w:rPr>`;
      rXml += `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
      if (run.bold) rXml += `<w:b/><w:bCs/>`;
      if (run.italic) rXml += `<w:i/><w:iCs/>`;
      const sz = run.fontSize || fontSize;
      rXml += `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
      rXml += `<w:color w:val="000000"/>`;
      rXml += `</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
    }
  } else if (text !== undefined) {
    rXml = `<w:r><w:rPr>`;
    rXml += `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
    if (bold) rXml += `<w:b/><w:bCs/>`;
    if (italic) rXml += `<w:i/><w:iCs/>`;
    rXml += `<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>`;
    rXml += `<w:color w:val="000000"/>`;
    rXml += `</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  }

  return `<w:p>${pPr}${rXml}</w:p>`;
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
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
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
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`
    );

    // 4. word/settings.xml
    zip.file(
      'word/settings.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`
    );

    // 5. word/fontTable.xml
    zip.file(
      'word/fontTable.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fontTable xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fontTable>`
    );

    // 6. word/styles.xml
    zip.file(
      'word/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
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
</w:styles>`
    );

    // 7. word/document.xml
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
    bodyXml += `<w:p><w:pPr><w:pBdr><w:bottom w:val="double" w:sz="12" w:space="4" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="160"/></w:pPr></w:p>`;

    // Informasi Mahasiswa & Dokumen (Format Rapi)
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
        fontSize: 26, // 13pt
        spaceBefore: 240,
        spaceAfter: 120
      });

      for (const meeting of course.meetings) {
        // Sub Kategori: Pertemuan x
        const meetingTitle = `Pertemuan ${meeting.meetingNum !== null ? meeting.meetingNum : ''}${meeting.sectionName ? ` - ${meeting.sectionName}` : ''}`;
        bodyXml += createParagraphXml({
          text: meetingTitle,
          bold: true,
          fontSize: 24, // 12pt
          indentLeft: 400, // indent ~0.7cm
          spaceBefore: 140,
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
            indentLeft: 720,
            spaceBefore: 40,
            spaceAfter: 60
          });
        }

        // Isi Forum :
        bodyXml += createParagraphXml({
          text: 'Isi forum :',
          bold: true,
          fontSize: 24,
          indentLeft: 720, // indent ~1.27cm
          spaceBefore: 80,
          spaceAfter: 40
        });

        // Konten Soal dari Dosen
        const questionParagraphs = meeting.paragraphs && meeting.paragraphs.length > 0
          ? meeting.paragraphs
          : (meeting.rawMessage ? htmlToParagraphs(meeting.rawMessage) : ['(Tidak ada teks soal/instruksi terlampir dari dosen)']);

        for (const pText of questionParagraphs) {
          bodyXml += createParagraphXml({
            text: pText,
            fontSize: 24,
            indentLeft: 720,
            spaceBefore: 40,
            spaceAfter: 60,
            lineSpacing: 360 // 1.5 line spacing
          });
        }

        // Ruang Jawaban :
        bodyXml += createParagraphXml({
          text: 'Jawaban :',
          bold: true,
          fontSize: 24,
          indentLeft: 720,
          spaceBefore: 120,
          spaceAfter: 60
        });

        // Garis-garis respons untuk mahasiswa mengetik jawaban
        for (let i = 0; i < 3; i++) {
          bodyXml += createParagraphXml({
            text: '________________________________________________________________________________',
            fontSize: 24,
            indentLeft: 720,
            spaceBefore: 40,
            spaceAfter: 40
          });
        }

        // Spasi pemisah antar pertemuan
        bodyXml += createParagraphXml({
          text: '',
          fontSize: 24,
          spaceBefore: 100,
          spaceAfter: 100
        });
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
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
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
   * Contoh: 'Senin, 21 September 2026'
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
