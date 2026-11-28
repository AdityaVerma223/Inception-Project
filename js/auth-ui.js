/**
 * PANORAMA — Authentication UI Component (js/auth-ui.js)
 * 
 * Implements the split-screen auth experience:
 * - Floating labels
 * - Real-time password strength meter
 * - Inline validation & shake on error
 * - Supabase Auth integration (Sign In, Sign Up, Password Reset, Resend Confirmation)
 * - Guest mode switch & guest-to-cloud import prompt
 * - "Continue with Google" behind CONFIG.ENABLE_GOOGLE_AUTH feature flag
 */

const AuthUI = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.getElementById('auth-shell');
    }
    return container;
  }

  function shakeElement(el) {
    if (!el) return;
    el.classList.remove('shake-anim');
    void el.offsetWidth; // Force reflow
    el.classList.add('shake-anim');
  }

  function render(route) {
    const root = getContainer();
    if (!root) return;

    if (route === Router.ROUTES.SIGNUP) {
      root.innerHTML = getSignUpHTML();
      setupSignUpEvents();
    } else if (route === Router.ROUTES.FORGOT_PASSWORD) {
      root.innerHTML = getForgotPasswordHTML();
      setupForgotPasswordEvents();
    } else if (route === Router.ROUTES.CONFIRM_EMAIL) {
      root.innerHTML = getConfirmEmailHTML();
      setupConfirmEmailEvents();
    } else {
      // Default to Login
      root.innerHTML = getLoginHTML();
      setupLoginEvents();
    }
  }

  // ---------------------------------------------------------------------------
  // LEFT SPLIN-SCREEN BRAND HERO PANEL (Shared)
  // ---------------------------------------------------------------------------
  function getLeftHeroHTML() {
    return `
      <div class="auth-hero-panel">
        <div class="auth-hero-brand">
          <div class="brand-icon-box" style="width: 36px; height: 36px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <span style="font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;">PANORAMA</span>
        </div>

        <div class="auth-hero-body">
          <div class="liquid-orb-showcase">
            <div class="liquid-orb-wrap" aria-hidden="true">
              <div class="liquid-orb-ring"></div>
              <div class="liquid-orb">
                <div class="liquid-orb-caustic"></div>
                <div class="liquid-orb-highlight"></div>
              </div>
            </div>
            <div>
              <div class="auth-hero-pill">Liquid Glass Study Engine</div>
              <p class="text-muted" style="font-size: 13px; margin-top: 8px; max-width: 300px;">
                Optical clarity meets deterministic study scheduling.
              </p>
            </div>
          </div>

          <h1 class="auth-hero-title">Not just when it's due.<br><span class="text-gradient">When to start, and how long.</span></h1>
          <p class="auth-hero-desc">
            A research-backed study planner for college students that turns overlapping deadlines and topic confidence into a calm, realistic daily schedule that never exceeds your available time.
          </p>

          <div class="auth-hero-features">
            <div class="auth-feature-item">
              <span class="auth-feature-check">✓</span>
              <div>
                <strong>Urgency × Weight × Confidence Scoring</strong>
                <p>Prioritises work by how close it is and how much you struggle with the topic.</p>
              </div>
            </div>
            <div class="auth-feature-item">
              <span class="auth-feature-check">✓</span>
              <div>
                <strong>Hard Daily Time Budget</strong>
                <p>Never over-allocates. Automatically defers overflow tasks without guilt.</p>
              </div>
            </div>
            <div class="auth-feature-item">
              <span class="auth-feature-check">✓</span>
              <div>
                <strong>Offline-Ready & Cross-Device Sync</strong>
                <p>Access your study schedule seamlessly across desktop and mobile browsers.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="auth-hero-footer">
          <span>Engineered for focused, low-stress academic mastery.</span>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // 1. LOGIN VIEW
  // ---------------------------------------------------------------------------
  function getLoginHTML() {
    const googleBtnHTML = CONFIG.ENABLE_GOOGLE_AUTH ? `
      <div class="auth-divider"><span>OR</span></div>
      <button type="button" class="btn btn-secondary w-full" id="btn-google-auth" style="justify-content: center; height: 44px;">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Continue with Google
      </button>
    ` : '';

    return `
      <div class="auth-container">
        ${getLeftHeroHTML()}
        <div class="auth-form-panel">
          <div class="auth-card glass-sheen" id="auth-card">
            <div class="auth-header">
              <h2>Welcome back</h2>
              <p class="text-muted">Enter your credentials to access your study plan</p>
            </div>

            <div id="auth-alert" class="auth-alert" style="display: none;"></div>

            <form id="form-login" novalidate>
              <div class="floating-group">
                <input type="email" id="login-email" class="floating-input" placeholder=" " required autocomplete="email" />
                <label for="login-email" class="floating-label">Email address</label>
              </div>

              <div class="floating-group" style="margin-top: 18px;">
                <input type="password" id="login-password" class="floating-input" placeholder=" " required autocomplete="current-password" />
                <label for="login-password" class="floating-label">Password</label>
              </div>

              <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <a href="#/forgot-password" class="auth-link" style="font-size: 13px;">Forgot password?</a>
              </div>

              <button type="submit" class="btn btn-primary w-full" id="btn-login-submit" style="margin-top: 20px; height: 44px; justify-content: center; font-weight: 600;">
                <span class="btn-text">Log in</span>
                <span class="btn-spinner" style="display: none;">⏳ Connecting...</span>
              </button>

              ${googleBtnHTML}

              <div class="auth-footer-links">
                <p style="font-size: 13.5px; color: var(--color-text-muted); margin-bottom: 12px;">
                  Don't have an account? <a href="#/signup" class="auth-link" style="font-weight: 600;">Sign up</a>
                </p>
                <div style="border-top: 1px solid var(--border-light); padding-top: 14px;">
                  <button type="button" class="btn btn-secondary btn-sm w-full" id="btn-guest-mode" style="justify-content: center; height: 40px; font-weight: 600;">
                    ⚡ Explore as Guest (Local Only)
                  </button>
                  <p class="text-muted" style="font-size: 11.5px; text-align: center; margin-top: 6px;">
                    Guest mode stores data on this device only.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function setupLoginEvents() {
    const form = document.getElementById('form-login');
    const alertBox = document.getElementById('auth-alert');
    const card = document.getElementById('auth-card');
    const submitBtn = document.getElementById('btn-login-submit');
    const guestBtn = document.getElementById('btn-guest-mode');
    const googleBtn = document.getElementById('btn-google-auth');

    if (guestBtn) {
      guestBtn.addEventListener('click', () => {
        AuthService.continueAsGuest();
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        await AuthService.signInWithGoogle();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.style.display = 'none';

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
          alertBox.textContent = 'Please enter both your email address and password.';
          alertBox.style.display = 'block';
          shakeElement(card);
          return;
        }

        // Set loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-spinner').style.display = 'inline';

        const result = await AuthService.signIn(email, password);

        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-spinner').style.display = 'none';

        if (!result.success) {
          alertBox.textContent = result.error;
          alertBox.style.display = 'block';
          shakeElement(card);
        } else {
          // Success: sync and route
          await Store.syncFromRemote();
          checkGuestImportOffer();
          window.location.hash = Router.ROUTES.DASHBOARD;
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. SIGN UP VIEW
  // ---------------------------------------------------------------------------
  function getSignUpHTML() {
    return `
      <div class="auth-container">
        ${getLeftHeroHTML()}
        <div class="auth-form-panel">
          <div class="auth-card glass-sheen" id="auth-card">
            <div class="auth-header">
              <h2>Create your account</h2>
              <p class="text-muted">Start organising your academic life with clarity</p>
            </div>

            <div id="auth-alert" class="auth-alert" style="display: none;"></div>

            <form id="form-signup" novalidate>
              <div class="floating-group">
                <input type="text" id="signup-name" class="floating-input" placeholder=" " required autocomplete="name" />
                <label for="signup-name" class="floating-label">Your Name</label>
              </div>

              <div class="floating-group" style="margin-top: 16px;">
                <input type="email" id="signup-email" class="floating-input" placeholder=" " required autocomplete="email" />
                <label for="signup-email" class="floating-label">College Email address</label>
              </div>

              <div class="floating-group" style="margin-top: 16px;">
                <input type="password" id="signup-password" class="floating-input" placeholder=" " required autocomplete="new-password" />
                <label for="signup-password" class="floating-label">Password (min 6 characters)</label>
              </div>

              <!-- Password Strength Meter -->
              <div class="strength-meter-box" style="margin-top: 8px;">
                <div class="strength-meter-bar-track">
                  <div class="strength-meter-fill" id="strength-fill" style="width: 0%; background: #EF4444;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <span style="font-size: 11.5px; color: var(--color-text-muted);">Strength:</span>
                  <span id="strength-label" style="font-size: 11.5px; font-weight: 600; color: #EF4444;">Too short</span>
                </div>
              </div>

              <div class="floating-group" style="margin-top: 16px;">
                <input type="password" id="signup-confirm-password" class="floating-input" placeholder=" " required autocomplete="new-password" />
                <label for="signup-confirm-password" class="floating-label">Confirm Password</label>
              </div>

              <button type="submit" class="btn btn-primary w-full" id="btn-signup-submit" style="margin-top: 20px; height: 44px; justify-content: center; font-weight: 600;">
                <span class="btn-text">Create Account</span>
                <span class="btn-spinner" style="display: none;">⏳ Creating...</span>
              </button>

              <div class="auth-footer-links">
                <p style="font-size: 13.5px; color: var(--color-text-muted); margin-bottom: 12px;">
                  Already have an account? <a href="#/login" class="auth-link" style="font-weight: 600;">Log in</a>
                </p>
                <div style="border-top: 1px solid var(--border-light); padding-top: 14px;">
                  <button type="button" class="btn btn-secondary btn-sm w-full" id="btn-guest-mode" style="justify-content: center; height: 40px; font-weight: 600;">
                    ⚡ Explore as Guest (Local Only)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function setupSignUpEvents() {
    const form = document.getElementById('form-signup');
    const alertBox = document.getElementById('auth-alert');
    const card = document.getElementById('auth-card');
    const submitBtn = document.getElementById('btn-signup-submit');
    const pwdInput = document.getElementById('signup-password');
    const strengthFill = document.getElementById('strength-fill');
    const strengthLabel = document.getElementById('strength-label');
    const guestBtn = document.getElementById('btn-guest-mode');

    if (guestBtn) {
      guestBtn.addEventListener('click', () => {
        AuthService.continueAsGuest();
      });
    }

    if (pwdInput && strengthFill && strengthLabel) {
      pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        const res = AuthService.calculatePasswordStrength(val);
        const percent = (res.score / 4) * 100;
        strengthFill.style.width = `${percent}%`;
        strengthFill.style.background = res.color;
        strengthLabel.textContent = res.label;
        strengthLabel.style.color = res.color;
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.style.display = 'none';

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (!name || !email || !password) {
          alertBox.textContent = 'Please fill in all required fields.';
          alertBox.style.display = 'block';
          shakeElement(card);
          return;
        }

        if (password.length < 6) {
          alertBox.textContent = 'Password must be at least 6 characters.';
          alertBox.style.display = 'block';
          shakeElement(card);
          return;
        }

        if (password !== confirmPassword) {
          alertBox.textContent = 'Passwords do not match.';
          alertBox.style.display = 'block';
          shakeElement(card);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-spinner').style.display = 'inline';

        const result = await AuthService.signUp(email, password, name);

        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-spinner').style.display = 'none';

        if (!result.success) {
          alertBox.textContent = result.error;
          alertBox.style.display = 'block';
          shakeElement(card);
        } else {
          if (result.needsEmailConfirmation) {
            window.location.hash = Router.ROUTES.CONFIRM_EMAIL + `?email=${encodeURIComponent(email)}`;
          } else {
            // Immediate session
            await Store.syncFromRemote();
            checkGuestImportOffer();
            window.location.hash = Router.ROUTES.DASHBOARD;
          }
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. FORGOT PASSWORD VIEW
  // ---------------------------------------------------------------------------
  function getForgotPasswordHTML() {
    return `
      <div class="auth-container">
        ${getLeftHeroHTML()}
        <div class="auth-form-panel">
          <div class="auth-card glass-sheen" id="auth-card">
            <div class="auth-header">
              <h2>Reset password</h2>
              <p class="text-muted">Enter your email and we'll send you a recovery link</p>
            </div>

            <div id="auth-alert" class="auth-alert" style="display: none;"></div>

            <form id="form-forgot-password" novalidate>
              <div class="floating-group">
                <input type="email" id="reset-email" class="floating-input" placeholder=" " required autocomplete="email" />
                <label for="reset-email" class="floating-label">Email address</label>
              </div>

              <button type="submit" class="btn btn-primary w-full" id="btn-reset-submit" style="margin-top: 20px; height: 44px; justify-content: center; font-weight: 600;">
                <span class="btn-text">Send Reset Link</span>
                <span class="btn-spinner" style="display: none;">⏳ Sending...</span>
              </button>

              <div class="auth-footer-links" style="margin-top: 20px; text-align: center;">
                <a href="#/login" class="auth-link" style="font-weight: 600; font-size: 13.5px;">← Back to Log in</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function setupForgotPasswordEvents() {
    const form = document.getElementById('form-forgot-password');
    const alertBox = document.getElementById('auth-alert');
    const card = document.getElementById('auth-card');
    const submitBtn = document.getElementById('btn-reset-submit');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.style.display = 'none';

        const email = document.getElementById('reset-email').value.trim();
        if (!email) {
          alertBox.textContent = 'Please enter your email address.';
          alertBox.style.display = 'block';
          shakeElement(card);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-spinner').style.display = 'inline';

        const res = await AuthService.resetPassword(email);

        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-spinner').style.display = 'none';

        if (!res.success) {
          alertBox.textContent = res.error;
          alertBox.style.display = 'block';
          shakeElement(card);
        } else {
          alertBox.className = 'auth-alert auth-alert-success';
          alertBox.textContent = 'Password reset link sent! Check your inbox.';
          alertBox.style.display = 'block';
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. CONFIRM EMAIL SCREEN
  // ---------------------------------------------------------------------------
  function getConfirmEmailHTML() {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const email = urlParams.get('email') || '';

    return `
      <div class="auth-container">
        ${getLeftHeroHTML()}
        <div class="auth-form-panel">
          <div class="auth-card glass-sheen" id="auth-card" style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">✉️</div>
            <div class="auth-header" style="text-align: center;">
              <h2>Check your inbox</h2>
              <p class="text-muted" style="margin-top: 6px;">
                We sent a confirmation link to:<br>
                <strong id="confirm-email-display" style="color: var(--color-text-main); font-size: 14px;">${email || 'your email'}</strong>
              </p>
            </div>

            <div id="auth-alert" class="auth-alert" style="display: none; text-align: left;"></div>

            <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.6; margin: 18px 0;">
              Click the link in the email to activate your account and start planning your study sessions.
            </p>

            <button type="button" class="btn btn-secondary w-full" id="btn-resend-email" style="justify-content: center; height: 42px; font-weight: 600;">
              <span class="btn-text">Resend confirmation email</span>
              <span class="btn-spinner" style="display: none;">⏳ Sending...</span>
            </button>

            <div class="auth-footer-links" style="margin-top: 24px;">
              <a href="#/login" class="auth-link" style="font-weight: 600; font-size: 13.5px;">← Return to Log in</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setupConfirmEmailEvents() {
    const resendBtn = document.getElementById('btn-resend-email');
    const alertBox = document.getElementById('auth-alert');
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const email = urlParams.get('email') || '';

    if (resendBtn && email) {
      resendBtn.addEventListener('click', async () => {
        alertBox.style.display = 'none';
        resendBtn.disabled = true;
        resendBtn.querySelector('.btn-text').style.display = 'none';
        resendBtn.querySelector('.btn-spinner').style.display = 'inline';

        const res = await AuthService.resendConfirmationEmail(email);

        resendBtn.disabled = false;
        resendBtn.querySelector('.btn-text').style.display = 'inline';
        resendBtn.querySelector('.btn-spinner').style.display = 'none';

        if (!res.success) {
          alertBox.className = 'auth-alert';
          alertBox.textContent = res.error;
          alertBox.style.display = 'block';
        } else {
          alertBox.className = 'auth-alert auth-alert-success';
          alertBox.textContent = 'Confirmation email resent. Please check your inbox and spam folder.';
          alertBox.style.display = 'block';
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // GUEST DATA IMPORT MODAL / PROMPT
  // ---------------------------------------------------------------------------
  function checkGuestImportOffer() {
    const guestSubjects = StorageService.getSubjects();
    const guestTasks = StorageService.getTasks();

    // If there is existing guest data in localStorage, offer one-time import
    if ((guestSubjects && guestSubjects.length > 0) || (guestTasks && guestTasks.length > 0)) {
      setTimeout(() => {
        showGuestImportModal(guestSubjects.length, guestTasks.length);
      }, 600);
    }
  }

  function showGuestImportModal(subjectsCount, tasksCount) {
    const modalId = 'modal-guest-import';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 460px;">
          <h3 style="margin: 0 0 8px 0; font-size: 1.2rem;">📥 Import Local Guest Data?</h3>
          <p class="text-muted" style="font-size: 13.5px; line-height: 1.5; margin-bottom: 16px;">
            We found <strong>${subjectsCount} subjects</strong> and <strong>${tasksCount} tasks</strong> saved locally in guest mode on this device. Would you like to import them into your cloud account so they sync across all your devices?
          </p>

          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary btn-sm" id="btn-skip-import">Skip (Discard Local)</button>
            <button class="btn btn-primary btn-sm" id="btn-confirm-import">Yes, Import to Account</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btn-skip-import').addEventListener('click', () => {
        StorageService.clearAll();
        modal.remove();
      });

      document.getElementById('btn-confirm-import').addEventListener('click', async () => {
        const confirmBtn = document.getElementById('btn-confirm-import');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Importing...';
        try {
          await Store.importGuestData();
          modal.remove();
          if (typeof UIController !== 'undefined' && UIController.renderActiveView) {
            UIController.renderActiveView('view-dashboard');
          }
        } catch (err) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Retry Import';
        }
      });
    }
  }

  return {
    render,
    checkGuestImportOffer
  };
})();
