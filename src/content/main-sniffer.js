/**
 * Mentari Mod Modern Edition - Main World Token Sniffer
 * Berjalan di Main Execution Context halaman untuk menyadap request HTTP asli Mentari/MyUnpam.
 * Menangkap header Authorization (Bearer eyJ...) secara instan tanpa terhalang isolasi Manifest V3.
 */

(function () {
  if (window.__mentari_main_sniffer_active__) return;
  window.__mentari_main_sniffer_active__ = true;

  console.log('[Mentari Mod] Main World Token Sniffer aktif.');

  function isJwtValid(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const jsonStr = decodeURIComponent(
        atob(b64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonStr);
      if (payload && typeof payload.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSec + 30) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return parts[1].length > 10;
    }
  }

  function extractAndBroadcastToken(rawToken, source = 'network') {
    if (!rawToken || typeof rawToken !== 'string') return;
    let token = rawToken.trim();

    if (token.startsWith('Bearer ')) {
      token = token.substring(7).trim();
    }

    // Validasi struktur JWT standard dan masa berlaku
    if (!token.startsWith('eyJ') || !isJwtValid(token)) {
      return;
    }

    // Jika token sama dengan yang terakhir ditangkap dan bukan request sync eksplisit, lewati
    if (window.lastAuthToken === token && source !== 'sync-request') return;

    window.lastAuthToken = token;

    // Simpan ke storage halaman agar dapat diakses kapan saja oleh tab
    try {
      localStorage.setItem('mentari_auth_token', token);
      sessionStorage.setItem('mentari_auth_token', token);
    } catch (e) {
      // Abaikan jika storage disabled
    }

    // Siarkan ke isolated world via DOM CustomEvent dan postMessage
    try {
      window.dispatchEvent(new CustomEvent('mentari-token-captured', {
        detail: { token, source }
      }));
      window.postMessage({
        type: 'MENTARI_TOKEN_CAPTURED',
        token,
        source
      }, '*');
    } catch (e) {
      // Abaikan error siaran
    }

    console.log(`[Mentari Mod] Token JWT berhasil ditangkap dari: ${source}`);
  }

  // 1. Pindai cepat storage & cookies yang sudah ada saat script mulai berjalan
  function initialStorageScan() {
    try {
      // Scan localStorage
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const val = localStorage.getItem(key);
          if (val && val.includes('eyJ')) {
            const match = val.match(/eyJ[a-zA-Z0-9_\-\.]+/);
            if (match) extractAndBroadcastToken(match[0], `localStorage(${key})`);
          }
        }
      }

      // Scan sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const val = sessionStorage.getItem(key);
          if (val && val.includes('eyJ')) {
            const match = val.match(/eyJ[a-zA-Z0-9_\-\.]+/);
            if (match) extractAndBroadcastToken(match[0], `sessionStorage(${key})`);
          }
        }
      }

      // Scan document.cookie
      if (typeof document !== 'undefined' && document.cookie) {
        const match = document.cookie.match(/eyJ[a-zA-Z0-9_\-\.]+/);
        if (match) extractAndBroadcastToken(match[0], 'cookie');
      }
    } catch (e) {
      console.log('[Mentari Mod] Sniffer scan notice:', e.message);
    }
  }

  initialStorageScan();

  // 2. Intercept XMLHttpRequest (XHR)
  if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype.setRequestHeader) {
    const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      if (header && typeof header === 'string' && header.toLowerCase() === 'authorization') {
        extractAndBroadcastToken(value, 'XHR(Authorization)');
      }
      return origSetRequestHeader.apply(this, arguments);
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener('load', function () {
        try {
          const auth = this.getResponseHeader?.('authorization') || this.getResponseHeader?.('Authorization');
          if (auth) extractAndBroadcastToken(auth, 'XHR(ResponseHeader)');
        } catch (e) {}
      });
      return origOpen.apply(this, arguments);
    };
  }

  // 3. Intercept window.fetch
  if (typeof window !== 'undefined' && window.fetch) {
    const origFetch = window.fetch;
    window.fetch = async function (resource, config) {
      try {
        if (config && config.headers) {
          let authHeader = null;
          if (config.headers instanceof Headers) {
            authHeader = config.headers.get('authorization') || config.headers.get('Authorization');
          } else if (typeof config.headers === 'object') {
            authHeader = config.headers['authorization'] || config.headers['Authorization'];
          }

          if (authHeader) {
            extractAndBroadcastToken(authHeader, 'fetch(RequestHeader)');
          }
        }
      } catch (e) {}

      const response = await origFetch.apply(this, arguments);

      try {
        if (response && response.headers) {
          const authRes = response.headers.get('authorization') || response.headers.get('Authorization');
          if (authRes) {
            extractAndBroadcastToken(authRes, 'fetch(ResponseHeader)');
          }
        }
      } catch (e) {}

      return response;
    };
  }

  // Tangani token invalidation dari content script jika terdeteksi expired di server
  window.addEventListener('mentari-token-invalidated', () => {
    delete window.lastAuthToken;
    try {
      localStorage.removeItem('mentari_auth_token');
      sessionStorage.removeItem('mentari_auth_token');
    } catch (e) {}
  });

  // Tangani request token manual dari content script
  window.addEventListener('mentari-request-token-sync', () => {
    if (window.lastAuthToken && isJwtValid(window.lastAuthToken)) {
      extractAndBroadcastToken(window.lastAuthToken, 'sync-request');
    } else {
      delete window.lastAuthToken;
      initialStorageScan();
    }
  });
})();
