# PANORAMA — Application Flow & User Journey

> **Project Tagline:** *From scattered pieces to the bigger picture.*  
> **Target Audience:** First-year university students managing multiple academic subjects, assignments, exams, and fluctuating schedules.  
> **Application Type:** Lightweight, responsive client-side web application built with vanilla HTML5, CSS3, and JavaScript (ES6+), persisting state via `localStorage`.  
> **Scope:** Core MVP covering exclusively the **three Must-Have feature groups** (no authentication, no AI chatbots, no social features, no timers, and no advanced analytics).

---

## 1. System Architecture & Relational Data Model

PANORAMA runs entirely in the student's browser without requiring server-side databases or third-party cloud accounts. All application state is structured and persisted using standard browser `localStorage`.

### 1.1 Relational Architecture Diagram

```
+-------------------------------------------------------------+
|                           SUBJECT                           |
|  - id: UUID                                                 |
|  - name: String (e.g., "Mathematics", "DSA")               |
|  - colorCode: Hex String                                    |
|  - createdAt: Timestamp                                     |
+------------------------------+------------------------------+
                               | 1
                               | has many (1:N)
                               v
+-------------------------------------------------------------+
|                            TOPIC                            |
|  - id: UUID                                                 |
|  - subjectId: UUID (Foreign Key -> Subject.id)              |
|  - name: String (e.g., "Functions", "Dynamic Programming")  |
|  - confidence: Enum ("LOW" | "MEDIUM" | "HIGH")             |
|  - updatedAt: Timestamp                                     |
+------------------------------+------------------------------+
                               | 1
                               | optionally categorized by (1:N)
                               v
+-------------------------------------------------------------+
|                        ACADEMIC TASK                        |
|  - id: UUID                                                 |
|  - title: String (e.g., "Complete Problem Set 3")           |
|  - subjectId: UUID (Foreign Key -> Subject.id)              |
|  - topicId: UUID | null (Optional FK -> Topic.id)           |
|  - type: Enum ("ASSIGNMENT" | "REVISION" | "PRACTICE")      |
|  - dueDate: ISO Date String (YYYY-MM-DD)                    |
|  - estimatedDuration: Integer (in minutes, e.g., 45)        |
|  - importance: Enum ("HIGH" | "MEDIUM" | "LOW")             |
|  - isCompleted: Boolean (default: false)                    |
|  - createdAt: Timestamp                                     |
+------------------------------+------------------------------+
                               |
                               | filtered, ranked, & budgeted into
                               v
+-------------------------------------------------------------+
|                  DAILY PRIORITISED STUDY PLAN               |
|  - date: ISO Date String (YYYY-MM-DD)                       |
|  - availableTimeMinutes: Integer (e.g., 120)                |
|  - plannedTasks: Array of Ordered Plan Items                |
|      * taskId: UUID (Reference -> Task.id)                  |
|      * priorityScore: Float                                 |
|      * rank: Integer                                        |
|      * allocatedMinutes: Integer                            |
|  - totalAllocatedMinutes: Integer                           |
|  - remainingTimeMinutes: Integer                            |
+-------------------------------------------------------------+
```

### 1.2 Data Schemas in `localStorage`

The client application stores state under partitioned keys:

#### `panorama_subjects`
```json
[
  {
    "id": "subj-101",
    "name": "Mathematics",
    "color": "#2563EB",
    "createdAt": 1731801600000
  },
  {
    "id": "subj-102",
    "name": "Data Structures & Algorithms",
    "color": "#0D9488",
    "createdAt": 1731801650000
  }
]
```

#### `panorama_topics`
```json
[
  {
    "id": "top-201",
    "subjectId": "subj-101",
    "name": "Functions & Relations",
    "confidence": "LOW",
    "updatedAt": 1731802000000
  },
  {
    "id": "top-202",
    "subjectId": "subj-102",
    "name": "Binary Search Trees",
    "confidence": "MEDIUM",
    "updatedAt": 1731802100000
  }
]
```

#### `panorama_tasks`
```json
[
  {
    "id": "task-301",
    "title": "Functions Problem Set",
    "subjectId": "subj-101",
    "topicId": "top-201",
    "type": "Assignment",
    "dueDate": "2026-11-18",
    "estimatedDuration": 45,
    "importance": "HIGH",
    "isCompleted": false,
    "createdAt": 1731803000000
  }
]
```

