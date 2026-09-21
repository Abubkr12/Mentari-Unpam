// src/background/service-worker.js
var GEMINI_MODELS_DEFAULT = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Rekomendasi Utama (Fast & Accurate)" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", desc: "Sangat Cepat & Efisien" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", desc: "Generasi Baru (Next-Gen Intelligence)" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", desc: "High Quota (RPD 500)" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", desc: "High Quota (RPD 500)" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", desc: "Performa Tinggi" },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "Kemampuan Analisa Luas" },
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", desc: "Penalaran Lanjut" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "Flagship Speed & Depth" }
];
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Service Worker] Mentari Mod Modern Edition terpasang:", details.reason);
  const current = await chrome.storage.local.get(["gemini_model", "available_models"]);
  if (!current.gemini_model) {
    await chrome.storage.local.set({
      gemini_model: "gemini-2.5-flash",
      available_models: GEMINI_MODELS_DEFAULT
    });
  }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;
  switch (action) {
    case "validateGeminiApiKey":
      handleValidateApiKey(request.apiKey).then(sendResponse);
      return true;
    // async response
    case "addGeminiApiKey":
      handleAddApiKey(request.apiKey).then(sendResponse);
      return true;
    case "removeGeminiApiKey":
      handleRemoveApiKey(request.apiKey).then(sendResponse);
      return true;
    case "getGeminiApiKeys":
      handleGetApiKeys().then(sendResponse);
      return true;
    case "setActiveGeminiApiKey":
      handleSetActiveApiKey(request.apiKey).then(sendResponse);
      return true;
    case "generateGeminiContent":
      handleGenerateContent(request).then(sendResponse);
      return true;
    case "getAvailableModels":
      chrome.storage.local.get(["available_models", "gemini_model"], (data) => {
        sendResponse({
          models: data.available_models || GEMINI_MODELS_DEFAULT,
          activeModel: data.gemini_model || "gemini-2.5-flash"
        });
      });
      return true;
    case "checkExtensionUpdate":
      handleCheckUpdate().then(sendResponse);
      return true;
    default:
      sendResponse({ error: "Unknown action: " + action });
      return false;
  }
});
async function handleValidateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, message: "API Key tidak boleh kosong." };
  }
  const cleanKey = apiKey.trim();
  const keyPattern = /^(AIza|AQ)[a-zA-Z0-9_\-\.]{20,}$/;
  if (!keyPattern.test(cleanKey)) {
    return {
      valid: false,
      message: "Format API key tidak valid. Harus diawali dengan AQ. (Auth Key baru) atau AIza... (Standard Key)."
    };
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (response.ok) {
      const store = await chrome.storage.local.get(["geminiApiKeys", "geminiApiKey"]);
      let keys = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
      if (store.geminiApiKey && !keys.includes(store.geminiApiKey)) {
        keys.unshift(store.geminiApiKey);
      }
      if (!keys.includes(cleanKey)) {
        keys.push(cleanKey);
      }
      await chrome.storage.local.set({
        geminiApiKey: cleanKey,
        geminiApiKeys: keys
      });
      return { valid: true, message: "API key valid dan berhasil dikoneksikan ke Google AI Studio!" };
    } else {
      const err = await response.json().catch(() => ({}));
      const errorMsg = err.error?.message || `HTTP ${response.status}: Key ditolak oleh Google.`;
      return { valid: false, message: errorMsg };
    }
  } catch (e) {
    return { valid: false, message: "Gagal menghubungi server Google Gemini: " + e.message };
  }
}
async function handleAddApiKey(apiKey) {
  return handleValidateApiKey(apiKey);
}
async function handleRemoveApiKey(targetKey) {
  if (!targetKey) return { success: false, message: "Key tidak valid." };
  const store = await chrome.storage.local.get(["geminiApiKeys", "geminiApiKey"]);
  let keys = Array.isArray(store.geminiApiKeys) ? store.geminiApiKeys : [];
  keys = keys.filter((k) => k !== targetKey);
  const newActive = keys[0] || "";
  await chrome.storage.local.set({
    geminiApiKeys: keys,
    geminiApiKey: newActive
  });
  return { success: true, keys, activeKey: newActive };
}
async function handleSetActiveApiKey(targetKey) {
  if (!targetKey) return { success: false, message: "Key tidak valid." };
  const store = await chrome.storage.local.get(["geminiApiKeys", "geminiApiKey"]);
  let keys = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
  if (!keys.includes(targetKey)) {
    keys.unshift(targetKey);
  } else {
    keys = [targetKey, ...keys.filter((k) => k !== targetKey)];
  }
  await chrome.storage.local.set({
    geminiApiKey: targetKey,
    geminiApiKeys: keys
  });
  return { success: true, activeKey: targetKey, keys };
}
async function handleGetApiKeys() {
  const store = await chrome.storage.local.get(["geminiApiKeys", "geminiApiKey"]);
  let keys = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
  if (store.geminiApiKey && !keys.includes(store.geminiApiKey)) {
    keys.unshift(store.geminiApiKey);
  }
  return {
    keys,
    activeKey: store.geminiApiKey || keys[0] || ""
  };
}
async function handleGenerateContent({ prompt, systemInstruction = "", model = null }) {
  const store = await chrome.storage.local.get(["geminiApiKey", "geminiApiKeys", "gemini_model"]);
  const activeModel = model || store.gemini_model || "gemini-2.5-flash";
  let keyPool = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
  if (store.geminiApiKey && !keyPool.includes(store.geminiApiKey)) {
    keyPool.unshift(store.geminiApiKey);
  }
  if (store.geminiApiKey && keyPool.includes(store.geminiApiKey)) {
    keyPool = [store.geminiApiKey, ...keyPool.filter((k) => k !== store.geminiApiKey)];
  }
  if (keyPool.length === 0) {
    return {
      success: false,
      error: "Belum ada API Key Gemini yang disetel. Buka pengaturan untuk memasukkan API Key."
    };
  }
  const bodyPayload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };
  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }
  let lastError = null;
  for (let i = 0; i < keyPool.length; i++) {
    const currentKey = keyPool[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${currentKey}`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (response.ok) {
        const resJson = await response.json();
        const candidate = resJson.candidates?.[0];
        const textOut = candidate?.content?.parts?.[0]?.text || "";
        if (currentKey !== store.geminiApiKey) {
          console.log(`[Service Worker] Sukses menggunakan API Key cadangan ke-${i + 1}. Mengubah primary key.`);
          await chrome.storage.local.set({ geminiApiKey: currentKey });
        }
        return {
          success: true,
          text: textOut,
          model: activeModel,
          keyIndex: i + 1,
          totalKeys: keyPool.length
        };
      }
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Error HTTP ${response.status}`;
      const isQuotaOrLimit = response.status === 429 || response.status === 403 || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("resource has been exhausted");
      if (isQuotaOrLimit && i < keyPool.length - 1) {
        console.warn(`[Service Worker] API Key ke-${i + 1} terkena limit (${errMsg}). Beralih otomatis ke API Key cadangan berikutnya...`);
        lastError = `API Key #${i + 1} kena limit: ${errMsg}`;
        continue;
      } else {
        lastError = errMsg;
      }
    } catch (netErr) {
      lastError = netErr.message;
      if (i < keyPool.length - 1) continue;
    }
  }
  if (activeModel !== "gemini-2.5-flash") {
    for (const fbKey of keyPool) {
      try {
        const fbRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${fbKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload)
        });
        if (fbRes.ok) {
          const fbJson = await fbRes.json();
          const fbText = fbJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return {
            success: true,
            text: fbText,
            model: "Gemini 2.5 Flash (Fallback Kuota)"
          };
        }
      } catch {
      }
    }
  }
  return {
    success: false,
    error: `Semua API Key (${keyPool.length} key) gagal: ${lastError || "Limit kuota habis."}`
  };
}
async function handleCheckUpdate() {
  try {
    const res = await fetch("https://api.github.com/repos/lukman754/Mentari-Unpam/releases/latest", {
      headers: { "Accept": "application/vnd.github.v3+json" }
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
  }
  return { success: false };
}
