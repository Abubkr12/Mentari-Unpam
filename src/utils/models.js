/**
 * Mentari Mod Modern Edition - Daftar Model Resmi Gemini API Free Tier (Aktif)
 * Sumber: https://aistudio.google.com/docs/models & https://aistudio.google.com/docs/pricing
 */

export const DEFAULT_FREE_MODEL = 'gemini-4-hydrogen';

export const THINKING_LEVEL_META = {
  minimal: { id: 'minimal', label: 'Minimal (Tercepat)', shortLabel: 'Minimal', timeoutMs: 18000 },
  low: { id: 'low', label: 'Low (Cepat & Hemat)', shortLabel: 'Low', timeoutMs: 18000 },
  medium: { id: 'medium', label: 'Medium (Seimbang)', shortLabel: 'Medium', timeoutMs: 26000 },
  high: { id: 'high', label: 'High (Mendalam / Lebih Lama)', shortLabel: 'High', timeoutMs: 36000 },
  xhigh: { id: 'xhigh', label: 'XHigh (Maksimal / Paling Lama)', shortLabel: 'XHigh', timeoutMs: 45000 }
};

export const ACTIVE_FREE_MODELS = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    label: 'Gemini 4 Hydrogen (Terbaru - Rekomendasi Free Tier)',
    desc: 'Generasi 4 terbaru gratis di AI Studio, konteks 1M token, akurasi & kecepatan tinggi',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultThinkingLevel: 'low'
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    label: 'Gemini 3.8 Flash (Flagship Gen-3)',
    desc: 'Flagship generasi 3 di Free Tier untuk penalaran kompleks',
    thinkingLevels: ['low', 'medium', 'high'],
    defaultThinkingLevel: 'low'
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    label: 'Gemini 3.6 Flash (Seimbang)',
    desc: 'Seimbang antara kecepatan respon dan pemahaman teks',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    defaultThinkingLevel: 'minimal'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    label: 'Gemini 3.5 Flash-Lite (Kuota Tinggi)',
    desc: 'Model ringan untuk eksekusi berulang dengan kuota harian tinggi',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    defaultThinkingLevel: 'minimal'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    label: 'Gemini 3.1 Flash-Lite (Ringan & Cepat)',
    desc: 'Latensi rendah dan hemat token di Free Tier',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    defaultThinkingLevel: 'minimal'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    label: 'Gemini 3 Flash Preview (Free Tier)',
    desc: 'Varian preview cepat yang tersedia gratis di AI Studio',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    defaultThinkingLevel: 'minimal'
  }
];

export const VALID_FREE_MODEL_IDS = ACTIVE_FREE_MODELS.map(m => m.id);

export function getModelMeta(modelId) {
  return ACTIVE_FREE_MODELS.find(m => m.id === modelId) || ACTIVE_FREE_MODELS[0];
}

export function getSupportedThinkingLevels(modelId) {
  return getModelMeta(modelId).thinkingLevels || ['low', 'medium', 'high'];
}

export function resolveThinkingLevelForModel(modelId, requestedLevel = null) {
  const meta = getModelMeta(modelId);
  const allowed = meta.thinkingLevels || ['low'];
  if (requestedLevel && allowed.includes(requestedLevel)) {
    return requestedLevel;
  }
  if (requestedLevel === 'minimal' && allowed.includes('low')) {
    return 'low';
  }
  if (requestedLevel === 'xhigh' && allowed.includes('high')) {
    return 'high';
  }
  return meta.defaultThinkingLevel || allowed[0];
}
