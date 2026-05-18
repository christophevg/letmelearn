# Feature: Show Elapsed Time During Test

**Feature ID:** elapsed-time-display
**Status:** Implementing
**Priority:** Medium (prio:3)
**Files:** `letmelearn/pages/quiz.js`, `letmelearn/pages/training.js`

## Summary

Display real-time elapsed time during quiz/training sessions so users can see how long they've been practicing.

## Current State

1. **Timer component** (`Timer.js`):
   - Supports countdown timer (set minutes, shows progress bar)
   - Tracks `elapsed` time internally (only when countdown is active)
   - Shows progress bar only when `visible` and `seconds > 0`

2. **Quiz/Training pages**:
   - Timer component used but only for countdown
   - Elapsed time sent to server on session stop
   - No real-time display of elapsed time during quiz

## Proposed Implementation

### Option A: Track elapsed time independently (Recommended)

Add elapsed time tracking directly in quiz.js/training.js:

1. **Track start time**: Record when quiz starts
2. **Computed property**: Calculate elapsed time from start
3. **Update interval**: Use setInterval to update every second
4. **Display**: Show in toolbar with formatted time (mm:ss)

**Pros:**
- Works with or without countdown timer
- Simple implementation
- Independent of Timer component

**Cons:**
- Duplicated code in quiz.js and training.js

### Option B: Modify Timer component

Modify Timer.js to show elapsed time when no countdown is set.

**Pros:**
- Centralized time tracking
- No duplication

**Cons:**
- More complex Timer component
- Changes affect all Timer usage

## Implementation Details (Option A)

### quiz.js changes:

```javascript
// data
data: function() {
  return {
    // ... existing data
    startTime: null,
    elapsedSeconds: 0,
    elapsedInterval: null
  }
}

// computed
computed: {
  // ... existing computed
  formattedElapsed: function() {
    var minutes = Math.floor(this.elapsedSeconds / 60);
    var seconds = this.elapsedSeconds % 60;
    return minutes.toString().padStart(2, '0') + ':' +
           seconds.toString().padStart(2, '0');
  }
}

// methods - start
start: function() {
  // ... existing start logic
  this.startTime = Date.now();
  this.elapsedInterval = setInterval(this.updateElapsed, 1000);
}

// methods - stop
stop: function() {
  // ... existing stop logic
  clearInterval(this.elapsedInterval);
}

// methods - new
updateElapsed: function() {
  if (this.startTime) {
    this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
  }
}
```

### Template changes:

Add elapsed time display in toolbar:

```html
<v-toolbar height="40" v-if="playing">
  <v-toolbar-side-icon><v-icon>play_arrow</v-icon></v-toolbar-side-icon>
  <span class="elapsed-time">{{ formattedElapsed }}</span>
  <v-progress-linear ... />
</v-toolbar>
```

## Acceptance Criteria

1. ✅ Elapsed time starts when quiz/training begins
2. ✅ Elapsed time displays in real-time (updates every second)
3. ✅ Format: mm:ss (e.g., "05:23")
4. ✅ Elapsed time stops when quiz/training ends
5. ✅ Works with or without countdown timer
6. ✅ Same implementation in quiz.js and training.js

## Next Steps

1. Implement in quiz.js
2. Implement in training.js
3. Add CSS styling for elapsed time display
4. Manual testing
5. Commit

---

## Implementation Summary

### Changes Made

**quiz.js:**
- Added `startTime`, `elapsedSeconds`, `elapsedInterval` to data
- Added `formattedElapsed` computed property (mm:ss format)
- Added `updateElapsed()` method to update elapsed time every second
- Modified `start()` to initialize elapsed time tracking
- Modified `stop()` to clear elapsed time interval
- Added `<span class="elapsed-time">{{ formattedElapsed }}</span>` to toolbar

**training.js:**
- Same changes as quiz.js

**custom.css:**
- Added `.elapsed-time` styling for the elapsed time display

### How It Works

```
┌─────────────────────────────────────────┐
│            Quiz Start                   │
│                 │                       │
│                 ▼                       │
│    startTime = Date.now()               │
│    elapsedInterval = setInterval(...)   │
│                 │                       │
│                 ▼                       │
│    updateElapsed() every second:        │
│    elapsedSeconds = (now - start) / 1000│
│                 │                       │
│                 ▼                       │
│    formattedElapsed = mm:ss             │
│    (displayed in toolbar)                │
│                 │                       │
│                 ▼                       │
│            Quiz Stop                    │
│    clearInterval(elapsedInterval)        │
└─────────────────────────────────────────┘
```

### User Experience

- User starts quiz/training
- Elapsed time appears in toolbar as "00:00"
- Time updates every second ("00:01", "00:02", ...)
- Format shows minutes:seconds (e.g., "05:23" for 5 min 23 sec)
- Time stops when quiz/training ends
- Works regardless of countdown timer setting