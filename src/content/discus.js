/**
 * Mentari Mod Modern Edition - Forum Discussion AI Assistant
 * Membantu mencari jawaban forum diskusi dan membuat pertanyaan ilmiah dengan Gemini Generasi Baru.
 */

import { Toast } from '../utils/toast.js';
import { Humanizer } from '../utils/humanizer.js';

class DiscusAssistant {
  constructor() {
    this._init();
  }

  _init() {
    console.log('[Mentari Mod] Forum Discussion Assistant aktif.');
    this._attachActionButtons();

    // Pantau perubahan DOM jika halaman forum load dinamis
    const observer = new MutationObserver(() => {
      this._attachActionButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  _attachActionButtons() {
    if (document.getElementById('mentari-discus-toolbar')) return;

    // Cari area thread topik forum
    const topicContainer = document.querySelector('.ck-content') || document.querySelector('.MuiPaper-root') || document.querySelector('main');
    if (!topicContainer) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'mentari-discus-toolbar';
    toolbar.style.cssText = `
      display: flex;
      gap: 10px;
      margin: 16px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const btnAnswer = document.createElement('button');
    btnAnswer.style.cssText = `
      background: #f59e0b;
      color: #121212;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    `;
    btnAnswer.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      AI Cari Jawaban
    `;

    const btnAsk = document.createElement('button');
    btnAsk.style.cssText = `
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    `;
    btnAsk.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      AI Buat Pertanyaan
    `;

    btnAnswer.addEventListener('click', () => this.handleGenerateAnswer(btnAnswer));
    btnAsk.addEventListener('click', () => this.handleGenerateQuestion(btnAsk));

    toolbar.appendChild(btnAnswer);
    toolbar.appendChild(btnAsk);

    // Sisipkan sebelum editor balasan atau di bawah materi topik
    const editorTarget = document.querySelector('.ck-editor, form, .MuiTextField-root');
    if (editorTarget) {
      editorTarget.parentElement.insertBefore(toolbar, editorTarget);
    } else {
      topicContainer.appendChild(toolbar);
    }
  }

  _getTopicText() {
    const postEls = document.querySelectorAll('.discussion-post, [role="article"], .MuiPaper-root, .ck-content');
    for (const el of postEls) {
      const txt = el.textContent.trim();
      if (txt.length > 20) return txt;
    }
    return document.title || 'Materi Perkuliahan';
  }

  async handleGenerateAnswer(btn) {
    const topicText = this._getTopicText();
    btn.disabled = true;
    btn.textContent = 'Menganalisis...';

    Toast.info('Mengirim permintaan ke Gemini AI...');

    chrome.runtime.sendMessage({
      action: 'generateGeminiContent',
      prompt: `Berikut adalah topik forum diskusi kuliah:\n"${topicText}"\n\nBuatlah jawaban atau tanggapan diskusi yang akademis, sopan, mendalam, dan relevan dengan bahasa Indonesia yang baik:`,
      systemInstruction: 'Kamu adalah mahasiswa pintar yang berpartisipasi aktif dalam forum diskusi akademik universitas.'
    }, async (res) => {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        AI Cari Jawaban
      `;

      if (res && res.success) {
        // Copy ke clipboard
        try {
          await navigator.clipboard.writeText(res.text);
          Toast.success('Jawaban berhasil disalin ke clipboard! Siap di-paste ke forum.');
        } catch {
          Toast.info('Jawaban berhasil dibuat.');
        }

        // Coba masukkan otomatis ke CKEditor jika ada
        const ckEditor = document.querySelector('.ck-content');
        if (ckEditor) {
          ckEditor.innerHTML = `<p>${res.text.replace(/\n/g, '<br>')}</p>`;
          ckEditor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        Toast.error(res ? res.error : 'Gagal menghasilkan tanggapan.');
      }
    });
  }

  async handleGenerateQuestion(btn) {
    const topicText = this._getTopicText();
    btn.disabled = true;
    btn.textContent = 'Membuat...';

    chrome.runtime.sendMessage({
      action: 'generateGeminiContent',
      prompt: `Berdasarkan materi forum berikut:\n"${topicText}"\n\nBuatlah 1 pertanyaan diskusi kritis yang akademis dan menarik untuk ditanyakan kepada dosen/teman sekelas.`,
      systemInstruction: 'Kamu adalah mahasiswa kritis yang ingin mendalami materi kuliah.'
    }, async (res) => {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        AI Buat Pertanyaan
      `;

      if (res && res.success) {
        try {
          await navigator.clipboard.writeText(res.text);
          Toast.success('Pertanyaan berhasil dibuat dan disalin ke clipboard!');
        } catch {
          Toast.info('Pertanyaan berhasil dibuat.');
        }
      } else {
        Toast.error(res ? res.error : 'Gagal menghasilkan pertanyaan.');
      }
    });
  }
}

if (typeof window !== 'undefined') {
  new DiscusAssistant();
}