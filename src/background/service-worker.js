/**
 * Mentari Mod Modern Edition - Background Service Worker
 * Manifest V3 background hub untuk isolasi API calls, verifikasi API Key, dan auto-update.
 */

import { ACTIVE_FREE_MODELS, VALID_FREE_MODEL_IDS, DEFAULT_FREE_MODEL } from '../utils/models.js';

const GEMINI_MODELS_DEFAULT = ACTIVE_FREE_MODELS;
const ACTIVE_FREE_MODEL_IDS = VALID_FREE_MODEL_IDS;

// Inisialisasi default & migrasi model saat install / update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Service Worker] Mentari Mod Modern Edition terpasang:', details.reason);

  const current = await chrome.storage.local.get(['gemini_model', 'available_models']);
  const nextModel = ACTIVE_FREE_MODEL_IDS.includes(current.gemini_model)
    ? current.gemini_model
    : DEFAULT_FREE_MODEL;

  await chrome.storage.local.set({
    gemini_model: nextModel,
    available_models: GEMINI_MODELS_DEFAULT
  });
});

// Listener untuk pesan dari Content Script / Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;

  switch (action) {
    case 'validateGeminiApiKey':
      handleValidateApiKey(request.apiKey).then(sendResponse);
      return true; // async response

    case 'addGeminiApiKey':
      handleAddApiKey(request.apiKey).then(sendResponse);
      return true;

    case 'removeGeminiApiKey':
      handleRemoveApiKey(request.apiKey).then(sendResponse);
      return true;

    case 'getGeminiApiKeys':
      handleGetApiKeys().then(sendResponse);
      return true;

    case 'setActiveGeminiApiKey':
      handleSetActiveApiKey(request.apiKey).then(sendResponse);
      return true;

    case 'generateGeminiContent':
      handleGenerateContent(request).then(sendResponse);
      return true;

    case 'getAvailableModels':
      chrome.storage.local.get(['available_models', 'gemini_model'], (data) => {
        const storedModels = Array.isArray(data.available_models) ? data.available_models : [];
        const hasValidList = storedModels.some(m => m.id === 'gemini-4-hydrogen');
        const resolvedModel = ACTIVE_FREE_MODEL_IDS.includes(data.gemini_model)
          ? data.gemini_model
          : 'gemini-4-hydrogen';
        sendResponse({
          models: hasValidList ? storedModels : GEMINI_MODELS_DEFAULT,
          activeModel: resolvedModel
        });
      });
      return true;

    case 'getModelTelemetry':
      handleGetModelTelemetry().then(sendResponse);
      return true;

    case 'checkModelsHealth':
      handleCheckModelsHealth().then(sendResponse);
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
      const store = await chrome.storage.local.get(['geminiApiKeys', 'geminiApiKey']);
      let keys = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
      if (store.geminiApiKey && !keys.includes(store.geminiApiKey)) {
        keys.unshift(store.geminiApiKey);
      }
      if (!keys.includes(cleanKey)) {
        keys.push(cleanKey);
      }
      // Pertahankan API Key utama awal user agar penambahan key baru tidak menimpa setting default
      const primaryKey = store.geminiApiKey || cleanKey;
      await chrome.storage.local.set({
        geminiApiKey: primaryKey,
        geminiApiKeys: keys
      });
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
 * Menambahkan API Key baru ke pool
 */
async function handleAddApiKey(apiKey) {
  return handleValidateApiKey(apiKey);
}

/**
 * Menghapus API Key dari pool
 */
async function handleRemoveApiKey(targetKey) {
  if (!targetKey) return { success: false, message: 'Key tidak valid.' };
  const store = await chrome.storage.local.get(['geminiApiKeys', 'geminiApiKey']);
  let keys = Array.isArray(store.geminiApiKeys) ? store.geminiApiKeys : [];
  keys = keys.filter(k => k !== targetKey);

  const newActive = keys[0] || '';
  await chrome.storage.local.set({
    geminiApiKeys: keys,
    geminiApiKey: newActive
  });
  return { success: true, keys, activeKey: newActive };
}

/**
 * Menyetel API Key aktif (Primary Key)
 */
async function handleSetActiveApiKey(targetKey) {
  if (!targetKey) return { success: false, message: 'Key tidak valid.' };
  const store = await chrome.storage.local.get(['geminiApiKeys', 'geminiApiKey']);
  let keys = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
  if (!keys.includes(targetKey)) {
    keys.unshift(targetKey);
  } else {
    keys = [targetKey, ...keys.filter(k => k !== targetKey)];
  }
  await chrome.storage.local.set({
    geminiApiKey: targetKey,
    geminiApiKeys: keys
  });
  return { success: true, activeKey: targetKey, keys };
}

/**
 * Mengambil daftar seluruh API Key yang tersimpan
 */
async function handleGetApiKeys() {
  const store = await chrome.storage.local.get(['geminiApiKeys', 'geminiApiKey']);
  let keys = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
  if (store.geminiApiKey && !keys.includes(store.geminiApiKey)) {
    keys.unshift(store.geminiApiKey);
  }
  return {
    keys,
    activeKey: store.geminiApiKey || keys[0] || ''
  };
}

/**
 * Ekstraksi teks jawaban bersih dari respons Gemini (menyaring bagian thought internal)
 */
function extractResponseText(resJson) {
  const parts = resJson?.candidates?.[0]?.content?.parts || [];
  const answerParts = parts.filter(p => !p.thought && typeof p.text === 'string');
  if (answerParts.length > 0) {
    return answerParts.map(p => p.text).join('');
  }
  return parts[0]?.text || '';
}

function getPacificDateKey() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function loadAndPruneTelemetry() {
  const todayPt = getPacificDateKey();
  const { mentari_model_telemetry } = await chrome.storage.local.get(['mentari_model_telemetry']);
  const state = (mentari_model_telemetry && mentari_model_telemetry.dayKey === todayPt)
    ? mentari_model_telemetry
    : { dayKey: todayPt, models: {}, lastHealthCheckAt: 0 };

  const now = Date.now();
  const oneMinAgo = now - 60000;

  for (const id of ACTIVE_FREE_MODEL_IDS) {
    const entry = state.models[id] || {
      status: 'ready',
      requestsToday: 0,
      tokensToday: 0,
      recentTimestamps: [],
      cooldownUntil: 0,
      lastError: '',
      lastUsedAt: 0,
      endpointAvailable: null
    };
    entry.recentTimestamps = (entry.recentTimestamps || []).filter(ts => ts > oneMinAgo);
    if (entry.status === 'rate_limited' && entry.cooldownUntil > 0 && now >= entry.cooldownUntil) {
      entry.status = 'ready';
      entry.cooldownUntil = 0;
      entry.lastError = '';
    }
    state.models[id] = entry;
  }
  return state;
}

async function recordModelSuccess(modelId, usageMetadata) {
  try {
    const state = await loadAndPruneTelemetry();
    const targetId = ACTIVE_FREE_MODEL_IDS.includes(modelId) ? modelId : resolveUpstreamModel(modelId);
    const entry = state.models[targetId];
    if (!entry) return;

    const now = Date.now();
    entry.status = 'ready';
    entry.cooldownUntil = 0;
    entry.lastError = '';
    entry.lastUsedAt = now;
    entry.requestsToday = (entry.requestsToday || 0) + 1;
    entry.tokensToday = (entry.tokensToday || 0) + (usageMetadata?.totalTokenCount || 0);
    entry.recentTimestamps.push(now);
    entry.endpointAvailable = true;

    await chrome.storage.local.set({ mentari_model_telemetry: state });
  } catch {}
}

async function recordModelError(modelId, httpStatus, errData) {
  try {
    const state = await loadAndPruneTelemetry();
    const targetId = ACTIVE_FREE_MODEL_IDS.includes(modelId) ? modelId : resolveUpstreamModel(modelId);
    const entry = state.models[targetId];
    if (!entry) return;

    const now = Date.now();
    const errMsg = errData?.error?.message || `HTTP ${httpStatus}`;
    entry.lastUsedAt = now;
    entry.lastError = errMsg;

    if (httpStatus === 404) {
      entry.status = 'unavailable';
      entry.endpointAvailable = false;
    } else if (httpStatus === 429) {
      const details = Array.isArray(errData?.error?.details) ? errData.error.details : [];
      const retryDetail = details.find(d => String(d['@type'] || '').includes('RetryInfo'));
      const quotaDetail = details.find(d => String(d['@type'] || '').includes('QuotaFailure'));
      const quotaText = JSON.stringify(quotaDetail || '') + ' ' + errMsg;
      const isDaily = /perday|daily|rpd/i.test(quotaText);

      if (isDaily) {
        entry.status = 'daily_exhausted';
        entry.cooldownUntil = 0;
      } else {
        let retryMs = 60000;
        if (retryDetail?.retryDelay) {
          const secMatch = String(retryDetail.retryDelay).match(/([\d.]+)s/);
          if (secMatch) retryMs = Math.max(5000, Math.ceil(parseFloat(secMatch[1]) * 1000));
        }
        entry.status = 'rate_limited';
        entry.cooldownUntil = now + retryMs;
      }
    } else {
      entry.status = 'error';
    }

    await chrome.storage.local.set({ mentari_model_telemetry: state });
  } catch {}
}

async function handleGetModelTelemetry() {
  const [telemetry, store] = await Promise.all([
    loadAndPruneTelemetry(),
    chrome.storage.local.get(['gemini_model', 'geminiApiKey', 'geminiApiKeys'])
  ]);
  const activeModel = ACTIVE_FREE_MODEL_IDS.includes(store.gemini_model)
    ? store.gemini_model
    : 'gemini-4-hydrogen';
  const hasKey = Boolean(store.geminiApiKey || (Array.isArray(store.geminiApiKeys) && store.geminiApiKeys.length > 0));
  return {
    models: GEMINI_MODELS_DEFAULT,
    activeModel,
    hasKey,
    telemetry
  };
}

async function handleCheckModelsHealth() {
  const { geminiApiKey, geminiApiKeys } = await chrome.storage.local.get(['geminiApiKey', 'geminiApiKeys']);
  const checkKey = geminiApiKey || (Array.isArray(geminiApiKeys) ? geminiApiKeys[0] : '');
  if (!checkKey) {
    return { success: false, error: 'Belum ada API Key tersimpan.' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${checkKey}&pageSize=100`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const state = await loadAndPruneTelemetry();
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error?.message || `HTTP ${res.status}`, telemetry: state };
    }

    const data = await res.json();
    const liveIds = new Set((data.models || []).map(m => String(m.name || '').replace(/^models\//, '')));
    const now = Date.now();
    state.lastHealthCheckAt = now;

    for (const id of ACTIVE_FREE_MODEL_IDS) {
      const entry = state.models[id];
      const available = liveIds.has(id);
      entry.endpointAvailable = available;
      if (!available && entry.status === 'ready') {
        entry.status = 'unavailable';
        entry.lastError = 'Tidak tercantum di endpoint v1beta proyek ini';
      } else if (available && entry.status === 'unavailable') {
        entry.status = 'ready';
        entry.lastError = '';
      }
    }

    await chrome.storage.local.set({ mentari_model_telemetry: state });
    return { success: true, telemetry: state };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Resolusi model ID ke model endpoint resmi Google Gemini API Free Tier (v1beta)
 * Aktif & Free of charge per Google AI Studio (Nov 2026):
 * - gemini-4-hydrogen (Rekomendasi Utama Gen-4 Free Tier)
 * - gemini-3.8-flash, gemini-3.6-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3-flash-preview
 * Model deprecated/alias lama dipetakan secara transparan ke penerus aktifnya.
 */
function resolveUpstreamModel(modelId) {
  if (!modelId) return 'gemini-4-hydrogen';

  const activeFreeModels = [
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview'
  ];
  if (activeFreeModels.includes(modelId)) {
    return modelId;
  }

  // Migrasi transparan model deprecated / alias lama
  if (modelId === 'gemini-2.5-flash') return 'gemini-3.8-flash';
  if (modelId === 'gemini-2.5-flash-lite') return 'gemini-3.5-flash-lite';
  if (modelId === 'gemini-3-flash') return 'gemini-3-flash-preview';
  if (modelId === 'gemini-3.5-flash') return 'gemini-3.6-flash';
  if (modelId === 'gemini-3.7-flash') return 'gemini-3.8-flash';

  return 'gemini-4-hydrogen';
}

/**
 * Konfigurasi thinkingLevel resmi per model Gemini Free Tier:
 * - Gemini 4 Hydrogen & Gemini 3.8 Flash hanya mendukung minimal 'low' ('minimal' ditolak 400 API)
 * - Seri 3.6 / 3.5-Lite / 3.1-Lite / 3-Flash-Preview mendukung 'minimal'
 */
function getThinkingConfigForModel(modelId) {
  if (!modelId) return null;
  if (modelId.startsWith('gemini-4') || modelId === 'gemini-3.8-flash') {
    return { thinkingLevel: 'low' };
  }
  if (modelId.startsWith('gemini-3')) {
    return { thinkingLevel: 'minimal' };
  }
  return null;
}

function buildGeneratePayload({ prompt, systemInstruction, modelId, includeThinking = true }) {
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };

  if (includeThinking) {
    const thinkingCfg = getThinkingConfigForModel(modelId);
    if (thinkingCfg) {
      payload.generationConfig.thinkingConfig = thinkingCfg;
    }
  }

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }
  return payload;
}

async function invokeModelAcrossKeys({ modelId, prompt, systemInstruction, keyPool, primaryKey, timeoutMs = 18000 }) {
  let lastError = '';
  let includeThinking = true;

  for (let i = 0; i < keyPool.length; i++) {
    const currentKey = keyPool[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${currentKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGeneratePayload({ prompt, systemInstruction, modelId, includeThinking })),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok) {
        const resJson = await response.json();
        const textOut = extractResponseText(resJson);
        await recordModelSuccess(modelId, resJson.usageMetadata);

        if (currentKey !== primaryKey) {
          console.log(`[Service Worker] Sukses menggunakan API Key cadangan ke-${i + 1}. Mengubah primary key.`);
          await chrome.storage.local.set({ geminiApiKey: currentKey });
        }

        return {
          ok: true,
          text: textOut,
          keyIndex: i + 1
        };
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Error HTTP ${response.status}`;

      // Auto-heal jika parameter thinkingConfig ditolak oleh varian model tertentu (HTTP 400)
      if (response.status === 400 && includeThinking && /thinking/i.test(errMsg)) {
        console.warn(`[Service Worker] ${modelId} menolak thinkingConfig (${errMsg}). Mencoba ulang tanpa thinkingConfig...`);
        includeThinking = false;
        i--;
        continue;
      }

      await recordModelError(modelId, response.status, errData);
      lastError = errMsg;

      if (response.status === 404 || response.status === 400) {
        console.warn(`[Service Worker] Model ${modelId} gagal (${response.status}: ${errMsg}). Lanjut ke model fallback.`);
        break;
      }

      const isQuotaOrLimit = response.status === 429 || response.status === 403 ||
                            errMsg.toLowerCase().includes('quota') ||
                            errMsg.toLowerCase().includes('rate limit') ||
                            errMsg.toLowerCase().includes('resource has been exhausted');

      if (isQuotaOrLimit && i < keyPool.length - 1) {
        console.warn(`[Service Worker] API Key ke-${i + 1} terkena limit (${errMsg}). Beralih otomatis ke API Key cadangan berikutnya...`);
        lastError = `API Key #${i + 1} kena limit: ${errMsg}`;
        continue;
      }
      if (!isQuotaOrLimit) break;
    } catch (netErr) {
      clearTimeout(timer);
      const isAbort = netErr.name === 'AbortError';
      lastError = isAbort
        ? `Timeout ${Math.round(timeoutMs / 1000)}s: Model ${modelId} tidak merespon dalam ${Math.round(timeoutMs / 1000)} detik`
        : netErr.message;
      await recordModelError(modelId, isAbort ? 408 : 0, { error: { message: lastError } });
      console.warn(`[Service Worker] Percobaan ${modelId} (Key #${i + 1}) gagal: ${lastError}`);
      if (!isAbort && i < keyPool.length - 1) continue;
      if (isAbort) break;
    }
  }

  return { ok: false, lastError };
}

async function handleGenerateContent({ prompt, systemInstruction = '', model = null }) {
  const store = await chrome.storage.local.get(['geminiApiKey', 'geminiApiKeys', 'gemini_model']);
  const activeModel = model || store.gemini_model || DEFAULT_FREE_MODEL;
  const targetEngineModel = resolveUpstreamModel(activeModel);

  let keyPool = Array.isArray(store.geminiApiKeys) ? [...store.geminiApiKeys] : [];
  if (store.geminiApiKey && !keyPool.includes(store.geminiApiKey)) {
    keyPool.unshift(store.geminiApiKey);
  }
  if (store.geminiApiKey && keyPool.includes(store.geminiApiKey)) {
    keyPool = [store.geminiApiKey, ...keyPool.filter(k => k !== store.geminiApiKey)];
  }

  if (keyPool.length === 0) {
    return {
      success: false,
      error: 'Belum ada API Key Gemini yang disetel. Buka pengaturan untuk memasukkan API Key.'
    };
  }

  // 1. Jalankan pada model utama pilihan user (timeout 18 detik agar tahan lonjakan latensi Free Tier)
  const primaryAttempt = await invokeModelAcrossKeys({
    modelId: targetEngineModel,
    prompt,
    systemInstruction,
    keyPool,
    primaryKey: store.geminiApiKey,
    timeoutMs: 18000
  });

  if (primaryAttempt.ok) {
    return {
      success: true,
      text: primaryAttempt.text,
      model: activeModel,
      engine: targetEngineModel,
      keyIndex: primaryAttempt.keyIndex,
      totalKeys: keyPool.length
    };
  }

  // 2. Fallback berantai otomatis ke model Free Tier sehat lain jika model utama gagal/timeout
  const fallbackCandidates = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash']
    .filter(m => m !== targetEngineModel)
    .slice(0, 2);

  let fallbackLastError = '';
  for (const fbEngine of fallbackCandidates) {
    console.log(`[Service Worker] Mengaktifkan fallback ke ${fbEngine} setelah ${targetEngineModel} gagal (${primaryAttempt.lastError})...`);
    const fbAttempt = await invokeModelAcrossKeys({
      modelId: fbEngine,
      prompt,
      systemInstruction,
      keyPool,
      primaryKey: store.geminiApiKey,
      timeoutMs: 12000
    });

    if (fbAttempt.ok) {
      return {
        success: true,
        text: fbAttempt.text,
        model: `${activeModel} -> ${fbEngine} (Fallback)`,
        engine: fbEngine,
        keyIndex: fbAttempt.keyIndex,
        totalKeys: keyPool.length
      };
    }
    fallbackLastError = `${fbEngine}: ${fbAttempt.lastError}`;
  }

  const combinedErr = fallbackLastError
    ? `${primaryAttempt.lastError} | Fallback gagal (${fallbackLastError})`
    : (primaryAttempt.lastError || 'Limit kuota habis.');

  return {
    success: false,
    error: `Semua API Key (${keyPool.length} key) gagal: ${combinedErr}`
  };
}

/**
 * Cek pembaruan rilis resmi di GitHub
 */
async function handleCheckUpdate() {
  try {
    const res = await fetch('https://api.github.com/repos/Abubkr12/Mentari-Unpam/releases/latest', {
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
