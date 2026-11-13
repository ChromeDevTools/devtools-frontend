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
1. Make your changes (keeping each CL `<= 350` lines of `insertions + deletions`, with 100% of new code called in production and tested in the same CL).
2. Stage them: `git add <files>`.
3. Create the commit: `git commit -m "Your message"`.
   * Follow public commit message conventions: a concise summary line (`<= 72` characters) describing *what the CL changes functionally* (never migration pass/step labels such as `Pass 1:` or `(2/6)` in the subject line), a blank line, an explanatory body wrapping at 72 characters, and Git trailers (`Bug:`, `Fixed:`) in the footer. When splitting a migration into a stack, preserve the target Buganizer ID across every CL (`Bug: <id>` on intermediate CLs, `Fixed: <id>` only on the final complete CL).
   * **Never add Piper `KEY=VALUE` tags** (such as `TAG=agy`, `CONV=...`, `BUG=...`, `FIXED=...`, or `MARKDOWN=true`). Commit messages must use Git trailers only; `PRESUBMIT.py` rejects Piper tags because they break Git trailer parsing and can cause duplicate `Change-Id:` footers.
   * To associate agent conversations out of band without polluting commit descriptions with `CONV=`, configure:
     ```bash
     git config --global cl.upload-conversation-id true
     ```

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

### Uploading & Requesting Review
Always run `ChromiumCodeReviewAgent` on a Work-in-Progress (WIP) CL and resolve any `ERROR` or `WARNING` findings **before** marking the CL Ready for Review or adding human reviewers.

#### Step 1 — Upload as WIP and trigger AI review
Upload without `--send-mail` (`-s`) (and without `-c` / `--use-commit-queue`, which implies `--send-mail`) so the CL stays in Work-in-Progress, and trigger a CQ dry run (`--cq-dry-run` / `-d`) before adding human reviewers to the attention set:
```bash
git cl upload -f --cq-dry-run --commit-description="<description>"
```
Or, if the WIP patchset is already uploaded, vote `Commit-Queue+1` via `/google/bin/releases/gemini-agents-gerrit/gerrit`:
```bash
/google/bin/releases/gemini-agents-gerrit/gerrit vote Commit-Queue 1 \
  --change=<CL_NUMBER> \
  --host=https://chromium-review.googlesource.com
```
* Always include `-f` (`--force`) so that `git cl upload` runs non-interactively without opening a text editor or prompting.
* Use the same writing style as the current committer.
* Keep line length below 72.
* Add a `Bug: <issue number>` (or `Fixed: <issue number>` / `Bug: None`) trailer on a separate line.
* Use Git trailers only; never add Piper `KEY=VALUE` tags (`TAG=`, `CONV=`, etc.), which are rejected by `PRESUBMIT.py`. Ensure `cl.upload-conversation-id` is enabled (`git config --global cl.upload-conversation-id true`) to link conversation metadata out of band.
* Amend formatter/linter changes and fix linter issues before uploading.
* For a brand new stack of CLs, perform the initial WIP upload on each branch individually in parent-to-child order so each CL receives its own commit description.

#### Step 2 — Poll for `ChromiumCodeReviewAgent` findings
Poll every ~60 seconds (up to ~5 minutes) until the `ChromiumCodeReviewAgent` run completes:
1. Check whether the `ChromiumCodeReviewAgent` run has reached `"status": "COMPLETED"`:
   ```bash
   gerrit_client.py checks \
     --host https://chromium-review.googlesource.com \
     --change <CL_NUMBER> \
     --revision <PS> \
     --json_file <TMP_CHECKS_JSON>
   ```
2. Fetch the findings with `/google/bin/releases/gemini-agents-gerrit/gerrit findings` (include `--all` because `ChromiumCodeReviewAgent` marks `WARNING` findings `actionable: false`, which `gerrit findings` omits by default; if the internal binary is unavailable, read `results` on the `ChromiumCodeReviewAgent` entry in `<TMP_CHECKS_JSON>`):
   ```bash
   /google/bin/releases/gemini-agents-gerrit/gerrit findings \
     --change=<CL_NUMBER> \
     --patchset=<PS> \
     --all \
     --json \
     --host=https://chromium-review.googlesource.com
   ```

#### Step 3 — Address findings before starting human review
Inspect all `ChromiumCodeReviewAgent` findings with `ERROR` or `WARNING` severity (consulting `.agents/skills/code-review/SKILL.md`, including its Shared False-Positive Guards):
* **Real issue:** Fix the issue locally, re-verify (`devtools-verification`), `git commit --amend`, upload a new WIP patchset with `--cq-dry-run` (`git cl upload -f --cq-dry-run -t "<one sentence patch set description>"`), and repeat Step 2 on the new patchset.
* **Confirmed false positive:** While the CL is still in WIP (before adding human reviewers), reply on the CL explaining why the finding does not apply (citing `ref: f/...` if present):
  ```bash
  /google/bin/releases/gemini-agents-gerrit/gerrit messages post \
    --change=<CL_NUMBER> \
    --message="<explanation citing ref: f/...>" \
    --host=https://chromium-review.googlesource.com
  ```
