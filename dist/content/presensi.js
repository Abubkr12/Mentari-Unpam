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
              if (chrome.runtime?.lastError) {
                this._setLocalStorageFallback(items);
                resolve(true);
              } else {
                resolve(true);
              }
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
        const toMigrate = {};
        let hasData = false;
        for (const k of legacyKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              if (k === "geminiApiKey") {
                try {
                  toMigrate[k] = atob(raw);
                } catch {
                  toMigrate[k] = raw;
                }
              } else {
                toMigrate[k] = JSON.parse(raw);
              }
            } catch {
              toMigrate[k] = raw;
            }
            hasData = true;
          }
        }
        if (hasData) {
          await this.set(toMigrate);
          console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
        }
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };

  // src/utils/unpam-auth.js
  var UnpamAuth = {
    _cachedToken: null,
    _snifferInjected: false,
    /**
     * Mendekode payload JWT secara aman dengan normalisasi Base64URL
     */
    decodeJwtPayload(token) {
      if (!token || typeof token !== "string") return null;
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      try {
        let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const jsonStr = decodeURIComponent(
          atob(b64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
        );
        return JSON.parse(jsonStr);
      } catch (e) {
        return null;
      }
    },
    /**
     * Memeriksa validitas dan masa berlaku (exp) token JWT
     */
    isTokenValid(token) {
      if (!token || typeof token !== "string") return false;
      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        const parts = token.split(".");
        return parts.length === 3 && parts[1].length > 10;
      }
      if (typeof payload.exp === "number") {
        const isExpired = payload.exp * 1e3 <= Date.now() + 3e4;
        if (isExpired) {
          console.log("[UnpamAuth] Token kedaluwarsa (exp:", payload.exp, "now:", Math.floor(Date.now() / 1e3), ")");
          return false;
        }
      }
      return true;
    },
    /**
     * Mendapatkan identitas mahasiswa (NIM/ID) dari payload token
     */
    getUserIdentifier(token) {
      const payload = this.decodeJwtPayload(token);
      return payload?.nim || payload?.username || payload?.id || payload?.sub || "default";
    },
    /**
     * Menghapus token usang/tidak valid dari memori dan storage
     */
    clearInvalidToken() {
      this._cachedToken = null;
      if (typeof window !== "undefined") {
        delete window.lastAuthToken;
        try {
          window.dispatchEvent(new CustomEvent("mentari-token-invalidated"));
        } catch {
        }
      }
      try {
        localStorage.removeItem("mentari_auth_token");
        sessionStorage.removeItem("mentari_auth_token");
      } catch {
      }
      Storage.remove(["mentari_auth_token", "access"]);
    },
    /**
     * Mengambil token autentikasi (JWT) mahasiswa dari berbagai sumber
     */
    async getAuthToken() {
      if (this._cachedToken) {
        if (this.isTokenValid(this._cachedToken)) {
          return this._cachedToken;
        }
        this.clearInvalidToken();
      }
      if (typeof window !== "undefined" && window.lastAuthToken) {
        if (this.isTokenValid(window.lastAuthToken)) {
          this._cachedToken = window.lastAuthToken;
          return this._cachedToken;
        }
        delete window.lastAuthToken;
      }
      if (typeof localStorage !== "undefined") {
        const directLocal = localStorage.getItem("mentari_auth_token");
        if (directLocal && directLocal.startsWith("eyJ")) {
          if (this.isTokenValid(directLocal)) {
            this._saveCapturedToken(directLocal);
            return directLocal;
          } else {
            try {
              localStorage.removeItem("mentari_auth_token");
            } catch {
            }
          }
        }
      }
      const stored = await Storage.get(["mentari_auth_token", "access"]);
      if (stored.mentari_auth_token) {
        if (this.isTokenValid(stored.mentari_auth_token)) {
          this._cachedToken = stored.mentari_auth_token;
          return this._cachedToken;
        } else {
          Storage.remove("mentari_auth_token");
        }
      }
      if (stored.access) {
        if (this.isTokenValid(stored.access)) {
          this._cachedToken = stored.access;
          return this._cachedToken;
        } else {
          Storage.remove("access");
        }
      }
      if (typeof localStorage !== "undefined") {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            const extracted = this._extractJwtFromValue(val, key);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        } catch (e) {
          console.log("[UnpamAuth] Scan localStorage info:", e.message);
        }
      }
      if (typeof sessionStorage !== "undefined") {
        try {
          const directSession = sessionStorage.getItem("mentari_auth_token");
          if (directSession && directSession.startsWith("eyJ") && this.isTokenValid(directSession)) {
            this._saveCapturedToken(directSession);
            return directSession;
          }
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const val = sessionStorage.getItem(key);
            const extracted = this._extractJwtFromValue(val, key);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        } catch (e) {
          console.log("[UnpamAuth] Scan sessionStorage info:", e.message);
        }
      }
      if (typeof document !== "undefined" && document.cookie) {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const parts = cookie.trim().split("=");
          if (parts.length >= 2) {
            const cVal = decodeURIComponent(parts.slice(1).join("="));
            if (cVal.includes("eyJ")) {
              const extracted = this._extractJwtFromValue(cVal);
              if (extracted && this.isTokenValid(extracted)) {
                this._saveCapturedToken(extracted);
                return extracted;
              }
            }
          }
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
      }
      return null;
    },
    /**
     * Mengambil XSRF-TOKEN dari cookie untuk MyUnpam
     */
    getXsrfToken() {
      if (typeof document === "undefined" || !document.cookie) return "";
      const cookies = document.cookie.split(";");
      for (const c of cookies) {
        const trimmed = c.trim();
        if (trimmed.startsWith("XSRF-TOKEN=")) {
          return decodeURIComponent(trimmed.substring(11));
        }
      }
      return "";
    },
    /**
     * Menyiapkan opsi header lengkap untuk request ke API UNPAM
     */
    async getFetchOptions(extraHeaders = {}) {
      const token = await this.getAuthToken();
      const xsrf = this.getXsrfToken();
      const headers = {
        "Accept": "application/json, text/plain, */*",
        ...extraHeaders
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
      }
      return {
        headers,
        credentials: "include"
      };
    },
    /**
     * Pasang pendengar event dari Main World Sniffer dan fallback DOM injection
     */
    installLiveSniffer() {
      if (typeof window === "undefined") return;
      const self = this;
      window.addEventListener("mentari-token-captured", (e) => {
        const token = e.detail?.token || e.detail;
        if (token && typeof token === "string") {
          self._saveCapturedToken(token);
        }
      });
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "MENTARI_TOKEN_CAPTURED" && e.data.token) {
          self._saveCapturedToken(e.data.token);
        }
      });
      if (!this._snifferInjected && typeof chrome !== "undefined" && chrome.runtime?.getURL) {
        this._snifferInjected = true;
        try {
          const scriptId = "mentari-injected-sniffer";
          if (!document.getElementById(scriptId)) {
            const s = document.createElement("script");
            s.id = scriptId;
            const isDist = chrome.runtime.getURL("manifest.json").includes("/dist/") || !chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0]?.startsWith("dist/");
            s.src = chrome.runtime.getURL(isDist ? "content/main-sniffer.js" : "dist/content/main-sniffer.js");
            (document.head || document.documentElement).appendChild(s);
          }
        } catch (err) {
          console.log("[UnpamAuth] Fallback sniffer injection notice:", err.message);
        }
      }
      if (window.XMLHttpRequest && XMLHttpRequest.prototype.setRequestHeader) {
        const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
          if (header && typeof header === "string" && header.toLowerCase() === "authorization") {
            if (value && typeof value === "string" && value.includes("Bearer ")) {
              const token = value.split("Bearer ")[1]?.trim();
              if (token && token.startsWith("eyJ")) {
                self._saveCapturedToken(token);
              }
            }
          }
          return originalSetHeader.apply(this, arguments);
        };
      }
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function(resource, config) {
          try {
            if (config && config.headers) {
              let authHeader = null;
              if (config.headers instanceof Headers) {
                authHeader = config.headers.get("authorization") || config.headers.get("Authorization");
              } else if (typeof config.headers === "object") {
                authHeader = config.headers["authorization"] || config.headers["Authorization"];
              }
              if (authHeader && typeof authHeader === "string" && authHeader.includes("Bearer ")) {
                const token = authHeader.split("Bearer ")[1]?.trim();
                if (token && token.startsWith("eyJ")) {
                  self._saveCapturedToken(token);
                }
              }
            }
          } catch {
          }
          return originalFetch.apply(this, arguments);
        };
      }
    },
    _extractJwtFromValue(val, keyName = "") {
      if (!val || typeof val !== "string") return null;
      let clean = val.trim();
      if (clean.startsWith('"') && clean.endsWith('"') || clean.startsWith("'") && clean.endsWith("'")) {
        clean = clean.slice(1, -1);
      }
      if (clean.startsWith("eyJ") && clean.split(".").length === 3) {
        return clean;
      }
      if (clean.includes("Bearer eyJ")) {
        const m = clean.match(/Bearer\s+(eyJ[a-zA-Z0-9_\-\.]+)/);
        if (m) return m[1];
      }
      if (clean.startsWith("{") && clean.endsWith("}")) {
        try {
          const obj = JSON.parse(clean);
          const candidates = [obj.token, obj.access_token, obj.accessToken, obj.jwt, obj.access, obj.authToken];
          for (const c of candidates) {
            if (typeof c === "string" && c.startsWith("eyJ")) {
              return c;
            }
          }
        } catch {
        }
      }
      return null;
    },
    _saveCapturedToken(token) {
      if (!token || !this.isTokenValid(token)) return;
      this._cachedToken = token;
      if (typeof window !== "undefined") {
        window.lastAuthToken = token;
      }
      try {
        localStorage.setItem("mentari_auth_token", token);
      } catch {
      }
      Storage.set({ mentari_auth_token: token });
    }
  };
  if (typeof window !== "undefined") {
    UnpamAuth.installLiveSniffer();
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

  // src/content/presensi.js
  var PresensiTracker = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this._init();
    }
    _init() {
      console.log("[Mentari Mod] Presensi Tracker aktif di MyUnpam.");
      UnpamAuth.installLiveSniffer();
      this._injectMainSniffer();
      window.addEventListener("mentari-presensi-popup", () => {
        this.openModal();
      });
      this._injectFloatingButton();
    }
    _injectMainSniffer() {
      if (document.getElementById("mentari-main-sniffer")) return;
      try {
        const isDist = chrome.runtime.getURL("manifest.json").includes("/dist/") || !chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0]?.startsWith("dist/");
        const s = document.createElement("script");
        s.id = "mentari-main-sniffer";
        s.src = chrome.runtime.getURL(isDist ? "content/main-sniffer.js" : "dist/content/main-sniffer.js");
        (document.head || document.documentElement).appendChild(s);
      } catch (e) {
      }
    }
    _injectFloatingButton() {
      if (document.getElementById("mentari-presensi-trigger-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-presensi-trigger-host";
      host.style.position = "fixed";
      host.style.bottom = "85px";
      host.style.right = "30px";
      host.style.zIndex = "2147483640";
      const shadow = host.attachShadow({ mode: "closed" });
      const btn = document.createElement("button");
      btn.style.cssText = `
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;
      btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      Cek Rekap Presensi
    `;
      btn.addEventListener("mouseover", () => {
        btn.style.transform = "translateY(-2px)";
        btn.style.background = "#4338ca";
      });
      btn.addEventListener("mouseout", () => {
        btn.style.transform = "none";
        btn.style.background = "#4f46e5";
      });
      btn.addEventListener("click", () => this.openModal());
      shadow.appendChild(btn);
      document.body.appendChild(host);
    }
    async openModal() {
      if (!this.host) {
        this._createModal();
      }
      const overlay = this.shadow.querySelector(".overlay");
      overlay.classList.add("open");
      await this._loadJadwal();
    }
    _createModal() {
      this.host = document.createElement("div");
      this.host.id = "mentari-presensi-modal-host";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        z-index: 2147483642;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .modal {
        width: 740px;
        max-width: 94vw;
        height: 600px;
        max-height: 88vh;
        background: #121215;
        border: 1px solid rgba(79, 70, 229, 0.35);
        border-radius: 16px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #e5e5e5;
      }
      .header {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .btn-refresh {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #ccc;
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
      }
      .btn-refresh:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
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
      .info-bar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        padding: 14px 20px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .info-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px 12px;
      }
      .info-label {
        font-size: 10px;
        font-weight: 700;
        color: #888;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }
      .info-value {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .content {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .course-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .course-card:hover {
        border-color: rgba(79, 70, 229, 0.5);
      }
      .course-header {
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }
      .course-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .course-name {
        font-size: 14px;
        font-weight: 700;
        color: #fff;
      }
      .course-stats-line {
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .badge-rate {
        font-size: 12px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 8px;
        white-space: nowrap;
      }
      .badge-rate-high {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      .badge-rate-mid {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
      .badge-rate-low {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      .meeting-details {
        padding: 0 16px 14px;
        display: none;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        margin-top: 4px;
      }
      .meeting-details.open {
        display: block;
      }
      .meeting-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .meeting-pill {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .meeting-pill.hadir {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.25);
        color: #10b981;
      }
      .meeting-pill.alpa {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.25);
        color: #ef4444;
      }
      .meeting-pill.pending {
        background: rgba(100, 116, 139, 0.1);
        border-color: rgba(100, 116, 139, 0.25);
        color: #94a3b8;
      }
      .loader {
        text-align: center;
        padding: 40px;
        color: #888;
        font-size: 13px;
      }
      .btn-scan {
        background: #4f46e5;
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        margin-top: 12px;
      }
    `;
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      overlay.innerHTML = `
      <div class="modal">
        <div class="header">
          <div class="title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Rekap Kehadiran Kuliah MyUnpam
          </div>
          <div class="header-actions">
            <button class="btn-refresh" id="btn-refresh-presensi" type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Muat Ulang
            </button>
            <button class="close-btn" id="btn-close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div id="presensi-info-bar"></div>
        <div class="content" id="presensi-list">
          <div class="loader">Memuat data jadwal & presensi dari server MyUnpam...</div>
        </div>
      </div>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(overlay);
      document.body.appendChild(this.host);
      const close = () => overlay.classList.remove("open");
      this.shadow.getElementById("btn-close").addEventListener("click", close);
      this.shadow.getElementById("btn-refresh-presensi").addEventListener("click", () => {
        UnpamAuth._cachedToken = null;
        this._loadJadwal();
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
    }
    async _loadJadwal() {
      const listEl = this.shadow.getElementById("presensi-list");
      const infoBarEl = this.shadow.getElementById("presensi-info-bar");
      listEl.innerHTML = '<div class="loader">Menghubungkan ke API MyUnpam...</div>';
      infoBarEl.innerHTML = "";
      try {
        let options = await UnpamAuth.getFetchOptions();
        if (!options.headers["Authorization"]) {
          window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
          await new Promise((r) => setTimeout(r, 600));
          options = await UnpamAuth.getFetchOptions();
        }
        if (!options.headers["Authorization"]) {
          listEl.innerHTML = `
          <div class="loader" style="color:#f59e0b; line-height:1.6;">
            <div style="font-weight:700; font-size:14px; margin-bottom:6px;">Sesi Login Belum Terdeteksi</div>
            <div style="font-size:12px; color:#aaa; max-width:420px; margin:0 auto 12px;">
              Silakan klik menu perkuliahan/presensi di halaman MyUnpam atau refresh tab agar ekstensi dapat menyadap token aktif kamu secara otomatis.
            </div>
            <button class="btn-scan" id="btn-rescan-token">Pindai Sesi Sekarang</button>
          </div>
        `;
          this.shadow.getElementById("btn-rescan-token")?.addEventListener("click", () => {
            UnpamAuth._cachedToken = null;
            this._loadJadwal();
          });
          return;
        }
        const res = await fetch("https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-kuliah", {
          method: "GET",
          headers: options.headers,
          credentials: "include"
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal mengambil jadwal presensi.`);
        }
        const data = await res.json();
        const rawCourses = Array.isArray(data) ? data : data.data || [];
        if (rawCourses.length === 0) {
          listEl.innerHTML = '<div class="loader">Tidak ada jadwal kuliah aktif ditemukan pada semester ini.</div>';
          return;
        }
        listEl.innerHTML = '<div class="loader">Memuat rincian kehadiran tiap pertemuan...</div>';
        const enrichedCourses = await Promise.all(rawCourses.map(async (c) => {
          const idKelas = c.id_kelas || c.id;
          const idMataKuliah = c.id_mata_kuliah || c.id_mk;
          let pertemuan = [];
          if (idKelas && idMataKuliah) {
            try {
              const pRes = await fetch(`https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-pertemuan/${idKelas}/${idMataKuliah}`, {
                method: "GET",
                headers: options.headers,
                credentials: "include"
              });
              if (pRes.ok) {
                const pData = await pRes.json();
                pertemuan = Array.isArray(pData) ? pData : pData.data || [];
              }
            } catch (err) {
              console.log(`[Presensi] Info fetch pertemuan ${c.nama_mata_kuliah}:`, err.message);
            }
          }
          return {
            ...c,
            pertemuan
          };
        }));
        this.coursesData = enrichedCourses;
        this._renderPresensiDashboard(enrichedCourses);
      } catch (e) {
        listEl.innerHTML = `<div class="loader" style="color:#ef4444;">Error: ${e.message}</div>`;
        Toast.error("Gagal mengambil data presensi: " + e.message);
      }
    }
    _renderPresensiDashboard(courses) {
      const listEl = this.shadow.getElementById("presensi-list");
      const infoBarEl = this.shadow.getElementById("presensi-info-bar");
      const first = courses[0] || {};
      const nim = first.nim || "-";
      const namaMhs = first.nama_mahasiswa || "-";
      const semester = first.nama_semester_registrasi || first.semester || "-";
      let totalPertemuanSemua = 0;
      let totalHadirSemua = 0;
      courses.forEach((c) => {
        const meetings = c.pertemuan || [];
        totalPertemuanSemua += meetings.length;
        totalHadirSemua += meetings.filter((m) => {
          const s = (m.presensi_status || m.status || "").toLowerCase();
          return s === "hadir" || s === "h";
        }).length;
      });
      const totalPersentase = totalPertemuanSemua > 0 ? (totalHadirSemua / totalPertemuanSemua * 100).toFixed(1) : "0.0";
      const rateColor = Number(totalPersentase) >= 80 ? "#10b981" : Number(totalPersentase) >= 70 ? "#f59e0b" : "#ef4444";
      infoBarEl.innerHTML = `
      <div class="info-bar">
        <div class="info-card">
          <div class="info-label">MAHASISWA</div>
          <div class="info-value" title="${namaMhs}">${namaMhs}</div>
        </div>
        <div class="info-card">
          <div class="info-label">NIM</div>
          <div class="info-value">${nim}</div>
        </div>
        <div class="info-card">
          <div class="info-label">SEMESTER</div>
          <div class="info-value">${semester}</div>
        </div>
        <div class="info-card" style="border-color:${rateColor}; background:rgba(255,255,255,0.03);">
          <div class="info-label" style="color:${rateColor};">TOTAL KEHADIRAN</div>
          <div class="info-value" style="color:${rateColor}; font-size:15px;">${totalPersentase}%</div>
        </div>
      </div>
    `;
      listEl.innerHTML = "";
      courses.forEach((c, idx) => {
        const meetings = c.pertemuan || [];
        const hadirCount = meetings.filter((m) => {
          const s = (m.presensi_status || m.status || "").toLowerCase();
          return s === "hadir" || s === "h";
        }).length;
        const totalMeetings = meetings.length;
        const alpaCount = meetings.filter((m) => {
          const s = (m.presensi_status || m.status || "").toLowerCase();
          return s === "alpa" || s === "tidak hadir" || s === "a";
        }).length;
        const coursePct = totalMeetings > 0 ? (hadirCount / totalMeetings * 100).toFixed(1) : "0.0";
        const badgeClass = Number(coursePct) >= 80 ? "badge-rate-high" : Number(coursePct) >= 70 ? "badge-rate-mid" : "badge-rate-low";
        const card = document.createElement("div");
        card.className = "course-card";
        let meetingItemsHtml = "";
        if (meetings.length === 0) {
          meetingItemsHtml = '<div style="font-size:11px; color:#888; padding:8px 0;">Data per pertemuan belum diterbitkan oleh dosen kelas ini.</div>';
        } else {
          meetingItemsHtml = `
          <div class="meeting-grid">
            ${meetings.map((m, mIdx) => {
            const status = (m.presensi_status || m.status || "").toLowerCase();
            let pillClass = "pending";
            let label = "Belum Ada";
            if (status === "hadir" || status === "h") {
              pillClass = "hadir";
              label = "Hadir";
            } else if (status === "alpa" || status === "tidak hadir" || status === "a") {
              pillClass = "alpa";
              label = "Alpa";
            } else if (status) {
              pillClass = "pending";
              label = m.presensi_status || m.status;
            }
            return `
                <div class="meeting-pill ${pillClass}">
                  <span>Pertemuan ${m.urutan || mIdx + 1}</span>
                  <span>${label}</span>
                </div>
              `;
          }).join("")}
          </div>
        `;
        }
        card.innerHTML = `
        <div class="course-header" data-target="details-${idx}">
          <div class="course-title-group">
            <div class="course-name">${c.nama_mata_kuliah || c.mata_kuliah || "Mata Kuliah"}</div>
            <div class="course-stats-line">
              <span>SKS: <b>${c.sks || "-"}</b></span>
              <span>Hadir: <b style="color:#10b981;">${hadirCount}</b></span>
              <span>Mangkir: <b style="color:#ef4444;">${alpaCount}</b></span>
              <span>Total: <b>${totalMeetings || 14} Pertemuan</b></span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="badge-rate ${badgeClass}">${coursePct}%</div>
            <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div class="meeting-details" id="details-${idx}">
          ${meetingItemsHtml}
        </div>
      `;
        const headerEl = card.querySelector(".course-header");
        const detailsEl = card.querySelector(`#details-${idx}`);
        const chevronEl = card.querySelector(".chevron-icon");
        headerEl.addEventListener("click", () => {
          const isOpen = detailsEl.classList.toggle("open");
          chevronEl.style.transform = isOpen ? "rotate(180deg)" : "none";
        });
        listEl.appendChild(card);
      });
    }
  };
  if (typeof window !== "undefined") {
    new PresensiTracker();
  }
})();
