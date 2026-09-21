(() => {
  // src/utils/humanizer.js
  var Humanizer = {
    /**
     * Jeda waktu statis
     */
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    /**
     * Jeda waktu acak (jitter) dalam rentang min dan max
     */
    randomDelay(minMs = 1500, maxMs = 4500) {
      const jitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
      return this.delay(jitter);
    },
    /**
     * Menghitung jeda baca natural berdasarkan panjang teks soal kuis
     * Asumsi kecepatan baca normal mahasiswa: ~180-220 kata per menit
     */
    async readingPacing(text = "", minBaseMs = 3e3, maxBaseMs = 8e3) {
      const wordCount = (text || "").trim().split(/\s+/).filter(Boolean).length;
      const calculated = minBaseMs + wordCount * 250;
      const targetMs = Math.min(Math.max(calculated, minBaseMs), maxBaseMs);
      const variance = (Math.random() * 0.4 - 0.2) * targetMs;
      const finalDelay = Math.round(targetMs + variance);
      await this.delay(finalDelay);
      return finalDelay;
    },
    /**
     * Mensimulasikan klik mouse natural manusia dengan scrolling halus
     * dan rangkaian event mouse lengkap (pointerdown -> mousedown -> focus -> click).
     */
    async naturalClick(element) {
      if (!element) return false;
      try {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      } catch {
      }
      await this.delay(300 + Math.random() * 300);
      const rect = element.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2 + (Math.random() * 4 - 2);
      const clientY = rect.top + rect.height / 2 + (Math.random() * 4 - 2);
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY
      };
      try {
        element.dispatchEvent(new PointerEvent("pointerdown", eventOpts));
        element.dispatchEvent(new MouseEvent("mousedown", eventOpts));
        if (typeof element.focus === "function") element.focus();
        await this.delay(50 + Math.random() * 70);
        element.dispatchEvent(new PointerEvent("pointerup", eventOpts));
        element.dispatchEvent(new MouseEvent("mouseup", eventOpts));
        element.dispatchEvent(new MouseEvent("click", eventOpts));
        if (element.tagName === "INPUT" && !element.checked) {
          element.checked = true;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } catch (e) {
        element.click();
      }
      return true;
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
    /**
     * Mengambil semua data dari chrome.storage.local (atau fallback localStorage)
     */
    async getAll() {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(null, (result) => {
              if (chrome.runtime?.lastError) {
                console.log("[Storage] Info reading all storage:", chrome.runtime.lastError.message);
                resolve(this._getAllLocalStorageFallback());
              } else {
                resolve(result || {});
              }
            });
          } else {
            resolve(this._getAllLocalStorageFallback());
          }
        } catch (e) {
          resolve(this._getAllLocalStorageFallback());
        }
      });
    },
    _getAllLocalStorageFallback() {
      const res = {};
      if (typeof localStorage === "undefined") return res;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
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
      }
      return res;
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

  // src/content/kuisioner.js
  var KuisionerAssistant = class {
    constructor() {
      this.isProcessing = false;
      this.shadow = null;
      this._init();
    }
    _init() {
      console.log("[Mentari Mod] Kuisioner Assistant siap.");
      this._injectFloatingCard();
      this._checkAndInitAutoPilot();
    }
    _injectFloatingCard() {
      if (document.getElementById("mentari-kuisioner-card-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-kuisioner-card-host";
      host.style.position = "fixed";
      host.style.bottom = "24px";
      host.style.right = "24px";
      host.style.zIndex = "2147483640";
      this.shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
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
      const card = document.createElement("div");
      card.className = "kues-card";
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
      const btnIya = this.shadow.getElementById("btn-auto-iya");
      const btnTidak = this.shadow.getElementById("btn-auto-tidak");
      const btnAI = this.shadow.getElementById("btn-auto-ai");
      const statusText = this.shadow.getElementById("kues-status");
      const setButtonsDisabled = (disabled) => {
        btnIya.disabled = disabled;
        btnTidak.disabled = disabled;
        btnAI.disabled = disabled;
      };
      btnIya.addEventListener("click", async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;
        setButtonsDisabled(true);
        statusText.textContent = 'Mengisi opsi "Ya / Sangat Baik"...';
        try {
          await this.fillKuisioner("iya");
          statusText.textContent = "Selesai diisi dengan opsi Ya!";
          Toast.success("Kuisioner berhasil diisi (Mode Auto Iya)!");
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error("Gagal mengisi: " + e.message);
        } finally {
          this.isProcessing = false;
          setButtonsDisabled(false);
        }
      });
      btnTidak.addEventListener("click", async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;
        setButtonsDisabled(true);
        statusText.textContent = 'Mengisi opsi "Tidak"...';
        try {
          await this.fillKuisioner("tidak");
          statusText.textContent = "Selesai diisi dengan opsi Tidak.";
          Toast.info("Kuisioner berhasil diisi (Mode Auto Tidak).");
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error("Gagal mengisi: " + e.message);
        } finally {
          this.isProcessing = false;
          setButtonsDisabled(false);
        }
      });
      btnAI.addEventListener("click", async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;
        setButtonsDisabled(true);
        statusText.textContent = "Gemini AI sedang menganalisis kuesioner...";
        try {
          await this.fillKuisioner("ai");
          statusText.textContent = "Selesai dianalisis & diisi AI!";
          Toast.success("Kuisioner berhasil diisi cerdas oleh Gemini AI!");
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error("Gagal mengisi via AI: " + e.message);
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
      const validGroups = [];
      for (const group of radioGroups) {
        const radios = group.querySelectorAll('input[type="radio"], .MuiRadio-root');
        if (radios.length > 0) {
          validGroups.push({ groupEl: group, radios: Array.from(radios) });
        }
      }
      if (validGroups.length === 0) {
        const allRadios = document.querySelectorAll('input[type="radio"]');
        const byName = {};
        allRadios.forEach((r) => {
          const name = r.name || "default";
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
        if (mode === "iya") {
          targetRadio = this._findOptionByKeywords(radios, ["ya", "setuju", "sangat baik", "baik", "benar", "positif"]) || radios[radios.length - 1];
        } else if (mode === "tidak") {
          targetRadio = this._findOptionByKeywords(radios, ["tidak", "kurang", "salah", "buruk", "negatif"]) || radios[0];
        } else if (mode === "ai") {
          const questionText = item.groupEl ? (item.groupEl.textContent || "").trim().replace(/\s+/g, " ") : "";
          if (questionText.length > 5) {
            const optionsText = radios.map((r, idx) => {
              const label = r.closest("label")?.textContent?.trim() || r.value || `Opsi ${idx + 1}`;
              return `${idx}: ${label}`;
            }).join(", ");
            try {
              const prompt = `Dalam kuesioner evaluasi perkuliahan: "${questionText}". Opsi: [${optionsText}]. Pilih indeks opsi paling konstruktif dan positif. Jawab HANYA angka indeks saja (contoh: 0 atau 1).`;
              const res = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                  action: "generateGeminiContent",
                  prompt,
                  systemInstruction: "Jawab HANYA satu angka indeks opsi pilihan."
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
            } catch {
            }
          }
          if (!targetRadio) {
            targetRadio = radios[radios.length - 1];
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
      await this._fillFeedbackTextarea(mode);
      if (filledCount === 0) {
        throw new Error("Tidak ditemukan butir kuesioner pada halaman ini.");
      }
    }
    _findOptionByKeywords(radios, keywords) {
      for (const r of radios) {
        const label = (r.closest("label")?.textContent || r.value || "").toLowerCase();
        if (keywords.some((kw) => label.includes(kw))) {
          return r;
        }
      }
      return null;
    }
    async _fillFeedbackTextarea(mode) {
      const textareas = document.querySelectorAll('textarea, input[type="text"]:not([readonly])');
      if (textareas.length === 0) return;
      const positiveFeedbacks = [
        "Pembelajaran sangat interaktif dan materi disampaikan dengan sangat jelas.",
        "Dosen sangat menguasai materi perkuliahan dan responsif terhadap mahasiswa.",
        "Penjelasan materi mudah dipahami, sistematis, dan tepat waktu.",
        "Materi perkuliahan yang diberikan sangat relevan dan bermanfaat untuk masa depan."
      ];
      const criticalFeedbacks = [
        "Perlu peningkatan dalam kejelasan materi dan alokasi waktu diskusi.",
        "Mohon materi pengantar dapat diberikan lebih awal sebelum perkuliahan dimulai.",
        "Diharapkan forum tanya jawab dapat ditanggapi lebih cepat.",
        "Perlu penambahan contoh studi kasus praktis pada setiap pertemuan."
      ];
      for (const ta of textareas) {
        if (!ta.value.trim()) {
          let text = "";
          if (mode === "iya") {
            text = positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)];
          } else if (mode === "tidak") {
            text = criticalFeedbacks[Math.floor(Math.random() * criticalFeedbacks.length)];
          } else if (mode === "ai") {
            try {
              const res = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                  action: "generateGeminiContent",
                  prompt: "Tulis satu kalimat singkat kesan dan saran positif konstruktif untuk dosen pengampu mata kuliah perkuliahan UNPAM. Maksimal 15 kata, bahasa santun.",
                  systemInstruction: "Tulis satu kalimat saja tanpa tanda petik."
                }, resolve);
              });
              if (res && res.success && res.text) {
                text = res.text.trim();
              }
            } catch {
            }
            if (!text) text = positiveFeedbacks[0];
          }
          ta.value = text;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          ta.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
    // ─── Auto-Pilot Kuesioner Runner ──────────────────────────────────────────────
    async _checkAndInitAutoPilot() {
      try {
        const store = await Storage.get("mentari_auto_pilot_state");
        const state = store?.mentari_auto_pilot_state;
        if (!state || !state.active || !Array.isArray(state.queue)) {
          return;
        }
        if (state.currentIndex >= state.queue.length) {
          await Storage.set({
            mentari_auto_pilot_state: { ...state, active: false, finished: true }
          });
          Toast.success("Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!");
          return;
        }
        const currentItem = state.queue[state.currentIndex];
        if (!currentItem) return;
        const urlMatch = window.location.pathname.match(/\/kuesioner\/([^\/\?]+)/);
        const currentUrlKuesId = urlMatch ? urlMatch[1] : null;
        if (currentUrlKuesId && currentItem.id && currentUrlKuesId !== currentItem.id) {
          console.warn(`[Auto-Pilot Guard] ID kuesioner aktif (${currentUrlKuesId}) tidak cocok dengan antrean (${currentItem.id}). Redirect ke item yang benar...`);
          window.location.replace(currentItem.url);
          return;
        }
        if (currentItem.type !== "KUESIONER" && currentItem.url) {
          window.location.replace(currentItem.url);
          return;
        }
        console.log(`[Auto-Pilot] Memulai Kuesioner ${state.currentIndex + 1}/${state.queue.length}:`, currentItem);
        this._executeAutoPilotKuesioner(state, currentItem);
      } catch (e) {
        console.error("[Auto-Pilot Kuesioner Error]", e);
      }
    }
    async _executeAutoPilotKuesioner(state, currentItem) {
      const statusText = this.shadow?.getElementById("kues-status");
      const titleEl = this.shadow?.querySelector(".kues-title");
      if (titleEl) {
        titleEl.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        Auto-Pilot (${state.currentIndex + 1}/${state.queue.length})
      `;
      }
      if (statusText) {
        statusText.textContent = `Mengisi kuesioner otomatis: ${currentItem.sectionName || ""} (${currentItem.courseTitle || ""})...`;
      }
      await Humanizer.randomDelay(1200, 1800);
      try {
        await this.fillKuisioner("iya");
        if (statusText) statusText.textContent = "Kuesioner terisi. Mengirim jawaban...";
        await Humanizer.randomDelay(800, 1400);
        const submitBtn = this._findSubmitButton();
        if (submitBtn) {
          await Humanizer.naturalClick(submitBtn);
          await this._confirmDialogIfPresent();
        }
        await Humanizer.randomDelay(1200, 2e3);
        state.currentIndex++;
        await Storage.set({ mentari_auto_pilot_state: state });
        const cooldown = state.cooldownSec || 15;
        for (let s = cooldown; s > 0; s--) {
          const curStore = await Storage.get("mentari_auto_pilot_state");
          if (!curStore?.mentari_auto_pilot_state?.active) {
            if (statusText) statusText.textContent = "Auto-Pilot dibatalkan.";
            return;
          }
          if (statusText) {
            statusText.textContent = `Kuesioner selesai! Istirahat ${s} detik sebelum lanjut...`;
          }
          await new Promise((r) => setTimeout(r, 1e3));
        }
        if (state.currentIndex < state.queue.length) {
          const nextItem = state.queue[state.currentIndex];
          if (statusText) statusText.textContent = `Menuju ke: ${nextItem.name || nextItem.sectionName}...`;
          setTimeout(() => {
            window.location.replace(nextItem.url);
          }, 500);
        } else {
          state.active = false;
          state.finished = true;
          await Storage.set({ mentari_auto_pilot_state: state });
          if (statusText) statusText.textContent = "Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!";
          Toast.success("Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!");
        }
      } catch (err) {
        console.error("[Auto-Pilot Kuesioner Execution Failed]", err);
        if (statusText) statusText.textContent = `Peringatan: ${err.message}. Mencoba lanjut...`;
        Toast.warning(`Kuesioner: ${err.message}`);
        state.currentIndex++;
        await Storage.set({ mentari_auto_pilot_state: state });
        setTimeout(() => {
          if (state.currentIndex < state.queue.length) {
            window.location.replace(state.queue[state.currentIndex].url);
          }
        }, 3e3);
      }
    }
    _findSubmitButton() {
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], .MuiButton-root'));
      const submitKeywords = ["simpan", "kirim", "submit", "selesai", "kirim kuesioner", "kirim kuisioner"];
      for (const btn of candidates) {
        const text = (btn.textContent || btn.value || "").trim().toLowerCase();
        if (submitKeywords.some((kw) => text.includes(kw))) {
          return btn;
        }
      }
      return null;
    }
    async _confirmDialogIfPresent() {
      await Humanizer.randomDelay(600, 1e3);
      const dialogs = document.querySelectorAll('[role="dialog"], .MuiDialog-root, .swal2-popup, .MuiModal-root');
      for (const d of dialogs) {
        const buttons = d.querySelectorAll("button, .MuiButton-root");
        const confirmKeywords = ["ya", "setuju", "kirim", "simpan", "lanjutkan", "ok", "yes", "benar"];
        for (const b of buttons) {
          const text = (b.textContent || "").trim().toLowerCase();
          if (confirmKeywords.some((kw) => text === kw || text.startsWith(kw))) {
            await Humanizer.naturalClick(b);
            return true;
          }
        }
      }
      return false;
    }
  };
  if (typeof window !== "undefined") {
    new KuisionerAssistant();
  }
})();
