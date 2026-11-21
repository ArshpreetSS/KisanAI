/**
 * Kisan AI — Centralized AI Model Discovery, Health Registry & Multi-Provider Failover Manager
 * 
 * Dynamically queries Google Gemini and OpenAI model list APIs to discover available models,
 * tracks real-time model health/cooldowns, and provides intelligent deadline-aware failover.
 */

const OpenAI = require('openai');

// In-memory discovery cache with 15-minute TTL
const discoveryCache = {
  gemini: {
    models: [],
    lastFetched: 0,
    ttlMs: 15 * 60 * 1000,
    fetching: null
  },
  openai: {
    models: [],
    lastFetched: 0,
    ttlMs: 15 * 60 * 1000,
    fetching: null
  }
};

// Model Health Registry: Map<string, HealthRecord>
// Key format: `${provider}:${modelId}`
const healthRegistry = new Map();

// Tracking last successful & failed invocations for diagnostics
const diagnosticsLog = {
  lastSuccess: null,
  lastFailure: null,
  totalRequests: 0,
  successfulRequests: 0,
  fallbackRequests: 0,
  failedRequests: 0
};

// Singleton OpenAI client cache
let cachedOpenAIClient = null;
let cachedOpenAIKey = null;

function getOpenAIClient(apiKey) {
  if (!apiKey) return null;
  if (!cachedOpenAIClient || cachedOpenAIKey !== apiKey) {
    cachedOpenAIClient = new OpenAI({ apiKey });
    cachedOpenAIKey = apiKey;
  }
  return cachedOpenAIClient;
}

// -----------------------------------------------------------------------------
// 1. DYNAMIC MODEL DISCOVERY
// -----------------------------------------------------------------------------

/**
 * Discovers models from Google's official Gemini API (v1beta/models)
 */
async function discoverGeminiModels(apiKey, forceRefresh = false) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return [];
  }
  const cleanKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
  const now = Date.now();

  if (!forceRefresh && discoveryCache.gemini.models.length > 0 && (now - discoveryCache.gemini.lastFetched < discoveryCache.gemini.ttlMs)) {
    return discoveryCache.gemini.models;
  }

  // Prevent duplicate concurrent discovery fetches
  if (discoveryCache.gemini.fetching) {
    return discoveryCache.gemini.fetching;
  }

  discoveryCache.gemini.fetching = (async () => {
    try {
      console.log('[AI DISCOVERY] Querying official Google Gemini model catalog...');
      const discovered = [];
      let pageToken = '';
      let pages = 0;

      do {
        pages++;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}&pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('DISCOVERY_TIMEOUT')), 10000);

        let res;
        try {
          res = await fetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn(`[AI DISCOVERY] Google model listing returned HTTP ${res.status}: ${errText.substring(0, 150)}`);
          break;
        }

        const data = await res.json();
        if (Array.isArray(data.models)) {
          for (const m of data.models) {
            // Must support generateContent for text/chat operations
            const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
            if (methods.includes('generateContent')) {
              // Strip leading 'models/' if present to normalize
              const cleanId = (m.name || '').replace(/^models\//, '');
              if (cleanId) {
                discovered.push({
                  id: cleanId,
                  rawName: m.name,
                  displayName: m.displayName || cleanId,
                  description: m.description || '',
                  inputTokenLimit: m.inputTokenLimit || 32768,
                  outputTokenLimit: m.outputTokenLimit || 2048,
                  methods,
                  supportsVision: true // All modern Gemini models with generateContent support multi-modal image parts
                });
              }
            }
          }
        }

        pageToken = data.nextPageToken || '';
      } while (pageToken && pages < 5);

      if (discovered.length > 0) {
        console.log(`[AI DISCOVERY] Discovered ${discovered.length} compatible Gemini models supporting generateContent.`);
        discoveryCache.gemini.models = discovered;
        discoveryCache.gemini.lastFetched = Date.now();
      } else if (discoveryCache.gemini.models.length === 0) {
        console.warn('[AI DISCOVERY] Google API returned 0 generateContent models. Initializing baseline Gemini candidate pool.');
        discoveryCache.gemini.models = [
          { id: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', methods: ['generateContent'], supportsVision: true },
          { id: 'gemini-3.6-flash', displayName: 'Gemini 3.6 Flash', methods: ['generateContent'], supportsVision: true },
          { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', methods: ['generateContent'], supportsVision: true }
        ];
        discoveryCache.gemini.lastFetched = Date.now();
      }
    } catch (err) {
      console.warn('[AI DISCOVERY] Error during Gemini dynamic discovery:', err.message);
      if (discoveryCache.gemini.models.length === 0) {
        discoveryCache.gemini.models = [
          { id: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', methods: ['generateContent'], supportsVision: true },
          { id: 'gemini-3.6-flash', displayName: 'Gemini 3.6 Flash', methods: ['generateContent'], supportsVision: true }
        ];
      }
    } finally {
      discoveryCache.gemini.fetching = null;
    }
    return discoveryCache.gemini.models;
  })();

  return discoveryCache.gemini.fetching;
}

