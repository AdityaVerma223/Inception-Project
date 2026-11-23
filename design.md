# PANORAMA — Design System & Visual Specification

> **Project:** PANORAMA (Personalised Study Planning and Prioritisation)  
> **Aesthetic Philosophy:** Minimalist Modern Academic Productivity — Calm, refined, structured, and free of visual clutter.  
> **Implementation Stack:** Vanilla HTML5, CSS3 Custom Properties, and ES6+ JavaScript.

---

## 1. Design Tokens & CSS Custom Properties

The visual theme uses a foundational CSS variables block (`:root`) enabling direct implementation in any modern browser without preprocessing build steps.

```css
:root {
  /* ==========================================================================
     1. COLOUR PALETTE
     ========================================================================== */
  
  /* Primary Navy & Typography Colours */
  --color-navy-950: #0A0F1D;        /* Deepest navy (headings, brand wordmark) */
  --color-navy-900: #0F172A;        /* Primary navy (text, dark buttons) */
  --color-navy-800: #1E293B;        /* Secondary navy (subheadings, active states) */
  --color-navy-700: #334155;        /* Body text primary */
  --color-navy-600: #475569;        /* Body text secondary, muted descriptions */
  --color-navy-400: #94A3B8;        /* Placeholder text, subtle icons */

  /* Surface & Background Canvas */
  --color-bg-canvas: #F8FAFC;       /* Light cool grey-white application background */
  --color-bg-surface: #FFFFFF;      /* Pure white for cards, panels, and modals */
  --color-bg-subtle: #F1F5F9;       /* Secondary card background, table headers */
  --color-bg-hover: #E2E8F0;        /* Hover backgrounds for rows and list items */

  /* Subtle Blue Accent Colours */
  --color-blue-primary: #2563EB;    /* Vibrant primary action blue */
  --color-blue-hover: #1D4ED8;      /* Primary button hover state */
  --color-blue-subtle: #EFF6FF;     /* Active pill backgrounds, light tint */
  --color-blue-border: #BFDBFE;     /* Accent borders */
  --color-blue-glow: rgba(37, 99, 235, 0.15); /* Focus rings and halos */

  /* Neutral Borders & Dividers */
  --border-light: #E2E8F0;          /* Standard card and container borders */
  --border-medium: #CBD5E1;         /* Input field borders and active dividers */
  --border-focus: #3B82F6;          /* Input focus outline color */

  /* Topic Confidence Indicators */
  --confidence-low-text: #B91C1C;
  --confidence-low-bg: #FEF2F2;
  --confidence-low-border: #FECACA;

  --confidence-med-text: #B45309;
  --confidence-med-bg: #FFFBEB;
  --confidence-med-border: #FDE68A;

  --confidence-high-text: #047857;
  --confidence-high-bg: #ECFDF5;
  --confidence-high-border: #A7F3D0;

  /* Task Importance Tags */
  --importance-high-text: #991B1B;
  --importance-high-bg: #FEE2E2;
  --importance-med-text: #1E40AF;
  --importance-med-bg: #DBEAFE;
  --importance-low-text: #475569;
  --importance-low-bg: #F1F5F9;

  /* ==========================================================================
     2. TYPOGRAPHY & MEASUREMENTS
     ========================================================================== */
  
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;

  /* Font Sizes */
  --font-size-xs: 0.75rem;          /* 12px - Badges, tiny labels */
  --font-size-sm: 0.875rem;         /* 14px - Secondary body, inputs, buttons */
  --font-size-base: 1rem;           /* 16px - Standard reading body */
  --font-size-md: 1.125rem;         /* 18px - Section subheadings, card titles */
  --font-size-lg: 1.375rem;         /* 22px - Section headers */
  --font-size-xl: 1.75rem;          /* 28px - Primary view headings */

  /* Font Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* ==========================================================================
     3. RADII, SHADOWS & ELEVATION
     ========================================================================== */

  --radius-sm: 6px;                 /* Buttons, pills, input fields */
  --radius-md: 10px;                /* Inner cards, sub-panels */
  --radius-lg: 16px;                /* Main cards, dashboard blocks, modals */
  --radius-full: 9999px;            /* Circular badges, pill tags */

  /* Soft Ambient Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-card: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04);
  --shadow-float: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);

  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 2. Colour Palette Reference Table

| Role | Colour Name | HEX Code | UI Application |
|:---|:---|:---|:---|
| **Primary Navy** | Slate Navy 900 | `#0F172A` | Primary headings, prominent buttons, sidebar brand logo |
| **Secondary Navy**| Slate Navy 800 | `#1E293B` | Section titles, active nav text, card headers |
| **Body Text** | Slate Navy 700 | `#334155` | Regular content copy, list items, field labels |
| **Muted Text** | Slate 600 | `#475569` | Helper captions, timestamp notes, wireframe subtext |
| **Placeholder** | Slate 400 | `#94A3B8` | Input placeholders, empty state indicators |
| **Canvas** | Ice Slate 50 | `#F8FAFC` | Main app background behind cards |
| **Card Surface** | Pure White | `#FFFFFF` | Rounded cards, dropdown surfaces, modal bodies |
| **Subtle Surface**| Slate 100 | `#F1F5F9` | Table heads, nested topic lists, disabled inputs |
| **Primary Blue** | Royal Blue 600 | `#2563EB` | Active highlights, primary CTAs, links |
| **Subtle Accent**| Blue Tint 50 | `#EFF6FF` | Selected tab background, subtle badge backing |
| **Border Light** | Slate 200 | `#E2E8F0` | Dividers, standard card perimeter border (1px) |
| **Border Focus** | Blue 500 | `#3B82F6` | Input focus boundary ring |

