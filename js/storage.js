/**
 * PANORAMA — Storage Service (DAO Layer)
 * Manages partitioned localStorage persistence, relational integrity,
 * cascade operations, and sample demo data.
 */

const STORAGE_KEYS = {
  SUBJECTS: 'panorama_subjects',
  TOPICS: 'panorama_topics',
  TASKS: 'panorama_tasks',
  DAILY_PLAN: 'panorama_daily_plan',
  PROGRESS: 'panorama_progress'
};

const StorageService = {
  /* ==========================================================================
     GENERIC STORAGE HELPERS
     ========================================================================== */
  get(key, defaultValue = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
      return false;
    }
  },

  /* ==========================================================================
     SUBJECTS CRUD & CASCADE
     ========================================================================== */
  getSubjects() {
    return this.get(STORAGE_KEYS.SUBJECTS, []);
  },

  getSubjectById(id) {
    return this.getSubjects().find(s => s.id === id) || null;
  },

  saveSubject(subject) {
    const subjects = this.getSubjects();
    if (!subject.id) {
      subject.id = `subj-${Date.now()}`;
      subject.createdAt = Date.now();
      subjects.push(subject);
    } else {
      const index = subjects.findIndex(s => s.id === subject.id);
      if (index !== -1) {
        subjects[index] = { ...subjects[index], ...subject };
      } else {
        subjects.push(subject);
      }
    }
    this.set(STORAGE_KEYS.SUBJECTS, subjects);
    return subject;
  },

  deleteSubject(id) {
    // 1. Prune subject
    const subjects = this.getSubjects().filter(s => s.id !== id);
    this.set(STORAGE_KEYS.SUBJECTS, subjects);

    // 2. Cascade: prune associated child topics
    const topics = this.getTopics().filter(t => t.subjectId !== id);
    this.set(STORAGE_KEYS.TOPICS, topics);

    // 3. Cascade: prune associated tasks
    const tasks = this.getTasks().filter(task => task.subjectId !== id);
    this.set(STORAGE_KEYS.TASKS, tasks);

    return true;
  },

  /* ==========================================================================
     TOPICS CRUD & CONFIDENCE
     ========================================================================== */
  getTopics() {
    return this.get(STORAGE_KEYS.TOPICS, []);
  },

  getTopicsBySubject(subjectId) {
    return this.getTopics().filter(t => t.subjectId === subjectId);
  },

  getTopicById(id) {
    return this.getTopics().find(t => t.id === id) || null;
  },

  saveTopic(topic) {
    const topics = this.getTopics();
    if (!topic.id) {
      topic.id = `top-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      topic.confidence = topic.confidence || 'MEDIUM';
      topic.updatedAt = Date.now();
      topics.push(topic);
    } else {
      const index = topics.findIndex(t => t.id === topic.id);
      if (index !== -1) {
        topics[index] = { ...topics[index], ...topic, updatedAt: Date.now() };
      } else {
        topics.push(topic);
      }
    }
    this.set(STORAGE_KEYS.TOPICS, topics);
    return topic;
  },

  updateTopicConfidence(topicId, confidence) {
    const topics = this.getTopics();
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      topic.confidence = confidence;
      topic.updatedAt = Date.now();
      this.set(STORAGE_KEYS.TOPICS, topics);
      return topic;
    }
    return null;
  },

  deleteTopic(id) {
    // 1. Remove topic
    const topics = this.getTopics().filter(t => t.id !== id);
    this.set(STORAGE_KEYS.TOPICS, topics);

    // 2. Unlink tasks pointing to this topic (set topicId = null, default confidence score)
    const tasks = this.getTasks();
    tasks.forEach(task => {
      if (task.topicId === id) {
        task.topicId = null;
      }
    });
    this.set(STORAGE_KEYS.TASKS, tasks);
    return true;
  },

  /* ==========================================================================
     ACADEMIC TASKS CRUD
     ========================================================================== */
  getTasks() {
    return this.get(STORAGE_KEYS.TASKS, []);
  },

  getTaskById(id) {
    return this.getTasks().find(t => t.id === id) || null;
  },

  saveTask(task) {
    const tasks = this.getTasks();
    if (!task.id) {
      task.id = `task-${Date.now()}`;
      task.isCompleted = false;
      task.createdAt = Date.now();
      tasks.push(task);
    } else {
      const index = tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...task };
      } else {
        tasks.push(task);
      }
    }
    this.set(STORAGE_KEYS.TASKS, tasks);
    return task;
  },

  toggleTaskCompletion(id, isCompleted) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.isCompleted = isCompleted !== undefined ? isCompleted : !task.isCompleted;
      task.completedAt = task.isCompleted ? Date.now() : null;
      this.set(STORAGE_KEYS.TASKS, tasks);
      return task;
    }
    return null;
  },

  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.set(STORAGE_KEYS.TASKS, tasks);
    return true;
  },

  /* ==========================================================================
     DAILY PLAN
     ========================================================================== */
  getDailyPlan() {
    return this.get(STORAGE_KEYS.DAILY_PLAN, null);
  },

  saveDailyPlan(plan) {
    return this.set(STORAGE_KEYS.DAILY_PLAN, plan);
  },

  /* ==========================================================================
     PROGRESS & STUDY SESSIONS
     ========================================================================== */
  getProgress() {
    return this.get(STORAGE_KEYS.PROGRESS, {
      completedCount: 0,
      totalMinutesStudied: 0,
      sessions: []
    });
  },

  recordStudySession(taskId, minutesSpent, newConfidence = null) {
    const progress = this.getProgress();
    const task = this.getTaskById(taskId);

    // Mark task complete
    if (task) {
      this.toggleTaskCompletion(taskId, true);
      if (newConfidence && task.topicId) {
        this.updateTopicConfidence(task.topicId, newConfidence);
      }
    }

    progress.completedCount += 1;
    progress.totalMinutesStudied += parseInt(minutesSpent || 0, 10);
    progress.sessions.push({
      taskId,
      taskTitle: task ? task.title : 'Study Session',
      minutesSpent: parseInt(minutesSpent || 0, 10),
      timestamp: Date.now()
    });

    this.set(STORAGE_KEYS.PROGRESS, progress);
    return progress;
  },

  /* ==========================================================================
     SAMPLE DEMO DATA SEEDER (Matches flow.md Worked Example)
     ========================================================================== */
  loadSampleData() {
    const today = new Date();
    const formatDate = (daysFromToday) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromToday);
      return d.toISOString().split('T')[0];
    };

    const sampleSubjects = [
      { id: 'subj-101', name: 'Mathematics', color: '#2563EB', createdAt: Date.now() - 300000 },
      { id: 'subj-102', name: 'Data Structures & Algorithms', color: '#0D9488', createdAt: Date.now() - 250000 },
      { id: 'subj-103', name: 'Physics', color: '#8B5CF6', createdAt: Date.now() - 200000 },
      { id: 'subj-104', name: 'Chemistry', color: '#F59E0B', createdAt: Date.now() - 150000 },
      { id: 'subj-105', name: 'English Literature', color: '#EC4899', createdAt: Date.now() - 100000 }
    ];

    const sampleTopics = [
      { id: 'top-201', subjectId: 'subj-101', name: 'Differential Calculus', confidence: 'LOW', updatedAt: Date.now() },
      { id: 'top-202', subjectId: 'subj-101', name: 'Integration & Matrices', confidence: 'MEDIUM', updatedAt: Date.now() },
      { id: 'top-203', subjectId: 'subj-102', name: 'Binary Trees & Graphs', confidence: 'LOW', updatedAt: Date.now() },
      { id: 'top-204', subjectId: 'subj-102', name: 'Sorting Algorithms', confidence: 'HIGH', updatedAt: Date.now() },
      { id: 'top-205', subjectId: 'subj-103', name: 'Classical Mechanics', confidence: 'MEDIUM', updatedAt: Date.now() },
      { id: 'top-206', subjectId: 'subj-104', name: 'Organic Reaction Mechanisms', confidence: 'HIGH', updatedAt: Date.now() },
      { id: 'top-207', subjectId: 'subj-105', name: 'Academic Essay Writing', confidence: 'HIGH', updatedAt: Date.now() }
    ];

    const sampleTasks = [
      {
        id: 'task-301',
        title: 'DSA Lab Problem Set (Binary Trees)',
        subjectId: 'subj-102',
        topicId: 'top-203',
        type: 'Assignment',
        dueDate: formatDate(1), // Tomorrow
        estimatedDuration: 45,
        importance: 'HIGH',
        isCompleted: false,
        createdAt: Date.now() - 50000
      },
      {
        id: 'task-302',
        title: 'Calculus Quiz Prep (Limits & Derivatives)',
        subjectId: 'subj-101',
        topicId: 'top-201',
        type: 'Revision',
        dueDate: formatDate(2), // In 2 days
        estimatedDuration: 40,
        importance: 'HIGH',
        isCompleted: false,
        createdAt: Date.now() - 40000
      },
      {
        id: 'task-303',
        title: 'Physics Mechanics Lab Report',
        subjectId: 'subj-103',
        topicId: 'top-205',
        type: 'Assignment',
        dueDate: formatDate(1), // Tomorrow
        estimatedDuration: 30,
        importance: 'MEDIUM',
        isCompleted: false,
        createdAt: Date.now() - 30000
      },
      {
        id: 'task-304',
        title: 'Organic Chemistry Problem Practice',
        subjectId: 'subj-104',
        topicId: 'top-206',
        type: 'Practice',
        dueDate: formatDate(4), // In 4 days
        estimatedDuration: 45,
        importance: 'MEDIUM',
        isCompleted: false,
        createdAt: Date.now() - 20000
      },
      {
        id: 'task-305',
        title: 'English Essay Structural Outline',
        subjectId: 'subj-105',
        topicId: 'top-207',
        type: 'Assignment',
        dueDate: formatDate(8), // In 8 days
        estimatedDuration: 30,
        importance: 'LOW',
        isCompleted: false,
        createdAt: Date.now() - 10000
      }
    ];

    this.set(STORAGE_KEYS.SUBJECTS, sampleSubjects);
    this.set(STORAGE_KEYS.TOPICS, sampleTopics);
    this.set(STORAGE_KEYS.TASKS, sampleTasks);
    this.set(STORAGE_KEYS.DAILY_PLAN, null);
    this.set(STORAGE_KEYS.PROGRESS, {
      completedCount: 2,
      totalMinutesStudied: 75,
      sessions: [
        { taskId: 'sample-done-1', taskTitle: 'Sorting Algorithms Recap', minutesSpent: 45, timestamp: Date.now() - 86400000 },
        { taskId: 'sample-done-2', taskTitle: 'Chemistry Nomenclature', minutesSpent: 30, timestamp: Date.now() - 43200000 }
      ]
    });

    return true;
  },

  clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }
};
