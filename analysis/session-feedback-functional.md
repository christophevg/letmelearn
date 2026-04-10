# Functional Analysis: Session Feedback Page

## Overview
The goal of this feature is to provide users with immediate, meaningful feedback after completing a Quiz or Training session. Instead of just seeing the raw numbers, the user will be presented with a dedicated feedback page that highlights their progress, encourages consistency (streaks), and provides context on their improvement.

## Current State Analysis
- **Tracking**: Sessions are tracked in MongoDB. A session is started (`POST /api/sessions`) and stopped (`PATCH /api/sessions/{id}`).
- **Stats**: There are existing endpoints for streaks (`/api/stats/streak`) and weekly totals (`/api/stats/weekly`).
- **Frontend**: `Quiz.js` and `Training.js` currently show a simple "All done!" card with basic counts (questions, asked, attempts, correct, elapsed).

## Functional Requirements

### 1. Feedback Page Trigger
- **Trigger**: The feedback page should be displayed immediately after a session is marked as `completed` (via the `stop` method in `Quiz.js` or `Training.js`).
- **Navigation**: Instead of just showing a result card on the same page, the app should transition to a dedicated feedback view (or a full-screen overlay) that focuses on the session's impact.

### 2. Feedback Content & Statistics
The page should display three primary categories of information:

#### A. Immediate Session Results (The "What happened")
- **Accuracy**: Percentage of correct answers (Correct / Asked).
- **Effort**: Total attempts vs. correct answers.
- **Speed**: Average time per question (Elapsed / Asked), if timing was active.
- **Volume**: Number of questions answered.

#### B. Progress & Improvement (The "How I'm doing")
To show "stats improvements explicitly", the system must compare the current session with historical data:
- **Accuracy Trend**: Compare session accuracy with the user's overall weekly accuracy.
- **Speed Trend**: Compare session speed with the average speed of previous sessions.
- **Personal Bests**: Notify the user if they achieved a record (e.g., "Highest accuracy in a session!").

#### C. Motivation & Gamification (The "Keep going")
- **Streak Status**: Display the current streak.
- **Streak Maintenance**: 
  - If today's total time (including this session) is < 15 minutes: "You're almost there! X more minutes to keep your streak alive."
  - If $\ge 15$ minutes: "Streak preserved! 🔥"
- **Encouragement**: Dynamic messages based on performance (e.g., "You're on fire!", "Consistency is key!").

### 3. Technical Specifications

#### Backend: Enhanced Feedback Endpoint
A new endpoint `GET /api/sessions/{id}/feedback` is required. It should return a consolidated object:
```json
{
  "session": {
    "accuracy": 85.0,
    "avg_time_per_question": 12.5,
    "correct": 17,
    "asked": 20,
    "attempts": 22,
    "elapsed": 250
  },
  "comparisons": {
    "accuracy_vs_avg": +5.2,
    "speed_vs_avg": -1.2,
    "is_personal_best": false
  },
  "streak": {
    "current": 5,
    "today_minutes": 22,
    "needs_more_time": false,
    "minutes_remaining": 0
  },
  "message": "Great job! You're improving your accuracy."
}
```

#### Frontend: Feedback Component
- Create a new Vue component `SessionFeedback.js`.
- Integrate this component into `Quiz.js` and `Training.js` to replace the simple result card.
- Use Vuetify components (cards, progress circles, chips) for a polished look.

## Edge Cases
- **Abandoned Sessions**: If a session is "abandoned", the feedback page should not be shown, or a simplified "Session interrupted" message should appear.
- **First Session**: If there is no historical data for comparisons, show "Baseline established!" instead of trends.
- **Zero Questions**: Handle cases where a session was started and stopped without answering any questions.
- **Timing Disabled**: Hide speed-related stats if the timer was not active.

## User Flow
1. User completes last question $\rightarrow$ `stop()` is called.
2. `stopSession` action is dispatched $\rightarrow$ Backend marks session as `completed`.
3. Frontend navigates/switches to `SessionFeedback` view.
4. `SessionFeedback` calls `GET /api/sessions/{id}/feedback`.
5. User views stats, feels encouraged, and returns to the dashboard or starts a new session.
