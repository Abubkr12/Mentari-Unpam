/**
 * Mentari Mod Modern Edition - Storage Utility
 * Isolasi total kredensial di chrome.storage.local (100% offline & lokal di browser).
 * Dilengkapi graceful fallback untuk mengantisipasi "Extension context invalidated".
 */

export const Storage = {
  /**
   * Memeriksa apakah context extension masih valid dan aktif
   */
  isContextValid() {
    try {
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
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
              console.log('[Storage] Info reading storage:', chrome.runtime.lastError.message);
              resolve(this._getLocalStorageFallback(keys, defaults));
            } else {
              resolve(Object.assign({}, defaults, result));
            }
          });
        } else {
          // Fallback context jika di luar ekstensi atau extension baru saja di-reload
          resolve(this._getLocalStorageFallback(keys, defaults));
        }
      } catch (e) {
        if (e.message && e.message.includes('Extension context invalidated')) {
          console.warn('[Storage] Extension context invalidated (ekstensi baru di-reload). Menggunakan fallback lokal.');
        } else {
          console.error('[Storage] Get failed:', e);
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
          keyList.forEach(k => {
            try { localStorage.removeItem(k); } catch {}
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
              console.log('[Storage] Info reading all storage:', chrome.runtime.lastError.message);
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
    if (typeof localStorage === 'undefined') return res;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      try {
        const val = localStorage.getItem(k);
        if (val !== null) {
          try { res[k] = JSON.parse(val); } catch { res[k] = val; }
        }
      } catch {}
    }
    return res;
  },

  _getLocalStorageFallback(keys, defaults = {}) {
    const res = Object.assign({}, defaults);
    if (typeof localStorage === 'undefined') return res;
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => {
      try {
        const val = localStorage.getItem(k);
        if (val !== null) {
          try { res[k] = JSON.parse(val); } catch { res[k] = val; }
        }
      } catch {}
    });
    return res;
  },

  _setLocalStorageFallback(items) {
    if (typeof localStorage === 'undefined') return;
    for (const [k, v] of Object.entries(items)) {
      try {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      } catch {}
    }
  },

  /**
   * Auto-migrasi transparan dari localStorage lama ke chrome.storage.local.
   * Dipanggil saat ekstensi pertama kali aktif.
   */
  async autoMigrateLegacyStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      // Cek apakah sudah pernah dimigrasikan sebelumnya
      const { mentari_legacy_migrated } = await this.get('mentari_legacy_migrated', { mentari_legacy_migrated: false });
      if (mentari_legacy_migrated) return;

      const legacyKeys = [
        'mentari_auth_token',
        'mentari_user_info',
        'mentari_course_data',
        'geminiApiKey',
        'gemini_model',
        'gemini_quota',
        'mentari_auto_finish_quiz',
        'access'
      ];

      const validModels = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-3-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash'
      ];

      const toMigrate = {};
      let hasData = false;

      // Ambil data yang sudah ada di chrome.storage.local agar tidak menimpa setting modern
      const existing = await this.get(['gemini_model', 'geminiApiKey']);

      for (const k of legacyKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            // Check base64 encoded apiKey
            if (k === 'geminiApiKey') {
              if (!existing.geminiApiKey) {
                try {
                  toMigrate[k] = atob(raw);
                } catch {
                  toMigrate[k] = raw;
                }
                hasData = true;
              }
            } else if (k === 'gemini_model') {
              // Hanya migrasi gemini_model jika belum ada di chrome.storage dan nilainya valid
              let parsedModel = raw;
              try { parsedModel = JSON.parse(raw); } catch {}
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
      console.log('[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.');
    } catch (e) {
      console.log('[Storage] Auto-migrasi info:', e.message);
    }
  }
};