/**
 * Discovers models from OpenAI's official models.list API
 */
async function discoverOpenAIModels(apiKey, forceRefresh = false) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return [];
  }
  const cleanKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
  const now = Date.now();

  if (!forceRefresh && discoveryCache.openai.models.length > 0 && (now - discoveryCache.openai.lastFetched < discoveryCache.openai.ttlMs)) {
    return discoveryCache.openai.models;
  }

  if (discoveryCache.openai.fetching) {
    return discoveryCache.openai.fetching;
  }

  discoveryCache.openai.fetching = (async () => {
    try {
      console.log('[AI DISCOVERY] Querying official OpenAI model catalog...');
      const client = getOpenAIClient(cleanKey);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('DISCOVERY_TIMEOUT')), 10000);

      let listRes;
      try {
        listRes = await client.models.list({ signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      const discovered = [];
      const nonChatPattern = /(embedding|whisper|tts|dall-e|moderation|babbage|davinci|curie|canary|realtime|audio|search)/i;
      const chatPattern = /(^gpt-|^o1|^o3|^chatgpt)/i;

      if (listRes && Array.isArray(listRes.data)) {
        for (const m of listRes.data) {
          const id = m.id || '';
          if (!nonChatPattern.test(id) && (chatPattern.test(id) || id.includes('gpt'))) {
            discovered.push({
              id,
              ownedBy: m.owned_by || 'openai',
              created: m.created || 0,
              supportsVision: id.includes('4o') || id.includes('4-turbo') || id.includes('4.5') || id.includes('vision')
            });
          }
        }
      }

      if (discovered.length > 0) {
        console.log(`[AI DISCOVERY] Discovered ${discovered.length} compatible OpenAI chat models.`);
        discoveryCache.openai.models = discovered;
        discoveryCache.openai.lastFetched = Date.now();
      } else if (discoveryCache.openai.models.length === 0) {
        console.warn('[AI DISCOVERY] OpenAI API returned 0 chat models. Initializing baseline OpenAI candidate pool.');
        discoveryCache.openai.models = [
          { id: 'gpt-6-sol', supportsVision: true },
          { id: 'gpt-4o-mini', supportsVision: true },
          { id: 'gpt-4o', supportsVision: true }
        ];
        discoveryCache.openai.lastFetched = Date.now();
      }
    } catch (err) {
      console.warn('[AI DISCOVERY] Error during OpenAI dynamic discovery:', err.message);
      if (discoveryCache.openai.models.length === 0) {
        discoveryCache.openai.models = [
          { id: 'gpt-6-sol', supportsVision: true },
          { id: 'gpt-4o-mini', supportsVision: true },
          { id: 'gpt-4o', supportsVision: true }
        ];
      }
    } finally {
      discoveryCache.openai.fetching = null;
    }
    return discoveryCache.openai.models;
  })();

  return discoveryCache.openai.fetching;
}

