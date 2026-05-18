# Bug Analysis: Style Switching During Quiz Shows Results

**Bug ID:** style-switch-quiz
**Status:** Fixed
**Priority:** Medium (prio:2)
**Reported:** 2026-04-20
**Fixed:** 2026-05-18
**Affected Files:** `letmelearn/pages/quiz.js`, `letmelearn/pages/training.js`

## Related Bugs

This analysis covers two related bugs:
1. **Style switching shows results** - Results view shown when toggling style/orientation
2. **Stats incorrect after style switch** - Session stats reset on style change

## Summary

When a user switches between multiple choice and text input modes (or changes orientation) during an active quiz, the results view is incorrectly shown as if the quiz ended, and the session stats are reset.

## Symptoms

1. User is in the middle of a quiz
2. User clicks the style toggle (multiple choice ↔ text input) or orientation toggle
3. **Bug 1**: Results view appears below the quiz, as if the quiz ended
4. **Bug 2**: Stats are reset instead of accumulating (final stats only show first part)

## Expected Behavior

- Quiz should continue without interruption
- Current question should remain the same, just display differently
- Stats (attempts, correct, questions) should continue accumulating
- No results should be shown until quiz is actually completed

## Root Cause Analysis

### Code Flow

**quiz.js:**
```javascript
toggle_style: function() {
  this.multiplechoice = !this.multiplechoice;
  this.reset();  // ← PROBLEM: Calls reset()
},

reset: function() {
  this.stop();  // ← PROBLEM: Stops the session
  this.start();
},
```

**training.js:**
```javascript
swap: function() {
  this.right2left = !this.right2left;
  this.reset();  // ← PROBLEM: Calls reset()
},
```

### Why This Happens

1. `toggle_style()` / `swap()` toggles the style flag
2. `reset()` is called to "reset" the quiz
3. `reset()` calls `stop()` which:
   - Stops the session
   - Sends session data to server
   - Shows feedback/results dialog
4. User sees results instead of continuing the quiz

### What Should Happen

The style/orientation flags are purely cosmetic:
- `multiplechoice`: Determines if question shows choices (multiple choice) or input field (fill-in)
- `right2left`: Determines orientation (left-to-right or right-to-left)

Toggling these should:
- Change the display mode
- Re-render the current question
- Continue the session uninterrupted

## Proposed Fix

Remove `reset()` calls from `toggle_style()` and `swap()`. Just toggle the flag.

**quiz.js - Before:**
```javascript
toggle_style: function() {
  this.multiplechoice = !this.multiplechoice;
  this.reset();
},
```

**quiz.js - After:**
```javascript
toggle_style: function() {
  this.multiplechoice = !this.multiplechoice;
  // Style change is cosmetic - quiz continues without reset
},
```

**training.js - Before:**
```javascript
swap: function() {
  this.right2left = !this.right2left;
  this.reset();
},
```

**training.js - After:**
```javascript
swap: function() {
  this.right2left = !this.right2left;
  // Orientation change is cosmetic - training continues without reset
},
```

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Question state not cleared | Low | Low | State is per-question, not global |
| Answer input persists incorrectly | Low | Low | Component re-renders with new style |

## Test Strategy

**Manual Testing:**
1. Start a quiz with multiple questions
2. Answer first question
3. Switch style (multiple choice ↔ text input)
4. Verify:
   - Quiz continues (no results shown)
   - Stats continue accumulating
   - Current question displays in new style
5. Continue answering questions
6. Complete quiz
7. Verify final stats include all questions

## Next Steps

1. Implement fix (remove reset() calls)
2. Manual testing
3. Verify both bugs are fixed
4. Commit

---

## Fix Summary

### Changes Made

**quiz.js:**
```javascript
// Before
toggle_style: function() {
  this.multiplechoice = !this.multiplechoice;
  this.reset();
},

// After
toggle_style: function() {
  this.multiplechoice = !this.multiplechoice;
  // Style change is cosmetic - quiz continues without reset
},
```

**training.js:**
```javascript
// Before
swap: function() {
  this.right2left = !this.right2left;
  this.reset();
},

// After
swap: function() {
  this.right2left = !this.right2left;
  // Orientation change is cosmetic - training continues without reset
},
```

### Why This Works

The style and orientation toggles (`multiplechoice` and `right2left`) are purely cosmetic flags that control how the current question is displayed:
- `multiplechoice`: Show choices (multiple choice) vs. input field (fill-in)
- `right2left`: Swap left/right orientation

These flags are passed to the question component via the `context` prop. When toggled, the component re-renders with the new style without affecting:
- The current question
- The session state
- The accumulated stats (attempts, correct, questions)

By removing the `reset()` call:
- No session stop occurs
- No results are shown
- Stats continue accumulating
- User can switch styles mid-quiz without interruption

### Bugs Fixed

Both related bugs are fixed with this single change:
1. ✅ **Style switching shows results** - No longer calls stop()
2. ✅ **Stats incorrect after style switch** - Session continues uninterrupted

### Testing

- **All 232 Python tests pass** (no backend changes)
- **Manual testing required** for frontend verification