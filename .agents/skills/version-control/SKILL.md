---
name: devtools-version-control
description: Use when starting a new task, creating a branch, switching branches, managing branches, creating and uploading CLs, handling stacked changes, or checking release and roll status in the DevTools Gerrit-based workflow. ALWAYS use this instead of running standard git checkout/switch commands for branch creation.
---

# DevTools Version Control

> [!IMPORTANT]
> **DO NOT use standard Git commands like `git checkout -b` or `git switch -c` to create branches.**
> In Chrome DevTools, you MUST always use `git new-branch <branch-name>` (or `git new-branch --upstream_current <branch-name>` for stacked CLs). Standard commands fail to configure the correct upstream tracking branch required by `depot_tools` and Gerrit.

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

### Reparenting & Detaching Landed CLs
If you need to change the base of a branch back to the root branch (e.g., move CL B to be based on `origin/main` instead of CL A):
```bash
git reparent-branch --root
```
Or to make it depend on another branch C:
```bash
git reparent-branch <branch-C>
```
* **Detaching from landed CLs:** When parent CLs in a stack have landed on `main`, first run `git fetch` so `origin/main` includes the landed commits (otherwise reparenting will trigger merge conflicts). Then check out the first unlanded branch in the chain and run `git reparent-branch --root` **before** archiving the landed branches (so `depot_tools` can still resolve the old upstream tracking branch). After reparenting (which automatically runs `git rebase-update`), archive the landed branches (`git cl archive -f`) and run `gclient sync -Df`.

### Syncing with Upstream
To update all your branches with the latest changes from `main` and their respective upstreams, and synchronize dependencies:
```bash
git rebase-update && gclient sync -Df
```
* **Always use `git rebase-update` for stacks:** Never write manual `git checkout && git rebase` loops across stacked branches. `git rebase-update` automatically rebases the entire dependency graph in order.
* **Clean up old branches first:** Before running `git rebase-update`, archive landed/closed branches (`git cl archive -f`) or mark dormant (`git config branch.<branch>.dormant true`) any obsolete branches so they do not trigger unnecessary rebase conflicts.
* **Always sync dependencies after rebase:** Always run `gclient sync -Df` after a `git rebase-update`. CIPD dependency updates do not show up in `git status`, so skipping `gclient sync -Df` risks leaving your checkout out of sync.

### Initial upload
When a CL is ready, upload it with:
```bash
git cl upload -f -d --commit-description="<description>"
```
* Always include `-f` (`--force`) so that `git cl upload` runs non-interactively without opening a text editor or prompting.
* Use the same writing style as the current committer
* Keep line length below 72
* Add a "Bug: <issue number>" or "Bug: None" trailer on a separate line.
* Amend formatter/linter changes and fix linter issues.
* For a brand new stack of CLs, perform the initial upload on each branch individually in parent-to-child order so each CL receives its own commit description.

### Subsequent upload & Updating Stacks
To upload an updated CL:
```bash
git cl upload -f -d -t "<one sentence patch set description>"
```
* **Updating an existing stack of CLs:** Once all CLs in a stack have been initially created, **only run `git cl upload` from the leaf (latest) branch in the chain** for subsequent updates. Uploading from the leaf branch automatically runs presubmit checks and uploads new patchsets for all parent CLs in the stack simultaneously. Never upload intermediate CLs one by one when updating a stack.

## Release and Roll Status

To check whether a DevTools commit (`devtools/devtools-frontend`) has rolled into `chromium/src` (`Roll status`) and what version or channel it is deployed to (`Release status`), look it up via the Chromium Dash API:

`https://chromiumdash.appspot.com/fetch_commit?commit=<sha>`

## Quick Reference

| Action | Command |
| :--- | :--- |
| Create new CL from main | `git new-branch <name>` |
| Create stacked CL | `git new-branch --upstream_current <name>` |
| Update current CL | `git commit --amend` |
| Initial CL upload | `git cl upload -f -d --commit-description="<description>"` |
| Subsequent CL upload (or update stack from leaf) | `git cl upload -f -d -t "<message>"` |
| Reparent branch to root (`origin/main`) | `git reparent-branch --root` |
| Change branch parent | `git reparent-branch <new-parent>` |
| Archive landed/closed branches | `git cl archive -f` |
| Rebase all branches in stack | `git rebase-update` |
| Sync dependencies after rebase | `gclient sync -Df` |
| Check release & roll status | Query `https://chromiumdash.appspot.com/fetch_commit?commit=<sha>` |

## Common Mistakes
- **Multiple commits on one branch:** Gerrit expects one commit per CL. Always `commit --amend`.
- **Using `git checkout -b`:** Does not set up tracking information correctly for `depot_tools`. Use `git new-branch`.
- **Manual rebasing of stacked branches:** Never use manual `git rebase` loops. Always use `git rebase-update` or `git reparent-branch` to let `depot_tools` handle tracking updates.
- **Uploading intermediate branches when updating a stack:** When updating an existing stack of CLs, do not run `git cl upload` on each branch in a chain—uploading from the leaf branch uploads new patchsets for all parent CLs automatically (note: initial uploads must still be done per branch).
- **Archiving parent branches before reparenting:** Always run `git fetch` and `git reparent-branch --root` on the child branch before archiving a landed parent branch with `git cl archive -f`.