/**
 * Invalidate discovery cache for a provider (e.g. on 404 Model Not Found)
 */
function invalidateDiscovery(provider) {
  if (provider === 'gemini' || provider === 'all') {
    discoveryCache.gemini.lastFetched = 0;
    discoveryCache.gemini.models = [];
  }
  if (provider === 'openai' || provider === 'all') {
    discoveryCache.openai.lastFetched = 0;
    discoveryCache.openai.models = [];
  }
}

// -----------------------------------------------------------------------------
// 2. MODEL HEALTH & COOLDOWN REGISTRY
// -----------------------------------------------------------------------------

function getHealthKey(provider, modelId) {
  return `${provider}:${(modelId || '').trim().toLowerCase()}`;
}

function getModelHealth(provider, modelId) {
  const key = getHealthKey(provider, modelId);
  let record = healthRegistry.get(key);
  if (!record) {
    record = {
      provider,
      modelId,
      status: 'HEALTHY',
      consecutiveFailures: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      cooldownUntil: 0,
      lastError: null,
      lastCategory: null
    };
    healthRegistry.set(key, record);
  }

  // Automatic cooldown expiration check
  if (record.status === 'COOLDOWN' && Date.now() >= record.cooldownUntil) {
    record.status = 'HEALTHY';
    record.consecutiveFailures = 0;
  }
  // Automatic unsupported cooldown recovery (check again after 30 min)
  if (record.status === 'UNSUPPORTED' && Date.now() >= record.cooldownUntil) {
    record.status = 'HEALTHY';
    record.consecutiveFailures = 0;
  }

  return record;
}

function isModelHealthy(provider, modelId) {
  const record = getModelHealth(provider, modelId);
  return record.status === 'HEALTHY' || (record.cooldownUntil > 0 && Date.now() >= record.cooldownUntil);
}

function recordSuccess(provider, modelId, durationMs) {
  const record = getModelHealth(provider, modelId);
  record.status = 'HEALTHY';
  record.consecutiveFailures = 0;
  record.cooldownUntil = 0;
  record.lastSuccessTime = Date.now();
  record.totalSuccesses++;

  diagnosticsLog.lastSuccess = {
    provider,
    modelId,
    timestamp: new Date().toISOString(),
    durationMs
  };
  diagnosticsLog.successfulRequests++;
}

function recordFailure(provider, modelId, errorStatus, category, errorMsg, retryAfterHeader) {
  const record = getModelHealth(provider, modelId);
  record.consecutiveFailures++;
  record.totalFailures++;
  record.lastFailureTime = Date.now();
  record.lastError = errorMsg || `HTTP ${errorStatus}`;
  record.lastCategory = category;

  const statusNum = parseInt(errorStatus, 10);

  // 1. Permanent Model Not Found (404)
  if (statusNum === 404 || category === 'CATEGORY_MODEL_NOT_FOUND') {
    record.status = 'UNSUPPORTED';
    record.cooldownUntil = Date.now() + 30 * 60 * 1000; // 30 minute cooldown
    console.warn(`[MODEL HEALTH] Marked ${provider}:${modelId} as UNSUPPORTED (HTTP 404). Refreshing model discovery.`);
    invalidateDiscovery(provider);
  }
  // 2. Rate Limit (429)
  else if (statusNum === 429 || category === 'CATEGORY_RATE_LIMIT_EXCEEDED') {
    record.status = 'COOLDOWN';
    let waitSec = 60;
    if (retryAfterHeader) {
      const parsed = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsed) && parsed > 0) waitSec = Math.min(180, parsed);
    }
    record.cooldownUntil = Date.now() + (waitSec * 1000);
    console.warn(`[MODEL HEALTH] Marked ${provider}:${modelId} in COOLDOWN for ${waitSec}s due to rate limit (429).`);
  }
  // 3. Temporary Server Overload / Provider Outage (503 / 500 / 502 / 504 / Timeout)
  else if ([500, 502, 503, 504].includes(statusNum) || category === 'CATEGORY_TEMPORARY_PROVIDER_OUTAGE') {
    record.status = 'COOLDOWN';
    // Backoff starts at 20s, scales up to 90s on repeated failures
    const baseWait = Math.min(90000, 20000 * Math.pow(1.5, Math.max(0, record.consecutiveFailures - 1)));
    record.cooldownUntil = Date.now() + baseWait;
    console.warn(`[MODEL HEALTH] Marked ${provider}:${modelId} in COOLDOWN for ${Math.round(baseWait / 1000)}s due to temporary error (${statusNum || 'Timeout'}).`);
  }
  // 4. Other network / connection errors
  else {
    record.status = 'COOLDOWN';
    record.cooldownUntil = Date.now() + 15000; // 15 second brief pause
  }

  diagnosticsLog.lastFailure = {
    provider,
    modelId,
    status: statusNum,
    category,
    error: errorMsg,
    timestamp: new Date().toISOString()
  };
  diagnosticsLog.failedRequests++;
}