### Topic Confidence Palette

| Confidence Tier | Text Colour | Background Tint | Border Colour | Semantics |
|:---|:---|:---|:---|:---|
| **Low Confidence** | `#B91C1C` | `#FEF2F2` | `#FECACA` | Needs immediate revision (Red/Coral) |
| **Medium Confidence**| `#B45309` | `#FFFBEB` | `#FDE68A` | Fair understanding; regular practice (Amber) |
| **High Confidence** | `#047857` | `#ECFDF5` | `#A7F3D0` | Solid mastery; maintenance only (Emerald) |

---

## 3. Typography System

The typography creates an uncluttered, academic feel. We employ high-contrast navy text paired with clean tabular numbers for durations and dates.

### Type Scale Hierarchy

| Element | Font Size | Weight | Line Height | Tracking | Text Colour |
|:---|:---|:---|:---|:---|:---|
| **App Title / H1** | `28px` (`1.75rem`) | `700` Bold | `1.2` | `-0.02em` | `#0F172A` |
| **Section Header / H2** | `22px` (`1.375rem`)| `600` Semibold | `1.3` | `-0.01em` | `#0F172A` |
| **Card Header / H3** | `18px` (`1.125rem`)| `600` Semibold | `1.35`| `0em` | `#1E293B` |
| **Subheading / H4** | `15px` (`0.9375rem`)| `500` Medium | `1.4` | `0em` | `#334155` |
| **Body Regular** | `15px` (`0.9375rem`)| `400` Regular | `1.5` | `0em` | `#334155` |
| **Button Text** | `14px` (`0.875rem`)| `600` Semibold | `1.25`| `0.01em` | `#FFFFFF` / `#1E293B` |
| **Input & Form Labels**| `13px` (`0.8125rem`)| `500` Medium | `1.3` | `0.01em` | `#1E293B` |
| **Badges & Tags** | `12px` (`0.75rem`) | `600` Semibold | `1.2` | `0.02em` | Varied by tier |

---

## 4. Navigation & Dashboard Structure

### 4.1 Global Layout Architecture (Desktop)

