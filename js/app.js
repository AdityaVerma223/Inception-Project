/**
 * PANORAMA — Main Application Entry Point
 * 
 * Boots the auth session, initializes the unified data store facade,
 * activates the hash router, and mounts the UI controller.
 */

document.addEventListener('DOMContentLoaded', async () => {
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
