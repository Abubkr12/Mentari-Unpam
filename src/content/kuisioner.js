/**
 * Mentari Mod Modern Edition - Auto Kuisioner Evaluasi
 * Mengisi evaluasi dosen & mata kuliah secara otomatis dengan 3 mode:
 * 1. Auto Iya (Positif / Sangat Baik / Ya)
 * 2. Auto Tidak (Opsi Tidak / Obyektif)
 * 3. Auto Response AI (Gemini AI untuk analisis konteks & feedback reflektif)
 * 100% Bebas dari bug fatal CSS :contains(), aman, dan humanized.
 */

import { DOM } from '../utils/dom.js';
import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';
import { Storage } from '../utils/storage.js';

class KuisionerAssistant {
  constructor() {
    this.isProcessing = false;
    this.shadow = null;
    this._init();
  }

  _init() {
    console.log('[Mentari Mod] Kuisioner Assistant siap.');
    this._injectFloatingCard();
    this._checkAndInitAutoPilot();
  }

  _injectFloatingCard() {
    if (document.getElementById('mentari-kuisioner-card-host')) return;

    const host = document.createElement('div');
    host.id = 'mentari-kuisioner-card-host';
    host.style.position = 'fixed';
    host.style.bottom = '24px';
    host.style.right = '24px';
    host.style.zIndex = '2147483640';

    this.shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(16, 185, 129, 0.35);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(16, 185, 129, 0.65);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(16, 185, 129, 0.35) transparent;
      }

