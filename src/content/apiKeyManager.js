/**
 * Mentari Mod Modern Edition - Multi-API Key Manager
 * Mengelola Google Gemini API Key (AQ. & AIza...) dengan Closed Shadow DOM.
 * Mendukung Multi-Key Failover Pool dengan rotasi otomatis saat limit kuota/429.
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
    const store = await Storage.get(['geminiApiKey', 'geminiApiKeys']);
    const hasKey = store.geminiApiKey || (Array.isArray(store.geminiApiKeys) && store.geminiApiKeys.length > 0);
    if (!hasKey) {
      // Tampilkan popup jika belum ada key
      setTimeout(() => this.openModal(), 1200);
    }
  }

  _maskKey(key) {
    if (!key || typeof key !== 'string') return '••••••••';
    if (key.length <= 12) return key.slice(0, 4) + '...' + key.slice(-2);
    return key.slice(0, 7) + '...' + key.slice(-4);
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
        width: 490px;
        max-width: 94vw;
        background: #141416;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        transform: scale(0.95);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        color: #e5e5e5;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
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
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
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
      .section-label {
        font-size: 11px;
        font-weight: 700;
        color: #bbb;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .keys-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 190px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .keys-list::-webkit-scrollbar {
        width: 4px;
      }
      .keys-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      .key-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1a1a1e;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 14px;
        transition: border-color 0.2s;
      }
      .key-item.active {
        border-color: rgba(212, 175, 55, 0.45);
        background: rgba(212, 175, 55, 0.04);
      }
      .key-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .key-code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        color: #f1f1f1;
        letter-spacing: 0.5px;
      }
      .key-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .key-badge.primary {
        background: rgba(212, 175, 55, 0.18);
        color: #d4af37;
        border: 1px solid rgba(212, 175, 55, 0.35);
      }
      .key-badge.backup {
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.25);
      }
      .key-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .key-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 5px 8px;
        color: #bbb;
        cursor: pointer;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }
      .key-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .key-btn.btn-set-primary:hover {
        border-color: rgba(212, 175, 55, 0.4);
        color: #d4af37;
      }
      .key-btn.btn-delete:hover {
        border-color: rgba(239, 68, 68, 0.4);
        color: #ef4444;
      }
      .empty-keys {
        font-size: 12px;
        color: #777;
        text-align: center;
        padding: 16px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        border: 1px dashed rgba(255, 255, 255, 0.08);
      }
      .add-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
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
            <div style="margin-top:6px; font-size:11px; color:#9ca3af;">
              <b>Multi-Key Failover:</b> Kamu bisa menambahkan banyak API Key. Saat key utama terkena limit kuota / HTTP 429, sistem otomatis beralih ke key cadangan berikutnya tanpa henti.
            </div>
            <div style="margin-top:6px; font-size:11px; color:#fbbf24; border-top:1px dashed rgba(255,255,255,0.08); padding-top:6px;">
              <b>Info Kuota (RPD/RPM):</b> Limit harian (RPD) akan reset otomatis setiap hari oleh Google. API Key yang limit <b>tidak perlu dihapus</b> karena tetap tersimpan di laptop dan otomatis bisa dipakai kembali besok saat kuota reset.
            </div>
          </div>

          <div class="section-label">
            <span>Daftar API Key Tersimpan</span>
            <span id="keys-count-badge" style="color:#d4af37; font-size:10px;">0 Key</span>
          </div>

          <div class="keys-list" id="keys-list-container">
            <div class="empty-keys">Memuat daftar API Key...</div>
          </div>

          <div class="section-label" style="margin-top:6px;">
            <span>Tambah API Key Baru</span>
          </div>

          <div class="add-form">
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
          <button class="btn btn-cancel" id="btn-cancel">Tutup</button>
          <button class="btn btn-save" id="btn-add-key">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah & Uji Key
          </button>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    // Event handlers
    const inputKey = this.shadow.getElementById('input-api-key');
    const btnAddKey = this.shadow.getElementById('btn-add-key');
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

    // Tambah Key baru
    btnAddKey.addEventListener('click', async () => {
      const keyVal = inputKey.value.trim();

      if (!keyVal) {
        Toast.warning('Silakan masukkan API Key Gemini Anda.');
        return;
      }

      // Cek apakah key sudah ada di daftar
      const currentKeysRes = await new Promise(r => chrome.runtime.sendMessage({ action: 'getGeminiApiKeys' }, r));
      if (currentKeysRes?.keys?.includes(keyVal)) {
        Toast.warning('API Key ini sudah tersimpan di dalam daftar.');
        return;
      }

      btnAddKey.disabled = true;
      btnAddKey.textContent = 'Memverifikasi...';

      // Verifikasi via Service Worker
      chrome.runtime.sendMessage({
        action: 'addGeminiApiKey',
        apiKey: keyVal
      }, async (res) => {
        btnAddKey.disabled = false;
        btnAddKey.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah & Uji Key
        `;

        if (res && res.valid) {
          inputKey.value = '';
          Toast.success('API Key valid dan berhasil ditambahkan ke pool!');
          await this._loadAndRenderKeys();

          // Notifikasi ke seluruh modul
          window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
            detail: { apiKey: keyVal }
          }));
        } else {
          Toast.error(res ? res.message : 'Verifikasi API Key gagal.');
        }
      });
    });
  }

  async _loadAndRenderKeys() {
    if (!this.shadow) return;
    const container = this.shadow.getElementById('keys-list-container');
    const countBadge = this.shadow.getElementById('keys-count-badge');
    if (!container) return;

    chrome.runtime.sendMessage({ action: 'getGeminiApiKeys' }, (res) => {
      const keys = res?.keys || [];
      const activeKey = res?.activeKey || keys[0] || '';

      if (countBadge) {
        countBadge.textContent = `${keys.length} Key`;
      }

      if (keys.length === 0) {
        container.innerHTML = `
          <div class="empty-keys">
            Belum ada API Key tersimpan. Masukkan key Gemini agar asisten dapat bekerja.
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      keys.forEach((key, idx) => {
        const isPrimary = key === activeKey;
        const itemDiv = document.createElement('div');
        itemDiv.className = `key-item ${isPrimary ? 'active' : ''}`;

        itemDiv.innerHTML = `
          <div class="key-left">
            <span class="key-badge ${isPrimary ? 'primary' : 'backup'}">
              ${isPrimary ? 'Utama' : 'Cadangan'}
            </span>
            <span class="key-code" title="${key}">${this._maskKey(key)}</span>
          </div>
          <div class="key-actions">
            ${!isPrimary ? `
              <button class="key-btn btn-set-primary" data-key="${key}" title="Jadikan API Key Utama">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Utamakan
              </button>
            ` : ''}
            <button class="key-btn btn-delete" data-key="${key}" title="Hapus API Key ini">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        `;

        // Action Set Primary
        const btnSet = itemDiv.querySelector('.btn-set-primary');
        if (btnSet) {
          btnSet.addEventListener('click', () => {
            chrome.runtime.sendMessage({
              action: 'setActiveGeminiApiKey',
              apiKey: key
            }, (setRes) => {
              if (setRes && setRes.success) {
                Toast.success('API Key utama berhasil diperbarui.');
                this._loadAndRenderKeys();
                window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
                  detail: { apiKey: key }
                }));
              }
            });
          });
        }

        // Action Delete
        const btnDel = itemDiv.querySelector('.btn-delete');
        if (btnDel) {
          btnDel.addEventListener('click', () => {
            chrome.runtime.sendMessage({
              action: 'removeGeminiApiKey',
              apiKey: key
            }, (delRes) => {
              if (delRes && delRes.success) {
                Toast.info('API Key telah dihapus.');
                this._loadAndRenderKeys();
                window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
                  detail: { apiKey: delRes.activeKey }
                }));
              }
            });
          });
        }

        container.appendChild(itemDiv);
      });
    });
  }

  async openModal() {
    this._buildModalDOM();
    await this._loadAndRenderKeys();

    const overlay = this.shadow.querySelector('.overlay');
    if (overlay) overlay.classList.add('open');
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