#### `panorama_daily_plan`
```json
{
  "date": "2026-11-17",
  "availableTimeMinutes": 120,
  "generatedAt": 1731804000000,
  "plannedTasks": [
    {
      "taskId": "task-301",
      "rank": 1,
      "priorityScore": 88.5,
      "allocatedMinutes": 45
    }
  ],
  "totalAllocatedMinutes": 45,
  "remainingTimeMinutes": 75
}
```

---

## 2. Complete End-to-End User Flow

The core workflow strictly guides the student from a blank slate to an actionable, realistic daily schedule:

```
[ 1. Dashboard ] 
       │
       ▼
[ 2. Manage Subjects ] 
       │
       ▼
[ 3. Add Topics ] 
       │
       ▼
[ 4. Set Topic Confidence ] 
       │
       ▼
[ 5. Add Academic Tasks ] 
       │
       ▼
[ 6. Enter Available Study Time ] 
       │
       ▼
[ 7. Generate Daily Prioritised Study Plan ]
```

---

### Stage 1: Dashboard (Overview & Entry Point)

#### User Action:
- Opens the application in the web browser.
- Views the high-level summary cards:
  - Today's capacity (e.g., "Available: 120 mins | 3 planned tasks").
  - Top priority tasks due soon.
  - Subject overview count.
- Chooses a quick action button: **"Manage Subjects"**, **"Add Task"**, or **"Generate Daily Plan"**.

#### Application Response:
- Reads `panorama_subjects`, `panorama_tasks`, and `panorama_daily_plan` from `localStorage`.
- Evaluates whether subjects or tasks already exist:
  - If no subjects exist, renders an inviting empty state pointing directly to `Manage Subjects`.
  - If tasks exist but no plan for today has been generated, prompts with *"Set available study time to create today's plan"*.
  - If a daily plan exists for the current calendar date, renders the active plan summary cards and remaining study time.

#### Information Stored:
- No new records stored; active view state (`currentView = 'dashboard'`) retained in application memory.

---

### Stage 2: Manage Subjects (Course Organization)

#### User Action:
- Clicks **"Subjects"** in the navigation bar or **"View Subjects"** on the dashboard.
- Types a new subject name into the input field (e.g., *"Mathematics"*, *"Data Structures & Algorithms"*, *"Chemistry"*).
- Optionally selects a subject color badge.
- Clicks **"Add Subject"** (or presses `Enter`).
- Can click to edit existing subject names or delete subjects no longer needed.

#### Application Response:
- Validates the input: checks for non-empty string and prevents duplicate subject names.
- Instantiates a new subject object with an autogenerated unique ID (`subj-${Date.now()}`).
- Appends the new subject to the in-memory array and serializes to `localStorage.setItem('panorama_subjects', ...)`.
- Dynamically renders the subject card into the UI without page reload.
- Displays a confirmation toast notification (*"Subject added successfully"*).
- Updates the subject dropdown options across task creation forms.

#### Information Stored:
- Appends `{ id, name, color, createdAt }` to `panorama_subjects`.

---

### Stage 3: Add Topics (Breaking Down the Syllabus)

#### User Action:
- Within the selected Subject card or detail panel, navigates to the **"Topics"** sub-section.
- Enters topic names relevant to the syllabus (e.g., under Mathematics: *"Functions & Relations"*, *"Differential Calculus"*, *"Matrices"*).
- Clicks **"Add Topic"**.

#### Application Response:
- Validates that a subject is actively selected and that the topic name is valid.
- Assigns a default confidence level of `"MEDIUM"` if not immediately chosen.
- Links the new topic to the parent subject via `subjectId`.
- Saves the updated topic list to `localStorage.setItem('panorama_topics', ...)`.
- Updates the topic counter on the parent subject card (e.g., *"Mathematics | 3 topics added"*).
- Inserts a new topic pill/row equipped with inline confidence controls.

#### Information Stored:
- Appends `{ id, subjectId, name, confidence, updatedAt }` to `panorama_topics`.

---

### Stage 4: Set Topic Confidence (Identifying Weak Areas)

#### User Action:
- For each topic, reviews their current understanding.
- Interacts with a 3-tier segmented toggle or badge selector:
  - **Low Confidence** (🔴 / Amber-Red: Struggling, weak grasp, urgent revision required).
  - **Medium Confidence** (🟡 / Warm Amber: Average understanding, needs standard practice).
  - **High Confidence** (🟢 / Mint Green: Solid mastery, needs minimal review).
