# UI/UX Analysis: Session Feedback System

## 1. Goal & Psychological Framing
The Session Feedback page is the "reward" phase of the learning loop. Its primary goal is to transition the user from the cognitive effort of a session to a feeling of accomplishment and a desire to return tomorrow.

### Framing Statistics
Instead of raw data, we will present stats as "achievements" or "insights":
- **Accuracy**: "Precision" -> Frame as "Mastery". High accuracy = "You're mastering this topic!".
- **Effort**: "Attempts vs Correct" -> Frame as "Perseverance". High attempts but eventual correctness = "Great persistence!".
- **Speed**: "Time per question" -> Frame as "Fluency". Decreasing time = "You're becoming more fluent!".

## 2. Visual Hierarchy & Layout
The page should be a full-screen overlay or a dedicated view to eliminate distractions.

### Layout Structure (Top to Bottom)
1. **The "Big Win" (Header)**: 
   - A large, celebratory headline (e.g., "Session Complete!").
   - A dynamic motivational message based on performance (e.g., "You're on fire! 🔥" or "Steady progress! 📈").
   - Visual: A celebratory icon or a small confetti animation on load.

2. **Primary Stats Grid (The "What happened")**:
   - Three circular progress indicators (Vuetify `v-progress-circular`) for:
     - **Accuracy %** (Color: Green/Yellow/Red based on threshold).
     - **Speed Index** (Relative to average).
     - **Effort Index** (Correct/Attempts ratio).
   - Below each circle, a label and the raw value (e.g., "17/20 Correct").

3. **The Improvement Zone (The "How I'm doing")**:
   - A "Trends" card using small trend arrows (↑/↓) and delta values.
   - Comparison: "Accuracy: +5.2% vs your weekly average".
   - Personal Best alert: A gold-bordered chip if a record was broken.

4. **The Streak Anchor (The "Keep going")**:
   - A dedicated section at the bottom, visually separated.
   - **Streak Counter**: Large number with a flame icon.
   - **Maintenance Bar**: A progress bar showing today's total minutes vs. the 15-minute goal.
   - **Call to Action**: If goal not met: "Only 4 more minutes to save your streak!". If met: "Streak preserved! See you tomorrow!".

5. **Action Footer**:
   - Primary Button: "Back to Dashboard".
   - Secondary Button: "Start Another Session".

## 3. User Flow: The "Dopamine Loop"
1. **Completion**: User submits the final answer $\rightarrow$ immediate transition.
2. **The Reveal**: The feedback page slides in. Stats animate from 0 to their final value (counter effect) to create anticipation.
3. **The Insight**: User scans the "Big Win", then the circles, then the trends.
4. **The Commitment**: User sees the streak status, confirming their daily habit is maintained.
5. **The Exit**: User clicks "Back to Dashboard", feeling a sense of closure and progress.

## 4. Streak Maintenance: Helpful vs. Intrusive
To avoid anxiety, we use "Positive Reinforcement" rather than "Fear of Loss":
- **Avoid**: "Warning: Your streak will expire in 4 minutes!"
- **Prefer**: "Almost there! Just 4 more minutes to keep your streak alive! 🚀"
- **Visuals**: Use a gentle blue/purple color for the "remaining time" state, and a vibrant orange/gold for the "preserved" state.

## 5. API Dependencies
- `GET /api/sessions/{id}/feedback`: Must provide the `comparisons` and `streak` objects as defined in functional analysis.
- If `comparisons` are null (first session), the UI must replace trend arrows with "Baseline established!".