```
+-----------------------------------------------------------------------------------------+
|                                    PANORAMA DESKTOP                                     |
+---------------------+-------------------------------------------------------------------+
|  BRAND & LOGO       | TOP STATUS BAR                                                    |
|  PANORAMA           | Breadcrumbs: Dashboard / Home                  Current Date: Today|
|  "From scattered..."|                                                                   |
+---------------------+-------------------------------------------------------------------+
|  SIDEBAR NAV        | MAIN CONTENT CANVAS (Scrollable)                                  |
|                     |                                                                   |
|  [>] Dashboard      |   Good morning!                                                   |
|  [ ] My Subjects    |   Your study plan at a glance                                     |
|  [ ] Academic Tasks |   +-------------------------------------------------------------+ |
|  [ ] Daily Plan     |   | Today: 2 hours available | 4 planned study blocks           | |
|                     |   +-------------------------------------------------------------+ |
|                     |                                                                   |
|                     |   Priority for today                                              |
|                     |   +-------------------------------------------------------------+ |
|                     |   | 1. Mathematics - revise weak topic                          | |
|                     |   +-------------------------------------------------------------+ |
|                     |   | 2. DSA - practise pending topic                             | |
|                     |   +-------------------------------------------------------------+ |
|                     |   | 3. Chemistry - review notes                                 | |
|                     |   +-------------------------------------------------------------+ |
|                     |                                                                   |
|                     |   Quick actions                                                   |
|                     |   [ ADD TASK ]       [ VIEW SUBJECTS ]                            |
+---------------------+-------------------------------------------------------------------+
```

### 4.2 View-Switching Model (Pure HTML / JS)
Each main screen is enclosed within a `<section class="view-panel" id="view-[name]">` container:
- Inactive views are marked with `hidden` or `display: none`.
- Active views carry `.active` with a subtle fade-in transition (`opacity: 0 -> 1`, `duration: 200ms`).
- Navigation clicks trigger simple view-state routers:
  ```javascript
  function switchView(targetViewId) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(targetViewId).classList.add('active');
  }
  ```

---

## 5. Sidebar Design Specification

- **Dimensions:** Width `260px`, Height `100vh`, Sticky/Fixed positioning on desktop.
- **Background:** `#FFFFFF` with right border `1px solid var(--border-light)`.
- **Header Lockup:**
  - App Name: `PANORAMA` in `#0F172A`, font-weight `700`, letter-spacing `0.05em`.
  - Tagline: *"From scattered pieces to the bigger picture."* (`11px`, `#64748B`, italic/light).
- **Navigation Links:**
  - Item Height: `44px` (touch-friendly).
  - Margin: `4px 12px`.
  - Padding: `10px 14px`.
  - Border Radius: `8px`.
  - Default State: Text `#475569`, background transparent.
  - Hover State: Text `#0F172A`, background `var(--color-bg-subtle)`.
  - Active State: Text `var(--color-blue-primary)` (`#2563EB`), background `var(--color-blue-subtle)` (`#EFF6FF`), bold font weight (`600`), and a left accent indicator bar (`3px solid #2563EB`).
- **Footer Info Widget:**
  - Displays persistent mini-summary: `"Today: 120 mins | 3 tasks ready"`.

---

## 6. Cards and Buttons

### 6.1 Card Anatomy
- **Background:** `#FFFFFF`
- **Border:** `1px solid var(--border-light)` (`#E2E8F0`)
- **Border Radius:** `14px` (`var(--radius-lg)`)
- **Padding:** `20px` to `24px`
- **Shadow:** `var(--shadow-card)` (0 1px 3px rgba(15, 23, 42, 0.05))
- **Hover Behavior (Interactive Cards):** Subtly elevates with `border-color: #CBD5E1` and `box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06)`.

### 6.2 Button Hierarchy

