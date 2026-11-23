# PANORAMA — Personalised Study Planning & Prioritisation

> **Tagline:** *"From scattered pieces to the bigger picture."*  
> **Course:** B.Tech CSE (AI/ML) – First Year  
> **Student:** Aditya Verma  
> **Institution:** Mirai School of Technology  

PANORAMA is a lightweight, responsive client-side web application designed to eliminate academic decision paralysis for university students. It translates scattered deadlines, coursework tasks, and weak syllabus areas into an actionable, prioritized daily study plan tailored to available study time.

---

## 🌟 Key Features

1. **Deterministic Prioritisation Engine:**  
   Prioritises tasks using an objective, multi-factor scoring formula:
   $$\text{Priority Score } (P) = (0.45 \times S_{\text{urgency}}) + (0.30 \times S_{\text{importance}}) + (0.25 \times S_{\text{confidence}})$$
   - Deadlines ($S_{\text{urgency}}$)
   - Academic weight ($S_{\text{importance}}$)
   - Syllabus weak areas ($S_{\text{confidence}}$)

2. **Knowledge Mastery Mosaic:**  
   Interactive visual confidence landscape for syllabus topics (*Low, Medium, High*) with instant feedback.

3. **"What-If" Dynamic Time Budget Slider:**  
   Drag your available study minutes (30m to 360m) to see tasks pack and defer live in real time using a greedy budget-packing algorithm.

4. **Ambient Focus Studio (Cockpit):**  
   Distraction-free study mode with pulse ring timer, actual study time logging, post-study confidence updates, and celebratory confetti.

5. **Client-Side Persistence:**  
   Zero external dependencies or accounts required; all state is securely persisted in browser `localStorage`.

---

## 🚀 Live Demo & How to Run

- **Live URL:** [GitHub Pages](https://adityaverma223.github.io/Inception-Project/)
- **Local Run:** Open `index.html` in any modern web browser (Chrome, Safari, Edge, Firefox).

---

## 🛠️ Technology Stack
- **Structure:** Vanilla Semantic HTML5
- **Styling:** Vanilla CSS3 (Custom properties, CSS Grid, Flexbox, Keyframe Animations)
- **Scripting:** Modular ES6+ JavaScript
- **Storage:** Browser `localStorage`

---

## 📄 Documentation
- [`design.md`](design.md): Visual design specifications and design tokens.
- [`flow.md`](flow.md): User journey, relational schema, and mathematical prioritisation formula.
- [`projectAnalysis.md`](projectAnalysis.md): Comprehensive architecture and planning report.
