/**
 * Mentari Mod Modern Edition - API Key Manager
 * Mengelola Google Gemini API Key (AQ. & AIza...) dengan Closed Shadow DOM.
 * Fokus murni pada penyimpanan & pengujian API Key tanpa memaksa pemilihan model di awal.
 */

import { Storage } from '../utils/storage.js';
import { Toast } from '../utils/toast.js';

class ApiKeyManager {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
    this._init();
  }

  async _init() {
    // Jalankan auto-migrasi data lama jika ada
    await Storage.autoMigrateLegacyStorage();

    // Dengarkan event eksternal dari modul lain
    window.addEventListener('mentari-update-api-key', () => {
      this.openModal();
    });

    // Periksa apakah API key sudah ada di storage
    const { geminiApiKey } = await Storage.get('geminiApiKey');
    if (!geminiApiKey) {
      // Tampilkan popup jika belum ada key
      setTimeout(() => this.openModal(), 1200);
    }
  }

  _buildModalDOM() {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.id = 'mentari-api-key-host';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        z-index: 2147483640;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .modal {
        width: 440px;
        max-width: 92vw;
        background: #141416;
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        transform: scale(0.95);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        color: #e5e5e5;
      }
      .overlay.open .modal {
        transform: scale(1);
      }
      .header {
        padding: 18px 22px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.02);
      }
      .header-title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .header-icon {
        color: #d4af37;
        width: 18px;
        height: 18px;
      }
      .close-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        display: flex;
        border-radius: 6px;
        transition: all 0.2s;
      }
      .close-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.08);
      }
      .content {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .info-box {
        font-size: 12px;
        line-height: 1.5;
        color: #aaa;
        background: rgba(255, 255, 255, 0.03);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .info-box a {
        color: #d4af37;
        text-decoration: none;
        font-weight: 600;
      }
      .info-box a:hover {
        text-decoration: underline;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .label {
        font-size: 12px;
        font-weight: 600;
        color: #bbb;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-field {
        width: 100%;
        background: #1e1e22;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 10px 42px 10px 14px;
        color: #fff;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
        font-family: monospace;
      }
      .input-field:focus {
        border-color: #d4af37;
        box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
      }
      .toggle-vis {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #777;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 4px;
        transition: color 0.2s;
      }
      .toggle-vis:hover {
        color: #d4af37;
      }
      .footer {
        padding: 16px 22px;
        background: rgba(255, 255, 255, 0.02);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .btn {
        padding: 9px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .btn-cancel {
        background: transparent;
        color: #888;
      }
      .btn-cancel:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
      }
      .btn-save {
        background: #d4af37;
        color: #121212;
      }
      .btn-save:hover {
        background: #e6be40;
        transform: translateY(-1px);
      }
      .btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    overlay.innerHTML = `
      <div class="modal">
        <div class="header">
          <div class="header-title">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 2l-2 2m-1-1l-2 2m-1-1l-2 2M3 21l9-9m0 0l3-3m-3 3l-3-3m3 3l3 3"></path>
            </svg>
            Koneksi Google Gemini AI
          </div>
          <button class="close-btn" id="btn-close" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="content">
          <div class="info-box">
            Dapatkan API Key gratis di Google AI Studio:<br>
            <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">
              https://aistudio.google.com/api-keys
            </a>
            <div style="margin-top:6px; font-size:11px; color:#888;">
              Mendukung Google Auth Key baru (diawali <b>AQ.</b>) dan Standard Key (<b>AIza...</b>). Pilihan model AI bebas kamu ganti kapan saja di menu kuis, chat, atau dashboard.
            </div>
          </div>

          <div class="form-group">
            <label class="label">Gemini API Key</label>
            <div class="input-wrapper">
              <input type="password" id="input-api-key" class="input-field" placeholder="Masukkan AQ... atau AIza..." spellcheck="false" autocomplete="off">
              <button class="toggle-vis" id="btn-toggle-vis" type="button" aria-label="Lihat Key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="footer">
          <button class="btn btn-cancel" id="btn-cancel">Batal</button>
          <button class="btn btn-save" id="btn-save">Simpan & Uji Key</button>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    // Event handlers
    const inputKey = this.shadow.getElementById('input-api-key');
    const btnSave = this.shadow.getElementById('btn-save');
    const btnCancel = this.shadow.getElementById('btn-cancel');
    const btnClose = this.shadow.getElementById('btn-close');
    const btnToggleVis = this.shadow.getElementById('btn-toggle-vis');

    btnToggleVis.addEventListener('click', () => {
      inputKey.type = inputKey.type === 'password' ? 'text' : 'password';
    });

    const close = () => this.closeModal();
    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    btnSave.addEventListener('click', async () => {
      const keyVal = inputKey.value.trim();

      if (!keyVal) {
        Toast.warning('Silakan masukkan API Key Gemini Anda.');
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Memverifikasi...';

      // Verifikasi via Service Worker
      chrome.runtime.sendMessage({
        action: 'validateGeminiApiKey',
        apiKey: keyVal
      }, async (res) => {
        btnSave.disabled = false;
        btnSave.textContent = 'Simpan & Uji Key';

        if (res && res.valid) {
          await Storage.set({ geminiApiKey: keyVal });

          // Notifikasi ke seluruh modul
          window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
            detail: { apiKey: keyVal }
          }));

          Toast.success('API Key valid dan berhasil dikoneksikan ke Google Gemini!');
          close();
        } else {
          Toast.error(res ? res.message : 'Verifikasi API Key gagal.');
        }
      });
    });
  }

  async openModal() {
    this._buildModalDOM();
    const overlay = this.shadow.querySelector('.overlay');
    const inputKey = this.shadow.getElementById('input-api-key');

    const { geminiApiKey } = await Storage.get('geminiApiKey');
    if (geminiApiKey) inputKey.value = geminiApiKey;

    overlay.classList.add('open');
    this.isOpen = true;
  }

  closeModal() {
    if (!this.shadow) return;
    const overlay = this.shadow.querySelector('.overlay');
    if (overlay) overlay.classList.remove('open');
    this.isOpen = false;
  }
}

export const apiKeyManager = new ApiKeyManager();