      .kues-card {
        background: rgba(18, 18, 22, 0.96);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(16, 185, 129, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 270px;
      }
      .kues-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .kues-title {
        font-size: 13px;
        font-weight: 700;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .status-text {
        font-size: 11px;
        color: #aaa;
        line-height: 1.3;
      }
      .actions-grid {
        display: flex;
        gap: 6px;
      }
      .btn-mode {
        flex: 1;
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        white-space: nowrap;
      }
      .btn-mode:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }
      .btn-iya {
        background: #10b981;
        color: #fff;
      }
      .btn-iya:hover:not(:disabled) {
        background: #059669;
        transform: translateY(-1px);
      }
      .btn-tidak {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.35);
      }
      .btn-tidak:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.35);
        transform: translateY(-1px);
      }
      .btn-ai {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
        border: 1px solid rgba(212, 175, 55, 0.4);
      }
      .btn-ai:hover:not(:disabled) {
        background: rgba(212, 175, 55, 0.35);
        transform: translateY(-1px);
      }
    `;

    const card = document.createElement('div');
    card.className = 'kues-card';
    card.innerHTML = `
      <div class="kues-header">
        <div class="kues-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          Mentari Kuisioner
        </div>
      </div>
      <div class="status-text" id="kues-status">Pilih mode pengisian otomatis:</div>
      <div class="actions-grid">
        <button class="btn-mode btn-iya" id="btn-auto-iya" type="button" title="Pilih opsi Ya / Rating Terbaik">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Auto Iya
        </button>
        <button class="btn-mode btn-tidak" id="btn-auto-tidak" type="button" title="Pilih opsi Tidak / Nilai Minim">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Auto Tidak
        </button>
        <button class="btn-mode btn-ai" id="btn-auto-ai" type="button" title="Gunakan Gemini AI untuk menjawab secara cerdas">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Auto AI
        </button>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(card);
    document.body.appendChild(host);

    const btnIya = this.shadow.getElementById('btn-auto-iya');
    const btnTidak = this.shadow.getElementById('btn-auto-tidak');
    const btnAI = this.shadow.getElementById('btn-auto-ai');
    const statusText = this.shadow.getElementById('kues-status');

    const setButtonsDisabled = (disabled) => {
      btnIya.disabled = disabled;
      btnTidak.disabled = disabled;
      btnAI.disabled = disabled;
    };

    btnIya.addEventListener('click', async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      setButtonsDisabled(true);
      statusText.textContent = 'Mengisi opsi "Ya / Sangat Baik"...';

      try {
        await this.fillKuisioner('iya');
        statusText.textContent = 'Selesai diisi dengan opsi Ya!';
        Toast.success('Kuisioner berhasil diisi (Mode Auto Iya)!');
      } catch (e) {
        statusText.textContent = 'Gagal: ' + e.message;
        Toast.error('Gagal mengisi: ' + e.message);
      } finally {
        this.isProcessing = false;
        setButtonsDisabled(false);
      }
    });

    btnTidak.addEventListener('click', async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      setButtonsDisabled(true);
      statusText.textContent = 'Mengisi opsi "Tidak"...';

      try {
        await this.fillKuisioner('tidak');
        statusText.textContent = 'Selesai diisi dengan opsi Tidak.';
        Toast.info('Kuisioner berhasil diisi (Mode Auto Tidak).');
      } catch (e) {
        statusText.textContent = 'Gagal: ' + e.message;
        Toast.error('Gagal mengisi: ' + e.message);
      } finally {
        this.isProcessing = false;
        setButtonsDisabled(false);
      }
    });

    btnAI.addEventListener('click', async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      setButtonsDisabled(true);
      statusText.textContent = 'Gemini AI sedang menganalisis kuesioner...';

      try {
        await this.fillKuisioner('ai');
        statusText.textContent = 'Selesai dianalisis & diisi AI!';
        Toast.success('Kuisioner berhasil diisi cerdas oleh Gemini AI!');
      } catch (e) {
        statusText.textContent = 'Gagal: ' + e.message;
        Toast.error('Gagal mengisi via AI: ' + e.message);
      } finally {
        this.isProcessing = false;
        setButtonsDisabled(false);
      }
    });
  }

  /**
   * Eksekusi pengisian kuesioner sesuai mode
   * @param {'iya' | 'tidak' | 'ai'} mode
   */
  async fillKuisioner(mode) {
    const radioGroups = document.querySelectorAll('[role="radiogroup"], tr, .MuiFormGroup-root');
    let filledCount = 0;

    // Kumpulkan grup radio yang ada
    const validGroups = [];
    for (const group of radioGroups) {
      const radios = group.querySelectorAll('input[type="radio"], .MuiRadio-root');
      if (radios.length > 0) {
        validGroups.push({ groupEl: group, radios: Array.from(radios) });
      }
    }

    // Jika tidak ditemukan via container grup, kumpulkan berdasarkan atribut 'name'
    if (validGroups.length === 0) {
      const allRadios = document.querySelectorAll('input[type="radio"]');
      const byName = {};
      allRadios.forEach(r => {
        const name = r.name || 'default';
        if (!byName[name]) byName[name] = [];
        byName[name].push(r);
      });
      for (const name in byName) {
        validGroups.push({ groupEl: null, radios: byName[name] });
      }
    }

    for (const item of validGroups) {
      const radios = item.radios;
      let targetRadio = null;

      if (mode === 'iya') {
        // Cari opsi berlabel "Ya", "Setuju", "Sangat Baik" atau opsi terakhir/pertama
        targetRadio = this._findOptionByKeywords(radios, ['ya', 'setuju', 'sangat baik', 'baik', 'benar', 'positif'])
          || radios[radios.length - 1]; // default ke radio bernilai paling tinggi
      } else if (mode === 'tidak') {
        // Cari opsi berlabel "Tidak", "Kurang", "Salah" atau opsi pertama
        targetRadio = this._findOptionByKeywords(radios, ['tidak', 'kurang', 'salah', 'buruk', 'negatif'])
          || radios[0]; // default ke radio pertama
      } else if (mode === 'ai') {
        // Analisis teks pertanyaan di baris/grup tersebut
        const questionText = item.groupEl ? (item.groupEl.textContent || '').trim().replace(/\s+/g, ' ') : '';
        if (questionText.length > 5) {
          // Tanya Gemini mana opsi yang paling tepat
          const optionsText = radios.map((r, idx) => {
            const label = r.closest('label')?.textContent?.trim() || r.value || `Opsi ${idx + 1}`;
            return `${idx}: ${label}`;
          }).join(', ');

          try {
            const prompt = `Dalam kuesioner evaluasi perkuliahan: "${questionText}". Opsi: [${optionsText}]. Pilih indeks opsi paling konstruktif dan positif. Jawab HANYA angka indeks saja (contoh: 0 atau 1).`;
            const res = await new Promise(resolve => {
              chrome.runtime.sendMessage({
                action: 'generateGeminiContent',
                prompt,
                systemInstruction: 'Jawab HANYA satu angka indeks opsi pilihan.'
              }, resolve);
            });

            if (res && res.success && res.text) {
              const match = res.text.match(/\d+/);
              if (match) {
                const idx = parseInt(match[0], 10);
                if (idx >= 0 && idx < radios.length) {
                  targetRadio = radios[idx];
                }
              }
            }
          } catch {}
        }
        if (!targetRadio) {
          targetRadio = radios[radios.length - 1]; // fallback ke positif
        }
      }

      if (targetRadio) {
        const inputEl = targetRadio.querySelector?.('input[type="radio"]') || targetRadio;
        if (!inputEl.checked) {
          await Humanizer.naturalClick(inputEl);
          filledCount++;
          await Humanizer.randomDelay(150, 320);
        }
      }
    }

    // Tangani textarea / input feedback saran
    await this._fillFeedbackTextarea(mode);

    if (filledCount === 0) {
      throw new Error('Tidak ditemukan butir kuesioner pada halaman ini.');
    }
  }

  _findOptionByKeywords(radios, keywords) {
    for (const r of radios) {
      const label = (r.closest('label')?.textContent || r.value || '').toLowerCase();
      if (keywords.some(kw => label.includes(kw))) {
        return r;
      }
    }
    return null;
  }

  async _fillFeedbackTextarea(mode) {
    const textareas = document.querySelectorAll('textarea, input[type="text"]:not([readonly])');
    if (textareas.length === 0) return;

    const positiveFeedbacks = [
      'Pembelajaran sangat interaktif dan materi disampaikan dengan sangat jelas.',
      'Dosen sangat menguasai materi perkuliahan dan responsif terhadap mahasiswa.',
      'Penjelasan materi mudah dipahami, sistematis, dan tepat waktu.',
      'Materi perkuliahan yang diberikan sangat relevan dan bermanfaat untuk masa depan.'
    ];

    const criticalFeedbacks = [
      'Perlu peningkatan dalam kejelasan materi dan alokasi waktu diskusi.',
      'Mohon materi pengantar dapat diberikan lebih awal sebelum perkuliahan dimulai.',
      'Diharapkan forum tanya jawab dapat ditanggapi lebih cepat.',
      'Perlu penambahan contoh studi kasus praktis pada setiap pertemuan.'
    ];

    for (const ta of textareas) {
      if (!ta.value.trim()) {
        let text = '';
        if (mode === 'iya') {
          text = positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)];
        } else if (mode === 'tidak') {
          text = criticalFeedbacks[Math.floor(Math.random() * criticalFeedbacks.length)];
        } else if (mode === 'ai') {
          try {
            const res = await new Promise(resolve => {
              chrome.runtime.sendMessage({
                action: 'generateGeminiContent',
                prompt: 'Tulis satu kalimat singkat kesan dan saran positif konstruktif untuk dosen pengampu mata kuliah perkuliahan UNPAM. Maksimal 15 kata, bahasa santun.',
                systemInstruction: 'Tulis satu kalimat saja tanpa tanda petik.'
              }, resolve);
            });
            if (res && res.success && res.text) {
              text = res.text.trim();
            }
          } catch {}
          if (!text) text = positiveFeedbacks[0];
        }

        ta.value = text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  // ─── Auto-Pilot Kuesioner Runner ──────────────────────────────────────────────

  async _checkAndInitAutoPilot() {
    try {
      const store = await Storage.get('mentari_auto_pilot_state');
      const state = store?.mentari_auto_pilot_state;

      if (!state || !state.active || !Array.isArray(state.queue)) {
        return;
      }

      if (state.currentIndex >= state.queue.length) {
        await Storage.set({
          mentari_auto_pilot_state: { ...state, active: false, finished: true }
        });
        Toast.success('Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!');
        return;
      }

      const currentItem = state.queue[state.currentIndex];
      if (!currentItem) return;

      // URL Alignment Guard
      const urlMatch = window.location.pathname.match(/\/kuesioner\/([^\/\?]+)/);
      const currentUrlKuesId = urlMatch ? urlMatch[1] : null;

      if (currentUrlKuesId && currentItem.id && currentUrlKuesId !== currentItem.id) {
        console.warn(`[Auto-Pilot Guard] ID kuesioner aktif (${currentUrlKuesId}) tidak cocok dengan antrean (${currentItem.id}). Redirect ke item yang benar...`);
        window.location.replace(currentItem.url);
        return;
      }

      // Jika item saat ini bukan kuesioner (misal kuis exam), redirect ke URL kuis
      if (currentItem.type !== 'KUESIONER' && currentItem.url) {
        window.location.replace(currentItem.url);
        return;
      }

      console.log(`[Auto-Pilot] Memulai Kuesioner ${state.currentIndex + 1}/${state.queue.length}:`, currentItem);
      this._executeAutoPilotKuesioner(state, currentItem);
    } catch (e) {
      console.error('[Auto-Pilot Kuesioner Error]', e);
    }
  }

  async _executeAutoPilotKuesioner(state, currentItem) {
    const statusText = this.shadow?.getElementById('kues-status');
    const titleEl = this.shadow?.querySelector('.kues-title');
    if (titleEl) {
      titleEl.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        Auto-Pilot (${state.currentIndex + 1}/${state.queue.length})
      `;
    }
    if (statusText) {
      statusText.textContent = `Mengisi kuesioner otomatis: ${currentItem.sectionName || ''} (${currentItem.courseTitle || ''})...`;
    }

    // Berikan jeda sejenak agar DOM form kuesioner siap
    await Humanizer.randomDelay(1200, 1800);

    try {
      // 1. Isi kuesioner dengan mode 'iya' (jawaban positif objektif standar)
      await this.fillKuisioner('iya');
      if (statusText) statusText.textContent = 'Kuesioner terisi. Mengirim jawaban...';

      await Humanizer.randomDelay(800, 1400);

      // 2. Temukan tombol Simpan / Kirim Kuesioner
      const submitBtn = this._findSubmitButton();
      if (submitBtn) {
        await Humanizer.naturalClick(submitBtn);
        // Konfirmasi modal dialog MUI jika muncul konfirmasi
        await this._confirmDialogIfPresent();
      }

      await Humanizer.randomDelay(1200, 2000);

      // 3. Update status antrean
      state.currentIndex++;
      await Storage.set({ mentari_auto_pilot_state: state });

      // 4. Cooldown antar item
      const cooldown = state.cooldownSec || 15;
      for (let s = cooldown; s > 0; s--) {
        const curStore = await Storage.get('mentari_auto_pilot_state');
        if (!curStore?.mentari_auto_pilot_state?.active) {
          if (statusText) statusText.textContent = 'Auto-Pilot dibatalkan.';
          return;
        }
        if (statusText) {
          statusText.textContent = `Kuesioner selesai! Istirahat ${s} detik sebelum lanjut...`;
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      // 5. Lanjut ke item berikutnya
      if (state.currentIndex < state.queue.length) {
        const nextItem = state.queue[state.currentIndex];
        if (statusText) statusText.textContent = `Menuju ke: ${nextItem.name || nextItem.sectionName}...`;
        setTimeout(() => {
          window.location.replace(nextItem.url);
        }, 500);
      } else {
        // Selesai seluruh antrean
        state.active = false;
        state.finished = true;
        await Storage.set({ mentari_auto_pilot_state: state });
        if (statusText) statusText.textContent = 'Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!';
        Toast.success('Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!');
      }
    } catch (err) {
      console.error('[Auto-Pilot Kuesioner Execution Failed]', err);
      if (statusText) statusText.textContent = `Peringatan: ${err.message}. Mencoba lanjut...`;
      Toast.warning(`Kuesioner: ${err.message}`);

      // Tetap lanjutkan antrean agar tidak stuck permanen
      state.currentIndex++;
      await Storage.set({ mentari_auto_pilot_state: state });
      setTimeout(() => {
        if (state.currentIndex < state.queue.length) {
          window.location.replace(state.queue[state.currentIndex].url);
        }
      }, 3000);
    }
  }

  _findSubmitButton() {
    const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], .MuiButton-root'));
    const submitKeywords = ['simpan', 'kirim', 'submit', 'selesai', 'kirim kuesioner', 'kirim kuisioner'];

    for (const btn of candidates) {
      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      if (submitKeywords.some(kw => text.includes(kw))) {
        return btn;
      }
    }
    return null;
  }

  async _confirmDialogIfPresent() {
    await Humanizer.randomDelay(600, 1000);
    const dialogs = document.querySelectorAll('[role="dialog"], .MuiDialog-root, .swal2-popup, .MuiModal-root');
    for (const d of dialogs) {
      const buttons = d.querySelectorAll('button, .MuiButton-root');
      const confirmKeywords = ['ya', 'setuju', 'kirim', 'simpan', 'lanjutkan', 'ok', 'yes', 'benar'];
      for (const b of buttons) {
        const text = (b.textContent || '').trim().toLowerCase();
        if (confirmKeywords.some(kw => text === kw || text.startsWith(kw))) {
          await Humanizer.naturalClick(b);
          return true;
        }
      }
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  new KuisionerAssistant();
}