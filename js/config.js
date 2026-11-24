/**
 * PANORAMA — Configuration
 * 
 * IMPORTANT SECURITY RULE:
 * This file contains ONLY the Supabase Project URL and the PUBLIC anon/publishable key.
 * NEVER add, reference, or commit a service_role key or secret key anywhere.
 */

const CONFIG = {
  // Replace these with your actual Supabase project credentials in the Supabase Dashboard
  // Settings -> API -> Project URL & Project API Keys (anon public)
  SUPABASE_URL: (typeof window !== 'undefined' && window.__PANORAMA_SUPABASE_URL__) || 'https://placeholder-project.supabase.co',
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.__PANORAMA_SUPABASE_ANON_KEY__) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key',

  // Feature Flags
  ENABLE_GOOGLE_AUTH: false, // Default off per brief

  // Product Constants
  APP_NAME: 'PANORAMA',
  HERO_IDEA: "Not just when it's due. When to start, and how long.",
  DEFAULT_AVAILABLE_MINUTES: 120,
  SCHEMA_VERSION: 2
};
