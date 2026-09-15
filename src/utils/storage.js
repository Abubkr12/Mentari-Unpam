/**
 * Mentari Mod Modern Edition - Storage Utility
 * Isolasi total kredensial di chrome.storage.local (100% offline & lokal di browser).
 */

export const Storage = {
  /**
   * Mengambil satu atau beberapa nilai dari chrome.storage.local
   */
  async get(keys, defaults = {}) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              console.log('[Storage] Info reading storage:', chrome.runtime.lastError);
              resolve(defaults);
            } else {
              resolve(Object.assign({}, defaults, result));
            }
          });
        } else {
          // Fallback context jika dijalankan di luar ekstensi (e.g. testing)
          const res = Object.assign({}, defaults);
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) {
              try { res[k] = JSON.parse(val); } catch { res[k] = val; }
            }
          });
          resolve(res);
        }
      } catch (e) {
        console.error('[Storage] Get failed:', e);
        resolve(defaults);
      }
    });
  },

  /**
   * Menyimpan pasangan key-value ke chrome.storage.local
   */
  async set(items) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(true);
            }
          });
        } else {
          for (const [k, v] of Object.entries(items)) {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
          resolve(true);
        }
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Menghapus satu atau beberapa keys dari chrome.storage.local
   */
  async remove(keys) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(keys, () => resolve(true));
      } else {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach(k => localStorage.removeItem(k));
        resolve(true);
      }
    });
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
