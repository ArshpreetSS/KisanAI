/**
 * Kisan AI — Interface 4: Secure Kisan Registration & Multilingual Voice AI
 * Features 4-Box Auto-Advancing OTP Verification, Real-Time Audio Canvas Visualizer,
 * Multilingual Gemini AI Conversation & Native Speech Synthesis.
 */

window.ChatbotModule = (function () {
  const state = {
    registeredFarmer: null,
    ttsEnabled: true,
    isListening: false,
    isProcessingMessage: false,
    activeAbortController: null,
    activeRecognition: null,
    audioContext: null,
    analyserNode: null,
    micStream: null,
    meterRaf: null,
    chatHistory: [
      {
        role: 'ai',
        text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ / नमस्ते! I am Kisan AI, your agricultural intelligence advisor. You can speak or write in ਪੰਜਾਬੀ (Gurmukhi), हिन्दी (Devanagari), or Hinglish.',
        langTag: 'Kisan AI • Multilingual'
      }
    ]
  };

  function loadSavedFarmer() {
    try {
      const saved = localStorage.getItem('kisan_ai_farmer_profile');
      if (saved) {
        state.registeredFarmer = JSON.parse(saved);
        updateRegistrationBadge();
      }
    } catch (e) {
      console.warn('Failed reading farmer profile:', e);
    }
  }

  function updateRegistrationBadge() {
    const badge = document.getElementById('reg-status-badge');
    const headerFarmerPill = document.getElementById('header-farmer-pill');

    if (state.registeredFarmer) {
      const displayStr = `${state.registeredFarmer.name} (${state.registeredFarmer.location || 'Punjab'})`;
      if (badge) {
        badge.textContent = `✓ Verified: ${displayStr}`;
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      }
      if (headerFarmerPill) {
        headerFarmerPill.classList.remove('hidden');
        headerFarmerPill.textContent = `👨‍🌾 ${state.registeredFarmer.name}`;
      }
    } else {
      if (badge) {
        badge.textContent = 'Unregistered Profile';
        badge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300';
      }
      if (headerFarmerPill) headerFarmerPill.classList.add('hidden');
    }
  }

  // Setup 4-Box OTP auto-advance & paste handler
  function setupOtpBoxes() {
    const boxes = document.querySelectorAll('.otp-digit-box');
    boxes.forEach((box, idx) => {
      box.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length === 1 && idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      });

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
          boxes[idx - 1].focus();
        }
      });

      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (/^\d{4}$/.test(text)) {
          text.split('').forEach((digit, i) => {
            if (boxes[i]) boxes[i].value = digit;
          });
          boxes[3].focus();
        }
      });
    });
  }

  function getEnteredOtp() {
    const boxes = document.querySelectorAll('.otp-digit-box');
    let code = '';
    boxes.forEach(b => { code += b.value.trim(); });
    return code;
  }

  async function requestOtp() {
    const phoneInput = document.getElementById('reg-phone');
    const nameInput = document.getElementById('reg-name');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : 'Farmer';

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      window.KisanApp?.showToast('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).', 'warn');
      return;
    }

    const sendBtn = document.getElementById('send-otp-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
    }

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      const otpRow = document.getElementById('otp-row');
      if (otpRow) otpRow.classList.remove('hidden');

      // Focus first OTP box
      document.querySelector('.otp-digit-box')?.focus();

      window.KisanApp?.showToast('SMS Dispatched', data.message || `Verification code sent to +91-${phone}.`, 'success');

      let countdown = 45;
      const interval = setInterval(() => {
        countdown -= 1;
        if (sendBtn) sendBtn.textContent = `Resend (${countdown}s)`;
        if (countdown <= 0) {
          clearInterval(interval);
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Resend OTP';
          }
        }
      }, 1000);
    } catch (err) {
      window.KisanApp?.showToast('OTP Request Error', err.message || 'Could not send OTP.', 'warn');
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send OTP';
      }
    }
  }

  async function verifyAndRegister(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('reg-phone');
    const nameInput = document.getElementById('reg-name');
    const locInput = document.getElementById('reg-location');
    const cropInput = document.getElementById('reg-crop');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const otp = getEnteredOtp();

    if (!phone) {
      window.KisanApp?.showToast('Missing Number', 'Please enter your 10-digit mobile number.', 'warn');
      return;
    }

    if (!otp || otp.length !== 4) {
      window.KisanApp?.showToast('Incomplete OTP', 'Please enter the full 4-digit verification code.', 'warn');
      return;
    }

    const submitBtn = document.getElementById('reg-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying on Server...';
    }

    try {
      const profile = {
        name: nameInput ? nameInput.value.trim() : 'Farmer',
        location: locInput ? locInput.value.trim() : 'Fatehgarh Sahib',
        crop: cropInput ? cropInput.value.trim() : 'Wheat'
      };

      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, profile })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      state.registeredFarmer = data.farmer;
      localStorage.setItem('kisan_ai_farmer_profile', JSON.stringify(data.farmer));
      updateRegistrationBadge();

      window.KisanApp?.showToast('Profile Registered', `Welcome ${data.farmer.name}! Registration confirmed (ID: ${data.farmer.regId}).`, 'success');
    } catch (err) {
      window.KisanApp?.showToast('Verification Failed', err.message || 'Invalid OTP code.', 'warn');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify & Complete Registration';
      }
    }
  }

  // -------------------------------------------------------------
  // Chat & Real-Time Voice Waveform Subsystem
  // -------------------------------------------------------------
  function detectScript(text) {
    if (!text) return 'hinglish';
    // Gurmukhi script (ਪੰਜਾਬੀ)
    if (/[\u0A00-\u0A7F]/.test(text)) return 'gurmukhi';
    // Devanagari script (हिन्दी)
    if (/[\u0900-\u097F]/.test(text)) return 'hindi';

    const lower = text.toLowerCase();
    // Distinctive Punjabi Roman keywords
    if (/\b(kive|kiven|kinve|kehri|kehda|fasal|pani|paani|launa|bija|kadon|kado|kanak|jbona|narma|sarson|sarhon|mitti|tuhadi|mera|meri|vich|te|nu|chahida|chahidi|dasso|daso|thik|theek|karan|kara|laaye|laayiye|keeda|keede)\b/.test(lower)) {
      return 'gurmukhi';
    }

    // English detection
    if (/^(when|what|how|why|which|can|should|tell|is|are|do|does)\b/i.test(text.trim())) {
      return 'english';
    }

    return 'hinglish';
  }

  function cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/`{1,3}.*?`{1,3}/gs, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[•\-\*]/g, '')
      .replace(/\b(https?:\/\/[^\s]+)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/^### (.*$)/gim, '<div class="font-extrabold text-slate-900 mt-2 mb-1">$1</div>')
      .replace(/^[•\-\*] (.*$)/gim, '<div class="flex items-start gap-1.5 my-0.5"><span class="text-emerald-700 font-bold shrink-0">•</span><span>$1</span></div>')
      .replace(/^([0-9]+)\. (.*$)/gim, '<div class="flex items-start gap-1.5 my-0.5"><span class="font-bold text-emerald-800 shrink-0 font-mono-numbers">$1.</span><span>$2</span></div>');
  }

  function setInputEnabled(enabled) {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const micBtn = document.getElementById('mic-btn');
    if (input) {
      input.disabled = !enabled;
      if (enabled) input.focus();
    }
    if (sendBtn) {
      sendBtn.disabled = !enabled;
      sendBtn.innerHTML = enabled ? 'Send' : '<span class="inline-block animate-spin mr-1.5">⌛</span><span>Thinking...</span>';
      if (!enabled) {
        sendBtn.classList.add('opacity-75', 'cursor-not-allowed');
      } else {
        sendBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      }
    }
    if (micBtn) {
      micBtn.disabled = !enabled;
      if (!enabled) {
        micBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        micBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  function getLocalizedErrorMessage(lang, customMsg = '') {
    if (customMsg && typeof customMsg === 'string' && customMsg.trim()) {
      return customMsg.trim();
    }
    if (lang === 'gurmukhi') {
      return 'ਖਿਮਾ ਕਰਨਾ, ਏਆਈ ਸੇਵਾ ਇਸ ਵੇਲੇ ਵਿਅਸਤ ਹੈ (ਸਰਵਰ ਟ੍ਰੈਫਿਕ ਜਾਂ ਸਮਾਂ ਸਮਾਪਤ)। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ \'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।';
    }
    if (lang === 'hindi') {
      return 'क्षमा करें, एआई सेवा इस समय व्यस्त है या उत्तर देने में समय ले रही है। कृपया नीचे दिए गए "पुनः प्रयास करें" बटन पर क्लिक करें।';
    }
    return 'AI service is temporarily experiencing high traffic or took too long to respond. Please tap Retry below or ask again in a moment.';
  }

  function renderChat() {
    const box = document.getElementById('chat-messages');
    if (!box) return;

    box.innerHTML = state.chatHistory.map((m, idx) => {
      const isUser = m.role === 'user';
      if (m.isLoading) {
        return `
          <div class="flex justify-start items-start gap-2.5">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm shadow-2xs select-none bg-emerald-100 border border-emerald-300 text-emerald-950">
              🌾
            </div>
            <div class="max-w-[85%] rounded-2xl px-4 py-3 text-sm chat-bubble-ai border border-slate-200">
              <div class="flex items-center gap-2 py-1 text-slate-500">
                <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse [animation-delay:200ms]"></span>
                <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse [animation-delay:400ms]"></span>
                <span class="text-xs font-semibold text-emerald-800 ml-1">Kisan AI is analyzing with Gemini...</span>
              </div>
            </div>
          </div>
        `;
      }

      if (m.isError) {
        return `
          <div class="flex items-start gap-2.5">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm shadow-2xs select-none bg-amber-100 border border-amber-300 text-amber-950">
              ⚠️
            </div>
            <div class="max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm chat-bubble-ai border border-amber-200 bg-amber-50/50">
              ${m.langTag ? `<div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span><span>${m.langTag}</span></div>` : ''}
              <div class="leading-relaxed whitespace-pre-line text-slate-800">${formatMarkdown(m.text)}</div>
              <div class="mt-3 pt-2 border-t border-amber-200 flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  ${m.retryText ? `
                    <button type="button" class="retry-chat-btn px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95" data-query="${encodeURIComponent(m.retryText)}">
                      <span>🔄</span><span>Retry Question</span>
                    </button>
                    <button type="button" class="edit-query-btn px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-xs font-semibold transition flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95" data-query="${encodeURIComponent(m.retryText)}">
                      <span>✏️</span><span>Edit Question</span>
                    </button>
                  ` : ''}
                </div>
                <button type="button" class="copy-chat-btn text-[11px] font-bold text-slate-500 hover:text-emerald-800 flex items-center gap-1 transition px-2 py-0.5 rounded-lg hover:bg-slate-100" data-idx="${idx}">
                  <span>📋</span><span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm shadow-2xs select-none ${isUser ? 'bg-emerald-800 text-white' : 'bg-emerald-100 border border-emerald-300 text-emerald-950'}">
            ${isUser ? '👨‍🌾' : '🌾'}
          </div>
          <div class="max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}">
            ${m.langTag ? `<div class="text-[10px] font-extrabold uppercase tracking-wider ${isUser ? 'text-emerald-100' : 'text-emerald-800'} mb-1.5 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full ${isUser ? 'bg-emerald-300' : 'bg-emerald-500'} inline-block"></span><span>${m.langTag}</span></div>` : ''}
            <div class="leading-relaxed whitespace-pre-line">${isUser ? m.text : formatMarkdown(m.text)}</div>
            ${!isUser ? `
              <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span class="text-[10px] font-medium">${m.providerLabel || 'Google Gemini'}</span>
                <button type="button" class="copy-chat-btn text-[11px] font-bold text-slate-500 hover:text-emerald-800 flex items-center gap-1 transition px-2 py-0.5 rounded-lg hover:bg-slate-100" data-idx="${idx}">
                  <span>📋</span><span>Copy</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    box.querySelectorAll('.copy-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const msg = state.chatHistory[idx];
        if (msg && msg.text) {
          navigator.clipboard.writeText(msg.text).then(() => {
            window.KisanApp?.showToast('Copied to Clipboard', 'Advisory response copied.', 'success');
          }).catch(() => {});
        }
      });
    });

    box.querySelectorAll('.retry-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = decodeURIComponent(btn.dataset.query || '').trim();
        if (query) {
          submitMessage(query);
        }
      });
    });

    box.querySelectorAll('.edit-query-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = decodeURIComponent(btn.dataset.query || '').trim();
        const input = document.getElementById('chat-input');
        if (input && query) {
          input.value = query;
          input.focus();
          window.KisanApp?.showToast('Question Restored', 'Your question has been restored to the input box.', 'info');
        }
      });
    });

    box.scrollTop = box.scrollHeight;
  }

  function speakReply(text, lang) {
    if (!state.ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanVoiceText = cleanTextForSpeech(text);
      if (!cleanVoiceText) return;

      const utter = new SpeechSynthesisUtterance(cleanVoiceText);
      if (lang === 'gurmukhi') utter.lang = 'pa-IN';
      else if (lang === 'hindi') utter.lang = 'hi-IN';
      else utter.lang = 'en-IN';
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS playback issue:', e);
    }
  }

  async function submitMessage(userText) {
    const clean = (userText || '').trim();
    if (!clean) return;

    // Prevent duplicate simultaneous requests
    if (state.isProcessingMessage) return;
    state.isProcessingMessage = true;
    setInputEnabled(false);

    const detectedLang = detectScript(clean);
    const langLabel = detectedLang === 'gurmukhi' ? 'ਪੰਜਾਬੀ (Gurmukhi)' : detectedLang === 'hindi' ? 'हिन्दी (Devanagari)' : (detectedLang === 'english' ? 'English' : 'Hinglish');

    // Extract recent conversation history for multi-turn context (up to 6 turns)
    const conversationHistory = state.chatHistory
      .filter(m => m.text && !m.isLoading && !m.isError && m.text !== 'Analyzing agricultural data & formulating response...')
      .slice(-6)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

    state.chatHistory.push({ role: 'user', text: clean, langTag: langLabel });
    const pendingIdx = state.chatHistory.length;
    state.chatHistory.push({
      role: 'ai',
      isLoading: true,
      text: '',
      langTag: `Kisan AI • ${langLabel}`
    });
    renderChat();

    const telemetry = window.TelemetryModule?.getState() || {};
    const lastScan = window.ScannerModule?.getCurrentResult() || null;
    const hasRealTelemetry = Boolean(telemetry.tempC && telemetry.source !== 'mock');

    const requestContext = {
      hasRealTelemetry,
      temp: hasRealTelemetry ? window.TelemetryModule?.formatTemp(telemetry.tempC) : null,
      humidity: hasRealTelemetry && telemetry.humidity ? `${telemetry.humidity}%` : null,
      moisture: hasRealTelemetry && telemetry.moisture ? `${telemetry.moisture}%` : null,
      farmerName: state.registeredFarmer?.name || window.AuthModule?.getUser()?.user_metadata?.full_name || 'Farmer',
      farmerCrop: state.registeredFarmer?.crop || 'Wheat',
      location: state.registeredFarmer?.location || 'Punjab',
      lastScan
    };

    // Set up AbortController with 45-second timeout
    if (state.activeAbortController) {
      try { state.activeAbortController.abort(); } catch (e) {}
      state.activeAbortController = null;
    }
    const controller = new AbortController();
    state.activeAbortController = controller;
    const timeoutTimer = setTimeout(() => {
      controller.abort(new Error('REQUEST_TIMEOUT'));
    }, 45000);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const authToken = window.AuthModule?.getSession()?.access_token;
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: clean,
          language: detectedLang,
          context: requestContext,
          history: conversationHistory
        })
      });

      // Safely parse JSON even if proxy/gateway returned non-JSON HTML (e.g. 502/504)
      const rawText = await res.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        data = {
          error: true,
          status: res.status,
          message: `Server returned HTTP ${res.status}: ${rawText.substring(0, 150)}`
        };
      }

      if (!res.ok || data.error || (!data.reply && !data.response)) {
        const errorReply = data?.reply || data?.response || data?.message || getLocalizedErrorMessage(detectedLang);
        const errorSource = data?.source || 'AI Advisory Service Notice';
        state.chatHistory[pendingIdx] = {
          role: 'ai',
          isLoading: false,
          isError: true,
          retryText: clean,
          text: errorReply,
          langTag: `Kisan AI • ${errorSource}`
        };
        renderChat();
        return;
      }

      const reply = data.reply || data.response;
      const isFallback = data.provider === 'openai' || data.fallbackUsed || data.fallbackTriggered;
      const providerLabel = data.source || (isFallback ? `OpenAI (${data.model || 'Dynamic Fallback'})` : `Google Gemini (${data.model || 'Dynamic Active'})`);
      const sourceBadge = `Kisan AI • ${providerLabel}`;

      state.chatHistory[pendingIdx] = {
        role: 'ai',
        isLoading: false,
        isError: false,
        text: reply,
        provider: data.provider || (isFallback ? 'openai' : 'gemini'),
        providerLabel,
        langTag: sourceBadge
      };
      renderChat();
      speakReply(reply, detectedLang);
    } catch (err) {
      console.warn('Chat request error:', err);
      const isTimeout = err.name === 'AbortError' || err.message === 'REQUEST_TIMEOUT';
      const timeoutMsg = detectedLang === 'gurmukhi'
        ? 'ਬੇਨਤੀ ਦਾ ਸਮਾਂ ਸਮਾਪਤ ਹੋ ਗਿਆ ਹੈ (Timeout)। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ \'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
        : (detectedLang === 'hindi'
          ? 'अनुरोध का समय समाप्त हो गया (Timeout)। कृपया पुनः प्रयास करने के लिए नीचे क्लिक करें।'
          : 'Request timed out while connecting to Google Gemini. Tap Retry to send your question again.');

      const fallbackText = isTimeout ? timeoutMsg : getLocalizedErrorMessage(detectedLang, err.message);
      state.chatHistory[pendingIdx] = {
        role: 'ai',
        isLoading: false,
        isError: true,
        retryText: clean,
        text: fallbackText,
        langTag: isTimeout ? 'Kisan AI • Request Timeout (45s)' : 'Kisan AI • Network Notice'
      };
      renderChat();
    } finally {
      clearTimeout(timeoutTimer);
      if (state.activeAbortController === controller) {
        state.activeAbortController = null;
      }
      state.isProcessingMessage = false;
      setInputEnabled(true);

      // GUARANTEE: Never leave ANY message stuck with isLoading: true
      let needsRerender = false;
      state.chatHistory.forEach(m => {
        if (m && m.isLoading) {
          m.isLoading = false;
          if (!m.text) {
            m.text = getLocalizedErrorMessage(detectedLang);
            m.isError = true;
            m.retryText = clean;
          }
          needsRerender = true;
        }
      });
      if (needsRerender) {
        renderChat();
      }
    }
  }

  function checkAndExecuteVoiceCommand(text) {
    const lower = text.toLowerCase();
    if (/temperature|mausam|weather|तापमान|ਤਾਪਮਾਨ|ਟੈਂਪਰੇਚਰ|टेंपरेचर/.test(lower)) {
      if (/dikhao|kholo|show|open|देखें|ਦੇਖੋ/.test(lower)) {
        setTimeout(() => window.KisanApp?.switchTab('temp'), 600);
      }
    } else if (/scan|scanner|camera|स्कैन|ਸਕੈਨ/.test(lower)) {
      setTimeout(() => window.KisanApp?.switchTab('scan'), 600);
    } else if (/kvk|pau|helpline|book|guide|number|किताब|ਕਿਤਾਬ|ਨੰਬਰ|नंबर/.test(lower)) {
      if (/dikhao|kholo|call|show|open/.test(lower)) {
        setTimeout(() => window.KisanApp?.switchTab('support'), 600);
      }
    }
  }

  // Real-Time Canvas Audio Frequency Waveform Visualizer
  function setupAudioMeter() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        state.micStream = stream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        state.audioContext = new AudioContextClass();
        const source = state.audioContext.createMediaStreamSource(stream);
        state.analyserNode = state.audioContext.createAnalyser();
        state.analyserNode.fftSize = 64;
        source.connect(state.analyserNode);

        const canvas = document.getElementById('voice-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const bufferLength = state.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function drawWave() {
          if (!state.isListening || !state.analyserNode) return;
          state.meterRaf = requestAnimationFrame(drawWave);
          state.analyserNode.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / bufferLength) * 1.5;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#15803d');
            gradient.addColorStop(1, '#4ade80');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
          }
        }
        drawWave();
      })
      .catch(e => console.warn('Audio stream access denied:', e));
  }

  function startVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.KisanApp?.showToast('Voice Notice', 'Speech-to-text not supported natively in this browser. Please type your query.', 'warn');
      document.getElementById('chat-input')?.focus();
      return;
    }

    if (state.isListening) {
      stopVoiceRecording();
      return;
    }

    try {
      state.activeRecognition = new SpeechRecognition();
      state.activeRecognition.continuous = false;
      state.activeRecognition.interimResults = true;
      state.activeRecognition.lang = 'hi-IN';

      const statusBar = document.getElementById('voice-status-bar');
      const interimText = document.getElementById('voice-interim-text');
      const micBtn = document.getElementById('mic-btn');

      state.isListening = true;
      if (statusBar) statusBar.classList.remove('hidden');
      if (micBtn) {
        micBtn.classList.add('bg-red-500', 'text-white', 'pulse-indicator');
        micBtn.classList.remove('bg-slate-100', 'text-slate-700');
      }

      setupAudioMeter();

      state.activeRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (interimText) interimText.textContent = `"${transcript}"`;

        if (event.results[0].isFinal) {
          stopVoiceRecording();
          checkAndExecuteVoiceCommand(transcript);
          submitMessage(transcript);
          const input = document.getElementById('chat-input');
          if (input) input.value = '';
        }
      };

      state.activeRecognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        stopVoiceRecording();
      };

      state.activeRecognition.onend = () => {
        stopVoiceRecording();
      };

      state.activeRecognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start failed:', err);
      stopVoiceRecording();
    }
  }

  function stopVoiceRecording() {
    state.isListening = false;
    if (state.activeRecognition) {
      try { state.activeRecognition.stop(); } catch (e) {}
      state.activeRecognition = null;
    }

    if (state.micStream) {
      state.micStream.getTracks().forEach(t => t.stop());
      state.micStream = null;
    }
    if (state.meterRaf) {
      cancelAnimationFrame(state.meterRaf);
      state.meterRaf = null;
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close().catch(() => {});
      state.audioContext = null;
    }

    const statusBar = document.getElementById('voice-status-bar');
    const micBtn = document.getElementById('mic-btn');
    if (statusBar) statusBar.classList.add('hidden');
    if (micBtn) {
      micBtn.classList.remove('bg-red-500', 'text-white', 'pulse-indicator');
      micBtn.classList.add('bg-slate-100', 'text-slate-700');
    }
  }

  
  // Free Option 1: WhatsApp Delivery
  async function sendOtpViaWhatsApp() {
    const phoneInput = document.getElementById('reg-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '8360086631';
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      window.KisanApp?.showToast('Enter Mobile Number', 'Please enter a valid 10-digit mobile number.', 'warn');
      return;
    }

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: 'Farmer' })
      });
      const data = await res.json();

      const otpRow = document.getElementById('otp-row');
      if (otpRow) otpRow.classList.remove('hidden');
      document.querySelector('.otp-digit-box')?.focus();

      // Open WhatsApp direct message with prefilled OTP confirmation
      const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent('*🌾 KISAN AI — OTP VERIFICATION*\nYour verification code is being processed. Enter the 4-digit code in the app to complete farmer registration.')}`;
      window.open(waUrl, '_blank');

      window.KisanApp?.showToast('WhatsApp Triggered', 'Opening WhatsApp. Also logged to your secure server console.', 'success');
    } catch (e) {
      window.KisanApp?.showToast('Error', 'Could not initiate WhatsApp OTP', 'warn');
    }
  }

  // Free Option 2: Automated Spoken Voice Call IVR (Simulates an automated Kisan Call Centre Phone Call)
  async function callPhoneWithOtp() {
    const phoneInput = document.getElementById('reg-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '8360086631';
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      window.KisanApp?.showToast('Enter Mobile Number', 'Please enter a valid 10-digit mobile number.', 'warn');
      return;
    }

    const voiceBtn = document.getElementById('voice-call-otp-btn');
    if (voiceBtn) {
      voiceBtn.disabled = true;
      voiceBtn.textContent = '📞 Calling...';
    }

    try {
      // First ensure an OTP is created on the server
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: 'Farmer' })
      });
      const data = await res.json();

      const otpRow = document.getElementById('otp-row');
      if (otpRow) otpRow.classList.remove('hidden');
      document.querySelector('.otp-digit-box')?.focus();

      // Use Web Speech Synthesis to simulate automated phone call readout
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        // Fetch the generated OTP via server voice prompt endpoint or speak directly
        const callSpeech = new SpeechSynthesisUtterance(`Sat Sri Akal Kisan ji. Kisan AI Call Centre automated verification call. Please enter your 4-digit code. Check your server console or enter digits now.`);
        callSpeech.lang = 'en-IN';
        callSpeech.rate = 0.9;
        window.speechSynthesis.speak(callSpeech);
      }

      window.KisanApp?.showToast('IVR Voice Call Active', `Automated voice verification triggered for +91-${phone}.`, 'info');
    } catch (e) {
      window.KisanApp?.showToast('Voice Call Issue', e.message, 'warn');
    } finally {
      if (voiceBtn) {
        voiceBtn.disabled = false;
        voiceBtn.innerHTML = '<span>🔊</span><span>Voice Call IVR (Free)</span>';
      }
    }
  }

  function init() {
    loadSavedFarmer();
    setupOtpBoxes();
    renderChat();

    document.getElementById('send-otp-btn')?.addEventListener('click', requestOtp);
    document.getElementById('send-wa-otp-btn')?.addEventListener('click', sendOtpViaWhatsApp);
    document.getElementById('voice-call-otp-btn')?.addEventListener('click', callPhoneWithOtp);
    document.getElementById('kisan-reg-form')?.addEventListener('submit', verifyAndRegister);

    document.getElementById('mic-btn')?.addEventListener('click', startVoiceRecording);
    document.getElementById('voice-stop-btn')?.addEventListener('click', stopVoiceRecording);

    document.getElementById('chat-send-btn')?.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input && input.value.trim()) {
        const val = input.value.trim();
        input.value = '';
        checkAndExecuteVoiceCommand(val);
        submitMessage(val);
      }
    });

    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (val) {
          e.target.value = '';
          checkAndExecuteVoiceCommand(val);
          submitMessage(val);
        }
      }
    });

    document.querySelectorAll('.sample-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => submitMessage(btn.dataset.sample));
    });

    document.querySelectorAll('.voice-sim-cmd').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.vcmd;
        checkAndExecuteVoiceCommand(cmd);
        submitMessage(cmd);
      });
    });

    document.getElementById('tts-toggle-btn')?.addEventListener('click', (e) => {
      state.ttsEnabled = !state.ttsEnabled;
      const btn = e.currentTarget;
      if (state.ttsEnabled) {
        btn.innerHTML = `<span>🔊</span><span>Voice Out: ON</span>`;
        btn.classList.add('bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
        btn.classList.remove('bg-slate-50', 'text-slate-600');
        window.KisanApp?.showToast('Voice Output', 'Speech synthesis voice replies enabled.', 'info');
      } else {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        btn.innerHTML = `<span>🔇</span><span>Voice Out: OFF</span>`;
        btn.classList.remove('bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
        btn.classList.add('bg-slate-50', 'text-slate-600');
        window.KisanApp?.showToast('Voice Output', 'Speech synthesis muted.', 'info');
      }
    });
  }

  return {
    init,
    submitMessage,
    getFarmer: () => state.registeredFarmer
  };
})();
