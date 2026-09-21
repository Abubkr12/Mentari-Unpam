(() => {
  // src/utils/storage.js
  var Storage = {
    /**
     * Memeriksa apakah context extension masih valid dan aktif
     */
    isContextValid() {
      try {
        return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
      } catch {
        return false;
      }
    },
    /**
     * Mengambil satu atau beberapa nilai dari chrome.storage.local
     */
    async get(keys, defaults = {}) {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime?.lastError) {
                console.log("[Storage] Info reading storage:", chrome.runtime.lastError.message);
                resolve(this._getLocalStorageFallback(keys, defaults));
              } else {
                resolve(Object.assign({}, defaults, result));
              }
            });
          } else {
            resolve(this._getLocalStorageFallback(keys, defaults));
          }
        } catch (e) {
          if (e.message && e.message.includes("Extension context invalidated")) {
            console.warn("[Storage] Extension context invalidated (ekstensi baru di-reload). Menggunakan fallback lokal.");
          } else {
            console.error("[Storage] Get failed:", e);
          }
          resolve(this._getLocalStorageFallback(keys, defaults));
        }
      });
    },
    /**
     * Menyimpan pasangan key-value ke chrome.storage.local
     */
    async set(items) {
      return new Promise((resolve, reject) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(items, () => {
              this._setLocalStorageFallback(items);
              resolve(true);
            });
          } else {
            this._setLocalStorageFallback(items);
            resolve(true);
          }
        } catch (e) {
          this._setLocalStorageFallback(items);
          resolve(true);
        }
      });
    },
    /**
     * Menghapus satu atau beberapa keys dari chrome.storage.local
     */
    async remove(keys) {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(keys, () => resolve(true));
          } else {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach((k) => {
              try {
                localStorage.removeItem(k);
              } catch {
              }
            });
            resolve(true);
          }
        } catch {
          resolve(true);
        }
      });
    },
    _getLocalStorageFallback(keys, defaults = {}) {
      const res = Object.assign({}, defaults);
      if (typeof localStorage === "undefined") return res;
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => {
        try {
          const val = localStorage.getItem(k);
          if (val !== null) {
            try {
              res[k] = JSON.parse(val);
            } catch {
              res[k] = val;
            }
          }
        } catch {
        }
      });
      return res;
    },
    _setLocalStorageFallback(items) {
      if (typeof localStorage === "undefined") return;
      for (const [k, v] of Object.entries(items)) {
        try {
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        } catch {
        }
      }
    },
    /**
     * Auto-migrasi transparan dari localStorage lama ke chrome.storage.local.
     * Dipanggil saat ekstensi pertama kali aktif.
     */
    async autoMigrateLegacyStorage() {
      try {
        if (typeof window === "undefined" || !window.localStorage) return;
        const { mentari_legacy_migrated } = await this.get("mentari_legacy_migrated", { mentari_legacy_migrated: false });
        if (mentari_legacy_migrated) return;
        const legacyKeys = [
          "mentari_auth_token",
          "mentari_user_info",
          "mentari_course_data",
          "geminiApiKey",
          "gemini_model",
          "gemini_quota",
          "mentari_auto_finish_quiz",
          "access"
        ];
        const validModels = [
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-3-flash",
          "gemini-3.1-flash-lite",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.6-flash",
          "gemini-3.7-flash",
          "gemini-3.8-flash"
        ];
        const toMigrate = {};
        let hasData = false;
        const existing = await this.get(["gemini_model", "geminiApiKey"]);
        for (const k of legacyKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              if (k === "geminiApiKey") {
                if (!existing.geminiApiKey) {
                  try {
                    toMigrate[k] = atob(raw);
                  } catch {
                    toMigrate[k] = raw;
                  }
                  hasData = true;
                }
              } else if (k === "gemini_model") {
                let parsedModel = raw;
                try {
                  parsedModel = JSON.parse(raw);
                } catch {
                }
                if (!existing.gemini_model && validModels.includes(parsedModel)) {
                  toMigrate[k] = parsedModel;
                  hasData = true;
                }
              } else {
                if (!existing[k]) {
                  toMigrate[k] = JSON.parse(raw);
                  hasData = true;
                }
              }
            } catch {
              if (!existing[k]) {
                toMigrate[k] = raw;
                hasData = true;
              }
            }
          }
        }
        toMigrate.mentari_legacy_migrated = true;
        await this.set(toMigrate);
        console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };

  // src/utils/toast.js
  var ToastManager = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.container = null;
      this._init();
    }
    _init() {
      if (typeof document === "undefined") return;
      this.host = document.createElement("div");
      this.host.id = "mentari-toast-host";
      this.host.style.position = "fixed";
      this.host.style.top = "20px";
      this.host.style.right = "20px";
      this.host.style.zIndex = "2147483647";
      this.host.style.pointerEvents = "none";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      .toast-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
      }
      .toast-card {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(18, 18, 20, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        color: #f0f0f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .toast-card.hide {
        opacity: 0;
        transform: translateX(30px);
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .toast-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }
      .toast-content {
        flex-grow: 1;
      }
      .toast-title {
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 2px;
        color: #fff;
      }
      .toast-message {
        color: #b0b3b8;
        font-size: 12px;
        word-break: break-word;
      }
      .toast-close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #777;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
      }
      .toast-close:hover {
        color: #fff;
      }
      /* Variants */
      .toast-info { border-left: 3px solid #3b82f6; }
      .toast-info .toast-icon { color: #3b82f6; }
      .toast-success { border-left: 3px solid #10b981; }
      .toast-success .toast-icon { color: #10b981; }
      .toast-warning { border-left: 3px solid #f59e0b; }
      .toast-warning .toast-icon { color: #f59e0b; }
      .toast-error { border-left: 3px solid #ef4444; }
      .toast-error .toast-icon { color: #ef4444; }
    `;
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      this.shadow.appendChild(style);
      this.shadow.appendChild(this.container);
      const mount = () => {
        if (document.body && !document.getElementById("mentari-toast-host")) {
          document.body.appendChild(this.host);
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
      } else {
        mount();
      }
    }
    _getIconSvg(type) {
      switch (type) {
        case "success":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        case "warning":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        case "error":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        default:
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }
    }
    show(options) {
      if (!this.container) return;
      if (document.body && !this.host.parentElement) {
        document.body.appendChild(this.host);
      }
      const {
        title = "",
        message = "",
        type = "info",
        // 'info' | 'success' | 'warning' | 'error'
        duration = 4500
      } = typeof options === "string" ? { message: options } : options;
      const card = document.createElement("div");
      card.className = `toast-card toast-${type}`;
      card.innerHTML = `
      <div class="toast-icon">${this._getIconSvg(type)}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ""}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Tutup">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
      const closeBtn = card.querySelector(".toast-close");
      const dismiss = () => {
        card.classList.add("hide");
        setTimeout(() => {
          if (card.parentElement) card.remove();
        }, 250);
      };
      closeBtn.addEventListener("click", dismiss);
      if (duration > 0) {
        setTimeout(dismiss, duration);
      }
      this.container.appendChild(card);
    }
    success(message, title = "Berhasil") {
      this.show({ title, message, type: "success" });
    }
    error(message, title = "Terjadi Kesalahan") {
      this.show({ title, message, type: "error", duration: 6e3 });
    }
    warning(message, title = "Perhatian") {
      this.show({ title, message, type: "warning" });
    }
    info(message, title = "Informasi") {
      this.show({ title, message, type: "info" });
    }
  };
  var Toast = new ToastManager();

  // src/content/apiKeyManager.js
  var ApiKeyManager = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.isOpen = false;
      this._init();
    }
    async _init() {
      await Storage.autoMigrateLegacyStorage();
      window.addEventListener("mentari-update-api-key", () => {
        this.openModal();
      });
      const { geminiApiKey } = await Storage.get("geminiApiKey");
      if (!geminiApiKey) {
        setTimeout(() => this.openModal(), 1200);
      }
    }
    _buildModalDOM() {
      if (this.host) return;
      this.host = document.createElement("div");
      this.host.id = "mentari-api-key-host";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
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
      const overlay = document.createElement("div");
      overlay.className = "overlay";
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
      const inputKey = this.shadow.getElementById("input-api-key");
      const btnSave = this.shadow.getElementById("btn-save");
      const btnCancel = this.shadow.getElementById("btn-cancel");
      const btnClose = this.shadow.getElementById("btn-close");
      const btnToggleVis = this.shadow.getElementById("btn-toggle-vis");
      btnToggleVis.addEventListener("click", () => {
        inputKey.type = inputKey.type === "password" ? "text" : "password";
      });
      const close = () => this.closeModal();
      btnCancel.addEventListener("click", close);
      btnClose.addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      btnSave.addEventListener("click", async () => {
        const keyVal = inputKey.value.trim();
        if (!keyVal) {
          Toast.warning("Silakan masukkan API Key Gemini Anda.");
          return;
        }
        btnSave.disabled = true;
        btnSave.textContent = "Memverifikasi...";
        chrome.runtime.sendMessage({
          action: "validateGeminiApiKey",
          apiKey: keyVal
        }, async (res) => {
          btnSave.disabled = false;
          btnSave.textContent = "Simpan & Uji Key";
          if (res && res.valid) {
            await Storage.set({ geminiApiKey: keyVal });
            window.dispatchEvent(new CustomEvent("gemini-api-key-updated", {
              detail: { apiKey: keyVal }
            }));
            Toast.success("API Key valid dan berhasil dikoneksikan ke Google Gemini!");
            close();
          } else {
            Toast.error(res ? res.message : "Verifikasi API Key gagal.");
          }
        });
      });
    }
    async openModal() {
      this._buildModalDOM();
      const overlay = this.shadow.querySelector(".overlay");
      const inputKey = this.shadow.getElementById("input-api-key");
      const { geminiApiKey } = await Storage.get("geminiApiKey");
      if (geminiApiKey) inputKey.value = geminiApiKey;
      overlay.classList.add("open");
      this.isOpen = true;
    }
    closeModal() {
      if (!this.shadow) return;
      const overlay = this.shadow.querySelector(".overlay");
      if (overlay) overlay.classList.remove("open");
      this.isOpen = false;
    }
  };
  var apiKeyManager = new ApiKeyManager();
})();
