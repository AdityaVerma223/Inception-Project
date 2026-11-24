/**
 * PANORAMA — Supabase Auth Controller & Guest Mode Manager
 * 
 * Manages Supabase Auth sessions, persistent listeners, friendly error mappings,
 * password strength scoring, and guest mode transitions.
 * 
 * Strict Constraint: Uses vendored @supabase/supabase-js (no CDN dependency).
 */

const AuthService = (() => {
  let supabaseClient = null;
  let currentUser = null;
  let currentSession = null;
  let authListeners = [];

  // Initialize Supabase Client
  function initClient() {
    if (supabaseClient) return supabaseClient;

    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      try {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      } catch (err) {
        console.warn('[PANORAMA Auth] Supabase client initialization error:', err);
      }
    } else {
      console.warn('[PANORAMA Auth] Supabase vendor library not detected in window.');
    }
    return supabaseClient;
  }

  // Friendly error mapping for Supabase Auth errors
  function mapAuthError(err) {
    if (!err) return '';
    const msg = (err.message || err.toString() || '').toLowerCase();
    
    if (msg.includes('invalid login credentials')) {
      return 'Incorrect email or password. Please verify your details and try again.';
    }
    if (msg.includes('user already registered') || msg.includes('already exists')) {
      return 'An account with this email already exists. Try logging in instead.';
    }
    if (msg.includes('password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('signup requires a valid password')) {
      return 'Please enter a valid password meeting requirements.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please check your email and click the confirmation link before logging in.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    return err.message || 'An unexpected authentication error occurred.';
  }

  // Password strength calculation
  function calculatePasswordStrength(password) {
    if (!password) {
      return { score: 0, label: 'Empty', color: '#94A3B8' };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Normalize to 0-4
    const clampedScore = Math.min(4, Math.floor((score / 5) * 4) + 1);

    const labels = [
      { score: 0, label: 'Too short', color: '#EF4444' },
      { score: 1, label: 'Weak', color: '#EF4444' },
      { score: 2, label: 'Fair', color: '#F59E0B' },
      { score: 3, label: 'Good', color: '#10B981' },
      { score: 4, label: 'Strong', color: '#059669' }
    ];

    return labels[clampedScore] || labels[1];
  }

  return {
    async init() {
      const client = initClient();
      if (!client) {
        // Fallback to guest mode if client fails to init
        if (!localStorage.getItem('panorama_auth_mode')) {
          localStorage.setItem('panorama_auth_mode', 'guest');
        }
        return { user: null, session: null, isGuest: true };
      }

      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        currentSession = data ? data.session : null;
        currentUser = currentSession ? currentSession.user : null;

        // Listen for auth state changes
        client.auth.onAuthStateChange((event, session) => {
          currentSession = session;
          currentUser = session ? session.user : null;

          if (session) {
            localStorage.setItem('panorama_auth_mode', 'authenticated');
          } else if (localStorage.getItem('panorama_auth_mode') !== 'guest') {
            localStorage.removeItem('panorama_auth_mode');
          }

          authListeners.forEach(fn => fn(event, session));
        });

        return { user: currentUser, session: currentSession, isGuest: this.isGuest() };
      } catch (err) {
        console.warn('[PANORAMA Auth] Session check failed, falling back:', err);
        return { user: null, session: null, isGuest: this.isGuest() };
      }
    },

    getClient() {
      return initClient();
    },

    getUser() {
      return currentUser;
    },

    getSession() {
      return currentSession;
    },

    isAuthenticated() {
      return !!currentUser;
    },

    isGuest() {
      return !currentUser && localStorage.getItem('panorama_auth_mode') === 'guest';
    },

    continueAsGuest() {
      localStorage.setItem('panorama_auth_mode', 'guest');
      // If guest has no existing data, load sample data so they can test immediately
      const existingSubjects = StorageService.getSubjects();
      if (!existingSubjects || existingSubjects.length === 0) {
        StorageService.loadSampleData();
      }
      authListeners.forEach(fn => fn('GUEST_LOGIN', null));
      window.location.hash = '#/app/dashboard';
    },

    onAuthStateChange(callback) {
      if (typeof callback === 'function') {
        authListeners.push(callback);
      }
    },

    async signUp(email, password, displayName) {
      const client = initClient();
      if (!client) throw new Error('Supabase client not initialized.');

      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0]
            }
          }
        });

        if (error) {
          return { success: false, error: mapAuthError(error) };
        }

        // Check if email confirmation is required (user created but no session yet)
        const needsConfirmation = data.user && !data.session;
        if (!needsConfirmation && data.session) {
          currentUser = data.user;
          currentSession = data.session;
          localStorage.setItem('panorama_auth_mode', 'authenticated');
        }

        return {
          success: true,
          user: data.user,
          session: data.session,
          needsEmailConfirmation: needsConfirmation
        };
      } catch (err) {
        return { success: false, error: mapAuthError(err) };
      }
    },

    async signIn(email, password) {
      const client = initClient();
      if (!client) throw new Error('Supabase client not initialized.');

      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return { success: false, error: mapAuthError(error) };
        }

        currentUser = data.user;
        currentSession = data.session;
        localStorage.setItem('panorama_auth_mode', 'authenticated');

        return {
          success: true,
          user: data.user,
          session: data.session
        };
      } catch (err) {
        return { success: false, error: mapAuthError(err) };
      }
    },

    async signOut() {
      const client = initClient();
      if (client && currentUser) {
        try {
          await client.auth.signOut();
        } catch (err) {
          console.warn('[PANORAMA Auth] Sign out error:', err);
        }
      }
      currentUser = null;
      currentSession = null;
      localStorage.removeItem('panorama_auth_mode');
      authListeners.forEach(fn => fn('SIGNED_OUT', null));
      window.location.hash = '#/login';
    },

    async resetPassword(email) {
      const client = initClient();
      if (!client) throw new Error('Supabase client not initialized.');

      try {
        const redirectUrl = window.location.origin + window.location.pathname + '#/confirm-email';
        const { data, error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (error) {
          return { success: false, error: mapAuthError(error) };
        }
        return { success: true, data };
      } catch (err) {
        return { success: false, error: mapAuthError(err) };
      }
    },

    async resendConfirmationEmail(email) {
      const client = initClient();
      if (!client) throw new Error('Supabase client not initialized.');

      try {
        const { data, error } = await client.auth.resend({
          type: 'signup',
          email
        });

        if (error) {
          return { success: false, error: mapAuthError(error) };
        }
        return { success: true, data };
      } catch (err) {
        return { success: false, error: mapAuthError(err) };
      }
    },

    async signInWithGoogle() {
      if (!CONFIG.ENABLE_GOOGLE_AUTH) {
        return { success: false, error: 'Google sign-in is currently disabled.' };
      }
      const client = initClient();
      if (!client) throw new Error('Supabase client not initialized.');

      try {
        const redirectUrl = window.location.origin + window.location.pathname + '#/app/dashboard';
        const { data, error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl }
        });
        if (error) throw error;
        return { success: true, data };
      } catch (err) {
        return { success: false, error: mapAuthError(err) };
      }
    },

    calculatePasswordStrength,
    mapAuthError
  };
})();
