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
     * Dioptimalkan agar gesit dan responsif (350 - 600ms) tanpa membebani browser
     */
    async readingPacing(text = "", minBaseMs = 350, maxBaseMs = 700) {
      const wordCount = (text || "").trim().split(/\s+/).filter(Boolean).length;
      const calculated = minBaseMs + wordCount * 15;
      const targetMs = Math.min(Math.max(calculated, minBaseMs), maxBaseMs);
      const variance = (Math.random() * 0.2 - 0.1) * targetMs;
      const finalDelay = Math.round(targetMs + variance);
      await this.delay(finalDelay);
      return finalDelay;
    },
    /**
     * Mensimulasikan klik mouse natural manusia dengan scrolling halus
     * dan rangkaian event mouse lengkap (pointerdown -> mousedown -> focus -> click).
     * Mendukung mode fast untuk transisi cepat kuis.
     */
    async naturalClick(element, fast = false) {
      if (!element) return false;
      try {
        element.scrollIntoView({
          behavior: fast ? "auto" : "smooth",
          block: "center",
          inline: "nearest"
        });
      } catch {
      }
      await this.delay(fast ? 40 + Math.random() * 40 : 150 + Math.random() * 150);
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
        await this.delay(fast ? 20 + Math.random() * 20 : 40 + Math.random() * 30);
        element.dispatchEvent(new PointerEvent("pointerup", eventOpts));
        element.dispatchEvent(new MouseEvent("mouseup", eventOpts));
        if (typeof element.click === "function") {
          element.click();
        } else {
          element.dispatchEvent(new MouseEvent("click", eventOpts));
        }
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

  // src/utils/models.js
  var ACTIVE_FREE_MODELS = [
    {
      id: "gemini-4-hydrogen",
      name: "Gemini 4 Hydrogen",
      label: "Gemini 4 Hydrogen (Terbaru - Rekomendasi Free Tier)",
      desc: "Generasi 4 terbaru gratis di AI Studio, konteks 1M token, akurasi & kecepatan tinggi",
      thinkingLevels: ["low", "medium", "high", "xhigh"],
      defaultThinkingLevel: "low"
    },
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      label: "Gemini 3.8 Flash (Flagship Gen-3)",
      desc: "Flagship generasi 3 di Free Tier untuk penalaran kompleks",
      thinkingLevels: ["low", "medium", "high"],
      defaultThinkingLevel: "low"
    },
    {
      id: "gemini-3.6-flash",
      name: "Gemini 3.6 Flash",
      label: "Gemini 3.6 Flash (Seimbang)",
      desc: "Seimbang antara kecepatan respon dan pemahaman teks",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    },
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash-Lite",
      label: "Gemini 3.5 Flash-Lite (Kuota Tinggi)",
      desc: "Model ringan untuk eksekusi berulang dengan kuota harian tinggi",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    },
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash-Lite",
      label: "Gemini 3.1 Flash-Lite (Ringan & Cepat)",
      desc: "Latensi rendah dan hemat token di Free Tier",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      label: "Gemini 3 Flash Preview (Free Tier)",
      desc: "Varian preview cepat yang tersedia gratis di AI Studio",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    }
  ];
  var VALID_FREE_MODEL_IDS = ACTIVE_FREE_MODELS.map((m) => m.id);

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
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(items, () => {
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
      const sensitiveKeys = [
        "geminiApiKey",
        "geminiApiKeys",
        "mentari_auth_token",
        "mentari_smart_question_memory",
        "mentari_completed_quiz_ids",
        "mentari_auto_pilot_state"
      ];
      for (const [k, v] of Object.entries(items)) {
        if (sensitiveKeys.includes(k)) continue;
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
        const validModels = VALID_FREE_MODEL_IDS;
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
        try {
          localStorage.removeItem("geminiApiKey");
        } catch {
        }
        console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };

  // src/utils/theme.js
  var ThemeHelper = {
    detectSystemTheme() {
      try {
        if (typeof window !== "undefined" && window.matchMedia) {
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
      } catch {
      }
      return "light";
    },
    async getEffectiveTheme() {
      try {
        const res = await Storage.get("mentari_theme", { mentari_theme: null });
        const saved = res?.mentari_theme;
        if (saved === "light" || saved === "dark") {
          return saved;
        }
      } catch {
      }
      return this.detectSystemTheme();
    },
    async setManualTheme(theme) {
      if (theme !== "light" && theme !== "dark") return;
      await Storage.set({ mentari_theme: theme });
      try {
        window.dispatchEvent(new CustomEvent("mentari-theme-changed", { detail: { theme } }));
      } catch {
      }
    },
    watchTheme(callback) {
      if (typeof callback !== "function") return;
      try {
        if (typeof window !== "undefined" && window.matchMedia) {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          const onMediaChange = async () => {
            const res = await Storage.get("mentari_theme", { mentari_theme: null });
            if (!res?.mentari_theme) {
              callback(this.detectSystemTheme());
            }
          };
          if (mq.addEventListener) mq.addEventListener("change", onMediaChange);
          else if (mq.addListener) mq.addListener(onMediaChange);
        }
      } catch {
      }
      try {
        window.addEventListener("mentari-theme-changed", (e) => {
          if (e.detail?.theme) callback(e.detail.theme);
        });
      } catch {
      }
      try {
        if (Storage.isContextValid() && chrome.storage?.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes.mentari_theme?.newValue) {
              callback(changes.mentari_theme.newValue);
            }
          });
        }
      } catch {
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
      /* Light Theme */
      .toast-card.theme-light {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
        color: #0f172a;
      }
      .toast-card.theme-light .toast-title { color: #0f172a; }
      .toast-card.theme-light .toast-message { color: #475569; }
      .toast-card.theme-light .toast-close:hover { color: #0f172a; }
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
      const isLightSync = ThemeHelper.detectSystemTheme() === "light";
      card.className = `toast-card toast-${type} ${isLightSync ? "theme-light" : ""}`;
      ThemeHelper.getEffectiveTheme().then((t) => {
        card.classList.toggle("theme-light", t === "light");
      }).catch(() => {
      });
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

  // src/content/QuickSurvey.js
  var QuickSurveyAssistant = class {
    constructor() {
      this.currentTheme = ThemeHelper.detectSystemTheme();
      this.shadow = null;
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod] MyUnpam Quick Survey Assistant aktif.");
      this.currentTheme = await ThemeHelper.getEffectiveTheme();
      ThemeHelper.watchTheme((t) => {
        this.currentTheme = t;
        this._applyTheme(t);
      });
      window.addEventListener("mentari-survey-trigger", async () => {
        try {
          await this.fillSurvey();
        } catch (e) {
          Toast.error("Gagal mengisi survei: " + e.message);
        }
      });
      this._injectFloatingButtonIfNeeded();
    }
    _applyTheme(theme = this.currentTheme) {
      const isLight = theme === "light";
      this.shadow?.querySelector(".btn-survey-fill")?.classList.toggle("theme-light", isLight);
    }
    _injectFloatingButtonIfNeeded() {
      setTimeout(() => {
        if (document.getElementById("mentari-myunpam-dock-host") || document.getElementById("mentari-survey-btn-host")) {
          return;
        }
        const host = document.createElement("div");
        host.id = "mentari-survey-btn-host";
        host.style.position = "fixed";
        host.style.bottom = "24px";
        host.style.right = "24px";
        host.style.zIndex = "2147483640";
        const shadow = host.attachShadow({ mode: "closed" });
        this.shadow = shadow;
        const style = document.createElement("style");
        style.textContent = `
        .btn-survey-fill {
          background: rgba(13, 17, 28, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: #d1fae5;
          border: 1px solid rgba(16, 185, 129, 0.4);
          padding: 10px 18px;
          border-radius: 9999px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-survey-fill:hover {
          background: #059669;
          color: #fff;
          border-color: #10b981;
          transform: translateY(-2px);
          box-shadow: 0 14px 35px rgba(16, 185, 129, 0.4);
        }
        .btn-survey-fill.theme-light {
          background: rgba(255, 255, 255, 0.96);
          color: #1e3a8a;
          border-color: #cbd5e1;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
        }
        .btn-survey-fill.theme-light:hover {
          background: #1e3a8a;
          color: #ffffff;
          border-color: #1e3a8a;
          box-shadow: 0 14px 32px rgba(30, 58, 138, 0.25);
        }
        .btn-survey-fill:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `;
        const btn = document.createElement("button");
        btn.className = `btn-survey-fill ${this.currentTheme === "light" ? "theme-light" : ""}`;
        btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Auto-Isi Survei MyUnpam
      `;
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          btn.textContent = "Mengisi survei...";
          try {
            await this.fillSurvey();
          } catch (e) {
            Toast.error("Gagal mengisi survei: " + e.message);
          } finally {
            btn.disabled = false;
            btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Auto-Isi Survei MyUnpam
          `;
          }
        });
        shadow.appendChild(style);
        shadow.appendChild(btn);
        document.body.appendChild(host);
        this._applyTheme(this.currentTheme);
      }, 400);
    }
    async fillSurvey() {
      const radioGroups = {};
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => {
        const name = r.name || "default_group";
        if (!radioGroups[name]) radioGroups[name] = [];
        radioGroups[name].push(r);
      });
      let filledCount = 0;
      for (const groupName in radioGroups) {
        const groupRadios = radioGroups[groupName];
        let targetRadio = null;
        for (const r of groupRadios) {
          const val = (r.value || "").toLowerCase();
          const labelText = (r.closest("label")?.textContent || r.parentElement?.textContent || "").toLowerCase();
          if (val === "4" || val === "5" || val === "sangat baik" || val === "sangat setuju" || labelText.includes("sangat baik") || labelText.includes("sangat setuju") || labelText.includes("sangat puas")) {
            targetRadio = r;
            break;
          }
        }
        if (!targetRadio && groupRadios.length > 0) {
          targetRadio = groupRadios[groupRadios.length - 1];
        }
        if (targetRadio && !targetRadio.checked) {
          await Humanizer.naturalClick(targetRadio);
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
          targetRadio.dispatchEvent(new Event("input", { bubbles: true }));
          await Humanizer.randomDelay(80, 160);
          filledCount++;
        }
      }
      const customRatingBtns = document.querySelectorAll(".rating-btn, button[data-score], .btn-score");
      for (const el of customRatingBtns) {
        const score = el.getAttribute("data-score") || el.textContent.trim();
        if (score === "4" || score === "5" || el.classList.contains("rating-max")) {
          await Humanizer.naturalClick(el);
          await Humanizer.randomDelay(80, 160);
          filledCount++;
        }
      }
      const textareas = document.querySelectorAll("textarea");
      let textFilled = 0;
      const feedbackList = [
        "Proses pembelajaran dan pelayanan akademik sudah sangat baik, komunikatif, dan memfasilitasi kebutuhan mahasiswa dengan optimal.",
        "Fasilitas dan penyampaian materi perkuliahan sangat memuaskan dan mendukung efektivitas studi.",
        "Sangat baik dan profesional. Semoga standar mutu ini terus dipertahankan dan ditingkatkan."
      ];
      for (const ta of textareas) {
        if (!ta.value.trim()) {
          const randomFeedback = feedbackList[Math.floor(Math.random() * feedbackList.length)];
          ta.value = randomFeedback;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          ta.dispatchEvent(new Event("change", { bubbles: true }));
          textFilled++;
        }
      }
      if (filledCount > 0 || textFilled > 0) {
        Toast.success(`Survei akademik berhasil diisi otomatis (${filledCount} opsi, ${textFilled} saran).`, "Survei Terisi");
      } else {
        Toast.warning("Tidak ditemukan form survei aktif pada halaman saat ini.", "Info Survei");
      }
    }
  };
  if (typeof window !== "undefined") {
    new QuickSurveyAssistant();
  }
})();
