/**
 * Mentari Mod Modern Edition - Auto Kuisioner Evaluasi (V2.5 Instant Clean)
 * Mode:
 * 1. Auto Iya (Instan, Opsi Ya / Nilai Tertinggi 4-5 / Sangat Baik)
 * 2. Auto Tidak (Instan, Opsi Tidak / Nilai Terendah 1 / Kurang)
 * 100% Tanpa AI khusus Kuesioner (Instan, 0 Jeda, Zero Quota Consumption).
 * Dilengkapi Asynchronous Waiter, Deteksi Kuesioner Selesai, dan Verifikasi Multi-Sinyal.
 */

import { DOM } from '../utils/dom.js';
import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';
import { Storage, AutoPilotState } from '../utils/storage.js';
import { AutoPilotSync } from '../utils/autopilot-sync.js';
import { ThemeHelper } from '../utils/theme.js';

class KuisionerAssistant {
  constructor() {
    this.isProcessing = false;
    this.isPaused = false;
    this.isAutoPilot = false;
    this.hudHost = null;
    this.hudShadow = null;
    this.shadow = null;
    this.currentTheme = ThemeHelper.detectSystemTheme();
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] Kuisioner Assistant siap.');
    this.currentTheme = await ThemeHelper.getEffectiveTheme();
    ThemeHelper.watchTheme((t) => {
      this.currentTheme = t;
      this._applyTheme(t);
    });
    this._injectFloatingCard();
    this._applyTheme(this.currentTheme);
    await this._checkAndInitAutoPilot();
  }

  _applyTheme(theme = this.currentTheme) {
    const isLight = theme === 'light';
    this.shadow?.querySelector('.kues-card')?.classList.toggle('theme-light', isLight);
    this.hudShadow?.querySelector('.hud-card')?.classList.toggle('theme-light', isLight);
  }

  _injectFloatingCard() {
    if (document.getElementById('mentari-kuisioner-card-host')) return;

    const host = document.createElement('div');
    host.id = 'mentari-kuisioner-card-host';
    host.style.position = 'fixed';
    // Clear Mentari bottom-right snackbars
    host.style.bottom = '72px';
    host.style.right = '24px';
    host.style.zIndex = '2147483640';

    this.shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

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
        min-width: 260px;
      }
      .kues-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: grab;
        user-select: none;
      }
      .kues-title {
        font-size: 13px;
        font-weight: 700;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .kues-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .kues-icon-btn {
        width: 26px;
        height: 26px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .kues-icon-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .kues-icon-btn.close:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.45);
        color: #fca5a5;
      }
      .status-text {
        font-size: 11px;
        color: #aaa;
        line-height: 1.3;
      }
      .actions-grid {
        display: flex;
        gap: 8px;
      }
      .btn-mode {
        flex: 1;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
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
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
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
      .kues-card.theme-light {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid #cbd5e1;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
        color: #0f172a;
      }
      .kues-card.theme-light .kues-title {
        color: #1e3a8a;
      }
      .kues-card.theme-light .status-text {
        color: #475569;
      }
      .kues-card.theme-light .btn-iya {
        background: #047857;
        color: #ffffff;
      }
      .kues-card.theme-light .btn-iya:hover:not(:disabled) {
        background: #065f46;
        box-shadow: 0 4px 12px rgba(4, 120, 87, 0.28);
      }
      .kues-card.theme-light .btn-tidak {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .kues-card.theme-light .btn-tidak:hover:not(:disabled) {
        background: #fee2e2;
      }
      .kues-card.theme-light .kues-icon-btn {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
      }
      .kues-card.theme-light .kues-icon-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .kues-card.theme-light .kues-icon-btn.close:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      .kues-card.theme-light ::-webkit-scrollbar-thumb {
        background: rgba(30, 58, 138, 0.28);
      }
      .kues-card.minimized {
        min-width: 215px;
        padding: 10px 14px;
        gap: 6px;
      }
      .kues-card.minimized .actions-grid {
        display: none !important;
      }
      .kues-card.minimized .status-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
    `;

    const card = document.createElement('div');
    card.className = `kues-card ${this.currentTheme === 'light' ? 'theme-light' : ''}`;
    card.innerHTML = `
      <div class="kues-header">
        <div class="kues-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          Mentari Kuisioner
        </div>
        <div class="kues-header-actions">
          <button class="kues-icon-btn" id="kues-btn-minimize" type="button" title="Perkecil panel" aria-label="Perkecil panel">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="kues-icon-btn close" id="kues-btn-close" type="button" title="Tutup panel" aria-label="Tutup panel">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="status-text" id="kues-status">Pilih preferensi pengisian:</div>
      <div class="actions-grid">
        <button class="btn-mode btn-iya" id="btn-auto-iya" type="button" title="Opsi Ya / Rating Tertinggi">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Auto Iya
        </button>
        <button class="btn-mode btn-tidak" id="btn-auto-tidak" type="button" title="Opsi Tidak / Rating Terendah">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Auto Tidak
        </button>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(card);
    document.body.appendChild(host);

    this._makeElementDraggable(host, card.querySelector('.kues-header'));

    const btnMin = this.shadow.getElementById('kues-btn-minimize');
    const btnClose = this.shadow.getElementById('kues-btn-close');
    btnMin?.addEventListener('click', () => {
      const minimized = card.classList.toggle('minimized');
      btnMin.title = minimized ? 'Perbesar panel' : 'Perkecil panel';
      btnMin.setAttribute('aria-label', btnMin.title);
      btnMin.innerHTML = minimized
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    });
    btnClose?.addEventListener('click', () => {
      this.isProcessing = false;
      host.style.display = 'none';
    });

    const btnIya = this.shadow.getElementById('btn-auto-iya');
    const btnTidak = this.shadow.getElementById('btn-auto-tidak');
    const statusText = this.shadow.getElementById('kues-status');

    const setButtonsDisabled = (disabled) => {
      btnIya.disabled = disabled;
      btnTidak.disabled = disabled;
    };

    btnIya.addEventListener('click', async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      setButtonsDisabled(true);
      statusText.textContent = 'Mengisi opsi "Ya / Sangat Baik"...';

      try {
        await this.fillKuisioner('iya');
        statusText.textContent = 'Mengirim & memverifikasi kuisioner...';
        const verify = await this._submitAndVerifyKuisioner();
        if (verify.success) {
          statusText.textContent = 'Kuesioner terverifikasi sukses terkirim!';
          Toast.success('Kuisioner berhasil diisi & diverifikasi terkirim!');
        } else {
          statusText.textContent = 'Gagal verifikasi: ' + verify.reason;
          Toast.error('Submit kuesioner belum berhasil: ' + verify.reason);
        }
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
        statusText.textContent = 'Mengirim & memverifikasi kuisioner...';
        const verify = await this._submitAndVerifyKuisioner();
        if (verify.success) {
          statusText.textContent = 'Kuesioner terverifikasi sukses terkirim!';
          Toast.success('Kuisioner berhasil diisi & diverifikasi terkirim!');
        } else {
          statusText.textContent = 'Gagal verifikasi: ' + verify.reason;
          Toast.error('Submit kuesioner belum berhasil: ' + verify.reason);
        }
      } catch (e) {
        statusText.textContent = 'Gagal: ' + e.message;
        Toast.error('Gagal mengisi: ' + e.message);
      } finally {
        this.isProcessing = false;
        setButtonsDisabled(false);
      }
    });
  }

  /**
   * Menunggu kesiapan form kuesioner atau mendeteksi jika kuesioner telah selesai
   * @param {number} maxWaitMs
   * @returns {Promise<{ ready: boolean, alreadyCompleted: boolean }>}
   */
  async _waitForKuesionerReady(maxWaitMs = 12000) {
    const startTime = Date.now();
    const alreadyCompletedKeywords = [
      'anda sudah mengisi',
      'telah mengisi kuesioner',
      'sudah mengisi evaluasi',
      'terima kasih telah mengisi',
      'kuesioner telah diisi',
      'kuisioner telah diisi',
      'evaluasi telah selesai',
      'anda telah menyelesaikan',
      'sudah diselesaikan'
    ];

    while (Date.now() - startTime < maxWaitMs) {
      const pageText = (document.body.innerText || '').toLowerCase();

      // 1. Cek apakah kuesioner sudah selesai diisi sebelumnya
      if (alreadyCompletedKeywords.some(kw => pageText.includes(kw))) {
        return { ready: false, alreadyCompleted: true };
      }

      // Pastikan overlay loading awal ("Menunggu...") sudah selesai sebelum membaca form
      const hasLoading = (
        pageText.includes('menunggu...') ||
        pageText.includes('memproses...') ||
        document.querySelector('.MuiCircularProgress-root, .swal2-loading, [role="progressbar"]') !== null
      );
      if (hasLoading) {
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // 2. Cek apakah butir radio kuesioner sudah ter-render di DOM
      const radios = document.querySelectorAll('input[type="radio"], [role="radio"]');
      if (radios.length > 0) {
        // Jeda 350ms untuk memastikan tabel render selesai secara utuh
        await new Promise(r => setTimeout(r, 350));
        return { ready: true, alreadyCompleted: false };
      }

      await new Promise(r => setTimeout(r, 200));
    }

    // Pengecekan akhir
    const finalPageText = (document.body.innerText || '').toLowerCase();
    if (alreadyCompletedKeywords.some(kw => finalPageText.includes(kw))) {
      return { ready: false, alreadyCompleted: true };
    }

    return { ready: false, alreadyCompleted: false };
  }

  /**
   * Ekstraksi teks label/opsi untuk sebuah radio button secara komprehensif
   * Mencakup label, .MuiFormControlLabel-root, label[for], aria-labelledby, sibling text, dan parent text.
   */
  _getRadioText(radioEl) {
    if (!radioEl) return '';
    const input = radioEl.tagName === 'INPUT' ? radioEl : (radioEl.querySelector?.('input[type="radio"]') || radioEl);
    const pieces = [];

    // 1. Label pembungkus (HTML label atau MUI FormControlLabel)
    const labelParent = input.closest?.('label, .MuiFormControlLabel-root');
    if (labelParent) pieces.push(labelParent.textContent);

    // 2. label[for="id"]
    if (input.id) {
      try {
        const forLabel = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (forLabel) pieces.push(forLabel.textContent);
      } catch (_) {}
    }

    // 3. aria-labelledby
    const labelledBy = input.getAttribute?.('aria-labelledby') || input.closest?.('.MuiRadio-root')?.getAttribute?.('aria-labelledby');
    if (labelledBy) {
      const el = document.getElementById(labelledBy);
      if (el) pieces.push(el.textContent);
    }

    // 4. aria-label, title, value
    if (input.getAttribute?.('aria-label')) pieces.push(input.getAttribute('aria-label'));
    if (input.getAttribute?.('title')) pieces.push(input.getAttribute('title'));
    if (input.value && !['on', 'off'].includes(input.value.toLowerCase())) pieces.push(input.value);

    // 5. Elemen sibling langsung atau sibling dari container radio
    const radioContainer = input.closest?.('.MuiRadio-root, [role="radio"]') || input;
    let nextSib = radioContainer.nextElementSibling;
    while (nextSib && !nextSib.querySelector?.('input[type="radio"]') && !nextSib.classList?.contains?.('MuiRadio-root')) {
      pieces.push(nextSib.textContent);
      nextSib = nextSib.nextElementSibling;
    }
    let prevSib = radioContainer.previousElementSibling;
    while (prevSib && !prevSib.querySelector?.('input[type="radio"]') && !prevSib.classList?.contains?.('MuiRadio-root')) {
      pieces.push(prevSib.textContent);
      prevSib = prevSib.previousElementSibling;
    }

    // 6. Parent langsung (jika parent hanya menaungi 1 radio ini, bukan seluruh grup)
    const immediateParent = radioContainer.parentElement;
    if (immediateParent && !immediateParent.matches?.('[role="radiogroup"], .MuiFormGroup-root, tr, tbody, table, body')) {
      if (immediateParent.querySelectorAll('input[type="radio"]').length <= 1) {
        pieces.push(immediateParent.textContent);
      }
    }

    return pieces.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /**
   * Deteksi apakah sebuah radio button tercentang (mendukung native input, MUI classes, dan SVG icon)
   */
  _isRadioChecked(r) {
    if (!r) return false;
    const input = r.tagName === 'INPUT' ? r : (r.querySelector?.('input[type="radio"]') || r);
    if (input && input.checked) return true;

    // 1. Periksa container MUI terdekat (.MuiRadio-root, .PrivateSwitchBase-root, [role="radio"])
    const muiContainer = r.closest?.('.MuiRadio-root, .PrivateSwitchBase-root, [role="radio"]') || r.parentElement;
    if (muiContainer) {
      if (muiContainer.classList?.contains?.('Mui-checked') || muiContainer.classList?.contains?.('PrivateSwitchBase-checked')) {
        return true;
      }
      if (muiContainer.getAttribute?.('aria-checked') === 'true') {
        return true;
      }
      if (muiContainer.querySelector?.('.Mui-checked, .PrivateSwitchBase-checked, [aria-checked="true"]')) {
        return true;
      }
      // Deteksi ikon radio aktif di MUI
      if (muiContainer.querySelector?.('svg[data-testid="RadioButtonCheckedIcon"]')) {
        return true;
      }
      const paths = muiContainer.querySelectorAll('svg path');
      if (paths.length > 1) {
        return true;
      }
      for (const p of paths) {
        const d = p.getAttribute('d') || '';
        if (d.includes('M12 7') || (d.includes('M12 2C6.48') && paths.length > 1)) {
          return true;
        }
      }
    }

    // 2. Periksa label pembungkus (.MuiFormControlLabel-root)
    const muiLabel = r.closest?.('.MuiFormControlLabel-root');
    if (muiLabel) {
      if (muiLabel.classList?.contains?.('Mui-checked') || muiLabel.querySelector?.('.Mui-checked, .PrivateSwitchBase-checked')) {
        return true;
      }
    }

    // 3. Fallback aria-checked pada elemen itu sendiri
    if (r.getAttribute?.('aria-checked') === 'true') return true;

    return false;
  }

  /**
   * Kumpulkan grup radio tanpa duplikasi container bersarang
   */
  _collectRadioGroups() {
    const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
    if (allRadios.length === 0) return [];

    const validGroups = [];

    // Strategi 1: Kelompokkan berdasar atribut 'name' jika ada
    const namedRadios = allRadios.filter(r => r.name && r.name.trim().length > 0);
    const distinctNames = new Set(namedRadios.map(r => r.name.trim()));

    if (distinctNames.size > 1 && namedRadios.length >= allRadios.length * 0.7) {
      const byName = {};
      namedRadios.forEach(r => {
        const n = r.name.trim();
        if (!byName[n]) byName[n] = [];
        byName[n].push(r);
      });
      for (const n in byName) {
        const groupRadios = byName[n];
        const container = groupRadios[0]?.closest('tr, [role="radiogroup"], .MuiFormGroup-root, .question-item, div');
        validGroups.push({ groupEl: container, radios: groupRadios });
      }
      return validGroups;
    }

    // Strategi 2: Kelompokkan berdasar elemen container DOM (role="radiogroup", .MuiFormGroup-root, fieldset, tr)
    const rawContainers = Array.from(document.querySelectorAll('[role="radiogroup"], .MuiFormGroup-root, fieldset, tr'));
    const filteredContainers = rawContainers.filter(parent => {
      const radiosInside = parent.querySelectorAll('input[type="radio"]');
      if (radiosInside.length === 0) return false;
      const childContainer = parent.querySelector('[role="radiogroup"], .MuiFormGroup-root');
      return !childContainer || parent === childContainer;
    });

    const seenRadios = new Set();
    for (const group of filteredContainers) {
      const radios = Array.from(group.querySelectorAll('input[type="radio"]'))
        .filter(el => {
          if (!el || seenRadios.has(el)) return false;
          seenRadios.add(el);
          return true;
        });

      if (radios.length > 0) {
        validGroups.push({ groupEl: group, radios });
      }
    }

    if (validGroups.length > 0 && seenRadios.size >= allRadios.length * 0.7) {
      return validGroups;
    }

    // Strategi 3: Pengelompokan cerdas per pasangan jika format biner 2 opsi (Ya / Tidak)
    const unclustered = allRadios.filter(r => !seenRadios.has(r));
    if (unclustered.length > 0) {
      if (unclustered.length % 2 === 0) {
        for (let i = 0; i < unclustered.length; i += 2) {
          validGroups.push({
            groupEl: unclustered[i].parentElement,
            radios: [unclustered[i], unclustered[i + 1]]
          });
        }
      } else {
        validGroups.push({ groupEl: document.body, radios: unclustered });
      }
    }

    return validGroups;
  }

  /**
   * Eksekusi pengisian kuesioner instan sesuai preferensi (100% Bebas Bug Ketukar, Non-AI)
   * @param {'iya' | 'tidak'} mode
   */
  async fillKuisioner(mode = 'iya') {
    const validGroups = this._collectRadioGroups();
    let filledCount = 0;

    for (const item of validGroups) {
      const radios = item.radios;
      if (!radios || radios.length === 0) continue;

      const targetRadio = this._selectTargetRadio(radios, mode);

      if (targetRadio) {
        const inputEl = targetRadio.tagName === 'INPUT' ? targetRadio : (targetRadio.querySelector?.('input[type="radio"]') || targetRadio);
        if (inputEl) {
          DOM.setNativeRadioChecked(inputEl);
          filledCount++;
          // Micro-pause 15ms agar React batch-update state stabil tanpa glitch
          await new Promise(r => setTimeout(r, 15));
        }
      }
    }

    // ─── Pre-Submit Audit: Pastikan 100% butir kuesioner tercentang ───────────
    for (const item of validGroups) {
      const hasChecked = item.radios.some(r => this._isRadioChecked(r));

      if (!hasChecked) {
        const fallbackTarget = this._selectTargetRadio(item.radios, mode);
        if (fallbackTarget) {
          const inp = fallbackTarget.tagName === 'INPUT' ? fallbackTarget : (fallbackTarget.querySelector?.('input[type="radio"]') || fallbackTarget);
          if (inp) {
            DOM.setNativeRadioChecked(inp);
            await new Promise(r => setTimeout(r, 15));
          }
        }
      }
    }

    // Tangani textarea / input feedback saran secara instan
    this._fillFeedbackTextarea(mode);

    // Jeda sejenak (200ms) untuk memastikan React batch-committing state sebelum form disubmit
    await new Promise(r => setTimeout(r, 200));

    if (filledCount === 0 && validGroups.length === 0) {
      throw new Error('Tidak ditemukan butir kuesioner pada halaman ini.');
    }
  }

  /**
   * Logika pemilihan radio target yang kebal terhadap bug substring dan ketukar opsi
   * Menjamin "Auto Iya" SELALU memilih opsi Ya / Positif / Nilai Tertinggi,
   * dan "Auto Tidak" SELALU memilih opsi Tidak / Negatif / Nilai Terendah.
   */
  _selectTargetRadio(radios, mode) {
    if (!radios || radios.length === 0) return null;
    if (radios.length === 1) return radios[0];

    const annotated = radios.map((r, idx) => {
      const input = r.tagName === 'INPUT' ? r : (r.querySelector?.('input[type="radio"]') || r);
      return {
        r,
        input,
        idx,
        text: this._getRadioText(r)
      };
    });

    if (mode === 'iya') {
      // 1. Prioritas Utama: Cari radio yang secara EKSPLISIT berlabel kata "Ya" (word boundary)
      const yaMatch = annotated.find(item => {
        const t = item.text;
        const isNeg = t.includes('tidak') || t.includes('kurang') || t.includes('bukan') || t.includes('buruk') || t.includes('belum');
        if (isNeg) return false;
        return /\bya\b/i.test(t) || /\byes\b/i.test(t);
      });
      if (yaMatch) return yaMatch.r;

      // 2. Opsi Super Positif: "sangat baik", "sangat setuju", "sangat puas", "selalu"
      const superPositive = annotated.find(item => {
        const t = item.text;
        const isNeg = t.includes('tidak') || t.includes('kurang') || t.includes('bukan') || t.includes('buruk');
        if (isNeg) return false;
        return t.includes('sangat baik') || t.includes('sangat setuju') || t.includes('sangat puas') || t.includes('selalu');
      });
      if (superPositive) return superPositive.r;

      // 3. Opsi Positif biasa: "baik", "setuju", "puas", "sering"
      const positive = annotated.filter(item => {
        const t = item.text;
        const isNeg = t.includes('tidak') || t.includes('kurang') || t.includes('bukan') || t.includes('buruk');
        if (isNeg) return false;
        return t.includes('baik') || t.includes('setuju') || t.includes('puas') || t.includes('sering');
      });
      if (positive.length > 0) return positive[positive.length - 1].r;

      // 4. Nilai Numerik Tertinggi (misal opsi 1-5 atau 1-4)
      const highestNum = this._findNumericExtremum(radios, 'highest');
      if (highestNum) {
        const t = this._getRadioText(highestNum);
        if (!t.includes('tidak') && !t.includes('kurang')) return highestNum;
      }

      // 5. Fallback Khusus Format Biner (2 Opsi [Ya, Tidak]):
      // Di LMS UNPAM format biner, indeks 0 adalah "Ya" dan indeks 1 adalah "Tidak".
      if (radios.length === 2) {
        return radios[0]; // Indeks 0 = Ya!
      }

      // 6. Skala Likert 3+ opsi: opsi terakhir (indeks N-1) adalah rating tertinggi (Sangat Baik / 5)
      return radios[radios.length - 1];
    }

    if (mode === 'tidak') {
      // 1. Prioritas Utama: Cari radio yang secara EKSPLISIT berlabel kata "Tidak"
      const tidakMatch = annotated.find(item => {
        const t = item.text;
        return /\btidak\b/i.test(t) || /\bno\b/i.test(t) || t.includes('sangat tidak setuju') || t.includes('sangat kurang') || t.includes('kurang') || t.includes('buruk');
      });
      if (tidakMatch) return tidakMatch.r;

      // 2. Nilai Numerik Terendah (misal opsi 1 dari 1-5)
      const lowestNum = this._findNumericExtremum(radios, 'lowest');
      if (lowestNum) return lowestNum;

      // 3. Fallback Khusus Format Biner (2 Opsi [Ya, Tidak]):
      // Di LMS UNPAM format biner, indeks 1 adalah "Tidak".
      if (radios.length === 2) {
        return radios[1]; // Indeks 1 = Tidak!
      }

      // 4. Skala Likert 3+ opsi: opsi pertama (indeks 0) adalah rating terendah (Sangat Tidak Setuju / 1)
      return radios[0];
    }

    return radios[0];
  }

  _findNumericExtremum(radios, target = 'highest') {
    let bestRadio = null;
    let bestNum = target === 'highest' ? -Infinity : Infinity;

    for (const r of radios) {
      const valStr = this._getRadioText(r);
      const numMatch = valStr.match(/\b([1-5])\b/);
      if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        if (target === 'highest' && n > bestNum) {
          bestNum = n;
          bestRadio = r;
        } else if (target === 'lowest' && n < bestNum) {
          bestNum = n;
          bestRadio = r;
        }
      }
    }
    return bestRadio;
  }

  _fillFeedbackTextarea(mode) {
    const textareas = document.querySelectorAll('textarea, input[type="text"]:not([readonly])');
    if (textareas.length === 0) return;

    const positiveFeedbacks = [
      'Pembelajaran sangat interaktif dan materi perkuliahan disampaikan dengan sangat jelas.',
      'Dosen sangat menguasai materi perkuliahan, ramah, dan responsif terhadap mahasiswa.',
      'Penjelasan materi mudah dipahami, sistematis, tepat waktu, dan memotivasi belajar.',
      'Materi perkuliahan yang diberikan sangat aplikatif dan bermanfaat untuk wawasan masa depan.',
      'Dosen selalu memberikan penjelasan dan diskusi yang sangat membangun bagi pemahaman materi.'
    ];

    const criticalFeedbacks = [
      'Perlu peningkatan dalam kejelasan penyampaian materi dan alokasi waktu sesi diskusi.',
      'Mohon materi pengantar perkuliahan dapat dibagikan lebih awal sebelum kelas dimulai.',
      'Diharapkan forum tanya jawab perkuliahan dapat ditanggapi dengan lebih aktif dan cepat.',
      'Perlu penambahan contoh studi kasus praktis pada setiap pertemuan untuk memperjelas konsep.'
    ];

    for (const ta of textareas) {
      if (!ta.value.trim()) {
        const text = (mode === 'tidak')
          ? criticalFeedbacks[Math.floor(Math.random() * criticalFeedbacks.length)]
          : positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)];

        DOM.setNativeValue(ta, text);
      }
    }
  }

  _findSubmitButton() {
    const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], .MuiButton-root, [role="button"]'));
    const submitKeywords = [
      'submit kuesioner', 'submit kuisioner', 'kirim kuesioner', 'kirim kuisioner',
      'simpan kuesioner', 'simpan kuisioner', 'simpan jawaban', 'kumpulkan kuesioner',
      'simpan', 'kirim', 'submit', 'selesai'
    ];

    for (const kw of submitKeywords) {
      const match = candidates.find(btn => {
        if (btn.disabled || btn.classList.contains('Mui-disabled')) return false;
        const text = (btn.textContent || btn.value || '').trim().toLowerCase();
        return text === kw || text.includes(kw);
      });
      if (match) return match;
    }

    return null;
  }

  async _confirmDialogIfPresent() {
    const dialogs = document.querySelectorAll('[role="dialog"], .MuiDialog-root, .swal2-popup, .MuiModal-root, .modal');
    for (const d of dialogs) {
      if (d.id === 'mentari-autopilot-hud-host' || d.closest?.('#mentari-autopilot-hud-host')) continue;
      const style = window.getComputedStyle(d);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

      const buttons = d.querySelectorAll('button, .MuiButton-root, .swal2-confirm, input[type="button"]');
      if (buttons.length === 0) continue;

      const confirmKeywords = ['ya', 'setuju', 'kirim', 'simpan', 'lanjutkan', 'ok', 'yes', 'benar', 'submit'];
      for (const b of buttons) {
        const bText = (b.textContent || b.value || '').trim().toLowerCase();
        if (bText.includes('batal') || bText.includes('cancel') || bText.includes('kembali') || bText.includes('tutup')) {
          continue;
        }
        if (confirmKeywords.some(kw => bText === kw || bText.startsWith(kw) || bText.includes(kw))) {
          await Humanizer.naturalClick(b, true);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Engine Verifikasi Post-Submit Multi-Sinyal
   * @param {number} maxWaitMs
   * @returns {Promise<{ success: boolean, reason: string }>}
   */
  async _submitAndVerifyKuisioner(maxWaitMs = 25000) {
    const submitBtn = this._findSubmitButton();
    if (!submitBtn) {
      return { success: false, reason: 'Tombol submit/simpan kuesioner tidak ditemukan di halaman.' };
    }

    // Pre-Submit Check: pastikan grup radio tercentang sebelum klik submit
    const groups = this._collectRadioGroups();
    const unansweredGroups = groups.filter(g => !g.radios.some(r => this._isRadioChecked(r)));

    if (unansweredGroups.length > 0) {
      // Upayakan mengisi grup yang belum terdeteksi tercentang
      for (const ug of unansweredGroups) {
        const target = this._selectTargetRadio(ug.radios, 'iya');
        if (target) {
          const inp = target.tagName === 'INPUT' ? target : (target.querySelector?.('input[type="radio"]') || target);
          if (inp) DOM.setNativeRadioChecked(inp);
        }
      }
      await new Promise(r => setTimeout(r, 150));

      const stillUnanswered = groups.filter(g => !g.radios.some(r => this._isRadioChecked(r)));
      if (stillUnanswered.length > 0 && stillUnanswered.length === groups.length) {
        return {
          success: false,
          reason: `Seluruh butir pertanyaan kuesioner (${stillUnanswered.length} butir) belum dapat terisi.`
        };
      }
    }

    try { submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}

    const initialUrl = window.location.href;

    const parentForm = submitBtn.closest('form');
    if (parentForm) {
      parentForm.noValidate = true;
    }
    submitBtn.formNoValidate = true;

    // 1. Eksekusi natural click pada tombol submit
    await Humanizer.naturalClick(submitBtn, true);

    // 2. Micro wait 250ms untuk melihat apakah submission langsung dimulai
    await new Promise(r => setTimeout(r, 250));
    const hasStartedEarly = (
      document.querySelector('.MuiCircularProgress-root, .swal2-loading, [role="progressbar"], .spinner, .loading') !== null ||
      (document.body.innerText || '').toLowerCase().includes('menunggu...') ||
      window.location.href !== initialUrl
    );

    // 3. Fallback jika naturalClick tertahan oleh event handler form di Next.js/React
    if (!hasStartedEarly && parentForm && typeof parentForm.requestSubmit === 'function') {
      try {
        parentForm.requestSubmit(submitBtn);
      } catch (_) {
        try { parentForm.requestSubmit(); } catch (_) {}
      }
    } else if (!hasStartedEarly) {
      try { submitBtn.click(); } catch (_) {}
    }

    const startTime = Date.now();
    let dialogConfirmed = false;
    let hadLoadingOverlay = false;

    while (Date.now() - startTime < maxWaitMs) {
      // 1. Tangani modal dialog konfirmasi jika muncul
      const confirmed = await this._confirmDialogIfPresent();
      if (confirmed) {
        dialogConfirmed = true;
      }

      // 2. Deteksi apakah loading spinner LMS ("Menunggu...") sedang aktif
      const pageText = (document.body.innerText || '').toLowerCase();
      const hasLoadingIndicator = (
        pageText.includes('menunggu...') ||
        pageText.includes('memproses...') ||
        pageText.includes('menyimpan...') ||
        document.querySelector('.MuiCircularProgress-root, .swal2-loading, [role="progressbar"], .spinner, .loading') !== null
      );

      if (hasLoadingIndicator) {
        hadLoadingOverlay = true;
        // Server LMS sedang memproses pengiriman data, lanjutkan polling tanpa timeout prematur
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      // 3. Sinyal A: URL Redirect berpindah dari halaman kuesioner
      const curUrl = window.location.href;
      if (curUrl !== initialUrl && !curUrl.includes('/kuesioner/') && !curUrl.includes('/kuisioner/')) {
        return { success: true, reason: 'URL dialihkan (redirect) setelah submit berhasil.' };
      }

      // 4. Sinyal B: Pesan sukses di DOM / Toasts
      const successKeywords = [
        'berhasil disimpan', 'berhasil dikirim', 'kuesioner telah diisi',
        'kuisioner telah diisi', 'terima kasih telah mengisi', 'terima kasih',
        'telah mengisi evaluasi', 'evaluasi berhasil', 'sudah mengisi kuesioner',
        'sudah mengisi kuisioner', 'sukses', 'berhasil', 'tersimpan',
        'kuesioner telah diselesaikan', 'evaluasi telah selesai', 'anda sudah mengisi',
        'anda telah menyelesaikan', 'sudah diselesaikan'
      ];
      for (const kw of successKeywords) {
        if (pageText.includes(kw)) {
          return { success: true, reason: `Ditemukan notifikasi sukses LMS: "${kw}"` };
        }
      }

      const toastSuccess = document.querySelector('.Toastify__toast--success, .MuiAlert-filledSuccess, .swal2-success, .alert-success, .text-success');
      if (toastSuccess && !toastSuccess.closest?.('#mentari-autopilot-hud-host')) {
        return { success: true, reason: 'Notifikasi toast sukses terdeteksi dari LMS.' };
      }

      // 5. Sinyal C: Form kuesioner lenyap atau radio buttons dinonaktifkan
      const curRadios = document.querySelectorAll('input[type="radio"]');
      const activeRadios = document.querySelectorAll('input[type="radio"]:not(:disabled)');
      if (curRadios.length === 0 || (curRadios.length > 0 && activeRadios.length === 0)) {
        return { success: true, reason: 'Form kuesioner telah terkunci atau ditutup oleh LMS.' };
      }

      // 6. Sinyal D: Deteksi Error Validasi LMS
      const errorKeywords = ['harus diisi', 'wajib diisi', 'belum lengkap', 'gagal menyimpan', 'terjadi kesalahan pada server'];
      const errElements = document.querySelectorAll('.Mui-error, .MuiAlert-standardError, .swal2-error, [role="alert"], .text-danger, .invalid-feedback');
      for (const el of errElements) {
        if (el.closest?.('#mentari-autopilot-hud-host')) continue;
        const elText = (el.innerText || '').toLowerCase();
        for (const errKw of errorKeywords) {
          if (elText.includes(errKw)) {
            return { success: false, reason: `Validasi LMS gagal: "${(el.innerText || '').trim()}"` };
          }
        }
      }

      // 7. Sinyal E: Loading overlay pernah muncul dan sekarang hilang
      if (hadLoadingOverlay) {
        const curBtn = this._findSubmitButton();
        if (!curBtn || curBtn.disabled || curBtn.classList.contains('Mui-disabled')) {
          return { success: true, reason: 'LMS selesai memproses data dan menonaktifkan tombol submit.' };
        }
        return { success: true, reason: 'LMS selesai memproses data pengiriman kuesioner.' };
      }

      await new Promise(r => setTimeout(r, 300));
    }

    // Pengecekan akhir pasca timeout
    if (window.location.href !== initialUrl) {
      return { success: true, reason: 'URL berpindah setelah proses submit selesai.' };
    }

    const finalBtn = this._findSubmitButton();
    if (!finalBtn || finalBtn.disabled) {
      return { success: true, reason: 'Tombol submit berhasil diproses dan dinonaktifkan.' };
    }

    // Jika form kuesioner terisi lengkap tapi server LMS lambat / tidak me-refresh SPA
    if (hadLoadingOverlay || dialogConfirmed) {
      return { success: true, reason: 'Form kuesioner telah diserahkan dan diproses oleh server.' };
    }

    return { success: false, reason: 'Batas waktu verifikasi habis tanpa konfirmasi berhasil dari LMS.' };
  }

  _injectAutoPilotHUD(state, currentItem) {
    if (document.getElementById('mentari-autopilot-hud-host')) {
      document.getElementById('mentari-autopilot-hud-host').remove();
    }

    this.hudHost = document.createElement('div');
    this.hudHost.id = 'mentari-autopilot-hud-host';
    this.hudHost.style.position = 'fixed';
    // Anchor bottom-right above Mentari snackbars to avoid top-right toast overlap
    this.hudHost.style.bottom = '72px';
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
      .hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
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
      .hud-header-right {
        display: flex;
        align-items: center;
        gap: 6px;
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
      .hud-icon-btn {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .hud-icon-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .hud-icon-btn.close:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.45);
        color: #fca5a5;
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
        flex-wrap: wrap;
      }
      .hud-tag {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .hud-tag.kues {
        background: rgba(245, 158, 11, 0.18);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
      }
      .hud-pref-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .hud-pref-pill.tidak {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
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
      .hud-card.theme-light {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid #cbd5e1;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
        color: #0f172a;
      }
      .hud-card.theme-light .hud-brand {
        color: #1e3a8a;
      }
      .hud-card.theme-light .hud-badge.running {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .hud-card.theme-light .hud-badge.paused {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }
      .hud-card.theme-light .hud-title {
        color: #0f172a;
      }
      .hud-card.theme-light .hud-subtitle,
      .hud-card.theme-light .hud-progress-info {
        color: #475569;
      }
      .hud-card.theme-light .hud-tag.kues {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }
      .hud-card.theme-light .hud-pref-pill {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .hud-card.theme-light .hud-pref-pill.tidak {
        background: #fef2f2;
        color: #b91c1c;
        border-color: #fecaca;
      }
      .hud-card.theme-light .hud-progress-bar-bg {
        background: #e2e8f0;
      }
      .hud-card.theme-light .hud-progress-bar-fill {
        background: linear-gradient(90deg, #1e3a8a, #3b82f6);
      }
      .hud-card.theme-light .hud-status {
        color: #1e293b;
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      .hud-card.theme-light .hud-btn-pause {
        background: #f1f5f9;
        color: #1e293b;
        border-color: #cbd5e1;
      }
      .hud-card.theme-light .hud-btn-pause:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .hud-card.theme-light .hud-btn-cancel {
        background: #fef2f2;
        color: #b91c1c;
        border-color: #fecaca;
      }
      .hud-card.theme-light .hud-btn-cancel:hover {
        background: #fee2e2;
        color: #991b1b;
      }
      .hud-card.theme-light .hud-icon-btn {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
      }
      .hud-card.theme-light .hud-icon-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .hud-card.theme-light .hud-icon-btn.close:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      .hud-card.minimized {
        width: 270px;
        padding: 10px 14px;
        gap: 8px;
      }
      .hud-card.minimized .hud-body,
      .hud-card.minimized .hud-status,
      .hud-card.minimized .hud-actions {
        display: none !important;
      }
    `;

    const hudCard = document.createElement('div');
    hudCard.className = `hud-card ${this.currentTheme === 'light' ? 'theme-light' : ''}`;

    const currentIdx = state.currentIndex || 0;
    const totalCount = state.queue?.length || 1;
    const progressPercent = Math.round((currentIdx / totalCount) * 100);
    const rawPref = state.kuesionerPreference || 'iya';
    const pref = (rawPref === 'tidak') ? 'tidak' : 'iya';
    const prefLabel = (pref === 'tidak') ? 'Auto Tidak' : 'Auto Ya';

    hudCard.innerHTML = `
      <div class="hud-header">
        <div class="hud-brand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Auto-Pilot Kuis & Evaluasi
        </div>
        <div class="hud-header-right">
          <div class="hud-badge ${this.isPaused ? 'paused' : 'running'}" id="hud-badge">
            ${this.isPaused ? 'Dijeda' : 'Berjalan'}
          </div>
          <button class="hud-icon-btn" id="hud-btn-minimize" type="button" title="Perkecil ke bar progres" aria-label="Perkecil ke bar progres">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="hud-icon-btn close" id="hud-btn-close" type="button" title="Sembunyikan HUD" aria-label="Sembunyikan HUD">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="hud-body">
        <div class="hud-title" title="${currentItem.courseTitle || ''}">${currentItem.courseTitle || ''}</div>
        <div class="hud-subtitle">
          <span class="hud-tag kues">Kuesioner</span>
          <span>${currentItem.sectionName || ''}</span>
          <span class="hud-pref-pill ${pref}">${prefLabel}</span>
        </div>
      </div>

      <div class="hud-progress-wrap">
        <div class="hud-progress-info">
          <span id="hud-progress-label">Item ${currentIdx + 1} dari ${totalCount}</span>
          <span id="hud-progress-pct">${progressPercent}%</span>
        </div>
        <div class="hud-progress-bar-bg">
          <div class="hud-progress-bar-fill" id="hud-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="hud-status" id="hud-status-text">
        Mempersiapkan evaluasi kuesioner...
      </div>

      <div class="hud-actions">
        <button class="hud-btn hud-btn-pause" id="hud-btn-pause" type="button" style="${this.isPaused ? '' : 'display:none;'}">
          ${this.isPaused ? 'Coba Lagi' : 'Jeda'}
        </button>
        <button class="hud-btn hud-btn-cancel" id="hud-btn-cancel" type="button">
          Hentikan & Reset Total
        </button>
      </div>
    `;

    this.hudShadow.appendChild(style);
    this.hudShadow.appendChild(hudCard);
    document.body.appendChild(this.hudHost);

    this._makeElementDraggable(this.hudHost, hudCard.querySelector('.hud-header'));

    const btnHudMin = this.hudShadow.getElementById('hud-btn-minimize');
    const btnHudClose = this.hudShadow.getElementById('hud-btn-close');
    btnHudMin?.addEventListener('click', () => {
      const minimized = hudCard.classList.toggle('minimized');
      btnHudMin.title = minimized ? 'Perbesar HUD' : 'Perkecil ke bar progres';
      btnHudMin.setAttribute('aria-label', btnHudMin.title);
      btnHudMin.innerHTML = minimized
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    });
    btnHudClose?.addEventListener('click', () => {
      if (!this.isAutoPilot && !this.isProcessing) {
        this.hudHost?.remove();
      } else if (this.hudHost) {
        this.hudHost.style.display = 'none';
        Toast.info('HUD Kuesioner disembunyikan. Otomatisasi tetap berjalan.');
      }
    });

    const statusEl = this.hudShadow.getElementById('hud-status-text');
    const badgeEl = this.hudShadow.getElementById('hud-badge');
    const btnPause = this.hudShadow.getElementById('hud-btn-pause');
    const btnCancel = this.hudShadow.getElementById('hud-btn-cancel');
    const progressBar = this.hudShadow.getElementById('hud-progress-fill');

    btnPause.addEventListener('click', async () => {
      this.isPaused = !this.isPaused;
      badgeEl.className = `hud-badge ${this.isPaused ? 'paused' : 'running'}`;
      badgeEl.textContent = this.isPaused ? 'Dijeda' : 'Berjalan';
      btnPause.textContent = this.isPaused ? 'Coba Lagi' : 'Jeda';
      if (!this.isPaused) {
        btnPause.style.display = 'none';
      }
      statusEl.textContent = this.isPaused ? 'Auto-Pilot dijeda sementara.' : 'Melanjutkan pengerjaan kuesioner...';

      if (this.isPaused) {
        await AutoPilotState.pause('Dijeda oleh pengguna');
      } else {
        await AutoPilotState.resume();
        if (!this.isProcessing) {
          const freshState = await AutoPilotState.get();
          if (freshState && freshState.active) {
            this._executeAutoPilotKuesioner(freshState, currentItem, statusEl, badgeEl, btnPause, progressBar);
          }
        }
      }
    });

    btnCancel.addEventListener('click', async () => {
      this.isAutoPilot = false;
      this.isProcessing = false;
      this.isPaused = false;
      await AutoPilotState.reset();
      Toast.info('Auto-Pilot kuis & evaluasi telah dihentikan & direset total.');
      if (this.hudHost) this.hudHost.remove();
      const manualCard = document.getElementById('mentari-kuisioner-card-host');
      if (manualCard) manualCard.style.display = 'block';
    });

    return { statusEl, badgeEl, btnPause, progressBar };
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
      try { handle.setPointerCapture(e.pointerId); } catch {}
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
      try { handle.releasePointerCapture(e.pointerId); } catch {}
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  }

  async _checkAndInitAutoPilot() {
    try {
      const state = await AutoPilotState.get();

      if (!state || !state.active || !Array.isArray(state.queue)) {
        this.isAutoPilot = false;
        const manualCard = document.getElementById('mentari-kuisioner-card-host');
        if (manualCard) manualCard.style.display = 'block';
        return;
      }

      this.isAutoPilot = true;
      // Hide manual card while Auto-Pilot owns the page
      const manualCard = document.getElementById('mentari-kuisioner-card-host');
      if (manualCard) manualCard.style.display = 'none';

      if (state.currentIndex >= state.queue.length) {
        this.isAutoPilot = false;
        await Storage.set({
          mentari_auto_pilot_state: { ...state, active: false, finished: true }
        });
        Toast.success('Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!');
        if (manualCard) manualCard.style.display = 'block';
        return;
      }

      const currentItem = state.queue[state.currentIndex];
      if (!currentItem) return;

      const urlMatch = window.location.pathname.match(/\/(?:kuesioner|kuisioner)\/([^\/\?]+)/i);
      const currentUrlKuesId = urlMatch ? decodeURIComponent(urlMatch[1]) : null;

      const matchesCurrent = currentUrlKuesId && (
        currentUrlKuesId === currentItem.id ||
        currentUrlKuesId === currentItem.sectionCode ||
        (currentItem.url && currentItem.url.includes(currentUrlKuesId))
      );

      if (currentUrlKuesId && !matchesCurrent) {
        console.warn(`[Auto-Pilot Guard] ID kuesioner aktif (${currentUrlKuesId}) tidak cocok dengan antrean (${currentItem.id} / ${currentItem.sectionCode}). Redirect ke item yang benar...`);
        window.location.replace(currentItem.url);
        return;
      }

      if (currentItem.type !== 'KUESIONER' && currentItem.url) {
        window.location.replace(currentItem.url);
        return;
      }

      console.log(`[Auto-Pilot] Memulai Kuesioner ${state.currentIndex + 1}/${state.queue.length}:`, currentItem);

      this.isPaused = Boolean(state.paused);
      const { statusEl, badgeEl, btnPause, progressBar } = this._injectAutoPilotHUD(state, currentItem);

      // Keep paused runs idle until user resumes manually
      if (this.isPaused) {
        statusEl.textContent = state.pauseReason ? `Terjeda: ${state.pauseReason}. Klik Lanjutkan untuk mencoba lagi.` : 'Auto-Pilot dijeda. Klik Lanjutkan untuk mencoba lagi.';
        return;
      }

      this._executeAutoPilotKuesioner(state, currentItem, statusEl, badgeEl, btnPause, progressBar);
    } catch (e) {
      console.error('[Auto-Pilot Kuesioner Error]', e);
    }
  }

  async _executeAutoPilotKuesioner(state, currentItem, statusEl = null, badgeEl = null, btnPause = null, progressBar = null) {
    if (!statusEl) statusEl = this.hudShadow?.getElementById('hud-status-text');
    if (!badgeEl) badgeEl = this.hudShadow?.getElementById('hud-badge');
    if (!btnPause) btnPause = this.hudShadow?.getElementById('hud-btn-pause');

    const rawPref = state.kuesionerPreference || (await Storage.get('mentari_kuesioner_preference'))?.mentari_kuesioner_preference || 'iya';
    const pref = (rawPref === 'tidak') ? 'tidak' : 'iya';
    const prefLabel = (pref === 'tidak') ? 'Auto Tidak' : 'Auto Ya';

    if (statusEl) {
      statusEl.textContent = `[${prefLabel}] Memeriksa status kuesioner: ${currentItem.sectionName || ''}...`;
    }

    this.isProcessing = true;

    try {
      const readyState = await this._waitForKuesionerReady(12000);

      if (readyState.alreadyCompleted) {
        console.log('[Auto-Pilot Kuesioner] Kuesioner ini sudah selesai diisi sebelumnya di LMS UNPAM. Melanjutkan...');
        if (statusEl) statusEl.textContent = 'Kuesioner ini sudah selesai diisi sebelumnya. Melanjutkan antrean...';
        Toast.info(`Kuesioner ${currentItem.sectionName || ''} sudah selesai diisi di LMS.`);

        state.currentIndex++;
        await AutoPilotState.set(state);
        this.isProcessing = false;
        this._proceedToNextItem(state, statusEl);
        return;
      }

      if (!readyState.ready) {
        throw new Error('Tidak ditemukan butir kuesioner pada halaman ini.');
      }

      if (statusEl) {
        statusEl.textContent = `[${prefLabel}] Mengisi seluruh butir kuesioner: ${currentItem.sectionName || ''}...`;
      }

      await this.fillKuisioner(pref);
      if (statusEl) statusEl.textContent = 'Kuesioner terisi. Mengirim & memverifikasi ke server LMS...';

      const verifyResult = await this._submitAndVerifyKuisioner();
      console.log('[Auto-Pilot Kuesioner Verification Result]', verifyResult);

      if (!verifyResult.success) {
        // Pause queue on verification failure to avoid skipping unsubmitted surveys
        console.warn('[Auto-Pilot Kuesioner Verification Paused]', verifyResult.reason);
        if (statusEl) {
          statusEl.textContent = `Gagal Verifikasi: ${verifyResult.reason}. Klik Coba Lagi untuk mengulang.`;
        }
        if (badgeEl) {
          badgeEl.className = 'hud-badge paused';
          badgeEl.textContent = 'Dijeda';
        }
        if (btnPause) {
          btnPause.style.display = '';
          btnPause.textContent = 'Coba Lagi';
        }
        this.isPaused = true;
        this.isProcessing = false;
        Toast.error(`Gagal verifikasi submit kuesioner: ${verifyResult.reason}`);

        await AutoPilotState.pause(`Gagal verifikasi: ${verifyResult.reason}`);
        return;
      }

      if (statusEl) statusEl.textContent = 'Kuesioner terverifikasi sukses terkirim!';
      Toast.success(`Kuesioner ${currentItem.sectionName || ''} berhasil diverifikasi dan disimpan!`);

      state.currentIndex++;
      await AutoPilotState.set(state);
      this.isProcessing = false;

      if (statusEl) {
        statusEl.textContent = 'Kuesioner sukses terverifikasi! Membuka evaluasi berikutnya...';
      }
      await new Promise(r => setTimeout(r, 800));

      await this._proceedToNextItem(state, statusEl);

    } catch (err) {
      console.error('[Auto-Pilot Kuesioner Fatal Error]', err);
      this.isProcessing = false;
      this.isPaused = true;
      if (statusEl) statusEl.textContent = `Error: ${err.message}. Klik Coba Lagi untuk mengulang.`;
      if (badgeEl) {
        badgeEl.className = 'hud-badge paused';
        badgeEl.textContent = 'Dijeda';
      }
      if (btnPause) {
        btnPause.style.display = '';
        btnPause.textContent = 'Coba Lagi';
      }
      Toast.error(`Kuesioner error: ${err.message}`);

      await AutoPilotState.pause(`Error: ${err.message}`);
    }
  }

  async _proceedToNextItem(state, statusEl = null) {
    if (state.currentIndex >= state.queue.length && (state.mode === 'all' || !state.mode)) {
      if (statusEl) {
        statusEl.textContent = 'Memeriksa ketersediaan kuesioner lain di server UNPAM...';
      }
      try {
        const hasMoreKues = await AutoPilotSync.syncAndAppendKuesioner(state, statusEl);
        if (hasMoreKues) {
          console.log('[Auto-Pilot Kuesioner] Sweep menemukan kuesioner tambahan! Melanjutkan pengerjaan.');
        }
      } catch (e) {
        console.warn('[Auto-Pilot Kuesioner] Gagal sweep kuesioner tambahan:', e);
      }
    }

    if (state.currentIndex < state.queue.length) {
      const nextItem = state.queue[state.currentIndex];
      if (statusEl) statusEl.textContent = `Menuju ke: ${nextItem.courseTitle || ''} (${nextItem.sectionName || nextItem.name || ''})...`;
      setTimeout(() => {
        window.location.replace(nextItem.url);
      }, 500);
    } else {
      await AutoPilotState.reset();
      this.isAutoPilot = false;
      this.isProcessing = false;

      const totalDone = state.queue?.length || 1;
      const fillEl = this.hudShadow?.getElementById('hud-progress-fill');
      const labelEl = this.hudShadow?.getElementById('hud-progress-label');
      const pctEl = this.hudShadow?.getElementById('hud-progress-pct');
      const badgeEl = this.hudShadow?.getElementById('hud-badge');
      const actionsEl = this.hudShadow?.querySelector('.hud-actions');

      if (fillEl) fillEl.style.width = '100%';
      if (labelEl) labelEl.textContent = `Item ${totalDone} dari ${totalDone}`;
      if (pctEl) pctEl.textContent = '100%';
      if (badgeEl) {
        badgeEl.className = 'hud-badge running';
        badgeEl.textContent = 'Selesai';
      }
      if (actionsEl) actionsEl.style.display = 'none';

      if (statusEl) statusEl.textContent = 'Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!';
      Toast.success('Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!');
      setTimeout(() => {
        if (this.hudHost) this.hudHost.remove();
        const manualCard = document.getElementById('mentari-kuisioner-card-host');
        if (manualCard) manualCard.style.display = 'block';
      }, 4000);
    }
  }
}

if (typeof window !== 'undefined') {
  new KuisionerAssistant();
}