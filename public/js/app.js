/**
 * Kisan AI — Main Application Orchestrator
 * Coordinates Navigation, Multilingual Localization, Toast Notifications,
 * Global State, and Sub-Module Lifecycles.
 */

window.KisanApp = (function () {
  const state = {
    lang: 'hinglish',
    activeTab: 'temp'
  };

  const localizedStrings = {
    gurmukhi: {
      headerSubtitle: 'ਪੰਜਾਬ ਤੇ ਉੱਤਰੀ ਭਾਰਤ ਲਈ ਆਧੁਨਿਕ ਖੇਤੀਬਾੜੀ ਤਕਨਾਲੋਜੀ ਪਲੇਟਫਾਰਮ',
      navTemp: '1. ਤਾਪਮਾਨ ਤੇ ਮੌਸਮ',
      navScan: '2. ਫਸਲ ਸਕੈਨਰ',
      navSupport: '3. ਹੈਲਪਲਾਈਨ ਤੇ ਕਿਤਾਬਾਂ',
      navKisan: '4. ਕਿਸਾਨ AI ਤੇ ਰਜਿਸਟ੍ਰੇਸ਼ਨ',
      tempTitle: 'ਤਾਪਮਾਨ ਤੇ ਐਗਰੋ-ਕਲਾਈਮੇਟਿਕ ਨਿਗਰਾਨੀ',
      tempDesc: 'ਖੇਤ ਸੈਂਸਰ ਅਤੇ ਲਾਈਵ ਮੌਸਮ ਸਟੇਸ਼ਨ ਡਾਟਾ, ਸੁਚੇਤ ਚੇਤਾਵਨੀਆਂ ਤੇ SMS ਅਲਰਟ ਦੇ ਨਾਲ।',
      scanTitle: 'AI ਫਸਲ ਤੇ ਪੌਦਾ ਸਕੈਨਰ',
      scanDesc: 'ਫਸਲਾਂ, ਬੀਜਾਂ ਜਾਂ ਪੱਤਿਆਂ ਦੀ ਤਸਵੀਰ ਲਓ ਜਾਂ ਅਪਲੋਡ ਕਰੋ ਅਤੇ ਤੁਰੰਤ ਬਿਮਾਰੀ ਜਾਂਚ ਪ੍ਰਾਪਤ ਕਰੋ।',
      supportTitle: 'ਕਿਸਾਨ ਹੈਲਪਲਾਈਨਾਂ ਤੇ ਖੇਤੀ ਗਾਈਡਾਂ',
      supportDesc: 'ਮਾਹਰਾਂ ਨਾਲ ਇੱਕ-ਟੈਪ ਕਾਲਿੰਗ, ਤੁਰੰਤ SMS ਸਹਾਇਤਾ ਅਤੇ ਪ੍ਰਮਾਣਿਤ ਖੇਤੀਬਾੜੀ ਕਿਤਾਬਾਂ।',
      kisanTitle: 'ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਤੇ ਬਹੁ-ਭਾਸ਼ਾਈ ਵੌਇਸ AI',
      kisanDesc: 'ਸਰਵਰ-ਪ੍ਰਮਾਣਿਤ OTP ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਅਤੇ ਪੰਜਾਬੀ, ਹਿੰਦੀ ਜਾਂ ਹਿੰਗਲਿਸ਼ ਵਿੱਚ ਰੀਅਲ-ਟਾਈਮ ਆਵਾਜ਼ ਸਹਾਇਕ।'
    },
    hindi: {
      headerSubtitle: 'उत्तर भारत एवं पंजाब के किसानों हेतु आधुनिक कृषि-तकनीक प्लेटफॉर्म',
      navTemp: '1. तापमान व मौसम',
      navScan: '2. फसल स्कैनर',
      navSupport: '3. हेल्पलाइन व पुस्तकें',
      navKisan: '4. किसान AI व रजिस्ट्रेशन',
      tempTitle: 'तापमान एवं कृषि-जलवायु निगरानी',
      tempDesc: 'खेत IoT सेंसर एवं लाइव मौसम वेधशाला डेटा, सीमा चेतावनी एवं SMS अलर्ट सहित।',
      scanTitle: 'AI फसल एवं पौध स्कैनर',
      scanDesc: 'फसल, बीज या पत्तों की लाइव फोटो खींचें अथवा अपलोड करें और सटीक रोग निदान पाएं।',
      supportTitle: 'कृषि हेल्पलाइन एवं संदर्भ पुस्तकें',
      supportDesc: 'एक-स्पर्श हेल्पलाइन कॉल, आपातकालीन SMS सहायता तथा प्रमाणित कृषि मार्गदर्शिकाएं।',
      kisanTitle: 'किसान पंजीकरण एवं बहुभाषी वॉइस AI',
      kisanDesc: 'सर्वर-सत्यापित OTP पंजीकरण एवं हिन्दी, पंजाबी या हिंग्लिश में प्राकृतिक वॉइस असिस्टेंट।'
    },
    hinglish: {
      headerSubtitle: 'Modern Agri-Tech Intelligence Platform for North Indian Farmers',
      navTemp: '1. Temperature',
      navScan: '2. Crop Scanner',
      navSupport: '3. Helplines & Books',
      navKisan: '4. Kisan AI & Reg',
      tempTitle: 'Agro-Climatic Temperature Monitoring',
      tempDesc: 'Field IoT telemetry & live agromet weather tracking with automatic SMS alerts.',
      scanTitle: 'AI Crop & Plant Pathology Scanner',
      scanDesc: 'Scan crops, seed varieties, or foliage for instant disease diagnosis and verified PAU/ICAR remedies.',
      supportTitle: 'Agricultural Helplines & Knowledge Base',
      supportDesc: 'One-tap direct calling, verified farmer support desks, and digital agricultural manuals.',
      kisanTitle: 'Kisan Registration & Multilingual Voice AI',
      kisanDesc: 'Server-side OTP verification plus real-time AI conversing in Gurmukhi, Hindi, or Hinglish.'
    }
  };

  // Toast Notification System
  function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const styles = {
      info: 'bg-slate-900 text-white border-slate-700 shadow-xl',
      success: 'bg-emerald-800 text-white border-emerald-600 shadow-xl',
      warn: 'bg-amber-800 text-white border-amber-600 shadow-xl'
    };

    const icons = {
      info: 'ℹ️',
      success: '✓',
      warn: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast-slide-in pointer-events-auto rounded-2xl border p-4 transition-all duration-300 flex items-start gap-3 ${styles[type] || styles.info}`;
    toast.innerHTML = `
      <div class="text-base select-none shrink-0 mt-0.5">${icons[type] || '🌾'}</div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold leading-tight truncate">${title}</div>
        <div class="text-xs opacity-90 mt-0.5 leading-relaxed break-words">${message}</div>
      </div>
      <button type="button" class="shrink-0 text-white/60 hover:text-white text-xs font-bold px-1" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px) scale(0.96)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Language Localization Handler
  function setLanguage(langKey) {
    if (!localizedStrings[langKey]) return;
    state.lang = langKey;

    const s = localizedStrings[langKey];
    const headerSubtitle = document.getElementById('header-subtitle');
    const navTemp = document.getElementById('nav-label-temp');
    const navScan = document.getElementById('nav-label-scan');
    const navSupport = document.getElementById('nav-label-support');
    const navKisan = document.getElementById('nav-label-kisan');
    const tempTitle = document.getElementById('temp-title');
    const tempDesc = document.getElementById('temp-desc');
    const scanTitle = document.getElementById('scan-title');
    const scanDesc = document.getElementById('scan-desc');
    const supportTitle = document.getElementById('support-title');
    const supportDesc = document.getElementById('support-desc');
    const kisanTitle = document.getElementById('kisan-title');
    const kisanDesc = document.getElementById('kisan-desc');

    if (headerSubtitle) headerSubtitle.textContent = s.headerSubtitle;
    if (navTemp) navTemp.textContent = s.navTemp;
    if (navScan) navScan.textContent = s.navScan;
    if (navSupport) navSupport.textContent = s.navSupport;
    if (navKisan) navKisan.textContent = s.navKisan;
    if (tempTitle) tempTitle.textContent = s.tempTitle;
    if (tempDesc) tempDesc.textContent = s.tempDesc;
    if (scanTitle) scanTitle.textContent = s.scanTitle;
    if (scanDesc) scanDesc.textContent = s.scanDesc;
    if (supportTitle) supportTitle.textContent = s.supportTitle;
    if (supportDesc) supportDesc.textContent = s.supportDesc;
    if (kisanTitle) kisanTitle.textContent = s.kisanTitle;
    if (kisanDesc) kisanDesc.textContent = s.kisanDesc;

    // Toggle active language button state
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const isActive = btn.dataset.lang === langKey;
      if (isActive) {
        btn.className = 'lang-btn px-3 py-1 text-xs font-bold rounded-lg transition bg-white text-green-800 shadow-sm border border-slate-200';
      } else {
        btn.className = 'lang-btn px-3 py-1 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-slate-900';
      }
    });

    showToast('Language Updated', `Interface adapted to ${langKey === 'gurmukhi' ? 'ਪੰਜਾਬੀ (Gurmukhi)' : langKey === 'hindi' ? 'हिन्दी (Devanagari)' : 'Hinglish'}.`, 'info');
  }

  // Navigation Tab Switching
  function switchTab(tabId) {
    if (!['temp', 'scan', 'support', 'kisan'].includes(tabId)) return;
    state.activeTab = tabId;

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) activePanel.classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      if (isActive) {
        btn.classList.add('tab-active');
        btn.classList.remove('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('tab-active');
        btn.classList.add('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    history.replaceState(null, null, `#${tabId}`);
  }

  
  // -------------------------------------------------------------
  // AI Settings Modal & Provider Management Subsystem
  // -------------------------------------------------------------
  let selectedAiProvider = 'gemini';

  async function checkAiStatus() {
    try {
      const res = await fetch('/api/config/ai');
      if (!res.ok) return;
      const data = await res.json();
      
      const headerTag = document.getElementById('header-ai-model-tag');
      const headerDot = document.getElementById('header-ai-dot');
      const chatEngineName = document.getElementById('chat-ai-engine-name');
      const chatDot = document.getElementById('chat-ai-dot');
      const statusProviderText = document.getElementById('ai-status-provider-text');
      const statusDetailText = document.getElementById('ai-status-detail-text');
      const statusBadge = document.getElementById('ai-status-badge');
      const indicatorDot = document.getElementById('ai-status-indicator-dot');

      if (data.activeProvider === 'gemini') {
        if (headerTag) headerTag.textContent = 'Gemini 3.8 Flash';
        if (headerDot) headerDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        if (chatEngineName) chatEngineName.textContent = 'Google Gemini 3.8 Flash';
        if (statusProviderText) statusProviderText.textContent = 'Active Engine: Google Gemini 3.8 Flash';
        if (statusDetailText) statusDetailText.textContent = 'Connected via Gemini API Key';
        if (statusBadge) {
          statusBadge.textContent = 'Active (Gemini 3.8)';
          statusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300';
        }
        if (indicatorDot) indicatorDot.className = 'w-3 h-3 rounded-full bg-emerald-500';
      } else {
        if (headerTag) headerTag.textContent = 'Gemini 3.8 (Config Needed)';
        if (headerDot) headerDot.className = 'w-2 h-2 rounded-full bg-amber-500';
        if (chatEngineName) chatEngineName.textContent = 'Google Gemini 3.8';
        if (statusProviderText) statusProviderText.textContent = 'Google Gemini 3.8 Flash';
        if (statusDetailText) statusDetailText.textContent = 'Set GEMINI_API_KEY in environment variables';
        if (statusBadge) {
          statusBadge.textContent = 'Key Required';
          statusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300';
        }
        if (indicatorDot) indicatorDot.className = 'w-3 h-3 rounded-full bg-amber-500';
      }
    } catch (e) {
      console.warn('AI status check:', e);
    }
  }

  
  // -------------------------------------------------------------
  // SMS Gateway Configuration & Broadcast Subsystem
  // -------------------------------------------------------------
  let selectedSmsProvider = 'fast2sms';

  async function checkSmsStatus() {
    try {
      const res = await fetch('/api/config/sms');
      if (!res.ok) return;
      const data = await res.json();

      const headerTag = document.getElementById('header-sms-gateway-tag');
      const headerDot = document.getElementById('header-sms-dot');
      const statusProviderText = document.getElementById('sms-status-provider-text');
      const statusDetailText = document.getElementById('sms-status-detail-text');
      const statusBadge = document.getElementById('sms-status-badge');
      const indicatorDot = document.getElementById('sms-status-indicator-dot');

      if (data.activeProvider === 'fast2sms') {
        if (headerTag) headerTag.textContent = 'Fast2SMS Active';
        if (headerDot) headerDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        if (statusProviderText) statusProviderText.textContent = 'Active: Fast2SMS Cellular Gateway';
        if (statusDetailText) statusDetailText.textContent = `Connected: ${data.fast2SmsKeyMasked || 'API Key configured'}`;
        if (statusBadge) {
          statusBadge.textContent = 'Live Cellular';
          statusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300';
        }
        if (indicatorDot) indicatorDot.className = 'w-3 h-3 rounded-full bg-emerald-500';
      } else if (data.activeProvider === 'twilio') {
        if (headerTag) headerTag.textContent = 'Twilio Active';
        if (headerDot) headerDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        if (statusProviderText) statusProviderText.textContent = 'Active: Twilio Global Gateway';
        if (statusDetailText) statusDetailText.textContent = `Connected: ${data.twilioSidMasked || 'Twilio SID configured'}`;
        if (statusBadge) {
          statusBadge.textContent = 'Live Twilio';
          statusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300';
        }
        if (indicatorDot) indicatorDot.className = 'w-3 h-3 rounded-full bg-emerald-500';
      } else {
        if (headerTag) headerTag.textContent = 'Sandbox / Sim';
        if (headerDot) headerDot.className = 'w-2 h-2 rounded-full bg-blue-500';
        if (statusProviderText) statusProviderText.textContent = 'Active: Server Simulation Sandbox';
        if (statusDetailText) statusDetailText.textContent = 'OTPs & alerts logged securely in server console';
        if (statusBadge) {
          statusBadge.textContent = 'Sandbox Mode';
          statusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-300';
        }
        if (indicatorDot) indicatorDot.className = 'w-3 h-3 rounded-full bg-blue-500';
      }
    } catch (e) {
      console.warn('SMS status check:', e);
    }
  }

  // Automated Gateway SMS Dispatch from Alert Banner
  function setupAlertSmsDispatch() {
    const sendLiveAlertBtn = document.getElementById('send-live-gateway-alert-btn');
    if (!sendLiveAlertBtn) return;

    sendLiveAlertBtn.addEventListener('click', async () => {
      const farmer = window.ChatbotModule?.getFarmer();
      const phone = farmer?.phone || (document.getElementById('reg-phone')?.value) || '9876543210';
      const tempText = document.getElementById('temp-alert-text')?.textContent || 'Critical temperature threshold exceeded!';

      sendLiveAlertBtn.disabled = true;
      sendLiveAlertBtn.textContent = 'Dispatching...';

      try {
        const res = await fetch('/api/alerts/dispatch-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            alertText: `${tempText} at ${window.TelemetryModule?.getState()?.locationName || 'Punjab Farm'}. Immediate protective measures advised.`
          })
        });
        const data = await res.json();
        showToast('Alert Dispatched', data.message || `SMS alert sent to +91-${phone}.`, 'success');
      } catch (e) {
        showToast('SMS Dispatch Issue', 'Server log simulation recorded.', 'info');
      } finally {
        sendLiveAlertBtn.disabled = false;
        sendLiveAlertBtn.innerHTML = '<span>📡</span><span>Dispatch Gateway SMS</span>';
      }
    });
  }

  async function checkSystemHealth() {
    const pill = document.getElementById('system-health-pill');
    try {
      const res = await fetch('/api/weather/live');
      if (res.ok) {
        if (pill) {
          pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 inline-block pulse-indicator"></span><span class="text-[11px] font-semibold text-emerald-800">System Online</span>`;
          pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200';
        }
      } else {
        throw new Error('Non-200 response');
      }
    } catch (e) {
      if (pill) {
        pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span><span class="text-[11px] font-semibold text-amber-800">Standalone Mode</span>`;
        pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200';
      }
    }
  }

  function init() {
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && ['temp', 'scan', 'support', 'kisan'].includes(initialHash)) {
      switchTab(initialHash);
    } else {
      switchTab('temp');
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    window.AuthModule?.init();
    window.TelemetryModule?.init();
    window.ScannerModule?.init();
    window.SupportModule?.init();
    window.ChatbotModule?.init();

    checkSystemHealth();
    setupAlertSmsDispatch();
    checkSmsStatus();
    checkAiStatus();
  }

  return {
    init,
    showToast,
    switchTab,
    setLanguage,
    getState: () => ({ ...state })
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.KisanApp.init();
});
