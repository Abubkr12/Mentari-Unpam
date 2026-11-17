/**
 * Mentari Mod Modern Edition - Quiz Automation Assistant
 * Otomatisasi kuis berintelegensi tinggi dengan Gemini Generasi Baru & Anti-Deteksi Humanizer.
 * 100% aman untuk ekosistem UNPAM (Bebas dari bug fatal :contains() & hash Emotion class).
 */

import { Storage, AutoPilotState } from '../utils/storage.js';
import { AutoPilotSync } from '../utils/autopilot-sync.js';
import { DOM } from '../utils/dom.js';
import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';
import { ACTIVE_FREE_MODELS, VALID_FREE_MODEL_IDS, DEFAULT_FREE_MODEL } from '../utils/models.js';

const ALL_MODELS = ACTIVE_FREE_MODELS.map(m => ({ id: m.id, name: m.label }));
const VALID_MODEL_IDS = VALID_FREE_MODEL_IDS;
const DEFAULT_MODEL = DEFAULT_FREE_MODEL;

class QuizAssistant {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.isAutoMode = false;
    this.isAutoPilot = false;
    this.answeredCount = 0;
    this.totalQuestions = 0;
    this.shadow = null;
    this.hudShadow = null;
    this.hudHost = null;
    this.activeModel = DEFAULT_MODEL;
    this._currentSessionQuestions = [];
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] Quiz Assistant aktif.');

    // 1. Muat model terakhir dari storage sebelum UI diinjeksi (mencegah flash blank)
    try {
      const { gemini_model } = await Storage.get('gemini_model', { gemini_model: DEFAULT_MODEL });
      if (gemini_model && VALID_MODEL_IDS.includes(gemini_model)) {
        this.activeModel = gemini_model;
      } else {
        this.activeModel = DEFAULT_MODEL;
        await Storage.set({ gemini_model: DEFAULT_MODEL });
      }
    } catch (e) {
      this.activeModel = DEFAULT_MODEL;
    }

    // 2. Pasang panel kontrol mini asisten kuis
    this._injectFloatingControl();

    // 3. Sinkronisasi real-time jika model diubah dari komponen lain (Settings / Chat)
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.gemini_model) {
          const newModel = changes.gemini_model.newValue;
          if (newModel && VALID_MODEL_IDS.includes(newModel)) {
            this.activeModel = newModel;
            const selectModel = this.shadow?.getElementById('quiz-select-model');
            if (selectModel && selectModel.value !== newModel) {
              selectModel.value = newModel;
            }
          }
        }
      });
    }

    // 4. Periksa dan inisialisasi sesi Auto-Pilot jika aktif
    await this._checkAndInitAutoPilot();
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
      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.35);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.6);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      .quiz-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: grab;
        user-select: none;
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
          ${ALL_MODELS.map(m => `<option value="${m.id}" ${m.id === this.activeModel ? 'selected' : ''}>${m.name}</option>`).join('')}
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

    this._makeElementDraggable(host, card.querySelector('.quiz-header'));

    const selectModel = this.shadow.getElementById('quiz-select-model');
    const btnSingle = this.shadow.getElementById('btn-single');
    const btnAuto = this.shadow.getElementById('btn-auto');
    const statusText = this.shadow.getElementById('status-text');

    if (selectModel) {
      selectModel.value = this.activeModel;

      selectModel.addEventListener('change', () => {
        const chosen = selectModel.value;
        if (chosen && VALID_MODEL_IDS.includes(chosen)) {
          this.activeModel = chosen;
          Storage.set({ gemini_model: chosen });
          const label = selectModel.options[selectModel.selectedIndex]?.text || chosen;
          Toast.info(`Model diubah ke: ${label}`);
        }
      });
    }

    btnSingle.addEventListener('click', async () => {
      const comp = this._checkIfExamAlreadyCompleted();
      if (comp.isCompleted) {
        Toast.warning(`Kuis ini sudah selesai (${comp.reason}).`);
        statusText.textContent = 'Kuis sudah selesai dikerjakan.';
        return;
      }
      const locked = this._checkIfExamLocked();
      if (locked.isLocked) {
        Toast.warning(`Kuis terkunci: ${locked.reason}`);
        statusText.textContent = 'Kuis terkunci / belum dapat diakses.';
        return;
      }

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

      const comp = this._checkIfExamAlreadyCompleted();
      if (comp.isCompleted) {
        Toast.warning(`Kuis ini sudah selesai (${comp.reason}). Otomatisasi dinonaktifkan.`);
        statusText.textContent = 'Kuis sudah selesai dikerjakan.';
        return;
      }
      const locked = this._checkIfExamLocked();
      if (locked.isLocked) {
        Toast.warning(`Kuis terkunci: ${locked.reason}`);
        statusText.textContent = 'Kuis terkunci / belum dapat diakses.';
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
   * Ekstrak informasi judul kuis, pertemuan, dan tipe evaluasi dari DOM Mentari
   */
  _extractExamTitleAndTypeFromDOM() {
    let rawText = '';

    // 1. Breadcrumbs / Navigasi dekat tombol Kembali
    const backBtn = Array.from(document.querySelectorAll('a, button, div, span')).find(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      return t === 'kembali' || t === '← kembali' || t.startsWith('kembali');
    });

    if (backBtn) {
      const parent = backBtn.closest('.MuiBox-root, .MuiToolbar-root, header, nav, div');
      if (parent) {
        rawText += ' ' + parent.textContent;
      }
    }

    // 2. Headings halaman (h1 - h6, Typography)
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-root'));
    for (const h of headings.slice(0, 15)) {
      rawText += ' ' + (h.textContent || '');
    }

    // 3. Document Title
    rawText += ' ' + (document.title || '');

    const lower = rawText.toLowerCase();

    // Deteksi Tipe Kuis
    let detectedType = 'UNKNOWN';
    if (/(?:pre[\s\-_]*test|pretest)/i.test(lower)) {
      detectedType = 'PRE_TEST';
    } else if (/(?:post[\s\-_]*test|posttest)/i.test(lower)) {
      detectedType = 'POST_TEST';
    } else if (/(?:kuesioner|kuisioner|angket|survey)/i.test(lower)) {
      detectedType = 'KUESIONER';
    }

    // Deteksi nomor pertemuan
    const meetMatch = lower.match(/(?:pertemuan|sesi|p)[\s\-_]*(\d+)/i);
    const meetingName = meetMatch ? `Pertemuan ${meetMatch[1]}` : '';

    // Cari judul kuis terbersih dari heading
    let cleanTitle = '';
    for (const h of headings) {
      const t = (h.textContent || '').trim();
      if (/(?:pre[\s\-_]*test|post[\s\-_]*test|kuis|quiz|ujian)/i.test(t) && t.length < 60 && !t.toLowerCase().includes('sudah selesai')) {
        cleanTitle = t;
        break;
      }
    }

    if (!cleanTitle) {
      cleanTitle = detectedType === 'PRE_TEST' ? `Pre-Test ${meetingName}`.trim() : (detectedType === 'POST_TEST' ? `Post-Test ${meetingName}`.trim() : 'Kuis');
    }

    return {
      detectedType,
      meetingName,
      cleanTitle,
      rawText
    };
  }

  /**
   * Helper untuk memeriksa apakah elemen memiliki indikator warna hijau (terjawab)
   */
  /**
   * Helper untuk memeriksa apakah elemen memiliki indikator warna hijau (terjawab)
   */
  _isGreenColor(btn) {
    if (!btn) return false;

    // Kumpulkan btn dan seluruh elemen anak (span, icon, label, svg)
    const elementsToCheck = [btn, ...Array.from(btn.querySelectorAll ? btn.querySelectorAll('*') : (btn.children || []))];

    for (const el of elementsToCheck) {
      const style = window.getComputedStyle(el);
      const bg = (style.backgroundColor || '').toLowerCase();
      const color = (style.color || '').toLowerCase();
      const border = (style.borderColor || '').toLowerCase();
      const className = (el.className || '').toString().toLowerCase();
      const inlineStyle = (el.getAttribute('style') || '').toLowerCase();
      const titleAttr = (el.getAttribute('title') || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

      // 1. Cek class name & attributes
      if (
        className.includes('success') ||
        className.includes('answered') ||
        className.includes('completed') ||
        className.includes('muibutton-containedsuccess') ||
        className.includes('terjawab') ||
        className.includes('bg-green') ||
        className.includes('btn-success') ||
        titleAttr.includes('terjawab') ||
        titleAttr.includes('sudah') ||
        ariaLabel.includes('terjawab') ||
        ariaLabel.includes('sudah')
      ) {
        return true;
      }

      // 2. Cek inline style warna hijau
      if (
        inlineStyle.includes('green') ||
        inlineStyle.includes('#2e7d32') ||
        inlineStyle.includes('#4caf50') ||
        inlineStyle.includes('#16a34a') ||
        inlineStyle.includes('#22c55e') ||
        inlineStyle.includes('46, 125, 50') ||
        inlineStyle.includes('76, 175, 80')
      ) {
        return true;
      }

      // 3. Cek background-color spesifik Mentari LMS / Material UI
      if (
        bg.includes('46, 125, 50') ||
        bg.includes('76, 175, 80') ||
        bg.includes('46, 133, 64') ||
        bg.includes('34, 197, 94') ||
        bg.includes('16, 185, 129') ||
        bg.includes('22, 163, 74') ||
        bg.includes('56, 142, 60') ||
        bg.includes('102, 187, 106') ||
        bg.includes('green')
      ) {
        return true;
      }

      // 4. Cek komponen RGB pada background atau border
      for (const colorStr of [bg, border]) {
        const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1], 10);
          const g = parseInt(rgbMatch[2], 10);
          const b = parseInt(rgbMatch[3], 10);

          const isNeutral = Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
          if (!isNeutral && g >= 75 && g > r * 1.15 && g > b * 1.15) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Ekstrak nomor soal aktif yang sedang terbuka di layar
   * Mendeteksi header soal ("1 . Multiple Choice", "Soal 1"), URL query params, atau tombol navigasi aktif
   */
  _extractActiveQuestionNumberFromDOM() {
    try {
      // 1. Cek dari teks header soal di container kuis (e.g. "1 . Multiple Choice", "Soal 1", "Pertanyaan 1")
      const container = this._findQuestionContainer();
      if (container) {
        const textNodes = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-root, p, div, span'));
        for (const el of textNodes) {
          if (el.closest('.MuiFormControlLabel-root, label, .MuiRadio-root, input[type="radio"], #mentari-autopilot-hud-host')) continue;
          const txt = (el.textContent || '').trim();
          // Cocokkan "1 . Multiple Choice", "1. Pilihan Ganda", "1 .", "1."
          const matchMC = txt.match(/^(\d+)\s*[\.\)]\s*(?:multiple\s*choice|pilihan\s*ganda)?/i);
          if (matchMC) {
            const n = parseInt(matchMC[1], 10);
            if (!isNaN(n) && n >= 1 && n <= 200) return n;
          }
          // Cocokkan "Soal 1", "Pertanyaan 1", "Question 1"
          const matchSoal = txt.match(/^(?:soal|pertanyaan|question)\s*(?:no\.?|nomor)?\s*(\d+)/i);
          if (matchSoal) {
            const n = parseInt(matchSoal[1], 10);
            if (!isNaN(n) && n >= 1 && n <= 200) return n;
          }
        }
      }

      // 2. Cek dari URL query parameter jika ada (e.g. ?page=1, ?question=1, ?soal=1)
      const urlParams = new URLSearchParams(window.location.search);
      for (const param of ['page', 'soal', 'no', 'question', 'q', 'p']) {
        const val = urlParams.get(param);
        if (val && /^\d+$/.test(val)) {
          const n = parseInt(val, 10);
          if (!isNaN(n) && n >= 1 && n <= 200) return n;
        }
      }

      // 3. Cek dari tombol navigasi kuis yang aktif/terpilih
      const navKeywords = ['navigasi soal', 'navigasi quiz', 'quiz navigation', 'exam navigation', 'daftar soal'];
      const allTextEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-root, span, p, div, b, strong'));
      const navHeader = allTextEls.find(el => {
        if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host')) return false;
        const t = (el.textContent || '').trim().toLowerCase();
        return navKeywords.some(kw => t === kw || (t.startsWith(kw) && t.length < 35));
      });

      let navButtons = [];
      if (navHeader) {
        let curr = navHeader.parentElement;
        for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
          const found = Array.from(curr.querySelectorAll('button, a, div, span, [role="button"]')).filter(el => {
            if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host, .MuiDialog-root')) return false;
            const t = (el.textContent || '').trim();
            return /^\d+$/.test(t);
          });
          if (found.length > 0) {
            navButtons = found;
            break;
          }
          curr = curr.parentElement;
        }
      }

      for (const btn of navButtons) {
        const rawClass = String(btn?.className?.baseVal || btn?.className || '').toLowerCase();
        const isCurrent = btn.classList?.contains?.('active') ||
                          btn.classList?.contains?.('Mui-selected') ||
                          btn.getAttribute?.('aria-current') === 'true' ||
                          btn.getAttribute?.('aria-selected') === 'true' ||
                          (rawClass.includes('selected') && !rawClass.includes('unselected'));
        if (isCurrent) {
          const n = parseInt((btn.textContent || '').trim(), 10);
          if (!isNaN(n) && n >= 1 && n <= 200) return n;
        }
      }
    } catch (e) {
      console.warn('[Quiz] Error saat deteksi nomor soal aktif:', e);
    }
    return null;
  }

  /**
   * Ekstrak status navigasi nomor soal dari halaman kuis/ujian (Anti-Skip, Anti-Submit Prematur)
   * Berbasis pencarian card "Navigasi Soal" dan penelusuran tombol nomor (/^\d+$/).
   * Membedakan status hijau (terjawab) vs abu-abu/putih (belum terjawab).
   */
  _getExamNavigationStatus() {
    try {
      // 1. Prioritas Utama: Cari card "Navigasi Soal" langsung dari heading teksnya
      const navKeywords = ['navigasi soal', 'navigasi quiz', 'quiz navigation', 'exam navigation', 'daftar soal'];
      const allTextEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-root, span, p, div, b, strong'));
      const navHeader = allTextEls.find(el => {
        if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host')) return false;
        const t = (el.textContent || '').trim().toLowerCase();
        return navKeywords.some(kw => t === kw || (t.startsWith(kw) && t.length < 35));
      });

      let rawButtons = [];
      if (navHeader) {
        // Telusuri ancestor (parent, grandparent, dst) dari navHeader untuk menemukan card/box yang menaungi tombol nomor
        let curr = navHeader.parentElement;
        for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
          const found = Array.from(curr.querySelectorAll('button, a, div, span, [role="button"]')).filter(el => {
            if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host, .MuiDialog-root')) return false;
            const t = (el.textContent || '').trim();
            if (!/^\d+$/.test(t)) return false;
            const n = parseInt(t, 10);
            return n >= 1 && n <= 200;
          });
          if (found.length > 0) {
            rawButtons = found;
            break;
          }
          curr = curr.parentElement;
        }
      }

      // 2. Fallback: Cari tombol nomor di seluruh dokumen jika container spesifik tidak ditemukan
      if (rawButtons.length === 0) {
        const allCandidates = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'));
        rawButtons = allCandidates.filter(el => {
          if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host, .MuiDialog-root')) return false;
          const t = (el.textContent || '').trim();
          if (!/^\d+$/.test(t)) return false;
          const n = parseInt(t, 10);
          return n >= 1 && n <= 200;
        });
      }

      if (rawButtons.length === 0) return null;

      // 3. Deduplikasi dan kelompokkan berdasarkan nomor soal (utamakan elemen yang dapat diklik)
      const buttonMap = new Map();
      for (const el of rawButtons) {
        const num = parseInt((el.textContent || '').trim(), 10);
        if (isNaN(num)) continue;

        const clickable = el.closest('button, a, [role="button"]') || el;
        const isVisible = window.getComputedStyle(clickable).display !== 'none' && window.getComputedStyle(clickable).visibility !== 'hidden';
        if (!buttonMap.has(num) || (isVisible && !buttonMap.get(num).isVisible)) {
          buttonMap.set(num, { btn: clickable, isVisible, num });
        }
      }

      if (buttonMap.size === 0) return null;

      // Ambil nomor soal yang sedang aktif saat ini dan status radio tercentang
      const activeQuestionNum = this._extractActiveQuestionNumberFromDOM();
      const curRadioChecked = !!this._findQuestionContainer()?.querySelector('input[type="radio"]:checked');

      // 4. Urutkan nomor soal secara ascending (1, 2, 3...)
      const sortedEntries = Array.from(buttonMap.values()).sort((a, b) => a.num - b.num);

      const questions = sortedEntries.map(({ btn, num }) => {
        const rawClass = String(btn?.className?.baseVal || btn?.className || '');
        const classLower = rawClass.toLowerCase();
        const isCurrent = (activeQuestionNum !== null && activeQuestionNum === num) ||
                          btn.classList?.contains?.('active') ||
                          btn.classList?.contains?.('Mui-selected') ||
                          btn.getAttribute?.('aria-current') === 'true' ||
                          btn.getAttribute?.('aria-selected') === 'true' ||
                          (classLower.includes('selected') && !classLower.includes('unselected'));

        // Hijau (terjawab) vs Abu-Abu/Putih (belum terjawab)
        let isAnswered = this._isGreenColor(btn);
        // Jika nomor saat ini sudah ada opsi radio terpilih, statusnya sudah terjawab
        if (isCurrent && curRadioChecked) {
          isAnswered = true;
        }
        const isUnanswered = !isAnswered;

        return {
          num,
          btn,
          isAnswered,
          isUnanswered,
          isCurrent
        };
      });

      const unanswered = questions.filter(q => q.isUnanswered || !q.isAnswered);
      const totalQuestions = questions.length;

      return {
        total: totalQuestions,
        totalQuestions,
        questions,
        unansweredCount: unanswered.length,
        answeredCount: totalQuestions - unanswered.length,
        allAnswered: unanswered.length === 0 && totalQuestions > 0
      };
    } catch (err) {
      console.warn('[Quiz] Error parsing exam navigation status:', err);
      return null;
    }
  }

  /**
   * Deteksi apakah kuis saat ini sudah selesai (Review Mode / Skor Akhir)
   * PRIORITAS TERTINGGI: Dicek SEBELUM mencari container soal untuk mencegah kuota AI terbuang sia-sia!
   */
  _checkIfExamAlreadyCompleted() {
    const domInfo = this._extractExamTitleAndTypeFromDOM();

    // 1. Cek teks eksplisit penyelesaian kuis pada heading atau elemen teks
    const completedKeywords = [
      'quiz sudah selesai',
      'kuis sudah selesai',
      'ujian sudah selesai',
      'tes sudah selesai',
      'telah diselesaikan',
      'sudah diselesaikan',
      'hasil kuis',
      'hasil ujian',
      'nilai akhir',
      'skor anda',
      'nilai anda',
      'anda telah menyelesaikan kuis ini',
      'anda sudah mengerjakan kuis ini',
      'attempt 1 of 1',
      'percobaan 1 dari 1'
    ];

    const allHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-root, p, div'));
    let explicitCompletion = null;
    for (const el of allHeaders) {
      if (el.closest('#mentari-autopilot-hud-host') ||
          el.closest('#mentari-quiz-control-host') ||
          el.closest('#mentari-token-mod-host') ||
          el.closest('.mentari-toast-container')) {
        continue;
      }
      const t = (el.textContent || '').trim().toLowerCase();
      for (const kw of completedKeywords) {
        if (t.includes(kw)) {
          explicitCompletion = {
            isCompleted: true,
            reason: `Teks '${kw}' terdeteksi pada layar`,
            detectedType: domInfo.detectedType,
            title: domInfo.cleanTitle
          };
          break;
        }
      }
      if (explicitCompletion) break;
    }

    // 2. ACTIVE EXAM VETO (OVERRIDE MUTLAK):
    // Jika ada radio button aktif yang BELUM disabled, ATAU timer countdown aktif, ATAU badge 'belum dijawab'
    // DAN tidak ada heading eksplisit bahwa kuis sudah selesai:
    // Kuis 100% PASTI AKTIF! Mencegah false positive fatal di tengah pengerjaan soal (?page=1, ?page=2, dst).
    const activeRadios = Array.from(document.querySelectorAll('input[type="radio"]:not(:disabled)'));
    const hasActiveRadios = activeRadios.length > 0;

    const pageText = (document.body?.innerText || '').toLowerCase();
    const hasActiveTimer = pageText.includes('waktu tersisa') || pageText.includes('sisa waktu') || pageText.includes('time remaining');
    const hasUnansweredBadge = pageText.includes('belum dijawab');

    if (!explicitCompletion && (hasActiveTimer || hasUnansweredBadge || hasActiveRadios)) {
      return {
        isCompleted: false,
        reason: '',
        detectedType: domInfo.detectedType,
        title: domInfo.cleanTitle
      };
    }

    // Jika ada heading selesai dan TIDAK ADA radio aktif yang bisa diklik, kuis dipastikan telah selesai
    if (explicitCompletion && !hasActiveRadios) {
      return explicitCompletion;
    }

    // 3. Cek elemen tabel skor / riwayat nilai (jika tidak ada radio aktif)
    const scoreTable = document.querySelector('table.MuiTable-root, .hasil-ujian, .skor-container');
    if (scoreTable && !hasActiveRadios) {
      const tableText = (scoreTable.textContent || '').toLowerCase();
      if (tableText.includes('nilai') || tableText.includes('skor') || tableText.includes('grade') || tableText.includes('selesai')) {
        return {
          isCompleted: true,
          reason: 'Tabel riwayat nilai/skor terdeteksi',
          detectedType: domInfo.detectedType,
          title: domInfo.cleanTitle
        };
      }
    }

    // 4. Deteksi seluruh radio button disabled (Read-only review mode)
    const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
    if (radioInputs.length > 0 && radioInputs.every(r => r.disabled || r.getAttribute('aria-disabled') === 'true')) {
      return {
        isCompleted: true,
        reason: 'Seluruh opsi pilihan kuis disabled (Read-only review)',
        detectedType: domInfo.detectedType,
        title: domInfo.cleanTitle
      };
    }

    return {
      isCompleted: false,
      reason: '',
      detectedType: domInfo.detectedType,
      title: domInfo.cleanTitle
    };
  }

  /**
   * Deteksi apakah kuis sedang terkunci (misal forum diskusi belum diselesaikan atau waktu belum buka)
   */
  _checkIfExamLocked() {
    const alertEl = document.querySelector('.MuiAlert-root, [role="alert"], .alert-warning, .alert-danger');
    if (alertEl) {
      const t = (alertEl.textContent || '').trim().toLowerCase();
      if (t.includes('terkunci') || t.includes('belum dapat diakses') || t.includes('prasyarat') || t.includes('selesaikan terlebih dahulu')) {
        return {
          isLocked: true,
          reason: alertEl.textContent.trim()
        };
      }
    }

    // Cek tombol mulai yang disabled
    const startBtn = this._findStartExamButton();
    if (startBtn && (startBtn.disabled || startBtn.classList.contains('Mui-disabled'))) {
      return {
        isLocked: true,
        reason: 'Tombol mulai kuis berstatus disabled (Terkunci)'
      };
    }

    // Cek batas waktu ujian 1 jam habis / expired attempt
    const pageText = (document.body?.innerText || '').toLowerCase();
    if (pageText.includes('waktu pengerjaan telah habis') || 
        pageText.includes('waktu ujian telah habis') || 
        pageText.includes('waktu telah berakhir') || 
        pageText.includes('waktu telah habis') ||
        pageText.includes('waktu pengerjaan kuis telah habis')) {
      return {
        isLocked: true,
        reason: 'Waktu pengerjaan 1 jam di UNPAM telah habis (Attempt Expired)'
      };
    }

    return { isLocked: false, reason: '' };
  }

  /**
   * Catat ID kuis yang selesai ke storage lokal persisten (mentari_completed_quiz_ids & cache)
   * agar kuis ini TIDAK PERNAH DIJALANKAN ULANG dan kuota token pengguna tetap aman.
   */
  async _markQuizAsCompletedPermanently(state, currentItem) {
    try {
      const quizId = currentItem?.id;
      if (!quizId) return;

      const store = await Storage.get('mentari_completed_quiz_ids');
      const completedIds = Array.isArray(store?.mentari_completed_quiz_ids) ? store.mentari_completed_quiz_ids : [];

      if (!completedIds.includes(quizId)) {
        completedIds.push(quizId);
        await Storage.set({ mentari_completed_quiz_ids: completedIds });
        console.log(`[Auto-Pilot] Kuis ID ${quizId} (${currentItem.courseTitle} - ${currentItem.sectionName}) ditandai selesai secara permanen.`);
      }

      // Tandai juga pada cache evaluasi jika tersedia
      const allStorage = (Storage && typeof Storage.getAll === 'function') ? await Storage.getAll() : {};
      for (const [key, val] of Object.entries(allStorage || {})) {
        if (key && key.startsWith('mentari_cached_data_') && val && Array.isArray(val.evaluations)) {
          let updated = false;
          val.evaluations.forEach(ev => {
            if (ev.subId === quizId || ev.id === quizId) {
              ev.completion = true;
              updated = true;
            }
          });
          if (updated) {
            await Storage.set({ [key]: val });
          }
        }
      }
    } catch (e) {
      console.warn('[Auto-Pilot] Gagal menyimpan status kuis selesai permanen:', e);
    }
  }

  /**
   * Cari tombol mulai kuis / ujian dengan pencarian keyword fleksibel & tahan banting
   */
  _findStartExamButton() {
    // 1. Cek keyword eksplisit via DOM.findButtonByText
    const startKeywords = [
      'mulai quiz', 'mulai kuis', 'mulai ujian', 'mulai tes', 'mulai',
      'kerjakan quiz', 'kerjakan kuis', 'kerjakan ujian', 'kerjakan tes', 'kerjakan',
      'start exam', 'start quiz', 'take quiz', 'attempt quiz', 'attempt now',
      'attempt quiz now', 're-attempt quiz', 'kerjakan ulang',
      'lanjutkan quiz', 'lanjutkan kuis', 'lanjutkan ujian', 'lanjutkan'
    ];
    const startBtn = DOM.findButtonByText(startKeywords);
    if (startBtn) return startBtn;

    // 2. Query selector tombol MUI / HTML button yang mengandung kata kunci
    const allButtons = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"]'));
    for (const b of allButtons) {
      if (b.closest('#mentari-autopilot-hud-host') ||
          b.closest('#mentari-quiz-control-host') ||
          b.closest('#mentari-token-mod-host') ||
          b.closest('.mentari-toast-container')) {
        continue;
      }
      if (b.disabled || b.classList.contains('Mui-disabled') || b.getAttribute('aria-disabled') === 'true') {
        continue;
      }
      const text = (b.textContent || b.value || '').trim().toLowerCase();
      // Negative filter: lewati tombol navigasi
      if (text.includes('kembali') || text.includes('back') || text.includes('cancel') || text.includes('batal') || text.includes('daftar')) {
        continue;
      }
      if (text.includes('mulai') || (text.includes('quiz') && !text.includes('belum')) || (text.includes('kuis') && !text.includes('belum')) || text.includes('kerjakan')) {
        return b;
      }
    }
    return null;
  }

  /**
   * Cari tombol konfirmasi modal / dialog MUI ("Ya", "Mulai", "Lanjutkan")
   */
  _findDialogConfirmButton(excludeBtn = null, extraKeywords = null) {
    const dialog = document.querySelector('.MuiDialog-root, [role="dialog"], .MuiModal-root, .modal');
    if (!dialog) return null;

    const defaultKeywords = [
      'ya', 'mulai', 'start', 'ok', 'setuju', 'kerjakan', 'lanjutkan',
      'ya, mulai', 'mulai quiz', 'mulai kuis',
      'kumpulkan', 'selesaikan', 'ya, selesaikan', 'akhiri', 'submit', 'kirim'
    ];
    const confirmKeywords = Array.isArray(extraKeywords) ? [...defaultKeywords, ...extraKeywords] : defaultKeywords;
    const confirmBtn = DOM.findButtonByText(confirmKeywords, dialog);
    if (confirmBtn && confirmBtn !== excludeBtn) {
      return confirmBtn;
    }
    return null;
  }

  /**
   * Polling waiter hingga elemen soal kuis ter-mount di DOM
   */
  async _waitForQuestionContainer(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const q = this._findQuestionContainer();
      if (q) return q;
      await Humanizer.delay(400);
    }
    return null;
  }

  /**
   * Eksekusi loop menjawab seluruh soal dengan jeda natural manusia
   */
  async runAutoLoop(statusEl, isAutoPilot = false) {
    // 0. Cek apakah kuis saat ini sudah selesai sebelum memulai
    const initialComp = this._checkIfExamAlreadyCompleted();
    if (initialComp.isCompleted) {
      if (statusEl) statusEl.textContent = `${initialComp.title || 'Kuis'} sudah selesai dikerjakan (${initialComp.reason}).`;
      this.isRunning = false;
      return { isFinished: true, submitted: true, reason: initialComp.reason };
    }

    // 1. Jika masih di landing page kuis (container soal belum muncul), coba mulai kuis terlebih dahulu
    let qContainer = this._findQuestionContainer();
    if (!qContainer) {
      const startBtn = this._findStartExamButton();
      if (startBtn) {
        if (statusEl) statusEl.textContent = 'Menemukan tombol mulai kuis... Memulai pengerjaan!';
        await Humanizer.randomDelay(600, 1200);
        await Humanizer.naturalClick(startBtn);

        // Periksa dialog konfirmasi modal jika muncul
        await Humanizer.delay(800);
        const confirmBtn = this._findDialogConfirmButton(startBtn);
        if (confirmBtn) {
          await Humanizer.naturalClick(confirmBtn);
        }

        // Tunggu container soal ter-mount di DOM
        if (statusEl) statusEl.textContent = 'Menunggu soal dimuat...';
        qContainer = await this._waitForQuestionContainer(15000);
      } else {
        // Tombol mulai mungkin telah diklik sebelum masuk loop, tunggu container soal muncul
        if (statusEl) statusEl.textContent = 'Menunggu soal kuis dimuat...';
        qContainer = await this._waitForQuestionContainer(15000);
      }
    }

    let loopIterations = 0;
    const maxSafetyIterations = 60; // Mencegah infinite loop jika ada kendala DOM tak terduga
    this._currentSessionQuestions = [];

    while (this.isRunning && loopIterations < maxSafetyIterations) {
      loopIterations++;

      // Tunggu jika dijeda oleh pengguna
      while (this.isPaused && this.isRunning) {
        if (statusEl) statusEl.textContent = 'Auto-Pilot dijeda sementara.';
        await Humanizer.delay(600);
      }
      if (!this.isRunning) {
        return { isFinished: false, submitted: false, reason: 'Dibatalkan oleh pengguna' };
      }

      // Gatekeeper Anti-Waste Quota: Cek sebelum setiap nomor soal agar AI tidak pernah menjawab di halaman selesai/review
      const stepComp = this._checkIfExamAlreadyCompleted();
      if (stepComp.isCompleted) {
        console.log('[Auto-Pilot] Kuis selesai terdeteksi di tengah loop. Menghentikan.');
        if (statusEl) statusEl.textContent = `${stepComp.title || 'Kuis'} telah selesai dikerjakan.`;
        this.isRunning = false;
        return { isFinished: true, submitted: true, reason: stepComp.reason };
      }

      // 1. UPDATE MATRIX HUD DI AWAL SETIAP NOMOR SOAL
      const navStatusCurrent = this._getExamNavigationStatus();
      if (navStatusCurrent) {
        this._updateHUDNavMatrix(navStatusCurrent);
      }

      // Resume Optimization: Deteksi soal yang SUDAH terjawab (misal saat melanjutkan attempt < 1 jam)
      let curQContainer = this._findQuestionContainer();
      if (!curQContainer) {
        if (statusEl) statusEl.textContent = 'Menunggu soal kuis dimuat...';
        curQContainer = await this._waitForQuestionContainer(5000);
      }
      const currentQNav = navStatusCurrent?.questions?.find(q => q.isCurrent);
      const isCurrentVerifiedGreen = currentQNav ? currentQNav.isAnswered : false;

      const alreadyCheckedRadio = curQContainer ? curQContainer.querySelector('input[type="radio"]:checked') : null;
      const anyUnansweredRemaining = navStatusCurrent && Array.isArray(navStatusCurrent.questions) && navStatusCurrent.questions.some(q => q.isUnanswered || !q.isAnswered);

      // A. Jika nomor saat ini sudah terverifikasi hijau dan ada nomor lain yang belum terjawab, lompat via navigasi
      if (isCurrentVerifiedGreen && alreadyCheckedRadio && anyUnansweredRemaining) {
        const nextUnanswered = navStatusCurrent.questions.find(q => (q.isUnanswered || !q.isAnswered) && !q.isCurrent);
        if (nextUnanswered && nextUnanswered.btn) {
          console.log(`[Auto-Pilot] Soal saat ini sudah hijau. Melompat langsung ke Soal ${nextUnanswered.num} yang masih putih.`);
          if (statusEl) statusEl.textContent = `Soal sudah dijawab. Melompat ke Soal ${nextUnanswered.num}...`;
          await Humanizer.randomDelay(300, 600);
          await Humanizer.naturalClick(nextUnanswered.btn);
          await Humanizer.delay(600);
          continue;
        }
      }

      // B. Jawab soal via Gemini AI HANYA jika belum ada opsi radio yang terpilih
      // Kritis: Mencegah re-answering loop yang memanggil AI berulang kali untuk soal yang sama!
      if (!alreadyCheckedRadio) {
        if (statusEl) statusEl.textContent = 'Menganalisis soal via AI...';
        let success = false;
        try {
          success = await this.processCurrentQuestion(true);
        } catch (err) {
          console.warn('[Mentari AI] Gagal memproses soal (percobaan 1):', err);
          await Humanizer.delay(600);
          try {
            success = await this.processCurrentQuestion(true);
          } catch (retryErr) {
            console.error('[Mentari AI] Percobaan 2 gagal. Mengaktifkan self-recovery:', retryErr);
            if (statusEl) statusEl.textContent = `Peringatan: ${retryErr.message}. Memilih opsi pemulihan...`;
            // Fallback agar soal tidak tertinggal putih/kosong
            success = await this._forceSelectFirstOption(curQContainer);
          }
        }
      } else {
        console.log('[Auto-Pilot] Soal saat ini sudah memiliki opsi terpilih.');
        if (statusEl) statusEl.textContent = 'Soal ini sudah terjawab.';
        const curQInfo = curQContainer ? this._parseQuestionAndOptions(curQContainer) : null;
        const selectedOpt = curQInfo?.options?.find(o => o.element?.checked);
        if (curQInfo?.questionText && selectedOpt) {
          this._recordCurrentQuestionAnswer(curQInfo.questionText, selectedOpt.text, selectedOpt.letter);
        }
      }

      // Perbarui matrix HUD seketika setelah jawaban dipilih
      const navStatusAfterAnswer = this._getExamNavigationStatus();
      if (navStatusAfterAnswer) {
        this._updateHUDNavMatrix(navStatusAfterAnswer);
      }

      // Jeda singkat agar state React/Next.js ter-commit (350ms - 600ms)
      await Humanizer.randomDelay(350, 600);

      // 1. Cari tombol Selanjutnya / Next yang masih AKTIF (tidak disabled)
      let nextBtn = DOM.findButtonByText(['selanjutnya', 'next', 'berikutnya', 'soal berikutnya']);
      if (!nextBtn) {
        // Polling waiter singkat hingga 1.0 detik untuk menunggu re-render Next.js
        const waitStart = Date.now();
        while (Date.now() - waitStart < 1000 && !nextBtn) {
          await Humanizer.delay(150);
          nextBtn = DOM.findButtonByText(['selanjutnya', 'next', 'berikutnya', 'soal berikutnya']);
        }
      }

      const prevQNum = this._extractActiveQuestionNumberFromDOM();

      if (nextBtn) {
        if (statusEl) statusEl.textContent = 'Menuju soal berikutnya...';
        await Humanizer.randomDelay(200, 400);

        // SATU KALI KLIK NATURAL (SINGLE CLICK ONLY — anti double-skip 1 -> 3 -> 5)
        await Humanizer.naturalClick(nextBtn);

        // Polling transition waiter: Tunggu nomor soal aktif atau URL berganti
        let transitioned = false;
        const waitDomStart = Date.now();
        while (Date.now() - waitDomStart < 2500) {
          await Humanizer.delay(150);
          const curQNum = this._extractActiveQuestionNumberFromDOM();
          if (curQNum !== null && prevQNum !== null && curQNum !== prevQNum) {
            transitioned = true;
            break;
          }
        }
        await Humanizer.delay(200);
        continue;
      }

      // 2. KOTAK SOAL HIJAU VETO MUTLAK: Periksa seluruh status kotak nomor kuis di sidebar
      const navStatus = this._getExamNavigationStatus();
      if (navStatus && navStatus.questions && navStatus.questions.length > 0) {
        this._updateHUDNavMatrix(navStatus);

        const activeRadioNow = this._findQuestionContainer()?.querySelector('input[type="radio"]:checked');
        const unansweredList = navStatus.questions.filter(q => {
          // Jika nomor saat ini sudah ada opsi radio terpilih, jangan mem-veto dirinya sendiri
          if (q.isCurrent && activeRadioNow) return false;
          return q.isUnanswered || !q.isAnswered;
        });

        if (unansweredList.length > 0) {
          // VETO SUBMIT MUTLAK: Masih ada nomor berstatus abu-abu!
          console.warn(`[Hard Veto Kotak Hijau] Masih ada ${unansweredList.length} soal abu-abu. Submisi DIBLOKIR. Mengarahkan ke soal yang belum terjawab...`, unansweredList);
          const targetQ = unansweredList.find(q => !q.isCurrent) || unansweredList[0];
          if (targetQ && targetQ.btn) {
            if (statusEl) statusEl.textContent = `Hard Veto: Soal ${targetQ.num} belum terjawab (kotak abu-abu). Membuka Soal ${targetQ.num}...`;
            Toast.info(`Mengarahkan ke Soal ${targetQ.num} yang masih abu-abu...`);
            await Humanizer.randomDelay(300, 600);
            await Humanizer.naturalClick(targetQ.btn);
            await Humanizer.delay(600);
          } else {
            await Humanizer.delay(600);
          }
          continue; // MUTLAK KEMBALI KE AWAL LOOP, DILARANG MELANJUT KE KLIK SELESAI!
        }
      }

      // 3. Seluruh soal telah 100% terverifikasi hijau! Cek tombol Selesai / Kumpulkan
      const finishKeywords = [
        'selesai quiz', 'selesai kuis', 'selesai ujian', 'selesai',
        'finish quiz', 'finish exam', 'finish attempt', 'finish',
        'kumpulkan jawaban', 'kumpulkan', 'akhiri kuis', 'akhiri ujian', 'akhiri',
        'submit quiz', 'submit exam', 'submit'
      ];
      const finishBtn = DOM.findButtonByText(finishKeywords);

      if (finishBtn) {
        // VALIDASI FINAL MUTLAK: Pastikan 100% kotak nomor terverifikasi hijau sebelum tombol selesai boleh diklik
        const finalNav = this._getExamNavigationStatus();
        const activeRadioFinal = this._findQuestionContainer()?.querySelector('input[type="radio"]:checked');
        if (finalNav && finalNav.questions && finalNav.questions.length > 0) {
          const finalUnanswered = finalNav.questions.filter(q => {
            if (q.isCurrent && activeRadioFinal) return false;
            return q.isUnanswered || !q.isAnswered;
          });

          if (finalUnanswered.length > 0 || !finalNav.allAnswered) {
            console.warn(`[Hard Veto Submit Prematur] Tombol selesai DIBLOKIR MUTLAK! Terdeteksi ${finalUnanswered.length} soal abu-abu.`, finalUnanswered);
            const target = finalUnanswered.find(q => !q.isCurrent) || finalUnanswered[0];
            if (target && target.btn) {
              if (statusEl) statusEl.textContent = `Veto: Soal ${target.num} belum terjawab. Membuka Soal ${target.num}...`;
              await Humanizer.naturalClick(target.btn);
            }
            await Humanizer.delay(600);
            continue; // MUTLAK KEMBALI KE LOOP, DILARANG MENYERAHKAN KUIS SEBELUM 100% LENGKAP!
          }
        }

        if (statusEl) statusEl.textContent = 'Semua kotak soal terverifikasi 100% hijau! Menyelesaikan kuis...';
        Toast.success('Semua kotak nomor soal terverifikasi hijau (terjawab)!');

        const { mentari_auto_finish_quiz } = await Storage.get('mentari_auto_finish_quiz', { mentari_auto_finish_quiz: false });
        if (mentari_auto_finish_quiz || isAutoPilot) {
          await Humanizer.randomDelay(500, 1000);
          await Humanizer.naturalClick(finishBtn);

          // Tangani dialog konfirmasi modal Material UI jika muncul ("Apakah Anda yakin...")
          await Humanizer.delay(600);
          const confirmBtn = this._findDialogConfirmButton(finishBtn) || DOM.findButtonByText(['ya', 'ok', 'setuju', 'submit', 'kirim', 'selesaikan', 'ya, selesaikan', 'akhiri']);
          if (confirmBtn) {
            await Humanizer.naturalClick(confirmBtn);
          }

          if (statusEl) statusEl.textContent = 'Kuis berhasil diserahkan 100%. Menunggu konfirmasi skor sistem...';
          await Humanizer.delay(1500);

          // Evaluasi hasil dan simpan Smart Memory jika skor 100
          await this._evaluateAndSaveSmartMemory('AUTO_QUIZ', document.title);

          this.isRunning = false;
          return { isFinished: true, submitted: true, reason: 'Kuis telah dikumpulkan dan diserahkan' };
        } else {
          this.isRunning = false;
          return { isFinished: true, submitted: false, reason: 'Menunggu konfirmasi selesai manual dari pengguna' };
        }
      } else {
        const postCheck = this._checkIfExamAlreadyCompleted();
        if (postCheck.isCompleted) {
          await this._evaluateAndSaveSmartMemory('AUTO_QUIZ', document.title);
          this.isRunning = false;
          return { isFinished: true, submitted: true, reason: postCheck.reason };
        }

        // PERIKSA NAVIGASI TERLEBIH DAHULU: Jangan keluar jika masih ada soal abu-abu!
        const recheckNav = this._getExamNavigationStatus();
        if (recheckNav && recheckNav.questions && recheckNav.questions.length > 0) {
          const stillUnanswered = recheckNav.questions.filter(q => q.isUnanswered || !q.isAnswered);
          if (stillUnanswered.length > 0) {
            console.warn(`[Auto-Pilot] Belum menemukan tombol Next/Finish, tapi masih ada ${stillUnanswered.length} soal belum terjawab. Membuka Soal ${stillUnanswered[0].num}...`);
            if (stillUnanswered[0].btn) {
              if (statusEl) statusEl.textContent = `Mengarahkan ke Soal ${stillUnanswered[0].num}...`;
              await Humanizer.naturalClick(stillUnanswered[0].btn);
              await Humanizer.delay(600);
              continue;
            }
          }

          // Jika semua soal sudah dijawab tapi tombol finish belum sempat ter-render oleh Next.js, beri toleransi waktu
          if (recheckNav.allAnswered) {
            if (statusEl) statusEl.textContent = 'Semua soal terjawab. Menunggu tombol penyelesaian kuis...';
            const waitFinishStart = Date.now();
            let delayedFinishBtn = null;
            while (Date.now() - waitFinishStart < 2500 && !delayedFinishBtn) {
              await Humanizer.delay(300);
              delayedFinishBtn = DOM.findButtonByText(finishKeywords);
            }
            if (delayedFinishBtn) {
              await Humanizer.naturalClick(delayedFinishBtn);
              await Humanizer.delay(600);
              const confirmBtn = this._findDialogConfirmButton(delayedFinishBtn) || DOM.findButtonByText(['ya', 'ok', 'setuju', 'submit', 'kirim', 'selesaikan', 'ya, selesaikan', 'akhiri']);
              if (confirmBtn) {
                await Humanizer.naturalClick(confirmBtn);
              }
              if (statusEl) statusEl.textContent = 'Kuis berhasil diserahkan 100%.';
              await Humanizer.delay(1200);
              await this._evaluateAndSaveSmartMemory('AUTO_QUIZ', document.title);
              this.isRunning = false;
              return { isFinished: true, submitted: true, reason: 'Kuis telah dikumpulkan dan diserahkan' };
            }
          }
        }

        if (statusEl) statusEl.textContent = 'Semua nomor soal telah dikerjakan.';
        Toast.success('Seluruh nomor soal telah berhasil dijawab!');
        this.isRunning = false;
        return { isFinished: true, submitted: false, reason: 'Semua soal telah dikerjakan' };
      }
    }

    this.isRunning = false;
    return { isFinished: false, submitted: false, reason: 'Loop mencapai batas maksimum atau dihentikan' };
  }

  // ─── Auto-Pilot Kuis (Single-Tab Batch Runner) ────────────────────────────────

  async _checkAndInitAutoPilot() {
    const state = await AutoPilotState.get();

    if (!state || !state.active || !Array.isArray(state.queue)) {
      const manualCtrl = document.getElementById('mentari-quiz-control-host');
      if (manualCtrl) manualCtrl.style.display = 'block';
      return;
    }

    // Sembunyikan panel kontrol manual saat Auto-Pilot aktif agar tidak bentrok
    const manualCtrl = document.getElementById('mentari-quiz-control-host');
    if (manualCtrl) manualCtrl.style.display = 'none';

    // Jika antrean kuis sudah selesai seluruhnya
    if (state.currentIndex >= state.queue.length) {
      await Storage.set({
        mentari_auto_pilot_state: { ...state, active: false, finished: true }
      });
      Toast.success('Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!');
      if (manualCtrl) manualCtrl.style.display = 'block';
      return;
    }

    this.isAutoPilot = true;
    this.isPaused = Boolean(state.paused);

    // Sinkronisasi model AI dari state Auto-Pilot jika ada
    if (state.model && VALID_MODEL_IDS.includes(state.model)) {
      this.activeModel = state.model;
      await Storage.set({ gemini_model: state.model });
      const selectModel = this.shadow?.getElementById('quiz-select-model');
      if (selectModel && selectModel.value !== state.model) {
        selectModel.value = state.model;
      }
    }

    const currentItem = state.queue[state.currentIndex];
    if (!currentItem) return;

    // Jika item aktif saat ini bertipe KUESIONER, segera redirect ke halaman kuesioner
    if (currentItem.type === 'KUESIONER' && currentItem.url) {
      console.log('[Auto-Pilot Transition] Beralih dari ujian ke Kuesioner:', currentItem);
      window.location.replace(currentItem.url);
      return;
    }

    // URL Alignment Guard: Pastikan URL saat ini benar-benar sesuai dengan kuis aktif di antrean
    // Mencegah Auto-Pilot salah mengeksekusi kuis sebelumnya saat Next.js me-redirect ke ?page=1 dari kuis lama
    const urlMatch = window.location.pathname.match(/\/exam\/([^\/\?]+)/);
    const currentUrlExamId = urlMatch ? urlMatch[1] : null;

    if (currentUrlExamId && currentItem.id && currentUrlExamId !== currentItem.id) {
      console.warn(`[Auto-Pilot Guard] URL exam ID (${currentUrlExamId}) tidak cocok dengan kuis saat ini (${currentItem.id}). Segera redirect ke kuis yang benar...`);
      window.location.replace(currentItem.url);
      return;
    }

    console.log(`[Auto-Pilot] Memulai kuis ${state.currentIndex + 1}/${state.queue.length}:`, currentItem);

    // Injeksi Glassmorphic Floating HUD Tracker
    const { statusEl, badgeEl, btnPause, progressBar } = this._injectAutoPilotHUD(state, currentItem);

    // KUNCI UTAMA: Jika state sedang dijeda (misal saat refresh/error), JANGAN auto-run!
    if (this.isPaused) {
      statusEl.textContent = state.pauseReason ? `Terjeda: ${state.pauseReason}. Klik Lanjutkan untuk mencoba lagi.` : 'Auto-Pilot dijeda. Klik Lanjutkan untuk mencoba lagi.';
      return;
    }

    // Eksekusi otomatis kuis
    this._executeAutoPilotQuiz(state, currentItem, statusEl, badgeEl, btnPause, progressBar);
  }

  _injectAutoPilotHUD(state, currentItem) {
    if (document.getElementById('mentari-autopilot-hud-host')) {
      document.getElementById('mentari-autopilot-hud-host').remove();
    }

    this.hudHost = document.createElement('div');
    this.hudHost.id = 'mentari-autopilot-hud-host';
    this.hudHost.style.position = 'fixed';
    this.hudHost.style.top = '20px';
    this.hudHost.style.right = '24px';
    this.hudHost.style.zIndex = '2147483646';

    this.hudShadow = this.hudHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
      .hud-card {
        background: rgba(18, 18, 22, 0.95);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(212, 175, 55, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 330px;
        max-width: 90vw;
      }
      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.35);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.6);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      .hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: grab;
        user-select: none;
      }
      .hud-brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #fbbf24;
      }
      .hud-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .hud-badge.running {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .hud-badge.paused {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .hud-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .hud-title {
        font-size: 13px;
        font-weight: 700;
        color: #f3f4f6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hud-subtitle {
        font-size: 11px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .hud-tag {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .hud-tag.pre {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      .hud-tag.post {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
      }
      .hud-tag.kues {
        background: rgba(234, 179, 8, 0.2);
        color: #facc15;
      }
      .hud-progress-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 2px;
      }
      .hud-progress-info {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #888;
      }
      .hud-progress-bar-bg {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
      }
      .hud-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #d4af37, #fbbf24);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .hud-status {
        font-size: 11px;
        color: #fbbf24;
        background: rgba(212, 175, 55, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 6px;
        padding: 7px 10px;
        line-height: 1.4;
      }
      .hud-model-select {
        background: rgba(212, 175, 55, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 4px;
        padding: 1px 4px;
        font-size: 10px;
        font-weight: 700;
        outline: none;
        cursor: pointer;
        margin-left: auto;
        max-width: 140px;
      }
      .hud-model-select option {
        background: #18181b;
        color: #fff;
      }
      .hud-actions {
        display: flex;
        gap: 8px;
        margin-top: 2px;
      }
      .hud-btn {
        flex: 1;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.2s;
      }
      .hud-btn-pause {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .hud-btn-pause:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .hud-btn-cancel {
        background: rgba(239, 68, 68, 0.12);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }
      .hud-btn-cancel:hover {
        background: rgba(239, 68, 68, 0.25);
        color: #ef4444;
      }
      .hud-q-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        line-height: 1.2;
      }
      .hud-q-pill.answered {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.45);
      }
      .hud-q-pill.unanswered {
        background: rgba(156, 163, 175, 0.15);
        color: #9ca3af;
        border: 1px solid rgba(156, 163, 175, 0.3);
      }
      .hud-q-pill.current {
        background: rgba(245, 158, 11, 0.25);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.6);
        box-shadow: 0 0 6px rgba(245, 158, 11, 0.35);
      }
    `;

    const hudCard = document.createElement('div');
    hudCard.className = 'hud-card';

    const currentIdx = state.currentIndex;
    const totalCount = state.queue.length;
    const progressPercent = Math.round((currentIdx / totalCount) * 100);
    const currentModelId = state.model || this.activeModel;

    hudCard.innerHTML = `
      <div class="hud-header">
        <div class="hud-brand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Auto-Pilot Kuis
        </div>
        <div class="hud-badge ${this.isPaused ? 'paused' : 'running'}" id="hud-badge">
          ${this.isPaused ? 'Dijeda' : 'Berjalan'}
        </div>
      </div>

      <div class="hud-body">
        <div class="hud-title" title="${currentItem.courseTitle}">${currentItem.courseTitle}</div>
        <div class="hud-subtitle">
          <span class="hud-tag ${currentItem.type === 'PRE_TEST' ? 'pre' : (currentItem.type === 'POST_TEST' ? 'post' : 'kues')}">
            ${currentItem.type === 'PRE_TEST' ? 'Pre-Test' : (currentItem.type === 'POST_TEST' ? 'Post-Test' : 'Kuesioner')}
          </span>
          <span>${currentItem.sectionName}</span>
          <select class="hud-model-select" id="hud-select-model" title="Ganti Model AI Saat Ini">
            ${ALL_MODELS.map(m => `<option value="${m.id}" ${m.id === currentModelId ? 'selected' : ''}>${m.name.split(' (')[0]}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="hud-progress-wrap">
        <div class="hud-progress-info">
          <span>Kuis ${currentIdx + 1} dari ${totalCount}</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="hud-progress-bar-bg">
          <div class="hud-progress-bar-fill" id="hud-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="hud-matrix-wrap" style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
        <div style="font-size: 10px; color: #888; display: flex; justify-content: space-between;">
          <span>Status Kotak Soal:</span>
          <span id="hud-matrix-summary">0/0 Hijau</span>
        </div>
        <div class="hud-nav-matrix" id="hud-nav-matrix" style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 55px; overflow-y: auto;">
          <span style="font-size: 10px; color: #666;">Menunggu scan navigasi...</span>
        </div>
      </div>

      <div class="hud-status" id="hud-status-text">
        Mempersiapkan kuis...
      </div>

      <div class="hud-actions">
        <button class="hud-btn hud-btn-pause" id="hud-btn-pause">
          ${this.isPaused ? 'Lanjutkan' : 'Jeda'}
        </button>
        <button class="hud-btn hud-btn-cancel" id="hud-btn-cancel">
          Hentikan & Reset Total
        </button>
      </div>
    `;

    this.hudShadow.appendChild(style);
    this.hudShadow.appendChild(hudCard);
    document.body.appendChild(this.hudHost);

    this._makeElementDraggable(this.hudHost, hudCard.querySelector('.hud-header'));

    const statusEl = this.hudShadow.getElementById('hud-status-text');
    const badgeEl = this.hudShadow.getElementById('hud-badge');
    const btnPause = this.hudShadow.getElementById('hud-btn-pause');
    const btnCancel = this.hudShadow.getElementById('hud-btn-cancel');
    const progressBar = this.hudShadow.getElementById('hud-progress-fill');
    const hudModelSelect = this.hudShadow.getElementById('hud-select-model');

    if (hudModelSelect) {
      hudModelSelect.value = currentModelId;
      hudModelSelect.addEventListener('change', async () => {
        const newModel = hudModelSelect.value;
        if (newModel && VALID_MODEL_IDS.includes(newModel)) {
          this.activeModel = newModel;
          await Storage.set({ gemini_model: newModel });
          const curStore = await Storage.get('mentari_auto_pilot_state');
          if (curStore?.mentari_auto_pilot_state) {
            curStore.mentari_auto_pilot_state.model = newModel;
            await Storage.set({ mentari_auto_pilot_state: curStore.mentari_auto_pilot_state });
          }
          const selectModel = this.shadow?.getElementById('quiz-select-model');
          if (selectModel && selectModel.value !== newModel) {
            selectModel.value = newModel;
          }
          const label = hudModelSelect.options[hudModelSelect.selectedIndex]?.text || newModel;
          Toast.info(`Model AI diubah ke: ${label}`);
        }
      });
    }

    btnPause.addEventListener('click', async () => {
      this.isPaused = !this.isPaused;
      badgeEl.className = `hud-badge ${this.isPaused ? 'paused' : 'running'}`;
      badgeEl.textContent = this.isPaused ? 'Dijeda' : 'Berjalan';
      btnPause.textContent = this.isPaused ? 'Lanjutkan' : 'Jeda';
      statusEl.textContent = this.isPaused ? 'Auto-Pilot dijeda sementara.' : 'Melanjutkan pengerjaan kuis...';

      if (this.isPaused) {
        await AutoPilotState.pause('Dijeda oleh pengguna');
      } else {
        await AutoPilotState.resume();
      }

      // RESURRECTION: Jika kuis sebelumnya sempat berhenti/error/dijeda verifikasi, hidupkan kembali loop pengerjaan
      if (!this.isPaused && !this.isRunning) {
        this.isRunning = true;
        this.isAutoPilot = true;
        const curStore = await AutoPilotState.get();
        const curItem = curStore?.queue?.[curStore?.currentIndex];
        this._executeAutoPilotQuiz(curStore, curItem, statusEl, badgeEl, btnPause, progressBar);
      }
    });

    btnCancel.addEventListener('click', async () => {
      this.isRunning = false;
      this.isAutoPilot = false;
      this.isPaused = false;
      await AutoPilotState.reset();
      Toast.info('Auto-Pilot kuis & evaluasi telah dihentikan & direset total.');
      if (this.hudHost) this.hudHost.remove();
      const manualCtrl = document.getElementById('mentari-quiz-control-host');
      if (manualCtrl) manualCtrl.style.display = 'block';
    });

    return { statusEl, badgeEl, btnPause, progressBar };
  }

  async _executeAutoPilotQuiz(state, currentItem, statusEl, badgeEl, btnPause, progressBar) {
    statusEl.textContent = 'Memeriksa kesiapan halaman kuis...';

    // 1. Ekstrak dan validasi judul serta tipe kuis dari DOM
    const domInfo = this._extractExamTitleAndTypeFromDOM();
    console.log('[Auto-Pilot] Validasi DOM kuis:', domInfo);

    // 2. Tunggu kesiapan kuis dengan gatekeeper prioritas (selesai / terkunci / tombol mulai)
    const readyResult = await this._waitForExamReady(statusEl);
    if (!readyResult.ready) {
      if (readyResult.reason === 'completed') {
        const hasStartOrResume = !!this._findStartExamButton();
        if (!hasStartOrResume) {
          await this._markQuizAsCompletedPermanently(state, currentItem);
        }
      }

      const isFastSkip = readyResult.reason === 'completed' || readyResult.reason === 'locked';
      const skipMsg = readyResult.reason === 'completed'
        ? `${domInfo.cleanTitle || 'Kuis'} sudah selesai dikerjakan sebelumnya. Melompat ke antrean berikutnya...`
        : `Kuis tidak dapat dimulai (${readyResult.reason}). Melompat ke kuis berikutnya...`;

      statusEl.textContent = skipMsg;
      Toast.info(skipMsg);

      await Humanizer.delay(800);
      await this._advanceToNextQuiz(state, statusEl, isFastSkip);
      return;
    }

    // 3. Mulai menjawab seluruh soal kuis
    statusEl.textContent = 'Menjawab seluruh soal otomatis via AI...';
    this.isRunning = true;

    let loopResult = { isFinished: false, submitted: false };
    try {
      loopResult = await this.runAutoLoop(statusEl, true);
    } catch (e) {
      console.error('[Auto-Pilot] Error saat menjawab kuis:', e);
      statusEl.textContent = `Peringatan: ${e.message}`;
    }

    // 4. Verifikasi apakah kuis BENAR-BENAR selesai & diserahkan sebelum ditandai selesai!
    // Kritis: Mencegah kuis yang baru berjalan 1-2 soal ditandai selesai dan melompat ke kuis berikutnya!
    const finalComp = this._checkIfExamAlreadyCompleted();
    const isReallyDone = Boolean(loopResult?.submitted || finalComp.isCompleted);

    if (isReallyDone) {
      // Evaluasi hasil dan simpan Smart Memory jika skor 100
      await this._evaluateAndSaveSmartMemory(currentItem?.type || 'AUTO_PILOT', currentItem?.courseTitle || document.title);

      // Tandai permanen hanya jika kuis benar-benar sudah selesai!
      await this._markQuizAsCompletedPermanently(state, currentItem);
      statusEl.textContent = 'Kuis berhasil diselesaikan 100%! Mempersiapkan kuis berikutnya...';
      Toast.success(`Kuis ${currentItem.courseTitle} selesai 100%!`);
      await this._advanceToNextQuiz(state, statusEl, false);
    } else {
      console.warn('[Auto-Pilot] Kuis belum selesai diserahkan. TIDAK menandai selesai dan TIDAK melompat ke kuis berikutnya.', loopResult);
      statusEl.textContent = `Pengerjaan belum selesai (${loopResult?.reason || 'soal belum lengkap'}). Auto-Pilot dijeda untuk verifikasi pengguna.`;
      Toast.warning('Auto-Pilot dijeda: Kuis belum sepenuhnya selesai diserahkan. Periksa halaman kuis.');
      this.isRunning = false;
      this.isPaused = true;
      state.paused = true;
      await Storage.set({ mentari_auto_pilot_state: state });
      if (badgeEl) {
        badgeEl.className = 'hud-badge paused';
        badgeEl.textContent = 'Perlu Cek';
      }
      if (btnPause) {
        btnPause.textContent = 'Lanjutkan';
      }
    }
  }

  async _waitForExamReady(statusEl) {
    const maxRetries = 60; // 60 x 500ms = 30 detik
    for (let i = 0; i < maxRetries; i++) {
      if (!this.isAutoPilot) return { ready: false, reason: 'cancelled' };

      while (this.isPaused && this.isAutoPilot) {
        await Humanizer.delay(500);
      }

      // a) PRIORITAS 1: Cek apakah kuis SUDAH SELESAI
      // Wajib diperiksa sebelum mengecek container soal agar review page tidak dianggap kuis aktif!
      const completionCheck = this._checkIfExamAlreadyCompleted();
      if (completionCheck.isCompleted) {
        if (statusEl) {
          statusEl.textContent = `${completionCheck.title || 'Kuis'} sudah diselesaikan (${completionCheck.reason}).`;
        }
        return { ready: false, reason: 'completed' };
      }

      // b) PRIORITAS 2: Cek apakah kuis TERKUNCI (Misal prasyarat forum belum selesai)
      const lockCheck = this._checkIfExamLocked();
      if (lockCheck.isLocked) {
        if (statusEl) {
          statusEl.textContent = `Kuis terkunci: ${lockCheck.reason}`;
        }
        return { ready: false, reason: 'locked' };
      }

      // c) PRIORITAS 3: Cek apakah ada tombol Mulai Kuis / Kerjakan / Start Exam
      const startBtn = this._findStartExamButton();
      if (startBtn) {
        if (statusEl) statusEl.textContent = 'Menemukan tombol mulai kuis... Memulai!';
        await Humanizer.randomDelay(600, 1200);
        await Humanizer.naturalClick(startBtn);

        // Cek jika muncul modal konfirmasi dialog MUI ("Ya", "Mulai", "Start", "Ok")
        await Humanizer.delay(800);
        const confirmStartBtn = this._findDialogConfirmButton(startBtn);
        if (confirmStartBtn) {
          await Humanizer.naturalClick(confirmStartBtn);
        }

        // Tunggu transisi hingga container soal muncul
        if (statusEl) statusEl.textContent = 'Menunggu soal kuis dimuat...';
        const readyQ = await this._waitForQuestionContainer(15000);
        if (readyQ) {
          const recheckComp = this._checkIfExamAlreadyCompleted();
          if (recheckComp.isCompleted) {
            return { ready: false, reason: 'completed' };
          }
          return { ready: true, reason: 'started' };
        }
        continue;
      }

      // d) PRIORITAS 4: Cek apakah container soal sudah ada di layar (dan BUKAN review mode)
      const qContainer = this._findQuestionContainer();
      if (qContainer) {
        const recheckComp = this._checkIfExamAlreadyCompleted();
        if (recheckComp.isCompleted) {
          return { ready: false, reason: 'completed' };
        }
        return { ready: true, reason: 'already_active' };
      }

      await Humanizer.delay(500);
    }

    return { ready: false, reason: 'timeout' };
  }

  async _advanceToNextQuiz(state, statusEl, isSkipped = false) {
    if (!this.isAutoPilot) return;

    // Perbarui status item saat ini menjadi 'completed'
    if (state.queue && state.queue[state.currentIndex]) {
      state.queue[state.currentIndex].status = 'completed';
    }

    state.currentIndex = state.currentIndex + 1;

    // Jika antrean saat ini telah habis, periksa apakah ada kuesioner yang baru terbuka (Mode Semua Lengkap)
    if (state.currentIndex >= state.queue.length && (state.mode === 'all' || !state.mode)) {
      if (statusEl) {
        statusEl.textContent = 'Kuis selesai! Sinkronisasi real-time kuesioner dosen di server UNPAM...';
      }
      try {
        const hasNewKues = await AutoPilotSync.syncAndAppendKuesioner(state, statusEl);
        if (hasNewKues) {
          console.log('[Auto-Pilot Quiz] Kuesioner baru berhasil ditambahkan pasca-posttest! Melanjutkan pengerjaan.');
        }
      } catch (syncErr) {
        console.warn('[Auto-Pilot Quiz] Gagal sinkronisasi kuesioner pasca-posttest:', syncErr);
      }
    }

    // Periksa apakah antrean masih ada
    if (state.currentIndex < state.queue.length) {
      const nextItem = state.queue[state.currentIndex];
      await Storage.set({ mentari_auto_pilot_state: state });

      // Fast transition jika cooldownSec 0 (tanpa hitung mundur 15 detik)
      const cooldown = isSkipped ? 1 : (typeof state.cooldownSec === 'number' ? state.cooldownSec : 0);
      if (cooldown > 0) {
        if (statusEl) {
          statusEl.textContent = isSkipped
            ? `Kuis dilewati. Melompat ke kuis berikutnya...`
            : `Kuis selesai! Istirahat aman sebelum kuis berikutnya...`;
        }

        for (let s = cooldown; s > 0; s--) {
          if (!this.isAutoPilot) return;

          while (this.isPaused && this.isAutoPilot) {
            if (statusEl) statusEl.textContent = `Istirahat dijeda (${s}s). Klik Lanjutkan untuk lanjut.`;
            await Humanizer.delay(500);
          }

          if (statusEl) {
            statusEl.textContent = isSkipped
              ? `Melompat ke kuis berikutnya dalam ${s} detik...`
              : `Istirahat aman: ${s} detik sebelum kuis berikutnya...`;
          }
          await Humanizer.delay(1000);
        }
      } else {
        if (statusEl) {
          const itemLabel = nextItem.type === 'KUESIONER' ? 'Kuesioner Dosen' : 'item berikutnya';
          statusEl.textContent = isSkipped
            ? `Kuis dilewati. Melompat ke ${itemLabel}...`
            : `Kuis selesai! Membuka ${itemLabel}...`;
        }
        await Humanizer.delay(800);
      }

      const nextTypeLabel = nextItem.type === 'KUESIONER' ? 'Kuesioner' : 'Kuis';
      if (statusEl) statusEl.textContent = `Menuju ${nextTypeLabel}: ${nextItem.courseTitle} (${nextItem.sectionName})...`;
      await Humanizer.delay(500);

      // Pindah ke item berikutnya (kuis atau kuesioner) di tab yang sama (Single-Tab)
      window.location.replace(nextItem.url);
    } else {
      // Seluruh antrean selesai
      await AutoPilotState.reset();

      if (statusEl) statusEl.textContent = 'Seluruh antrean Auto-Pilot kuis & evaluasi selesai 100%!';
      Toast.success('Seluruh antrean Auto-Pilot kuis & evaluasi telah berhasil diselesaikan!');

      setTimeout(() => {
        if (this.hudHost) this.hudHost.remove();
        const manualCtrl = document.getElementById('mentari-quiz-control-host');
        if (manualCtrl) manualCtrl.style.display = 'block';
      }, 7000);
    }
  }

  /**
   * Helper untuk memilih elemen opsi jawaban menggunakan React native prototype setter
   * dan men-trigger synthetic events pada label & MuiRadio-root
   */
  async _selectOptionElement(option) {
    if (!option) return false;
    const radioInput = option.element?.tagName === 'INPUT'
      ? option.element
      : (option.element?.querySelector ? option.element.querySelector('input[type="radio"]') : option.element);
    const parentLabel = option.labelEl || (radioInput?.closest ? radioInput.closest('.MuiFormControlLabel-root, label') : null);
    const radioRoot = option.radioRoot || (radioInput?.closest ? radioInput.closest('.MuiRadio-root') : null) || parentLabel?.querySelector('.MuiRadio-root');

    // 1. Gunakan React native prototype setter untuk mengubah checked
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
    if (nativeSetter && radioInput && radioInput.tagName === 'INPUT') {
      nativeSetter.call(radioInput, true);
    } else if (radioInput && radioInput.tagName === 'INPUT') {
      radioInput.checked = true;
    }

    // 2. Dispatch synthetic & native events
    if (radioInput && radioInput.dispatchEvent) {
      radioInput.dispatchEvent(new Event('click', { bubbles: true }));
      radioInput.dispatchEvent(new Event('change', { bubbles: true }));
      radioInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 3. Lakukan juga klik pada parent label .MuiFormControlLabel-root dan .MuiRadio-root agar synthetic event React di Mentari LMS 100% terpicu
    if (radioRoot) {
      radioRoot.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
    if (parentLabel) {
      await Humanizer.naturalClick(parentLabel, true);
    } else if (radioInput) {
      await Humanizer.naturalClick(radioInput, true);
    }

    // 4. Dispatch lagi setelah klik untuk kepastian update state di Next.js
    if (radioInput && radioInput.dispatchEvent) {
      radioInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  }

  /**
   * Mekanisme Self-Recovery: Force-click pada opsi A (atau opsi pertama) menggunakan native setter
   */
  async _forceSelectFirstOption(container = null) {
    const qContainer = container || this._findQuestionContainer();
    if (!qContainer) return false;

    const { options } = this._parseQuestionAndOptions(qContainer);
    if (options.length > 0) {
      await this._selectOptionElement(options[0]);
      console.log('[Self-Recovery] Force-click opsi pertama (A) via React native setter & label click.');
      return true;
    }

    const firstRadio = qContainer.querySelector('input[type="radio"]');
    if (firstRadio) {
      await this._selectOptionElement({ element: firstRadio });
      console.log('[Self-Recovery] Force-click raw input radio pertama.');
      return true;
    }

    return false;
  }

  /**
   * Memproses satu soal kuis yang sedang terbuka di layar
   */
  async processCurrentQuestion(isAuto = false) {
    // Gatekeeper Anti-Waste Quota: Pastikan bukan di halaman review/selesai
    const compCheck = this._checkIfExamAlreadyCompleted();
    if (compCheck.isCompleted) {
      throw new Error(`Kuis ${compCheck.title || ''} sudah selesai dikerjakan.`);
    }

    const questionContainer = this._findQuestionContainer();
    if (!questionContainer) {
      throw new Error('Elemen soal kuis tidak ditemukan pada halaman.');
    }

    // Ekstrak teks soal riil dan opsi jawaban (tersaring dari header & countdown)
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
      await this._selectOptionElement(options[revealedIndex]);
      this._recordCurrentQuestionAnswer(questionText, options[revealedIndex].text, options[revealedIndex].letter);
      Toast.success(`Kunci jawaban terdeteksi! Memilih [${options[revealedIndex].letter || revealedIndex + 1}]`);
      return true;
    }

    // 2. Cek Smart Question Memory (Kunci jawaban dari Pre-Test yang lolos evaluasi skor 100)
    const memoryMatchIdx = await this._lookupSmartQuestionMemory(questionText, options);
    if (memoryMatchIdx !== null && memoryMatchIdx >= 0 && memoryMatchIdx < options.length) {
      await this._selectOptionElement(options[memoryMatchIdx]);
      this._recordCurrentQuestionAnswer(questionText, options[memoryMatchIdx].text, options[memoryMatchIdx].letter);
      console.log(`[Smart Memory] Jawaban otomatis dari memori skor 100: [${options[memoryMatchIdx].letter}] ${options[memoryMatchIdx].text}`);
      Toast.success(`Smart Memory (Score 100): Memilih [${options[memoryMatchIdx].letter || memoryMatchIdx + 1}]`);
      return true;
    }

    // Jeda membaca natural manusia (Anti-Deteksi & anti-anomali durasi yang gesit)
    if (isAuto) {
      await Humanizer.randomDelay(350, 600);
    }

    // Bangun prompt untuk Gemini
    const prompt = this._buildPrompt(questionText, options);
    const systemInstruction = `Kamu adalah profesor dan pakar akademik perguruan tinggi Indonesia berintelektual tinggi dengan target akurasi 100%. Analisis soal ujian akademik (termasuk soal pedagogi, kurikulum, filsafat pendidikan, dan soal bermuatan kata 'KECUALI' atau 'BUKAN') dengan sangat teliti, kritis, dan tanpa bias distractor. Pilih HANYA SATU opsi jawaban yang 100% benar dan paling tepat. Format output HARUS HANYA HURUF OPSI DAN TEKS JAWABAN SAJA (contoh: "C. Pendekatan kontekstual" atau "A"). JANGAN memberikan penjelasan, pengantar, atau penutup.`;

    const hudModelSelect = this.hudShadow?.getElementById('hud-select-model');
    const selectModel = this.shadow?.getElementById('quiz-select-model');
    const chosenModel = (hudModelSelect && hudModelSelect.value && VALID_MODEL_IDS.includes(hudModelSelect.value))
      ? hudModelSelect.value
      : ((selectModel && selectModel.value && VALID_MODEL_IDS.includes(selectModel.value))
          ? selectModel.value
          : (this.activeModel || DEFAULT_MODEL));

    // Panggil Service Worker
    const response = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({
          action: 'generateGeminiContent',
          prompt,
          systemInstruction,
          model: chosenModel
        }, (res) => {
          if (chrome.runtime?.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(res);
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Gagal memanggil Gemini AI.');
    }

    // Evaluasi jawaban AI dan tentukan opsi terbaik
    const bestOptionIndex = this._determineMatchingOption(response.text, options);
    if (bestOptionIndex === -1) {
      throw new Error('Tidak dapat mencocokkan respon AI dengan opsi kuis.');
    }

    // Pilih opsi jawaban via React native setter & trigger synthetic events
    await this._selectOptionElement(options[bestOptionIndex]);

    // Catat jawaban attempt ini untuk evaluasi Smart Memory pasca kuis
    this._recordCurrentQuestionAnswer(questionText, options[bestOptionIndex].text, options[bestOptionIndex].letter);

    Toast.info(`Menjawab [${options[bestOptionIndex].letter || bestOptionIndex + 1}] via ${response.model || 'Gemini'}`);
    return true;
  }

  _findQuestionContainer() {
    // 1. Prioritaskan card/container utama yang menaungi radio button dan teks soal
    const radio = document.querySelector('input[type="radio"], .MuiRadio-root');
    if (radio) {
      // Cari Paper, Card, atau Form terdekat (TETAPI BUKAN FormControl/fieldset yang hanya membungkus radio)
      const card = radio.closest('.MuiPaper-root, .MuiCard-root, form, [class*="card"], [class*="question"], [class*="soal"]');
      if (card) return card;
    }

    // 2. Kandidat selector container soal kuis
    const candidates = [
      document.querySelector('.question-container'),
      document.querySelector('.soal-container'),
      document.querySelector('form[action*="exam"]'),
      document.querySelector('.MuiPaper-root:has(.MuiRadio-root)'),
      document.querySelector('.MuiPaper-root:has(input[type="radio"])'),
      document.querySelector('.MuiCard-root:has(input[type="radio"])'),
      document.querySelector('main .MuiBox-root:has(.MuiRadio-root)'),
      document.querySelector('main'),
      document.body
    ];
    return candidates.find(c => c && c.querySelector('input[type="radio"], .MuiRadio-root')) || null;
  }

  _parseQuestionAndOptions(container) {
    // 1. Ekstrak teks pertanyaan riil yang spesifik untuk soal tersebut
    let questionText = '';
    const collectedParagraphs = [];

    // Query elemen tipografi dan paragraf (HINDARI generic div/span agar tidak mengambil wrapper besar)
    const textCandidates = Array.from(container.querySelectorAll('.soal-text, .question-text, .MuiTypography-root, p, h1, h2, h3, h4, h5, h6, pre, code, blockquote'));

    for (const el of textCandidates) {
      // Lewati jika berada di dalam pilihan jawaban (label / radio)
      if (el.closest('.MuiFormControlLabel-root, label, .MuiRadio-root, input[type="radio"]')) continue;
      // Lewati jika berada di kontrol ekstensi, HUD, notifikasi, tombol aksi, atau navigasi
      if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host, #mentari-token-mod-host, .mentari-toast-container, button, a, aside, .MuiDrawer-root, [role="navigation"], header, nav')) continue;

      const rawText = (el.textContent || '').trim();
      if (!rawText) continue;

      // Filter jika hanya angka nomor urut (contoh: "1", "2")
      if (/^\d+$/.test(rawText)) continue;

      // Filter jika hanya label nomor (contoh: "Soal 1", "Question 1", "Pertanyaan No. 1:")
      if (/^(soal|pertanyaan|question)(\s+no\.?|\s+nomor)?\s*\d+[\s:\.-]*$/i.test(rawText)) continue;

      // Filter jika teks adalah format timer countdown (contoh: "00:14:59" atau "14:59")
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(rawText)) continue;

      // Filter jika teks adalah header petunjuk umum atau judul kuis di atas soal
      const lower = rawText.toLowerCase();
      if (lower.startsWith('petunjuk pengerjaan') ||
          lower.startsWith('petunjuk umum') ||
          lower.startsWith('sisa waktu') ||
          lower.startsWith('waktu tersisa') ||
          lower === 'pilihlah salah satu jawaban yang paling tepat' ||
          lower === 'pilih salah satu jawaban yang benar') {
        continue;
      }

      // Bersihkan prefix nomor urut seperti "1. ", "Soal 1: ", "1) " jika ada
      const cleanText = rawText.replace(/^(soal|pertanyaan|question)?\s*\d+[\s:\.\)-]+\s*/i, '').trim();
      if (cleanText.length > 3) {
        // Cegah duplikasi teks jika elemen parent dan child keduanya terpilih
        if (!collectedParagraphs.some(p => p.includes(cleanText) || cleanText.includes(p))) {
          collectedParagraphs.push(cleanText);
        }
      }
    }

    questionText = collectedParagraphs.join('\n').trim();

    // Fallback jika tidak ditemukan melalui query tipografi: cari teks kontainer soal sebelum radio group
    if (!questionText) {
      const firstRadio = container.querySelector('input[type="radio"], .MuiRadio-root');
      const radioGroup = firstRadio?.closest('.MuiFormControl-root, .MuiFormGroup-root, [role="radiogroup"]');
      if (radioGroup && radioGroup.previousElementSibling) {
        const prevText = (radioGroup.previousElementSibling.textContent || '').trim();
        const cleanPrev = prevText.replace(/^(soal|pertanyaan|question)?\s*\d+[\s:\.\)-]+\s*/i, '').trim();
        if (cleanPrev.length > 5) questionText = cleanPrev;
      }
    }

    // 2. Ambil opsi pilihan jawaban (Radio items)
    const options = [];
    let radioLabels = Array.from(container.querySelectorAll('.MuiFormControlLabel-root, label'));

    // Fallback jika tidak ditemukan label standar MUI
    if (radioLabels.length === 0) {
      const allRadios = Array.from(container.querySelectorAll('input[type="radio"]'));
      radioLabels = allRadios.map(r => r.closest('label') || r.parentElement || r);
    }

    radioLabels.forEach((labelEl, idx) => {
      const radioInput = labelEl.tagName === 'INPUT' ? labelEl : (labelEl.querySelector('input[type="radio"]') || labelEl);
      const radioRoot = labelEl.querySelector('.MuiRadio-root') || (radioInput.closest ? radioInput.closest('.MuiRadio-root') : null);
      const labelText = (labelEl.textContent || '').trim();
      const letterMatch = labelText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);

      options.push({
        index: idx,
        letter: letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + idx),
        text: letterMatch ? letterMatch[2].trim() : labelText,
        fullText: labelText,
        element: radioInput,
        labelEl: (labelEl.tagName === 'LABEL' || labelEl.classList.contains('MuiFormControlLabel-root')) ? labelEl : null,
        radioRoot
      });
    });

    return { questionText, options };
  }

  _buildPrompt(questionText, options) {
    const formattedOptions = options.map(o => `${o.letter}. ${o.text}`).join('\n');
    return `[SOAL UJIAN AKADEMIK]\n${questionText}\n\n[PILIHAN JAWABAN]\n${formattedOptions}\n\nInstruksi: Analisis dengan cermat dan tentukan SATU jawaban yang paling tepat (akurasi 100%). Format output: HURUF OPSI dan TEKS JAWABAN (contoh: "A. Jakarta" atau "B").\nJawaban:`;
  }

  _determineMatchingOption(aiAnswer, options) {
    if (!aiAnswer || !options || options.length === 0) return 0;

    const raw = aiAnswer.trim();
    // 1. Bersihkan formatting markdown seperti **, *, `, _, dll.
    const cleaned = raw.replace(/[\*`_#\[\]\(\)]/g, ' ').trim();

    // 2. Cari huruf opsi eksplisit (A-E) setelah kata kunci seperti "jawaban", "pilihan", "kunci", atau di awal baris
    // Pola 2a: Huruf di awal baris/string (contoh: "A", "A.", "A. Teks", "A - Teks")
    const leadingLetterMatch = cleaned.match(/^([A-Ea-e])(?:\s*[\.:\)\-]\s*|\s+|$)/i);
    if (leadingLetterMatch) {
      const letter = leadingLetterMatch[1].toUpperCase();
      const idx = options.findIndex(o => o.letter.toUpperCase() === letter);
      if (idx !== -1) return idx;
    }

    // Pola 2b: Kata kunci diikuti huruf (contoh: "Jawaban: B", "Pilihan yang benar: C", "Opsi yang paling tepat adalah D")
    const keywordLetterMatch = cleaned.match(/(?:jawaban|pilihan|opsi|kunci|answer|option)(?:[^\na-e]{0,35})([A-Ea-e])\b/i);
    if (keywordLetterMatch) {
      const letter = keywordLetterMatch[1].toUpperCase();
      const idx = options.findIndex(o => o.letter.toUpperCase() === letter);
      if (idx !== -1) return idx;
    }

    // Pola 2c: Huruf opsi yang berdiri sendiri di baris pertama (HANYA jika baris pertama pendek <= 5 karakter)
    const firstLine = cleaned.split('\n')[0].trim();
    if (firstLine.length <= 5) {
      const isolatedLetterMatch = firstLine.match(/\b([A-Ea-e])\b/i);
      if (isolatedLetterMatch) {
        const letter = isolatedLetterMatch[1].toUpperCase();
        const idx = options.findIndex(o => o.letter.toUpperCase() === letter);
        if (idx !== -1) return idx;
      }
    }

    // 3. Cocokkan berdasarkan kemiripan teks opsi (substring matching)
    const upperCleaned = cleaned.toUpperCase();
    let bestMatchIdx = -1;
    let maxMatchLen = 0;

    options.forEach((opt, idx) => {
      const optText = (opt.text || '').trim().toUpperCase();
      if (optText.length >= 3) {
        if (upperCleaned.includes(optText)) {
          if (optText.length > maxMatchLen) {
            maxMatchLen = optText.length;
            bestMatchIdx = idx;
          }
        }
      }
    });

    if (bestMatchIdx !== -1) return bestMatchIdx;

    // 4. Jika masih belum cocok, periksa fullText
    options.forEach((opt, idx) => {
      const fullText = (opt.fullText || '').trim().toUpperCase();
      if (fullText.length >= 3 && upperCleaned.includes(fullText)) {
        if (fullText.length > maxMatchLen) {
          maxMatchLen = fullText.length;
          bestMatchIdx = idx;
        }
      }
    });

    if (bestMatchIdx !== -1) return bestMatchIdx;

    console.warn('[Mentari AI] Jawaban AI tidak dapat dicocokkan secara pasti:', raw);
    return 0; // Fallback ke opsi pertama jika tidak cocok sama sekali
  }

  // ─── Smart Question Memory & Scoring Gate (100% Score Verification) ────────

  _getCurrentPageNumber() {
    const m = window.location.search.match(/[?&]page=(\d+)/i);
    if (m) return parseInt(m[1], 10);
    const activeNav = this._getExamNavigationStatus()?.questions?.find(q => q.isCurrent);
    return activeNav ? activeNav.num : null;
  }

  _recordCurrentQuestionAnswer(questionText, answerText, optionLetter) {
    if (!questionText) return;
    const pageNum = this._getCurrentPageNumber();
    const cleanQ = questionText.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!Array.isArray(this._currentSessionQuestions)) {
      this._currentSessionQuestions = [];
    }
    const existingIdx = this._currentSessionQuestions.findIndex(q => q.cleanQ === cleanQ || (pageNum && q.pageNum === pageNum));
    const record = {
      cleanQ,
      rawQ: questionText,
      answerText: (answerText || '').trim(),
      optionLetter: (optionLetter || '').trim().toUpperCase(),
      pageNum: pageNum || (existingIdx !== -1 ? this._currentSessionQuestions[existingIdx].pageNum : null),
      timestamp: Date.now()
    };
    if (existingIdx !== -1) {
      this._currentSessionQuestions[existingIdx] = record;
    } else {
      this._currentSessionQuestions.push(record);
    }
  }

  async _lookupSmartQuestionMemory(questionText, options) {
    try {
      if (!questionText || !options || options.length === 0) return null;
      const store = await Storage.get('mentari_smart_question_memory');
      const memory = Array.isArray(store?.mentari_smart_question_memory) ? store.mentari_smart_question_memory : [];
      if (memory.length === 0) return null;

      const cleanQ = questionText.trim().toLowerCase().replace(/\s+/g, ' ');

      // Cari pertanyaan yang cocok (exact atau overlap > 25 karakter)
      const matchedRecord = memory.find(m => {
        if (!m.cleanQ && !m.questionText) return false;
        const memClean = (m.cleanQ || m.questionText).trim().toLowerCase().replace(/\s+/g, ' ');
        if (memClean === cleanQ) return true;
        if (memClean.length > 25 && cleanQ.length > 25) {
          if (memClean.includes(cleanQ) || cleanQ.includes(memClean)) return true;
        }
        return false;
      });

      if (!matchedRecord) return null;

      const targetAns = (matchedRecord.answerText || '').trim().toLowerCase();
      const targetLetter = (matchedRecord.optionLetter || '').trim().toUpperCase();

      // 1. Prioritaskan pencocokan teks pilihan jawaban (urutan A-E bisa teracak di Post-Test)
      if (targetAns.length >= 2) {
        const textMatchIdx = options.findIndex(o => {
          const optText = (o.text || '').trim().toLowerCase();
          return optText === targetAns || (optText.length > 5 && (optText.includes(targetAns) || targetAns.includes(optText)));
        });
        if (textMatchIdx !== -1) {
          console.log(`[Smart Memory] Jawaban ditemukan via pencocokan teks opsi: Opsi ${options[textMatchIdx].letter}`);
          return textMatchIdx;
        }
      }

      // 2. Fallback jika teks identik sulit dicocokkan: gunakan huruf opsi tersimpan
      if (targetLetter) {
        const letterMatchIdx = options.findIndex(o => o.letter.toUpperCase() === targetLetter);
        if (letterMatchIdx !== -1) {
          console.log(`[Smart Memory] Jawaban ditemukan via huruf opsi tersimpan: [${targetLetter}]`);
          return letterMatchIdx;
        }
      }

      return null;
    } catch (e) {
      console.warn('[Smart Memory] Error lookup:', e);
      return null;
    }
  }

  _extractExamScoreAndReview() {
    const result = {
      score: null,
      isPerfect: false,
      wrongQuestions: [],
      correctQuestions: [],
      rawScoreText: ''
    };

    try {
      const pageText = (document.body ? document.body.innerText : '') || '';

      // 1. Ekstrak skor angka dari berbagai pola tampilan LMS (Mentari / Moodle / Next.js)
      const scorePatterns = [
        /(?:nilai|skor|grade|mark|score)(?:\s+akhir)?\s*(?:adalah|:)?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:\/|\s+dari\s+|\s+out of\s+)\s*([0-9]+(?:[\.,][0-9]+)?)/i,
        /(?:nilai|skor|grade)\s*[:=]\s*([0-9]+(?:[\.,][0-9]+)?)\s*%/i,
        /([0-9]+(?:[\.,][0-9]+)?)\s*(?:\/|\s+dari\s+)\s*([0-9]+(?:[\.,][0-9]+)?)\s*\(([0-9]+)%\)/i,
        /(?:nilai|skor)\s*[:=]\s*([0-9]+(?:[\.,][0-9]+)?)/i
      ];

      for (const pat of scorePatterns) {
        const m = pageText.match(pat);
        if (m) {
          result.rawScoreText = m[0];
          const val1 = parseFloat(m[1].replace(',', '.'));
          const val2 = m[2] ? parseFloat(m[2].replace(',', '.')) : null;

          if (val2 && val2 > 0) {
            result.score = Math.round((val1 / val2) * 100);
          } else if (val1 <= 10 && val1 > 0) {
            result.score = Math.round(val1 * 10);
          } else {
            result.score = Math.round(val1);
          }
          break;
        }
      }

      if (result.score !== null) {
        result.isPerfect = (result.score >= 100);
      }

      // 2. Deteksi soal mana saja yang salah / benar di review DOM
      const questionBlocks = Array.from(document.querySelectorAll('.que, .MuiPaper-root:has(.MuiRadio-root), .MuiPaper-root:has(.soal-text), [class*="question-item"]'));
      questionBlocks.forEach((block, idx) => {
        const bText = (block.textContent || '').toLowerCase();
        const qNum = idx + 1;
        const isWrong = bText.includes('jawaban anda salah') ||
                        bText.includes('incorrect') ||
                        bText.includes('poin 0,00') ||
                        bText.includes('0.00/1.00') ||
                        bText.includes('0,00/1,00') ||
                        block.querySelector('.incorrect, .is-incorrect, [class*="wrong"]');

        const isRight = bText.includes('jawaban anda benar') ||
                        bText.includes('correct') ||
                        bText.includes('poin 1,00') ||
                        bText.includes('1.00/1.00') ||
                        bText.includes('1,00/1,00') ||
                        block.querySelector('.correct, .is-correct');

        if (isWrong && !result.wrongQuestions.includes(qNum)) {
          result.wrongQuestions.push(qNum);
        } else if (isRight && !result.correctQuestions.includes(qNum)) {
          result.correctQuestions.push(qNum);
        }
      });

      // 3. Deteksi dari tombol navigasi quiz review
      const navButtons = Array.from(document.querySelectorAll('.qnbutton, [id*="quiznav"], [class*="nav-matrix"] button, aside button'));
      navButtons.forEach((b, idx) => {
        const title = (b.getAttribute('title') || b.getAttribute('aria-label') || '').toLowerCase();
        const cls = (b.className || '').toLowerCase();
        const numMatch = b.textContent.trim().match(/\d+/);
        const qNum = numMatch ? parseInt(numMatch[0], 10) : (idx + 1);
        if (title.includes('salah') || title.includes('incorrect') || cls.includes('incorrect')) {
          if (!result.wrongQuestions.includes(qNum)) result.wrongQuestions.push(qNum);
        } else if (title.includes('benar') || title.includes('correct') || cls.includes('correct')) {
          if (!result.correctQuestions.includes(qNum)) result.correctQuestions.push(qNum);
        }
      });

      if (result.wrongQuestions.length > 0) {
        result.isPerfect = false;
      }
    } catch (e) {
      console.warn('[Smart Memory] Gagal mengekstrak skor review:', e);
    }

    return result;
  }

  async _evaluateAndSaveSmartMemory(sourceContext = 'QUIZ', examTitle = '') {
    try {
      console.log(`[Smart Memory Gate] Memeriksa hasil ujian pasca pengerjaan (${sourceContext})...`);

      // Polling waiter hingga elemen review / nilai muncul di DOM (maksimal 3.5 detik)
      let reviewInfo = this._extractExamScoreAndReview();
      const startWait = Date.now();
      while (Date.now() - startWait < 3500 && reviewInfo.score === null) {
        await Humanizer.delay(400);
        reviewInfo = this._extractExamScoreAndReview();
      }

      console.log('[Smart Memory Gate] Hasil ekstraksi skor:', reviewInfo);

      if (reviewInfo.score !== null) {
        if (reviewInfo.score >= 100 && reviewInfo.wrongQuestions.length === 0) {
          // SYARAT MUTLAK: Hanya simpan jika Skor 100 & tidak ada soal yang salah
          if (this._currentSessionQuestions && this._currentSessionQuestions.length > 0) {
            const store = await Storage.get('mentari_smart_question_memory');
            const memory = Array.isArray(store?.mentari_smart_question_memory) ? store.mentari_smart_question_memory : [];

            let savedCount = 0;
            this._currentSessionQuestions.forEach(q => {
              if (!q.cleanQ || !q.answerText) return;
              const idx = memory.findIndex(m => m.cleanQ === q.cleanQ);
              const memItem = {
                cleanQ: q.cleanQ,
                questionText: q.rawQ,
                answerText: q.answerText,
                optionLetter: q.optionLetter,
                score: 100,
                examTitle: examTitle || document.title,
                timestamp: Date.now()
              };
              if (idx !== -1) {
                memory[idx] = memItem;
              } else {
                memory.push(memItem);
                savedCount++;
              }
            });

            await Storage.set({ mentari_smart_question_memory: memory });
            console.log(`[Smart Memory] Skor 100 Sempurna! Tersimpan ${savedCount} soal baru ke Smart Memory (Total: ${memory.length}).`);
            Toast.success(`Smart Memory: Skor 100 Sempurna! ${this._currentSessionQuestions.length} kunci jawaban tersimpan untuk Post-Test.`);
          }
        } else {
          // SKOR < 100: TOLAK PENYIMPANAN KE SMART MEMORY
          console.warn(`[Smart Memory VETO] Skor kuis: ${reviewInfo.score}/100 (< 100). Penyimpanan ke Smart Memory DITOLAK.`);
          if (reviewInfo.wrongQuestions.length > 0) {
            const wrongListStr = reviewInfo.wrongQuestions.join(', ');
            Toast.warning(`Skor ${reviewInfo.score}/100. Soal No. [${wrongListStr}] salah! Kunci jawaban TIDAK disimpan ke memori.`);
          } else {
            Toast.warning(`Skor ${reviewInfo.score}/100 (< 100). Kunci jawaban TIDAK disimpan ke memori.`);
          }
        }
      } else {
        console.log('[Smart Memory] Skor kuis tidak terdeteksi langsung di DOM saat ini.');
      }
    } catch (e) {
      console.warn('[Smart Memory] Gagal mengevaluasi hasil ujian:', e);
    }
  }

  _updateHUDNavMatrix(navStatus) {
    if (!this.hudShadow) return;
    const summaryEl = this.hudShadow.getElementById('hud-matrix-summary');
    const matrixEl = this.hudShadow.getElementById('hud-nav-matrix');
    if (!matrixEl || !navStatus || !Array.isArray(navStatus.questions)) return;

    const total = navStatus.totalQuestions || navStatus.total || navStatus.questions.length;
    const answered = (navStatus.answeredCount !== undefined) ? navStatus.answeredCount : navStatus.questions.filter(q => q.isAnswered).length;

    if (summaryEl) {
      summaryEl.textContent = `${answered}/${total} Hijau`;
      if (answered >= total && total > 0) {
        summaryEl.style.color = '#34d399';
      } else {
        summaryEl.style.color = '#fbbf24';
      }
    }

    matrixEl.innerHTML = navStatus.questions.map(q => {
      let stateClass = 'unanswered';
      let title = `Soal ${q.num}: Belum Terjawab (Abu-abu)`;
      if (q.isAnswered) {
        stateClass = 'answered';
        title = `Soal ${q.num}: Terjawab (Hijau)`;
      }
      if (q.isCurrent) {
        stateClass += ' current';
        title += ' (Sedang Dibuka)';
      }
      return `<span class="hud-q-pill ${stateClass}" title="${title}">${q.num}</span>`;
    }).join('');
  }

  _makeElementDraggable(element, handle) {
    if (!element || !handle) return;
    handle.style.cursor = 'grab';

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onPointerDown = (e) => {
      // Abaikan jika klik pada elemen interaktif
      if (e.target.closest('button, input, select, a, textarea')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      element.style.position = 'fixed';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.margin = '0';
      element.style.transform = 'none';

      handle.style.cursor = 'grabbing';
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = Math.max(10, window.innerWidth - element.offsetWidth - 10);
      const maxTop = Math.max(10, window.innerHeight - element.offsetHeight - 10);

      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handle.style.cursor = 'grab';
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {}
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  }
}

if (typeof window !== 'undefined') {
  new QuizAssistant();
}