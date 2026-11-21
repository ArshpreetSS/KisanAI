/**
 * Kisan AI — Farmer Registration & Email OTP Authentication Subsystem
 * Production-minded authentication for farmers using Supabase Auth backend.
 * Features:
 * - 100% farmer-facing (zero developer/database configuration exposed)
 * - 6-digit email OTP verification with auto-focus & paste support
 * - Automatic session persistence across refreshes
 * - Farmer profile synchronization & Voice AI Assistant integration
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
    pendingDetails: null,
    resendCooldownSec: 0,
    resendTimerInterval: null,
    isSendingOtp: false,
    isVerifyingOtp: false,
    authModalOpen: false
  };

  // -------------------------------------------------------------
  // 1. Client Lifecycle & Initialization
  // -------------------------------------------------------------
  async function init() {
    try {
      // 1. Fetch backend configuration (Publishable/Anon key only)
      let config = { configured: false, supabaseUrl: null, supabasePublishableKey: null };
      try {
        const res = await fetch('/api/auth/config');
        if (res.ok) {
          config = await res.json();
        }
      } catch (e) {
        console.warn('[AUTH] Could not fetch /api/auth/config:', e);
      }

      state.isConfigured = Boolean(config.configured && config.supabaseUrl && config.supabasePublishableKey);
      state.supabaseUrl = config.supabaseUrl;
      state.supabasePublishableKey = config.supabasePublishableKey;

      if (state.isConfigured && window.supabase) {
        initSupabaseClient(config.supabaseUrl, config.supabasePublishableKey);
      } else {
        // Default to registration / login view for unauthenticated farmers
        renderAuthView('email_input');
        updateHeaderAuthState(false);
      }

      setupEventListeners();
      setupDigitBoxes();
    } catch (err) {
      console.error('[AUTH] Initialization error:', err);
      renderAuthView('email_input');
    }
  }

  function initSupabaseClient(url, key) {
    if (!window.supabase) {
      console.warn('[AUTH] Supabase SDK script not present on page.');
      renderAuthView('email_input');
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

      // Restore active session from browser localStorage
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
      renderAuthView('email_input');
    }
  }

  // -------------------------------------------------------------
  // 2. Farmer Profile Retrieval & Sync
  // -------------------------------------------------------------
  async function fetchUserProfile() {
    if (!state.user) return;

    try {
      // 1. Direct query via Supabase client (RLS protected)
      if (state.client) {
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
      }

      // 2. Server API verification fallback
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
    const emailSpan = document.getElementById('header-auth-email');
    if (emailSpan) {
      emailSpan.textContent = name;
    }
    const headerFarmerPill = document.getElementById('header-farmer-pill');
    if (headerFarmerPill) {
      headerFarmerPill.classList.remove('hidden');
      headerFarmerPill.textContent = `👨‍🌾 ${name}`;
    }

    // Mirror to localStorage so Voice Assistant immediately incorporates the farmer context
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
  async function sendEmailOtp(targetEmail, farmerDetails = {}) {
    const email = (targetEmail || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAuthError('Please enter a valid email address (e.g., farmer@example.com).');
      return;
    }

    clearAuthMessages();
    setSendingState(true);

    try {
      state.pendingEmail = email;
      state.pendingDetails = farmerDetails;

      // 1. Dispatch OTP via backend endpoint (enforces rate-limiting and server credentials)
      let dispatchSucceeded = false;
      let errorResponseMsg = '';

      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            fullName: farmerDetails.fullName,
            phone: farmerDetails.phone,
            location: farmerDetails.location,
            primaryCrop: farmerDetails.crop
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          dispatchSucceeded = true;
        } else {
          errorResponseMsg = data.error || '';
        }
      } catch (beErr) {
        console.warn('[AUTH] Backend send-otp network note:', beErr.message);
      }

      // 2. Client-side SDK fallback if backend is offline or unconfigured
      if (!dispatchSucceeded && state.client) {
        const { error } = await state.client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: farmerDetails.fullName ? { full_name: farmerDetails.fullName.trim() } : {}
          }
        });
        if (!error) {
          dispatchSucceeded = true;
        } else {
          errorResponseMsg = error.message;
        }
      }

      if (!dispatchSucceeded) {
        // User-friendly error message without technical jargon
        let userMsg = 'Farmer verification service is temporarily unavailable. Please try again shortly or contact our toll-free farmer helpline 1800-180-1551.';
        if (errorResponseMsg) {
          const lower = errorResponseMsg.toLowerCase();
          if (lower.includes('rate limit')) {
            userMsg = 'Too many requests. Please wait a minute before requesting another verification code.';
          } else if (lower.includes('invalid') || lower.includes('valid email')) {
            userMsg = 'Please enter a valid email address.';
          } else if (lower.includes('temporarily unavailable') || lower.includes('helpline')) {
            userMsg = errorResponseMsg;
          }
        }
        showAuthError(userMsg);
        return;
      }

      // Success: Advance to 6-digit OTP verification view
      renderAuthView('otp_verify');
      startResendCooldown(60);
      showAuthSuccess(`A 6-digit verification code has been dispatched to ${email}. Please check your inbox.`);
      window.KisanApp?.showToast('Verification Code Sent', `6-digit security code dispatched to ${email}.`, 'success');

      // Focus first digit box
      setTimeout(() => {
        const firstBox = document.getElementById('auth-otp-0') || document.querySelector('#auth-modal .auth-otp-box');
        if (firstBox) firstBox.focus();
      }, 100);

    } catch (err) {
      console.error('[AUTH] sendEmailOtp error:', err);
      showAuthError('Unable to send verification code. Please check your internet connection and try again.');
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
      showAuthError('No pending verification email found. Please enter your email again.');
      renderAuthView('email_input');
      return;
    }

    clearAuthMessages();
    setVerifyingState(true);

    try {
      let verifiedSession = null;
      let verifiedUser = null;

      // 1. Verify via client SDK if active
      if (state.client) {
        const { data, error } = await state.client.auth.verifyOtp({
          email: state.pendingEmail,
          token: code,
          type: 'email'
        });

        if (!error && data && data.session) {
          verifiedSession = data.session;
          verifiedUser = data.user;
        } else if (error) {
          throw error;
        }
      }

      // 2. Server verification endpoint fallback / synchronization
      if (!verifiedSession) {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.pendingEmail,
            token: code
          })
        });

        const beData = await res.json();
        if (res.ok && beData.success) {
          verifiedSession = beData.session;
          verifiedUser = beData.user;
        } else {
          throw new Error(beData.error || 'Verification failed');
        }
      }

      if (verifiedSession && verifiedUser) {
        state.session = verifiedSession;
        state.user = verifiedUser;

        // Auto-save any profile details entered during registration
        if (state.pendingDetails) {
          await saveProfile(state.pendingDetails);
        } else {
          await fetchUserProfile();
        }

        renderAuthView('authenticated');
        updateHeaderAuthState(true);
        closeAuthModal();

        const farmerName = state.pendingDetails?.fullName || state.profile?.full_name || verifiedUser.email;
        window.KisanApp?.showToast('Registration Verified', `Welcome, ${farmerName}! Your farmer account is active.`, 'success');
      } else {
        throw new Error('Verification completed but no active session was established.');
      }

    } catch (err) {
      console.error('[AUTH] verifyOtp error:', err);
      let msg = err.message || 'Invalid or expired verification code.';
      const lower = msg.toLowerCase();
      if (lower.includes('expired')) {
        msg = 'The 6-digit verification code has expired. Please click "Resend OTP" to receive a fresh code.';
      } else if (lower.includes('invalid') || lower.includes('token') || lower.includes('incorrect')) {
        msg = 'Incorrect 6-digit verification code. Please check your email and enter the numbers again.';
      }
      showAuthError(msg);

      // Highlight OTP boxes with brief error indicator
      document.querySelectorAll('.auth-otp-box').forEach(b => {
        b.classList.add('border-red-500');
        setTimeout(() => b.classList.remove('border-red-500'), 2500);
      });
    } finally {
      setVerifyingState(false);
    }
  }

  async function signOut() {
    try {
      if (state.client) {
        await state.client.auth.signOut().catch(() => {});
      }
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});

      state.session = null;
      state.user = null;
      state.profile = null;
      state.pendingEmail = '';
      state.pendingDetails = null;

      try {
        localStorage.removeItem('kisan_ai_farmer_profile');
      } catch (e) {}

      renderAuthView('email_input');
      updateHeaderAuthState(false);

      const headerFarmerPill = document.getElementById('header-farmer-pill');
      if (headerFarmerPill) headerFarmerPill.classList.add('hidden');

      window.KisanApp?.showToast('Signed Out', 'You have been safely signed out.', 'info');
    } catch (err) {
      console.error('[AUTH] Sign out error:', err);
    }
  }

  // -------------------------------------------------------------
  // 4. Profile Management & Updating
  // -------------------------------------------------------------
  async function saveProfile(formData = {}) {
    if (!state.user && !state.session) return;

    try {
      const payload = {
        full_name: formData.fullName || formData.full_name || '',
        phone: formData.phone || '',
        location: formData.location || '',
        primary_crop: formData.crop || formData.primary_crop || '',
        landholding_acres: formData.acres ? parseFloat(formData.acres) : null
      };

      // 1. Direct Supabase Client upsert
      if (state.client && state.user) {
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
          populateProfileForm(data);
          return;
        }
      }

      // 2. Server API fallback
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
        if (data.success && data.profile) {
          state.profile = data.profile;
          syncHeaderFarmerBadge(data.profile);
          populateProfileForm(data.profile);
        }
      }
    } catch (err) {
      console.warn('[AUTH] Profile save note:', err.message);
    }
  }

  // -------------------------------------------------------------
  // 5. 6-Box OTP Input Auto-Advancing & Paste Engine
  // -------------------------------------------------------------
  function setupDigitBoxes() {
    const setupGroup = (selector) => {
      const boxes = document.querySelectorAll(selector);
      boxes.forEach((box, idx) => {
        // Auto-advance to next input on digit
        box.addEventListener('input', (e) => {
          const val = e.target.value.replace(/[^0-9]/g, '');
          e.target.value = val.slice(0, 1);

          if (e.target.value && idx < boxes.length - 1) {
            boxes[idx + 1].focus();
          }

          // Auto-verify when 6th digit is entered
          if (idx === boxes.length - 1 && e.target.value) {
            let fullCode = '';
            boxes.forEach(b => { fullCode += (b.value || '').trim(); });
            if (fullCode.length === 6) {
              verifyEmailOtp(fullCode);
            }
          }
        });

        // Backspace jumps to previous box
        box.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !box.value && idx > 0) {
            boxes[idx - 1].focus();
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
    };

    setupGroup('#auth-view-otp_verify .auth-otp-box');
    setupGroup('#modal-auth-view-otp_verify .auth-otp-box');
  }

  function getEnteredOtpCode() {
    // Check main card boxes first, then modal
    let boxes = document.querySelectorAll('#auth-view-otp_verify .auth-otp-box');
    if (!boxes.length || !boxes[0].value) {
      boxes = document.querySelectorAll('#modal-auth-view-otp_verify .auth-otp-box');
    }
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
  // 7. UI View Transitions & State Rendering
  // -------------------------------------------------------------
  function renderAuthView(viewName) {
    const views = ['email_input', 'otp_verify', 'authenticated'];

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

    if (isLoggedIn && (state.user || state.session)) {
      if (loginBtn) loginBtn.classList.add('hidden');
      if (userBadge) userBadge.classList.remove('hidden');
      if (userEmailSpan) {
        userEmailSpan.textContent = state.profile?.full_name || state.user?.email || 'Farmer';
      }
    } else {
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (userBadge) userBadge.classList.add('hidden');
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
    const nameBadge = document.getElementById('profile-name-badge');

    if (nameInput) nameInput.value = profile.full_name || '';
    if (phoneInput) phoneInput.value = profile.phone || '';
    if (locationInput) locationInput.value = profile.location || '';
    if (cropInput) cropInput.value = profile.primary_crop || '';
    if (acresInput) acresInput.value = profile.landholding_acres || '';
    if (emailDisplay) emailDisplay.textContent = state.user?.email || profile.email;
    if (nameBadge && profile.full_name) nameBadge.textContent = `👨‍🌾 ${profile.full_name}`;
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
        btn.innerHTML = `<span class="inline-block animate-spin mr-1.5">⏳</span><span>Sending Verification Code...</span>`;
      } else {
        btn.innerHTML = `<span>✉️</span><span>Send Verification Code</span>`;
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
        btn.innerHTML = `<span class="inline-block animate-spin mr-1.5">⏳</span><span>Verifying Code...</span>`;
      } else {
        btn.innerHTML = `<span>✓</span><span>Verify &amp; Enter Dashboard</span>`;
      }
    });
  }

  // -------------------------------------------------------------
  // 8. Event Listeners & Modals
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Farmer Registration / Login Form Submission (Card Form)
    const emailForm = document.getElementById('auth-email-form');
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('auth-name-input')?.value?.trim();
        const email = document.getElementById('auth-email-input')?.value?.trim();
        const phone = document.getElementById('auth-phone-input')?.value?.trim();
        const location = document.getElementById('auth-location-input')?.value?.trim();
        const crop = document.getElementById('auth-crop-input')?.value;

        sendEmailOtp(email, { fullName, phone, location, crop });
      });
    }

    // Modal Form Submission
    const modalEmailForm = document.getElementById('modal-auth-email-form');
    if (modalEmailForm) {
      modalEmailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('modal-auth-name-input')?.value?.trim();
        const email = document.getElementById('modal-auth-email-input')?.value?.trim();
        sendEmailOtp(email, { fullName });
      });
    }

    // Verify OTP Buttons
    document.getElementById('auth-verify-otp-btn')?.addEventListener('click', () => {
      verifyEmailOtp();
    });
    document.getElementById('modal-auth-verify-otp-btn')?.addEventListener('click', () => {
      verifyEmailOtp();
    });

    // Resend OTP Buttons
    document.getElementById('auth-resend-btn')?.addEventListener('click', () => {
      if (state.resendCooldownSec <= 0 && state.pendingEmail) {
        sendEmailOtp(state.pendingEmail, state.pendingDetails || {});
      }
    });
    document.getElementById('modal-auth-resend-btn')?.addEventListener('click', () => {
      if (state.resendCooldownSec <= 0 && state.pendingEmail) {
        sendEmailOtp(state.pendingEmail, state.pendingDetails || {});
      }
    });

    // Back to Email / Change Details Buttons
    document.getElementById('auth-back-email-btn')?.addEventListener('click', () => {
      clearAuthMessages();
      renderAuthView('email_input');
    });
    document.getElementById('modal-auth-back-email-btn')?.addEventListener('click', () => {
      clearAuthMessages();
      renderAuthView('email_input');
    });

    // Sign Out Buttons
    document.getElementById('auth-logout-btn')?.addEventListener('click', signOut);
    document.getElementById('header-auth-logout-btn')?.addEventListener('click', signOut);

    // Profile Form Save Button
    document.getElementById('auth-profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-profile-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>⏳</span><span>Saving Details...</span>`;
      }

      await saveProfile({
        fullName: document.getElementById('profile-full-name')?.value,
        phone: document.getElementById('profile-phone')?.value,
        location: document.getElementById('profile-location')?.value,
        crop: document.getElementById('profile-crop')?.value,
        acres: document.getElementById('profile-acres')?.value
      });

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>💾</span><span>Save Profile Details</span>`;
      }
      window.KisanApp?.showToast('Profile Updated', 'Farmer farm details have been saved.', 'success');
    });

    // Header Trigger to Open Auth Modal
    document.getElementById('header-auth-open-btn')?.addEventListener('click', () => {
      openAuthModal();
    });

    // Modal Close Triggers
    document.getElementById('close-auth-modal-x')?.addEventListener('click', closeAuthModal);
    document.getElementById('close-auth-modal-btn')?.addEventListener('click', closeAuthModal);
  }

  function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      state.authModalOpen = true;
      clearAuthMessages();
      if (!state.user && !state.session) {
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

  // Public Interface
  return {
    init,
    sendEmailOtp,
    verifyEmailOtp,
    signOut,
    saveProfile,
    openAuthModal,
    closeAuthModal,
    getUser: () => state.user,
    getSession: () => state.session,
    getProfile: () => state.profile,
    isConfigured: () => state.isConfigured
  };
})();
