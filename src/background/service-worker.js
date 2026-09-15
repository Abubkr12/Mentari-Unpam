/**
 * Mentari Mod Modern Edition - Background Service Worker
 * Manifest V3 background hub untuk isolasi API calls, verifikasi API Key, dan auto-update.
 */

const GEMINI_MODELS_DEFAULT = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Rekomendasi Utama (Fast & Accurate)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', desc: 'Sangat Cepat & Efisien' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', desc: 'Generasi Baru (Next-Gen Intelligence)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', desc: 'High Quota (RPD 500)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', desc: 'High Quota (RPD 500)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', desc: 'Performa Tinggi' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', desc: 'Kemampuan Analisa Luas' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: 'Penalaran Lanjut' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: 'Flagship Speed & Depth' }
];

// Inisialisasi default saat install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Service Worker] Mentari Mod Modern Edition terpasang:', details.reason);
  
  const current = await chrome.storage.local.get(['gemini_model', 'available_models']);
  if (!current.gemini_model) {
    await chrome.storage.local.set({
      gemini_model: 'gemini-2.5-flash',
      available_models: GEMINI_MODELS_DEFAULT
    });
  }
});

// Listener untuk pesan dari Content Script / Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;

  switch (action) {
    case 'validateGeminiApiKey':
      handleValidateApiKey(request.apiKey).then(sendResponse);
      return true; // async response

    case 'generateGeminiContent':
      handleGenerateContent(request).then(sendResponse);
      return true;

    case 'getAvailableModels':
      chrome.storage.local.get(['available_models', 'gemini_model'], (data) => {
        sendResponse({
          models: data.available_models || GEMINI_MODELS_DEFAULT,
          activeModel: data.gemini_model || 'gemini-2.5-flash'
        });
      });
      return true;

    case 'checkExtensionUpdate':
      handleCheckUpdate().then(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown action: ' + action });
      return false;
  }
});

/**
 * Validasi API Key ke Google AI Studio endpoint resmi
 */
async function handleValidateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, message: 'API Key tidak boleh kosong.' };
  }

  const cleanKey = apiKey.trim();
  // Validasi format universal (Mendukung AQ. Auth Keys dan AIza... Traffic Keys)
  const keyPattern = /^(AIza|AQ)[a-zA-Z0-9_\-\.]{20,}$/;
  if (!keyPattern.test(cleanKey)) {
    return {
      valid: false,
      message: 'Format API key tidak valid. Harus diawali dengan AQ. (Auth Key baru) atau AIza... (Standard Key).'
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      // Simpan API Key yang valid di chrome.storage.local
      await chrome.storage.local.set({ geminiApiKey: cleanKey });
      return { valid: true, message: 'API key valid dan berhasil dikoneksikan ke Google AI Studio!' };
    } else {
      const err = await response.json().catch(() => ({}));
      const errorMsg = err.error?.message || `HTTP ${response.status}: Key ditolak oleh Google.`;
      return { valid: false, message: errorMsg };
    }
  } catch (e) {
    return { valid: false, message: 'Gagal menghubungi server Google Gemini: ' + e.message };
  }
}

/**
 * Memanggil Gemini API untuk inferensi teks kuis / forum / chatbot
 */
async function handleGenerateContent({ prompt, systemInstruction = '', model = null }) {
  const store = await chrome.storage.local.get(['geminiApiKey', 'gemini_model']);
  const apiKey = store.geminiApiKey;
  const activeModel = model || store.gemini_model || 'gemini-2.5-flash';

  if (!apiKey) {
    return {
      success: false,
      error: 'API Key Gemini belum disetel. Buka pengaturan untuk memasukkan API Key.'
    };
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

    const bodyPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2, // Rendah untuk akurasi tinggi pada soal kuis
        topP: 0.95,
        maxOutputTokens: 2048
      }
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Error ${response.status} dari Gemini API.`;
      
      // Auto-fallback jika model mengalami lonjakan trafik / high demand (503 / 429)
      const isHighDemand = response.status === 503 || response.status === 429 || errMsg.toLowerCase().includes('high demand') || errMsg.toLowerCase().includes('quota');
      if (isHighDemand && activeModel !== 'gemini-2.5-flash') {
        console.warn(`[Service Worker] Model ${activeModel} sedang padat/overload. Melakukan fallback otomatis ke gemini-2.5-flash...`);
        const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (fallbackRes.ok) {
          const fbJson = await fallbackRes.json();
          const fbText = fbJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return {
            success: true,
            text: fbText,
            model: 'Gemini 2.5 Flash (Fallback Otomatis)'
          };
        }
      }

      return {
        success: false,
        error: errMsg
      };
    }

    const resJson = await response.json();
    const candidate = resJson.candidates?.[0];
    const textOut = candidate?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      text: textOut,
      model: activeModel
    };
  } catch (e) {
    return {
      success: false,
      error: 'Koneksi error: ' + e.message
    };
  }
}

/**
 * Cek pembaruan rilis resmi di GitHub
 */
async function handleCheckUpdate() {
  try {
    const res = await fetch('https://api.github.com/repos/lukman754/Mentari-Unpam/releases/latest', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        latestVersion: data.tag_name,
        releaseUrl: data.html_url
      };
    }
  } catch (e) {
    // Silent fail jika offline
  }
  return { success: false };
}
