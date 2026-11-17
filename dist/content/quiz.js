(() => {
  // src/utils/models.js
  var DEFAULT_FREE_MODEL = "gemini-4-hydrogen";
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
  var AutoPilotState = {
    KEY: "mentari_auto_pilot_state",
    async get() {
      const res = await Storage.get(this.KEY);
      const state = res?.[this.KEY];
      if (state && typeof state === "object" && Array.isArray(state.queue)) {
        return state;
      }
      return null;
    },
    async set(state) {
      return Storage.set({ [this.KEY]: state });
    },
    async reset() {
      return Storage.set({
        [this.KEY]: {
          active: false,
          finished: false,
          paused: false,
          queue: [],
          currentIndex: 0,
          pauseReason: null,
          updatedAt: Date.now()
        }
      });
    },
    async pause(reason = "Terjeda") {
      const state = await this.get();
      if (!state) return null;
      state.paused = true;
      state.pauseReason = reason;
      state.updatedAt = Date.now();
      await this.set(state);
      return state;
    },
    async resume() {
      const state = await this.get();
      if (!state) return null;
      state.active = true;
      state.paused = false;
      state.pauseReason = null;
      state.updatedAt = Date.now();
      await this.set(state);
      return state;
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
     * Alias kompatibilitas untuk getToken
     */
    async getToken() {
      return this.getAuthToken();
    },
    /**
     * Alias kompatibilitas untuk getXSRFToken
     */
    getXSRFToken() {
      return this.getXsrfToken();
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

  // src/utils/autopilot-sync.js
  var AutoPilotSync = {
    /**
     * Memindai API Mentari UNPAM untuk menemukan kuesioner yang baru terbuka (unlocked)
     * @param {Object} options
     * @param {Array} options.coursesMeta - List of { code, title }
     * @param {Array} options.currentQueue - Current queue items to prevent duplication
     * @returns {Promise<Array>} List of newly unlocked kuesioner queue items
     */
    async fetchUnlockedKuesionerList({ coursesMeta = [], currentQueue = [] } = {}) {
      try {
        const token = await UnpamAuth.getAuthToken();
        if (!token) {
          console.warn("[AutoPilotSync] Token autentikasi tidak ditemukan.");
          return [];
        }
        const headers = {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        };
        let targetCourses = Array.isArray(coursesMeta) && coursesMeta.length > 0 ? [...coursesMeta] : [];
        if (targetCourses.length === 0) {
          try {
            const res = await fetch("https://mentari.unpam.ac.id/api/user-course?page=1&limit=50", { headers });
            if (res.ok) {
              const data = await res.json();
              const list = data.data || (Array.isArray(data) ? data : []);
              targetCourses = list.map((c) => ({
                code: c.kode_course || c.kode || c.course_code || c.id,
                title: c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah"
              })).filter((c) => c.code);
            }
          } catch (e) {
            console.warn("[AutoPilotSync] Gagal memuat daftar user-course fallback:", e);
          }
        }
        if (targetCourses.length === 0) return [];
        const newlyUnlocked = [];
        const existingIds = new Set(
          (currentQueue || []).map((q) => String(q.id || q.subId || ""))
        );
        await Promise.allSettled(targetCourses.map(async (c) => {
          try {
            const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(c.code)}`, { headers });
            if (!cRes.ok) return;
            const cData = await cRes.json();
            const sections = Array.isArray(cData) ? cData : cData.data || [];
            for (const section of sections) {
              let meetingNum = null;
              const match = (section.nama_section || "").match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
              if (match) {
                meetingNum = parseInt(match[1], 10);
              } else if (typeof section.urutan === "number" && section.urutan > 0) {
                meetingNum = section.urutan;
              }
              const sectionName = section.nama_section || (meetingNum ? `Pertemuan ${meetingNum}` : `Pertemuan ${section.urutan || ""}`);
              const sectionCode = section.kode_section || section.nama_section || section.id;
              const subSections = section.sub_section || [];
              for (const sub of subSections) {
                const kt = String(sub.kode_template || sub.template || sub.type || sub.tipe || sub.kode_sub_section || "").trim().toUpperCase();
                const subTitle = String(sub.nama_sub_section || sub.judul || sub.title || sub.name || sub.deskripsi || "").toLowerCase();
                const isKues = kt.includes("KUES") || kt.includes("KUIS") || kt.includes("SURV") || kt.includes("ANGKET") || kt.includes("EVAL") || kt.includes("EDOM") || subTitle.includes("kuesioner") || subTitle.includes("kuisioner") || subTitle.includes("evaluasi") || subTitle.includes("angket") || subTitle.includes("survei") || subTitle.includes("survey") || subTitle.includes("edom");
                const validSubId = sub.id || sub._id || sub.id_sub_section || sub.sub_id || `KUESIONER_${meetingNum || section.urutan || "sec"}`;
                if (isKues && validSubId) {
                  const subIdStr = String(validSubId);
                  const isPostTestAlert = sub.warningAlert && /post[- ]?test/i.test(sub.warningAlert);
                  const isHardLocked = !!(sub.warningAlert && sub.warningAlert.length > 0 && !isPostTestAlert);
                  let isLmsCompleted = false;
                  if (!isPostTestAlert) {
                    isLmsCompleted = Boolean(
                      sub.completion === true || sub.completion === 1 || sub.completion === "1" || sub.completion === "true" || sub.is_completed === true || sub.completed === true || sub.is_done === true || sub.status === "completed" || sub.status === "done" || Array.isArray(sub.history) && sub.history.length > 0
                    );
                  }
                  if (!isLmsCompleted && !isHardLocked && !existingIds.has(subIdStr)) {
                    existingIds.add(subIdStr);
                    newlyUnlocked.push({
                      id: validSubId,
                      subId: validSubId,
                      sectionCode,
                      courseCode: c.code,
                      courseTitle: c.title,
                      sectionName,
                      meetingNum,
                      type: "KUESIONER",
                      name: sub.nama_sub_section || sub.judul || "Kuesioner Evaluasi Dosen",
                      url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(c.code)}/kuesioner/${encodeURIComponent(sectionCode || validSubId)}`,
                      status: "pending",
                      statusLabel: "Siap Diisi"
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`[AutoPilotSync] Gagal memuat section matkul ${c.code}:`, err);
          }
        }));
        newlyUnlocked.sort((a, b) => {
          const numA = typeof a.meetingNum === "number" ? a.meetingNum : 999;
          const numB = typeof b.meetingNum === "number" ? b.meetingNum : 999;
          return numA - numB;
        });
        return newlyUnlocked;
      } catch (e) {
        console.error("[AutoPilotSync] Error saat fetch kuesioner terbuka:", e);
        return [];
      }
    },
    /**
     * Real-Time Sweep & Queue Replenishment
     * Menambahkan kuesioner yang baru terbuka ke dalam antrean Auto-Pilot
     * @param {Object} state - Current AutoPilot state
     * @param {HTMLElement} [statusEl] - Optional status element to show progress
     * @returns {Promise<boolean>} True jika ada kuesioner yang berhasil ditambahkan ke antrean
     */
    async syncAndAppendKuesioner(state, statusEl = null) {
      if (!state || !state.active || !Array.isArray(state.queue)) return false;
      if (statusEl) {
        statusEl.textContent = "Sinkronisasi Real-Time: Memeriksa kuesioner yang baru terbuka di server UNPAM...";
      }
      await new Promise((r) => setTimeout(r, 1200));
      const newlyUnlocked = await this.fetchUnlockedKuesionerList({
        coursesMeta: state.coursesMeta,
        currentQueue: state.queue
      });
      if (newlyUnlocked.length > 0) {
        console.log(`[AutoPilotSync] Berhasil mendeteksi ${newlyUnlocked.length} kuesioner baru yang terbuka:`, newlyUnlocked);
        state.queue.push(...newlyUnlocked);
        state.total = state.queue.length;
        state.updatedAt = Date.now();
        await AutoPilotState.set(state);
        if (statusEl) {
          statusEl.textContent = `Sinkronisasi sukses! Menemukan ${newlyUnlocked.length} kuesioner yang siap dikerjakan.`;
        }
        return true;
      }
      console.log("[AutoPilotSync] Tidak ditemukan kuesioner baru yang terbuka.");
      return false;
    }
  };

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

  // src/content/quiz.js
  var ALL_MODELS = ACTIVE_FREE_MODELS.map((m) => ({ id: m.id, name: m.label }));
  var VALID_MODEL_IDS = VALID_FREE_MODEL_IDS;
  var DEFAULT_MODEL = DEFAULT_FREE_MODEL;
  var QuizAssistant = class {
    constructor() {
      this.isRunning = false;
      this.isPaused = false;
      this.isAutoMode = false;
      this.isAutoPilot = false;
      this.answeredCount = 0;
      this.totalQuestions = 0;
      this.shadow = null;
      this.hudShadow = null;
      this.hudHost = null;
      this.activeModel = DEFAULT_MODEL;
      this._currentSessionQuestions = [];
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod] Quiz Assistant aktif.");
      try {
        const { gemini_model } = await Storage.get("gemini_model", { gemini_model: DEFAULT_MODEL });
        if (gemini_model && VALID_MODEL_IDS.includes(gemini_model)) {
          this.activeModel = gemini_model;
        } else {
          this.activeModel = DEFAULT_MODEL;
          await Storage.set({ gemini_model: DEFAULT_MODEL });
        }
      } catch (e) {
        this.activeModel = DEFAULT_MODEL;
      }
      this._injectFloatingControl();
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.gemini_model) {
            const newModel = changes.gemini_model.newValue;
            if (newModel && VALID_MODEL_IDS.includes(newModel)) {
              this.activeModel = newModel;
              const selectModel = this.shadow?.getElementById("quiz-select-model");
              if (selectModel && selectModel.value !== newModel) {
                selectModel.value = newModel;
              }
              const hudSelect = this.hudShadow?.getElementById("hud-select-model");
              if (hudSelect && hudSelect.value !== newModel) {
                hudSelect.value = newModel;
              }
            }
          }
        });
      }
      await this._checkAndInitAutoPilot();
    }
    _getExamSessionKey() {
      try {
        const m = window.location.pathname.match(/\/exam\/([^/?]+)/);
        return (m?.[1] || document.title || "quiz").trim();
      } catch {
        return "quiz";
      }
    }
    _hasExamNeedsVerification() {
      try {
        return sessionStorage.getItem(`mentari_quiz_needs_verify_${this._getExamSessionKey()}`) === "1";
      } catch {
        return false;
      }
    }
    _markExamNeedsVerification(flag = true) {
      try {
        const key = `mentari_quiz_needs_verify_${this._getExamSessionKey()}`;
        if (flag) {
          sessionStorage.setItem(key, "1");
        } else {
          sessionStorage.removeItem(key);
        }
      } catch {
      }
    }
    async _waitForQuestionNumberChange(prevNum, maxWaitMs = 2500) {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        await Humanizer.delay(150);
        const curNum = this._extractActiveQuestionNumberFromDOM();
        if (curNum !== null && curNum !== prevNum) {
          return curNum;
        }
      }
      return null;
    }
    _injectFloatingControl() {
      if (document.getElementById("mentari-quiz-control-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-quiz-control-host";
      host.style.position = "fixed";
      host.style.bottom = "24px";
      host.style.right = "24px";
      host.style.zIndex = "2147483641";
      this.shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .quiz-card {
        background: rgba(18, 18, 22, 0.96);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(212, 175, 55, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 250px;
      }
      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.35);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.6);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      .quiz-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: grab;
        user-select: none;
      }
      .quiz-title {
        font-size: 13px;
        font-weight: 700;
        color: #d4af37;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .model-select {
        width: 100%;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #e5e5e5;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 11px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      .model-select:focus {
        border-color: #d4af37;
      }
      .model-select option {
        background: #18181c;
        color: #fff;
      }
      .btn-action {
        background: #d4af37;
        color: #121212;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
      }
      .btn-action:hover {
        background: #e6be40;
        transform: translateY(-1px);
      }
      .btn-action:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .btn-single {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-single:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .status-text {
        font-size: 11px;
        color: #aaa;
        line-height: 1.3;
      }
    `;
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Mentari AI Quiz
        </div>
      </div>
      <div>
        <select class="model-select" id="quiz-select-model" title="Pilih Model AI Gemini">
          ${ALL_MODELS.map((m) => `<option value="${m.id}" ${m.id === this.activeModel ? "selected" : ""}>${m.name}</option>`).join("")}
        </select>
      </div>
      <div class="status-text" id="status-text">Siap membantu mengerjakan kuis.</div>
      <div style="display:flex; gap:8px;">
        <button class="btn-single" id="btn-single" type="button">Jawab Ini</button>
        <button class="btn-action" id="btn-auto" type="button">Auto Semua</button>
      </div>
      <button class="btn-single" id="btn-verify-all" type="button" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px;" title="Periksa semua soal yang sudah terjawab mulai dari nomor 1 dan perbaiki jika salah">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Cek &amp; Koreksi (1 \u2192 N)
      </button>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(card);
      document.body.appendChild(host);
      this._makeElementDraggable(host, card.querySelector(".quiz-header"));
      const selectModel = this.shadow.getElementById("quiz-select-model");
      const btnSingle = this.shadow.getElementById("btn-single");
      const btnAuto = this.shadow.getElementById("btn-auto");
      const btnVerifyAll = this.shadow.getElementById("btn-verify-all");
      const statusText = this.shadow.getElementById("status-text");
      if (selectModel) {
        selectModel.value = this.activeModel;
        selectModel.addEventListener("change", () => {
          const chosen = selectModel.value;
          if (chosen && VALID_MODEL_IDS.includes(chosen)) {
            this.activeModel = chosen;
            Storage.set({ gemini_model: chosen });
            const label = selectModel.options[selectModel.selectedIndex]?.text || chosen;
            Toast.info(`Model diubah ke: ${label}`);
          }
        });
      }
      btnSingle.addEventListener("click", async () => {
        const comp = this._checkIfExamAlreadyCompleted();
        if (comp.isCompleted) {
          Toast.warning(`Kuis ini sudah selesai (${comp.reason}).`);
          statusText.textContent = "Kuis sudah selesai dikerjakan.";
          return;
        }
        const locked = this._checkIfExamLocked();
        if (locked.isLocked) {
          Toast.warning(`Kuis terkunci: ${locked.reason}`);
          statusText.textContent = "Kuis terkunci / belum dapat diakses.";
          return;
        }
        btnSingle.disabled = true;
        statusText.textContent = "Menganalisis soal saat ini...";
        try {
          await this.processCurrentQuestion(false);
          statusText.textContent = "Jawaban berhasil dipilih.";
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error(e.message);
        } finally {
          btnSingle.disabled = false;
        }
      });
      const startAutoRun = async (verifyExisting = false) => {
        if (this.isRunning) {
          this.isRunning = false;
          btnAuto.textContent = "Auto Semua";
          if (btnVerifyAll) btnVerifyAll.disabled = false;
          statusText.textContent = "Otomatisasi dihentikan.";
          Toast.info("Otomatisasi kuis dihentikan pengguna.");
          return;
        }
        const comp = this._checkIfExamAlreadyCompleted();
        if (comp.isCompleted) {
          Toast.warning(`Kuis ini sudah selesai (${comp.reason}). Otomatisasi dinonaktifkan.`);
          statusText.textContent = "Kuis sudah selesai dikerjakan.";
          return;
        }
        const locked = this._checkIfExamLocked();
        if (locked.isLocked) {
          Toast.warning(`Kuis terkunci: ${locked.reason}`);
          statusText.textContent = "Kuis terkunci / belum dapat diakses.";
          return;
        }
        this.isRunning = true;
        btnAuto.textContent = "Hentikan";
        if (btnVerifyAll) btnVerifyAll.disabled = true;
        statusText.textContent = verifyExisting ? "Memeriksa jawaban terisi dari soal #1 via AI..." : "Menjalankan kuis secara bertahap...";
        Toast.info(verifyExisting ? "Mode Cek & Koreksi aktif: menyisir soal dari nomor 1." : "Mode auto-quiz aktif dengan jeda humanized anti-deteksi.");
        try {
          await this.runAutoLoop(statusText, false, { verifyExisting });
        } catch (e) {
          Toast.error(e.message);
        } finally {
          this.isRunning = false;
          btnAuto.textContent = "Auto Semua";
          if (btnVerifyAll) btnVerifyAll.disabled = false;
        }
      };
      btnAuto.addEventListener("click", () => startAutoRun(false));
      btnVerifyAll?.addEventListener("click", () => startAutoRun(true));
    }
    /**
     * Ekstrak informasi judul kuis, pertemuan, dan tipe evaluasi dari DOM Mentari
     */
    _extractExamTitleAndTypeFromDOM() {
      let rawText = "";
      const backBtn = Array.from(document.querySelectorAll("a, button, div, span")).find((el) => {
        const t = (el.textContent || "").trim().toLowerCase();
        return t === "kembali" || t === "\u2190 kembali" || t.startsWith("kembali");
      });
      if (backBtn) {
        const parent = backBtn.closest(".MuiBox-root, .MuiToolbar-root, header, nav, div");
        if (parent) {
          rawText += " " + parent.textContent;
        }
      }
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, .MuiTypography-root"));
      for (const h of headings.slice(0, 15)) {
        rawText += " " + (h.textContent || "");
      }
      rawText += " " + (document.title || "");
      const lower = rawText.toLowerCase();
      let detectedType = "UNKNOWN";
      if (/(?:pre[\s\-_]*test|pretest)/i.test(lower)) {
        detectedType = "PRE_TEST";
      } else if (/(?:post[\s\-_]*test|posttest)/i.test(lower)) {
        detectedType = "POST_TEST";
      } else if (/(?:kuesioner|kuisioner|angket|survey)/i.test(lower)) {
        detectedType = "KUESIONER";
      }
      const meetMatch = lower.match(/(?:pertemuan|sesi|p)[\s\-_]*(\d+)/i);
      const meetingName = meetMatch ? `Pertemuan ${meetMatch[1]}` : "";
      let cleanTitle = "";
      for (const h of headings) {
        const t = (h.textContent || "").trim();
        if (/(?:pre[\s\-_]*test|post[\s\-_]*test|kuis|quiz|ujian)/i.test(t) && t.length < 60 && !t.toLowerCase().includes("sudah selesai")) {
          cleanTitle = t;
          break;
        }
      }
      if (!cleanTitle) {
        cleanTitle = detectedType === "PRE_TEST" ? `Pre-Test ${meetingName}`.trim() : detectedType === "POST_TEST" ? `Post-Test ${meetingName}`.trim() : "Kuis";
      }
      return {
        detectedType,
        meetingName,
        cleanTitle,
        rawText
      };
    }
    /**
     * Helper untuk memeriksa apakah elemen memiliki indikator warna hijau (terjawab)
     */
    /**
     * Helper untuk memeriksa apakah elemen memiliki indikator warna hijau (terjawab)
     */
    _isGreenColor(btn) {
      if (!btn) return false;
      const elementsToCheck = [btn, ...Array.from(btn.querySelectorAll ? btn.querySelectorAll("*") : btn.children || [])];
      for (const el of elementsToCheck) {
        const style = window.getComputedStyle(el);
        const bg = (style.backgroundColor || "").toLowerCase();
        const color = (style.color || "").toLowerCase();
        const border = (style.borderColor || "").toLowerCase();
        const className = (el.className || "").toString().toLowerCase();
        const inlineStyle = (el.getAttribute("style") || "").toLowerCase();
        const titleAttr = (el.getAttribute("title") || "").toLowerCase();
        const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
        if (className.includes("success") || className.includes("answered") || className.includes("completed") || className.includes("muibutton-containedsuccess") || className.includes("terjawab") || className.includes("bg-green") || className.includes("btn-success") || titleAttr.includes("terjawab") || titleAttr.includes("sudah") || ariaLabel.includes("terjawab") || ariaLabel.includes("sudah")) {
          return true;
        }
        if (inlineStyle.includes("green") || inlineStyle.includes("#2e7d32") || inlineStyle.includes("#4caf50") || inlineStyle.includes("#16a34a") || inlineStyle.includes("#22c55e") || inlineStyle.includes("46, 125, 50") || inlineStyle.includes("76, 175, 80")) {
          return true;
        }
        if (bg.includes("46, 125, 50") || bg.includes("76, 175, 80") || bg.includes("46, 133, 64") || bg.includes("34, 197, 94") || bg.includes("16, 185, 129") || bg.includes("22, 163, 74") || bg.includes("56, 142, 60") || bg.includes("102, 187, 106") || bg.includes("green")) {
          return true;
        }
        for (const colorStr of [bg, border]) {
          const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            const isNeutral = Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
            if (!isNeutral && g >= 75 && g > r * 1.15 && g > b * 1.15) {
              return true;
            }
          }
        }
      }
      return false;
    }
    /**
     * Ekstrak nomor soal aktif yang sedang terbuka di layar
     * Mendeteksi header soal ("1 . Multiple Choice", "Soal 1"), URL query params, atau tombol navigasi aktif
     */
    _extractActiveQuestionNumberFromDOM() {
      try {
        const container = this._findQuestionContainer();
        if (container) {
          const textNodes = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6, .MuiTypography-root, p, div, span"));
          for (const el of textNodes) {
            if (el.closest('.MuiFormControlLabel-root, label, .MuiRadio-root, input[type="radio"], #mentari-autopilot-hud-host')) continue;
            const txt = (el.textContent || "").trim();
            const matchMC = txt.match(/^(\d+)\s*[\.\)]\s*(?:multiple\s*choice|pilihan\s*ganda)?/i);
            if (matchMC) {
              const n = parseInt(matchMC[1], 10);
              if (!isNaN(n) && n >= 1 && n <= 200) return n;
            }
            const matchSoal = txt.match(/^(?:soal|pertanyaan|question)\s*(?:no\.?|nomor)?\s*(\d+)/i);
            if (matchSoal) {
              const n = parseInt(matchSoal[1], 10);
              if (!isNaN(n) && n >= 1 && n <= 200) return n;
            }
          }
        }
        const urlParams = new URLSearchParams(window.location.search);
        for (const param of ["page", "soal", "no", "question", "q", "p"]) {
          const val = urlParams.get(param);
          if (val && /^\d+$/.test(val)) {
            const n = parseInt(val, 10);
            if (!isNaN(n) && n >= 1 && n <= 200) return n;
          }
        }
        const navKeywords = ["navigasi soal", "navigasi quiz", "quiz navigation", "exam navigation", "daftar soal"];
        const allTextEls = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, .MuiTypography-root, span, p, div, b, strong"));
        const navHeader = allTextEls.find((el) => {
          if (el.closest("#mentari-quiz-control-host, #mentari-autopilot-hud-host")) return false;
          const t = (el.textContent || "").trim().toLowerCase();
          return navKeywords.some((kw) => t === kw || t.startsWith(kw) && t.length < 35);
        });
        let navButtons = [];
        if (navHeader) {
          let curr = navHeader.parentElement;
          for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
            const found = Array.from(curr.querySelectorAll('button, a, div, span, [role="button"]')).filter((el) => {
              if (el.closest("#mentari-quiz-control-host, #mentari-autopilot-hud-host, .MuiDialog-root")) return false;
              const t = (el.textContent || "").trim();
              return /^\d+$/.test(t);
            });
            if (found.length > 0) {
              navButtons = found;
              break;
            }
            curr = curr.parentElement;
          }
        }
        for (const btn of navButtons) {
          const rawClass = String(btn?.className?.baseVal || btn?.className || "").toLowerCase();
          const isCurrent = btn.classList?.contains?.("active") || btn.classList?.contains?.("Mui-selected") || btn.getAttribute?.("aria-current") === "true" || btn.getAttribute?.("aria-selected") === "true" || rawClass.includes("selected") && !rawClass.includes("unselected");
          if (isCurrent) {
            const n = parseInt((btn.textContent || "").trim(), 10);
            if (!isNaN(n) && n >= 1 && n <= 200) return n;
          }
        }
      } catch (e) {
        console.warn("[Quiz] Error saat deteksi nomor soal aktif:", e);
      }
      return null;
    }
    /**
     * Ekstrak status navigasi nomor soal dari halaman kuis/ujian (Anti-Skip, Anti-Submit Prematur)
     * Berbasis pencarian card "Navigasi Soal" dan penelusuran tombol nomor (/^\d+$/).
     * Membedakan status hijau (terjawab) vs abu-abu/putih (belum terjawab).
     */
    _getExamNavigationStatus() {
      try {
        const navKeywords = ["navigasi soal", "navigasi quiz", "quiz navigation", "exam navigation", "daftar soal"];
        const allTextEls = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, .MuiTypography-root, span, p, div, b, strong"));
        const navHeader = allTextEls.find((el) => {
          if (el.closest("#mentari-quiz-control-host, #mentari-autopilot-hud-host")) return false;
          const t = (el.textContent || "").trim().toLowerCase();
          return navKeywords.some((kw) => t === kw || t.startsWith(kw) && t.length < 35);
        });
        let rawButtons = [];
        if (navHeader) {
          let curr = navHeader.parentElement;
          for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
            const found = Array.from(curr.querySelectorAll('button, a, div, span, [role="button"]')).filter((el) => {
              if (el.closest("#mentari-quiz-control-host, #mentari-autopilot-hud-host, .MuiDialog-root")) return false;
              const t = (el.textContent || "").trim();
              if (!/^\d+$/.test(t)) return false;
              const n = parseInt(t, 10);
              return n >= 1 && n <= 200;
            });
            if (found.length > 0) {
              rawButtons = found;
              break;
            }
            curr = curr.parentElement;
          }
        }
        if (rawButtons.length === 0) {
          const allCandidates = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'));
          rawButtons = allCandidates.filter((el) => {
            if (el.closest("#mentari-quiz-control-host, #mentari-autopilot-hud-host, .MuiDialog-root")) return false;
            const t = (el.textContent || "").trim();
            if (!/^\d+$/.test(t)) return false;
            const n = parseInt(t, 10);
            return n >= 1 && n <= 200;
          });
        }
        if (rawButtons.length === 0) return null;
        const buttonMap = /* @__PURE__ */ new Map();
        for (const el of rawButtons) {
          const num = parseInt((el.textContent || "").trim(), 10);
          if (isNaN(num)) continue;
          const clickable = el.closest('button, a, [role="button"]') || el;
          const isVisible = window.getComputedStyle(clickable).display !== "none" && window.getComputedStyle(clickable).visibility !== "hidden";
          if (!buttonMap.has(num) || isVisible && !buttonMap.get(num).isVisible) {
            buttonMap.set(num, { btn: clickable, isVisible, num });
          }
        }
        if (buttonMap.size === 0) return null;
        const activeQuestionNum = this._extractActiveQuestionNumberFromDOM();
        const curRadioChecked = !!this._findQuestionContainer()?.querySelector('input[type="radio"]:checked');
        const sortedEntries = Array.from(buttonMap.values()).sort((a, b) => a.num - b.num);
        const questions = sortedEntries.map(({ btn, num }) => {
          const rawClass = String(btn?.className?.baseVal || btn?.className || "");
          const classLower = rawClass.toLowerCase();
          const isCurrent = activeQuestionNum !== null && activeQuestionNum === num || btn.classList?.contains?.("active") || btn.classList?.contains?.("Mui-selected") || btn.getAttribute?.("aria-current") === "true" || btn.getAttribute?.("aria-selected") === "true" || classLower.includes("selected") && !classLower.includes("unselected");
          let isAnswered = this._isGreenColor(btn);
          if (isCurrent && curRadioChecked) {
            isAnswered = true;
          }
          const isUnanswered = !isAnswered;
          return {
            num,
            btn,
            isAnswered,
            isUnanswered,
            isCurrent
          };
        });
        const unanswered = questions.filter((q) => q.isUnanswered || !q.isAnswered);
        const totalQuestions = questions.length;
        return {
          total: totalQuestions,
          totalQuestions,
          questions,
          unansweredCount: unanswered.length,
          answeredCount: totalQuestions - unanswered.length,
          allAnswered: unanswered.length === 0 && totalQuestions > 0
        };
      } catch (err) {
        console.warn("[Quiz] Error parsing exam navigation status:", err);
        return null;
      }
    }
    /**
     * Deteksi apakah kuis saat ini sudah selesai (Review Mode / Skor Akhir)
     * PRIORITAS TERTINGGI: Dicek SEBELUM mencari container soal untuk mencegah kuota AI terbuang sia-sia!
     */
    _checkIfExamAlreadyCompleted() {
      const domInfo = this._extractExamTitleAndTypeFromDOM();
      const completedKeywords = [
        "quiz sudah selesai",
        "kuis sudah selesai",
        "ujian sudah selesai",
        "tes sudah selesai",
        "telah diselesaikan",
        "sudah diselesaikan",
        "hasil kuis",
        "hasil ujian",
        "nilai akhir",
        "skor anda",
        "nilai anda",
        "anda telah menyelesaikan kuis ini",
        "anda sudah mengerjakan kuis ini",
        "attempt 1 of 1",
        "percobaan 1 dari 1"
      ];
      const allHeaders = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, .MuiTypography-root, p, div"));
      let explicitCompletion = null;
      for (const el of allHeaders) {
        if (el.closest("#mentari-autopilot-hud-host") || el.closest("#mentari-quiz-control-host") || el.closest("#mentari-token-mod-host") || el.closest(".mentari-toast-container")) {
          continue;
        }
        const t = (el.textContent || "").trim().toLowerCase();
        for (const kw of completedKeywords) {
          if (t.includes(kw)) {
            explicitCompletion = {
              isCompleted: true,
              reason: `Teks '${kw}' terdeteksi pada layar`,
              detectedType: domInfo.detectedType,
              title: domInfo.cleanTitle
            };
            break;
          }
        }
        if (explicitCompletion) break;
      }
      const activeRadios = Array.from(document.querySelectorAll('input[type="radio"]:not(:disabled)'));
      const hasActiveRadios = activeRadios.length > 0;
      const pageText = (document.body?.innerText || "").toLowerCase();
      const hasActiveTimer = pageText.includes("waktu tersisa") || pageText.includes("sisa waktu") || pageText.includes("time remaining");
      const hasUnansweredBadge = pageText.includes("belum dijawab");
      if (!explicitCompletion && (hasActiveTimer || hasUnansweredBadge || hasActiveRadios)) {
        return {
          isCompleted: false,
          reason: "",
          detectedType: domInfo.detectedType,
          title: domInfo.cleanTitle
        };
      }
      if (explicitCompletion && !hasActiveRadios) {
        return explicitCompletion;
      }
      const scoreTable = document.querySelector("table.MuiTable-root, .hasil-ujian, .skor-container");
      if (scoreTable && !hasActiveRadios) {
        const tableText = (scoreTable.textContent || "").toLowerCase();
        if (tableText.includes("nilai") || tableText.includes("skor") || tableText.includes("grade") || tableText.includes("selesai")) {
          return {
            isCompleted: true,
            reason: "Tabel riwayat nilai/skor terdeteksi",
            detectedType: domInfo.detectedType,
            title: domInfo.cleanTitle
          };
        }
      }
      const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
      if (radioInputs.length > 0 && radioInputs.every((r) => r.disabled || r.getAttribute("aria-disabled") === "true")) {
        return {
          isCompleted: true,
          reason: "Seluruh opsi pilihan kuis disabled (Read-only review)",
          detectedType: domInfo.detectedType,
          title: domInfo.cleanTitle
        };
      }
      return {
        isCompleted: false,
        reason: "",
        detectedType: domInfo.detectedType,
        title: domInfo.cleanTitle
      };
    }
    /**
     * Deteksi apakah kuis sedang terkunci (misal forum diskusi belum diselesaikan atau waktu belum buka)
     */
    _checkIfExamLocked() {
      const alertEl = document.querySelector('.MuiAlert-root, [role="alert"], .alert-warning, .alert-danger');
      if (alertEl) {
        const t = (alertEl.textContent || "").trim().toLowerCase();
        if (t.includes("terkunci") || t.includes("belum dapat diakses") || t.includes("prasyarat") || t.includes("selesaikan terlebih dahulu")) {
          return {
            isLocked: true,
            reason: alertEl.textContent.trim()
          };
        }
      }
      const startBtn = this._findStartExamButton();
      if (startBtn && (startBtn.disabled || startBtn.classList.contains("Mui-disabled"))) {
        return {
          isLocked: true,
          reason: "Tombol mulai kuis berstatus disabled (Terkunci)"
        };
      }
      const pageText = (document.body?.innerText || "").toLowerCase();
      if (pageText.includes("waktu pengerjaan telah habis") || pageText.includes("waktu ujian telah habis") || pageText.includes("waktu telah berakhir") || pageText.includes("waktu telah habis") || pageText.includes("waktu pengerjaan kuis telah habis")) {
        return {
          isLocked: true,
          reason: "Waktu pengerjaan 1 jam di UNPAM telah habis (Attempt Expired)"
        };
      }
      return { isLocked: false, reason: "" };
    }
    /**
     * Catat ID kuis yang selesai ke storage lokal persisten (mentari_completed_quiz_ids & cache)
     * agar kuis ini TIDAK PERNAH DIJALANKAN ULANG dan kuota token pengguna tetap aman.
     */
    async _markQuizAsCompletedPermanently(state, currentItem) {
      try {
        const quizId = currentItem?.id;
        if (!quizId) return;
        const store = await Storage.get("mentari_completed_quiz_ids");
        const completedIds = Array.isArray(store?.mentari_completed_quiz_ids) ? store.mentari_completed_quiz_ids : [];
        if (!completedIds.includes(quizId)) {
          completedIds.push(quizId);
          await Storage.set({ mentari_completed_quiz_ids: completedIds });
          console.log(`[Auto-Pilot] Kuis ID ${quizId} (${currentItem.courseTitle} - ${currentItem.sectionName}) ditandai selesai secara permanen.`);
        }
        const allStorage = Storage && typeof Storage.getAll === "function" ? await Storage.getAll() : {};
        for (const [key, val] of Object.entries(allStorage || {})) {
          if (key && key.startsWith("mentari_cached_data_") && val && Array.isArray(val.evaluations)) {
            let updated = false;
            val.evaluations.forEach((ev) => {
              if (ev.subId === quizId || ev.id === quizId) {
                ev.completion = true;
                updated = true;
              }
            });
            if (updated) {
              await Storage.set({ [key]: val });
            }
          }
        }
      } catch (e) {
        console.warn("[Auto-Pilot] Gagal menyimpan status kuis selesai permanen:", e);
      }
    }
    /**
     * Cari tombol mulai kuis / ujian dengan pencarian keyword fleksibel & tahan banting
     */
    _findStartExamButton() {
      const startKeywords = [
        "mulai quiz",
        "mulai kuis",
        "mulai ujian",
        "mulai tes",
        "mulai",
        "kerjakan quiz",
        "kerjakan kuis",
        "kerjakan ujian",
        "kerjakan tes",
        "kerjakan",
        "start exam",
        "start quiz",
        "take quiz",
        "attempt quiz",
        "attempt now",
        "attempt quiz now",
        "re-attempt quiz",
        "kerjakan ulang",
        "lanjutkan quiz",
        "lanjutkan kuis",
        "lanjutkan ujian",
        "lanjutkan"
      ];
      const startBtn = DOM.findButtonByText(startKeywords);
      if (startBtn) return startBtn;
      const allButtons = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"]'));
      for (const b of allButtons) {
        if (b.closest("#mentari-autopilot-hud-host") || b.closest("#mentari-quiz-control-host") || b.closest("#mentari-token-mod-host") || b.closest(".mentari-toast-container")) {
          continue;
        }
        if (b.disabled || b.classList.contains("Mui-disabled") || b.getAttribute("aria-disabled") === "true") {
          continue;
        }
        const text = (b.textContent || b.value || "").trim().toLowerCase();
        if (text.includes("kembali") || text.includes("back") || text.includes("cancel") || text.includes("batal") || text.includes("daftar")) {
          continue;
        }
        if (text.includes("mulai") || text.includes("quiz") && !text.includes("belum") || text.includes("kuis") && !text.includes("belum") || text.includes("kerjakan")) {
          return b;
        }
      }
      return null;
    }
    /**
     * Cari tombol konfirmasi modal / dialog MUI ("Ya", "Mulai", "Lanjutkan")
     */
    _findDialogConfirmButton(excludeBtn = null, extraKeywords = null) {
      const dialog = document.querySelector('.MuiDialog-root, [role="dialog"], .MuiModal-root, .modal');
      if (!dialog) return null;
      const defaultKeywords = [
        "ya",
        "mulai",
        "start",
        "ok",
        "setuju",
        "kerjakan",
        "lanjutkan",
        "ya, mulai",
        "mulai quiz",
        "mulai kuis",
        "kumpulkan",
        "selesaikan",
        "ya, selesaikan",
        "akhiri",
        "submit",
        "kirim"
      ];
      const confirmKeywords = Array.isArray(extraKeywords) ? [...defaultKeywords, ...extraKeywords] : defaultKeywords;
      const confirmBtn = DOM.findButtonByText(confirmKeywords, dialog);
      if (confirmBtn && confirmBtn !== excludeBtn) {
        return confirmBtn;
      }
      return null;
    }
    /**
     * Polling waiter hingga elemen soal kuis ter-mount di DOM
     */
    async _waitForQuestionContainer(timeoutMs = 15e3) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const q = this._findQuestionContainer();
        if (q) return q;
        await Humanizer.delay(400);
      }
      return null;
    }
    /**
     * Eksekusi loop menjawab & memverifikasi seluruh soal dengan jeda natural manusia
     */
    async runAutoLoop(statusEl, isAutoPilot = false, { verifyExisting = false } = {}) {
      const initialComp = this._checkIfExamAlreadyCompleted();
      if (initialComp.isCompleted) {
        if (statusEl) statusEl.textContent = `${initialComp.title || "Kuis"} sudah selesai dikerjakan (${initialComp.reason}).`;
        this.isRunning = false;
        return { isFinished: true, submitted: true, reason: initialComp.reason };
      }
      let qContainer = this._findQuestionContainer();
      if (!qContainer) {
        const startBtn = this._findStartExamButton();
        if (startBtn) {
          if (statusEl) statusEl.textContent = "Menemukan tombol mulai kuis... Memulai pengerjaan!";
          await Humanizer.randomDelay(600, 1200);
          await Humanizer.naturalClick(startBtn);
          await Humanizer.delay(800);
          const confirmBtn = this._findDialogConfirmButton(startBtn);
          if (confirmBtn) {
            await Humanizer.naturalClick(confirmBtn);
          }
          if (statusEl) statusEl.textContent = "Menunggu soal dimuat...";
          qContainer = await this._waitForQuestionContainer(15e3);
        } else {
          if (statusEl) statusEl.textContent = "Menunggu soal kuis dimuat...";
          qContainer = await this._waitForQuestionContainer(15e3);
        }
      }
      const verifyMode = Boolean(verifyExisting || this._hasExamNeedsVerification());
      const verifiedNums = /* @__PURE__ */ new Set();
      let hadVerifyFailure = false;
      const initialNav = this._getExamNavigationStatus();
      if (verifyMode && initialNav?.questions?.length > 0) {
        const firstAnswered = initialNav.questions.find((q) => q.isAnswered) || initialNav.questions[0];
        const curActiveNum = this._extractActiveQuestionNumberFromDOM();
        if (firstAnswered && !firstAnswered.isCurrent && firstAnswered.btn) {
          if (statusEl) statusEl.textContent = `Membuka Soal ${firstAnswered.num} untuk memeriksa jawaban...`;
          await Humanizer.naturalClick(firstAnswered.btn);
          await this._waitForQuestionNumberChange(curActiveNum, 2500);
          await Humanizer.delay(250);
        }
      }
      let loopIterations = 0;
      const totalQEstimate = initialNav?.questions?.length || 20;
      const maxSafetyIterations = Math.max(60, totalQEstimate * 3);
      this._currentSessionQuestions = [];
      while (this.isRunning && loopIterations < maxSafetyIterations) {
        loopIterations++;
        while (this.isPaused && this.isRunning) {
          if (statusEl) statusEl.textContent = "Auto-Pilot dijeda sementara.";
          await Humanizer.delay(600);
        }
        if (!this.isRunning) {
          return { isFinished: false, submitted: false, reason: "Dibatalkan oleh pengguna" };
        }
        const stepComp = this._checkIfExamAlreadyCompleted();
        if (stepComp.isCompleted) {
          console.log("[Auto-Pilot] Kuis selesai terdeteksi di tengah loop. Menghentikan.");
          if (statusEl) statusEl.textContent = `${stepComp.title || "Kuis"} telah selesai dikerjakan.`;
          this._markExamNeedsVerification(false);
          this.isRunning = false;
          return { isFinished: true, submitted: true, reason: stepComp.reason };
        }
        const navStatusCurrent = this._getExamNavigationStatus();
        if (navStatusCurrent) {
          this._updateHUDNavMatrix(navStatusCurrent);
        }
        let curQContainer = this._findQuestionContainer();
        if (!curQContainer) {
          if (statusEl) statusEl.textContent = "Menunggu soal kuis dimuat...";
          curQContainer = await this._waitForQuestionContainer(5e3);
        }
        const currentQNav = navStatusCurrent?.questions?.find((q) => q.isCurrent);
        const curQNum = this._extractActiveQuestionNumberFromDOM() || currentQNav?.num || loopIterations;
        const isCurrentVerifiedGreen = currentQNav ? currentQNav.isAnswered : false;
        const alreadyCheckedRadio = curQContainer ? curQContainer.querySelector('input[type="radio"]:checked') : null;
        const anyUnansweredRemaining = navStatusCurrent && Array.isArray(navStatusCurrent.questions) && navStatusCurrent.questions.some((q) => q.isUnanswered || !q.isAnswered);
        const nextUnverifiedRemaining = verifyMode && navStatusCurrent && Array.isArray(navStatusCurrent.questions) ? navStatusCurrent.questions.find((q) => (!verifiedNums.has(q.num) || !q.isAnswered) && !q.isCurrent) : null;
        if (!verifyMode && isCurrentVerifiedGreen && alreadyCheckedRadio && anyUnansweredRemaining) {
          const nextUnanswered = navStatusCurrent.questions.find((q) => (q.isUnanswered || !q.isAnswered) && !q.isCurrent);
          if (nextUnanswered && nextUnanswered.btn) {
            console.log(`[Auto-Pilot] Soal saat ini sudah hijau. Melompat langsung ke Soal ${nextUnanswered.num} yang masih putih.`);
            if (statusEl) statusEl.textContent = `Soal sudah dijawab. Melompat ke Soal ${nextUnanswered.num}...`;
            await Humanizer.randomDelay(300, 600);
            await Humanizer.naturalClick(nextUnanswered.btn);
            await Humanizer.delay(600);
            continue;
          }
        } else if (verifyMode && alreadyCheckedRadio && verifiedNums.has(curQNum) && nextUnverifiedRemaining?.btn) {
          if (statusEl) statusEl.textContent = `Soal ${curQNum} sudah diperiksa. Menuju Soal ${nextUnverifiedRemaining.num}...`;
          await Humanizer.randomDelay(250, 450);
          await Humanizer.naturalClick(nextUnverifiedRemaining.btn);
          await this._waitForQuestionNumberChange(curQNum, 2500);
          await Humanizer.delay(250);
          continue;
        }
        if (!alreadyCheckedRadio) {
          if (statusEl) statusEl.textContent = `Menganalisis Soal ${curQNum} via AI...`;
          try {
            await this.processCurrentQuestion(true);
            verifiedNums.add(curQNum);
          } catch (err) {
            console.warn("[Mentari AI] Gagal memproses soal (percobaan 1):", err);
            await Humanizer.delay(600);
            try {
              await this.processCurrentQuestion(true);
              verifiedNums.add(curQNum);
            } catch (retryErr) {
              console.error("[Mentari AI] Percobaan 2 gagal. Mengaktifkan self-recovery:", retryErr);
              this._markExamNeedsVerification(true);
              hadVerifyFailure = true;
              if (statusEl) statusEl.textContent = `Peringatan: ${retryErr.message}. Memilih opsi pemulihan...`;
              await this._forceSelectFirstOption(curQContainer);
              verifiedNums.add(curQNum);
            }
          }
        } else if (verifyMode && !verifiedNums.has(curQNum)) {
          if (statusEl) statusEl.textContent = `Memeriksa jawaban Soal ${curQNum} via AI...`;
          let verifyResult = null;
          try {
            verifyResult = await this.processCurrentQuestion(true, { verifyExisting: true });
            verifiedNums.add(curQNum);
          } catch (verErr) {
            console.warn(`[Mentari AI] Gagal verifikasi Soal ${curQNum} (percobaan 1):`, verErr);
            await Humanizer.delay(600);
            try {
              verifyResult = await this.processCurrentQuestion(true, { verifyExisting: true });
              verifiedNums.add(curQNum);
            } catch (verRetryErr) {
              console.error(`[Mentari AI] Verifikasi Soal ${curQNum} gagal, mempertahankan opsi terpilih:`, verRetryErr);
              this._markExamNeedsVerification(true);
              hadVerifyFailure = true;
              verifiedNums.add(curQNum);
              if (statusEl) statusEl.textContent = `Soal ${curQNum}: Gagal verifikasi (${verRetryErr.message}), mempertahankan opsi ada.`;
            }
          }
          if (verifyResult?.status === "corrected" && statusEl) {
            statusEl.textContent = `Soal ${curQNum} dikoreksi: [${verifyResult.from}] -> [${verifyResult.to}]`;
          } else if (verifyResult?.status === "confirmed" && statusEl) {
            statusEl.textContent = `Soal ${curQNum} sudah benar, lanjut...`;
          }
        } else {
          console.log("[Auto-Pilot] Soal saat ini sudah memiliki opsi terpilih.");
          if (statusEl) statusEl.textContent = "Soal ini sudah terjawab.";
          const curQInfo = curQContainer ? this._parseQuestionAndOptions(curQContainer) : null;
          const selectedOpt = curQInfo?.options?.find((o) => o.element?.checked);
          if (curQInfo?.questionText && selectedOpt) {
            this._recordCurrentQuestionAnswer(curQInfo.questionText, selectedOpt.text, selectedOpt.letter);
          }
          verifiedNums.add(curQNum);
        }
        const navStatusAfterAnswer = this._getExamNavigationStatus();
        if (navStatusAfterAnswer) {
          this._updateHUDNavMatrix(navStatusAfterAnswer);
        }
        await Humanizer.randomDelay(350, 600);
        let nextBtn = DOM.findButtonByText(["selanjutnya", "next", "berikutnya", "soal berikutnya"]);
        if (!nextBtn) {
          const waitStart = Date.now();
          while (Date.now() - waitStart < 1e3 && !nextBtn) {
            await Humanizer.delay(150);
            nextBtn = DOM.findButtonByText(["selanjutnya", "next", "berikutnya", "soal berikutnya"]);
          }
        }
        const prevQNum = this._extractActiveQuestionNumberFromDOM();
        if (nextBtn) {
          if (statusEl) statusEl.textContent = "Menuju soal berikutnya...";
          await Humanizer.randomDelay(200, 400);
          await Humanizer.naturalClick(nextBtn);
          await this._waitForQuestionNumberChange(prevQNum, 2500);
          await Humanizer.delay(200);
          continue;
        }
        const navStatus = this._getExamNavigationStatus();
        if (navStatus && navStatus.questions && navStatus.questions.length > 0) {
          this._updateHUDNavMatrix(navStatus);
          const activeRadioNow = this._findQuestionContainer()?.querySelector('input[type="radio"]:checked');
          const unansweredList = navStatus.questions.filter((q) => {
            if (q.isCurrent && activeRadioNow) return false;
            return q.isUnanswered || !q.isAnswered;
          });
          if (unansweredList.length > 0) {
            console.warn(`[Hard Veto Kotak Hijau] Masih ada ${unansweredList.length} soal abu-abu. Submisi DIBLOKIR. Mengarahkan ke soal yang belum terjawab...`, unansweredList);
            const targetQ = unansweredList.find((q) => !q.isCurrent) || unansweredList[0];
            if (targetQ && targetQ.btn) {
              if (statusEl) statusEl.textContent = `Hard Veto: Soal ${targetQ.num} belum terjawab. Membuka Soal ${targetQ.num}...`;
              Toast.info(`Mengarahkan ke Soal ${targetQ.num} yang masih abu-abu...`);
              await Humanizer.randomDelay(300, 600);
              await Humanizer.naturalClick(targetQ.btn);
              await Humanizer.delay(600);
            } else {
              await Humanizer.delay(600);
            }
            continue;
          }
          if (verifyMode) {
            const unverifiedQ = navStatus.questions.find((q) => !verifiedNums.has(q.num));
            if (unverifiedQ && unverifiedQ.btn) {
              if (statusEl) statusEl.textContent = `Memeriksa Soal ${unverifiedQ.num} sebelum selesai...`;
              await Humanizer.randomDelay(300, 500);
              await Humanizer.naturalClick(unverifiedQ.btn);
              await this._waitForQuestionNumberChange(prevQNum, 2500);
              await Humanizer.delay(300);
              continue;
            }
          }
        }
        const finishKeywords = [
          "selesai quiz",
          "selesai kuis",
          "selesai ujian",
          "selesai",
          "finish quiz",
          "finish exam",
          "finish attempt",
          "finish",
          "kumpulkan jawaban",
          "kumpulkan",
          "akhiri kuis",
          "akhiri ujian",
          "akhiri",
          "submit quiz",
          "submit exam",
          "submit"
        ];
        const finishBtn = DOM.findButtonByText(finishKeywords);
        if (finishBtn) {
          const finalNav = this._getExamNavigationStatus();
          const activeRadioFinal = this._findQuestionContainer()?.querySelector('input[type="radio"]:checked');
          if (finalNav && finalNav.questions && finalNav.questions.length > 0) {
            const finalUnanswered = finalNav.questions.filter((q) => {
              if (q.isCurrent && activeRadioFinal) return false;
              return q.isUnanswered || !q.isAnswered;
            });
            if (finalUnanswered.length > 0 || !finalNav.allAnswered) {
              console.warn(`[Hard Veto Submit Prematur] Tombol selesai DIBLOKIR MUTLAK! Terdeteksi ${finalUnanswered.length} soal abu-abu.`, finalUnanswered);
              const target = finalUnanswered.find((q) => !q.isCurrent) || finalUnanswered[0];
              if (target && target.btn) {
                if (statusEl) statusEl.textContent = `Veto: Soal ${target.num} belum terjawab. Membuka Soal ${target.num}...`;
                await Humanizer.naturalClick(target.btn);
              }
              await Humanizer.delay(600);
              continue;
            }
            if (verifyMode) {
              const finalUnverified = finalNav.questions.find((q) => !verifiedNums.has(q.num));
              if (finalUnverified && finalUnverified.btn) {
                if (statusEl) statusEl.textContent = `Veto Verifikasi: Memeriksa Soal ${finalUnverified.num}...`;
                await Humanizer.naturalClick(finalUnverified.btn);
                await Humanizer.delay(600);
                continue;
              }
            }
          }
          if (!hadVerifyFailure) {
            this._markExamNeedsVerification(false);
          }
          if (statusEl) statusEl.textContent = "Semua kotak soal terverifikasi 100% hijau! Menyelesaikan kuis...";
          Toast.success("Semua kotak nomor soal terverifikasi hijau (terjawab)!");
          const { mentari_auto_finish_quiz } = await Storage.get("mentari_auto_finish_quiz", { mentari_auto_finish_quiz: false });
          if (mentari_auto_finish_quiz || isAutoPilot) {
            await Humanizer.randomDelay(500, 1e3);
            await Humanizer.naturalClick(finishBtn);
            await Humanizer.delay(600);
            const confirmBtn = this._findDialogConfirmButton(finishBtn) || DOM.findButtonByText(["ya", "ok", "setuju", "submit", "kirim", "selesaikan", "ya, selesaikan", "akhiri"]);
            if (confirmBtn) {
              await Humanizer.naturalClick(confirmBtn);
            }
            if (statusEl) statusEl.textContent = "Kuis berhasil diserahkan 100%. Menunggu konfirmasi skor sistem...";
            await Humanizer.delay(1500);
            await this._evaluateAndSaveSmartMemory("AUTO_QUIZ", document.title);
            this.isRunning = false;
            return { isFinished: true, submitted: true, reason: "Kuis telah dikumpulkan dan diserahkan" };
          } else {
            this.isRunning = false;
            return { isFinished: true, submitted: false, reason: "Menunggu konfirmasi selesai manual dari pengguna" };
          }
        } else {
          const postCheck = this._checkIfExamAlreadyCompleted();
          if (postCheck.isCompleted) {
            await this._evaluateAndSaveSmartMemory("AUTO_QUIZ", document.title);
            this.isRunning = false;
            return { isFinished: true, submitted: true, reason: postCheck.reason };
          }
          const recheckNav = this._getExamNavigationStatus();
          if (recheckNav && recheckNav.questions && recheckNav.questions.length > 0) {
            const stillUnanswered = recheckNav.questions.filter((q) => q.isUnanswered || !q.isAnswered);
            if (stillUnanswered.length > 0) {
              console.warn(`[Auto-Pilot] Belum menemukan tombol Next/Finish, tapi masih ada ${stillUnanswered.length} soal belum terjawab. Membuka Soal ${stillUnanswered[0].num}...`);
              if (stillUnanswered[0].btn) {
                if (statusEl) statusEl.textContent = `Mengarahkan ke Soal ${stillUnanswered[0].num}...`;
                await Humanizer.naturalClick(stillUnanswered[0].btn);
                await Humanizer.delay(600);
                continue;
              }
            }
            if (recheckNav.allAnswered) {
              if (statusEl) statusEl.textContent = "Semua soal terjawab. Menunggu tombol penyelesaian kuis...";
              const waitFinishStart = Date.now();
              let delayedFinishBtn = null;
              while (Date.now() - waitFinishStart < 2500 && !delayedFinishBtn) {
                await Humanizer.delay(300);
                delayedFinishBtn = DOM.findButtonByText(finishKeywords);
              }
              if (delayedFinishBtn) {
                await Humanizer.naturalClick(delayedFinishBtn);
                await Humanizer.delay(600);
                const confirmBtn = this._findDialogConfirmButton(delayedFinishBtn) || DOM.findButtonByText(["ya", "ok", "setuju", "submit", "kirim", "selesaikan", "ya, selesaikan", "akhiri"]);
                if (confirmBtn) {
                  await Humanizer.naturalClick(confirmBtn);
                }
                if (statusEl) statusEl.textContent = "Kuis berhasil diserahkan 100%.";
                await Humanizer.delay(1200);
                await this._evaluateAndSaveSmartMemory("AUTO_QUIZ", document.title);
                this.isRunning = false;
                return { isFinished: true, submitted: true, reason: "Kuis telah dikumpulkan dan diserahkan" };
              }
            }
          }
          if (statusEl) statusEl.textContent = "Semua nomor soal telah dikerjakan.";
          Toast.success("Seluruh nomor soal telah berhasil dijawab!");
          this.isRunning = false;
          return { isFinished: true, submitted: false, reason: "Semua soal telah dikerjakan" };
        }
      }
      this.isRunning = false;
      return { isFinished: false, submitted: false, reason: "Loop mencapai batas maksimum atau dihentikan" };
    }
    // ─── Auto-Pilot Kuis (Single-Tab Batch Runner) ────────────────────────────────
    async _checkAndInitAutoPilot() {
      const state = await AutoPilotState.get();
      if (!state || !state.active || !Array.isArray(state.queue)) {
        const manualCtrl2 = document.getElementById("mentari-quiz-control-host");
        if (manualCtrl2) manualCtrl2.style.display = "block";
        return;
      }
      const manualCtrl = document.getElementById("mentari-quiz-control-host");
      if (manualCtrl) manualCtrl.style.display = "none";
      if (state.currentIndex >= state.queue.length) {
        await Storage.set({
          mentari_auto_pilot_state: { ...state, active: false, finished: true }
        });
        Toast.success("Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!");
        if (manualCtrl) manualCtrl.style.display = "block";
        return;
      }
      this.isAutoPilot = true;
      this.isPaused = Boolean(state.paused);
      if (state.model && VALID_MODEL_IDS.includes(state.model)) {
        this.activeModel = state.model;
        await Storage.set({ gemini_model: state.model });
        const selectModel = this.shadow?.getElementById("quiz-select-model");
        if (selectModel && selectModel.value !== state.model) {
          selectModel.value = state.model;
        }
      }
      const currentItem = state.queue[state.currentIndex];
      if (!currentItem) return;
      if (currentItem.type === "KUESIONER" && currentItem.url) {
        console.log("[Auto-Pilot Transition] Beralih dari ujian ke Kuesioner:", currentItem);
        window.location.replace(currentItem.url);
        return;
      }
      const urlMatch = window.location.pathname.match(/\/exam\/([^\/\?]+)/);
      const currentUrlExamId = urlMatch ? urlMatch[1] : null;
      if (currentUrlExamId && currentItem.id && currentUrlExamId !== currentItem.id) {
        console.warn(`[Auto-Pilot Guard] URL exam ID (${currentUrlExamId}) tidak cocok dengan kuis saat ini (${currentItem.id}). Segera redirect ke kuis yang benar...`);
        window.location.replace(currentItem.url);
        return;
      }
      console.log(`[Auto-Pilot] Memulai kuis ${state.currentIndex + 1}/${state.queue.length}:`, currentItem);
      const { statusEl, badgeEl, btnPause, progressBar } = this._injectAutoPilotHUD(state, currentItem);
      if (this.isPaused) {
        statusEl.textContent = state.pauseReason ? `Terjeda: ${state.pauseReason}. Klik Lanjutkan untuk mencoba lagi.` : "Auto-Pilot dijeda. Klik Lanjutkan untuk mencoba lagi.";
        return;
      }
      this._executeAutoPilotQuiz(state, currentItem, statusEl, badgeEl, btnPause, progressBar);
    }
    _injectAutoPilotHUD(state, currentItem) {
      if (document.getElementById("mentari-autopilot-hud-host")) {
        document.getElementById("mentari-autopilot-hud-host").remove();
      }
      this.hudHost = document.createElement("div");
      this.hudHost.id = "mentari-autopilot-hud-host";
      this.hudHost.style.position = "fixed";
      this.hudHost.style.top = "20px";
      this.hudHost.style.right = "24px";
      this.hudHost.style.zIndex = "2147483646";
      this.hudShadow = this.hudHost.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
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
      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.35);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.6);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      .hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
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
      }
      .hud-tag {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .hud-tag.pre {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      .hud-tag.post {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
      }
      .hud-tag.kues {
        background: rgba(234, 179, 8, 0.2);
        color: #facc15;
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
      .hud-model-select {
        background: rgba(212, 175, 55, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 4px;
        padding: 1px 4px;
        font-size: 10px;
        font-weight: 700;
        outline: none;
        cursor: pointer;
        margin-left: auto;
        max-width: 140px;
      }
      .hud-model-select option {
        background: #18181b;
        color: #fff;
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
      .hud-btn-verify {
        background: rgba(245, 158, 11, 0.16);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.45);
        width: 100%;
      }
      .hud-btn-verify:hover {
        background: rgba(245, 158, 11, 0.28);
        color: #fde68a;
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
      .hud-q-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        line-height: 1.2;
      }
      .hud-q-pill.answered {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.45);
      }
      .hud-q-pill.unanswered {
        background: rgba(156, 163, 175, 0.15);
        color: #9ca3af;
        border: 1px solid rgba(156, 163, 175, 0.3);
      }
      .hud-q-pill.current {
        background: rgba(245, 158, 11, 0.25);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.6);
        box-shadow: 0 0 6px rgba(245, 158, 11, 0.35);
      }
    `;
      const hudCard = document.createElement("div");
      hudCard.className = "hud-card";
      const currentIdx = state.currentIndex;
      const totalCount = state.queue.length;
      const progressPercent = Math.round(currentIdx / totalCount * 100);
      const currentModelId = state.model || this.activeModel;
      hudCard.innerHTML = `
      <div class="hud-header">
        <div class="hud-brand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Auto-Pilot Kuis
        </div>
        <div class="hud-badge ${this.isPaused ? "paused" : "running"}" id="hud-badge">
          ${this.isPaused ? "Dijeda" : "Berjalan"}
        </div>
      </div>

      <div class="hud-body">
        <div class="hud-title" title="${currentItem.courseTitle}">${currentItem.courseTitle}</div>
        <div class="hud-subtitle">
          <span class="hud-tag ${currentItem.type === "PRE_TEST" ? "pre" : currentItem.type === "POST_TEST" ? "post" : "kues"}">
            ${currentItem.type === "PRE_TEST" ? "Pre-Test" : currentItem.type === "POST_TEST" ? "Post-Test" : "Kuesioner"}
          </span>
          <span>${currentItem.sectionName}</span>
          <select class="hud-model-select" id="hud-select-model" title="Ganti Model AI Saat Ini">
            ${ALL_MODELS.map((m) => `<option value="${m.id}" ${m.id === currentModelId ? "selected" : ""}>${m.name.split(" (")[0]}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="hud-progress-wrap">
        <div class="hud-progress-info">
          <span>Kuis ${currentIdx + 1} dari ${totalCount}</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="hud-progress-bar-bg">
          <div class="hud-progress-bar-fill" id="hud-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="hud-matrix-wrap" style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
        <div style="font-size: 10px; color: #888; display: flex; justify-content: space-between;">
          <span>Status Kotak Soal:</span>
          <span id="hud-matrix-summary">0/0 Hijau</span>
        </div>
        <div class="hud-nav-matrix" id="hud-nav-matrix" style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 55px; overflow-y: auto;">
          <span style="font-size: 10px; color: #666;">Menunggu scan navigasi...</span>
        </div>
      </div>

      <div class="hud-status" id="hud-status-text">
        Mempersiapkan kuis...
      </div>

      <button class="hud-btn hud-btn-verify" id="hud-btn-verify" type="button" style="display: ${this.isPaused ? "flex" : "none"};" title="Periksa ulang semua jawaban yang sudah terisi mulai dari soal #1 dan perbaiki jika salah">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Cek &amp; Koreksi (1 &rarr; N)
      </button>

      <div class="hud-actions">
        <button class="hud-btn hud-btn-pause" id="hud-btn-pause">
          ${this.isPaused ? "Lanjutkan" : "Jeda"}
        </button>
        <button class="hud-btn hud-btn-cancel" id="hud-btn-cancel">
          Hentikan & Reset Total
        </button>
      </div>
    `;
      this.hudShadow.appendChild(style);
      this.hudShadow.appendChild(hudCard);
      document.body.appendChild(this.hudHost);
      this._makeElementDraggable(this.hudHost, hudCard.querySelector(".hud-header"));
      const statusEl = this.hudShadow.getElementById("hud-status-text");
      const badgeEl = this.hudShadow.getElementById("hud-badge");
      const btnPause = this.hudShadow.getElementById("hud-btn-pause");
      const btnVerify = this.hudShadow.getElementById("hud-btn-verify");
      const btnCancel = this.hudShadow.getElementById("hud-btn-cancel");
      const progressBar = this.hudShadow.getElementById("hud-progress-fill");
      const hudModelSelect = this.hudShadow.getElementById("hud-select-model");
      if (hudModelSelect) {
        hudModelSelect.value = currentModelId;
        hudModelSelect.addEventListener("change", async () => {
          const newModel = hudModelSelect.value;
          if (newModel && VALID_MODEL_IDS.includes(newModel)) {
            this.activeModel = newModel;
            await Storage.set({ gemini_model: newModel });
            const curStore = await Storage.get("mentari_auto_pilot_state");
            if (curStore?.mentari_auto_pilot_state) {
              curStore.mentari_auto_pilot_state.model = newModel;
              await Storage.set({ mentari_auto_pilot_state: curStore.mentari_auto_pilot_state });
            }
            const selectModel = this.shadow?.getElementById("quiz-select-model");
            if (selectModel && selectModel.value !== newModel) {
              selectModel.value = newModel;
            }
            const label = hudModelSelect.options[hudModelSelect.selectedIndex]?.text || newModel;
            Toast.info(`Model AI diubah ke: ${label}`);
          }
        });
      }
      const resumeExecution = async (verifyExisting = false) => {
        this.isPaused = false;
        badgeEl.className = "hud-badge running";
        badgeEl.textContent = "Berjalan";
        btnPause.textContent = "Jeda";
        if (btnVerify) btnVerify.style.display = "none";
        statusEl.textContent = verifyExisting ? "Memeriksa jawaban terisi dari soal #1..." : "Melanjutkan pengerjaan kuis...";
        await AutoPilotState.resume();
        if (!this.isRunning) {
          this.isRunning = true;
          this.isAutoPilot = true;
          const curStore = await AutoPilotState.get();
          const curItem = curStore?.queue?.[curStore?.currentIndex];
          this._executeAutoPilotQuiz(curStore, curItem, statusEl, badgeEl, btnPause, progressBar, { verifyExisting });
        }
      };
      btnVerify?.addEventListener("click", () => resumeExecution(true));
      btnPause.addEventListener("click", async () => {
        if (!this.isPaused) {
          this.isPaused = true;
          badgeEl.className = "hud-badge paused";
          badgeEl.textContent = "Dijeda";
          btnPause.textContent = "Lanjutkan";
          if (btnVerify) btnVerify.style.display = "flex";
          statusEl.textContent = "Auto-Pilot dijeda sementara.";
          await AutoPilotState.pause("Dijeda oleh pengguna");
        } else {
          await resumeExecution(false);
        }
      });
      btnCancel.addEventListener("click", async () => {
        this.isRunning = false;
        this.isAutoPilot = false;
        this.isPaused = false;
        await AutoPilotState.reset();
        Toast.info("Auto-Pilot kuis & evaluasi telah dihentikan & direset total.");
        if (this.hudHost) this.hudHost.remove();
        const manualCtrl = document.getElementById("mentari-quiz-control-host");
        if (manualCtrl) manualCtrl.style.display = "block";
      });
      return { statusEl, badgeEl, btnPause, progressBar };
    }
    async _executeAutoPilotQuiz(state, currentItem, statusEl, badgeEl, btnPause, progressBar, { verifyExisting = false } = {}) {
      statusEl.textContent = "Memeriksa kesiapan halaman kuis...";
      const domInfo = this._extractExamTitleAndTypeFromDOM();
      console.log("[Auto-Pilot] Validasi DOM kuis:", domInfo);
      const readyResult = await this._waitForExamReady(statusEl);
      if (!readyResult.ready) {
        if (readyResult.reason === "completed") {
          const hasStartOrResume = !!this._findStartExamButton();
          if (!hasStartOrResume) {
            await this._markQuizAsCompletedPermanently(state, currentItem);
          }
        }
        const isFastSkip = readyResult.reason === "completed" || readyResult.reason === "locked";
        const skipMsg = readyResult.reason === "completed" ? `${domInfo.cleanTitle || "Kuis"} sudah selesai dikerjakan sebelumnya. Melompat ke antrean berikutnya...` : `Kuis tidak dapat dimulai (${readyResult.reason}). Melompat ke kuis berikutnya...`;
        statusEl.textContent = skipMsg;
        Toast.info(skipMsg);
        await Humanizer.delay(800);
        await this._advanceToNextQuiz(state, statusEl, isFastSkip);
        return;
      }
      statusEl.textContent = verifyExisting ? "Memeriksa & mengoreksi jawaban dari soal #1 via AI..." : "Menjawab seluruh soal otomatis via AI...";
      this.isRunning = true;
      let loopResult = { isFinished: false, submitted: false };
      try {
        loopResult = await this.runAutoLoop(statusEl, true, { verifyExisting });
      } catch (e) {
        console.error("[Auto-Pilot] Error saat menjawab kuis:", e);
        statusEl.textContent = `Peringatan: ${e.message}`;
      }
      const finalComp = this._checkIfExamAlreadyCompleted();
      const isReallyDone = Boolean(loopResult?.submitted || finalComp.isCompleted);
      if (isReallyDone) {
        await this._evaluateAndSaveSmartMemory(currentItem?.type || "AUTO_PILOT", currentItem?.courseTitle || document.title);
        await this._markQuizAsCompletedPermanently(state, currentItem);
        statusEl.textContent = "Kuis berhasil diselesaikan 100%! Mempersiapkan kuis berikutnya...";
        Toast.success(`Kuis ${currentItem.courseTitle} selesai 100%!`);
        await this._advanceToNextQuiz(state, statusEl, false);
      } else {
        console.warn("[Auto-Pilot] Kuis belum selesai diserahkan. TIDAK menandai selesai dan TIDAK melompat ke kuis berikutnya.", loopResult);
        statusEl.textContent = `Pengerjaan belum selesai (${loopResult?.reason || "soal belum lengkap"}). Auto-Pilot dijeda untuk verifikasi pengguna.`;
        Toast.warning("Auto-Pilot dijeda: Kuis belum sepenuhnya selesai diserahkan. Periksa halaman kuis.");
        this.isRunning = false;
        this.isPaused = true;
        state.paused = true;
        await Storage.set({ mentari_auto_pilot_state: state });
        if (badgeEl) {
          badgeEl.className = "hud-badge paused";
          badgeEl.textContent = "Perlu Cek";
        }
        if (btnPause) {
          btnPause.textContent = "Lanjutkan";
        }
        const btnVerifyHud = this.hudShadow?.getElementById("hud-btn-verify");
        if (btnVerifyHud) {
          btnVerifyHud.style.display = "flex";
        }
      }
    }
    async _waitForExamReady(statusEl) {
      const maxRetries = 60;
      for (let i = 0; i < maxRetries; i++) {
        if (!this.isAutoPilot) return { ready: false, reason: "cancelled" };
        while (this.isPaused && this.isAutoPilot) {
          await Humanizer.delay(500);
        }
        const completionCheck = this._checkIfExamAlreadyCompleted();
        if (completionCheck.isCompleted) {
          if (statusEl) {
            statusEl.textContent = `${completionCheck.title || "Kuis"} sudah diselesaikan (${completionCheck.reason}).`;
          }
          return { ready: false, reason: "completed" };
        }
        const lockCheck = this._checkIfExamLocked();
        if (lockCheck.isLocked) {
          if (statusEl) {
            statusEl.textContent = `Kuis terkunci: ${lockCheck.reason}`;
          }
          return { ready: false, reason: "locked" };
        }
        const startBtn = this._findStartExamButton();
        if (startBtn) {
          if (statusEl) statusEl.textContent = "Menemukan tombol mulai kuis... Memulai!";
          await Humanizer.randomDelay(600, 1200);
          await Humanizer.naturalClick(startBtn);
          await Humanizer.delay(800);
          const confirmStartBtn = this._findDialogConfirmButton(startBtn);
          if (confirmStartBtn) {
            await Humanizer.naturalClick(confirmStartBtn);
          }
          if (statusEl) statusEl.textContent = "Menunggu soal kuis dimuat...";
          const readyQ = await this._waitForQuestionContainer(15e3);
          if (readyQ) {
            const recheckComp = this._checkIfExamAlreadyCompleted();
            if (recheckComp.isCompleted) {
              return { ready: false, reason: "completed" };
            }
            return { ready: true, reason: "started" };
          }
          continue;
        }
        const qContainer = this._findQuestionContainer();
        if (qContainer) {
          const recheckComp = this._checkIfExamAlreadyCompleted();
          if (recheckComp.isCompleted) {
            return { ready: false, reason: "completed" };
          }
          return { ready: true, reason: "already_active" };
        }
        await Humanizer.delay(500);
      }
      return { ready: false, reason: "timeout" };
    }
    async _advanceToNextQuiz(state, statusEl, isSkipped = false) {
      if (!this.isAutoPilot) return;
      if (state.queue && state.queue[state.currentIndex]) {
        state.queue[state.currentIndex].status = "completed";
      }
      state.currentIndex = state.currentIndex + 1;
      if (state.currentIndex >= state.queue.length && (state.mode === "all" || !state.mode)) {
        if (statusEl) {
          statusEl.textContent = "Kuis selesai! Sinkronisasi real-time kuesioner dosen di server UNPAM...";
        }
        try {
          const hasNewKues = await AutoPilotSync.syncAndAppendKuesioner(state, statusEl);
          if (hasNewKues) {
            console.log("[Auto-Pilot Quiz] Kuesioner baru berhasil ditambahkan pasca-posttest! Melanjutkan pengerjaan.");
          }
        } catch (syncErr) {
          console.warn("[Auto-Pilot Quiz] Gagal sinkronisasi kuesioner pasca-posttest:", syncErr);
        }
      }
      if (state.currentIndex < state.queue.length) {
        const nextItem = state.queue[state.currentIndex];
        await Storage.set({ mentari_auto_pilot_state: state });
        const cooldown = isSkipped ? 1 : typeof state.cooldownSec === "number" ? state.cooldownSec : 0;
        if (cooldown > 0) {
          if (statusEl) {
            statusEl.textContent = isSkipped ? `Kuis dilewati. Melompat ke kuis berikutnya...` : `Kuis selesai! Istirahat aman sebelum kuis berikutnya...`;
          }
          for (let s = cooldown; s > 0; s--) {
            if (!this.isAutoPilot) return;
            while (this.isPaused && this.isAutoPilot) {
              if (statusEl) statusEl.textContent = `Istirahat dijeda (${s}s). Klik Lanjutkan untuk lanjut.`;
              await Humanizer.delay(500);
            }
            if (statusEl) {
              statusEl.textContent = isSkipped ? `Melompat ke kuis berikutnya dalam ${s} detik...` : `Istirahat aman: ${s} detik sebelum kuis berikutnya...`;
            }
            await Humanizer.delay(1e3);
          }
        } else {
          if (statusEl) {
            const itemLabel = nextItem.type === "KUESIONER" ? "Kuesioner Dosen" : "item berikutnya";
            statusEl.textContent = isSkipped ? `Kuis dilewati. Melompat ke ${itemLabel}...` : `Kuis selesai! Membuka ${itemLabel}...`;
          }
          await Humanizer.delay(800);
        }
        const nextTypeLabel = nextItem.type === "KUESIONER" ? "Kuesioner" : "Kuis";
        if (statusEl) statusEl.textContent = `Menuju ${nextTypeLabel}: ${nextItem.courseTitle} (${nextItem.sectionName})...`;
        await Humanizer.delay(500);
        window.location.replace(nextItem.url);
      } else {
        await AutoPilotState.reset();
        if (statusEl) statusEl.textContent = "Seluruh antrean Auto-Pilot kuis & evaluasi selesai 100%!";
        Toast.success("Seluruh antrean Auto-Pilot kuis & evaluasi telah berhasil diselesaikan!");
        setTimeout(() => {
          if (this.hudHost) this.hudHost.remove();
          const manualCtrl = document.getElementById("mentari-quiz-control-host");
          if (manualCtrl) manualCtrl.style.display = "block";
        }, 7e3);
      }
    }
    /**
     * Helper untuk memilih elemen opsi jawaban menggunakan React native prototype setter
     * dan men-trigger synthetic events pada label & MuiRadio-root
     */
    async _selectOptionElement(option) {
      if (!option) return false;
      const radioInput = option.element?.tagName === "INPUT" ? option.element : option.element?.querySelector ? option.element.querySelector('input[type="radio"]') : option.element;
      const parentLabel = option.labelEl || (radioInput?.closest ? radioInput.closest(".MuiFormControlLabel-root, label") : null);
      const radioRoot = option.radioRoot || (radioInput?.closest ? radioInput.closest(".MuiRadio-root") : null) || parentLabel?.querySelector(".MuiRadio-root");
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;
      if (nativeSetter && radioInput && radioInput.tagName === "INPUT") {
        nativeSetter.call(radioInput, true);
      } else if (radioInput && radioInput.tagName === "INPUT") {
        radioInput.checked = true;
      }
      if (radioInput && radioInput.dispatchEvent) {
        radioInput.dispatchEvent(new Event("click", { bubbles: true }));
        radioInput.dispatchEvent(new Event("change", { bubbles: true }));
        radioInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (radioRoot) {
        radioRoot.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
      if (parentLabel) {
        await Humanizer.naturalClick(parentLabel, true);
      } else if (radioInput) {
        await Humanizer.naturalClick(radioInput, true);
      }
      if (radioInput && radioInput.dispatchEvent) {
        radioInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    }
    /**
     * Mekanisme Self-Recovery: Force-click pada opsi A (atau opsi pertama) menggunakan native setter
     * Menandai sesi kuis ini perlu verifikasi ulang agar tidak mengirim jawaban tebakan saat pulih.
     */
    async _forceSelectFirstOption(container = null) {
      this._markExamNeedsVerification(true);
      const qContainer = container || this._findQuestionContainer();
      if (!qContainer) return false;
      const { options } = this._parseQuestionAndOptions(qContainer);
      if (options.length > 0) {
        await this._selectOptionElement(options[0]);
        console.log("[Self-Recovery] Force-click opsi pertama (A) via React native setter & label click.");
        return true;
      }
      const firstRadio = qContainer.querySelector('input[type="radio"]');
      if (firstRadio) {
        await this._selectOptionElement({ element: firstRadio });
        console.log("[Self-Recovery] Force-click raw input radio pertama.");
        return true;
      }
      return false;
    }
    /**
     * Terapkan jawaban atau verifikasi kecocokan opsi yang sudah terpilih
     */
    async _applyOrVerifyOption(questionText, options, targetIndex, { verifyExisting = false, sourceLabel = "Gemini" } = {}) {
      const targetOption = options[targetIndex];
      if (!targetOption) return null;
      const currentIdx = options.findIndex((o) => o.element?.checked);
      const targetLetter = targetOption.letter || String(targetIndex + 1);
      if (verifyExisting && currentIdx === targetIndex) {
        this._recordCurrentQuestionAnswer(questionText, targetOption.text, targetOption.letter);
        Toast.info(`Verifikasi OK: [${targetLetter}] sudah benar`);
        return { status: "confirmed", index: targetIndex };
      }
      const prevLetter = currentIdx !== -1 ? options[currentIdx].letter || String(currentIdx + 1) : null;
      await this._selectOptionElement(targetOption);
      this._recordCurrentQuestionAnswer(questionText, targetOption.text, targetOption.letter);
      if (verifyExisting && currentIdx !== -1 && currentIdx !== targetIndex) {
        Toast.warning(`Koreksi jawaban: [${prevLetter}] -> [${targetLetter}] (${sourceLabel})`);
        return { status: "corrected", index: targetIndex, from: prevLetter, to: targetLetter };
      }
      Toast.info(`Menjawab [${targetLetter}] via ${sourceLabel}`);
      return { status: "answered", index: targetIndex };
    }
    /**
     * Memproses satu soal kuis yang sedang terbuka di layar
     */
    async processCurrentQuestion(isAuto = false, { verifyExisting = false } = {}) {
      const compCheck = this._checkIfExamAlreadyCompleted();
      if (compCheck.isCompleted) {
        throw new Error(`Kuis ${compCheck.title || ""} sudah selesai dikerjakan.`);
      }
      const questionContainer = this._findQuestionContainer();
      if (!questionContainer) {
        throw new Error("Elemen soal kuis tidak ditemukan pada halaman.");
      }
      const { questionText, options } = this._parseQuestionAndOptions(questionContainer);
      if (!questionText || options.length === 0) {
        throw new Error("Gagal mengekstrak teks pertanyaan atau opsi pilihan.");
      }
      const revealedIndex = options.findIndex((o) => {
        const parent = o.element?.closest(".MuiFormControlLabel-root, label, .MuiPaper-root, tr, div");
        if (!parent) return false;
        const html = parent.outerHTML.toLowerCase();
        const text = parent.textContent.toLowerCase();
        return parent.classList.contains("correct") || parent.classList.contains("is-correct") || parent.classList.contains("jawaban-benar") || parent.getAttribute("data-correct") === "true" || html.includes("green") || text.includes("(benar)") || text.includes("(kunci)");
      });
      if (revealedIndex !== -1) {
        return this._applyOrVerifyOption(questionText, options, revealedIndex, {
          verifyExisting,
          sourceLabel: "Kunci DOM"
        });
      }
      const memoryMatchIdx = await this._lookupSmartQuestionMemory(questionText, options);
      if (memoryMatchIdx !== null && memoryMatchIdx >= 0 && memoryMatchIdx < options.length) {
        console.log(`[Smart Memory] Jawaban otomatis dari memori skor 100: [${options[memoryMatchIdx].letter}] ${options[memoryMatchIdx].text}`);
        return this._applyOrVerifyOption(questionText, options, memoryMatchIdx, {
          verifyExisting,
          sourceLabel: "Smart Memory 100"
        });
      }
      if (isAuto) {
        await Humanizer.randomDelay(350, 600);
      }
      const prompt = this._buildPrompt(questionText, options);
      const systemInstruction = `Kamu adalah profesor dan pakar akademik perguruan tinggi Indonesia berintelektual tinggi dengan target akurasi 100%. Analisis soal ujian akademik (termasuk soal pedagogi, kurikulum, filsafat pendidikan, dan soal bermuatan kata 'KECUALI' atau 'BUKAN') dengan sangat teliti, kritis, dan tanpa bias distractor. Pilih HANYA SATU opsi jawaban yang 100% benar dan paling tepat. Format output HARUS HANYA HURUF OPSI DAN TEKS JAWABAN SAJA (contoh: "C. Pendekatan kontekstual" atau "A"). JANGAN memberikan penjelasan, pengantar, atau penutup.`;
      const hudModelSelect = this.hudShadow?.getElementById("hud-select-model");
      const selectModel = this.shadow?.getElementById("quiz-select-model");
      const chosenModel = hudModelSelect && hudModelSelect.value && VALID_MODEL_IDS.includes(hudModelSelect.value) ? hudModelSelect.value : selectModel && selectModel.value && VALID_MODEL_IDS.includes(selectModel.value) ? selectModel.value : this.activeModel || DEFAULT_MODEL;
      const response = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({
            action: "generateGeminiContent",
            prompt,
            systemInstruction,
            model: chosenModel
          }, (res) => {
            if (chrome.runtime?.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(res);
          });
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
      if (!response || !response.success) {
        throw new Error(response?.error || "Gagal memanggil Gemini AI.");
      }
      const bestOptionIndex = this._determineMatchingOption(response.text, options);
      if (bestOptionIndex === -1) {
        throw new Error("Tidak dapat mencocokkan respon AI dengan opsi kuis.");
      }
      return this._applyOrVerifyOption(questionText, options, bestOptionIndex, {
        verifyExisting,
        sourceLabel: response.model || "Gemini"
      });
    }
    _findQuestionContainer() {
      const radio = document.querySelector('input[type="radio"], .MuiRadio-root');
      if (radio) {
        const card = radio.closest('.MuiPaper-root, .MuiCard-root, form, [class*="card"], [class*="question"], [class*="soal"]');
        if (card) return card;
      }
      const candidates = [
        document.querySelector(".question-container"),
        document.querySelector(".soal-container"),
        document.querySelector('form[action*="exam"]'),
        document.querySelector(".MuiPaper-root:has(.MuiRadio-root)"),
        document.querySelector('.MuiPaper-root:has(input[type="radio"])'),
        document.querySelector('.MuiCard-root:has(input[type="radio"])'),
        document.querySelector("main .MuiBox-root:has(.MuiRadio-root)"),
        document.querySelector("main"),
        document.body
      ];
      return candidates.find((c) => c && c.querySelector('input[type="radio"], .MuiRadio-root')) || null;
    }
    _parseQuestionAndOptions(container) {
      let questionText = "";
      const collectedParagraphs = [];
      const textCandidates = Array.from(container.querySelectorAll(".soal-text, .question-text, .MuiTypography-root, p, h1, h2, h3, h4, h5, h6, pre, code, blockquote"));
      for (const el of textCandidates) {
        if (el.closest('.MuiFormControlLabel-root, label, .MuiRadio-root, input[type="radio"]')) continue;
        if (el.closest('#mentari-quiz-control-host, #mentari-autopilot-hud-host, #mentari-token-mod-host, .mentari-toast-container, button, a, aside, .MuiDrawer-root, [role="navigation"], header, nav')) continue;
        const rawText = (el.textContent || "").trim();
        if (!rawText) continue;
        if (/^\d+$/.test(rawText)) continue;
        if (/^(soal|pertanyaan|question)(\s+no\.?|\s+nomor)?\s*\d+[\s:\.-]*$/i.test(rawText)) continue;
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(rawText)) continue;
        const lower = rawText.toLowerCase();
        if (lower.startsWith("petunjuk pengerjaan") || lower.startsWith("petunjuk umum") || lower.startsWith("sisa waktu") || lower.startsWith("waktu tersisa") || lower === "pilihlah salah satu jawaban yang paling tepat" || lower === "pilih salah satu jawaban yang benar") {
          continue;
        }
        const cleanText = rawText.replace(/^(soal|pertanyaan|question)?\s*\d+[\s:\.\)-]+\s*/i, "").trim();
        if (cleanText.length > 3) {
          if (!collectedParagraphs.some((p) => p.includes(cleanText) || cleanText.includes(p))) {
            collectedParagraphs.push(cleanText);
          }
        }
      }
      questionText = collectedParagraphs.join("\n").trim();
      if (!questionText) {
        const firstRadio = container.querySelector('input[type="radio"], .MuiRadio-root');
        const radioGroup = firstRadio?.closest('.MuiFormControl-root, .MuiFormGroup-root, [role="radiogroup"]');
        if (radioGroup && radioGroup.previousElementSibling) {
          const prevText = (radioGroup.previousElementSibling.textContent || "").trim();
          const cleanPrev = prevText.replace(/^(soal|pertanyaan|question)?\s*\d+[\s:\.\)-]+\s*/i, "").trim();
          if (cleanPrev.length > 5) questionText = cleanPrev;
        }
      }
      const options = [];
      let radioLabels = Array.from(container.querySelectorAll(".MuiFormControlLabel-root, label"));
      if (radioLabels.length === 0) {
        const allRadios = Array.from(container.querySelectorAll('input[type="radio"]'));
        radioLabels = allRadios.map((r) => r.closest("label") || r.parentElement || r);
      }
      radioLabels.forEach((labelEl, idx) => {
        const radioInput = labelEl.tagName === "INPUT" ? labelEl : labelEl.querySelector('input[type="radio"]') || labelEl;
        const radioRoot = labelEl.querySelector(".MuiRadio-root") || (radioInput.closest ? radioInput.closest(".MuiRadio-root") : null);
        const labelText = (labelEl.textContent || "").trim();
        const letterMatch = labelText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
        options.push({
          index: idx,
          letter: letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + idx),
          text: letterMatch ? letterMatch[2].trim() : labelText,
          fullText: labelText,
          element: radioInput,
          labelEl: labelEl.tagName === "LABEL" || labelEl.classList.contains("MuiFormControlLabel-root") ? labelEl : null,
          radioRoot
        });
      });
      return { questionText, options };
    }
    _buildPrompt(questionText, options) {
      const formattedOptions = options.map((o) => `${o.letter}. ${o.text}`).join("\n");
      return `[SOAL UJIAN AKADEMIK]
${questionText}

[PILIHAN JAWABAN]
${formattedOptions}

Instruksi: Analisis dengan cermat dan tentukan SATU jawaban yang paling tepat (akurasi 100%). Format output: HURUF OPSI dan TEKS JAWABAN (contoh: "A. Jakarta" atau "B").
Jawaban:`;
    }
    _determineMatchingOption(aiAnswer, options) {
      if (!aiAnswer || !options || options.length === 0) return 0;
      const raw = aiAnswer.trim();
      const cleaned = raw.replace(/[\*`_#\[\]\(\)]/g, " ").trim();
      const leadingLetterMatch = cleaned.match(/^([A-Ea-e])(?:\s*[\.:\)\-]\s*|\s+|$)/i);
      if (leadingLetterMatch) {
        const letter = leadingLetterMatch[1].toUpperCase();
        const idx = options.findIndex((o) => o.letter.toUpperCase() === letter);
        if (idx !== -1) return idx;
      }
      const keywordLetterMatch = cleaned.match(/(?:jawaban|pilihan|opsi|kunci|answer|option)(?:[^\na-e]{0,35})([A-Ea-e])\b/i);
      if (keywordLetterMatch) {
        const letter = keywordLetterMatch[1].toUpperCase();
        const idx = options.findIndex((o) => o.letter.toUpperCase() === letter);
        if (idx !== -1) return idx;
      }
      const firstLine = cleaned.split("\n")[0].trim();
      if (firstLine.length <= 5) {
        const isolatedLetterMatch = firstLine.match(/\b([A-Ea-e])\b/i);
        if (isolatedLetterMatch) {
          const letter = isolatedLetterMatch[1].toUpperCase();
          const idx = options.findIndex((o) => o.letter.toUpperCase() === letter);
          if (idx !== -1) return idx;
        }
      }
      const upperCleaned = cleaned.toUpperCase();
      let bestMatchIdx = -1;
      let maxMatchLen = 0;
      options.forEach((opt, idx) => {
        const optText = (opt.text || "").trim().toUpperCase();
        if (optText.length >= 3) {
          if (upperCleaned.includes(optText)) {
            if (optText.length > maxMatchLen) {
              maxMatchLen = optText.length;
              bestMatchIdx = idx;
            }
          }
        }
      });
      if (bestMatchIdx !== -1) return bestMatchIdx;
      options.forEach((opt, idx) => {
        const fullText = (opt.fullText || "").trim().toUpperCase();
        if (fullText.length >= 3 && upperCleaned.includes(fullText)) {
          if (fullText.length > maxMatchLen) {
            maxMatchLen = fullText.length;
            bestMatchIdx = idx;
          }
        }
      });
      if (bestMatchIdx !== -1) return bestMatchIdx;
      console.warn("[Mentari AI] Jawaban AI tidak dapat dicocokkan secara pasti:", raw);
      return 0;
    }
    // ─── Smart Question Memory & Scoring Gate (100% Score Verification) ────────
    _getCurrentPageNumber() {
      const m = window.location.search.match(/[?&]page=(\d+)/i);
      if (m) return parseInt(m[1], 10);
      const activeNav = this._getExamNavigationStatus()?.questions?.find((q) => q.isCurrent);
      return activeNav ? activeNav.num : null;
    }
    _recordCurrentQuestionAnswer(questionText, answerText, optionLetter) {
      if (!questionText) return;
      const pageNum = this._getCurrentPageNumber();
      const cleanQ = questionText.trim().toLowerCase().replace(/\s+/g, " ");
      if (!Array.isArray(this._currentSessionQuestions)) {
        this._currentSessionQuestions = [];
      }
      const existingIdx = this._currentSessionQuestions.findIndex((q) => q.cleanQ === cleanQ || pageNum && q.pageNum === pageNum);
      const record = {
        cleanQ,
        rawQ: questionText,
        answerText: (answerText || "").trim(),
        optionLetter: (optionLetter || "").trim().toUpperCase(),
        pageNum: pageNum || (existingIdx !== -1 ? this._currentSessionQuestions[existingIdx].pageNum : null),
        timestamp: Date.now()
      };
      if (existingIdx !== -1) {
        this._currentSessionQuestions[existingIdx] = record;
      } else {
        this._currentSessionQuestions.push(record);
      }
    }
    async _lookupSmartQuestionMemory(questionText, options) {
      try {
        if (!questionText || !options || options.length === 0) return null;
        const store = await Storage.get("mentari_smart_question_memory");
        const memory = Array.isArray(store?.mentari_smart_question_memory) ? store.mentari_smart_question_memory : [];
        if (memory.length === 0) return null;
        const cleanQ = questionText.trim().toLowerCase().replace(/\s+/g, " ");
        const matchedRecord = memory.find((m) => {
          if (!m.cleanQ && !m.questionText) return false;
          const memClean = (m.cleanQ || m.questionText).trim().toLowerCase().replace(/\s+/g, " ");
          if (memClean === cleanQ) return true;
          if (memClean.length > 25 && cleanQ.length > 25) {
            if (memClean.includes(cleanQ) || cleanQ.includes(memClean)) return true;
          }
          return false;
        });
        if (!matchedRecord) return null;
        const targetAns = (matchedRecord.answerText || "").trim().toLowerCase();
        const targetLetter = (matchedRecord.optionLetter || "").trim().toUpperCase();
        if (targetAns.length >= 2) {
          const textMatchIdx = options.findIndex((o) => {
            const optText = (o.text || "").trim().toLowerCase();
            return optText === targetAns || optText.length > 5 && (optText.includes(targetAns) || targetAns.includes(optText));
          });
          if (textMatchIdx !== -1) {
            console.log(`[Smart Memory] Jawaban ditemukan via pencocokan teks opsi: Opsi ${options[textMatchIdx].letter}`);
            return textMatchIdx;
          }
        }
        if (targetLetter) {
          const letterMatchIdx = options.findIndex((o) => o.letter.toUpperCase() === targetLetter);
          if (letterMatchIdx !== -1) {
            console.log(`[Smart Memory] Jawaban ditemukan via huruf opsi tersimpan: [${targetLetter}]`);
            return letterMatchIdx;
          }
        }
        return null;
      } catch (e) {
        console.warn("[Smart Memory] Error lookup:", e);
        return null;
      }
    }
    _extractExamScoreAndReview() {
      const result = {
        score: null,
        isPerfect: false,
        wrongQuestions: [],
        correctQuestions: [],
        rawScoreText: ""
      };
      try {
        const pageText = (document.body ? document.body.innerText : "") || "";
        const scorePatterns = [
          /(?:nilai|skor|grade|mark|score)(?:\s+akhir)?\s*(?:adalah|:)?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:\/|\s+dari\s+|\s+out of\s+)\s*([0-9]+(?:[\.,][0-9]+)?)/i,
          /(?:nilai|skor|grade)\s*[:=]\s*([0-9]+(?:[\.,][0-9]+)?)\s*%/i,
          /([0-9]+(?:[\.,][0-9]+)?)\s*(?:\/|\s+dari\s+)\s*([0-9]+(?:[\.,][0-9]+)?)\s*\(([0-9]+)%\)/i,
          /(?:nilai|skor)\s*[:=]\s*([0-9]+(?:[\.,][0-9]+)?)/i
        ];
        for (const pat of scorePatterns) {
          const m = pageText.match(pat);
          if (m) {
            result.rawScoreText = m[0];
            const val1 = parseFloat(m[1].replace(",", "."));
            const val2 = m[2] ? parseFloat(m[2].replace(",", ".")) : null;
            if (val2 && val2 > 0) {
              result.score = Math.round(val1 / val2 * 100);
            } else if (val1 <= 10 && val1 > 0) {
              result.score = Math.round(val1 * 10);
            } else {
              result.score = Math.round(val1);
            }
            break;
          }
        }
        if (result.score !== null) {
          result.isPerfect = result.score >= 100;
        }
        const questionBlocks = Array.from(document.querySelectorAll('.que, .MuiPaper-root:has(.MuiRadio-root), .MuiPaper-root:has(.soal-text), [class*="question-item"]'));
        questionBlocks.forEach((block, idx) => {
          const bText = (block.textContent || "").toLowerCase();
          const qNum = idx + 1;
          const isWrong = bText.includes("jawaban anda salah") || bText.includes("incorrect") || bText.includes("poin 0,00") || bText.includes("0.00/1.00") || bText.includes("0,00/1,00") || block.querySelector('.incorrect, .is-incorrect, [class*="wrong"]');
          const isRight = bText.includes("jawaban anda benar") || bText.includes("correct") || bText.includes("poin 1,00") || bText.includes("1.00/1.00") || bText.includes("1,00/1,00") || block.querySelector(".correct, .is-correct");
          if (isWrong && !result.wrongQuestions.includes(qNum)) {
            result.wrongQuestions.push(qNum);
          } else if (isRight && !result.correctQuestions.includes(qNum)) {
            result.correctQuestions.push(qNum);
          }
        });
        const navButtons = Array.from(document.querySelectorAll('.qnbutton, [id*="quiznav"], [class*="nav-matrix"] button, aside button'));
        navButtons.forEach((b, idx) => {
          const title = (b.getAttribute("title") || b.getAttribute("aria-label") || "").toLowerCase();
          const cls = (b.className || "").toLowerCase();
          const numMatch = b.textContent.trim().match(/\d+/);
          const qNum = numMatch ? parseInt(numMatch[0], 10) : idx + 1;
          if (title.includes("salah") || title.includes("incorrect") || cls.includes("incorrect")) {
            if (!result.wrongQuestions.includes(qNum)) result.wrongQuestions.push(qNum);
          } else if (title.includes("benar") || title.includes("correct") || cls.includes("correct")) {
            if (!result.correctQuestions.includes(qNum)) result.correctQuestions.push(qNum);
          }
        });
        if (result.wrongQuestions.length > 0) {
          result.isPerfect = false;
        }
      } catch (e) {
        console.warn("[Smart Memory] Gagal mengekstrak skor review:", e);
      }
      return result;
    }
    async _evaluateAndSaveSmartMemory(sourceContext = "QUIZ", examTitle = "") {
      try {
        console.log(`[Smart Memory Gate] Memeriksa hasil ujian pasca pengerjaan (${sourceContext})...`);
        let reviewInfo = this._extractExamScoreAndReview();
        const startWait = Date.now();
        while (Date.now() - startWait < 3500 && reviewInfo.score === null) {
          await Humanizer.delay(400);
          reviewInfo = this._extractExamScoreAndReview();
        }
        console.log("[Smart Memory Gate] Hasil ekstraksi skor:", reviewInfo);
        if (reviewInfo.score !== null) {
          if (reviewInfo.score >= 100 && reviewInfo.wrongQuestions.length === 0) {
            if (this._currentSessionQuestions && this._currentSessionQuestions.length > 0) {
              const store = await Storage.get("mentari_smart_question_memory");
              const memory = Array.isArray(store?.mentari_smart_question_memory) ? store.mentari_smart_question_memory : [];
              let savedCount = 0;
              this._currentSessionQuestions.forEach((q) => {
                if (!q.cleanQ || !q.answerText) return;
                const idx = memory.findIndex((m) => m.cleanQ === q.cleanQ);
                const memItem = {
                  cleanQ: q.cleanQ,
                  questionText: q.rawQ,
                  answerText: q.answerText,
                  optionLetter: q.optionLetter,
                  score: 100,
                  examTitle: examTitle || document.title,
                  timestamp: Date.now()
                };
                if (idx !== -1) {
                  memory[idx] = memItem;
                } else {
                  memory.push(memItem);
                  savedCount++;
                }
              });
              await Storage.set({ mentari_smart_question_memory: memory });
              console.log(`[Smart Memory] Skor 100 Sempurna! Tersimpan ${savedCount} soal baru ke Smart Memory (Total: ${memory.length}).`);
              Toast.success(`Smart Memory: Skor 100 Sempurna! ${this._currentSessionQuestions.length} kunci jawaban tersimpan untuk Post-Test.`);
            }
          } else {
            console.warn(`[Smart Memory VETO] Skor kuis: ${reviewInfo.score}/100 (< 100). Penyimpanan ke Smart Memory DITOLAK.`);
            if (reviewInfo.wrongQuestions.length > 0) {
              const wrongListStr = reviewInfo.wrongQuestions.join(", ");
              Toast.warning(`Skor ${reviewInfo.score}/100. Soal No. [${wrongListStr}] salah! Kunci jawaban TIDAK disimpan ke memori.`);
            } else {
              Toast.warning(`Skor ${reviewInfo.score}/100 (< 100). Kunci jawaban TIDAK disimpan ke memori.`);
            }
          }
        } else {
          console.log("[Smart Memory] Skor kuis tidak terdeteksi langsung di DOM saat ini.");
        }
      } catch (e) {
        console.warn("[Smart Memory] Gagal mengevaluasi hasil ujian:", e);
      }
    }
    _updateHUDNavMatrix(navStatus) {
      if (!this.hudShadow) return;
      const summaryEl = this.hudShadow.getElementById("hud-matrix-summary");
      const matrixEl = this.hudShadow.getElementById("hud-nav-matrix");
      if (!matrixEl || !navStatus || !Array.isArray(navStatus.questions)) return;
      const total = navStatus.totalQuestions || navStatus.total || navStatus.questions.length;
      const answered = navStatus.answeredCount !== void 0 ? navStatus.answeredCount : navStatus.questions.filter((q) => q.isAnswered).length;
      if (summaryEl) {
        summaryEl.textContent = `${answered}/${total} Hijau`;
        if (answered >= total && total > 0) {
          summaryEl.style.color = "#34d399";
        } else {
          summaryEl.style.color = "#fbbf24";
        }
      }
      matrixEl.innerHTML = navStatus.questions.map((q) => {
        let stateClass = "unanswered";
        let title = `Soal ${q.num}: Belum Terjawab (Abu-abu)`;
        if (q.isAnswered) {
          stateClass = "answered";
          title = `Soal ${q.num}: Terjawab (Hijau)`;
        }
        if (q.isCurrent) {
          stateClass += " current";
          title += " (Sedang Dibuka)";
        }
        return `<span class="hud-q-pill ${stateClass}" title="${title}">${q.num}</span>`;
      }).join("");
    }
    _makeElementDraggable(element, handle) {
      if (!element || !handle) return;
      handle.style.cursor = "grab";
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;
      const onPointerDown = (e) => {
        if (e.target.closest("button, input, select, a, textarea")) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        element.style.position = "fixed";
        element.style.left = `${rect.left}px`;
        element.style.top = `${rect.top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        element.style.margin = "0";
        element.style.transform = "none";
        handle.style.cursor = "grabbing";
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
        }
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
        handle.style.cursor = "grab";
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch {
        }
      };
      handle.addEventListener("pointerdown", onPointerDown);
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    }
  };
  if (typeof window !== "undefined") {
    new QuizAssistant();
  }
})();
