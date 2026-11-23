/**
 * PANORAMA — UI Views Controller & Interactive Component Renderer
 * Handles DOM rendering for Screens 1 to 6, view routing, micro-animations,
 * the What-If Budget Slider, and the Focus Cockpit.
 */

/**
 * Web Audio API Procedural Ambient Sound Synthesizer & Notification Chime
 * Zero external audio files required.
 */
const AudioSynth = {
  ctx: null,
  activeSource: null,
  activeGain: null,
  currentType: 'MUTE',

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },

  play(type) {
    this.stop();
    this.init();
    if (!this.ctx || type === 'MUTE') {
      this.currentType = 'MUTE';
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.currentType = type;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      if (type === 'RAIN') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, this.ctx.currentTime);
        gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
      } else if (type === 'WAVES') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(420, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.8, this.ctx.currentTime);
        gainNode.gain.setValueAtTime(0.14, this.ctx.currentTime);
      } else if (type === 'WHITE_NOISE') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, this.ctx.currentTime);
        gainNode.gain.setValueAtTime(0.06, this.ctx.currentTime);
      }

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      whiteNoise.start();
      this.activeSource = whiteNoise;
      this.activeGain = gainNode;
    } catch (e) {
      console.warn('Audio synthesis note:', e);
    }
  },

  stop() {
    if (this.activeSource) {
      try { this.activeSource.stop(); } catch (e) {}
      try { this.activeSource.disconnect(); } catch (e) {}
      this.activeSource = null;
    }
    this.currentType = 'MUTE';
  },

  playChime() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3); // A5 note

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.8);
    } catch (e) {
      console.warn('Chime note:', e);
    }
  }
};

