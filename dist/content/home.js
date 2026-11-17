(() => {
  // src/utils/models.js
  var ACTIVE_FREE_MODELS = [
    {
      id: "gemini-4-hydrogen",
      name: "Gemini 4 Hydrogen",
      label: "Gemini 4 Hydrogen (Terbaru - Rekomendasi Free Tier)",
      desc: "Generasi 4 terbaru gratis di AI Studio, konteks 1M token, akurasi & kecepatan tinggi"
    },
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      label: "Gemini 3.8 Flash (Flagship Gen-3)",
      desc: "Flagship generasi 3 di Free Tier untuk penalaran kompleks"
    },
    {
      id: "gemini-3.6-flash",
      name: "Gemini 3.6 Flash",
      label: "Gemini 3.6 Flash (Seimbang)",
      desc: "Seimbang antara kecepatan respon dan pemahaman teks"
    },
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash-Lite",
      label: "Gemini 3.5 Flash-Lite (Kuota Tinggi)",
      desc: "Model ringan untuk eksekusi berulang dengan kuota harian tinggi"
    },
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash-Lite",
      label: "Gemini 3.1 Flash-Lite (Ringan & Cepat)",
      desc: "Latensi rendah dan hemat token di Free Tier"
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      label: "Gemini 3 Flash Preview (Free Tier)",
      desc: "Varian preview cepat yang tersedia gratis di AI Studio"
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

  // src/content/home.js
  var HomeTheme = class {
    constructor() {
      this.currentTheme = "light";
      this._init();
    }
    async _init() {
      const theme = await ThemeHelper.getEffectiveTheme();
      this._applyStyles(theme);
      ThemeHelper.watchTheme((newTheme) => {
        this._applyStyles(newTheme);
      });
      if (typeof window !== "undefined") {
        window.addEventListener("mentari-route-change", () => {
          this._applyStyles(this.currentTheme);
        });
      }
    }
    _applyStyles(theme = "light") {
      this.currentTheme = theme === "light" ? "light" : "dark";
      const isLoginRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/login");
      let style = document.getElementById("mentari-home-theme");
      if (!isLoginRoute) {
        if (style) style.remove();
        return;
      }
      if (!style) {
        style = document.createElement("style");
        style.id = "mentari-home-theme";
        document.head.appendChild(style);
      }
      const isLight = this.currentTheme === "light";
      if (isLight) {
        style.textContent = `
        /* Adaptive Light Glass container */
        .MuiDrawer-paperAnchorRight.MuiDrawer-paper {
          background: rgba(255, 255, 255, 0.94) !important;
          height: 94% !important;
          top: 3% !important;
          backdrop-filter: blur(18px) saturate(160%) !important;
          border-left: 2px solid #1e3a8a !important;
          width: 420px !important;
          box-shadow: -12px 0 40px rgba(15, 23, 42, 0.14) !important;
          color: #0f172a !important;
          border-radius: 20px 0 0 20px !important;
        }

        .MuiTypography-h4 {
          font-weight: 800 !important;
          color: #0f172a !important;
          border-left: 4px solid #f59e0b !important;
          padding-left: 14px !important;
        }

        .MuiOutlinedInput-root {
          background: #f8fafc !important;
          border-radius: 12px !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
        }

        .MuiOutlinedInput-root.Mui-focused {
          border-color: #1e3a8a !important;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.16) !important;
        }

        .MuiButton-containedPrimary {
          background: #1e3a8a !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          height: 48px !important;
          transition: all 0.2s ease !important;
        }

        .MuiButton-containedPrimary:hover {
          background: #1e40af !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 20px rgba(30, 58, 138, 0.25) !important;
        }
      `;
      } else {
        style.textContent = `
        /* Cyber Metallic Dark Glass container */
        .MuiDrawer-paperAnchorRight.MuiDrawer-paper {
          background: rgba(22, 24, 28, 0.88) !important;
          height: 94% !important;
          top: 3% !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          border-left: 2px solid #d4af37 !important;
          width: 420px !important;
          box-shadow: -15px 0 50px rgba(0, 0, 0, 0.5) !important;
          color: #e5e5e5 !important;
          border-radius: 20px 0 0 20px !important;
        }

        .MuiTypography-h4 {
          font-weight: 800 !important;
          color: #fff !important;
          border-left: 4px solid #d4af37 !important;
          padding-left: 14px !important;
        }

        .MuiOutlinedInput-root {
          background: rgba(255, 255, 255, 0.05) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
        }

        .MuiOutlinedInput-root.Mui-focused {
          border-color: #d4af37 !important;
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2) !important;
        }

        .MuiButton-containedPrimary {
          background: #d4af37 !important;
          color: #121212 !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          height: 48px !important;
          transition: all 0.2s ease !important;
        }

        .MuiButton-containedPrimary:hover {
          background: #e6be40 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.35) !important;
        }
      `;
      }
    }
  };
  if (typeof window !== "undefined") {
    new HomeTheme();
  }
})();
