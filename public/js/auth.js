/**
 * Kisan AI — Supabase Email OTP Authentication & Profile Subsystem
 * Production-minded authentication using official Supabase Client (@supabase/supabase-js).
 * Requirements: Email OTP only, 6-digit verification, auto-provisioning, session persistence & RLS.
 */

window.AuthModule = (function () {
  const state = {
    client: null,
    session: null,
    user: null,
    profile: null,
    isConfigured: false,
    supabaseUrl: null,
    supabasePublishableKey: null,
    pendingEmail: '',
    resendCooldownSec: 0,
    resendTimerInterval: null,
    isSendingOtp: false,
    isVerifyingOtp: false,
    authModalOpen: false
  };

  // -------------------------------------------------------------
  // 1. Supabase Client Lifecycle & Config
  // -------------------------------------------------------------
  async function init() {
    try {
      // 1. Fetch server-provided configuration (safe publishable key only)
      let config = { configured: false, supabaseUrl: null, supabasePublishableKey: null };
      try {
        const res = await fetch('/api/auth/config');
        if (res.ok) {
          config = await res.json();
        }
      } catch (e) {
        console.warn('[AUTH] Could not fetch /api/auth/config:', e);
      }

      // Check localStorage fallback for developer testing
      if (!config.configured) {
        try {
          const localSaved = localStorage.getItem('kisan_supabase_override');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (parsed.url && parsed.key) {
              config = {
                configured: true,
                supabaseUrl: parsed.url,
                supabasePublishableKey: parsed.key
              };
            }
          }
        } catch (e) {}
      }

      state.isConfigured = Boolean(config.configured && config.supabaseUrl && config.supabasePublishableKey);
      state.supabaseUrl = config.supabaseUrl;
      state.supabasePublishableKey = config.supabasePublishableKey;

      updateConfigStatusUI();

      if (state.isConfigured) {
        initSupabaseClient(config.supabaseUrl, config.supabasePublishableKey);
      } else {
        renderAuthView('unconfigured');
      }

      setupEventListeners();
      setupDigitBoxes();
    } catch (err) {
      console.error('[AUTH] Initialization error:', err);
    }
  }

  function initSupabaseClient(url, key) {
    if (!window.supabase) {
      console.error('[AUTH] Supabase SDK script not loaded in window.');
      return;
    }

    try {
      state.client = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });

      // Listen to Supabase auth state changes across the application
      state.client.auth.onAuthStateChange(async (event, session) => {
        state.session = session;
        state.user = session ? session.user : null;

        if (session && session.user) {
          await fetchUserProfile();
          renderAuthView('authenticated');
          updateHeaderAuthState(true);
        } else {
          state.profile = null;
          renderAuthView('email_input');
          updateHeaderAuthState(false);
        }
      });

      // Check for existing active session from localStorage
      state.client.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.warn('[AUTH] Session restoration note:', error.message);
        }
        if (session && session.user) {
          state.session = session;
          state.user = session.user;
          fetchUserProfile().then(() => {
            renderAuthView('authenticated');
            updateHeaderAuthState(true);
          });
        } else {
          renderAuthView('email_input');
          updateHeaderAuthState(false);
        }
      });
    } catch (err) {
      console.error('[AUTH] Failed creating Supabase client:', err);
    }
  }

  // -------------------------------------------------------------
  // 2. User Profile Retrieval & Sync
  // -------------------------------------------------------------
  async function fetchUserProfile() {
    if (!state.user || !state.client) return;

    try {
      // 1. Try fetching directly via Supabase client (Row Level Security protected)
      const { data, error } = await state.client
        .from('profiles')
        .select('*')
        .eq('id', state.user.id)
        .maybeSingle();

      if (!error && data) {
        state.profile = data;
        populateProfileForm(data);
        syncHeaderFarmerBadge(data);
        return;
      }

      // 2. Fallback to server-validated API endpoint
      if (state.session && state.session.access_token) {
        const res = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${state.session.access_token}`
          }
        });
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.success && apiData.profile) {
            state.profile = apiData.profile;
            populateProfileForm(apiData.profile);
            syncHeaderFarmerBadge(apiData.profile);
          }
        }
      }
    } catch (e) {
      console.warn('[AUTH] Profile fetch warning:', e);
    }
  }

  function syncHeaderFarmerBadge(profile) {
    const name = (profile && profile.full_name) ? profile.full_name : (state.user?.email || 'Farmer');
    const headerFarmerPill = document.getElementById('header-farmer-pill');
    if (headerFarmerPill) {
      headerFarmerPill.classList.remove('hidden');
      headerFarmerPill.textContent = `👨‍🌾 ${name}`;
    }
    // Update local profile mirror for chatbot module compatibility
    try {
      localStorage.setItem('kisan_ai_farmer_profile', JSON.stringify({
        name: profile?.full_name || name,
        email: state.user?.email,
        phone: profile?.phone || '',
        location: profile?.location || 'Punjab',
        crop: profile?.primary_crop || 'Wheat'
      }));
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // 3. Email OTP Flow: Send & Verify
  // -------------------------------------------------------------
  async function sendEmailOtp(targetEmail, customFullName) {
    const email = (targetEmail || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAuthError('Please enter a valid email address (e.g., farmer@example.com).');
      return;
    }

    if (!state.client) {
      showAuthError('Supabase is not configured yet. Please enter your Supabase Project URL & Publishable Key.');
      openSupabaseSettingsModal();
      return;
    }

    clearAuthMessages();
    setSendingState(true);

    try {
      state.pendingEmail = email;

      const { data, error } = await state.client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Supports both new registration and returning login
          data: customFullName ? { full_name: customFullName.trim() } : {}
        }
      });

      if (error) {
        throw error;
      }

      // Success: Advance to 6-digit OTP verification view
      renderAuthView('otp_verify');
      startResendCooldown(60);
      showAuthSuccess(`A 6-digit verification code has been sent to ${email}. Please check your inbox.`);
      window.KisanApp?.showToast('OTP Dispatched', `6-digit security code sent to ${email}.`, 'success');

      // Auto-focus first digit box
      setTimeout(() => {
        const firstBox = document.getElementById('auth-otp-0');
        if (firstBox) firstBox.focus();
      }, 100);

    } catch (err) {
      console.error('[AUTH] signInWithOtp error:', err);
      let msg = err.message || 'Failed to send OTP email.';
      if (msg.includes('rate limit')) {
        msg = 'Email rate limit reached. Please wait a minute before requesting another code.';
      }
      showAuthError(msg);
    } finally {
      setSendingState(false);
    }
  }

  async function verifyEmailOtp(otpCode) {
    const code = (otpCode || getEnteredOtpCode()).trim();
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      showAuthError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!state.pendingEmail) {
      showAuthError('No pending email found. Please enter your email again.');
      renderAuthView('email_input');
      return;
    }

    clearAuthMessages();
    setVerifyingState(true);

    try {
      const { data, error } = await state.client.auth.verifyOtp({
        email: state.pendingEmail,
        token: code,
        type: 'email'
      });

      if (error) {
        throw error;
      }

      if (data && data.session) {
        state.session = data.session;
        state.user = data.user;

        // Auto-provision or update initial profile record
        await fetchUserProfile();

        renderAuthView('authenticated');
        updateHeaderAuthState(true);

        // If auth modal was open, close it
        closeAuthModal();

        window.KisanApp?.showToast('Authentication Successful', `Welcome, ${data.user.email}!`, 'success');
      } else {
        throw new Error('Verification completed but no active session was returned.');
      }

    } catch (err) {
      console.error('[AUTH] verifyOtp error:', err);
      let msg = err.message || 'Invalid or expired verification code.';
      if (msg.toLowerCase().includes('token has expired') || msg.toLowerCase().includes('expired')) {
        msg = 'The verification code has expired. Please click "Resend OTP" to receive a new code.';
      } else if (msg.toLowerCase().includes('invalid')) {
        msg = 'Incorrect 6-digit OTP code. Please verify the numbers in your email and try again.';
      }
      showAuthError(msg);

      // Highlight OTP boxes with red border
      document.querySelectorAll('.auth-otp-box').forEach(b => {
        b.classList.add('border-red-500');
        setTimeout(() => b.classList.remove('border-red-500'), 2500);
      });
    } finally {
      setVerifyingState(false);
    }
  }

  async function signOut() {
    if (!state.client) return;

    try {
      await state.client.auth.signOut();
      state.session = null;
      state.user = null;
      state.profile = null;
      state.pendingEmail = '';

      renderAuthView('email_input');
      updateHeaderAuthState(false);

      const headerFarmerPill = document.getElementById('header-farmer-pill');
      if (headerFarmerPill) headerFarmerPill.classList.add('hidden');

      window.KisanApp?.showToast('Signed Out', 'You have been logged out of Kisan AI.', 'info');
    } catch (err) {
      console.error('[AUTH] Sign out error:', err);
    }
  }

  // -------------------------------------------------------------
  // 4. Profile Updating via RLS or Server API
  // -------------------------------------------------------------
  async function saveProfile(formData) {
    if (!state.user) {
      showAuthError('You must be signed in to update your profile.');
      return;
    }

    try {
      const payload = {
        full_name: formData.fullName || '',
        phone: formData.phone || '',
        location: formData.location || '',
        primary_crop: formData.crop || '',
        landholding_acres: formData.acres ? parseFloat(formData.acres) : null
      };

      // 1. Save via Supabase client (Row Level Security protected)
      if (state.client) {
        const { data, error } = await state.client
          .from('profiles')
          .upsert({
            id: state.user.id,
            email: state.user.email,
            ...payload,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!error && data) {
          state.profile = data;
          syncHeaderFarmerBadge(data);
          window.KisanApp?.showToast('Profile Saved', 'Your farm profile has been updated.', 'success');
          return;
        }
      }

      // 2. Server API Fallback
      if (state.session?.access_token) {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.session.access_token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          state.profile = data.profile;
          syncHeaderFarmerBadge(data.profile);
          window.KisanApp?.showToast('Profile Saved', 'Your farm profile has been updated.', 'success');
        } else {
          throw new Error(data.error || 'Failed saving profile.');
        }
      }
    } catch (err) {
      console.error('[AUTH] Profile save error:', err);
      showAuthError('Could not save profile: ' + err.message);
    }
  }

  // -------------------------------------------------------------
  // 5. 6-Box OTP Input Auto-Advancing & Paste Engine
  // -------------------------------------------------------------
  function setupDigitBoxes() {
    const boxes = document.querySelectorAll('.auth-otp-box');
    boxes.forEach((box, idx) => {
      // Auto-advance to next input on digit
      box.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val.slice(0, 1);

        if (e.target.value && idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }

        // Auto-verify if all 6 digits entered
        if (idx === boxes.length - 1 && e.target.value) {
          const fullCode = getEnteredOtpCode();
          if (fullCode.length === 6) {
            verifyEmailOtp(fullCode);
          }
        }
      });

      // Backspace navigation
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (!box.value && idx > 0) {
            boxes[idx - 1].focus();
          }
        }
      });

      // 6-digit paste handler
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
        const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);

        if (digits.length > 0) {
          digits.split('').forEach((d, i) => {
            if (boxes[i]) boxes[i].value = d;
          });
          const focusIdx = Math.min(digits.length, 5);
          boxes[focusIdx].focus();

          if (digits.length === 6) {
            verifyEmailOtp(digits);
          }
        }
      });
    });
  }

  function getEnteredOtpCode() {
    const boxes = document.querySelectorAll('.auth-otp-box');
    let code = '';
    boxes.forEach(b => { code += (b.value || '').trim(); });
    return code;
  }

  function clearOtpBoxes() {
    document.querySelectorAll('.auth-otp-box').forEach(b => { b.value = ''; });
  }

  // -------------------------------------------------------------
  // 6. Resend Cooldown Countdown Timer
  // -------------------------------------------------------------
  function startResendCooldown(seconds = 60) {
    if (state.resendTimerInterval) {
      clearInterval(state.resendTimerInterval);
    }

    state.resendCooldownSec = seconds;
    updateResendBtnUI();

    state.resendTimerInterval = setInterval(() => {
      state.resendCooldownSec -= 1;
      updateResendBtnUI();

      if (state.resendCooldownSec <= 0) {
        clearInterval(state.resendTimerInterval);
        state.resendTimerInterval = null;
      }
    }, 1000);
  }

  function updateResendBtnUI() {
    const btns = [document.getElementById('auth-resend-btn'), document.getElementById('modal-auth-resend-btn')];
    btns.forEach(btn => {
      if (!btn) return;
      if (state.resendCooldownSec > 0) {
        btn.disabled = true;
        btn.textContent = `Resend OTP (${state.resendCooldownSec}s)`;
        btn.className = 'text-xs font-bold text-slate-400 cursor-not-allowed';
      } else {
        btn.disabled = false;
        btn.textContent = 'Resend OTP';
        btn.className = 'text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer';
      }
    });
  }

  // -------------------------------------------------------------
  // 7. UI Rendering & View Transitions
  // -------------------------------------------------------------
  function renderAuthView(viewName) {
    // Sync both Interface 4 Card and the Auth Modal
    const views = ['unconfigured', 'email_input', 'otp_verify', 'authenticated'];

    views.forEach(v => {
      const panelEl = document.getElementById(`auth-view-${v}`);
      const modalEl = document.getElementById(`modal-auth-view-${v}`);
      if (panelEl) {
        if (v === viewName) panelEl.classList.remove('hidden');
        else panelEl.classList.add('hidden');
      }
      if (modalEl) {
        if (v === viewName) modalEl.classList.remove('hidden');
        else modalEl.classList.add('hidden');
      }
    });

    if (viewName === 'otp_verify') {
      const targetLabels = [document.getElementById('auth-otp-email-label'), document.getElementById('modal-auth-otp-email-label')];
      targetLabels.forEach(lbl => {
        if (lbl) lbl.textContent = state.pendingEmail;
      });
      clearOtpBoxes();
    }
  }

  function updateHeaderAuthState(isLoggedIn) {
    const loginBtn = document.getElementById('header-auth-open-btn');
    const userBadge = document.getElementById('header-auth-user-badge');
    const userEmailSpan = document.getElementById('header-auth-email');

    if (isLoggedIn && state.user) {
      if (loginBtn) loginBtn.classList.add('hidden');
      if (userBadge) userBadge.classList.remove('hidden');
      if (userEmailSpan) {
        userEmailSpan.textContent = state.profile?.full_name || state.user.email;
      }
    } else {
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (userBadge) userBadge.classList.add('hidden');
    }
  }

  function updateConfigStatusUI() {
    const supabaseDot = document.getElementById('header-supabase-dot');
    const supabaseTag = document.getElementById('header-supabase-tag');
    const modalStatusText = document.getElementById('supabase-status-provider-text');
    const modalStatusBadge = document.getElementById('supabase-status-badge');
    const modalDot = document.getElementById('supabase-status-indicator-dot');

    if (state.isConfigured) {
      if (supabaseDot) supabaseDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (supabaseTag) supabaseTag.textContent = 'Active (Live)';
      if (modalStatusText) modalStatusText.textContent = `Connected: ${state.supabaseUrl}`;
      if (modalStatusBadge) {
        modalStatusBadge.textContent = 'Ready & Active';
        modalStatusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300';
      }
      if (modalDot) modalDot.className = 'w-3 h-3 rounded-full bg-emerald-500';
    } else {
      if (supabaseDot) supabaseDot.className = 'w-2 h-2 rounded-full bg-amber-500';
      if (supabaseTag) supabaseTag.textContent = 'Setup Needed';
      if (modalStatusText) modalStatusText.textContent = 'Supabase: Pending Configuration';
      if (modalStatusBadge) {
        modalStatusBadge.textContent = 'Setup Required';
        modalStatusBadge.className = 'px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300';
      }
      if (modalDot) modalDot.className = 'w-3 h-3 rounded-full bg-amber-500';
    }
  }

  function populateProfileForm(profile) {
    if (!profile) return;
    const nameInput = document.getElementById('profile-full-name');
    const phoneInput = document.getElementById('profile-phone');
    const locationInput = document.getElementById('profile-location');
    const cropInput = document.getElementById('profile-crop');
    const acresInput = document.getElementById('profile-acres');
    const emailDisplay = document.getElementById('profile-email-display');
    const uidDisplay = document.getElementById('profile-uid-display');

    if (nameInput) nameInput.value = profile.full_name || '';
    if (phoneInput) phoneInput.value = profile.phone || '';
    if (locationInput) locationInput.value = profile.location || '';
    if (cropInput) cropInput.value = profile.primary_crop || '';
    if (acresInput) acresInput.value = profile.landholding_acres || '';
    if (emailDisplay) emailDisplay.textContent = state.user?.email || profile.email;
    if (uidDisplay) uidDisplay.textContent = state.user?.id || profile.id;
  }

  function showAuthError(msg) {
    const errorContainers = [document.getElementById('auth-error-banner'), document.getElementById('modal-auth-error-banner')];
    errorContainers.forEach(c => {
      if (!c) return;
      c.textContent = msg;
      c.classList.remove('hidden');
    });
  }

  function showAuthSuccess(msg) {
    const successContainers = [document.getElementById('auth-success-banner'), document.getElementById('modal-auth-success-banner')];
    successContainers.forEach(c => {
      if (!c) return;
      c.textContent = msg;
      c.classList.remove('hidden');
    });
  }

  function clearAuthMessages() {
    [
      document.getElementById('auth-error-banner'),
      document.getElementById('modal-auth-error-banner'),
      document.getElementById('auth-success-banner'),
      document.getElementById('modal-auth-success-banner')
    ].forEach(el => {
      if (el) el.classList.add('hidden');
    });
  }

  function setSendingState(isLoading) {
    state.isSendingOtp = isLoading;
    const btns = [document.getElementById('auth-send-otp-btn'), document.getElementById('modal-auth-send-otp-btn')];
    btns.forEach(btn => {
      if (!btn) return;
      btn.disabled = isLoading;
      if (isLoading) {
        btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Sending 6-Digit OTP...`;
      } else {
        btn.innerHTML = `<span>✉️</span><span>Send 6-Digit Verification Code</span>`;
      }
    });
  }

  function setVerifyingState(isLoading) {
    state.isVerifyingOtp = isLoading;
    const btns = [document.getElementById('auth-verify-otp-btn'), document.getElementById('modal-auth-verify-otp-btn')];
    btns.forEach(btn => {
      if (!btn) return;
      btn.disabled = isLoading;
      if (isLoading) {
        btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Verifying Code...`;
      } else {
        btn.innerHTML = `<span>✓</span><span>Verify OTP &amp; Sign In</span>`;
      }
    });
  }

  // -------------------------------------------------------------
  // 8. Event Listeners & Modals
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Send OTP Submission (Card Form & Modal Form)
    const emailForm = document.getElementById('auth-email-form');
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email-input')?.value;
        const name = document.getElementById('auth-name-input')?.value;
        sendEmailOtp(email, name);
      });
    }

    const modalEmailForm = document.getElementById('modal-auth-email-form');
    if (modalEmailForm) {
      modalEmailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('modal-auth-email-input')?.value;
        const name = document.getElementById('modal-auth-name-input')?.value;
        sendEmailOtp(email, name);
      });
    }

    // Verify OTP Button (Card & Modal)
    document.getElementById('auth-verify-otp-btn')?.addEventListener('click', () => {
      verifyEmailOtp();
    });
    document.getElementById('modal-auth-verify-otp-btn')?.addEventListener('click', () => {
      verifyEmailOtp();
    });

    // Resend OTP Button (Card & Modal)
    document.getElementById('auth-resend-btn')?.addEventListener('click', () => {
      if (state.resendCooldownSec <= 0 && state.pendingEmail) {
        sendEmailOtp(state.pendingEmail);
      }
    });
    document.getElementById('modal-auth-resend-btn')?.addEventListener('click', () => {
      if (state.resendCooldownSec <= 0 && state.pendingEmail) {
        sendEmailOtp(state.pendingEmail);
      }
    });

    // Back to Email Button
    document.getElementById('auth-back-email-btn')?.addEventListener('click', () => {
      clearAuthMessages();
      renderAuthView('email_input');
    });
    document.getElementById('modal-auth-back-email-btn')?.addEventListener('click', () => {
      clearAuthMessages();
      renderAuthView('email_input');
    });

    // Logout Buttons
    document.getElementById('auth-logout-btn')?.addEventListener('click', signOut);
    document.getElementById('header-auth-logout-btn')?.addEventListener('click', signOut);

    // Profile Form Save
    document.getElementById('auth-profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = {
        fullName: document.getElementById('profile-full-name')?.value,
        phone: document.getElementById('profile-phone')?.value,
        location: document.getElementById('profile-location')?.value,
        crop: document.getElementById('profile-crop')?.value,
        acres: document.getElementById('profile-acres')?.value
      };
      saveProfile(formData);
    });

    // Header Trigger to Open Auth Modal
    document.getElementById('header-auth-open-btn')?.addEventListener('click', () => {
      openAuthModal();
    });

    // Auth Modal Close Buttons
    document.getElementById('close-auth-modal-x')?.addEventListener('click', closeAuthModal);
    document.getElementById('close-auth-modal-btn')?.addEventListener('click', closeAuthModal);

    // Open Supabase Settings Modal Trigger
    document.getElementById('open-supabase-settings-btn')?.addEventListener('click', () => {
      openSupabaseSettingsModal();
    });
    document.getElementById('auth-setup-trigger-btn')?.addEventListener('click', () => {
      openSupabaseSettingsModal();
    });

    // Supabase Settings Modal Close
    document.getElementById('close-supabase-modal-x')?.addEventListener('click', closeSupabaseSettingsModal);
    document.getElementById('close-supabase-modal-btn')?.addEventListener('click', closeSupabaseSettingsModal);

    // Save Supabase Configuration Form
    document.getElementById('save-supabase-config-btn')?.addEventListener('click', async () => {
      const urlInput = document.getElementById('supabase-url-input');
      const keyInput = document.getElementById('supabase-key-input');
      const saveBtn = document.getElementById('save-supabase-config-btn');

      const url = urlInput ? urlInput.value.trim() : '';
      const key = keyInput ? keyInput.value.trim() : '';

      if (!url || !key) {
        window.KisanApp?.showToast('Incomplete Credentials', 'Please provide both Project URL and Publishable Key.', 'warn');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>⏳</span><span>Verifying Connection...</span>`;

      try {
        const res = await fetch('/api/auth/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supabaseUrl: url, supabasePublishableKey: key })
        });

        const data = await res.json();
        if (data.success) {
          state.isConfigured = true;
          state.supabaseUrl = url;
          state.supabasePublishableKey = key;
          initSupabaseClient(url, key);
          updateConfigStatusUI();
          closeSupabaseSettingsModal();
          window.KisanApp?.showToast('Supabase Connected', 'Database & Email OTP authentication are live!', 'success');
        } else {
          throw new Error(data.message || 'Failed connecting to Supabase.');
        }
      } catch (err) {
        console.warn('Backend save issue, trying client direct initialization:', err.message);
        // Fallback: save to localStorage for client-side direct operation
        try {
          localStorage.setItem('kisan_supabase_override', JSON.stringify({ url, key }));
          state.isConfigured = true;
          state.supabaseUrl = url;
          state.supabasePublishableKey = key;
          initSupabaseClient(url, key);
          updateConfigStatusUI();
          closeSupabaseSettingsModal();
          window.KisanApp?.showToast('Supabase Connected (Client)', 'Supabase initialized in browser session.', 'success');
        } catch (localErr) {
          window.KisanApp?.showToast('Connection Error', err.message, 'warn');
        }
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>✓</span><span>Test &amp; Connect Supabase</span>`;
      }
    });
  }

  function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      state.authModalOpen = true;
      clearAuthMessages();
      if (!state.user) {
        renderAuthView('email_input');
      } else {
        renderAuthView('authenticated');
      }
    }
  }

  function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('hidden');
      state.authModalOpen = false;
    }
  }

  function openSupabaseSettingsModal() {
    const modal = document.getElementById('supabase-settings-modal');
    if (modal) {
      const urlInput = document.getElementById('supabase-url-input');
      const keyInput = document.getElementById('supabase-key-input');
      if (urlInput && state.supabaseUrl) urlInput.value = state.supabaseUrl;
      if (keyInput && state.supabasePublishableKey) keyInput.value = state.supabasePublishableKey;
      modal.classList.remove('hidden');
    }
  }

  function closeSupabaseSettingsModal() {
    const modal = document.getElementById('supabase-settings-modal');
    if (modal) modal.classList.add('hidden');
  }

  // Public API
  return {
    init,
    sendEmailOtp,
    verifyEmailOtp,
    signOut,
    saveProfile,
    openAuthModal,
    closeAuthModal,
    openSupabaseSettingsModal,
    getUser: () => state.user,
    getSession: () => state.session,
    getProfile: () => state.profile,
    isConfigured: () => state.isConfigured
  };
})();
