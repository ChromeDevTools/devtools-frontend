---
name: devtools-version-control
description: Use when managing branches, creating and uploading CLs, or handling stacked changes in the DevTools Gerrit-based workflow.
---

# DevTools Version Control

## Overview
Chrome DevTools uses Gerrit for code review. The standard workflow is **one branch per Change List (CL)** and **one commit per branch**. Instead of multiple commits, you amend your single commit locally.

## Core Workflow

### Creating a New CL
To start a new task, create a new branch from `main`:
```bash
git new-branch <branch-name>
```
*Note: This automatically sets the upstream to `origin/main`.*

### Making Changes
1. Make your changes.
2. Stage them: `git add <files>`.
3. Create the commit: `git commit -m "Your message"`.

### Updating a CL (Amending)
To update your CL after feedback or more work:
1. Make more changes.
2. Stage them: `git add <files>`.
3. Amend the commit: `git commit --amend`.

### Stacked CLs
If CL B depends on CL A:
1. While on branch A, create branch B:
   ```bash
   git new-branch --upstream_current <branch-B>
   ```
2. Develop on branch B.
3. When uploading B, Gerrit will show the dependency on A.

### Reparenting
If you need to change the base of a branch (e.g., move CL B to be based on `main` instead of CL A):
```bash
git reparent-branch main
```
Or to make it depend on another branch C:
```bash
git reparent-branch <branch-C>
```

### Syncing with Upstream
To update all your branches with the latest changes from `main` and their respective upstreams:
```bash
git rebase-update
```

### Initial upload
When a CL is ready, upload it with:
```bash
git cl upload -d --commit-description="<description>"
```
* Use the same writing style as the current committer
* Keep line length below 72
* Add a "Bug: <issue number>" or "Bug: None" trailer on a separate line.
* Amend formatter/linter changes and fix linter issues.

### Subsequent upload
To upload an updated CL:
```bash
git cl upload -d -t "<one sentence patch set description>"
```

## Quick Reference

| Action | Command |
| :--- | :--- |
| Create new CL from main | `git new-branch <name>` |
| Create stacked CL | `git new-branch --upstream_current <name>` |
| Update current CL | `git commit --amend` |
| Upload to Gerrit | `git cl upload` |
| Change branch parent | `git reparent-branch <new-parent>` |
| Sync all branches | `git rebase-update` |

## Common Mistakes
- **Multiple commits on one branch:** Gerrit expects one commit per CL. Always `commit --amend`.
- **Using `git checkout -b`:** Does not set up tracking information correctly for `depot_tools`. Use `git new-branch`.
- **Manual rebasing of stacked branches:** Can be complex. Use `git rebase-update` or `git reparent-branch` to let `depot_tools` handle the tracking updates.