- Can update this confidence level at any point as understanding develops.

#### Application Response:
- Immediately updates the confidence property of the target topic in memory and `localStorage`.
- Updates the visual badge styling (color, border, and text).
- Re-evaluates any pending prioritisation scores for academic tasks linked to this topic.
- Provides immediate visual feedback indicating the revised confidence rating is saved.

#### Information Stored:
- Mutates `confidence` and `updatedAt` for the corresponding topic in `panorama_topics`.

---

### Stage 5: Add Academic Tasks (Organising Upcoming Work)

#### User Action:
- Clicks **"Add Task"** from the navigation bar or dashboard action button.
- Fills in the task creation form:
  1. **Task Title**: Clear action name (e.g., *"Complete Problem Set 3"*, *"Prepare Unit 1 Revision Notes"*).
  2. **Subject**: Selects from pre-existing subjects via dropdown.
  3. **Associated Topic** *(Optional but recommended)*: Dynamically populates based on the selected subject.
  4. **Task Type**: Selects one of `Assignment`, `Revision`, or `Practice`.
  5. **Due Date**: Selects target deadline using date picker (`YYYY-MM-DD`).
  6. **Estimated Duration**: Enters expected completion time in minutes (e.g., 30, 45, 60 mins).
  7. **Importance Level**: Selects `High`, `Medium`, or `Low`.
- Clicks **"Save Task"**.

#### Application Response:
- Performs client-side field validation:
  - Ensures title is non-empty.
  - Ensures a subject is chosen.
  - Validates that due date is a valid date string.
  - Ensures estimated duration is a positive number $\ge 10$ minutes and $\le 360$ minutes.
  - Ensures importance is specified.
- Creates new task entity (`isCompleted: false`).
- Persists to `localStorage.setItem('panorama_tasks', ...)`.
- Resets form and redirects/switches view to Task List or Dashboard with an alert banner (*"Task created and ready for scheduling"*).

#### Information Stored:
- Appends `{ id, title, subjectId, topicId, type, dueDate, estimatedDuration, importance, isCompleted, createdAt }` to `panorama_tasks`.

---

### Stage 6: Enter Available Study Time (Setting Daily Constraints)

#### User Action:
- Navigates to the **"Daily Plan"** tab or clicks **"Create Today's Plan"**.
- Enters the total time available for study sessions today (either via an intuitive numerical minute input or quick-select presets: 60 min, 90 min, 120 min, 180 min, 240 min).
- Example: The student enters **120 minutes**.
- Clicks **"Generate Prioritised Plan"**.

#### Application Response:
- Validates the entered time ($> 0$ minutes).
- Retrieves all uncompleted tasks (`isCompleted === false`) from `panorama_tasks`.
- Triggers the PANORAMA Prioritisation Engine (see Section 3 for the mathematical formula).
- Computes priority scores for each candidate task.
- Sorts tasks in descending priority order.
- Applies a greedy packing algorithm to fit the highest-priority tasks into the 120-minute allocation without exceeding the limit.
- Calculates total allocated minutes and remaining slack/buffer minutes.

#### Information Stored:
- Saves the resulting plan structure into `panorama_daily_plan` in `localStorage`.

---

### Stage 7: Generate Daily Prioritised Study Plan (Actionable Execution)

#### User Action:
- Views the generated schedule on Screen 4 (*"Today's Study Plan"*):
  - Banner: *"Available time: 120 minutes | Planned: 110 minutes | 3 tasks selected"*.
  - Chronological list of ranked study blocks:
    1. **Rank 1**: *DSA – Functions practice | 40 min* (Urgent due date + Low topic confidence).
    2. **Rank 2**: *Mathematics – Weak topic revision | 35 min* (High importance + Low confidence).
    3. **Rank 3**: *Chemistry – Assignment review | 35 min* (Approaching deadline).
- Available options:
  - **Start First Task**: Focuses on task #1.
  - **Edit Available Time**: Adjusts daily minutes if the student's schedule changes.
  - **Regenerate Plan**: Re-runs the algorithm if tasks or confidence levels were edited.
  - **Mark Task Complete**: Toggles completion status, removing the task from future daily prioritisation runs.

