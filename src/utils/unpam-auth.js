/**
 * Mentari Mod Modern Edition - UNPAM Universal Auth & Token Interceptor
 * Menangkap dan mengelola token JWT perkuliahan (Mentari & MyUnpam) secara otomatis & handal.
 */

import { Storage } from './storage.js';

export const UnpamAuth = {
  _cachedToken: null,
  _activeAccountId: null,
  _snifferInjected: false,

  /**
   * Mendekode payload JWT secara aman dengan normalisasi Base64URL
   */
  decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const jsonStr = decodeURIComponent(
        atob(b64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
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
    if (!token || typeof token !== 'string') return false;
    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      const parts = token.split('.');
      return parts.length === 3 && parts[1].length > 10;
    }
    if (typeof payload.exp === 'number') {
      // payload.exp dalam DETIK, Date.now() dalam MILIDETIK
      const isExpired = (payload.exp * 1000) <= (Date.now() + 30000);
      if (isExpired) {
        console.log('[UnpamAuth] Token kedaluwarsa (exp:', payload.exp, 'now:', Math.floor(Date.now() / 1000), ')');
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
    return payload?.nim || payload?.username || payload?.id || payload?.sub || 'default';
  },

  /**
   * Menghapus token usang/tidak valid dari memori dan storage
   */
  clearInvalidToken() {
    this._cachedToken = null;
    if (typeof window !== 'undefined') {
      delete window.lastAuthToken;
      try {
        window.dispatchEvent(new CustomEvent('mentari-token-invalidated'));
      } catch {}
    }
    try {
      localStorage.removeItem('mentari_auth_token');
      sessionStorage.removeItem('mentari_auth_token');
    } catch {}
    Storage.remove(['mentari_auth_token', 'access']);
  },

  // Scan native Mentari storage keys before extension cache so account switches take effect immediately.
  getLiveStorageToken() {
    if (typeof localStorage === 'undefined') return null;
    try {
      for (const priorityKey of ['access', 'token']) {
        const val = localStorage.getItem(priorityKey);
        const extracted = this._extractJwtFromValue(val, priorityKey);
        if (extracted && this.isTokenValid(extracted)) {
          return extracted;
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key.startsWith('mentari_')) continue;
        const val = localStorage.getItem(key);
        const extracted = this._extractJwtFromValue(val, key);
        if (extracted && this.isTokenValid(extracted)) {
          return extracted;
        }
      }
    } catch (e) {
      console.log('[UnpamAuth] Live storage scan info:', e.message);
    }
    return null;
  },

  _clearStaleAccountSession() {
    this._cachedToken = null;
    if (typeof window !== 'undefined') {
      delete window.lastAuthToken;
    }
    try {
      localStorage.removeItem('mentari_auth_token');
      localStorage.removeItem('mentari_user_info');
      sessionStorage.removeItem('mentari_auth_token');
    } catch {}
    Storage.remove(['mentari_auth_token', 'mentari_user_info', 'mentari_cached_courses', 'mentari_cached_forums', 'access']);
  },

  _detectAccountSwitch(token) {
    if (!token) return null;
    const nextId = this.getUserIdentifier(token);
    if (!nextId || nextId === 'default') return null;

    let prevId = this._activeAccountId;
    if (!prevId && typeof localStorage !== 'undefined') {
      try {
        const prevRaw = localStorage.getItem('mentari_auth_token');
        if (prevRaw && prevRaw !== token) {
          const parsedPrevId = this.getUserIdentifier(prevRaw);
          if (parsedPrevId && parsedPrevId !== 'default') prevId = parsedPrevId;
        }
      } catch {}
    }

    this._activeAccountId = nextId;
    if (prevId && prevId !== 'default' && prevId !== nextId) {
      return { prevUserId: prevId, nextUserId: nextId };
    }
    return null;
  },

  /**
   * Mengambil token autentikasi (JWT) mahasiswa dari berbagai sumber
   */
  async getAuthToken() {
    // Prefer active native Mentari session token over cached extension copies.
    const liveToken = this.getLiveStorageToken();
    if (liveToken) {
      if (liveToken !== this._cachedToken) {
        this._saveCapturedToken(liveToken);
      }
      return liveToken;
    }

    // 1. Cek token yang sudah tertangkap di memori
    if (this._cachedToken) {
      if (this.isTokenValid(this._cachedToken)) {
        return this._cachedToken;
      }
      this.clearInvalidToken();
    }

    if (typeof window !== 'undefined' && window.lastAuthToken) {
      if (this.isTokenValid(window.lastAuthToken)) {
        this._cachedToken = window.lastAuthToken;
        return this._cachedToken;
      }
      delete window.lastAuthToken;
    }

    // 2. Cek localStorage langsung (berbagi origin dengan halaman)
    if (typeof localStorage !== 'undefined') {
      const directLocal = localStorage.getItem('mentari_auth_token');
      if (directLocal && directLocal.startsWith('eyJ')) {
        if (this.isTokenValid(directLocal)) {
          this._saveCapturedToken(directLocal);
          return directLocal;
        } else {
          try { localStorage.removeItem('mentari_auth_token'); } catch {}
        }
      }
    }

    // 3. Cek chrome.storage.local
    const stored = await Storage.get(['mentari_auth_token', 'access']);
    if (stored.mentari_auth_token) {
      if (this.isTokenValid(stored.mentari_auth_token)) {
        this._cachedToken = stored.mentari_auth_token;
        this._activeAccountId = this._activeAccountId || this.getUserIdentifier(stored.mentari_auth_token);
        return this._cachedToken;
      } else {
        Storage.remove('mentari_auth_token');
      }
    }
    if (stored.access) {
      if (this.isTokenValid(stored.access)) {
        this._cachedToken = stored.access;
        this._activeAccountId = this._activeAccountId || this.getUserIdentifier(stored.access);
        return this._cachedToken;
      } else {
        Storage.remove('access');
      }
    }

    // 4. Deep Scan localStorage untuk token JWT (ciri khas: diawali atau memuat 'eyJ')
    if (typeof localStorage !== 'undefined') {
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
        console.log('[UnpamAuth] Scan localStorage info:', e.message);
      }
    }

    // 5. Deep Scan sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        const directSession = sessionStorage.getItem('mentari_auth_token');
        if (directSession && directSession.startsWith('eyJ') && this.isTokenValid(directSession)) {
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
        console.log('[UnpamAuth] Scan sessionStorage info:', e.message);
      }
    }

    // 6. Scan Cookies
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const parts = cookie.trim().split('=');
        if (parts.length >= 2) {
          const cVal = decodeURIComponent(parts.slice(1).join('='));
          if (cVal.includes('eyJ')) {
            const extracted = this._extractJwtFromValue(cVal);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        }
      }
    }

    // 7. Minta Main World Sniffer untuk menyinkronkan token jika ada
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mentari-request-token-sync'));
    }

    return null;
  },

  /**
   * Mengambil XSRF-TOKEN dari cookie untuk MyUnpam
   */
  getXsrfToken() {
    if (typeof document === 'undefined' || !document.cookie) return '';
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith('XSRF-TOKEN=')) {
        return decodeURIComponent(trimmed.substring(11));
      }
    }
    return '';
  },

  /**
   * Menyiapkan opsi header lengkap untuk request ke API UNPAM
   */
  async getFetchOptions(extraHeaders = {}) {
    const token = await this.getAuthToken();
    const xsrf = this.getXsrfToken();

    const headers = {
      'Accept': 'application/json, text/plain, */*',
      ...extraHeaders
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = xsrf;
    }

    return {
      headers,
      credentials: 'include'
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
    if (typeof window === 'undefined' || this._listenersInstalled) return;
    this._listenersInstalled = true;

    const self = this;

    // 1. Tangkap token via CustomEvent dari Main World
    window.addEventListener('mentari-token-captured', (e) => {
      const token = e.detail?.token || e.detail;
      if (token && typeof token === 'string') {
        self._saveCapturedToken(token);
      }
    });

    // 2. Tangkap token via window message
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'MENTARI_TOKEN_CAPTURED' && e.data.token) {
        self._saveCapturedToken(e.data.token);
      }
    });

    // 3. Fallback Dynamic Injection Main World Sniffer
    if (!this._snifferInjected && typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      this._snifferInjected = true;
      try {
        const scriptId = 'mentari-injected-sniffer';
        if (!document.getElementById(scriptId)) {
          const s = document.createElement('script');
          s.id = scriptId;
          const isDist = chrome.runtime.getURL('manifest.json').includes('/dist/') || !chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0]?.startsWith('dist/');
          s.src = chrome.runtime.getURL(isDist ? 'content/main-sniffer.js' : 'dist/content/main-sniffer.js');
          (document.head || document.documentElement).appendChild(s);
        }
      } catch (err) {
        console.log('[UnpamAuth] Fallback sniffer injection notice:', err.message);
      }
    }

    // 4. Sniff juga di Isolated World untuk request internal
    if (window.XMLHttpRequest && XMLHttpRequest.prototype.setRequestHeader) {
      const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        if (header && typeof header === 'string' && header.toLowerCase() === 'authorization') {
          if (value && typeof value === 'string' && value.includes('Bearer ')) {
            const token = value.split('Bearer ')[1]?.trim();
            if (token && token.startsWith('eyJ')) {
              self._saveCapturedToken(token);
            }
          }
        }
        return originalSetHeader.apply(this, arguments);
      };
    }

    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = async function (resource, config) {
        try {
          if (config && config.headers) {
            let authHeader = null;
            if (config.headers instanceof Headers) {
              authHeader = config.headers.get('authorization') || config.headers.get('Authorization');
            } else if (typeof config.headers === 'object') {
              authHeader = config.headers['authorization'] || config.headers['Authorization'];
            }

            if (authHeader && typeof authHeader === 'string' && authHeader.includes('Bearer ')) {
              const token = authHeader.split('Bearer ')[1]?.trim();
              if (token && token.startsWith('eyJ')) {
                self._saveCapturedToken(token);
              }
            }
          }
        } catch {}
        return originalFetch.apply(this, arguments);
      };
    }
  },

  _extractJwtFromValue(val, keyName = '') {
    if (!val || typeof val !== 'string') return null;

    let clean = val.trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1);
    }

    if (clean.startsWith('eyJ') && clean.split('.').length === 3) {
      return clean;
    }

    if (clean.includes('Bearer eyJ')) {
      const m = clean.match(/Bearer\s+(eyJ[a-zA-Z0-9_\-\.]+)/);
      if (m) return m[1];
    }

    if (clean.startsWith('[') && clean.endsWith(']')) {
      try {
        const arr = JSON.parse(clean);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (typeof item === 'string' && item.startsWith('eyJ') && item.split('.').length === 3) {
              return item;
            }
            if (item && typeof item === 'object') {
              const candidates = [item.token, item.access_token, item.accessToken, item.jwt, item.access, item.authToken];
              for (const c of candidates) {
                if (typeof c === 'string' && c.startsWith('eyJ') && c.split('.').length === 3) {
                  return c;
                }
              }
            }
          }
        }
      } catch {}
    }

    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const obj = JSON.parse(clean);
        const candidates = [obj.token, obj.access_token, obj.accessToken, obj.jwt, obj.access, obj.authToken];
        for (const c of candidates) {
          if (typeof c === 'string' && c.startsWith('eyJ')) {
            return c;
          }
        }
      } catch {}
    }

    return null;
  },

  _saveCapturedToken(token) {
    if (!token || !this.isTokenValid(token)) return;
    const switchInfo = this._detectAccountSwitch(token);
    if (switchInfo) {
      this._clearStaleAccountSession();
    }
    this._cachedToken = token;
    if (typeof window !== 'undefined') {
      window.lastAuthToken = token;
    }
    try {
      localStorage.setItem('mentari_auth_token', token);
    } catch {}
    Storage.set({ mentari_auth_token: token });
    if (switchInfo && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('mentari-account-switched', { detail: switchInfo }));
      } catch {}
    }
  }
};

if (typeof window !== 'undefined') {
  UnpamAuth.installLiveSniffer();
}
