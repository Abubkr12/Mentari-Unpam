/**
 * Mentari Mod Modern Edition - DOM Utility & Resilient Locators
 * Pengganti querySelector rapuh dan CSS non-standar :contains().
 * 100% aman untuk ekosistem Mentari & MyUnpam.
 */

export const DOM = {
  /**
   * Mencari tombol berdasarkan teks kontennya (pengganti fatal bug :contains())
   * Aman dari DOMException / SyntaxError pada Chromium modern.
   */
  findButtonByText(keywords, root = document) {
    const list = Array.isArray(keywords) ? keywords : [keywords];
    const normalized = list.map(k => k.trim().toLowerCase());

    const buttons = root.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"], div[role="button"]');
    for (const btn of buttons) {
      // Abaikan tombol tersembunyi
      if (btn.offsetParent === null && !btn.getClientRects().length) continue;

      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      if (normalized.some(kw => text.includes(kw))) {
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
    const normalized = list.map(k => k.trim().toLowerCase());
    const matches = [];

    const buttons = root.querySelectorAll('button, a[role="button"], div[role="button"]');
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (normalized.some(kw => text.includes(kw))) {
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
      document.querySelector('header .MuiToolbar-root'),
      document.querySelector('.MuiAppBar-root .MuiToolbar-root'),
      document.querySelector('header'),
      document.querySelector('.MuiAppBar-root'),
      document.querySelector('nav'),
      document.querySelector('[role="banner"]'),
      document.querySelector('.css-1yxmbwk') // fallback jika hash kebetulan masih aktif
    ];
    return candidates.find(el => el !== null) || null;
  },

  /**
   * Mencari opsi radio button pada container soal kuis secara aman
   * Menggantikan selector rapuh .css-1kic1uf / .css-1675apn
   */
  findRadioOptions(questionContainer) {
    if (!questionContainer) return [];

    // Prioritas 1: standard radio inputs
    const inputs = questionContainer.querySelectorAll('input[type="radio"]');
    if (inputs.length > 0) return Array.from(inputs);

    // Prioritas 2: MUI Radio components
    const muiRadios = questionContainer.querySelectorAll('.MuiRadio-root, [role="radio"]');
    if (muiRadios.length > 0) return Array.from(muiRadios);

    // Prioritas 3: Form control labels
    const labels = questionContainer.querySelectorAll('.MuiFormControlLabel-root');
    if (labels.length > 0) return Array.from(labels);

    return [];
  },

  /**
   * Menunggu elemen muncul di DOM dengan batas timeout
   */
  waitForElement(selectorOrFn, timeout = 10000, root = document) {
    return new Promise((resolve) => {
      const check = () => {
        if (typeof selectorOrFn === 'function') {
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
  }
};