#### Application Response:
- Renders the ranked tasks inside distinct, clean cards showing priority badges, estimated duration pills, and subject tags.
- Provides visual cue for overflow tasks (tasks that have high priority but could not fit in today's time window, labelled *"Scheduled for Next Session"*).
- Updates the dashboard priority card with today's top item.

#### Information Stored:
- Updates `panorama_daily_plan` with current rankings, timestamps, and task completion flags.

---

## 3. Daily Prioritisation Engine & Mathematical Logic

The core value of PANORAMA lies in eliminating decision paralysis. First-year students often study what feels easiest rather than what is most critical. The prioritisation engine synthesizes five core variables into a single deterministic **Priority Score ($P$)**:

```
P = (W_urgency * S_urgency) + (W_importance * S_importance) + (W_confidence * S_confidence)
```

Where:
- $S_{urgency}$ = Urgency Score based on Due Date (0 to 100)
- $S_{importance}$ = Importance Score (0 to 100)
- $S_{confidence}$ = Topic Confidence Gap Score (0 to 100)
- $W_{urgency} = 0.45$ (45% weight — deadlines are non-negotiable)
- $W_{importance} = 0.30$ (30% weight — exam/major assignments take precedence)
- $W_{confidence} = 0.25$ (25% weight — weaker areas require proactive revision)

*(Total weight = $0.45 + 0.30 + 0.25 = 1.00$)*

---

### 3.1 Parameter Breakdown & Scoring Rules

#### 1. Urgency Score ($S_{urgency}$)
Calculated using the difference in calendar days between the Task Due Date ($D_{due}$) and Today's Date ($D_{today}$):

$$\Delta days = \lceil (D_{due} - D_{today}) \text{ in days} \rceil$$

| Condition | Urgency Status | $S_{urgency}$ Value | Rationale |
|:---|:---|:---|:---|
| $\Delta days < 0$ | Overdue | **100** | Critical breach; must be addressed immediately |
| $\Delta days = 0$ | Due Today | **95** | Same-day deadline |
| $\Delta days = 1$ | Due Tomorrow | **85** | Immediate next-day obligation |
| $\Delta days = 2$ | Due in 2 days | **70** | Approaching deadline |
| $3 \le \Delta days \le 4$ | Due in 3–4 days | **55** | Near-term deadline |
| $5 \le \Delta days \le 7$ | Due in 1 week | **40** | Standard planning horizon |
| $\Delta days > 7$ | Due in $>1$ week | **20** | Long-term item |

#### 2. Importance Score ($S_{importance}$)
Based on academic weight indicated by the student:

| Importance Level | $S_{importance}$ Value | Description |
|:---|:---|:---|
| **High** | **100** | Major exams, heavily weighted assignments, project milestones |
| **Medium** | **60** | Regular homework, weekly quizzes, continuous assessments |
| **Low** | **30** | Optional practice, supplemental reading, exploratory review |

#### 3. Topic Confidence Gap Score ($S_{confidence}$)
Inverts confidence so that lower confidence results in higher study urgency:

| Topic Confidence | $S_{confidence}$ Value | Pedagogical Objective |
|:---|:---|:---|
| **Low Confidence** | **100** | Highest gap; urgent knowledge remediation needed |
| **Medium Confidence** | **60** | Moderate familiarity; practice required for fluency |
| **High Confidence** | **20** | Strong mastery; maintenance/quick review only |
| *No Topic Linked* | **50** | Neutral baseline when a task is general or unlinked |

---

### 3.2 Time Budget Packing Algorithm

Once all incomplete tasks receive a Priority Score $P$, they are scheduled within the student's **Available Study Time ($T_{available}$)** using a greedy time-budget packing method:

```
Algorithm: DailyStudyPlanGeneration
Input: 
    Tasks: List of uncompleted tasks
    AvailableTime: Integer (minutes)
    Topics: List of topics with confidence ratings
Output: 
    DailyPlan: Ordered list of scheduled tasks fitting within AvailableTime

1. For each task in Tasks:
     S_urgency    <- CalculateUrgencyScore(task.dueDate)
     S_importance <- CalculateImportanceScore(task.importance)
     S_confidence <- CalculateConfidenceScore(task.topicId, Topics)
     
     task.priorityScore <- (0.45 * S_urgency) + 
                           (0.30 * S_importance) + 
                           (0.25 * S_confidence)

2. Sort Tasks in descending order of task.priorityScore.

3. Initialize:
     ScheduledTasks <- []
     AccumulatedTime <- 0

4. For each task in sorted Tasks:
     If (AccumulatedTime + task.estimatedDuration) <= AvailableTime:
         Append task to ScheduledTasks
         AccumulatedTime <- AccumulatedTime + task.estimatedDuration
     Else:
         # Task cannot fit as a whole
         Mark task as "Deferred to next session"

5. Return {
     scheduledTasks: ScheduledTasks,
     totalAllocatedMinutes: AccumulatedTime,
     remainingBufferMinutes: AvailableTime - AccumulatedTime
   }
```

---

### 3.3 Concrete Worked Example

**Student's Available Study Time:** `120 minutes`  
**Current Date:** `2026-11-17`

| Task Name | Subject / Topic | Due Date | Duration | Importance | Topic Conf. | Urgency ($S_u$) | Imp. ($S_i$) | Conf. ($S_c$) | Total Score ($P$) | Scheduled? |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **T1: DSA Lab Problem Set** | DSA / Functions | 2026-11-18 (1 day) | 45 min | High | Low | 85 | 100 | 100 | **93.25** | ✅ **Rank 1** (45m used) |
| **T2: Calculus Quiz Prep** | Maths / Integration | 2026-11-19 (2 days) | 40 min | High | Low | 70 | 100 | 100 | **86.50** | ✅ **Rank 2** (85m used) |
| **T3: Physics Lab Report** | Physics / Mechanics | 2026-11-18 (1 day) | 30 min | Medium | Medium | 85 | 60 | 60 | **71.25** | ✅ **Rank 3** (115m used) |
| **T4: Chemistry Practice** | Chem / Organic | 2026-11-21 (4 days) | 45 min | Medium | High | 55 | 60 | 20 | **47.75** | ❌ Deferred ($115+45 > 120$) |
| **T5: English Essay Outline** | English / General | 2026-11-25 (8 days) | 30 min | Low | None | 20 | 30 | 50 | **30.50** | ❌ Deferred (Time limit reached) |

**Resulting Daily Plan:**
- **Rank 1:** T1: DSA Lab Problem Set (45 min)
- **Rank 2:** T2: Calculus Quiz Prep (40 min)
- **Rank 3:** T3: Physics Lab Report (30 min)
- **Total Time Allocated:** `115 minutes`
- **Buffer Remaining:** `5 minutes`

---

## 4. Entity Connection & Cascading Rules

To maintain data integrity without a complex SQL backend, the application executes strict cascade handling in vanilla JavaScript:

1. **Subject Deletion:**
   - When a Subject is deleted, all associated child Topics (`topic.subjectId === subject.id`) are automatically pruned from `panorama_topics`.
   - Associated Tasks can either be cascaded or unlinked (`task.subjectId = null`, flagged with an alert *"Subject removed"*). In PANORAMA, tasks linked to deleted subjects are pruned to prevent orphaned data.
2. **Topic Deletion:**
   - When a Topic is deleted, Tasks linked to that topic have their `topicId` reset to `null`. The tasks remain valid, inheriting a neutral confidence score (50).
3. **Task Completion:**
   - When a task is checked off as complete, it is immediately excluded from subsequent daily plan generations.
   - If present in today's active plan, its UI state displays a strike-through and a green check icon.
4. **Confidence Level Adjustment:**
   - Changing a topic's confidence from Low to High dynamically recalculates priority scores when the user clicks **"Regenerate Plan"**.

---

## 5. Summary of MVP Inclusions vs Exclusions

| Feature Category | In MVP Scope (Must-Haves) | Deliberately Excluded (Out of Scope) |
|:---|:---|:---|
| **Subjects & Topics** | Add/edit subjects, add topics, set 3-tier confidence | College ERP/LMS sync, syllabus scraping |
| **Task Management** | Academic tasks, due dates, duration, importance level | Sub-task nesting, file attachments, recurring tasks |
| **Prioritisation** | Deterministic score formula, greedy time packing | AI/LLM recommendations, complex genetic scheduling |
| **Session Tracking**| Mark task complete, record time spent | Automated countdown timers, Pomodoro chimes |
| **Platform** | LocalStorage persistence, responsive single-page JS | User auth/passwords, cloud DB, social leaderboards |