```css
/* 1. Primary Action Button (Add Task, Save, Generate Plan) */
.btn-primary {
  background-color: var(--color-navy-900); /* #0F172A */
  color: #FFFFFF;
  border: 1px solid var(--color-navy-900);
  border-radius: var(--radius-sm);        /* 8px */
  padding: 10px 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background-color: #1E293B;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

/* 2. Accent Action Button (e.g., Generate Plan highlight) */
.btn-accent {
  background-color: var(--color-blue-primary); /* #2563EB */
  color: #FFFFFF;
  border: 1px solid var(--color-blue-primary);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-weight: var(--font-weight-semibold);
  min-height: 44px;
}

.btn-accent:hover {
  background-color: var(--color-blue-hover); /* #1D4ED8 */
}

/* 3. Secondary / Outline Button (Cancel, View Subjects) */
.btn-secondary {
  background-color: #FFFFFF;
  color: var(--color-navy-800);
  border: 1px solid var(--border-medium);   /* #CBD5E1 */
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  min-height: 44px;
}

.btn-secondary:hover {
  background-color: var(--color-bg-subtle); /* #F1F5F9 */
  border-color: #94A3B8;
}

/* 4. Danger / Destructive Action Button (Delete) */
.btn-danger-ghost {
  background: transparent;
  color: #DC2626;
  border: none;
  font-size: var(--font-size-xs);
  cursor: pointer;
}
```

---

## 7. Input Forms & Form Controls

To ensure high usability for students entering academic data during busy weeks, form controls follow clear ergonomic principles:

- **Form Labels:** Displayed above input (`font-size: 13px`, `font-weight: 500`, `#1E293B`, margin-bottom `6px`).
- **Input Fields (Text, Number, Date, Select):**
  - Height: `44px`
  - Padding: `10px 14px`
  - Border: `1px solid var(--border-medium)` (`#CBD5E1`)
  - Border Radius: `8px` (`var(--radius-sm)`)
  - Font Size: `14px` (`#1E293B`)
  - Background: `#FFFFFF`
  - Focus State:
    ```css
    outline: none;
    border-color: var(--color-blue-primary);
    box-shadow: 0 0 0 3px var(--color-blue-glow);
    ```
- **Segmented Confidence Radio Pills:**
  A three-segment horizontal pill selector replacing standard dropdowns for rapid input:
  - Low: Pill with `#FEF2F2` bg and `#EF4444` border when active.
  - Medium: Pill with `#FFFBEB` bg and `#F59E0B` border when active.
  - High: Pill with `#ECFDF5` bg and `#10B981` border when active.

---

## 8. Specific Screen Layouts (Mapping to Wireframes)

### 8.1 Screen 1 — Dashboard Layout
- **Hero Banner:**
  - Greeting: *"Good morning!"* (`22px`, font-weight `600`, `#0F172A`).
  - Subtitle: *"Your study plan at a glance"* (`14px`, `#64748B`).
- **Today's Capacity Card:**
  - Border: `1px solid #E2E8F0`
  - Background: `#FFFFFF`
  - Content: `"Today: 2 hours available | 4 planned study blocks"`
  - Highlighting: Bold values with subtle blue icon.
- **Priority For Today List:**
  - Renders the top 3 prioritized study items in clean stacked rows.
  - Each item displays: Priority ranking (`1.`, `2.`, `3.`), Subject name, action verb, and topic description.
- **Quick Action Container:**
  - Two full-width or side-by-side buttons: `[ ADD TASK ]` (Primary) and `[ VIEW SUBJECTS ]` (Secondary).

### 8.2 Screen 2 — Add Academic Task Layout
- **Container:** Centered card with maximum width `640px`.
- **Breadcrumbs:** `Task details | New task`.
- **Form Fields (Vertical stack with 16px gap):**
  1. *Task name:* Text input (placeholder: `"e.g. Complete Maths assignment"`).
  2. *Subject:* Select dropdown dynamically populated from `panorama_subjects`.
  3. *Task type:* Select dropdown (`Assignment`, `Revision`, `Practice`).
  4. *Due date:* HTML5 date input (`DD / MM / YYYY`).
  5. *Estimated time:* Number input in minutes (placeholder: `"e.g. 45 minutes"`).
  6. *Importance:* 3-pill toggle (`High`, `Medium`, `Low`).
