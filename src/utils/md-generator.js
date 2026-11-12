/**
 * Mentari Mod Modern Edition - Markdown (.md) Generator
 * Menghasilkan file Markdown (.md) murni dan prompt-ready secara client-side.
 * Didesain khusus untuk efisiensi konsumsi token LLM / AI (ChatGPT, Claude, Gemini):
 * - Zero XML / ZIP overhead: Menghemat 30% - 60% token input AI dibanding .docx
 * - Native GFM (GitHub Flavored Markdown): Tabel, list, bold, heading terstruktur
 * - Prompt Header Cerdas: Konteks instruksi siap pakai untuk LLM
 * - Salin Instan Clipboard: Siap paste ke AI tanpa perlu upload file
 */

export class MarkdownGenerator {
  /**
   * Mengonversi HTML mentah forum (termasuk tag tabel, list, formatting) ke Markdown bersih
   */
  static htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') return '';

    // Jika teks polos tanpa tag HTML
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      return html.trim();
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;

    const processNode = (node) => {
      if (!node) return '';

      // Text Node
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/\u00a0/g, ' ');
      }

      // Element Node
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        // 1. Heading
        if (/^h[1-6]$/.test(tag)) {
          const level = parseInt(tag[1], 10);
          const prefix = '#'.repeat(level) + ' ';
          const content = Array.from(node.childNodes).map(processNode).join('').trim();
          return content ? `\n\n${prefix}${content}\n\n` : '';
        }

        // 2. Paragraf & Break
        if (tag === 'p') {
          const content = Array.from(node.childNodes).map(processNode).join('').trim();
          return content ? `\n\n${content}\n\n` : '';
        }
        if (tag === 'br') {
          return '\n';
        }
        if (tag === 'hr') {
          return '\n\n---\n\n';
        }

        // 3. Bold & Italic & Strike
        if (tag === 'strong' || tag === 'b') {
          const content = Array.from(node.childNodes).map(processNode).join('').trim();
          return content ? `**${content}**` : '';
        }
        if (tag === 'em' || tag === 'i') {
          const content = Array.from(node.childNodes).map(processNode).join('').trim();
          return content ? `*${content}*` : '';
        }
        if (tag === 'del' || tag === 's' || tag === 'strike') {
          const content = Array.from(node.childNodes).map(processNode).join('').trim();
          return content ? `~~${content}~~` : '';
        }

        // 4. Code & Blockquote
        if (tag === 'code') {
          const content = Array.from(node.childNodes).map(processNode).join('');
          return `\`${content}\``;
        }
        if (tag === 'pre') {
          const content = node.textContent || '';
          return `\n\`\`\`\n${content.trim()}\n\`\`\`\n`;
        }
        if (tag === 'blockquote') {
          const content = Array.from(node.childNodes).map(processNode).join('').trim();
          return content ? `\n\n> ${content.replace(/\n/g, '\n> ')}\n\n` : '';
        }

        // 5. Links
        if (tag === 'a') {
          const href = node.getAttribute('href') || '';
          const text = Array.from(node.childNodes).map(processNode).join('').trim() || href;
          return href ? `[${text}](${href})` : text;
        }

        // 6. Lists
        if (tag === 'ul') {
          const items = Array.from(node.children)
            .filter(c => c.tagName.toLowerCase() === 'li')
            .map(li => `- ${Array.from(li.childNodes).map(processNode).join('').trim()}`)
            .join('\n');
          return items ? `\n\n${items}\n\n` : '';
        }
        if (tag === 'ol') {
          let idx = 1;
          const items = Array.from(node.children)
            .filter(c => c.tagName.toLowerCase() === 'li')
            .map(li => `${idx++}. ${Array.from(li.childNodes).map(processNode).join('').trim()}`)
            .join('\n');
          return items ? `\n\n${items}\n\n` : '';
        }
        if (tag === 'li') {
          return Array.from(node.childNodes).map(processNode).join('').trim();
        }

        // 7. Table handling
        if (tag === 'table') {
          return MarkdownGenerator._tableToMarkdown(node);
        }

        // 8. Container divs/spans
        return Array.from(node.childNodes).map(processNode).join('');
      }

      return '';
    };

    let md = processNode(body);

    // Normalisasi whitespace & baris baru berlebih
    md = md
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return md;
  }

  /**
   * Mengonversi elemen table DOM menjadi format tabel Markdown (GFM)
   */
  static _tableToMarkdown(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const grid = [];
    let maxCols = 0;

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('th, td')).map(cell => {
        return (cell.textContent || '')
          .replace(/[\r\n]+/g, ' ')
          .replace(/\|/g, '\\|')
          .trim();
      });
      if (cells.length > 0) {
        if (cells.length > maxCols) maxCols = cells.length;
        grid.push(cells);
      }
    }

    if (grid.length === 0 || maxCols === 0) return '';

    // Pastikan setiap row memiliki panjang kolom yang sama
    for (const row of grid) {
      while (row.length < maxCols) {
        row.push('');
      }
    }

    const header = grid[0];
    const separator = Array(maxCols).fill('---');
    const dataRows = grid.slice(1);

    const formatRow = (r) => `| ${r.join(' | ')} |`;

    let out = '\n\n' + formatRow(header) + '\n' + formatRow(separator);
    for (const dr of dataRows) {
      out += '\n' + formatRow(dr);
    }
    out += '\n\n';

    return out;
  }

  /**
   * Membersihkan judul pertemuan agar bebas redundansi
   */
  static cleanMeetingTitle(meetingNum, sectionName) {
    const mNumStr = (meetingNum !== null && meetingNum !== undefined) ? String(meetingNum).trim() : '';
    const sName = (sectionName || '').trim();

    if (!mNumStr && !sName) return 'Pertemuan Forum Diskusi';
    if (!mNumStr) return sName;
    if (!sName) return `Pertemuan ${mNumStr}`;

    const regexExact = new RegExp(`^(?:Pertemuan|Meeting)\\s*0*${mNumStr}$`, 'i');
    if (regexExact.test(sName)) {
      return `Pertemuan ${mNumStr}`;
    }

    const regexPrefix = new RegExp(`^(?:Pertemuan|Meeting)\\s*0*${mNumStr}\\s*[:\\-–—.]?\\s*`, 'i');
    const cleanedSuffix = sName.replace(regexPrefix, '').trim();

    if (cleanedSuffix) {
      return `Pertemuan ${mNumStr} - ${cleanedSuffix}`;
    }

    return `Pertemuan ${mNumStr}`;
  }

  /**
   * Menghasilkan dokumen Markdown lengkap dari kumpulan data forum
   */
  static generateForumRecap({ studentName, studentNim, dateString, courses }) {
    let md = '';

    // 1. Dokumen Header & AI Guidance
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${String(hours).padStart(2, '0')}:${minutes} WIB`;
    let greetingSuggestion = 'Selamat Pagi';
    if (hours >= 11 && hours < 15) {
      greetingSuggestion = 'Selamat Siang';
    } else if (hours >= 15 && (hours < 18 || (hours === 18 && now.getMinutes() < 30))) {
      greetingSuggestion = 'Selamat Sore';
    } else {
      greetingSuggestion = 'Selamat Malam';
    }

    md += `# REKAP TUGAS FORUM DISKUSI MENTARI UNPAM\n\n`;
    md += `> **Metadata Dokumen:**\n`;
    md += `> - **Mahasiswa**: ${studentName || 'Mahasiswa UNPAM'}\n`;
    md += `> - **NIM**: ${studentNim || '-'}\n`;
    md += `> - **Tanggal Rekap**: ${dateString || new Date().toLocaleDateString('id-ID')}\n`;
    md += `> - **Waktu Lokal Mahasiswa**: ${timeFormatted} (Rekomendasi Sapaan: ${greetingSuggestion})\n`;

    let totalTasks = 0;
    (courses || []).forEach(c => {
      totalTasks += (c.meetings || []).length;
    });
    md += `> - **Total Tugas Menunggu**: ${totalTasks} Forum\n\n`;

    md += `> **PANDUAN & KETENTUAN INSTRUKSI AI (SYSTEM CONTEXT):**\n`;
    md += `> Anda bertindak sebagai mahasiswa akademis berwawasan kritis, beretika ilmiah tinggi, dan menulis dengan gaya manusia alami (human-written style). Selesaikan seluruh tugas forum diskusi LMS Mentari UNPAM di bawah ini dengan mematuhi **KETENTUAN WAJIB** berikut:\n`;
    md += `>\n`;
    md += `> 1. **ANTI-HALUSINASI, ANTI-AI SLOP & ZERO CHAT PREAMBLE:**\n`;
    md += `>    - **Dilarang Halusinasi Teori, Regulasi, & Referensi**: Teori, konsep, undang-undang/regulasi (Permen/UU), dan fakta ilmiah WAJIB akurat dan nyata. DILARANG MENGARANG nomor regulasi fiktif (seperti mengarang peraturan kementerian fiktif yang dicocokkan dengan tahun berjalan) atau membuat tautan URL palsu! Gunakan buku teks ilmiah nyata atau regulasi yang benar-benar sah berlaku di Indonesia.\n`;
    md += `>    - **Dilarang Keras Chat Slop / Basa-Basi**: DILARANG menambahkan kalimat sapaan santai ('Halo...', 'Semangat ya...', dll), komentar penjelasan sebelum draf, atau catatan penutup yang tidak diminta. LANGSUNG sajikan draf format yang diminta.\n`;
    md += `>    - **Gaya Alami Manusia**: Hindari struktur jawaban kaku atau template robotik. Buat kalimat mengalir luwes, kritis, berbobot, dan mencerminkan pemikiran orisinal mahasiswa berwawasan tinggi.\n`;
    md += `>\n`;
    md += `> 2. **KEPADATAN & PENGGUNAAN BAHASA:**\n`;
    md += `>    - **Padat, Ringkas, dan Jelas**: Jawaban tidak boleh bertele-tele atau panjang berbusa-busa. Sampaikan argumen secara to the point, lugas, dan memiliki dasar analisis yang kuat.\n`;
    md += `>    - **Batasi Istilah Asing**: Utamakan Bahasa Indonesia baku sesuai EYD/PUEBI. Jangan menyisipkan istilah asing (bahasa Inggris atau serapan baru) jika dalam pertanyaan atau petunjuk dosen tidak menggunakan istilah tersebut. Gunakan padanan bahasa Indonesia yang lazim.\n`;
    md += `>\n`;
    md += `> 3. **PRIORITAS SUMBER MATERI RUJUKAN (JIKA DILAMPIRKAN):**\n`;
    md += `>    - Jika mahasiswa melampirkan berkas materi kuliah (PDF, PPT, dokumen Word, modul, ringkasan, atau gambar), jawaban **WAJIB** mengacu dan diutamakan bersumber dari materi yang dilampirkan tersebut.\n`;
    md += `>\n`;
    md += `> 4. **FORMAT INTERAKSI FORUM DISKUSI (TERPISAH & SIAP DISALIN PER SUBMIT):**\n`;
    md += `>    Untuk setiap pertemuan di bawah ini, susun draf respons terpisah yang siap di-copas langsung ke LMS sesuai aturan ketat berikut:\n`;
    md += `>\n`;
    md += `>    - **Format 1: Menjawab Forum Dosen (1 Submisi Utuh per Pertemuan)**\n`;
    md += `>      *PENTING*: Seluruh pertanyaan/soal dalam 1 pertemuan dijawab dalam SATU kesatuan respons utuh. Secara default gunakan SATU salam pembuka tanpa salam ganda (contoh: langsung 'Assalamu'alaikum Wr. Wb. Selamat...'). NAMUN, jika aturan khusus dosen pada forum bersangkutan secara tegas meminta mengawali dengan kata 'Salam' (misalnya instruksi dosen: 'Awali dengan tulisan Salam'), maka PATUHI instruksi dosen tersebut dan tuliskan 'Salam' sesuai permintaan dosen — aturan khusus dosen selalu menang di atas aturan umum ini:\n`;
    md += `>      \`\`\`text\n`;
    md += `>      Assalamu'alaikum Wr. Wb. Selamat (Pagi/Siang/Sore/Malam) [Bapak/Ibu Nama Dosen]\n`;
    md += `>      Izin Menanggapi Forum di atas [sesuaikan perkenalan nama panggilan jika ada aturan khusus dosen]:\n`;
    md += `>\n`;
    md += `>      1. [Jawaban Soal/Poin 1: Padat, analitis, to the point]\n`;
    md += `>      [... Lanjutkan penomoran 2, 3, dst. mengikuti persis nomor butir soal dosen]\n`;
    md += `>\n`;
    md += `>      [Daftar Referensi Ilmiah nyata jika diinstruksikan oleh dosen]\n`;
    md += `>\n`;
    md += `>      Terima kasih\n`;
    md += `>      \`\`\`\n`;
    md += `>      *(ATURAN MUTLAK PENOMORAN 1:1 SESUAI SOAL DOSEN)*: \n`;
    md += `>      - Jumlah dan nomor urut jawaban **WAJIB PERSIS SAMA (1:1)** dengan butir nomor soal yang tertera pada petunjuk dosen.\n`;
    md += `>      - **DILARANG MEMECAH 1 SOAL MENJADI 2 NOMOR UTUH**. Jika dosen memberikan 2 butir soal (Soal 1 dan Soal 2), maka jawaban Anda **HANYA BOLEH TERDIRI DARI NOMOR 1 DAN NOMOR 2**. Sub-pertanyaan di dalam soal 1 (misal analisis kekurangan dan perbaikannya) wajib dijawab di dalam nomor 1 yang sama (gunakan alinea baru atau sub-poin a, b, BUKAN menaikkannya menjadi nomor baru sehingga membuat total soal menjadi 3!).\n`;
    md += `>      - Dilarang membatasi hanya 2 soal jika soal dosen ada 3 atau lebih, dan dilarang menambah nomor fiktif jika soal dosen hanya ada 1 atau 2.\n`;
    md += `>      *(Catatan Nama Dosen: Gunakan Nama Dosen Pengampu yang tercantum pada metadata mata kuliah/pertemuan di bawah. Jika tertulis [Bapak/Ibu Dosen Pengampu], gunakan sapaan sopan: "Bapak/Ibu Dosen").*\n`;
    md += `>\n`;
    md += `>    - **Format 2: Bertanya kepada Dosen atau Teman di Forum (TANPA SALAM)**\n`;
    md += `>      *PENTING*: DILARANG menambahkan ucapan salam atau sapaan ganda. Langsung awali dengan kata izin bertanya:\n`;
    md += `>      \`\`\`text\n`;
    md += `>      Izin bertanya [Bapak/Ibu Dosen / Teman-teman]:\n`;
    md += `>      [Pertanyaan akademik kritis, analitis, dan berbobot yang relevan dengan topik materi pertemuan guna membuka ruang diskusi produktif]\n`;
    md += `>      Terima kasih\n`;
    md += `>      \`\`\`\n`;
    md += `>\n`;
    md += `>    - **Format 3: Menjawab / Menanggapi Pertanyaan Teman di Forum (HANYA JIKA ADA PERTANYAAN TEMAN)**\n`;
    md += `>      *PENTING*: Format ini HANYA dibuat jika mahasiswa menyertakan/mengirimkan teks pertanyaan dari rekan mahasiswa yang ingin dijawab. Jika mahasiswa TIDAK melampirkan pertanyaan teman, DILARANG mengarang pertanyaan fiktif atau membuat jawaban palsu! Cukup cantumkan keterangan:\n`;
    md += `>      *(Format 3 akan dibuat otomatis saat Anda menyertakan teks pertanyaan dari rekan forum yang ingin ditanggapi)*\n`;
    md += `>      Jika mahasiswa menyertakan pertanyaan teman, susun jawabannya TANPA SALAM persis dengan struktur:\n`;
    md += `>      \`\`\`text\n`;
    md += `>      Izin menjawab [Nama Rekan Mahasiswa / Rekan]:\n`;
    md += `>      [Tanggapan solutif, argumentatif, dan konstruktif terhadap pertanyaan rekan tersebut]\n`;
    md += `>      Terima kasih\n`;
    md += `>      \`\`\`\n`;
    md += `>\n`;
    md += `> 5. **PENENTUAN WAKTU SAPAAN (WAKTU LOKAL MAHASISWA - ZONA INDONESIA / WIB):**\n`;
    md += `>    - **Dilarang Keras** menggunakan zona waktu server asal AI (seperti server Amerika Serikat, China, atau UTC) yang dapat menyebabkan salah ucapan waktu.\n`;
    md += `>    - Sapaan waktu (\`Selamat Pagi\` / \`Selamat Siang\` / \`Selamat Sore\` / \`Selamat Malam\`) WAJIB mengacu pada **Waktu Lokal Mahasiswa di Indonesia (Zona Waktu Indonesia Barat / WIB - UTC+7)** saat pengerjaan berlangsung.\n`;
    md += `>    - Gunakan waktu dan rekomendasi sapaan yang tertera pada baris **Waktu Lokal Mahasiswa** di bagian Metadata Dokumen di atas sebagai acuan utama waktu mahasiswa.\n`;
    md += `>    - Acuan pembagian waktu lokal mahasiswa (WIB):\n`;
    md += `>      * Pukul 05.00 – 10.59 WIB: \`Selamat Pagi\`\n`;
    md += `>      * Pukul 11.00 – 14.59 WIB: \`Selamat Siang\`\n`;
    md += `>      * Pukul 15.00 – 18.29 WIB: \`Selamat Sore\`\n`;
    md += `>      * Pukul 18.30 – 04.59 WIB: \`Selamat Malam\`\n`;
    md += `>\n`;
    md += `> 6. **KEPATUHAN PENUH PADA ATURAN DOSEN:**\n`;
    md += `>    - Baca dan ikuti setiap butir instruksi atau aturan spesifik yang diberikan oleh dosen pada masing-masing forum secara cermat tanpa ada yang terlewat (seperti penggunaan nama panggilan mahasiswa, format penomoran, aturan huruf kapital, penggunaan kata 'Salam' jika diminta dosen, dan referensi). **Jika aturan dosen bertentangan dengan aturan umum prompt ini, SELALU PRIORITASKAN ATURAN DOSEN.**\n\n`;
    md += `---\n\n`;

    // 2. Loop per Mata Kuliah
    (courses || []).forEach((course, cIdx) => {
      const cCode = course.courseCode ? ` (${course.courseCode})` : '';
      const dosenName = course.lecturerName ? course.lecturerName.trim() : '';
      md += `## ${cIdx + 1}. Mata Kuliah: ${course.courseTitle || 'Mata Kuliah'}${cCode}\n`;
      if (dosenName) {
        md += `> - **Dosen Pengampu**: ${dosenName}\n\n`;
      } else {
        md += `> - **Dosen Pengampu**: *[Bapak/Ibu Dosen Pengampu]*\n\n`;
      }

      const meetings = course.meetings || [];
      if (meetings.length === 0) {
        md += `*Tidak ada tugas forum pending untuk mata kuliah ini.*\n\n`;
      } else {
        meetings.forEach((m, mIdx) => {
          const meetHeading = MarkdownGenerator.cleanMeetingTitle(m.meetingNum, m.sectionName);
          md += `### ${mIdx + 1}.1. ${meetHeading}\n`;
          if (m.lecturerName && m.lecturerName.trim() && m.lecturerName.trim() !== dosenName) {
            md += `> - **Dosen Pertemuan**: ${m.lecturerName.trim()}\n`;
          }
          if (m.topicTitle && m.topicTitle.trim()) {
            md += `**Topik Diskusi**: *${m.topicTitle.trim()}*\n\n`;
          } else {
            md += `\n`;
          }

          // Konversi konten soal/materi dosen ke Markdown
          const questionMd = MarkdownGenerator.htmlToMarkdown(m.rawMessage || '');
          md += `#### Petunjuk & Soal Diskusi:\n`;
          if (questionMd) {
            md += `${questionMd}\n\n`;
          } else {
            md += `*Tidak ada teks petunjuk eksplisit dari dosen (silakan cek modul terkait).*\n\n`;
          }

          md += `---\n\n`;
        });
      }
    });

    return md;
  }

  /**
   * Salin teks markdown ke clipboard pengguna secara aman
   */
  static async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback execCommand textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch {
      textArea.remove();
      return false;
    }
  }

  /**
   * Unduh file Markdown (.md) sebagai blob
   */
  static downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
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
}
