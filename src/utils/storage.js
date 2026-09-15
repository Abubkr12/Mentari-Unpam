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

      const toMigrate = {};
      let hasData = false;

      for (const k of legacyKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            // Check base64 encoded apiKey
            if (k === 'geminiApiKey') {
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
        console.log('[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.');
      }
    } catch (e) {
      console.log('[Storage] Auto-migrasi info:', e.message);
    }
  }
};
