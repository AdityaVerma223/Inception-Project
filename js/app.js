/**
 * PANORAMA — Main Application Entry Point
 * 
 * Plays the liquid-glass intro animation, boots auth & store,
 * attaches pointer-tracking optical sheen, and mounts the router & UI.
 */

function initIntroAnimation() {
  const intro = document.getElementById('panorama-intro');
  if (!intro) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dismissed = false;

  const dismissIntro = () => {
    if (dismissed) return;
    dismissed = true;
    intro.classList.add('is-leaving');

    // Follow modern-web-guidance: check getAnimations() + deterministic failsafe timeout
    const anims = typeof intro.getAnimations === 'function' ? intro.getAnimations() : [];
    if (anims.length === 0 || prefersReduced) {
      intro.hidden = true;
      return;
    }

    let cleaned = false;
    const hideNow = () => {
      if (cleaned) return;
      cleaned = true;
      intro.hidden = true;
    };

    Promise.race([
      Promise.allSettled(anims.map(a => a.finished)),
      new Promise(r => setTimeout(r, 750))
    ]).then(hideNow);
  };

  intro.addEventListener('click', dismissIntro, { once: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      dismissIntro();
    }
  }, { once: true });

  // Auto-dismiss after the starting sequence finishes (~1.65s, or instant when reduced motion is enabled)
  setTimeout(dismissIntro, prefersReduced ? 180 : 1650);
}

function initLiquidPointerSheen() {
  if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let rafPending = false;
  let lastEvent = null;

  document.addEventListener('pointermove', (e) => {
    lastEvent = e;
    if (rafPending) return;
    rafPending = true;

    requestAnimationFrame(() => {
      rafPending = false;
      const target = lastEvent?.target?.closest?.('.glass-sheen');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = ((lastEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((lastEvent.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty('--mx', `${x.toFixed(1)}%`);
      target.style.setProperty('--my', `${y.toFixed(1)}%`);
    });
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  initIntroAnimation();
  initLiquidPointerSheen();

  try {
    // 1. Initialize Authentication session (Supabase Auth / Guest session)
    await AuthService.init();

    // 2. Initialize Data Store Facade (Offline cache & sync)
    await Store.init();

    // 3. Initialize UI Controller
    UIController.init();

    // 4. Initialize Hash Router (Guards protected routes and displays active view)
    Router.init();
  } catch (err) {
    console.error('[PANORAMA Bootstrap Error]:', err);
  }
});
