/**
 * Mentari Mod Modern Edition - Quiz Automation Assistant
 * Otomatisasi kuis berintelegensi tinggi dengan Gemini Generasi Baru & Anti-Deteksi Humanizer.
 * 100% aman untuk ekosistem UNPAM (Bebas dari bug fatal :contains() & hash Emotion class).
 */

import { Storage } from '../utils/storage.js';
import { DOM } from '../utils/dom.js';
import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';

const ALL_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
];

class QuizAssistant {
  constructor() {
    this.isRunning = false;
    this.isAutoMode = false;
    this.answeredCount = 0;
    this.totalQuestions = 0;
    this.shadow = null;
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] Quiz Assistant aktif.');

    // Pasang panel kontrol mini asisten kuis
    this._injectFloatingControl();
  }

  _injectFloatingControl() {
    if (document.getElementById('mentari-quiz-control-host')) return;

    const host = document.createElement('div');
    host.id = 'mentari-quiz-control-host';
    host.style.position = 'fixed';
    host.style.bottom = '24px';
    host.style.right = '24px';
    host.style.zIndex = '2147483641';

    this.shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .quiz-card {
        background: rgba(18, 18, 22, 0.96);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(212, 175, 55, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 250px;
      }
      .quiz-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .quiz-title {
        font-size: 13px;
        font-weight: 700;
        color: #d4af37;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .model-select {
        width: 100%;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #e5e5e5;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 11px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      .model-select:focus {
        border-color: #d4af37;
      }
      .model-select option {
        background: #18181c;
        color: #fff;
      }
      .btn-action {
        background: #d4af37;
        color: #121212;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
      }
      .btn-action:hover {
        background: #e6be40;
        transform: translateY(-1px);
      }
      .btn-action:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .btn-single {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-single:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .status-text {
        font-size: 11px;
        color: #aaa;
        line-height: 1.3;
      }
    `;

    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Mentari AI Quiz
        </div>
      </div>
      <div>
        <select class="model-select" id="quiz-select-model" title="Pilih Model AI Gemini">
          ${ALL_MODELS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
        </select>
      </div>
      <div class="status-text" id="status-text">Siap membantu mengerjakan kuis.</div>
      <div style="display:flex; gap:8px;">
        <button class="btn-single" id="btn-single" type="button">Jawab Ini</button>
        <button class="btn-action" id="btn-auto" type="button">Auto Semua</button>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(card);
    document.body.appendChild(host);

    const selectModel = this.shadow.getElementById('quiz-select-model');
    const btnSingle = this.shadow.getElementById('btn-single');
    const btnAuto = this.shadow.getElementById('btn-auto');
    const statusText = this.shadow.getElementById('status-text');

    // Sinkronisasi model yang tersimpan
    Storage.get('gemini_model').then(({ gemini_model }) => {
      if (gemini_model) selectModel.value = gemini_model;
    });

    selectModel.addEventListener('change', () => {
      Storage.set({ gemini_model: selectModel.value });
      Toast.info(`Model diubah ke: ${selectModel.options[selectModel.selectedIndex].text}`);
    });

    btnSingle.addEventListener('click', async () => {
      btnSingle.disabled = true;
      statusText.textContent = 'Menganalisis soal saat ini...';
      try {
        await this.processCurrentQuestion(false);
        statusText.textContent = 'Jawaban berhasil dipilih.';
      } catch (e) {
        statusText.textContent = 'Gagal: ' + e.message;
        Toast.error(e.message);
      } finally {
        btnSingle.disabled = false;
      }
    });

    btnAuto.addEventListener('click', async () => {
      if (this.isRunning) {
        this.isRunning = false;
        btnAuto.textContent = 'Auto Semua';
        statusText.textContent = 'Otomatisasi dihentikan.';
        Toast.info('Otomatisasi kuis dihentikan pengguna.');
        return;
      }

      this.isRunning = true;
      btnAuto.textContent = 'Hentikan';
      statusText.textContent = 'Menjalankan kuis secara bertahap...';
      Toast.info('Mode auto-quiz aktif dengan jeda humanized anti-deteksi.');

      try {
        await this.runAutoLoop(statusText);
      } catch (e) {
        Toast.error(e.message);
      } finally {
        this.isRunning = false;
        btnAuto.textContent = 'Auto Semua';
      }
    });
  }

  /**
   * Eksekusi loop menjawab seluruh soal dengan jeda natural manusia
   */
  async runAutoLoop(statusEl) {
    while (this.isRunning) {
      if (statusEl) statusEl.textContent = 'Menganalisis soal...';
      const success = await this.processCurrentQuestion(true);
      if (!success) {
        if (statusEl) statusEl.textContent = 'Selesai atau tidak ada soal aktif.';
        this.isRunning = false;
        break;
      }

      // Cari tombol Selanjutnya / Next yang masih AKTIF (tidak disabled)
      const nextBtn = DOM.findButtonByText(['selanjutnya', 'next', 'berikutnya']);
      if (nextBtn) {
        if (statusEl) statusEl.textContent = 'Menuju soal berikutnya...';
        await Humanizer.randomDelay(700, 1500);
        await Humanizer.naturalClick(nextBtn);

        // Tunggu transisi soal
        await Humanizer.delay(1200);
      } else {
        // Soal terakhir! Cek tombol Selesai / Kumpulkan
        this.isRunning = false;
        const finishBtn = DOM.findButtonByText(['selesai quiz', 'selesai kuis', 'selesai', 'finish', 'kumpulkan', 'akhiri']);
        if (finishBtn) {
          if (statusEl) statusEl.textContent = 'Semua soal terjawab. Selesai!';
          Toast.success('Semua soal kuis berhasil dijawab dengan sukses!');
          
          const { mentari_auto_finish_quiz } = await Storage.get('mentari_auto_finish_quiz', { mentari_auto_finish_quiz: false });
          if (mentari_auto_finish_quiz) {
            await Humanizer.randomDelay(1500, 2500);
            await Humanizer.naturalClick(finishBtn);
            // Tangani dialog konfirmasi jika muncul
            await Humanizer.delay(800);
            const confirmBtn = DOM.findButtonByText(['ya', 'ok', 'setuju', 'submit', 'kirim']);
            if (confirmBtn) await Humanizer.naturalClick(confirmBtn);
          }
        } else {
          if (statusEl) statusEl.textContent = 'Semua soal telah terjawab!';
          Toast.success('Seluruh nomor soal telah berhasil dijawab!');
        }
        break;
      }
    }
  }

  /**
   * Memproses satu soal kuis yang sedang terbuka di layar
   */
  async processCurrentQuestion(isAuto = false) {
    const questionContainer = this._findQuestionContainer();
    if (!questionContainer) {
      throw new Error('Elemen soal kuis tidak ditemukan pada halaman.');
    }

    // Ekstrak teks soal dan opsi jawaban
    const { questionText, options } = this._parseQuestionAndOptions(questionContainer);
    if (!questionText || options.length === 0) {
      throw new Error('Gagal mengekstrak teks pertanyaan atau opsi pilihan.');
    }

    // 1. Cek apakah ada indikator kunci jawaban yang sudah terbuka/bocor pada DOM
    const revealedIndex = options.findIndex(o => {
      const parent = o.element?.closest('.MuiFormControlLabel-root, label, .MuiPaper-root, tr, div');
      if (!parent) return false;
      const html = parent.outerHTML.toLowerCase();
      const text = parent.textContent.toLowerCase();
      return parent.classList.contains('correct') ||
             parent.classList.contains('is-correct') ||
             parent.classList.contains('jawaban-benar') ||
             parent.getAttribute('data-correct') === 'true' ||
             html.includes('green') ||
             text.includes('(benar)') ||
             text.includes('(kunci)');
    });

    if (revealedIndex !== -1) {
      const targetElement = options[revealedIndex].element;
      await Humanizer.naturalClick(targetElement);
      Toast.success(`Kunci jawaban terdeteksi! Memilih [${options[revealedIndex].letter || revealedIndex + 1}]`);
      return true;
    }

    // Jeda membaca natural yang cepat & responsif (Anti-Deteksi ringan)
    if (isAuto) {
      await Humanizer.readingPacing(questionText, 600, 1500);
    }

    // Bangun prompt untuk Gemini
    const prompt = this._buildPrompt(questionText, options);
    const systemInstruction = `Kamu adalah pakar akademik berintelegensi tinggi. Analisis soal dengan sangat teliti dan pilih SATU jawaban yang 100% paling akurat dan benar. Format output HARUS HANYA HURUF OPSI DAN TEKS JAWABAN SAJA (contoh: "A" atau "B. Jakarta"). Tanpa penjelasan, tanpa pembuka atau penutup.`;

    const selectModel = this.shadow?.getElementById('quiz-select-model');
    const chosenModel = selectModel ? selectModel.value : null;

    // Panggil Service Worker
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'generateGeminiContent',
        prompt,
        systemInstruction,
        model: chosenModel
      }, resolve);
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Gagal memanggil Gemini AI.');
    }

    // Evaluasi jawaban AI dan tentukan opsi terbaik
    const bestOptionIndex = this._determineMatchingOption(response.text, options);
    if (bestOptionIndex === -1) {
      throw new Error('Tidak dapat mencocokkan respon AI dengan opsi kuis.');
    }

    // Cari elemen radio button yang sesuai dan klik secara natural
    const targetElement = options[bestOptionIndex].element;
    await Humanizer.naturalClick(targetElement);

    Toast.info(`Menjawab [${options[bestOptionIndex].letter || bestOptionIndex + 1}] via ${response.model || 'Gemini'}`);
    return true;
  }

  _findQuestionContainer() {
    // Cari container soal dengan prioritas bertingkat
    const candidates = [
      document.querySelector('.question-container'),
      document.querySelector('form[action*="exam"]'),
      document.querySelector('.MuiPaper-root:has(.MuiRadio-root)'),
      document.querySelector('.MuiPaper-root:has(input[type="radio"])'),
      document.querySelector('.MuiCard-root:has(input[type="radio"])'),
      document.querySelector('main .MuiBox-root:has(.MuiRadio-root)'),
      document.querySelector('div:has(> .MuiFormControl-root)'),
      document.body
    ];
    return candidates.find(c => c && c.querySelector('input[type="radio"], .MuiRadio-root'));
  }

  _parseQuestionAndOptions(container) {
    // 1. Ambil teks soal
    let questionText = '';
    const textContainers = container.querySelectorAll('.MuiTypography-root, p, .soal-text');
    for (const el of textContainers) {
      if (el.closest('.MuiFormControlLabel-root, label')) continue;
      const t = el.textContent.trim();
      if (t.length > 10) {
        questionText = t;
        break;
      }
    }

    // 2. Ambil opsi pilihan jawaban (Radio items)
    const options = [];
    const radioLabels = container.querySelectorAll('.MuiFormControlLabel-root, label:has(input[type="radio"])');

    radioLabels.forEach((labelEl, idx) => {
      const radioInput = labelEl.querySelector('input[type="radio"]') || labelEl;
      const labelText = labelEl.textContent.trim();
      const letterMatch = labelText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);

      options.push({
        index: idx,
        letter: letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + idx),
        text: letterMatch ? letterMatch[2] : labelText,
        fullText: labelText,
        element: radioInput
      });
    });

    return { questionText, options };
  }

  _buildPrompt(questionText, options) {
    const formattedOptions = options.map(o => `${o.letter}. ${o.text}`).join('\n');
    return `Soal:\n${questionText}\n\nPilihan Jawaban:\n${formattedOptions}\n\nJawaban yang benar adalah:`;
  }

  _determineMatchingOption(aiAnswer, options) {
    if (!aiAnswer) return -1;
    const cleanAnswer = aiAnswer.trim().toUpperCase();

    // 1. Cek kecocokan huruf di awal respon (A, B, C, D, E)
    const letterMatch = cleanAnswer.match(/^([A-E])\b/);
    if (letterMatch) {
      const targetLetter = letterMatch[1];
      const matchIdx = options.findIndex(o => o.letter === targetLetter);
      if (matchIdx !== -1) return matchIdx;
    }

    // 2. Cek kecocokan substring teks opsi
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (cleanAnswer.includes(opt.text.toUpperCase()) || opt.text.toUpperCase().includes(cleanAnswer)) {
        return i;
      }
    }

    return 0; // Default ke opsi pertama jika ambigu
  }
}

if (typeof window !== 'undefined') {
  new QuizAssistant();
}