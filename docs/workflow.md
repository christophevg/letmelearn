# Let Me Learn Workflow

This document describes how we work on the Let Me Learn project.

## Getting Started

When starting a new session:
1. Read `TODO.md` to understand current priorities
2. Review `CLAUDE.md` for project context and commands
3. Check `git status` for any uncommitted work-in-progress

## TODO Management

### Priority System

We use priorities to order work. Higher priority = do first.

| Priority | Meaning |
|----------|---------|
| prio:1 | Most urgent - do first |
| prio:2-4 | Medium priority |
| prio:5 | Nice to have |
| prio:0 | Unprioritized - lowest |

### Processing TODO Items

When asked to work on tasks:
1. Propose items with highest priority first
2. Get confirmation before starting work
3. Mark items as in-progress when starting
4. Mark items as completed when done
5. Request review before moving to next item

### TODO Structure

```
# TODO

## Priority Order (reference)

## Backlog (long-term items)

## Fix (bugs and issues)

## Improve (enhancements)
  ### General
  ### Ad Valvas Dashboard

## Extend (new features)

---

## Done (completed items for reference)
```

## Commit Workflow

### Committing Changes

1. Always review what will be committed (`git status`, `git diff`)
2. Ask what to commit if multiple uncommitted changes exist
3. Group related changes into logical commits
4. Use conventional commit messages with emoji footer:
   ```
   Brief description of what was changed

   Optional details about why/how.

   🤖 Implemented together with a coding agent.
   ```

### Reviewing Uncommitted Changes

When asked to review uncommitted changes:
1. Categorize changes into individual change-sets
2. For each change-set:
   - Check if complete
   - If complete: explain and commit
   - If incomplete: complete, explain, and commit
3. For unclear changes: discuss with user until clear

## Code Review

### Analyzing Code

When reviewing code:
1. Read files thoroughly before proposing changes
2. Understand the architecture (see `docs/architecture.md`)
3. Explain findings before making changes
4. Propose improvements with rationale

### Proposing Improvements

1. Organize by priority/impact (High/Medium/Low)
2. Be specific about what needs to change
3. Explain the benefit of each improvement
4. Get approval before implementing

## Documentation

### What We Document

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context for Claude instances |
| `docs/architecture.md` | Codebase structure and data flow |
| `docs/workflow.md` | This file - how we work |
| `TODO.md` | Task tracking with priorities |

### When to Update Documentation

- `CLAUDE.md`: When adding new commands, patterns, or architecture changes
- `docs/architecture.md`: When structure changes significantly
- `TODO.md`: After completing tasks, when proposing new features
- `docs/workflow.md`: When workflow patterns emerge or change

## Project Structure

```
letmelearn/
├── letmelearn/          # Python backend
│   ├── web.py           # Entry point
│   ├── api.py           # REST endpoints
│   ├── auth.py          # OAuth/User management
│   ├── data.py          # MongoDB connection
│   ├── treeitems.py     # Folder/Topic dataclasses
│   ├── pages/           # Vue page components
│   ├── components/      # Vue reusable components
│   └── static/          # Static JS/CSS
├── tests/               # pytest tests
├── docs/                # Documentation
└── TODO.md              # Task tracking
```

## Session Patterns

### Starting Work

```
User: review TODO
→ Propose highest priority items

User: work on X
→ Confirm understanding
→ Implement
→ Request review
→ Commit
```

### Reviewing Code

```
User: review X
→ Analyze and explain
→ Propose improvements (if any)
→ Get approval
→ Implement
```

### Handling Uncommitted Changes

```
User: review uncommitted changes
→ Categorize into change-sets
→ For each: check completeness, explain, commit
→ Discuss unclear items
```