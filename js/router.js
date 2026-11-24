/**
 * PANORAMA — Hash-Based Router & Route Guard (js/router.js)
 * 
 * Manages hash routing for GitHub Pages / Cloudflare static hosting (#/login, #/app/dashboard, etc.).
 * Guards private application views and coordinates view transitions.
 */

const Router = (() => {
  const ROUTES = {
    LOGIN: '#/login',
    SIGNUP: '#/signup',
    FORGOT_PASSWORD: '#/forgot-password',
    CONFIRM_EMAIL: '#/confirm-email',
    DASHBOARD: '#/app/dashboard',
    SUBJECTS: '#/app/subjects',
    TASKS: '#/app/tasks',
    PLAN: '#/app/plan',
    PROGRESS: '#/app/progress',
    SETTINGS: '#/app/settings'
  };

  const VIEW_MAP = {
    '#/app/dashboard': 'view-dashboard',
    '#/app/subjects': 'view-subjects',
    '#/app/tasks': 'view-tasks',
    '#/app/plan': 'view-daily-plan',
    '#/app/progress': 'view-progress',
    '#/app/settings': 'view-settings'
  };

  const BREADCRUMB_MAP = {
    '#/app/dashboard': 'Dashboard <span class="text-muted">/</span> <span class="crumb-active">Home</span>',
    '#/app/subjects': 'Academics <span class="text-muted">/</span> <span class="crumb-active">Subjects & Topics</span>',
    '#/app/tasks': 'Inventory <span class="text-muted">/</span> <span class="crumb-active">Academic Tasks</span>',
    '#/app/plan': 'Strategy <span class="text-muted">/</span> <span class="crumb-active">Daily Prioritised Plan</span>',
    '#/app/progress': 'Analytics <span class="text-muted">/</span> <span class="crumb-active">Study Progress</span>',
    '#/app/settings': 'Preferences <span class="text-muted">/</span> <span class="crumb-active">Settings</span>'
  };

  let currentRoute = '';

  function normalizeHash(hash) {
    if (!hash || hash === '#' || hash === '#/') {
      return AuthService.isAuthenticated() || AuthService.isGuest() ? ROUTES.DASHBOARD : ROUTES.LOGIN;
    }
    return hash.split('?')[0];
  }

  function handleRouteChange() {
    const rawHash = window.location.hash;
    const targetRoute = normalizeHash(rawHash);

    const isAuthedOrGuest = AuthService.isAuthenticated() || AuthService.isGuest();
    const isAuthRoute = [ROUTES.LOGIN, ROUTES.SIGNUP, ROUTES.FORGOT_PASSWORD, ROUTES.CONFIRM_EMAIL].includes(targetRoute);
    const isAppRoute = targetRoute.startsWith('#/app/');

    // Route Guard 1: Not authenticated/guest attempting to access protected app routes
    if (isAppRoute && !isAuthedOrGuest) {
      window.location.hash = ROUTES.LOGIN;
      return;
    }

    // Route Guard 2: Authenticated/guest user landing on login or signup
    if (isAuthRoute && isAuthedOrGuest && targetRoute !== ROUTES.CONFIRM_EMAIL) {
      window.location.hash = ROUTES.DASHBOARD;
      return;
    }

    currentRoute = targetRoute;
    renderRoute(targetRoute);
  }

  function renderRoute(route) {
    const appShell = document.getElementById('app-shell');
    const authShell = document.getElementById('auth-shell');

    // 1. Auth screens
    if ([ROUTES.LOGIN, ROUTES.SIGNUP, ROUTES.FORGOT_PASSWORD, ROUTES.CONFIRM_EMAIL].includes(route)) {
      if (appShell) appShell.style.display = 'none';
      if (authShell) {
        authShell.style.display = 'flex';
        renderAuthView(route);
      }
      return;
    }

    // 2. Main App views
    if (authShell) authShell.style.display = 'none';
    if (appShell) appShell.style.display = 'flex';

    const viewId = VIEW_MAP[route] || 'view-dashboard';

    // Update view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === viewId);
    });

    // Update sidebar navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkView = link.getAttribute('data-view');
      link.classList.toggle('active', linkView === viewId);
    });

    // Update mobile bottom nav items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      const itemView = item.getAttribute('data-view');
      item.classList.toggle('active', itemView === viewId);
    });

    // Update top breadcrumbs
    const breadcrumbs = document.getElementById('top-breadcrumbs');
    if (breadcrumbs && BREADCRUMB_MAP[route]) {
      breadcrumbs.innerHTML = BREADCRUMB_MAP[route];
    }

    // Trigger UI render for the active view
    if (typeof UIController !== 'undefined' && UIController.renderActiveView) {
      UIController.renderActiveView(viewId);
    }
  }

  function renderAuthView(route) {
    if (typeof AuthUI !== 'undefined' && AuthUI.render) {
      AuthUI.render(route);
    }
  }

  return {
    init() {
      window.addEventListener('hashchange', handleRouteChange);
      handleRouteChange();
    },

    navigate(route) {
      window.location.hash = route;
    },

    getCurrentRoute() {
      return currentRoute;
    },

    ROUTES
  };
})();
