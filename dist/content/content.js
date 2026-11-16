(() => {
  // src/utils/dom.js
  var DOM = {
    /**
     * Mencari tombol berdasarkan teks kontennya (pengganti fatal bug :contains())
     * Aman dari DOMException / SyntaxError pada Chromium modern.
     */
    findButtonByText(keywords, root = document, includeDisabled = false) {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const normalized = list.map((k) => k.trim().toLowerCase());
      const buttons = root.querySelectorAll('button, a, input[type="button"], input[type="submit"], div[role="button"], span[role="button"], .MuiButton-root, .MuiButtonBase-root');
      for (const btn of buttons) {
        if (btn.offsetParent === null && !btn.getClientRects().length) continue;
        if (!includeDisabled) {
          if (btn.disabled || btn.classList.contains("Mui-disabled") || btn.classList.contains("disabled") || btn.getAttribute("aria-disabled") === "true" || btn.getAttribute("disabled") !== null) {
            continue;
          }
        }
        const text = (btn.textContent || btn.value || "").trim().toLowerCase();
        if (normalized.some((kw) => text.includes(kw))) {
          return btn;
        }
      }
      return null;
    },
    /**
     * Mencari semua tombol yang cocok dengan teks konten
     */
    findAllButtonsByText(keywords, root = document) {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const normalized = list.map((k) => k.trim().toLowerCase());
      const matches = [];
      const buttons = root.querySelectorAll('button, a, input[type="button"], input[type="submit"], div[role="button"], span[role="button"], .MuiButton-root, .MuiButtonBase-root');
      for (const btn of buttons) {
        if (btn.offsetParent === null && !btn.getClientRects().length) continue;
        const text = (btn.textContent || btn.value || "").trim().toLowerCase();
        if (normalized.some((kw) => text.includes(kw))) {
          matches.push(btn);
        }
      }
      return matches;
    },
    /**
     * Mencari container header / navbar Mentari UNPAM secara semantic
     * Bebas dari ketergantungan hash class emotion (.css-1yxmbwk)
     */
    findHeaderContainer() {
      const candidates = [
        document.querySelector("header .MuiToolbar-root"),
        document.querySelector(".MuiAppBar-root .MuiToolbar-root"),
        document.querySelector("header"),
        document.querySelector(".MuiAppBar-root"),
        document.querySelector("nav"),
        document.querySelector('[role="banner"]'),
        document.querySelector(".css-1yxmbwk")
        // fallback jika hash kebetulan masih aktif
      ];
      return candidates.find((el) => el !== null) || null;
    },
    /**
     * Mencari opsi radio button pada container soal kuis secara aman
     * Menggantikan selector rapuh .css-1kic1uf / .css-1675apn
     */
    findRadioOptions(questionContainer) {
      if (!questionContainer) return [];
      const inputs = questionContainer.querySelectorAll('input[type="radio"]');
      if (inputs.length > 0) return Array.from(inputs);
      const muiRadios = questionContainer.querySelectorAll('.MuiRadio-root, [role="radio"]');
      if (muiRadios.length > 0) return Array.from(muiRadios);
      const labels = questionContainer.querySelectorAll(".MuiFormControlLabel-root");
      if (labels.length > 0) return Array.from(labels);
      return [];
    },
    /**
     * Menunggu elemen muncul di DOM dengan batas timeout
     */
    waitForElement(selectorOrFn, timeout = 1e4, root = document) {
      return new Promise((resolve) => {
        const check = () => {
          if (typeof selectorOrFn === "function") {
            return selectorOrFn();
          }
          return root.querySelector(selectorOrFn);
        };
        const initial = check();
        if (initial) return resolve(initial);
        let timer = null;
        const observer = new MutationObserver(() => {
          const found = check();
          if (found) {
            cleanup();
            resolve(found);
          }
        });
        const cleanup = () => {
          if (timer) clearTimeout(timer);
          observer.disconnect();
        };
        timer = setTimeout(() => {
          cleanup();
          resolve(null);
        }, timeout);
        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
      });
    },
    /**
     * Mengisi value input atau textarea yang kompatibel dengan React Controlled Components
     */
    setNativeValue(element, value) {
      if (!element) return;
      const proto = element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    /**
     * Mencentang radio button dengan React native property setter & synthetic events
     */
    setNativeRadioChecked(inputEl) {
      if (!inputEl) return;
      const input = inputEl.tagName === "INPUT" ? inputEl : inputEl.querySelector?.('input[type="radio"]') || inputEl;
      if (!input || input.tagName !== "INPUT") {
        try {
          inputEl.click();
        } catch (_) {
        }
        return;
      }
      const parentLabel = input.closest("label, .MuiFormControlLabel-root");
      const radioContainer = input.closest('.MuiRadio-root, [role="radio"]');
      if (input._valueTracker) {
        input._valueTracker.setValue("");
      }
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;
      if (nativeSetter) {
        nativeSetter.call(input, true);
      } else {
        input.checked = true;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (parentLabel) {
        try {
          parentLabel.click();
        } catch (_) {
        }
      } else if (radioContainer) {
        try {
          radioContainer.click();
        } catch (_) {
        }
      } else {
        try {
          input.click();
        } catch (_) {
        }
      }
      if (!input.checked) {
        if (nativeSetter) nativeSetter.call(input, true);
        else input.checked = true;
      }
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

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
  function getBrandSvgMarkup(size = 24, rounded = true) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="mm-navy-${size}" x1="12" y1="8" x2="116" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1E3A8A"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <linearGradient id="mm-sun-${size}" x1="64" y1="22" x2="64" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#F97316"/>
      </linearGradient>
    </defs>
    ${rounded ? `<rect x="4" y="4" width="120" height="120" rx="28" fill="url(#mm-navy-${size})"/><rect x="5" y="5" width="118" height="118" rx="27" stroke="#F59E0B" stroke-opacity="0.4" stroke-width="2"/>` : ""}
    <rect x="61" y="18" width="6" height="13" rx="3" fill="#FBBF24"/>
    <rect x="61" y="18" width="6" height="12" rx="3" fill="#FBBF24" transform="rotate(-34 64 62)"/>
    <rect x="61" y="18" width="6" height="12" rx="3" fill="#FBBF24" transform="rotate(34 64 62)"/>
    <rect x="61" y="21" width="6" height="10" rx="3" fill="#F97316" transform="rotate(-68 64 62)"/>
    <rect x="61" y="21" width="6" height="10" rx="3" fill="#F97316" transform="rotate(68 64 62)"/>
    <circle cx="64" cy="61" r="20" fill="url(#mm-sun-${size})"/>
    <path d="M22 72C36 65 51 67 64 76C77 67 92 65 106 72V99C92 91 77 93 64 102C51 93 36 91 22 99V72Z" fill="#0F172A"/>
    <path d="M27 73.5C39 67.5 52 70 62.5 78.5V97.5C52 89.5 39 87.5 27 93.5V73.5Z" fill="#FFFFFF"/>
    <path d="M101 73.5C89 67.5 76 70 65.5 78.5V97.5C76 89.5 89 87.5 101 93.5V73.5Z" fill="#E2E8F0"/>
    <rect x="62.5" y="77" width="3" height="22" rx="1.5" fill="#F59E0B"/>
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

  // src/content/content.js
  var MentariContentEntry = class {
    constructor() {
      this._isChecking = false;
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod Modern Edition] Menginisialisasi Content Entry...");
      this._injectMainSnifferFallback();
      this._injectFonts();
      this._setupHeaderToggle();
      this._setupFloatingLauncher();
      this._initPersistentObserver();
      this._setupGeminiChatCoordination();
      this._checkAutoPilotNavigation();
    }
    _injectMainSnifferFallback() {
      if (document.getElementById("mentari-main-sniffer")) return;
      try {
        const s = document.createElement("script");
        s.id = "mentari-main-sniffer";
        s.src = chrome.runtime.getURL("content/main-sniffer.js");
        (document.head || document.documentElement).appendChild(s);
      } catch (e) {
      }
    }
    _injectFonts() {
      if (document.getElementById("mentari-symbols-font")) return;
      const link = document.createElement("link");
      link.id = "mentari-symbols-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,0,0";
      document.head.appendChild(link);
    }
    /**
     * Injeksi tombol toggle di navbar header tepat di samping tombol Dark Mode
     * Menggunakan parentElement langsung untuk mencegah DOMException pada wrapper MUI.
     */
    _setupHeaderToggle() {
      if (document.getElementById("mentari-header-toggle")) return;
      const darkSvg = document.querySelector('svg[data-testid="DarkModeIcon"], svg[data-testid="LightModeIcon"]');
      if (darkSvg) {
        const darkModeBtn = darkSvg.closest("button");
        if (darkModeBtn && darkModeBtn.parentElement) {
          const btn = this._createHeaderButton();
          darkModeBtn.parentElement.insertBefore(btn, darkModeBtn);
          return;
        }
      }
      const header = DOM.findHeaderContainer();
      if (header) {
        const toolbar = header.querySelector(".MuiToolbar-root") || header;
        const btn = this._createHeaderButton();
        btn.style.marginLeft = "8px";
        toolbar.appendChild(btn);
      }
    }
    _createHeaderButton() {
      const btn = document.createElement("button");
      btn.id = "mentari-header-toggle";
      btn.className = "MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium";
      btn.title = "Buka Dashboard Mentari Mod";
      btn.setAttribute("aria-label", "Dashboard Mentari Mod");
      btn.style.cssText = `
      margin-right: 8px;
      padding: 6px;
      background-color: transparent;
      border: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      outline: 0;
      cursor: pointer;
      position: relative;
      transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease;
    `;
      btn.innerHTML = `
      ${getBrandSvgMarkup(24, true)}
      <span class="MuiTouchRipple-root"></span>
    `;
      btn.addEventListener("mouseenter", () => {
        btn.style.backgroundColor = "rgba(30, 58, 138, 0.12)";
        btn.style.transform = "scale(1.05)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.backgroundColor = "transparent";
        btn.style.transform = "scale(1)";
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("mentari-toggle-popup"));
      });
      return btn;
    }
    /**
     * Injeksi Floating Launcher Button tepat di atas icon Gemini AI
     * (bottom: 82px, left: 24px) dengan Closed Shadow DOM
     */
    _setupFloatingLauncher() {
      if (document.getElementById("mentari-floating-launcher-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-floating-launcher-host";
      host.style.position = "fixed";
      host.style.bottom = "82px";
      host.style.left = "24px";
      host.style.zIndex = "2147483638";
      host.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      const shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .launcher-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .launcher-btn {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #0F172A;
        color: #ffffff;
        border: 1.5px solid rgba(245, 158, 11, 0.5);
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 0;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
        outline: none;
      }
      .launcher-btn:hover {
        transform: scale(1.06);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.48);
      }
      .launcher-btn:active {
        transform: scale(0.96);
      }
      .tooltip {
        position: absolute;
        left: 58px;
        white-space: nowrap;
        background: #18181b;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid rgba(245, 158, 11, 0.35);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
        pointer-events: none;
        opacity: 0;
        transform: translateX(-6px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .launcher-wrap.theme-light .tooltip {
        background: #ffffff;
        color: #0f172a;
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
      }
      .launcher-wrap:hover .tooltip {
        opacity: 1;
        transform: translateX(0);
      }
    `;
      const wrap = document.createElement("div");
      wrap.className = "launcher-wrap";
      ThemeHelper.getEffectiveTheme().then((t) => {
        wrap.classList.toggle("theme-light", t === "light");
      });
      ThemeHelper.watchTheme((t) => {
        wrap.classList.toggle("theme-light", t === "light");
      });
      const btn = document.createElement("button");
      btn.className = "launcher-btn";
      btn.setAttribute("aria-label", "Dashboard Mentari Mod");
      btn.innerHTML = getBrandSvgMarkup(46, true);
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = "Dashboard Mentari Mod";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("mentari-toggle-popup"));
      });
      wrap.appendChild(btn);
      wrap.appendChild(tooltip);
      shadow.appendChild(style);
      shadow.appendChild(wrap);
      document.body.appendChild(host);
    }
    /**
     * Menyelaraskan tampilan floating launcher dengan jendela Gemini Chat
     * agar tidak terjadi tumpang-tindih visual saat jendela chat dibuka.
     */
    _setupGeminiChatCoordination() {
      window.addEventListener("mentari-gemini-chat-toggle", (e) => {
        const host = document.getElementById("mentari-floating-launcher-host");
        if (!host) return;
        const isOpen = !!e.detail?.isOpen;
        if (isOpen) {
          host.style.opacity = "0";
          host.style.pointerEvents = "none";
          host.style.transform = "translateY(10px) scale(0.9)";
        } else {
          host.style.opacity = "1";
          host.style.pointerEvents = "auto";
          host.style.transform = "none";
        }
      });
    }
    /**
     * Pengawas DOM persisten dengan debounce requestAnimationFrame
     */
    _initPersistentObserver() {
      const checkAndInject = () => {
        if (this._isChecking) return;
        this._isChecking = true;
        requestAnimationFrame(() => {
          this._setupHeaderToggle();
          this._setupFloatingLauncher();
          this._isChecking = false;
        });
      };
      const observer = new MutationObserver(checkAndInject);
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
      setInterval(checkAndInject, 1500);
    }
    /**
     * Pengawal navigasi otomatis single-tab Auto-Pilot
     */
    async _checkAutoPilotNavigation() {
      if (window.location.pathname.includes("/exam/") || window.location.pathname.includes("/kuesioner/")) return;
      try {
        const store = await Storage.get("mentari_auto_pilot_state");
        const state = store?.mentari_auto_pilot_state;
        if (state && state.active === true && Array.isArray(state.queue)) {
          if (state.currentIndex < state.queue.length) {
            const nextItem = state.queue[state.currentIndex];
            if (nextItem && nextItem.url) {
              console.log("[Auto-Pilot Guard] Melanjutkan antrean kuis ke tab aktif:", nextItem.url);
              Toast.info(`Auto-Pilot Kuis: Melanjutkan ke ${nextItem.courseTitle} (${state.currentIndex + 1}/${state.queue.length})...`);
              setTimeout(() => {
                window.location.href = nextItem.url;
              }, 1200);
            }
          } else {
            await Storage.set({
              mentari_auto_pilot_state: { ...state, active: false, finished: true }
            });
            Toast.success("Seluruh antrean Auto-Pilot kuis telah selesai 100%!");
          }
        }
      } catch (e) {
      }
    }
  };
  if (typeof window !== "undefined") {
    new MentariContentEntry();
  }
})();
