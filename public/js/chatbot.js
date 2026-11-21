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
    if (/[\u0A00-\u0A7F]/.test(text)) return 'gurmukhi';
    if (/[\u0900-\u097F]/.test(text)) return 'hindi';
    return 'hinglish';
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/^### (.*$)/gim, '<div class="font-extrabold text-slate-900 mt-2 mb-1">$1</div>')
      .replace(/^[•\-\*] (.*$)/gim, '<div class="flex items-start gap-1.5 my-0.5"><span class="text-emerald-700 font-bold shrink-0">•</span><span>$1</span></div>')
      .replace(/^([0-9]+)\. (.*$)/gim, '<div class="flex items-start gap-1.5 my-0.5"><span class="font-bold text-emerald-800 shrink-0 font-mono-numbers">$1.</span><span>$2</span></div>');
  }

  function renderChat() {
    const box = document.getElementById('chat-messages');
    if (!box) return;

    box.innerHTML = state.chatHistory.map((m, idx) => {
      const isUser = m.role === 'user';
      return `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}">
            ${m.langTag ? `<div class="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">${m.langTag}</div>` : ''}
            <div class="leading-relaxed whitespace-pre-line">${isUser ? m.text : formatMarkdown(m.text)}</div>
            ${!isUser && m.text !== 'Analyzing agricultural data & formulating response...' ? `
              <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-end">
                <button type="button" class="copy-chat-btn text-[10px] font-bold text-slate-500 hover:text-emerald-800 flex items-center gap-1 transition" data-idx="${idx}">
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

    box.scrollTop = box.scrollHeight;
  }

  function speakReply(text, lang) {
    if (!state.ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      if (lang === 'gurmukhi') utter.lang = 'pa-IN';
      else if (lang === 'hindi') utter.lang = 'hi-IN';
      else utter.lang = 'en-IN';
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS playback issue:', e);
    }
  }

  async function submitMessage(userText) {
    const clean = (userText || '').trim();
    if (!clean) return;

    const detectedLang = detectScript(clean);
    const langLabel = detectedLang === 'gurmukhi' ? 'ਪੰਜਾਬੀ (Gurmukhi)' : detectedLang === 'hindi' ? 'हिन्दी (Devanagari)' : 'Hinglish';

    state.chatHistory.push({ role: 'user', text: clean, langTag: langLabel });
    const pendingIdx = state.chatHistory.length;
    state.chatHistory.push({
      role: 'ai',
      text: 'Analyzing agricultural data & formulating response...',
      langTag: `Kisan AI • ${langLabel}`
    });
    renderChat();

    const telemetry = window.TelemetryModule?.getState() || {};
    const lastScan = window.ScannerModule?.getCurrentResult() || null;

    const requestContext = {
      temp: window.TelemetryModule?.formatTemp(telemetry.tempC || 24.5) || '24.5°C',
      humidity: `${telemetry.humidity || 58}%`,
      moisture: `${telemetry.moisture || 42}%`,
      farmerName: state.registeredFarmer?.name || 'Farmer',
      farmerCrop: state.registeredFarmer?.crop || 'Wheat',
      lastScan
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      const authToken = window.AuthModule?.getSession()?.access_token;
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: clean,
          language: detectedLang,
          context: requestContext
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      const reply = data.reply || 'Advisory formulated.';
      const sourceBadge = data.source ? `Kisan AI • ${data.source}` : `Kisan AI • ${langLabel}`;

      state.chatHistory[pendingIdx] = {
        role: 'ai',
        text: reply,
        langTag: sourceBadge
      };
      renderChat();
      speakReply(reply, detectedLang);
    } catch (err) {
      console.warn('Chat request error, using fallback:', err);
      const fallbackText = `Current field temperature is ${requestContext.temp} and soil moisture is ${requestContext.moisture}. For urgent assistance, please contact Kisan Call Centre 1800-180-1551 or KVK Fatehgarh Sahib (81465-70699).`;
      state.chatHistory[pendingIdx] = {
        role: 'ai',
        text: fallbackText,
        langTag: `Kisan AI • Offline Advisory`
      };
      renderChat();
      speakReply(fallbackText, detectedLang);
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
