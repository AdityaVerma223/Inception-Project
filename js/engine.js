/**
 * PANORAMA — Prioritisation Engine & Mathematical Planning Logic
 * Implements the multi-factor deterministic scoring formula and greedy time-budget packing.
 */

const PrioritisationEngine = {
  // Configured weights (sum = 1.00)
  WEIGHTS: {
    URGENCY: 0.45,
    IMPORTANCE: 0.30,
    CONFIDENCE: 0.25
  },

  /**
   * Calculates calendar day delta between due date and today,
   * normalized to local midnight to prevent intraday rounding errors.
   */
  calculateDeltaDays(dueDateStr) {
    if (!dueDateStr) return 999;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return 999;
    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    const diffMs = due.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * 1. Urgency Score (S_urgency: 0 - 100)
   */
  calculateUrgencyScore(dueDateStr) {
    const deltaDays = this.calculateDeltaDays(dueDateStr);

    if (deltaDays < 0) return { score: 100, label: 'Overdue' };
    if (deltaDays === 0) return { score: 95, label: 'Due Today' };
    if (deltaDays === 1) return { score: 85, label: 'Due Tomorrow' };
    if (deltaDays === 2) return { score: 70, label: 'Due in 2 days' };
    if (deltaDays >= 3 && deltaDays <= 4) return { score: 55, label: 'Due in 3–4 days' };
    if (deltaDays >= 5 && deltaDays <= 7) return { score: 40, label: 'Due in 1 week' };
    return { score: 20, label: 'Due in >1 week' };
  },

  /**
   * 2. Importance Score (S_importance: 0 - 100)
   */
  calculateImportanceScore(importance) {
    const imp = (importance || '').toUpperCase();
    if (imp === 'HIGH') return 100;
    if (imp === 'MEDIUM') return 60;
    if (imp === 'LOW') return 30;
    return 60; // default medium
  },

  /**
   * 3. Topic Confidence Gap Score (S_confidence: 0 - 100)
   * Lower student confidence = Higher urgency to revise.
   */
  calculateConfidenceScore(topicId, allTopics) {
    if (!topicId) return { score: 50, level: 'NONE', label: 'General Task' };
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic || !topic.confidence) return { score: 50, level: 'NONE', label: 'Unrated' };

    const conf = topic.confidence.toUpperCase();
    if (conf === 'LOW') return { score: 100, level: 'LOW', label: 'Weak Topic' };
    if (conf === 'MEDIUM') return { score: 60, level: 'MEDIUM', label: 'Moderate' };
    if (conf === 'HIGH') return { score: 20, level: 'HIGH', label: 'Strong Mastery' };
    return { score: 50, level: 'NONE', label: 'General' };
  },

  /**
   * Computes the deterministic Priority Score (P) for a single task.
   */
  scoreTask(task, allTopics) {
    const urgency = this.calculateUrgencyScore(task.dueDate);
    const importanceScore = this.calculateImportanceScore(task.importance);
    const confidence = this.calculateConfidenceScore(task.topicId, allTopics);

    const P = (this.WEIGHTS.URGENCY * urgency.score) +
              (this.WEIGHTS.IMPORTANCE * importanceScore) +
              (this.WEIGHTS.CONFIDENCE * confidence.score);

    // Generate human-readable rationale tags
    const rationaleTags = [];
    if (urgency.score >= 85) {
      rationaleTags.push({ text: urgency.label, type: 'due-soon' });
    }
    if (confidence.level === 'LOW') {
      rationaleTags.push({ text: 'Weak Topic (Revise)', type: 'weak-topic' });
    }
    if (importanceScore === 100 && urgency.score < 85) {
      rationaleTags.push({ text: 'High Importance', type: 'high-weight' });
    }
    if (rationaleTags.length === 0) {
      rationaleTags.push({ text: urgency.label, type: 'standard' });
    }

    return {
      ...task,
      priorityScore: parseFloat(P.toFixed(2)),
      urgencyDetails: urgency,
      confidenceDetails: confidence,
      importanceScore,
      rationaleTags
    };
  },

  /**
   * Generates the Daily Prioritised Plan using greedy time-budget packing.
   */
  generateDailyPlan(availableMinutes, allTasks, allTopics) {
    const budget = Math.max(10, parseInt(availableMinutes || 120, 10));

    // Filter incomplete tasks only
    const candidateTasks = allTasks.filter(t => !t.isCompleted);

    // Score all candidates
    const scoredTasks = candidateTasks.map(task => this.scoreTask(task, allTopics));

    // Sort descending by priority score
    scoredTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    const plannedTasks = [];
    const deferredTasks = [];
    let accumulatedMinutes = 0;

    scoredTasks.forEach(task => {
      const duration = parseInt(task.estimatedDuration || 30, 10);
      if (accumulatedMinutes + duration <= budget) {
        accumulatedMinutes += duration;
        plannedTasks.push({
          ...task,
          rank: plannedTasks.length + 1,
          allocatedMinutes: duration
        });
      } else {
        deferredTasks.push({
          ...task,
          deferReason: `Requires ${duration}m (only ${budget - accumulatedMinutes}m left in today's budget)`
        });
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return {
      date: todayStr,
      availableTimeMinutes: budget,
      totalAllocatedMinutes: accumulatedMinutes,
      remainingTimeMinutes: Math.max(0, budget - accumulatedMinutes),
      generatedAt: Date.now(),
      plannedTasks,
      deferredTasks
    };
  }
};