* **Start human review:** Once `ChromiumCodeReviewAgent` completes with all `ERROR` and `WARNING` findings addressed, mark the CL Ready for Review and add human reviewers:
  ```bash
  /google/bin/releases/gemini-agents-gerrit/gerrit reviewers add \
    --change=<CL_NUMBER> \
    --ready \
    --reviewer=<reviewer1@chromium.org>,<reviewer2@chromium.org> \
    --host=https://chromium-review.googlesource.com
  ```
  (Or run `git cl upload -f --send-mail -r <reviewer1@chromium.org> -r <reviewer2@chromium.org>`.)

### Subsequent upload & Updating Stacks
To upload an updated CL:
```bash
git cl upload -f --cq-dry-run -t "<one sentence patch set description>"
```
* **Updating an existing stack of CLs:** Once all CLs in a stack have been initially created, **only run `git cl upload` from the leaf (latest) branch in the chain** for subsequent updates. Uploading from the leaf branch automatically runs presubmit checks and uploads new patchsets for all parent CLs in the stack simultaneously. Never upload intermediate CLs one by one when updating a stack.
* **Cog (`citc`) Workspaces & Continuous Stack CQ/CRUAS Checks:** In Cog workspaces (`/google/cog/cloud/...`), use `cog_api.py` / `vcs.sh` instead of raw `git new-branch`, and **always finish on a clean, empty working copy `@`** (`The working copy has no changes`) by squashing or abandoning temporary `@` commits immediately. After publishing a stack from its leaf commit, trigger `Commit-Queue+1` (`"notify": "NONE"`, never `Commit-Queue+2`) and check `ChromiumCodeReviewAgent` (`gerrit findings --all` and inline comments) across **every** CL in the stack throughout development rather than waiting until human review.

## Release and Roll Status

To check whether a DevTools commit (`devtools/devtools-frontend`) has rolled into `chromium/src` (`Roll status`) and what version or channel it is deployed to (`Release status`), look it up via the Chromium Dash API:

`https://chromiumdash.appspot.com/fetch_commit?commit=<sha>`

## Quick Reference

| Action | Command |
| :--- | :--- |
| Create new CL from main | `git new-branch <name>` |
| Create stacked CL | `git new-branch --upstream_current <name>` |
| Update current CL | `git commit --amend` |
| Initial WIP CL upload + CQ dry run | `git cl upload -f --cq-dry-run --commit-description="<description>"` |
| Poll `ChromiumCodeReviewAgent` findings | `/google/bin/releases/gemini-agents-gerrit/gerrit findings --change=<CL> --patchset=<PS> --all --json --host=https://chromium-review.googlesource.com` |
| Mark Ready for Review & add reviewers | `/google/bin/releases/gemini-agents-gerrit/gerrit reviewers add --change=<CL> --ready --reviewer=<emails> --host=https://chromium-review.googlesource.com` |
| Subsequent CL upload (or update stack from leaf) | `git cl upload -f --cq-dry-run -t "<message>"` |
| Reparent branch to root (`origin/main`) | `git reparent-branch --root` |
| Change branch parent | `git reparent-branch <new-parent>` |
| Archive landed/closed branches | `git cl archive -f` |
| Rebase all branches in stack | `git rebase-update` |
| Sync dependencies after rebase | `gclient sync -Df` |
| Check release & roll status | Query `https://chromiumdash.appspot.com/fetch_commit?commit=<sha>` |

## Common Mistakes
- **Adding Piper `KEY=VALUE` tags to commit messages:** Never add `TAG=agy`, `CONV=...`, `BUG=...`, `FIXED=...`, or other Piper metadata tags to commit descriptions. DevTools is a public Git repository; internal Piper tags break Git trailer parsing and Gerrit `Change-Id` handling, and are rejected by `PRESUBMIT.py`. Use Git trailers (`Bug:`, `Fixed:`) instead, and enable `git config --global cl.upload-conversation-id true` so `git cl upload` attaches conversation IDs out of band.
- **Starting human review before resolving `ChromiumCodeReviewAgent` findings:** Never pass `--send-mail` (`-s`) or `-c` (`--use-commit-queue`) on the initial upload, or add human reviewers to the attention set before AI review finishes. Upload in WIP with `--cq-dry-run`, wait for `ChromiumCodeReviewAgent` to complete, and address all `ERROR` and `WARNING` findings first.
- **Multiple commits on one branch:** Gerrit expects one commit per CL. Always `commit --amend`.
- **Using `git checkout -b`:** Does not set up tracking information correctly for `depot_tools`. Use `git new-branch`.
- **Manual rebasing of stacked branches:** Never use manual `git rebase` loops. Always use `git rebase-update` or `git reparent-branch` to let `depot_tools` handle tracking updates.
- **Uploading intermediate branches when updating a stack:** When updating an existing stack of CLs, do not run `git cl upload` on each branch in a chain—uploading from the leaf branch uploads new patchsets for all parent CLs automatically (note: initial uploads must still be done per branch).
- **Archiving parent branches before reparenting:** Always run `git fetch` and `git reparent-branch --root` on the child branch before archiving a landed parent branch with `git cl archive -f`.
