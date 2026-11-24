# PANORAMA — Personalised Study Planning & Prioritisation

> **Tagline:** *"Not just when it's due. When to start, and how long."*  
> **Course:** B.Tech CSE (AI/ML) – First Year  
> **Student:** Aditya Verma  
> **Institution:** Mirai School of Technology  

PANORAMA is an opinionated, distraction-free study planning application designed to eliminate academic decision paralysis for first-year college students. It turns overlapping deadlines, topic confidence levels, and hard daily time budgets into a calm, prioritized study schedule that never exceeds available study time.

---

## 🌟 Core Product Features

1. **Deterministic Prioritisation Engine:**  
   Calculates priority using an objective mathematical scoring formula:
   $$\text{Priority Score } (P) = (0.45 \times S_{\text{urgency}}) + (0.30 \times S_{\text{importance}}) + (0.25 \times S_{\text{confidence}})$$
   - Urgency ($S_{\text{urgency}}$): Proximity to deadline (today: 100, tomorrow: 85, etc.).
   - Importance ($S_{\text{importance}}$): Weight of assignment/exam (High: 100, Medium: 70, Low: 40).
   - Topic Confidence ($S_{\text{confidence}}$): Self-assessed syllabus mastery (Low: 100, Medium: 65, High: 30).

2. **What-If Dynamic Time Budget Slider:**  
   Adjust your daily available minutes (30m to 360m) to see tasks automatically allocate or defer in real-time using a greedy budget-packing algorithm.

3. **Knowledge Mastery Mosaic:**  
   Interactive topic confidence grid (*Low, Medium, High*) with quick one-click confidence adjustment.

4. **Ambient Focus Studio (Cockpit):**  
   Distraction-free focus timer with SVG pulse ring, procedural Web Audio ambient sound generation (*Rain, Ocean Waves, White Noise, Chime*), and celebratory confetti. Zero external audio assets required.

5. **Cloud Synchronization & Offline-First Resiliency:**  
   Synchronizes across devices via Supabase PostgreSQL with strict Row Level Security (RLS). Caches the last known state in `localStorage` so the app opens instantly and safely read-only with an **Offline Banner** when network is unavailable.

6. **Guest Mode & Seamless Account Import:**  
   First-time visitors can explore immediately in **Guest Mode** with zero friction. When ready to sync across devices, a one-time import migrates all local coursework into their cloud account.

---

## 🛠️ Technology Stack

- **Frontend Architecture:** Vanilla Semantic HTML5, Modular CSS3, and ES6+ JavaScript.
- **Zero Build Step:** Runs directly from static files without Node.js, Webpack, Vite, or Babel.
- **Cloud Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL 15 + Supabase Auth).
  - Pinned `@supabase/supabase-js` UMD bundle is vendored locally into `js/vendor/` with zero runtime CDN dependency.
  - Strict Row Level Security (RLS) on all 6 tables (`profiles`, `user_settings`, `subjects`, `topics`, `tasks`, `study_sessions`).
- **Static Hosting:** Cloudflare Pages / Workers Static Assets (`wrangler.jsonc`) and GitHub Pages.
- **Security:** Content Security Policy (CSP) restricting execution to `'self'`, Google Fonts, and the project's Supabase instance. Zero secret keys or `service_role` credentials in code.

---

## 🚀 Live Links & Local Execution

- **Production Cloudflare Deployment:** See [`DEPLOY.md`](DEPLOY.md)
- **GitHub Pages Mirror:** [https://adityaverma223.github.io/Inception-Project/](https://adityaverma223.github.io/Inception-Project/)
- **Repository:** [https://github.com/AdityaVerma223/Inception-Project](https://github.com/AdityaVerma223/Inception-Project)
- **Local Testing:** Serve via any static server or open `index.html` in modern Safari/Chrome:
  ```bash
  python3 -m http.server 8000
  # Open http://localhost:8000
  ```

---

## ⚠️ Honest Limitations

- **Supabase Free-Tier Pause:** On Supabase free tier, projects pause after 7 consecutive days of inactivity. If paused, restore the project in 1-click via the Supabase dashboard.
- **Email Delivery Limits:** Supabase's default shared SMTP rate limits confirmation emails to ~3-4 emails per hour. For high volume, configure custom SMTP (e.g., Resend, Brevo, SendGrid) as documented in `supabase/SETUP.md`.
- **Account Deletion Scope:** True deletion of records from Supabase's internal `auth.users` requires a server-side administrative service function (which is deferred in static browser architectures to protect secret keys). The application includes a self-service **"Delete all my data"** option in Settings that permanently purges all subjects, topics, tasks, and study records from the cloud database and signs out.

---

## 📄 Documentation Directory

- [`supabase/schema.sql`](supabase/schema.sql): Complete PostgreSQL schema with triggers, foreign keys, and RLS policies.
- [`supabase/SETUP.md`](supabase/SETUP.md): Dashboard configuration guide and 5-step RLS isolation test script.
- [`DEPLOY.md`](DEPLOY.md): Step-by-step Cloudflare static asset deployment and Supabase redirect configuration.
- [`design.md`](design.md): Design tokens, typography, visual hierarchy, and color palettes.
- [`flow.md`](flow.md): User journey maps and worked mathematical scoring examples.
- [`projectAnalysis.md`](projectAnalysis.md): Comprehensive architectural analysis.
