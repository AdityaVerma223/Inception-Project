/**
 * PANORAMA — Unified Data Store Facade (js/data/store.js)
 * 
 * Single source of truth for all data interactions.
 * - Routes authenticated users to Supabase with offline caching.
 * - Routes guests to partitioned localStorage (StorageService).
 * - Implements optimistic UI updates with rollback and toast on network error.
 * - Caches last good state in localStorage (panorama_offline_cache) with read-only offline fallback.
 * - Listens for online/offline events to manage #offline-banner.
 * - Provides guest-to-account one-time data import.
 * - Provides "Delete all my data" for self-service privacy compliance.
 * - Exposes both synchronous UI methods (getSubjects, getTasks, saveTask, etc.) and async methods (listSubjects, addTask, etc.).
 */

const Store = (() => {
  const CACHE_KEY = 'panorama_offline_cache';

  // In-memory working state
  let memoryCache = {
    subjects: [],
    topics: [],
    tasks: [],
    progress: { completedCount: 0, totalMinutesStudied: 0, sessions: [] },
    settings: { theme: 'dark', accent: '#2563EB', default_minutes: 120 },
    dailyPlan: null,
    isReadOnly: false,
    initialized: false
  };

  // ---------------------------------------------------------------------------
  // HELPERS: Normalization between Supabase DB rows and UI camelCase models
  // ---------------------------------------------------------------------------

  function normalizeSubjectFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function normalizeTopicFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      confidence: (row.confidence || 'medium').toUpperCase(),
      updatedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function normalizeTaskFromDb(row) {
    if (!row) return null;
    const typeMap = { assignment: 'Assignment', quiz: 'Quiz', revision: 'Revision', practice: 'Practice' };
    const importanceMap = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };

    return {
      id: row.id,
      title: row.title,
      subjectId: row.subject_id,
      topicId: row.topic_id,
      type: typeMap[row.type] || 'Assignment',
      dueDate: row.due_date,
      estimatedDuration: parseInt(row.est_min || 30, 10),
      est_min: parseInt(row.est_min || 30, 10),
      importance: importanceMap[row.importance] || 'MEDIUM',
      isCompleted: row.status === 'done',
      status: row.status,
      subtasks: Array.isArray(row.steps) ? row.steps : [],
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  // ---------------------------------------------------------------------------
  // CACHE PERSISTENCE & OFFLINE BANNER
  // ---------------------------------------------------------------------------

  function saveToOfflineCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        subjects: memoryCache.subjects,
        topics: memoryCache.topics,
        tasks: memoryCache.tasks,
        progress: memoryCache.progress,
        settings: memoryCache.settings,
        dailyPlan: memoryCache.dailyPlan,
        cachedAt: Date.now()
      }));
    } catch (e) {
      console.warn('[PANORAMA Store] Failed to save offline cache:', e);
    }
  }

  function loadFromOfflineCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCache.subjects = parsed.subjects || [];
        memoryCache.topics = parsed.topics || [];
        memoryCache.tasks = parsed.tasks || [];
        memoryCache.progress = parsed.progress || { completedCount: 0, totalMinutesStudied: 0, sessions: [] };
        memoryCache.settings = parsed.settings || { theme: 'dark', accent: '#2563EB', default_minutes: 120 };
        memoryCache.dailyPlan = parsed.dailyPlan || null;
      }
    } catch (e) {
      console.warn('[PANORAMA Store] Failed to load offline cache:', e);
    }
  }

  function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;

    if (!navigator.onLine || memoryCache.isReadOnly) {
      banner.style.display = 'flex';
      banner.setAttribute('aria-hidden', 'false');
    } else {
      banner.style.display = 'none';
      banner.setAttribute('aria-hidden', 'true');
    }
  }

  function showToast(message, type = 'info') {
    if (typeof UIController !== 'undefined' && UIController.showToast) {
      UIController.showToast(message, type);
    } else {
      console.log(`[Toast ${type}] ${message}`);
    }
  }

  function isGuestMode() {
    return AuthService.isGuest();
  }

  function getSupabase() {
    return AuthService.getClient();
  }

  function getUserId() {
    const user = AuthService.getUser();
    return user ? user.id : null;
  }

  return {
    async init() {
      loadFromOfflineCache();

      // Listen for network state changes
      window.addEventListener('online', () => {
        memoryCache.isReadOnly = false;
        updateOfflineBanner();
        showToast('Back online. Synchronizing data...', 'success');
        this.syncFromRemote();
      });

      window.addEventListener('offline', () => {
        memoryCache.isReadOnly = true;
        updateOfflineBanner();
        showToast('Network disconnected. Operating in read-only offline mode.', 'warning');
      });

      updateOfflineBanner();

      // Sync if authenticated and online
      if (!isGuestMode() && AuthService.isAuthenticated() && navigator.onLine) {
        await this.syncFromRemote();
      }
      memoryCache.initialized = true;
    },

    isOffline() {
      return !navigator.onLine || memoryCache.isReadOnly;
    },

    isGuest() {
      return isGuestMode();
    },

    // Refresh memory cache from Supabase
    async syncFromRemote() {
      if (isGuestMode() || !AuthService.isAuthenticated() || !navigator.onLine) return;
      const client = getSupabase();
      if (!client) return;

      try {
        const [subjRes, topRes, taskRes, sessRes, setRes] = await Promise.all([
          client.from('subjects').select('*').order('created_at', { ascending: true }),
          client.from('topics').select('*').order('created_at', { ascending: true }),
          client.from('tasks').select('*').order('due_date', { ascending: true }),
          client.from('study_sessions').select('*').order('created_at', { ascending: false }),
          client.from('user_settings').select('*').single()
        ]);

        if (subjRes.data) memoryCache.subjects = subjRes.data.map(normalizeSubjectFromDb);
        if (topRes.data) memoryCache.topics = topRes.data.map(normalizeTopicFromDb);
        if (taskRes.data) memoryCache.tasks = taskRes.data.map(normalizeTaskFromDb);

        if (sessRes.data) {
          const sessions = sessRes.data.map(s => ({
            id: s.id,
            taskId: s.task_id,
            minutesSpent: s.minutes,
            sessionDate: s.session_date,
            timestamp: new Date(s.created_at).getTime()
          }));
          const totalMinutes = sessions.reduce((sum, s) => sum + s.minutesSpent, 0);
          const completedCount = memoryCache.tasks.filter(t => t.isCompleted).length;
          memoryCache.progress = { completedCount, totalMinutesStudied: totalMinutes, sessions };
        }

        if (setRes.data) {
          memoryCache.settings = {
            theme: setRes.data.theme || 'dark',
            accent: setRes.data.accent || '#2563EB',
            default_minutes: setRes.data.default_minutes || 120
          };
        }

        memoryCache.isReadOnly = false;
        saveToOfflineCache();
      } catch (err) {
        console.warn('[PANORAMA Store] Remote sync error, using cache:', err);
        memoryCache.isReadOnly = true;
        updateOfflineBanner();
      }
    },

    // =========================================================================
    // SUBJECTS (Sync + Async Support)
    // =========================================================================

    getSubjects() {
      if (isGuestMode()) return StorageService.getSubjects();
      return memoryCache.subjects;
    },

    async listSubjects() {
      if (isGuestMode()) return StorageService.getSubjects();
      if (this.isOffline() || memoryCache.subjects.length > 0) return [...memoryCache.subjects];
      await this.syncFromRemote();
      return [...memoryCache.subjects];
    },

    getSubjectById(id) {
      if (isGuestMode()) return StorageService.getSubjectById(id);
      return memoryCache.subjects.find(s => s.id === id) || null;
    },

    saveSubject(subject) {
      if (isGuestMode()) return StorageService.saveSubject(subject);

      if (this.isOffline()) {
        showToast('Cannot add/edit subjects while offline.', 'error');
        return subject;
      }

      const client = getSupabase();
      const userId = getUserId();
      const isNew = !subject.id || subject.id.startsWith('subj-');

      if (isNew) {
        const tempId = `subj-${Date.now()}`;
        const newObj = {
          id: tempId,
          name: subject.name,
          color: subject.color || '#2563EB',
          createdAt: Date.now()
        };
        const prevSubjects = [...memoryCache.subjects];
        memoryCache.subjects.push(newObj);
        saveToOfflineCache();

        // Async Push to Supabase
        if (client && userId) {
          client.from('subjects').insert({
            user_id: userId,
            name: subject.name,
            color: subject.color || '#2563EB'
          }).select().single().then(({ data, error }) => {
            if (error) {
              memoryCache.subjects = prevSubjects;
              saveToOfflineCache();
              showToast(`Failed to save subject: ${error.message}`, 'error');
            } else if (data) {
              const realSubject = normalizeSubjectFromDb(data);
              const idx = memoryCache.subjects.findIndex(s => s.id === tempId);
              if (idx !== -1) memoryCache.subjects[idx] = realSubject;
              saveToOfflineCache();
            }
          }).catch(err => {
            memoryCache.subjects = prevSubjects;
            saveToOfflineCache();
            showToast(`Subject save error: ${err.message}`, 'error');
          });
        }
        return newObj;
      } else {
        // Update existing
        const idx = memoryCache.subjects.findIndex(s => s.id === subject.id);
        const prevSubjects = [...memoryCache.subjects];
        if (idx !== -1) {
          memoryCache.subjects[idx] = { ...memoryCache.subjects[idx], ...subject };
          saveToOfflineCache();
        }

        if (client) {
          client.from('subjects').update({
            name: subject.name,
            color: subject.color
          }).eq('id', subject.id).then(({ error }) => {
            if (error) {
              memoryCache.subjects = prevSubjects;
              saveToOfflineCache();
              showToast(`Failed to update subject: ${error.message}`, 'error');
            }
          });
        }
        return memoryCache.subjects[idx] || subject;
      }
    },

    deleteSubject(id) {
      if (isGuestMode()) return StorageService.deleteSubject(id);

      if (this.isOffline()) {
        showToast('Cannot delete subject while offline.', 'error');
        return false;
      }

      const client = getSupabase();
      const prevSubjects = [...memoryCache.subjects];
      const prevTopics = [...memoryCache.topics];
      const prevTasks = [...memoryCache.tasks];

      memoryCache.subjects = memoryCache.subjects.filter(s => s.id !== id);
      memoryCache.topics = memoryCache.topics.filter(t => t.subjectId !== id);
      memoryCache.tasks = memoryCache.tasks.filter(t => t.subjectId !== id);
      saveToOfflineCache();

      if (client) {
        client.from('subjects').delete().eq('id', id).then(({ error }) => {
          if (error) {
            memoryCache.subjects = prevSubjects;
            memoryCache.topics = prevTopics;
            memoryCache.tasks = prevTasks;
            saveToOfflineCache();
            showToast(`Failed to delete subject: ${error.message}`, 'error');
          }
        });
      }
      return true;
    },

    // =========================================================================
    // TOPICS (Sync + Async Support)
    // =========================================================================

    getTopics() {
      if (isGuestMode()) return StorageService.getTopics();
      return memoryCache.topics;
    },

    getTopicsBySubject(subjectId) {
      if (isGuestMode()) return StorageService.getTopicsBySubject(subjectId);
      return memoryCache.topics.filter(t => t.subjectId === subjectId);
    },

    async listTopics(subjectId = null) {
      if (isGuestMode()) {
        return subjectId ? StorageService.getTopicsBySubject(subjectId) : StorageService.getTopics();
      }
      return subjectId ? memoryCache.topics.filter(t => t.subjectId === subjectId) : [...memoryCache.topics];
    },

    getTopicById(id) {
      if (isGuestMode()) return StorageService.getTopicById(id);
      return memoryCache.topics.find(t => t.id === id) || null;
    },

    saveTopic(topic) {
      if (isGuestMode()) return StorageService.saveTopic(topic);

      if (this.isOffline()) {
        showToast('Cannot save topic while offline.', 'error');
        return topic;
      }

      const client = getSupabase();
      const userId = getUserId();
      const isNew = !topic.id || topic.id.startsWith('top-');

      if (isNew) {
        const tempId = `top-${Date.now()}`;
        const newObj = {
          id: tempId,
          subjectId: topic.subjectId,
          name: topic.name,
          confidence: (topic.confidence || 'MEDIUM').toUpperCase(),
          updatedAt: Date.now()
        };
        const prevTopics = [...memoryCache.topics];
        memoryCache.topics.push(newObj);
        saveToOfflineCache();

        if (client && userId) {
          client.from('topics').insert({
            user_id: userId,
            subject_id: topic.subjectId,
            name: topic.name,
            confidence: (topic.confidence || 'medium').toLowerCase()
          }).select().single().then(({ data, error }) => {
            if (error) {
              memoryCache.topics = prevTopics;
              saveToOfflineCache();
              showToast(`Failed to save topic: ${error.message}`, 'error');
            } else if (data) {
              const realTopic = normalizeTopicFromDb(data);
              const idx = memoryCache.topics.findIndex(t => t.id === tempId);
              if (idx !== -1) memoryCache.topics[idx] = realTopic;
              saveToOfflineCache();
            }
          });
        }
        return newObj;
      } else {
        const idx = memoryCache.topics.findIndex(t => t.id === topic.id);
        const prevTopics = [...memoryCache.topics];
        if (idx !== -1) {
          memoryCache.topics[idx] = { ...memoryCache.topics[idx], ...topic, updatedAt: Date.now() };
          saveToOfflineCache();
        }

        if (client) {
          client.from('topics').update({
            name: topic.name,
            confidence: (topic.confidence || 'medium').toLowerCase()
          }).eq('id', topic.id).then(({ error }) => {
            if (error) {
              memoryCache.topics = prevTopics;
              saveToOfflineCache();
              showToast(`Failed to update topic: ${error.message}`, 'error');
            }
          });
        }
        return memoryCache.topics[idx] || topic;
      }
    },

    updateTopicConfidence(topicId, confidence) {
      const upperConf = confidence.toUpperCase();
      const lowerConf = confidence.toLowerCase();

      if (isGuestMode()) return StorageService.updateTopicConfidence(topicId, upperConf);

      if (this.isOffline()) {
        showToast('Cannot change confidence while offline.', 'error');
        return null;
      }

      const client = getSupabase();
      const prevTopics = [...memoryCache.topics];
      const idx = memoryCache.topics.findIndex(t => t.id === topicId);
      if (idx !== -1) {
        memoryCache.topics[idx] = { ...memoryCache.topics[idx], confidence: upperConf, updatedAt: Date.now() };
        saveToOfflineCache();
      }

      if (client) {
        client.from('topics').update({
          confidence: lowerConf
        }).eq('id', topicId).then(({ error }) => {
          if (error) {
            memoryCache.topics = prevTopics;
            saveToOfflineCache();
            showToast(`Failed to update confidence: ${error.message}`, 'error');
          }
        });
      }
      return memoryCache.topics[idx] || null;
    },

    deleteTopic(id) {
      if (isGuestMode()) return StorageService.deleteTopic(id);

      if (this.isOffline()) {
        showToast('Cannot delete topic while offline.', 'error');
        return false;
      }

      const client = getSupabase();
      const prevTopics = [...memoryCache.topics];
      const prevTasks = [...memoryCache.tasks];

      memoryCache.topics = memoryCache.topics.filter(t => t.id !== id);
      memoryCache.tasks.forEach(task => {
        if (task.topicId === id) task.topicId = null;
      });
      saveToOfflineCache();

      if (client) {
        client.from('topics').delete().eq('id', id).then(({ error }) => {
          if (error) {
            memoryCache.topics = prevTopics;
            memoryCache.tasks = prevTasks;
            saveToOfflineCache();
            showToast(`Failed to delete topic: ${error.message}`, 'error');
          }
        });
      }
      return true;
    },

    // =========================================================================
    // TASKS (Sync + Async Support)
    // =========================================================================

    getTasks() {
      if (isGuestMode()) return StorageService.getTasks();
      return memoryCache.tasks;
    },

    async listTasks() {
      if (isGuestMode()) return StorageService.getTasks();
      return [...memoryCache.tasks];
    },

    getTaskById(id) {
      if (isGuestMode()) return StorageService.getTaskById(id);
      return memoryCache.tasks.find(t => t.id === id) || null;
    },

    saveTask(task) {
      if (isGuestMode()) return StorageService.saveTask(task);

      if (this.isOffline()) {
        showToast('Cannot save task while offline.', 'error');
        return task;
      }

      const client = getSupabase();
      const userId = getUserId();
      const isNew = !task.id || task.id.startsWith('task-');

      if (isNew) {
        const tempId = `task-${Date.now()}`;
        const newObj = {
          id: tempId,
          title: task.title,
          subjectId: task.subjectId || null,
          topicId: task.topicId || null,
          type: task.type || 'Assignment',
          dueDate: task.dueDate,
          estimatedDuration: parseInt(task.estimatedDuration || 30, 10),
          est_min: parseInt(task.estimatedDuration || 30, 10),
          importance: (task.importance || 'MEDIUM').toUpperCase(),
          isCompleted: false,
          status: 'pending',
          subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
          createdAt: Date.now()
        };

        const prevTasks = [...memoryCache.tasks];
        memoryCache.tasks.push(newObj);
        saveToOfflineCache();

        if (client && userId) {
          client.from('tasks').insert({
            user_id: userId,
            subject_id: task.subjectId || null,
            topic_id: task.topicId || null,
            title: task.title,
            type: (task.type || 'assignment').toLowerCase(),
            due_date: task.dueDate,
            est_min: parseInt(task.estimatedDuration || 30, 10),
            importance: (task.importance || 'medium').toLowerCase(),
            status: 'pending',
            steps: Array.isArray(task.subtasks) ? task.subtasks : []
          }).select().single().then(({ data, error }) => {
            if (error) {
              memoryCache.tasks = prevTasks;
              saveToOfflineCache();
              showToast(`Failed to save task: ${error.message}`, 'error');
            } else if (data) {
              const realTask = normalizeTaskFromDb(data);
              const idx = memoryCache.tasks.findIndex(t => t.id === tempId);
              if (idx !== -1) memoryCache.tasks[idx] = realTask;
              saveToOfflineCache();
            }
          });
        }
        return newObj;
      } else {
        const idx = memoryCache.tasks.findIndex(t => t.id === task.id);
        const prevTasks = [...memoryCache.tasks];
        if (idx !== -1) {
          memoryCache.tasks[idx] = { ...memoryCache.tasks[idx], ...task };
          saveToOfflineCache();
        }

        if (client) {
          client.from('tasks').update({
            title: task.title,
            subject_id: task.subjectId || null,
            topic_id: task.topicId || null,
            type: (task.type || 'assignment').toLowerCase(),
            due_date: task.dueDate,
            est_min: parseInt(task.estimatedDuration || 30, 10),
            importance: (task.importance || 'medium').toLowerCase(),
            steps: task.subtasks || []
          }).eq('id', task.id).then(({ error }) => {
            if (error) {
              memoryCache.tasks = prevTasks;
              saveToOfflineCache();
              showToast(`Failed to update task: ${error.message}`, 'error');
            }
          });
        }
        return memoryCache.tasks[idx] || task;
      }
    },

    toggleTaskCompletion(id, isCompleted) {
      if (isGuestMode()) return StorageService.toggleTaskCompletion(id, isCompleted);

      if (this.isOffline()) {
        showToast('Cannot modify task while offline.', 'error');
        return null;
      }

      const client = getSupabase();
      const prevTasks = [...memoryCache.tasks];
      const task = memoryCache.tasks.find(t => t.id === id);
      if (!task) return null;

      const nextVal = isCompleted !== undefined ? isCompleted : !task.isCompleted;
      task.isCompleted = nextVal;
      task.status = nextVal ? 'done' : 'pending';
      task.completedAt = nextVal ? Date.now() : null;
      saveToOfflineCache();

      if (client) {
        client.from('tasks').update({
          status: nextVal ? 'done' : 'pending',
          completed_at: nextVal ? new Date().toISOString() : null
        }).eq('id', id).then(({ error }) => {
          if (error) {
            memoryCache.tasks = prevTasks;
            saveToOfflineCache();
            showToast(`Failed to toggle task: ${error.message}`, 'error');
          }
        });
      }
      return task;
    },

    deleteTask(id) {
      if (isGuestMode()) return StorageService.deleteTask(id);

      if (this.isOffline()) {
        showToast('Cannot delete task while offline.', 'error');
        return false;
      }

      const client = getSupabase();
      const prevTasks = [...memoryCache.tasks];
      memoryCache.tasks = memoryCache.tasks.filter(t => t.id !== id);
      saveToOfflineCache();

      if (client) {
        client.from('tasks').delete().eq('id', id).then(({ error }) => {
          if (error) {
            memoryCache.tasks = prevTasks;
            saveToOfflineCache();
            showToast(`Failed to delete task: ${error.message}`, 'error');
          }
        });
      }
      return true;
    },

    toggleSubtask(taskId, subtaskId) {
      if (isGuestMode()) return StorageService.toggleSubtask(taskId, subtaskId);

      const task = memoryCache.tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return null;
      const st = task.subtasks.find(s => s.id === subtaskId);
      if (!st) return null;

      st.isDone = !st.isDone;
      saveToOfflineCache();

      const client = getSupabase();
      if (client && !this.isOffline()) {
        client.from('tasks').update({ steps: task.subtasks }).eq('id', taskId);
      }
      return { task, subtask: st };
    },

    addSubtask(taskId, text) {
      if (isGuestMode()) return StorageService.addSubtask(taskId, text);

      const task = memoryCache.tasks.find(t => t.id === taskId);
      if (!task) return null;
      if (!task.subtasks) task.subtasks = [];

      const newSt = { id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`, text, isDone: false };
      task.subtasks.push(newSt);
      saveToOfflineCache();

      const client = getSupabase();
      if (client && !this.isOffline()) {
        client.from('tasks').update({ steps: task.subtasks }).eq('id', taskId);
      }
      return newSt;
    },

    deleteSubtask(taskId, subtaskId) {
      if (isGuestMode()) return StorageService.deleteSubtask(taskId, subtaskId);

      const task = memoryCache.tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return false;

      task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
      saveToOfflineCache();

      const client = getSupabase();
      if (client && !this.isOffline()) {
        client.from('tasks').update({ steps: task.subtasks }).eq('id', taskId);
      }
      return true;
    },

    // =========================================================================
    // STUDY SESSIONS & PROGRESS
    // =========================================================================

    getProgress() {
      if (isGuestMode()) return StorageService.getProgress();
      return memoryCache.progress;
    },

    recordStudySession(taskId, minutesSpent, newConfidence = null) {
      const minutes = parseInt(minutesSpent || 0, 10);

      if (isGuestMode()) {
        return StorageService.recordStudySession(taskId, minutes, newConfidence);
      }

      // Mark task completed
      if (taskId) {
        this.toggleTaskCompletion(taskId, true);
        const task = this.getTaskById(taskId);
        if (newConfidence && task && task.topicId) {
          this.updateTopicConfidence(task.topicId, newConfidence);
        }
      }

      // Record progress in memory
      memoryCache.progress.completedCount += 1;
      memoryCache.progress.totalMinutesStudied += minutes;
      memoryCache.progress.sessions.unshift({
        taskId,
        taskTitle: this.getTaskById(taskId)?.title || 'Study Session',
        minutesSpent: minutes,
        timestamp: Date.now()
      });
      saveToOfflineCache();

      // Async DB write
      const client = getSupabase();
      const userId = getUserId();
      if (client && userId && !this.isOffline()) {
        client.from('study_sessions').insert({
          user_id: userId,
          task_id: taskId || null,
          session_date: new Date().toISOString().split('T')[0],
          minutes: minutes > 0 ? minutes : 25
        });
      }

      return memoryCache.progress;
    },

    // =========================================================================
    // DAILY PLAN
    // =========================================================================

    getDailyPlan() {
      if (isGuestMode()) return StorageService.getDailyPlan();
      return memoryCache.dailyPlan;
    },

    saveDailyPlan(plan) {
      if (isGuestMode()) return StorageService.saveDailyPlan(plan);
      memoryCache.dailyPlan = plan;
      saveToOfflineCache();
      return true;
    },

    // =========================================================================
    // SETTINGS
    // =========================================================================

    getUserSettings() {
      if (isGuestMode()) {
        return {
          theme: localStorage.getItem('panorama_theme') || 'dark',
          accent: '#2563EB',
          default_minutes: 120
        };
      }
      return memoryCache.settings;
    },

    updateUserSettings(settings) {
      if (isGuestMode()) {
        if (settings.theme) localStorage.setItem('panorama_theme', settings.theme);
        return settings;
      }
      memoryCache.settings = { ...memoryCache.settings, ...settings };
      saveToOfflineCache();

      const client = getSupabase();
      const userId = getUserId();
      if (client && userId && !this.isOffline()) {
        client.from('user_settings').upsert({
          user_id: userId,
          theme: memoryCache.settings.theme,
          accent: memoryCache.settings.accent,
          default_minutes: memoryCache.settings.default_minutes
        });
      }
      return memoryCache.settings;
    },

    // =========================================================================
    // GUEST-TO-ACCOUNT IMPORT
    // =========================================================================

    async importGuestData() {
      const guestSubjects = StorageService.getSubjects();
      const guestTopics = StorageService.getTopics();
      const guestTasks = StorageService.getTasks();

      if (guestSubjects.length === 0 && guestTasks.length === 0) {
        return { importedCount: 0 };
      }

      const client = getSupabase();
      const userId = getUserId();
      if (!client || !userId) {
        throw new Error('You must be signed in to import data.');
      }

      showToast('Importing your guest study data to your cloud account...', 'info');

      const subjectIdMap = {};
      const topicIdMap = {};

      try {
        // 1. Insert Subjects
        for (const subj of guestSubjects) {
          const { data, error } = await client.from('subjects').insert({
            user_id: userId,
            name: subj.name,
            color: subj.color || '#2563EB'
          }).select().single();
          if (!error && data) {
            subjectIdMap[subj.id] = data.id;
          }
        }

        // 2. Insert Topics
        for (const top of guestTopics) {
          const newSubjectId = subjectIdMap[top.subjectId];
          if (newSubjectId) {
            const { data, error } = await client.from('topics').insert({
              user_id: userId,
              subject_id: newSubjectId,
              name: top.name,
              confidence: (top.confidence || 'medium').toLowerCase()
            }).select().single();
            if (!error && data) {
              topicIdMap[top.id] = data.id;
            }
          }
        }

        // 3. Insert Tasks
        let importedTasksCount = 0;
        for (const task of guestTasks) {
          const newSubjectId = subjectIdMap[task.subjectId] || null;
          const newTopicId = topicIdMap[task.topicId] || null;

          const { error } = await client.from('tasks').insert({
            user_id: userId,
            subject_id: newSubjectId,
            topic_id: newTopicId,
            title: task.title,
            type: (task.type || 'assignment').toLowerCase(),
            due_date: task.dueDate || new Date().toISOString().split('T')[0],
            est_min: parseInt(task.estimatedDuration || 30, 10),
            importance: (task.importance || 'medium').toLowerCase(),
            status: task.isCompleted ? 'done' : 'pending',
            steps: task.subtasks || []
          });
          if (!error) importedTasksCount++;
        }

        // Wipe local guest copy
        StorageService.clearAll();

        // Sync fresh data from remote
        await this.syncFromRemote();

        showToast(`Successfully imported ${guestSubjects.length} subjects and ${importedTasksCount} tasks!`, 'success');
        return { success: true, subjectsCount: guestSubjects.length, tasksCount: importedTasksCount };
      } catch (err) {
        showToast(`Import encountered an issue: ${err.message}`, 'error');
        throw err;
      }
    },

    // =========================================================================
    // PRIVACY: DELETE ALL USER DATA
    // =========================================================================

    async deleteAllUserData() {
      if (isGuestMode()) {
        StorageService.clearAll();
        memoryCache = {
          subjects: [],
          topics: [],
          tasks: [],
          progress: { completedCount: 0, totalMinutesStudied: 0, sessions: [] },
          settings: { theme: 'dark', accent: '#2563EB', default_minutes: 120 },
          dailyPlan: null,
          isReadOnly: false,
          initialized: true
        };
        localStorage.removeItem(CACHE_KEY);
        return true;
      }

      const client = getSupabase();
      const userId = getUserId();
      if (!client || !userId) return;

      try {
        await client.from('study_sessions').delete().eq('user_id', userId);
        await client.from('tasks').delete().eq('user_id', userId);
        await client.from('topics').delete().eq('user_id', userId);
        await client.from('subjects').delete().eq('user_id', userId);
        await client.from('user_settings').delete().eq('user_id', userId);

        localStorage.removeItem(CACHE_KEY);
        StorageService.clearAll();
        memoryCache.subjects = [];
        memoryCache.topics = [];
        memoryCache.tasks = [];
        memoryCache.progress = { completedCount: 0, totalMinutesStudied: 0, sessions: [] };

        showToast('All your cloud study data has been permanently deleted.', 'info');
        await AuthService.signOut();
        return true;
      } catch (err) {
        showToast(`Error deleting data: ${err.message}`, 'error');
        throw err;
      }
    },

    loadSampleData() {
      if (isGuestMode()) {
        return StorageService.loadSampleData();
      }
      StorageService.loadSampleData();
      return this.importGuestData();
    },

    clearAll() {
      if (isGuestMode()) {
        StorageService.clearAll();
      } else {
        this.deleteAllUserData();
      }
    }
  };
})();