// -----------------------------------------------------------------------------
// 3. CANDIDATE MODEL SELECTION & PRIORITIZATION
// -----------------------------------------------------------------------------

/**
 * Builds an ordered, deduped array of eligible candidate models across configured providers
 */
async function getCandidateModels(options = {}) {
  const {
    task = 'chat', // 'chat' or 'vision'
    geminiKey,
    openAIKey,
    preferredGeminiModel,
    preferredOpenAIModel
  } = options;

  const candidates = [];

  // 1. Discover Gemini Models (Provider A)
  if (geminiKey) {
    const discoveredGemini = await discoverGeminiModels(geminiKey);
    const geminiCandidates = [];

    // Prioritize user-configured preferred model first
    const prefGemini = (preferredGeminiModel || process.env.GEMINI_PRIMARY_MODEL || '').trim().replace(/^models\//, '');
    if (prefGemini) {
      geminiCandidates.push({
        provider: 'gemini',
        modelId: prefGemini,
        priority: 100,
        supportsVision: true
      });
    }

    for (const m of discoveredGemini) {
      if (task === 'vision' && !m.supportsVision) continue;
      if (m.id === prefGemini) continue; // Already added as top priority

      let priority = 50;
      const lower = m.id.toLowerCase();
      // Tier scoring: Fast Flash models first, then Pro, then others
      if (lower.includes('3.8-flash')) priority = 90;
      else if (lower.includes('3.6-flash')) priority = 85;
      else if (lower.includes('2.5-flash')) priority = 80;
      else if (lower.includes('flash-lite')) priority = 78;
      else if (lower.includes('flash')) priority = 75;
      else if (lower.includes('pro')) priority = 60;

      geminiCandidates.push({
        provider: 'gemini',
        modelId: m.id,
        priority,
        supportsVision: m.supportsVision
      });
    }

    // Sort Gemini models: healthy models first by priority; if in cooldown, order by soonest recovery
    geminiCandidates.sort((a, b) => {
      const aHealthy = isModelHealthy('gemini', a.modelId);
      const bHealthy = isModelHealthy('gemini', b.modelId);
      if (aHealthy && !bHealthy) return -1;
      if (!aHealthy && bHealthy) return 1;
      if (aHealthy && bHealthy) return b.priority - a.priority;
      const aRec = getModelHealth('gemini', a.modelId);
      const bRec = getModelHealth('gemini', b.modelId);
      return aRec.cooldownUntil - bRec.cooldownUntil;
    });

    candidates.push(...geminiCandidates);
  }

  // 2. Discover OpenAI Models (Provider B)
  if (openAIKey) {
    const discoveredOpenAI = await discoverOpenAIModels(openAIKey);
    const openAICandidates = [];

    const prefOpenAI = (preferredOpenAIModel || process.env.OPENAI_FALLBACK_MODEL || process.env.OPENAI_MODEL || '').trim();
    if (prefOpenAI) {
      openAICandidates.push({
        provider: 'openai',
        modelId: prefOpenAI,
        priority: 100,
        supportsVision: true
      });
    }

    for (const m of discoveredOpenAI) {
      if (task === 'vision' && !m.supportsVision) continue;
      if (m.id === prefOpenAI) continue;

      let priority = 40;
      const lower = m.id.toLowerCase();
      if (lower.includes('6-sol')) priority = 95;
      else if (lower.includes('4o-mini')) priority = 88;
      else if (lower.includes('4o')) priority = 82;
      else if (lower.includes('4.5')) priority = 75;
      else if (lower.includes('4-turbo')) priority = 70;
      else if (lower.includes('o1-mini') || lower.includes('o3-mini')) priority = 65;
      else if (lower.includes('3.5-turbo')) priority = 50;

      openAICandidates.push({
        provider: 'openai',
        modelId: m.id,
        priority,
        supportsVision: m.supportsVision
      });
    }

    openAICandidates.sort((a, b) => {
      const aHealthy = isModelHealthy('openai', a.modelId);
      const bHealthy = isModelHealthy('openai', b.modelId);
      if (aHealthy && !bHealthy) return -1;
      if (!aHealthy && bHealthy) return 1;
      if (aHealthy && bHealthy) return b.priority - a.priority;
      const aRec = getModelHealth('openai', a.modelId);
      const bRec = getModelHealth('openai', b.modelId);
      return aRec.cooldownUntil - bRec.cooldownUntil;
    });

    candidates.push(...openAICandidates);
  }

  // Deduplicate candidates by provider:modelId
  const seen = new Set();
  const deduped = [];
  for (const c of candidates) {
    const key = `${c.provider}:${c.modelId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }

  return deduped;
}

// -----------------------------------------------------------------------------
// 4. PROVIDER EXECUTION ADAPTERS
// -----------------------------------------------------------------------------

/**
 * Execute request against Google Gemini generateContent endpoint
 */
async function executeGemini({ modelId, apiKey, systemInstruction, contents, timeoutMs = 12000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('PROVIDER_TIMEOUT')), timeoutMs);

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.35,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });

    const durationMs = Date.now() - startTime;
    if (!res.ok) {
      const retryAfter = res.headers.get('retry-after');
      const errText = await res.text().catch(() => '');
      let parsedMsg = errText;
      try {
        const j = JSON.parse(errText);
        if (j.error?.message) parsedMsg = j.error.message;
      } catch (e) {}

      const err = new Error(`[gemini:${modelId}] HTTP ${res.status}: ${parsedMsg}`);
      err.status = res.status;
      err.provider = 'gemini';
      err.modelId = modelId;
      err.retryAfter = retryAfter;
      err.durationMs = durationMs;
      throw err;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error(`[gemini:${modelId}] Empty response returned.`);
    }

    return {
      text: text.trim(),
      provider: 'gemini',
      model: modelId,
      source: `Google Gemini (${modelId})`,
      durationMs,
      usage: data.usageMetadata || null
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute request against OpenAI API (Responses API with Chat Completions fallback)
 */
async function executeOpenAI({ modelId, apiKey, systemInstruction, messages, timeoutMs = 15000 }) {
  const client = getOpenAIClient(apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('PROVIDER_TIMEOUT')), timeoutMs);

  const startTime = Date.now();
  try {
    let replyText = '';

    // Approach 1: Official OpenAI Responses API
    try {
      const resp = await client.responses.create({
        model: modelId,
        instructions: systemInstruction,
        input: messages
      }, {
        signal: controller.signal
      });

      replyText = resp.output_text;
      if (!replyText && resp.output && Array.isArray(resp.output)) {
        for (const item of resp.output) {
          if (item.type === 'message' && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (c.type === 'text' && c.text) {
                replyText = c.text;
                break;
              }
            }
          }
          if (replyText) break;
        }
      }
    } catch (respErr) {
      // Approach 2: Chat Completions fallback if model or account prefers standard chat endpoint
      const completionMessages = [
        { role: 'system', content: systemInstruction },
        ...messages
      ];
      const chatRes = await client.chat.completions.create({
        model: modelId,
        messages: completionMessages,
        temperature: 0.35,
        max_tokens: 1024
      }, {
        signal: controller.signal
      });
      replyText = chatRes.choices?.[0]?.message?.content || '';
    }

    const durationMs = Date.now() - startTime;
    if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
      throw new Error(`[openai:${modelId}] Empty response returned.`);
    }

    return {
      text: replyText.trim(),
      provider: 'openai',
      model: modelId,
      source: `OpenAI (${modelId})`,
      durationMs
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError' || err.message === 'PROVIDER_TIMEOUT';
    const status = err.status || (isTimeout ? 504 : 500);
    const wrapErr = new Error(`[openai:${modelId}] ${isTimeout ? 'Provider timeout' : err.message}`);
    wrapErr.status = status;
    wrapErr.provider = 'openai';
    wrapErr.modelId = modelId;
    wrapErr.durationMs = durationMs;
    throw wrapErr;
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------------
// 5. UNIFIED REQUEST DISPATCHER & DEADLINE-AWARE FAILOVER
// -----------------------------------------------------------------------------

/**
 * Dispatches an agricultural advisory query across discovered candidates with intelligent failover
 */
async function dispatchAgriculturalRequest(params) {
  const {
    userQuery,
    language,
    systemInstruction,
    history = [],
    geminiKey,
    openAIKey,
    preferredGeminiModel,
    preferredOpenAIModel,
    correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    overallTimeoutMs = 45000 // 45 seconds total serverless execution budget
  } = params;

  diagnosticsLog.totalRequests++;
  const requestStartTime = Date.now();
  const deadline = requestStartTime + overallTimeoutMs;

  // Build message formats for providers
  // For Gemini:
  const geminiContents = [];
  if (Array.isArray(history) && history.length > 0) {
    const validTurns = history.slice(-6).filter(t => t?.text && typeof t.text === 'string' && t.text.trim());
    for (const turn of validTurns) {
      geminiContents.push({
        role: turn.role === 'model' || turn.role === 'ai' || turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text.trim() }]
      });
    }
  }
  geminiContents.push({ role: 'user', parts: [{ text: userQuery }] });

  // For OpenAI:
  const openAIMessages = [];
  if (Array.isArray(history) && history.length > 0) {
    const validTurns = history.slice(-6).filter(t => t?.text && typeof t.text === 'string' && t.text.trim());
    for (const turn of validTurns) {
      openAIMessages.push({
        role: turn.role === 'model' || turn.role === 'ai' || turn.role === 'assistant' ? 'assistant' : 'user',
        content: turn.text.trim()
      });
    }
  }
  openAIMessages.push({ role: 'user', content: userQuery });

  // Get candidate models sorted by suitability & health
  const candidates = await getCandidateModels({
    task: 'chat',
    geminiKey,
    openAIKey,
    preferredGeminiModel,
    preferredOpenAIModel
  });

  if (candidates.length === 0) {
    const noCreds = !geminiKey && !openAIKey;
    const errorMsg = noCreds
      ? 'No AI provider credentials configured (GEMINI_API_KEY and OPENAI_API_KEY missing).'
      : 'No compatible AI models currently available across configured providers.';
    console.warn(`[AI DISPATCHER] [Req: ${correlationId}] ${errorMsg}`);

    const err = new Error(errorMsg);
    err.status = noCreds ? 401 : 503;
    err.category = noCreds ? 'CATEGORY_AUTHENTICATION_ERROR' : 'CATEGORY_NO_MODELS_AVAILABLE';
    err.correlationId = correlationId;
    throw err;
  }

  console.log(`[AI DISPATCHER] [Req: ${correlationId}] Candidate chain evaluated (${candidates.length} models):`,
    candidates.map(c => `${c.provider}:${c.modelId}`).join(' -> ')
  );

  let lastError = null;
  let attemptsCount = 0;
  let fallbackUsed = false;
  const attemptedTrail = [];

  const failedAuthProviders = new Set();

  for (const candidate of candidates) {
    // If a provider already failed authentication (401/403), skip all its other models immediately
    if (failedAuthProviders.has(candidate.provider)) {
      continue;
    }

    const timeRemaining = deadline - Date.now();
    // Safety guard: if less than 3.5s remain in serverless budget, stop to return clean JSON rather than Vercel 504 HTML
    if (timeRemaining < 3500) {
      console.warn(`[AI DISPATCHER] [Req: ${correlationId}] Request deadline budget expiring (${timeRemaining}ms remaining). Halting candidate loop.`);
      break;
    }

    // Dynamic per-attempt timeout bounded by remaining execution budget
    const attemptTimeout = Math.min(14000, Math.max(4500, Math.floor(timeRemaining * 0.65)));
    attemptsCount++;

    if (candidate.provider !== 'gemini') {
      fallbackUsed = true;
    }

    attemptedTrail.push(`${candidate.provider}:${candidate.modelId}`);
    console.log(`[AI DISPATCHER] [Req: ${correlationId}] Attempt ${attemptsCount} -> [${candidate.provider}] ${candidate.modelId} (allocated timeout: ${attemptTimeout}ms)`);

    try {
      let result;
      if (candidate.provider === 'gemini') {
        result = await module.exports.executeGemini({
          modelId: candidate.modelId,
          apiKey: geminiKey,
          systemInstruction,
          contents: geminiContents,
          timeoutMs: attemptTimeout
        });
      } else {
        result = await module.exports.executeOpenAI({
          modelId: candidate.modelId,
          apiKey: openAIKey,
          systemInstruction,
          messages: openAIMessages,
          timeoutMs: attemptTimeout
        });
      }

      // Record success in health registry
      recordSuccess(candidate.provider, candidate.modelId, result.durationMs);

      const totalDurationMs = Date.now() - requestStartTime;
      console.log(`[AI DISPATCHER] [Req: ${correlationId}] SUCCESS with [${candidate.provider}] ${candidate.modelId} in ${result.durationMs}ms (total: ${totalDurationMs}ms)`);

      if (fallbackUsed) {
        diagnosticsLog.fallbackRequests++;
      }

      return {
        success: true,
        reply: result.text,
        response: result.text,
        provider: candidate.provider,
        model: candidate.modelId,
        source: result.source,
        fallbackUsed,
        attemptsCount,
        attemptedTrail,
        correlationId,
        durationMs: totalDurationMs
      };
    } catch (err) {
      lastError = err;
      const status = err.status || 500;
      let category = 'CATEGORY_UNKNOWN_PROVIDER_ERROR';
      if (status === 404) category = 'CATEGORY_MODEL_NOT_FOUND';
      else if (status === 429) category = 'CATEGORY_RATE_LIMIT_EXCEEDED';
      else if (status === 401 || status === 403) category = 'CATEGORY_AUTHENTICATION_ERROR';
      else if (status === 400) category = 'CATEGORY_INVALID_REQUEST';
      else if ([500, 502, 503, 504].includes(status) || err.message.includes('timeout')) category = 'CATEGORY_TEMPORARY_PROVIDER_OUTAGE';

      recordFailure(candidate.provider, candidate.modelId, status, category, err.message, err.retryAfter);

      console.warn(`[AI DISPATCHER] [Req: ${correlationId}] [${candidate.provider}:${candidate.modelId}] FAILED (Status: ${status} | Category: ${category}): ${err.message}. Moving to next candidate...`);

      // If invalid API key / authentication error on this provider, skip any remaining models belonging to it
      if (status === 401 || status === 403) {
        console.warn(`[AI DISPATCHER] [Req: ${correlationId}] Authentication failed for ${candidate.provider}. Skipping all remaining ${candidate.provider} candidates.`);
        failedAuthProviders.add(candidate.provider);
      }
    }
  }

  // If we reach here, all attempted models failed
  const totalDurationMs = Date.now() - requestStartTime;
  console.error(`[AI DISPATCHER] [Req: ${correlationId}] ALL CANDIDATES FAILED after ${attemptsCount} attempts (${totalDurationMs}ms). Trail: ${attemptedTrail.join(' -> ')}`);

  const finalError = new Error(lastError?.message || 'All eligible AI models across Google Gemini and OpenAI failed to return a response.');
  finalError.status = 503;
  finalError.category = 'CATEGORY_ALL_PROVIDERS_UNAVAILABLE';
  finalError.correlationId = correlationId;
  finalError.attemptedTrail = attemptedTrail;
  finalError.durationMs = totalDurationMs;
  throw finalError;
}

// -----------------------------------------------------------------------------
// 6. ADMIN DIAGNOSTICS
// -----------------------------------------------------------------------------

function getDiagnosticsStatus(geminiKey, openAIKey) {
  const now = Date.now();
  const healthyModels = [];
  const cooldownModels = [];
  const unsupportedModels = [];

  for (const [key, record] of healthRegistry.entries()) {
    if (record.status === 'UNSUPPORTED') {
      unsupportedModels.push({
        provider: record.provider,
        modelId: record.modelId,
        consecutiveFailures: record.consecutiveFailures,
        lastError: record.lastError
      });
    } else if (record.status === 'COOLDOWN' && now < record.cooldownUntil) {
      cooldownModels.push({
        provider: record.provider,
        modelId: record.modelId,
        cooldownRemainingSeconds: Math.ceil((record.cooldownUntil - now) / 1000),
        lastError: record.lastError,
        consecutiveFailures: record.consecutiveFailures
      });
    } else {
      healthyModels.push({
        provider: record.provider,
        modelId: record.modelId,
        totalSuccesses: record.totalSuccesses
      });
    }
  }

  return {
    status: 'active',
    timestamp: new Date().toISOString(),
    credentials: {
      geminiConfigured: Boolean(geminiKey && geminiKey.trim() !== ''),
      openAIConfigured: Boolean(openAIKey && openAIKey.trim() !== '')
    },
    discovery: {
      gemini: {
        discoveredCount: discoveryCache.gemini.models.length,
        models: discoveryCache.gemini.models.map(m => m.id),
        cacheAgeSeconds: discoveryCache.gemini.lastFetched ? Math.round((now - discoveryCache.gemini.lastFetched) / 1000) : null
      },
      openai: {
        discoveredCount: discoveryCache.openai.models.length,
        models: discoveryCache.openai.models.map(m => m.id),
        cacheAgeSeconds: discoveryCache.openai.lastFetched ? Math.round((now - discoveryCache.openai.lastFetched) / 1000) : null
      }
    },
    health: {
      healthyCount: healthyModels.length,
      healthyModels,
      cooldownCount: cooldownModels.length,
      cooldownModels,
      unsupportedCount: unsupportedModels.length,
      unsupportedModels
    },
    metrics: {
      totalRequests: diagnosticsLog.totalRequests,
      successfulRequests: diagnosticsLog.successfulRequests,
      fallbackRequests: diagnosticsLog.fallbackRequests,
      failedRequests: diagnosticsLog.failedRequests,
      lastSuccess: diagnosticsLog.lastSuccess,
      lastFailure: diagnosticsLog.lastFailure
    }
  };
}

module.exports = {
  discoverGeminiModels,
  discoverOpenAIModels,
  invalidateDiscovery,
  getModelHealth,
  isModelHealthy,
  recordSuccess,
  recordFailure,
  getCandidateModels,
  executeGemini,
  executeOpenAI,
  dispatchAgriculturalRequest,
  getDiagnosticsStatus
};