const UIController = {
  currentView: 'view-dashboard',
  selectedSubjectId: null,
  activeFocusTaskId: null,
  taskFilter: 'ALL', // 'ALL' | 'PENDING' | 'COMPLETED'
  timerState: {
    interval: null,
    remainingSeconds: 0,
    totalSeconds: 0,
    elapsedSeconds: 0,
    isRunning: false
  },

  init() {
    this.bindGlobalEvents();
    this.updateLiveDate();
    this.switchView('view-dashboard');
    this.updateSidebarStats();
  },

  /* ==========================================================================
     GLOBAL EVENTS & VIEW ROUTING
     ========================================================================== */
  bindGlobalEvents() {
    // Desktop Nav Links
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        if (targetView) this.switchView(targetView);
      });
    });

    // Mobile Bottom Nav Links
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        if (targetView) this.switchView(targetView);
      });
    });

    // Breadcrumb or in-page routing triggers
    document.addEventListener('click', (e) => {
      const routeBtn = e.target.closest('[data-route]');
      if (routeBtn) {
        e.preventDefault();
        const target = routeBtn.getAttribute('data-route');
        this.switchView(target);
      }
    });
  },

  updateLiveDate() {
    const dateEl = document.getElementById('live-date-text');
    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
  },

  updateSidebarStats() {
    const valEl = document.getElementById('sidebar-status-val');
    if (valEl) {
      const plan = StorageService.getDailyPlan();
      const tasks = StorageService.getTasks().filter(t => !t.isCompleted);
      if (plan && plan.plannedTasks && plan.plannedTasks.length > 0) {
        valEl.textContent = `Today: ${plan.availableTimeMinutes}m | ${plan.plannedTasks.length} tasks ready`;
      } else {
        valEl.textContent = `${tasks.length} pending tasks`;
      }
    }
  },

  switchView(viewId) {
    this.currentView = viewId;

    // Toggle view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(viewId);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Toggle navigation active states
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    // Update top bar breadcrumbs
    this.updateBreadcrumbs(viewId);

    // Render target view content
    switch (viewId) {
      case 'view-dashboard':
        this.renderDashboard();
        break;
      case 'view-subjects':
        this.renderSubjects();
        break;
      case 'view-tasks':
        this.renderTasks();
        break;
      case 'view-daily-plan':
        this.renderDailyPlan();
        break;
      case 'view-progress':
        this.renderProgress();
        break;
    }

    this.updateSidebarStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateBreadcrumbs(viewId) {
    const crumbEl = document.getElementById('top-breadcrumbs');
    if (!crumbEl) return;

    const breadcrumbMap = {
      'view-dashboard': 'Dashboard <span class="text-muted">/</span> <span class="crumb-active">Home</span>',
      'view-subjects': 'Subjects <span class="text-muted">/</span> <span class="crumb-active">Topic setup</span>',
      'view-tasks': 'Tasks <span class="text-muted">/</span> <span class="crumb-active">Inventory & Setup</span>',
      'view-daily-plan': 'Daily plan <span class="text-muted">/</span> <span class="crumb-active">Recommended order</span>',
      'view-progress': 'Progress <span class="text-muted">/</span> <span class="crumb-active">Overview</span>'
    };

    crumbEl.innerHTML = breadcrumbMap[viewId] || 'PANORAMA';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  },

  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }

    let animationFrame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    };

    animate();
  },

  /* ==========================================================================
     SCREEN 1: DASHBOARD
     ========================================================================== */
  renderDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const subjects = StorageService.getSubjects();
    const tasks = StorageService.getTasks();
    const topics = StorageService.getTopics();
    const plan = StorageService.getDailyPlan();

    // Time-based greeting
    const hour = new Date().getHours();
    let greeting = 'Good morning!';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon!';
    if (hour >= 17) greeting = 'Good evening!';

    // Get top priority tasks
    let topTasks = [];
    if (plan && plan.plannedTasks && plan.plannedTasks.length > 0) {
      topTasks = plan.plannedTasks.slice(0, 3);
    } else {
      const uncompleted = tasks.filter(t => !t.isCompleted);
      topTasks = uncompleted.map(t => PrioritisationEngine.scoreTask(t, topics))
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 3)
        .map((t, idx) => ({ ...t, rank: idx + 1, allocatedMinutes: t.estimatedDuration }));
    }

    // Capacity text
    const capacityText = plan && plan.plannedTasks.length > 0
      ? `Today: ${plan.availableTimeMinutes} minutes available | ${plan.plannedTasks.length} planned study blocks`
      : `Today: ${tasks.filter(t => !t.isCompleted).length} pending tasks | No plan generated yet`;

    let html = `
      <div class="dashboard-grid">
        <!-- Hero Banner -->
        <div class="hero-banner">
          <h1 class="hero-greeting">${greeting}</h1>
          <p class="hero-subtitle">Your study plan at a glance</p>

          <div class="capacity-card">
            <div class="capacity-stat-group">
              <div class="capacity-icon-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div>
                <div class="capacity-main-text">${capacityText}</div>
                <div class="capacity-sub-text">${plan ? `${plan.remainingTimeMinutes}m buffer remaining` : 'Enter available study time to create today\'s plan'}</div>
              </div>
            </div>
            <button class="btn btn-accent btn-sm" data-route="view-daily-plan">
              ${plan ? 'View Today\'s Plan' : 'Create Plan'}
            </button>
          </div>
        </div>

        <!-- Priority For Today Section -->
        <div>
          <div class="section-header">
            <h2 class="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Priority for today
            </h2>
            <button class="btn btn-secondary btn-sm" data-route="view-tasks">All Tasks (${tasks.length})</button>
          </div>

          <div class="priority-list">
    `;

    if (topTasks.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 40px;">
          <h3 style="color: var(--color-navy-800); margin-bottom: 8px;">No academic tasks registered</h3>
          <p class="text-muted" style="margin-bottom: 20px;">Add your courses and upcoming deadlines to receive an optimal daily schedule.</p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" data-route="view-subjects">1. Manage Subjects</button>
            <button class="btn btn-secondary" id="btn-load-demo-inline">Load Sample Data</button>
          </div>
        </div>
      `;
    } else {
      topTasks.forEach((item, index) => {
        const subject = StorageService.getSubjectById(item.subjectId);
        const topic = StorageService.getTopicById(item.topicId);
        const subjectColor = subject ? subject.color : '#2563EB';
        const subjectName = subject ? subject.name : 'General';
        const topicName = topic ? topic.name : 'General';

        html += `
          <div class="priority-item-card">
            <div class="priority-left">
              <div class="priority-rank-badge">${index + 1}.</div>
              <div class="priority-content">
                <div class="priority-task-title">${item.title}</div>
                <div class="priority-meta">
                  <span class="badge-subject">
                    <span class="badge-subject-dot" style="background-color: ${subjectColor};"></span>
                    ${subjectName}
                  </span>
                  <span class="text-muted" style="font-size: 12px;">• ${topicName}</span>
                  <span class="duration-chip">${item.allocatedMinutes || item.estimatedDuration} min</span>
                  ${item.rationaleTags ? item.rationaleTags.map(tag => `<span class="rationale-tag ${tag.type}">${tag.text}</span>`).join('') : ''}
                </div>
              </div>
            </div>
            <button class="btn btn-primary btn-sm btn-focus-trigger" data-task-id="${item.id || item.taskId}">
              Focus
            </button>
          </div>
        `;
      });
    }

    html += `
          </div>
        </div>

        <!-- Quick Actions Container -->
        <div>
          <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--color-navy-800);">Quick actions</h3>
          <div class="quick-actions-bar">
            <button class="btn btn-primary" data-route="view-tasks" id="dash-quick-add-task">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              ADD TASK
            </button>
            <button class="btn btn-secondary" data-route="view-subjects">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              VIEW SUBJECTS
            </button>
            <button class="btn btn-secondary" data-route="view-progress">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              VIEW PROGRESS
            </button>
            <button class="btn btn-secondary" id="dash-load-demo-data" style="margin-left: auto;">
              ⚡ Load Sample Data
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Focus buttons
    container.querySelectorAll('.btn-focus-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-task-id');
        this.openFocusCockpit(taskId);
      });
    });

    const demoBtn1 = container.querySelector('#dash-load-demo-data');
    if (demoBtn1) {
      demoBtn1.addEventListener('click', () => this.handleLoadDemoData());
    }
    const demoBtn2 = container.querySelector('#btn-load-demo-inline');
    if (demoBtn2) {
      demoBtn2.addEventListener('click', () => this.handleLoadDemoData());
    }
  },

  handleLoadDemoData() {
    StorageService.loadSampleData();
    this.showToast('Sample academic dataset loaded successfully!', 'success');
    this.renderDashboard();
    this.updateSidebarStats();
  },

  /* ==========================================================================
     SCREEN 3: SUBJECTS & TOPIC CONFIDENCE
     ========================================================================== */
  renderSubjects() {
    const container = document.getElementById('subjects-content');
    if (!container) return;

    const subjects = StorageService.getSubjects();
    const allTopics = StorageService.getTopics();

    // Set active subject if not set
    if (!this.selectedSubjectId && subjects.length > 0) {
      this.selectedSubjectId = subjects[0].id;
    }

    const activeSubject = subjects.find(s => s.id === this.selectedSubjectId) || subjects[0] || null;
    const activeTopics = activeSubject ? StorageService.getTopicsBySubject(activeSubject.id) : [];

    let html = `
      <div class="section-header">
        <div>
          <h2>My Subjects & Syllabus Breakdown</h2>
          <p class="text-muted">Break subjects into manageable topics and set confidence ratings to guide study priorities.</p>
        </div>
        <button class="btn btn-primary btn-sm" data-route="view-daily-plan">Go To Daily Plan →</button>
      </div>

      <div class="subjects-layout">
        <!-- LEFT: SUBJECTS LIST -->
        <div class="card">
          <div class="card-header">
            <h3>Your Subjects</h3>
            <span class="text-muted" style="font-size: 12px;">${subjects.length} Total</span>
          </div>

          <div id="subjects-list-container">
    `;

    if (subjects.length === 0) {
      html += `<p class="text-muted" style="padding: 16px 0;">No subjects added yet. Add your first subject below.</p>`;
    } else {
      subjects.forEach(subj => {
        const topicCount = allTopics.filter(t => t.subjectId === subj.id).length;
        const isActive = activeSubject && activeSubject.id === subj.id;
        html += `
          <div class="subject-item-card ${isActive ? 'active' : ''}" data-subject-id="${subj.id}">
            <div class="subject-card-info">
              <span class="subject-color-swatch" style="background-color: ${subj.color || '#2563EB'};"></span>
              <span style="font-weight: 600; color: var(--color-navy-900); font-size: 14px;">${subj.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="subject-topic-count">${topicCount} topics</span>
              <button class="btn-danger-ghost btn-delete-subject" data-subject-id="${subj.id}" title="Delete subject">✕</button>
            </div>
          </div>
        `;
      });
    }

    // Add Subject Form
    html += `
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-light);">
            <h4 style="margin-bottom: 10px; font-size: 13px;">Add New Subject</h4>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <input type="text" id="new-subject-name" class="form-control" placeholder="e.g. Mathematics" />
              <input type="color" id="new-subject-color" value="#2563EB" style="width: 44px; height: 44px; padding: 2px; border-radius: var(--radius-sm); border: 1px solid var(--border-medium); cursor: pointer;" />
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-add-subject" style="width: 100%;">+ Add Subject</button>
          </div>
        </div>

        <!-- RIGHT: TOPIC DETAILS & CONFIDENCE RATINGS -->
        <div class="card">
    `;

    if (!activeSubject) {
      html += `
          <div style="text-align: center; padding: 60px 20px;">
            <p class="text-muted">Create a subject on the left to begin organizing syllabus topics and confidence.</p>
          </div>
        </div>
      </div>
      `;
      container.innerHTML = html;
      this.bindSubjectEvents(container);
      return;
    }

    // Topic confidence count
    const lowCount = activeTopics.filter(t => t.confidence === 'LOW').length;
    const medCount = activeTopics.filter(t => t.confidence === 'MEDIUM').length;
    const highCount = activeTopics.filter(t => t.confidence === 'HIGH').length;

    html += `
          <div class="card-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="subject-color-swatch" style="background-color: ${activeSubject.color || '#2563EB'};"></span>
                <h3 style="color: var(--color-navy-950);">${activeSubject.name}</h3>
              </div>
              <p class="text-muted" style="margin-top: 2px;">Topic Details & Confidence Ratings</p>
            </div>
            <div style="display: flex; gap: 6px;">
              <span class="badge-confidence low">${lowCount} Weak</span>
              <span class="badge-confidence medium">${medCount} Medium</span>
              <span class="badge-confidence high">${highCount} Mastered</span>
            </div>
          </div>

          <!-- SIGNATURE FEATURE: KNOWLEDGE MOSAIC -->
          <div class="mosaic-container">
            <div style="width: 100%; font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--color-navy-400); letter-spacing: 0.05em; margin-bottom: 4px;">
              Syllabus Confidence Landscape
            </div>
    `;

    if (activeTopics.length === 0) {
      html += `<p class="text-muted" style="font-size: 13px; padding: 8px 0;">No topics added yet. Add syllabus topics below to visualize your mastery landscape.</p>`;
    } else {
      activeTopics.forEach(t => {
        const confClass = (t.confidence || 'MEDIUM').toLowerCase();
        html += `
          <div class="mosaic-tile badge-confidence ${confClass}">
            <span>${t.name}</span>
            <span style="font-size: 10px; opacity: 0.8;">• ${t.confidence}</span>
          </div>
        `;
      });
    }

    html += `
          </div>

          <!-- Inline Topic Creation Form -->
          <div style="background-color: var(--color-bg-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <h4 style="font-size: 13px; margin-bottom: 8px;">Add New Topic to ${activeSubject.name}</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <input type="text" id="new-topic-name" class="form-control" placeholder="e.g. Functions & Relations" style="flex: 2; min-width: 180px;" />
              <div class="conf-selector" style="flex: 1; min-width: 160px;">
                <button type="button" class="conf-pill-btn active" data-conf="LOW" id="topic-create-conf-low">Low</button>
                <button type="button" class="conf-pill-btn" data-conf="MEDIUM" id="topic-create-conf-med">Med</button>
                <button type="button" class="conf-pill-btn" data-conf="HIGH" id="topic-create-conf-high">High</button>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-add-topic" style="min-height: 44px;">Add Topic</button>
            </div>
          </div>

          <!-- List of Topics with Interactive Segmented Buttons -->
          <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--color-navy-800);">Current Topics (${activeTopics.length})</h4>
          <div class="topics-list">
    `;

    if (activeTopics.length === 0) {
      html += `<p class="text-muted">No topics created for this course yet.</p>`;
    } else {
      activeTopics.forEach(topic => {
        const conf = topic.confidence || 'MEDIUM';
        html += `
          <div class="topic-row-item">
            <div class="topic-name">${topic.name}</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="conf-selector">
                <button class="conf-pill-btn ${conf === 'LOW' ? 'active' : ''}" data-topic-id="${topic.id}" data-conf="LOW">Low</button>
                <button class="conf-pill-btn ${conf === 'MEDIUM' ? 'active' : ''}" data-topic-id="${topic.id}" data-conf="MEDIUM">Med</button>
                <button class="conf-pill-btn ${conf === 'HIGH' ? 'active' : ''}" data-topic-id="${topic.id}" data-conf="HIGH">High</button>
              </div>
              <button class="btn-danger-ghost btn-delete-topic" data-topic-id="${topic.id}" title="Remove topic">✕</button>
            </div>
          </div>
        `;
      });
    }

    html += `
          </div>

          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <span class="text-muted" style="font-size: 13px;">Changes are automatically saved to your browser.</span>
            <button class="btn btn-primary" data-route="view-daily-plan">SAVE & GENERATE DAILY PLAN</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.bindSubjectEvents(container);
  },

  bindSubjectEvents(container) {
    // Switch active subject
    container.querySelectorAll('.subject-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-subject')) return;
        this.selectedSubjectId = card.getAttribute('data-subject-id');
        this.renderSubjects();
      });
    });

    // Add subject
    const addSubjBtn = container.querySelector('#btn-add-subject');
    const subjNameInput = container.querySelector('#new-subject-name');
    const subjColorInput = container.querySelector('#new-subject-color');

    if (addSubjBtn && subjNameInput) {
      const handleAddSubject = () => {
        const name = subjNameInput.value.trim();
        if (!name) {
          alert('Please enter a subject name');
          return;
        }
        const color = subjColorInput ? subjColorInput.value : '#2563EB';
        const newSubj = StorageService.saveSubject({ name, color });
        this.selectedSubjectId = newSubj.id;
        this.showToast(`Subject "${name}" added`, 'success');
        this.renderSubjects();
      };

      addSubjBtn.addEventListener('click', handleAddSubject);
      subjNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddSubject();
      });
    }

    // Delete subject
    container.querySelectorAll('.btn-delete-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-subject-id');
        if (confirm('Delete this subject? This will also remove its associated topics and tasks.')) {
          StorageService.deleteSubject(id);
          this.selectedSubjectId = null;
          this.showToast('Subject deleted', 'info');
          this.renderSubjects();
          this.updateSidebarStats();
        }
      });
    });

    // Topic creation initial confidence selector toggle
    let chosenInitialConf = 'LOW';
    container.querySelectorAll('#topic-create-conf-low, #topic-create-conf-med, #topic-create-conf-high').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#topic-create-conf-low, #topic-create-conf-med, #topic-create-conf-high').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chosenInitialConf = btn.getAttribute('data-conf');
      });
    });

    // Add topic
    const addTopicBtn = container.querySelector('#btn-add-topic');
    const topicNameInput = container.querySelector('#new-topic-name');

    if (addTopicBtn && topicNameInput) {
      const handleAddTopic = () => {
        const name = topicNameInput.value.trim();
        if (!name) {
          alert('Please enter a topic name');
          return;
        }
        if (!this.selectedSubjectId) return;

        StorageService.saveTopic({
          subjectId: this.selectedSubjectId,
          name,
          confidence: chosenInitialConf
        });

        this.showToast(`Topic "${name}" added`, 'success');
        this.renderSubjects();
      };

      addTopicBtn.addEventListener('click', handleAddTopic);
      topicNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddTopic();
      });
    }

    // Toggle confidence on existing topic
    container.querySelectorAll('.topics-list .conf-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const topicId = btn.getAttribute('data-topic-id');
        const conf = btn.getAttribute('data-conf');
        StorageService.updateTopicConfidence(topicId, conf);
        this.showToast(`Confidence updated to ${conf}`, 'info');
        this.renderSubjects();
      });
    });

    // Delete topic
    container.querySelectorAll('.btn-delete-topic').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-topic-id');
        if (confirm('Delete this topic?')) {
          StorageService.deleteTopic(id);
          this.showToast('Topic deleted', 'info');
          this.renderSubjects();
        }
      });
    });
  },

  /* ==========================================================================
     SCREEN 2 & TASK MANAGEMENT
     ========================================================================== */
  renderTasks() {
    const container = document.getElementById('tasks-content');
    if (!container) return;

    const subjects = StorageService.getSubjects();
    const allTopics = StorageService.getTopics();
    const tasks = StorageService.getTasks();

    let filteredTasks = tasks;
    if (this.taskFilter === 'PENDING') {
      filteredTasks = tasks.filter(t => !t.isCompleted);
    } else if (this.taskFilter === 'COMPLETED') {
      filteredTasks = tasks.filter(t => t.isCompleted);
    }

    let html = `
      <div class="task-view-container">
        <div class="tasks-filter-bar">
          <div>
            <h2>Academic Tasks</h2>
            <p class="text-muted">Manage assignments, revision, and practice with deadlines and priorities.</p>
          </div>
          <button class="btn btn-primary" id="btn-toggle-add-task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Academic Task
          </button>
        </div>

        <!-- SCREEN 2: ADD ACADEMIC TASK FORM (CARD) -->
        <div class="card task-form-card" id="task-creation-container" style="display: none; margin-bottom: 28px;">
          <div class="card-header">
            <div>
              <h3>Add Academic Task</h3>
              <p class="text-muted" style="font-size: 13px;">Task details | New task</p>
            </div>
            <button class="btn-danger-ghost" id="btn-close-task-form">✕ Cancel</button>
          </div>

          <form id="task-create-form">
            <!-- 1. Task Name -->
            <div class="form-group">
              <label class="form-label" for="task-input-title">Task name *</label>
              <input type="text" id="task-input-title" class="form-control" placeholder="e.g. Complete Maths assignment" required />
            </div>

            <!-- 2. Subject -->
            <div class="form-group">
              <label class="form-label" for="task-input-subject">Subject *</label>
              <select id="task-input-subject" class="form-control" required>
                <option value="">Select a subject</option>
                ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>

            <!-- 3. Associated Topic -->
            <div class="form-group">
              <label class="form-label" for="task-input-topic">Topic (Optional)</label>
              <select id="task-input-topic" class="form-control">
                <option value="">General / No topic linked</option>
              </select>
            </div>

            <!-- 4. Task Type -->
            <div class="form-group">
              <label class="form-label" for="task-input-type">Task type</label>
              <select id="task-input-type" class="form-control">
                <option value="Assignment">Assignment</option>
                <option value="Revision">Revision</option>
                <option value="Practice">Practice</option>
              </select>
            </div>

            <!-- 5. Due Date -->
            <div class="form-group">
              <label class="form-label" for="task-input-date">Due date *</label>
              <input type="date" id="task-input-date" class="form-control" required />
            </div>

            <!-- 6. Estimated Time -->
            <div class="form-group">
              <label class="form-label" for="task-input-duration">Estimated time (minutes) * <span class="text-muted" style="font-size: 11px;">10 to 360 mins</span></label>
              <input type="number" id="task-input-duration" class="form-control" placeholder="e.g. 45" min="10" max="360" value="45" required />
            </div>

            <!-- 7. Importance -->
            <div class="form-group">
              <label class="form-label">Importance level</label>
              <div class="segmented-control" id="task-importance-group">
                <button type="button" class="segment-btn active" data-val="HIGH">High</button>
                <button type="button" class="segment-btn" data-val="MEDIUM">Medium</button>
                <button type="button" class="segment-btn" data-val="LOW">Low</button>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
              <button type="submit" class="btn btn-primary" style="flex: 1;">SAVE TASK</button>
              <button type="button" class="btn btn-secondary" id="btn-cancel-task-form">CANCEL</button>
            </div>
          </form>
        </div>

        <!-- Tasks Filter Tabs -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div class="segmented-control" style="max-width: 300px;">
            <button class="segment-btn ${this.taskFilter === 'ALL' ? 'active' : ''}" id="filter-all">All (${tasks.length})</button>
            <button class="segment-btn ${this.taskFilter === 'PENDING' ? 'active' : ''}" id="filter-pending">Pending (${tasks.filter(t => !t.isCompleted).length})</button>
            <button class="segment-btn ${this.taskFilter === 'COMPLETED' ? 'active' : ''}" id="filter-completed">Completed (${tasks.filter(t => t.isCompleted).length})</button>
          </div>
          <span class="text-muted" style="font-size: 13px;">Showing ${filteredTasks.length} task${filteredTasks.length === 1 ? '' : 's'}</span>
        </div>

        <!-- Task List Inventory -->
        <div class="tasks-list-grid">
    `;

    if (filteredTasks.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 48px;">
          <p class="text-muted" style="margin-bottom: 16px;">No tasks found matching this view.</p>
          <button class="btn btn-secondary btn-sm" id="btn-empty-add-task">+ Create First Task</button>
        </div>
      `;
    } else {
      filteredTasks.forEach(task => {
        const subject = StorageService.getSubjectById(task.subjectId);
        const topic = StorageService.getTopicById(task.topicId);
        const subjectColor = subject ? subject.color : '#2563EB';
        const subjectName = subject ? subject.name : 'General';
        const topicName = topic ? topic.name : 'General';
        const urgency = PrioritisationEngine.calculateUrgencyScore(task.dueDate);

        html += `
          <div class="task-card-item ${task.isCompleted ? 'completed' : ''}">
            <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
              <div class="task-checkbox ${task.isCompleted ? 'checked' : ''}" data-task-id="${task.id}" title="${task.isCompleted ? 'Mark incomplete' : 'Mark complete'}">
                ${task.isCompleted ? `
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ` : ''}
              </div>

              <div>
                <div class="task-card-title" style="font-weight: 600; color: var(--color-navy-900); font-size: 15px; margin-bottom: 4px;">
                  ${task.title}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge-subject">
                    <span class="badge-subject-dot" style="background-color: ${subjectColor};"></span>
                    ${subjectName}
                  </span>
                  <span class="text-muted" style="font-size: 12px;">• ${topicName}</span>
                  <span class="badge-importance ${(task.importance || 'MEDIUM').toLowerCase()}">${task.importance}</span>
                  <span class="duration-chip">${task.estimatedDuration}m</span>
                  <span class="rationale-tag ${urgency.score >= 85 ? 'due-soon' : ''}">Due: ${task.dueDate} (${urgency.label})</span>
                </div>

                <!-- SUBTASKS / CHECKLIST -->
                ${task.subtasks && task.subtasks.length > 0 ? `
                  <div class="subtasks-container">
                    <div class="subtasks-header">
                      <span>Actionable Steps (${task.subtasks.filter(s => s.isDone).length}/${task.subtasks.length})</span>
                      <span class="subtask-progress-mini">${Math.round(task.subtasks.filter(s => s.isDone).length / task.subtasks.length * 100)}% done</span>
                    </div>
                    <div>
                      ${task.subtasks.map(st => `
                        <div class="subtask-item-row">
                          <div class="subtask-checkbox ${st.isDone ? 'checked' : ''}" data-task-id="${task.id}" data-subtask-id="${st.id}">
                            ${st.isDone ? '✔' : ''}
                          </div>
                          <span class="subtask-text ${st.isDone ? 'checked' : ''}">${st.text}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Inline Quick Add Step -->
                <div class="subtask-add-row">
                  <input type="text" class="form-control subtask-mini-input input-add-subtask" placeholder="+ Add a step & hit Enter..." data-task-id="${task.id}" />
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              ${!task.isCompleted ? `
                <button class="btn btn-secondary btn-sm btn-focus-trigger" data-task-id="${task.id}">
                  Focus
                </button>
              ` : ''}
              <button class="btn-danger-ghost btn-delete-task" data-task-id="${task.id}" title="Delete task">
                ✕
              </button>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.bindTaskEvents(container);
  },

  bindTaskEvents(container) {
    const formCard = container.querySelector('#task-creation-container');
    const toggleBtn = container.querySelector('#btn-toggle-add-task');
    const closeBtn = container.querySelector('#btn-close-task-form');
    const cancelBtn = container.querySelector('#btn-cancel-task-form');
    const emptyAddBtn = container.querySelector('#btn-empty-add-task');

    const showForm = () => {
      if (formCard) {
        formCard.style.display = 'block';
        formCard.scrollIntoView({ behavior: 'smooth' });
      }
    };
    const hideForm = () => {
      if (formCard) formCard.style.display = 'none';
    };

    if (toggleBtn) toggleBtn.addEventListener('click', showForm);
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', showForm);
    if (closeBtn) closeBtn.addEventListener('click', hideForm);
    if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

    // Subject dropdown change -> populate dependent topics
    const subjectSelect = container.querySelector('#task-input-subject');
    const topicSelect = container.querySelector('#task-input-topic');

    if (subjectSelect && topicSelect) {
      subjectSelect.addEventListener('change', () => {
        const subjId = subjectSelect.value;
        const topics = StorageService.getTopicsBySubject(subjId);
        topicSelect.innerHTML = '<option value="">General / No topic linked</option>' +
          topics.map(t => `<option value="${t.id}">${t.name} (${t.confidence})</option>`).join('');
      });
    }

    // Set today as default due date
    const dateInput = container.querySelector('#task-input-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Importance segmented button toggle
    let chosenImportance = 'HIGH';
    container.querySelectorAll('#task-importance-group .segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#task-importance-group .segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chosenImportance = btn.getAttribute('data-val');
      });
    });

    // Form submit
    const form = container.querySelector('#task-create-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = container.querySelector('#task-input-title').value.trim();
        const subjectId = container.querySelector('#task-input-subject').value;
        const topicId = container.querySelector('#task-input-topic').value || null;
        const type = container.querySelector('#task-input-type').value;
        const dueDate = container.querySelector('#task-input-date').value;
        const duration = parseInt(container.querySelector('#task-input-duration').value, 10);

        if (!title || !subjectId || !dueDate || isNaN(duration)) {
          alert('Please fill all required fields');
          return;
        }

        StorageService.saveTask({
          title,
          subjectId,
          topicId,
          type,
          dueDate,
          estimatedDuration: duration,
          importance: chosenImportance
        });

        this.showToast(`Task "${title}" created`, 'success');
        hideForm();
        this.renderTasks();
        this.updateSidebarStats();
      });
    }

    // Checkbox completion toggle
    container.querySelectorAll('.task-checkbox').forEach(box => {
      box.addEventListener('click', () => {
        const id = box.getAttribute('data-task-id');
        const task = StorageService.toggleTaskCompletion(id);
        if (task && task.isCompleted) {
          this.triggerConfetti();
          this.showToast('Task marked complete! Great progress.', 'success');
        }
        this.renderTasks();
        this.updateSidebarStats();
      });
    });

    // Subtask checkbox toggling
    container.querySelectorAll('.subtask-checkbox').forEach(box => {
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = box.getAttribute('data-task-id');
        const stId = box.getAttribute('data-subtask-id');
        const result = StorageService.toggleSubtask(taskId, stId);
        if (result && result.subtask.isDone) {
          this.showToast(`Step "${result.subtask.text}" checked off!`, 'success');
        }
        this.renderTasks();
      });
    });

    // Subtask quick add on Enter
    container.querySelectorAll('.input-add-subtask').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const taskId = input.getAttribute('data-task-id');
          const text = input.value.trim();
          if (text) {
            StorageService.addSubtask(taskId, text);
            this.showToast('Step added', 'info');
            this.renderTasks();
          }
        }
      });
    });

    // Delete task
    container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-task-id');
        if (confirm('Delete this task?')) {
          StorageService.deleteTask(id);
          this.showToast('Task removed', 'info');
          this.renderTasks();
          this.updateSidebarStats();
        }
      });
    });

    // Focus triggers
    container.querySelectorAll('.btn-focus-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-task-id');
        this.openFocusCockpit(id);
      });
    });

    // Filters
    const fAll = container.querySelector('#filter-all');
    const fPending = container.querySelector('#filter-pending');
    const fCompleted = container.querySelector('#filter-completed');

    if (fAll) fAll.addEventListener('click', () => { this.taskFilter = 'ALL'; this.renderTasks(); });
    if (fPending) fPending.addEventListener('click', () => { this.taskFilter = 'PENDING'; this.renderTasks(); });
    if (fCompleted) fCompleted.addEventListener('click', () => { this.taskFilter = 'COMPLETED'; this.renderTasks(); });
  },

  /* ==========================================================================
     SCREEN 4: DAILY PRIORITISED PLAN & WHAT-IF DYNAMIC BUDGET SLIDER
     ========================================================================== */
  renderDailyPlan() {
    const container = document.getElementById('daily-plan-content');
    if (!container) return;

    const allTasks = StorageService.getTasks();
    const allTopics = StorageService.getTopics();
    let currentPlan = StorageService.getDailyPlan();

    // Default to 120 minutes if no plan exists yet
    let availableMinutes = currentPlan ? currentPlan.availableTimeMinutes : 120;

    // Recalculate plan dynamically
    currentPlan = PrioritisationEngine.generateDailyPlan(availableMinutes, allTasks, allTopics);
    StorageService.saveDailyPlan(currentPlan);

    const planned = currentPlan.plannedTasks || [];
    const deferred = currentPlan.deferredTasks || [];
    const allocated = currentPlan.totalAllocatedMinutes || 0;
    const remaining = currentPlan.remainingTimeMinutes || 0;
    const fillPercent = Math.min(100, Math.round((allocated / availableMinutes) * 100));

    let html = `
      <div style="max-width: 900px; margin: 0 auto;">
        <!-- Header Summary Card -->
        <div class="plan-hero-card">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <div>
              <h2>TODAY'S STUDY PLAN</h2>
              <p class="text-muted">Daily plan | Recommended order based on deadlines, importance, and weak topics</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="btn-recalculate-plan">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                REGENERATE PLAN
              </button>
            </div>
          </div>

          <!-- SIGNATURE FEATURE: "WHAT-IF" DYNAMIC TIME BUDGET SLIDER -->
          <div class="budget-slider-box">
            <div class="budget-slider-header">
              <span style="font-size: 13px; font-weight: 600; color: var(--color-navy-800);">Available Study Time Budget:</span>
              <span id="slider-budget-display" style="font-size: 16px; font-weight: 700; color: var(--color-blue-primary);">${availableMinutes} minutes</span>
            </div>
            <input type="range" class="budget-slider" id="plan-time-slider" min="30" max="360" step="15" value="${availableMinutes}" />

            <div class="preset-pills-row">
              <span class="text-muted" style="font-size: 11px; align-self: center;">Quick Presets:</span>
              <button class="preset-pill ${availableMinutes === 60 ? 'active' : ''}" data-preset="60">60 min</button>
              <button class="preset-pill ${availableMinutes === 90 ? 'active' : ''}" data-preset="90">90 min</button>
              <button class="preset-pill ${availableMinutes === 120 ? 'active' : ''}" data-preset="120">120 min</button>
              <button class="preset-pill ${availableMinutes === 180 ? 'active' : ''}" data-preset="180">180 min</button>
              <button class="preset-pill ${availableMinutes === 240 ? 'active' : ''}" data-preset="240">240 min</button>
            </div>
          </div>

          <!-- Visual Time Allocation Progress Bar -->
          <div style="margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              <span>Allocated: ${allocated}m / ${availableMinutes}m (${fillPercent}%)</span>
              <span style="color: ${remaining > 0 ? '#10B981' : 'var(--color-navy-600)'};">${remaining}m buffer remaining</span>
            </div>
            <div class="meter-container">
              <div class="meter-fill" style="width: ${fillPercent}%;"></div>
            </div>
          </div>
        </div>

        <!-- Plan Actions -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
          ${planned.length > 0 ? `
            <button class="btn btn-primary" id="btn-start-first-task">
              ▶ START FIRST TASK
            </button>
          ` : ''}
          <button class="btn btn-secondary" data-route="view-tasks">+ Add More Tasks</button>
        </div>

        <!-- Ranked Study Queue Cards -->
        <div class="section-header">
          <h3>Scheduled Queue (${planned.length} Tasks)</h3>
        </div>
    `;

    if (planned.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 48px; margin-bottom: 24px;">
          <h3 style="color: var(--color-navy-800); margin-bottom: 8px;">No tasks fit in this study window</h3>
          <p class="text-muted" style="margin-bottom: 16px;">Try increasing your available study minutes with the slider above, or add new tasks.</p>
          <button class="btn btn-primary btn-sm" data-route="view-tasks">Add Tasks</button>
        </div>
      `;
    } else {
      planned.forEach(item => {
        const subject = StorageService.getSubjectById(item.subjectId);
        const topic = StorageService.getTopicById(item.topicId);
        const subjectColor = subject ? subject.color : '#2563EB';
        const subjectName = subject ? subject.name : 'General';
        const topicName = topic ? topic.name : 'General';

        html += `
          <div class="queue-card ${item.rank === 1 ? 'rank-1' : ''}" id="queue-item-${item.id}">
            <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
              <div class="priority-rank-badge" style="background-color: ${item.rank === 1 ? 'var(--color-blue-primary)' : 'var(--color-navy-900)'};">
                ${item.rank}.
              </div>

              <div>
                <div style="font-size: 16px; font-weight: 700; color: var(--color-navy-950); margin-bottom: 4px;">
                  ${item.title}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge-subject">
                    <span class="badge-subject-dot" style="background-color: ${subjectColor};"></span>
                    ${subjectName}
                  </span>
                  <span class="text-muted" style="font-size: 12px;">• ${topicName}</span>
                  <span class="duration-chip">${item.allocatedMinutes} min</span>
                  <span class="badge-importance ${(item.importance || 'MEDIUM').toLowerCase()}">${item.importance}</span>
                  ${item.rationaleTags ? item.rationaleTags.map(tag => `<span class="rationale-tag ${tag.type}">${tag.text}</span>`).join('') : ''}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <button class="btn btn-primary btn-sm btn-focus-trigger" data-task-id="${item.id}">
                ${item.rank === 1 ? '⚡ Study Now' : 'Focus'}
              </button>
            </div>
          </div>
        `;
      });
    }

    // Deferred Tasks Section
    if (deferred.length > 0) {
      html += `
        <div style="margin-top: 36px;">
          <div class="section-header">
            <h3 style="color: var(--color-navy-600); font-size: 16px;">Scheduled for Next Session (${deferred.length} Deferred)</h3>
          </div>
          <p class="text-muted" style="margin-bottom: 12px; font-size: 13px;">These tasks carry high priority but exceeded today's remaining time budget.</p>
      `;

      deferred.forEach(item => {
        const subject = StorageService.getSubjectById(item.subjectId);
        const subjectName = subject ? subject.name : 'General';
        html += `
          <div class="card" style="padding: 14px 18px; margin-bottom: 10px; background-color: var(--color-bg-subtle); border-color: var(--border-light); opacity: 0.85;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: var(--color-navy-800); font-size: 14px;">${item.title}</div>
                <div style="font-size: 12px; color: var(--color-navy-600); margin-top: 2px;">
                  ${subjectName} • ${item.estimatedDuration}m • <span style="color: #B45309;">${item.deferReason}</span>
                </div>
              </div>
              <span class="rationale-tag">Next Session</span>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
    this.bindDailyPlanEvents(container, currentPlan);
  },

  bindDailyPlanEvents(container, plan) {
    // Slider live adjustment
    const slider = container.querySelector('#plan-time-slider');
    const display = container.querySelector('#slider-budget-display');

    if (slider && display) {
      slider.addEventListener('input', () => {
        display.textContent = `${slider.value} minutes`;
      });

      slider.addEventListener('change', () => {
        const val = parseInt(slider.value, 10);
        const allTasks = StorageService.getTasks();
        const allTopics = StorageService.getTopics();
        const newPlan = PrioritisationEngine.generateDailyPlan(val, allTasks, allTopics);
        StorageService.saveDailyPlan(newPlan);
        this.renderDailyPlan();
        this.updateSidebarStats();
      });
    }

    // Preset pills
    container.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const val = parseInt(pill.getAttribute('data-preset'), 10);
        const allTasks = StorageService.getTasks();
        const allTopics = StorageService.getTopics();
        const newPlan = PrioritisationEngine.generateDailyPlan(val, allTasks, allTopics);
        StorageService.saveDailyPlan(newPlan);
        this.renderDailyPlan();
        this.updateSidebarStats();
      });
    });

    // Start First Task CTA
    const startFirstBtn = container.querySelector('#btn-start-first-task');
    if (startFirstBtn && plan.plannedTasks && plan.plannedTasks.length > 0) {
      startFirstBtn.addEventListener('click', () => {
        this.openFocusCockpit(plan.plannedTasks[0].id);
      });
    }

    // Recalculate CTA
    const recalcBtn = container.querySelector('#btn-recalculate-plan');
    if (recalcBtn) {
      recalcBtn.addEventListener('click', () => {
        this.showToast('Daily plan refreshed with latest confidence and deadlines', 'info');
        this.renderDailyPlan();
      });
    }

    // Focus triggers
    container.querySelectorAll('.btn-focus-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-task-id');
        this.openFocusCockpit(taskId);
      });
    });
  },

  /* ==========================================================================
     SCREEN 5: TASK PROGRESS & FOCUS COCKPIT (INTERACTIVE TIMER + AMBIENT AUDIO)
     ========================================================================== */
  openFocusCockpit(taskId) {
    this.activeFocusTaskId = taskId;
    const task = StorageService.getTaskById(taskId);
    if (!task) return;

    const modal = document.getElementById('modal-focus');
    const container = document.getElementById('focus-modal-content');
    if (!modal || !container) return;

    // Reset any running timer
    if (this.timerState.interval) {
      clearInterval(this.timerState.interval);
    }
    const initialMinutes = parseInt(task.estimatedDuration || 25, 10);
    this.timerState = {
      interval: null,
      remainingSeconds: initialMinutes * 60,
      totalSeconds: initialMinutes * 60,
      elapsedSeconds: 0,
      isRunning: false
    };

    const subject = StorageService.getSubjectById(task.subjectId);
    const topic = StorageService.getTopicById(task.topicId);
    const subjectName = subject ? subject.name : 'General Course';
    const topicName = topic ? topic.name : 'General';
    const currentConf = topic ? topic.confidence : 'MEDIUM';

    const formatTimer = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const CIRCUMFERENCE = 477.5; // 2 * PI * 76

    let html = `
      <div class="focus-cockpit">
        <div>
          <span class="badge-subject" style="margin-bottom: 8px;">
            <span class="badge-subject-dot" style="background-color: ${subject ? subject.color : '#2563EB'};"></span>
            ${subjectName}
          </span>
          <h2 style="font-size: 1.4rem; margin-top: 4px;">${task.title}</h2>
          <p class="text-muted" style="font-size: 13px;">${topicName} • Planned: ${initialMinutes}m</p>
        </div>

        <!-- SVG Circular Focus Countdown Meter -->
        <div class="timer-circle-wrapper">
          <svg class="timer-svg" viewBox="0 0 180 180">
            <circle class="timer-circle-bg" cx="90" cy="90" r="76"></circle>
            <circle class="timer-circle-progress" id="timer-progress-ring" cx="90" cy="90" r="76" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"></circle>
          </svg>
          <div class="timer-center-content">
            <div class="timer-display-digits" id="timer-display-text">${formatTimer(this.timerState.remainingSeconds)}</div>
            <div class="timer-status-badge" id="timer-status-badge">Ready to Focus</div>
          </div>
        </div>

        <!-- Timer Controls Row -->
        <div class="timer-controls-row">
          <button type="button" class="btn btn-timer-primary" id="btn-timer-toggle">
            ▶ Start Timer
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-timer-reset" title="Reset timer">
            ↺ Reset
          </button>
        </div>

        <!-- Ambient Sound Generator Bar -->
        <div class="ambient-audio-bar">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-navy-600); text-transform: uppercase;">Audio:</span>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="ambient-pill-btn active" data-ambient="MUTE">🔇 Mute</button>
            <button type="button" class="ambient-pill-btn" data-ambient="RAIN">🌧️ Rain</button>
            <button type="button" class="ambient-pill-btn" data-ambient="WAVES">🌊 Waves</button>
            <button type="button" class="ambient-pill-btn" data-ambient="WHITE_NOISE">💨 White Noise</button>
          </div>
        </div>

        <!-- Actionable Subtask Steps Checklist in Cockpit -->
        ${task.subtasks && task.subtasks.length > 0 ? `
          <div style="width: 100%; max-width: 400px; text-align: left; background: var(--color-bg-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-light); margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: var(--color-navy-600); text-transform: uppercase; margin-bottom: 8px;">
              <span>Focus Checklist Steps</span>
              <span style="color: var(--color-blue-primary);" id="cockpit-subtask-progress">${task.subtasks.filter(s => s.isDone).length}/${task.subtasks.length} Done</span>
            </div>
            <div id="cockpit-subtasks-list">
              ${task.subtasks.map(st => `
                <div class="subtask-item-row" style="padding: 3px 0;">
                  <div class="subtask-checkbox cockpit-subtask-box ${st.isDone ? 'checked' : ''}" data-task-id="${task.id}" data-subtask-id="${st.id}">
                    ${st.isDone ? '✔' : ''}
                  </div>
                  <span class="subtask-text ${st.isDone ? 'checked' : ''}">${st.text}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="width: 100%; max-width: 400px; text-align: left; margin-top: 4px;">
          <!-- Actual Time Spent -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" for="focus-actual-time">
              <span>Actual Time Logged (minutes):</span>
              <span class="text-caption" id="focus-live-mins">Tracking...</span>
            </label>
            <input type="number" id="focus-actual-time" class="form-control" value="${initialMinutes}" min="1" max="480" />
          </div>

          <!-- Update Topic Confidence Post-Study -->
          ${topic ? `
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Confidence after this session:</label>
              <div class="conf-selector" id="focus-conf-selector" style="width: 100%;">
                <button type="button" class="conf-pill-btn ${currentConf === 'LOW' ? 'active' : ''}" data-conf="LOW" style="flex: 1;">Low</button>
                <button type="button" class="conf-pill-btn ${currentConf === 'MEDIUM' ? 'active' : ''}" data-conf="MEDIUM" style="flex: 1;">Medium</button>
                <button type="button" class="conf-pill-btn ${currentConf === 'HIGH' ? 'active' : ''}" data-conf="HIGH" style="flex: 1;">High</button>
              </div>
            </div>
          ` : ''}

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-primary" id="btn-focus-complete" style="width: 100%;">
              ✔ MARK AS COMPLETE & RECORD PROGRESS
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-focus-close" style="width: 100%;">
              Back to Plan
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    modal.classList.add('active');

    const timerDisplay = container.querySelector('#timer-display-text');
    const timerStatus = container.querySelector('#timer-status-badge');
    const timerProgress = container.querySelector('#timer-progress-ring');
    const timerToggleBtn = container.querySelector('#btn-timer-toggle');
    const timerResetBtn = container.querySelector('#btn-timer-reset');
    const actualTimeInput = container.querySelector('#focus-actual-time');
    const liveMinsCaption = container.querySelector('#focus-live-mins');

    const updateTimerUI = () => {
      timerDisplay.textContent = formatTimer(this.timerState.remainingSeconds);
      const ratio = Math.max(0, this.timerState.remainingSeconds / this.timerState.totalSeconds);
      const offset = CIRCUMFERENCE * (1 - ratio);
      timerProgress.style.strokeDashoffset = offset;

      const mins = Math.max(1, Math.round(this.timerState.elapsedSeconds / 60));
      if (this.timerState.elapsedSeconds > 0) {
        actualTimeInput.value = mins;
        liveMinsCaption.textContent = `${mins}m elapsed`;
      }
    };

    // Start / Pause Timer
    timerToggleBtn.addEventListener('click', () => {
      if (this.timerState.isRunning) {
        // PAUSE
        clearInterval(this.timerState.interval);
        this.timerState.isRunning = false;
        timerToggleBtn.textContent = '▶ Resume Timer';
        timerToggleBtn.classList.remove('running');
        timerStatus.textContent = 'Paused';
      } else {
        // START / RESUME
        this.timerState.isRunning = true;
        timerToggleBtn.textContent = '⏸ Pause Timer';
        timerToggleBtn.classList.add('running');
        timerStatus.textContent = 'Focusing...';

        this.timerState.interval = setInterval(() => {
          if (this.timerState.remainingSeconds > 0) {
            this.timerState.remainingSeconds--;
            this.timerState.elapsedSeconds++;
            updateTimerUI();
          } else {
            // FINISHED!
            clearInterval(this.timerState.interval);
            this.timerState.isRunning = false;
            timerToggleBtn.textContent = '▶ Start Timer';
            timerToggleBtn.classList.remove('running');
            timerStatus.textContent = 'Time Up!';

            AudioSynth.stop();
            AudioSynth.playChime();
            this.triggerConfetti();
            this.showToast('Study block completed! Awesome focus session.', 'success');
          }
        }, 1000);
      }
    });

    // Reset Timer
    timerResetBtn.addEventListener('click', () => {
      if (this.timerState.interval) clearInterval(this.timerState.interval);
      this.timerState.isRunning = false;
      this.timerState.remainingSeconds = initialMinutes * 60;
      this.timerState.elapsedSeconds = 0;
      timerToggleBtn.textContent = '▶ Start Timer';
      timerToggleBtn.classList.remove('running');
      timerStatus.textContent = 'Ready to Focus';
      updateTimerUI();
    });

    // Ambient Audio Buttons
    container.querySelectorAll('.ambient-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.ambient-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const soundType = btn.getAttribute('data-ambient');
        AudioSynth.play(soundType);
      });
    });

    // Post-study confidence selector
    let selectedPostConf = currentConf;
    container.querySelectorAll('#focus-conf-selector .conf-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#focus-conf-selector .conf-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPostConf = btn.getAttribute('data-conf');
      });
    });

    // Cockpit subtask checklist toggles
    container.querySelectorAll('.cockpit-subtask-box').forEach(box => {
      box.addEventListener('click', () => {
        const tId = box.getAttribute('data-task-id');
        const stId = box.getAttribute('data-subtask-id');
        const result = StorageService.toggleSubtask(tId, stId);
        if (result) {
          box.classList.toggle('checked', result.subtask.isDone);
          box.innerHTML = result.subtask.isDone ? '✔' : '';
          const textEl = box.nextElementSibling;
          if (textEl) textEl.classList.toggle('checked', result.subtask.isDone);

          const updatedTask = StorageService.getTaskById(tId);
          const progEl = container.querySelector('#cockpit-subtask-progress');
          if (progEl && updatedTask && updatedTask.subtasks) {
            const doneCount = updatedTask.subtasks.filter(s => s.isDone).length;
            progEl.textContent = `${doneCount}/${updatedTask.subtasks.length} Done`;
          }
        }
      });
    });

    const cleanupModal = () => {
      if (this.timerState.interval) clearInterval(this.timerState.interval);
      this.timerState.isRunning = false;
      AudioSynth.stop();
      modal.classList.remove('active');
    };

    // Mark complete action
    const completeBtn = container.querySelector('#btn-focus-complete');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        const timeSpent = parseInt(actualTimeInput.value, 10) || initialMinutes;
        StorageService.recordStudySession(taskId, timeSpent, selectedPostConf);

        AudioSynth.playChime();
        this.triggerConfetti();
        this.showToast(`Completed "${task.title}"! Study log recorded.`, 'success');

        cleanupModal();
        this.switchView('view-daily-plan');
      });
    }

    // Close action
    const closeBtn = container.querySelector('#btn-focus-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', cleanupModal);
    }
  },

  /* ==========================================================================
     SCREEN 6: PROGRESS OVERVIEW
     ========================================================================== */
  renderProgress() {
    const container = document.getElementById('progress-content');
    if (!container) return;

    const progress = StorageService.getProgress();
    const tasks = StorageService.getTasks();
    const subjects = StorageService.getSubjects();
    const topics = StorageService.getTopics();

    const completedTasks = tasks.filter(t => t.isCompleted);
    const pendingTasks = tasks.filter(t => !t.isCompleted);
    const totalMinutes = progress.totalMinutesStudied || 0;

    let html = `
      <div style="max-width: 960px; margin: 0 auto;">
        <div class="section-header">
          <div>
            <h2>My Academic Progress</h2>
            <p class="text-muted">Review completed work, study hours logged, and subject-wise mastery.</p>
          </div>
          <button class="btn btn-primary btn-sm" data-route="view-daily-plan">Plan Next Session →</button>
        </div>

        <!-- This Week's Overview Widgets -->
        <div class="stats-summary-grid">
          <div class="stat-widget">
            <span class="text-muted" style="font-size: 13px; font-weight: 600;">Tasks Completed</span>
            <div class="stat-widget-num" style="color: #10B981;">${completedTasks.length}</div>
            <span class="text-caption">Finished assignments & revisions</span>
          </div>

          <div class="stat-widget">
            <span class="text-muted" style="font-size: 13px; font-weight: 600;">Tasks Pending</span>
            <div class="stat-widget-num" style="color: var(--color-blue-primary);">${pendingTasks.length}</div>
            <span class="text-caption">Scheduled in queue</span>
          </div>

          <div class="stat-widget">
            <span class="text-muted" style="font-size: 13px; font-weight: 600;">Total Study Time</span>
            <div class="stat-widget-num">${totalMinutes}m</div>
            <span class="text-caption">${Math.round(totalMinutes / 60 * 10) / 10} hours logged</span>
          </div>
        </div>

        <!-- Subject Progress Breakdown -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px;">Subject-wise Confidence & Progress</h3>
    `;

    if (subjects.length === 0) {
      html += `<p class="text-muted">No subjects registered.</p>`;
    } else {
      subjects.forEach(subj => {
        const subjTopics = topics.filter(t => t.subjectId === subj.id);
        const subjTasks = tasks.filter(t => t.subjectId === subj.id);
        const completedSubjTasks = subjTasks.filter(t => t.isCompleted);
        const highConfCount = subjTopics.filter(t => t.confidence === 'HIGH').length;

        html += `
          <div style="padding: 16px; border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: 12px; background: #FFFFFF;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="subject-color-swatch" style="background-color: ${subj.color || '#2563EB'};"></span>
                <span style="font-weight: 700; color: var(--color-navy-950);">${subj.name}</span>
              </div>
              <span class="text-muted" style="font-size: 12px;">${completedSubjTasks.length} / ${subjTasks.length} tasks complete</span>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="duration-chip">${subjTopics.length} topics total</span>
              <span class="badge-confidence high">${highConfCount} mastered topics</span>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>

        <!-- Next Actions -->
        <div class="card" style="text-align: center; padding: 32px;">
          <h3 style="margin-bottom: 8px;">Ready for your next study block?</h3>
          <p class="text-muted" style="margin-bottom: 20px;">Keep momentum by setting today's study minutes and tackling high-priority tasks.</p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-secondary" data-route="view-tasks">VIEW PENDING TASKS</button>
            <button class="btn btn-primary" data-route="view-daily-plan">CREATE TODAY'S PLAN</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
};
