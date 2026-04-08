# Functional Analysis - Backlog Review

**Date**: 2026-04-08
**Analyst**: Functional Analyst Agent

## Executive Summary

This document captures the backlog review decisions and clarifications from the prioritization session on 2026-04-08. The review focused on refining priorities and ensuring task scope is clearly defined.

## Backlog Review Decisions

### 1. Priority Consolidation

**Decision**: Ensure only ONE item has `prio:1` (highest priority)

**Rationale**: Having multiple `prio:1` items dilutes focus. The most critical task is establishing comprehensive backend testing.

**Changes Made**:
- Kept `create backend tests for all API calls based on OpenAPI spec` as the sole `prio:1` item
- Changed `When the "alternate identify" feature is used...` from `prio:1` to `prio:2`

### 2. Streak Freeze Deprioritization

**Decision**: Lower streak freeze feature from `prio:2` to `prio:3`

**Rationale**: The streak freeze feature, while valuable, is not as critical as other improvements. It requires the core streak feature to be fully mature first, making it a dependent/secondary feature.

**Changes Made**:
- Changed `add streak freeze feature` from `prio:2` to `prio:3`

### 3. Testing Scope Clarification

**Decision**: Supersede the generic `add testing (prio:0)` task with a specific, scoped testing task

**Rationale**: The original task was too vague. The new `prio:1` task clearly defines the testing scope.

**Changes Made**:
- Removed `add testing (prio:0)` from the Improve section
- Added it to Done section with note: "Superseded by prio:1 backend testing task with clarified scope"
- Expanded the `prio:1` testing task description to include:
  - API tests based on OpenAPI specification
  - Unit tests for module-level functionality
  - Ensuring the public API layer operates as documented

### 4. Framework Refactoring Tasks

**Decision**: Remove framework refactoring implementation steps tracking

**Rationale**: These were temporary tracking items for a completed migration. No need to continue tracking these.

**Note**: No explicit tasks were found to remove - this was already handled or not present in the backlog.

## Prioritized Tasks Summary

### Priority 1 (Most Urgent - Do First)

| Task | Description |
|------|-------------|
| Backend Testing | Create backend tests for all API calls based on OpenAPI spec. Scope includes: API tests, unit tests for module-level functionality, ensuring public API layer operates as documented. |

### Priority 2 (Medium Priority)

| Task | Description |
|------|-------------|
| Alternate Identity Dashboard | When the "alternate identify" feature is used, all sections in the advalvas dashboard (stats, feed, socials) should be updated accordingly |
| Group Feed Items by Date | Group feed items by date (Today, Yesterday, This week, Older) |
| Add Filter Chips | Add filter chips: All / Quizzes / Training / New Topics |

### Priority 3 (Lower Medium Priority)

| Task | Description |
|------|-------------|
| Streak Freeze Feature | Protect streak for one day if user misses goal. Max 2 consecutive freezes. Requires `frozen_days` array in user document. Postponed until core streak feature is implemented. |

## Resolved Ambiguities

1. **Testing scope**: The original "add testing" task was ambiguous about what to test. The updated task clearly specifies backend testing scope: API-level tests and module-level unit tests.

2. **Priority conflicts**: Multiple `prio:1` items created ambiguity about what to work on first. Now resolved with single `prio:1` item.

3. **Streak freeze timing**: The task was at `prio:2` but depends on core streak features. Lowering to `prio:3` reflects its dependent nature.

## Files Modified

- `/Users/xtof/Workspace/letmelearn/TODO.md` - Updated priorities and task descriptions

## Next Steps

1. Implement the `prio:1` backend testing task
2. Request functional review upon completion