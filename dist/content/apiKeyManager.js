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
        const validModels = [
          "gemini-4-hydrogen",
          "gemini-3.8-flash",
          "gemini-3.6-flash",
          "gemini-3.5-flash-lite",
          "gemini-3.1-flash-lite",
          "gemini-3-flash-preview"
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
  function getBrandSvgMarkup(size = 20) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">
    <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
  </svg>`;
  }
  function getBrandBadgeMarkup(size = 52) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="mm-badge-navy-${size}" x1="16" y1="8" x2="112" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1E3A8A"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <linearGradient id="mm-badge-amber-${size}" x1="64" y1="14" x2="64" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="61" fill="url(#mm-badge-navy-${size})"/>
    <circle cx="64" cy="64" r="54.5" fill="#F59E0B"/>
    <circle cx="64" cy="64" r="50.5" fill="#FFFDF8"/>
    <path d="M64 15L73.5 50.5L111 59L73.5 67.5L64 111L54.5 67.5L17 59L54.5 50.5Z" fill="#1E3A8A"/>
    <g fill="url(#mm-badge-amber-${size})">
      <path d="M18.03 49.23 A47 47 0 0 1 25.98 31.37 L44.18 44.60 A24.5 24.5 0 0 0 40.04 53.91 Z"/>
      <path d="M30.77 25.77 A47 47 0 0 1 47.93 14.83 L55.62 35.98 A24.5 24.5 0 0 0 46.68 41.68 Z"/>
      <path d="M80.07 14.83 A47 47 0 0 1 97.23 25.77 L81.32 41.68 A24.5 24.5 0 0 0 72.38 35.98 Z"/>
      <path d="M102.02 31.37 A47 47 0 0 1 109.97 49.23 L87.96 53.91 A24.5 24.5 0 0 0 83.82 44.60 Z"/>
    </g>
    <path d="M27 84.5C38 77.5 51.5 79 64 87V102C51.5 94.5 38.5 93 29 99L27 84.5Z" fill="#0F172A"/>
    <path d="M101 84.5C90 77.5 76.5 79 64 87V102C76.5 94.5 89.5 93 99 99L101 84.5Z" fill="#3B5998"/>
    <circle cx="64" cy="59" r="21" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="3.2"/>
    <circle cx="64" cy="59" r="16" fill="#FDE68A"/>
    <g fill="#D97706">
      <path d="M62.5 57.5C58 53 54 48 53.5 46.5C56 46 60.5 50.5 62.5 57.5Z"/>
      <path d="M65.5 57.5C70 53 74 48 74.5 46.5C72 46 67.5 50.5 65.5 57.5Z"/>
      <path d="M62.5 60.5C58 65 54 70 53.5 71.5C56 72 60.5 67.5 62.5 60.5Z"/>
      <path d="M65.5 60.5C70 65 74 70 74.5 71.5C72 72 67.5 67.5 65.5 60.5Z"/>
    </g>
    <g fill="#FFFFFF">
      <path d="M64 44.5C67 47.5 67 51.5 64 54.5C61 51.5 61 47.5 64 44.5Z"/>
      <path d="M64 73.5C61 70.5 61 66.5 64 63.5C67 66.5 67 70.5 64 73.5Z"/>
      <path d="M49.5 59C52.5 56 56.5 56 59.5 59C56.5 62 52.5 62 49.5 59Z"/>
      <path d="M78.5 59C75.5 62 71.5 62 68.5 59C71.5 56 75.5 56 78.5 59Z"/>
    </g>
  </svg>`;
  }

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

  // src/content/apiKeyManager.js
  var ApiKeyManager = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.isOpen = false;
      this.currentView = "apikey";
      this.currentTheme = ThemeHelper.detectSystemTheme();
      this._windowFocusGuard = null;
      this._init();
    }
    async _init() {
      await Storage.autoMigrateLegacyStorage();
      this.currentTheme = await ThemeHelper.getEffectiveTheme();
      ThemeHelper.watchTheme((newTheme) => {
        this.currentTheme = newTheme;
        this._applyTheme();
      });
      window.addEventListener("mentari-update-api-key", () => {
        this.openModal("apikey");
      });
      const store = await Storage.get([
        "geminiApiKey",
        "geminiApiKeys",
        "mentari_onboarding_completed"
      ]);
      const hasKey = Boolean(
        store.geminiApiKey || Array.isArray(store.geminiApiKeys) && store.geminiApiKeys.length > 0
      );
      const isOnboarded = store.mentari_onboarding_completed === true;
      if (hasKey && !isOnboarded) {
        await Storage.set({ mentari_onboarding_completed: true });
        return;
      }
      if (!isOnboarded && !hasKey) {
        setTimeout(() => this.openModal("welcome"), 900);
      } else if (!hasKey) {
        setTimeout(() => this.openModal("apikey"), 1100);
      }
    }
    _maskKey(key) {
      if (!key || typeof key !== "string") return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      if (key.length <= 12) return key.slice(0, 4) + "..." + key.slice(-2);
      return key.slice(0, 7) + "..." + key.slice(-4);
    }
    _applyTheme() {
      if (!this.shadow) return;
      const overlay = this.shadow.querySelector(".overlay");
      const modal = this.shadow.querySelector(".modal");
      const isLight = this.currentTheme === "light";
      overlay?.classList.toggle("theme-light", isLight);
      modal?.classList.toggle("theme-light", isLight);
    }
    _buildModalDOM() {
      if (this.host) return;
      this.host = document.createElement("div");
      this.host.id = "mentari-api-key-host";
      this.host.style.cssText = "position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: auto !important; display: none;";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; }

      @keyframes modalReveal {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes emblemSettle {
        from { opacity: 0; transform: scale(0.86); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes stepSlideIn {
        from { opacity: 0; transform: translateX(12px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes rowFadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(9, 10, 14, 0.72);
        backdrop-filter: blur(6px);
        z-index: 2147483647 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.22s ease, visibility 0.22s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 16px;
      }
      .overlay.theme-light {
        background: rgba(15, 23, 42, 0.42);
      }
      .overlay.open {
        opacity: 1;
        visibility: visible;
      }

      .modal {
        width: 488px;
        max-width: 100%;
        background: #141519;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
        overflow: hidden;
        color: #f1f5f9;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      .overlay.open .modal {
        animation: modalReveal 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      /* Light Theme Surface */
      .modal.theme-light {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 24px 56px rgba(15, 23, 42, 0.16);
        color: #0f172a;
      }

      .header {
        padding: 16px 22px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #18191e;
      }
      .modal.theme-light .header {
        background: #f8fafc;
        border-bottom-color: #e2e8f0;
      }

      .header-title {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .modal.theme-light .header-title {
        color: #0f172a;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 6px;
        display: flex;
        border-radius: 8px;
        transition: background-color 0.18s, color 0.18s;
      }
      .close-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
      }
      .modal.theme-light .close-btn {
        color: #64748b;
      }
      .modal.theme-light .close-btn:hover {
        color: #0f172a;
        background: #e2e8f0;
      }

      /* Onboarding / Welcome View */
      .view-section {
        display: none;
        flex-direction: column;
      }
      .view-section.active {
        display: flex;
        animation: stepSlideIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .welcome-body {
        padding: 28px 24px 22px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .welcome-hero {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .welcome-emblem {
        flex-shrink: 0;
        width: 52px;
        height: 52px;
        animation: emblemSettle 0.36s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .welcome-headline {
        font-size: 19px;
        font-weight: 750;
        letter-spacing: -0.02em;
        line-height: 1.25;
        color: #ffffff;
      }
      .modal.theme-light .welcome-headline {
        color: #0f172a;
      }
      .welcome-sub {
        margin-top: 6px;
        font-size: 13px;
        line-height: 1.5;
        color: #94a3b8;
      }
      .modal.theme-light .welcome-sub {
        color: #475569;
      }

      .welcome-list {
        display: flex;
        flex-direction: column;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .modal.theme-light .welcome-list {
        border-color: #e2e8f0;
      }

      .welcome-row {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 13px 2px;
        opacity: 0;
        animation: rowFadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .welcome-row:nth-child(1) { animation-delay: 60ms; }
      .welcome-row:nth-child(2) { animation-delay: 120ms; }
      .welcome-row:nth-child(3) { animation-delay: 180ms; }
      .welcome-row + .welcome-row {
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .modal.theme-light .welcome-row + .welcome-row {
        border-top-color: #f1f5f9;
      }

      .row-index {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        font-weight: 700;
        color: #f59e0b;
        padding-top: 2px;
        flex-shrink: 0;
      }
      .modal.theme-light .row-index {
        color: #1e3a8a;
      }
      .row-copy h4 {
        font-size: 13px;
        font-weight: 650;
        color: #f8fafc;
        margin-bottom: 2px;
      }
      .modal.theme-light .row-copy h4 {
        color: #0f172a;
      }
      .row-copy p {
        font-size: 12px;
        line-height: 1.45;
        color: #94a3b8;
      }
      .modal.theme-light .row-copy p {
        color: #475569;
      }

      .welcome-note {
        font-size: 11.5px;
        color: #64748b;
        line-height: 1.4;
      }

      /* API Key Body */
      .content {
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;
      }
      .info-box {
        font-size: 12px;
        line-height: 1.5;
        color: #cbd5e1;
        background: #1b1c22;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.07);
      }
      .modal.theme-light .info-box {
        background: #f8fafc;
        border-color: #e2e8f0;
        color: #334155;
      }
      .info-box a {
        color: #f59e0b;
        text-decoration: none;
        font-weight: 600;
      }
      .modal.theme-light .info-box a {
        color: #1e3a8a;
      }
      .info-box a:hover { text-decoration: underline; }

      .quota-note {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed rgba(255, 255, 255, 0.1);
        font-size: 11px;
        color: #fbbf24;
      }
      .modal.theme-light .quota-note {
        border-top-color: #cbd5e1;
        color: #b45309;
      }

      .section-label {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .modal.theme-light .section-label {
        color: #475569;
      }

      .keys-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .key-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1b1c22;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .modal.theme-light .key-item {
        background: #f8fafc;
        border-color: #e2e8f0;
      }
      .key-item.active {
        border-color: rgba(245, 158, 11, 0.45);
        background: rgba(245, 158, 11, 0.06);
      }
      .modal.theme-light .key-item.active {
        border-color: #1e3a8a;
        background: #eff6ff;
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
        color: #f1f5f9;
      }
      .modal.theme-light .key-code {
        color: #0f172a;
      }
      .key-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        text-transform: uppercase;
      }
      .key-badge.primary {
        background: rgba(245, 158, 11, 0.18);
        color: #fbbf24;
      }
      .modal.theme-light .key-badge.primary {
        background: #dbeafe;
        color: #1e3a8a;
      }
      .key-badge.backup {
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
      }
      .modal.theme-light .key-badge.backup {
        background: #f1f5f9;
        color: #475569;
      }
      .key-actions { display: flex; align-items: center; gap: 6px; }
      .key-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 5px 8px;
        color: #cbd5e1;
        cursor: pointer;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .modal.theme-light .key-btn {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #334155;
      }
      .key-btn:hover { background: rgba(255, 255, 255, 0.12); }
      .modal.theme-light .key-btn:hover { background: #f1f5f9; }
      .key-btn.btn-delete:hover { color: #ef4444; border-color: rgba(239, 68, 68, 0.45); }

      .empty-keys {
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
        padding: 14px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        border: 1px dashed rgba(255, 255, 255, 0.12);
      }
      .modal.theme-light .empty-keys {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #64748b;
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-field {
        width: 100%;
        background: #1e1f26;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 10px;
        padding: 10px 42px 10px 14px;
        color: #ffffff;
        font-size: 13px;
        outline: none;
        transition: border-color 0.18s, box-shadow 0.18s;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        user-select: text !important;
        -webkit-user-select: text !important;
        pointer-events: auto !important;
      }
      .input-field:focus {
        border-color: #f59e0b;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
      }
      .modal.theme-light .input-field {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .modal.theme-light .input-field:focus {
        border-color: #1e3a8a;
        box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.16);
      }
      .toggle-vis {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 4px;
      }
      .toggle-vis:hover { color: #f59e0b; }
      .modal.theme-light .toggle-vis:hover { color: #1e3a8a; }

      .footer {
        padding: 14px 22px;
        background: #18191e;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .modal.theme-light .footer {
        background: #f8fafc;
        border-top-color: #e2e8f0;
      }
      .footer-right {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }

      .btn {
        padding: 9px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: background-color 0.18s, transform 0.18s, color 0.18s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn-cancel {
        background: transparent;
        color: #94a3b8;
      }
      .btn-cancel:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
      }
      .modal.theme-light .btn-cancel {
        color: #475569;
      }
      .modal.theme-light .btn-cancel:hover {
        color: #0f172a;
        background: #e2e8f0;
      }

      .btn-save {
        background: #f59e0b;
        color: #0f172a;
      }
      .btn-save:hover {
        background: #fbbf24;
        transform: translateY(-1px);
      }
      .modal.theme-light .btn-save {
        background: #1e3a8a;
        color: #ffffff;
      }
      .modal.theme-light .btn-save:hover {
        background: #1e40af;
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
          <div class="header-title" id="modal-header-title">
            <span style="color:#f59e0b;display:inline-flex;align-items:center;">${getBrandSvgMarkup(20)}</span>
            <span id="header-title-text">Koneksi Google Gemini AI</span>
          </div>
          <button class="close-btn" id="btn-close" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- VIEW 1: Sambutan Pemasangan Pertama (Once-Only) -->
        <div class="view-section" id="view-welcome">
          <div class="welcome-body">
            <div class="welcome-hero">
              <div class="welcome-emblem">${getBrandBadgeMarkup(52)}</div>
              <div>
                <h2 class="welcome-headline">Selamat Datang di Mentari Mod</h2>
                <p class="welcome-sub">Asisten perkuliahan UNPAM v2.1 untuk memantau forum, prasyarat kuis, serta otomatisasi evaluasi dengan Gemini AI.</p>
              </div>
            </div>

            <div class="welcome-list">
              <div class="welcome-row">
                <span class="row-index">01</span>
                <div class="row-copy">
                  <h4>Pelacakan Prasyarat Akurat</h4>
                  <p>Memisahkan kuis yang siap dikerjakan dari item yang masih tertahan forum atau post-test.</p>
                </div>
              </div>
              <div class="welcome-row">
                <span class="row-index">02</span>
                <div class="row-copy">
                  <h4>Asisten Forum & Ekspor Dokumen</h4>
                  <p>Menyusun draf tanggapan diskusi dan mengunduh materi ke format Word (.docx) atau Markdown.</p>
                </div>
              </div>
              <div class="welcome-row">
                <span class="row-index">03</span>
                <div class="row-copy">
                  <h4>Otomasi Cerdas Multi-Key</h4>
                  <p>Mendukung banyak API Key Gemini gratis dengan rotasi otomatis dan jeda pengerjaan natural.</p>
                </div>
              </div>
            </div>

            <p class="welcome-note">Tampilan otomatis mengikuti tema perangkat Anda. Sambutan ini hanya muncul sekali saat pemasangan awal.</p>
          </div>

          <div class="footer">
            <button class="btn btn-cancel" id="btn-skip-welcome" type="button">Lewati dulu</button>
            <div class="footer-right">
              <button class="btn btn-save" id="btn-start-setup" type="button">Lanjut Setup API Key</button>
            </div>
          </div>
        </div>

        <!-- VIEW 2: Pengaturan Multi-Key Gemini AI -->
        <div class="view-section" id="view-apikey">
          <div class="content">
            <div class="info-box">
              Dapatkan API Key gratis di Google AI Studio:<br>
              <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">
                https://aistudio.google.com/api-keys
              </a>
              <div style="margin-top:6px; font-size:11.5px;">
                <b>Multi-Key Failover:</b> Tambahkan lebih dari satu API Key. Saat key utama menyentuh limit kuota (HTTP 429), ekstensi beralih ke key cadangan secara otomatis.
              </div>
              <div class="quota-note">
                <b>Info Kuota:</b> Limit harian (RPD) di-reset setiap hari oleh Google. Key yang limit tidak perlu dihapus karena otomatis aktif kembali keesokan harinya.
              </div>
            </div>

            <div class="section-label">
              <span>Daftar API Key Tersimpan</span>
              <span id="keys-count-badge">0 Key</span>
            </div>

            <div class="keys-list" id="keys-list-container">
              <div class="empty-keys">Memuat daftar API Key...</div>
            </div>

            <div class="section-label" style="margin-top:4px;">
              <span>Tambah API Key Baru</span>
            </div>

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

          <div class="footer">
            <button class="btn btn-cancel" id="btn-cancel" type="button">Tutup</button>
            <div class="footer-right">
              <button class="btn btn-save" id="btn-add-key" type="button">Tambah & Uji Key</button>
            </div>
          </div>
        </div>
      </div>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(overlay);
      document.body.appendChild(this.host);
      const isolatedEvents = [
        "focusin",
        "focusout",
        "keydown",
        "keypress",
        "keyup",
        "paste",
        "copy",
        "cut",
        "mousedown",
        "pointerdown",
        "input",
        "beforeinput"
      ];
      isolatedEvents.forEach((evt) => {
        this.host.addEventListener(evt, (e) => e.stopPropagation(), false);
      });
      if (!this._windowFocusGuard) {
        this._windowFocusGuard = (e) => {
          if (!this.isOpen) return;
          const target = e.target;
          if (target === this.host || target instanceof Node && this.host?.contains(target)) {
            e.stopImmediatePropagation();
          }
        };
        window.addEventListener("focusin", this._windowFocusGuard, true);
        window.addEventListener("focus", this._windowFocusGuard, true);
      }
      const inputKey = this.shadow.getElementById("input-api-key");
      const btnAddKey = this.shadow.getElementById("btn-add-key");
      const btnCancel = this.shadow.getElementById("btn-cancel");
      const btnClose = this.shadow.getElementById("btn-close");
      const btnToggleVis = this.shadow.getElementById("btn-toggle-vis");
      const btnStartSetup = this.shadow.getElementById("btn-start-setup");
      const btnSkipWelcome = this.shadow.getElementById("btn-skip-welcome");
      inputKey.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        inputKey.focus();
      });
      inputKey.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") btnAddKey.click();
      });
      ["keypress", "keyup", "paste", "focusin"].forEach((evt) => {
        inputKey.addEventListener(evt, (e) => e.stopPropagation());
      });
      btnToggleVis.addEventListener("click", () => {
        inputKey.type = inputKey.type === "password" ? "text" : "password";
      });
      const close = async () => {
        if (this.currentView === "welcome") {
          await Storage.set({ mentari_onboarding_completed: true });
        }
        this.closeModal();
      };
      btnCancel.addEventListener("click", close);
      btnClose.addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      btnSkipWelcome.addEventListener("click", async () => {
        await Storage.set({ mentari_onboarding_completed: true });
        this.closeModal();
      });
      btnStartSetup.addEventListener("click", async () => {
        await Storage.set({ mentari_onboarding_completed: true });
        this._switchView("apikey");
      });
      btnAddKey.addEventListener("click", async () => {
        const keyVal = inputKey.value.trim();
        if (!keyVal) {
          Toast.warning("Silakan masukkan API Key Gemini Anda.");
          return;
        }
        const currentKeysRes = await new Promise((r) => chrome.runtime.sendMessage({ action: "getGeminiApiKeys" }, r));
        if (currentKeysRes?.keys?.includes(keyVal)) {
          Toast.warning("API Key ini sudah tersimpan di dalam daftar.");
          return;
        }
        btnAddKey.disabled = true;
        btnAddKey.textContent = "Memverifikasi...";
        chrome.runtime.sendMessage({
          action: "addGeminiApiKey",
          apiKey: keyVal
        }, async (res) => {
          btnAddKey.disabled = false;
          btnAddKey.textContent = "Tambah & Uji Key";
          if (res && res.valid) {
            inputKey.value = "";
            await Storage.set({ mentari_onboarding_completed: true });
            Toast.success("API Key valid dan berhasil ditambahkan ke pool.");
            await this._loadAndRenderKeys();
            window.dispatchEvent(new CustomEvent("gemini-api-key-updated", {
              detail: { apiKey: keyVal }
            }));
          } else {
            Toast.error(res ? res.message : "Verifikasi API Key gagal.");
          }
        });
      });
      this._applyTheme();
    }
    _switchView(viewName) {
      this.currentView = viewName;
      if (!this.shadow) return;
      const welcomeEl = this.shadow.getElementById("view-welcome");
      const apikeyEl = this.shadow.getElementById("view-apikey");
      const titleText = this.shadow.getElementById("header-title-text");
      if (viewName === "welcome") {
        welcomeEl?.classList.add("active");
        apikeyEl?.classList.remove("active");
        if (titleText) titleText.textContent = "Mentari Mod Modern Edition";
      } else {
        welcomeEl?.classList.remove("active");
        apikeyEl?.classList.add("active");
        if (titleText) titleText.textContent = "Koneksi Google Gemini AI";
        this._loadAndRenderKeys();
        const inputKey = this.shadow.getElementById("input-api-key");
        setTimeout(() => inputKey?.focus(), 140);
      }
    }
    async _loadAndRenderKeys() {
      if (!this.shadow) return;
      const container = this.shadow.getElementById("keys-list-container");
      const countBadge = this.shadow.getElementById("keys-count-badge");
      if (!container) return;
      chrome.runtime.sendMessage({ action: "getGeminiApiKeys" }, (res) => {
        const keys = res?.keys || [];
        const activeKey = res?.activeKey || keys[0] || "";
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
        container.innerHTML = "";
        keys.forEach((key) => {
          const isPrimary = key === activeKey;
          const itemDiv = document.createElement("div");
          itemDiv.className = `key-item ${isPrimary ? "active" : ""}`;
          itemDiv.innerHTML = `
          <div class="key-left">
            <span class="key-badge ${isPrimary ? "primary" : "backup"}">
              ${isPrimary ? "Utama" : "Cadangan"}
            </span>
            <span class="key-code" title="${key}">${this._maskKey(key)}</span>
          </div>
          <div class="key-actions">
            ${!isPrimary ? `
              <button class="key-btn btn-set-primary" data-key="${key}" title="Jadikan API Key Utama">Utamakan</button>
            ` : ""}
            <button class="key-btn btn-delete" data-key="${key}" title="Hapus API Key ini" aria-label="Hapus Key">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;
          const btnSet = itemDiv.querySelector(".btn-set-primary");
          if (btnSet) {
            btnSet.addEventListener("click", () => {
              chrome.runtime.sendMessage({
                action: "setActiveGeminiApiKey",
                apiKey: key
              }, (setRes) => {
                if (setRes && setRes.success) {
                  Toast.success("API Key utama berhasil diperbarui.");
                  this._loadAndRenderKeys();
                  window.dispatchEvent(new CustomEvent("gemini-api-key-updated", {
                    detail: { apiKey: key }
                  }));
                }
              });
            });
          }
          const btnDel = itemDiv.querySelector(".btn-delete");
          if (btnDel) {
            btnDel.addEventListener("click", () => {
              chrome.runtime.sendMessage({
                action: "removeGeminiApiKey",
                apiKey: key
              }, (delRes) => {
                if (delRes && delRes.success) {
                  Toast.info("API Key telah dihapus.");
                  this._loadAndRenderKeys();
                  window.dispatchEvent(new CustomEvent("gemini-api-key-updated", {
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
    async openModal(view = "apikey") {
      this.currentTheme = await ThemeHelper.getEffectiveTheme();
      this._buildModalDOM();
      this.isOpen = true;
      this._applyTheme();
      if (this.host) {
        this.host.style.display = "block";
      }
      this._switchView(view);
      const overlay = this.shadow?.querySelector(".overlay");
      if (overlay) overlay.classList.add("open");
    }
    closeModal() {
      if (!this.shadow) return;
      const overlay = this.shadow.querySelector(".overlay");
      if (overlay) overlay.classList.remove("open");
      if (this.host) {
        this.host.style.display = "none";
      }
      this.isOpen = false;
    }
  };
  var apiKeyManager = new ApiKeyManager();
})();