- **Action Buttons:** `[ SAVE TASK ]` (Navy Primary) and `[ CANCEL ]` (Secondary Outline).

### 8.3 Screen 3 — Subjects & Topic Confidence Layout
- **Layout Split:**
  - **Left / Top Section (Your Subjects):**
    - Subject cards displaying title and topic count badge (e.g., *"Mathematics | 4 topics added"*).
    - Clicking a subject activates its nested topics.
  - **Right / Bottom Section (Topic Details & Setup):**
    - List of current topics with their interactive confidence badge pills (`Low`, `Medium`, `High`).
    - Inline topic creation form:
      - Topic Name input field (`"e.g. Functions"`).
      - Confidence selector (`Low / Medium / High`).
      - Button: `[ ADD TOPIC ]`.
- **Footer Control:** `[ SAVE SUBJECT DETAILS ]` navigating forward to `Daily Plan`.

### 8.4 Screen 4 — Daily Prioritised Plan Layout
- **Header Summary Card:**
  - Title: *"TODAY'S STUDY PLAN"*
  - Subtitle: *"Daily plan | Recommended order"*
  - Pill Metric: *"Available time: 120 minutes"*
- **Time Allocation Meter:**
  - Visual horizontal progress bar showing planned time versus available budget (e.g., `110m / 120m` filled in royal blue).
- **Ranked Study Queue Cards:**
  - Sequential numbered cards (`1.`, `2.`, `3.`, `4.`):
    - Example: `1. DSA – Functions practice | 40 min`
    - Badges attached to each card:
      - Subject Pill (e.g., `DSA`)
      - Duration Chip (e.g., `40 min`)
      - Rationale Tag (e.g., `Due Tomorrow` or `Weak Topic`)
- **Plan Action Buttons (Stacked or responsive row):**
  - `[ START FIRST TASK ]` (Navy Primary)
  - `[ EDIT AVAILABLE TIME ]` (Secondary Outline)
  - `[ REGENERATE PLAN ]` (Subtle Accent Outline)

---

## 9. Mobile Responsive Behaviour

PANORAMA uses a fluid mobile-first responsive grid system ensuring full usability on mobile smartphones (320px–480px), tablets (768px–1024px), and desktop monitors (>1024px).

### 9.1 Breakpoint Specifications

| Device Category | Viewport Width | Sidebar Behavior | Layout Structure |
|:---|:---|:---|:---|
| **Mobile** | `< 768px` | Replaced by fixed bottom navigation bar (`60px` height) | Single column vertical stack, cards take `100%` width |
| **Tablet** | `768px - 1024px` | Compact sidebar (`72px` icon width or collapsible drawer) | 2-column responsive grid |
| **Desktop** | `> 1024px` | Expanded permanent sidebar (`260px` width) | Multi-column grid, max content width `1120px` |

### 9.2 Mobile Adaptations

1. **Bottom Navigation Bar:**
   - On screens `< 768px`, the left sidebar is hidden (`display: none`).
   - A fixed bottom navigation bar (`position: fixed; bottom: 0; left: 0; right: 0; height: 60px; z-index: 100; background: #FFFFFF; border-top: 1px solid var(--border-light);`) provides 4 one-touch navigation icons:
     - `Home`
     - `Subjects`
     - `Tasks`
     - `Daily Plan`
2. **Touch Targets:**
   - All interactive controls (buttons, navigation tabs, radio pills, select boxes) enforce a minimum touch target size of **$44 \times 44 \text{ px}$**.
3. **Form Adjustments:**
   - Multi-column form layouts collapse into a single-column sequence with standard margin rhythm.
   - Button pairs (e.g., `SAVE` and `CANCEL`) stack vertically with primary CTA on top.
4. **Card Padding:**
   - Card padding reduces from `24px` (desktop) to `16px` (mobile) to maximize screen real estate for content.
5. **Horizontal Scrolling Elimination:**
   - All tables and queue lists are designed with flexible flexbox wrapping to eliminate horizontal clipping or scrollbars.
