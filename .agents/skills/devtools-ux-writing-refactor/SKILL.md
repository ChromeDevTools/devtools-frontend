---
name: devtools-ux-writing-refactor
description: >-
  Refactor user-facing UIStrings and localization comments in a DevTools module folder according to UX writing guidelines (child task of b/40799900). Use when simplifying wording, checking sentence case, or improving L10n comments in UIStrings for a specific folder or issue. Don’t use for general code changes or non-UIStrings files.
---

# DevTools UX writing refactoring workflow

Use this skill when addressing a single UX writing refactoring task (one module folder or child issue under tracking bug [b/40799900](https://crbug.com/40799900)).

## 0. Environment setup (avoid PATH errors)

In DevTools Linux workspaces, `depot_tools` and `node`/`npm` may not be in `PATH` in non-interactive agent shells. Before you run Git, `gclient`, `npm`, or `git cl` commands, ensure that your environment is set up:
```bash
export PATH=$HOME/depot_tools:$PATH
source ~/.nvm/nvm.sh  # Or export PATH=$(pwd)/third_party/node/linux/node-linux-x64/bin:$PATH
```

## 1. Pre-flight issue check and target scope

Before you write code or modify files, check the status of the associated Buganizer issue:
```bash
$ISSUES render <issue_number>  # Or use buganizer MCP tools: render_issue / render_issue_with_external
```
* **Why?** Multiple developers and agents work on child tasks under `b/40799900`.
* **Action required:** If the issue is marked as `FIXED`, `VERIFIED`, or `CLOSED`, is assigned to another active developer, or has an attached Change List (CL), **stop immediately and verify whether you need to address it**. Ask the user for confirmation before you override existing work.
* **Identify target files:** If `render_issue` returns an external redaction notice, use `render_issue_with_external` to view the full bug description. The bug description typically lists the exact **Target Files** to refactor for this child task. Focus exclusively on those target files.

## 2. Create a branch

Create a branch dedicated to this issue from the latest `origin/main` (after you run `gclient sync`) using the DevTools version control tool:
```bash
git fetch origin
git checkout origin/main
gclient sync
git new-branch fix-<issue_number>
```
* **Why?** In Chrome DevTools, don’t use standard Git commands such as `git checkout -b` or `git switch -c`. Always use `git new-branch` so that `depot_tools` and Gerrit configure tracking information correctly.
* **Naming:** Always include the issue number in the branch name (for example, `fix-531625399`).

## 3. Refactor UIStrings and localization comments

Locate all TypeScript files in the target folder that define `const UIStrings = { ... }` and apply the **8-point UX writing checklist** (cross-check with official DevTools documentation at https://developer.chrome.com/docs/devtools).

> [!IMPORTANT]
> **Ignore non-localized or experimental strings:** Don’t modify strings in `const UIStringsNotTranslate = { ... }`, `lockedString`, or `i18n.i18n.lockedString`. These strings are for early-stage or experimental features that you mustn’t localize or alter during UX refactoring.

### The 8-point checklist
1. **Brevity and short synonyms:** Replace formal or lengthy words:
   * `preserve` -> `keep` | `additional` -> `more` | `prevent` -> `stop` | `receive` -> `get`
   * `submit` -> `send` | `modification` -> `change` | `create` -> `add` | `suitable` -> `fit`
   * *Check sibling references:* If you change a setting name or label (for example, changing “Preserve log” to “Keep log”), search sibling files in the folder for explanatory text or status strings that reference the old name in quotes (for example, “console.clear() was prevented due to ‘Preserve log’”), and update them to match.
2. **Cut unnecessary words:** Eliminate politeness (`please`, `sorry`), filler (`very`, `strongly`, `there is` or `there are`), and marketing fluff (`seamless`, `awesome`, `fast`, `quick`).
3. **Contractions:** Use contractions (`don’t`, `can’t`, `isn’t`, `won’t`) instead of formal spellings (`do not`, `cannot`, `is not`, `will not`).
4. **Curly apostrophes, quotation marks, and ellipses:** Use curly apostrophes (`’`) in user-facing `UIStrings` values for contractions and possessives. Double quotes should be straight (`"`) to avoid usability issues when users want to copy string literals, though consider not using double quotes at all where not necessary. Note that using both double quotes and backticks (for example, `"`Permissions-Policy`"`) is valid and useful when a fixed term needs to be visually enclosed in quotes in the UI, as backticks are used for localization locking and are often not rendered visually. Use the ellipsis character (`…`) instead of three periods (`...`). Use prime (`′`) and double prime (`″`) symbols as needed for measurements like length or coordinates.
5. **Sentence case and capitalization:** Use sentence case for headings, labels, and UI element names. Capitalize only the first word, proper nouns, product names (`Chrome DevTools`), and web APIs (`Background Fetch API`).
   * Don’t capitalize feature names (for example, `conditional breakpoint` or `command menu`).
   * Capitalize panel names and UX elements that are named after panels (for example, `Show Application`, `Toggle Console`, `Console sidebar`, or `Styles`).
   * For panel names that consist of two words, capitalize only the first word (for example, `Developer resources panel`).
   * When you use the panel name in combination with another word, capitalize the panel name but not the other word, unless it is a proper noun (for example, `Console view` or `DevTools Console`).
   * In some cases, ambiguity exists whether a word refers to a UX element in DevTools (such as a panel name) or a concept (such as developer terminology). For example, this occurs with `console`, `issue`, or `network`. Decide based on the surrounding context and code (for example, `Console view`, `Console sidebar`, and `Console prompt` versus `console message`, `console warning`, `console log`, `copy console`, `clear console`, and `console history`; `Show Network` versus `network log` and `network filter`).
   * **Casing in `@description` comments:** Apply the same capitalization rules to `@description` comments: ONLY panel names use sentence case (for example, `Memory panel`, `Console panel`, `Performance panel`). Feature names, view names, tool names, and sub-components MUST be all lowercase unless they appear at the very start of the description sentence or phrase (for example, `heap profiler`, `heap snapshot view`, `isolate selector`, `allocation sampling`, `command menu`, `summary view`).
6. **Punctuation and actionability:** Remove trailing periods from single-sentence labels or titles. Ensure that error messages instruct the user how to recover (for example, `Shorten filename to 64 characters or less` instead of `Invalid filename`). Ensure that ARIA labels and multi-sentence tooltips have consistent terminal punctuation.
7. **Terminology (glossary):** Strictly follow standard DevTools UI terminology and letter casing (`panel`, `tab`, `drawer`, `sidebar`, `datagrid` or `table`, `action bar`, `status bar`, and `live expressions section`). Never use `pane` or call tabs `panes` in UI strings or localization (L10n) comments.
8. **Localization (L10n) comments:** Ensure that every string in `UIStrings` has a preceding `@description` comment that explains where and when it appears. This information is used for translators who need to understand the context in which the string is used.
   * **Research usage sites:** Before modifying or writing `@description` comments, always research where the string key (for example, `UIStrings.keyName`) is used in the codebase (`grep_search` or view surrounding code). Determine the exact UI element type (for example, button label, tooltip, table column header, context menu item, checkbox label, aria label, status bar message, or dropdown option) and location (panel, view, sidebar, or dialog).
   * **Avoid redundancy and repetition:** Do not simply repeat or restate the UI string value in the description (for example, avoid `@description Text for clear all profiles` for `'Clear all profiles'`). Instead, describe the UI role, element type, and location (for example, `@description Tooltip text for the clear button in the profiles sidebar of the Memory panel.`).
   * **Consistency across similar descriptions:** Ensure consistent phrasing structure across descriptions of similar UI strings in the same module and throughout DevTools (for example, use uniform patterns like `Tooltip text for the <action> button in <location>.` or `Column header in <table_name> datagrid for <purpose>.`).
   * **Casing in descriptions:** Strictly follow the rule that ONLY panel names use sentence case (for example, `Memory panel`, `Console panel`, `Profiles panel`), while feature names, views, tools, and sub-components are ALL LOWERCASE (for example, `heap profiler`, `heap snapshot view`, `isolate selector`, `allocation sampling`, `summary view`), unless appearing at the start of the description sentence or phrase.
   * **Straight apostrophes in comments:** Always use straight apostrophes (`'`) in code comments (such as `@description` comments and L10n annotations), even if the UI string itself uses curly apostrophes (`’`).
   * **Placeholders:** You must explicitly document all standard placeholders (`{PH1}`, `{url}`, `{index}`) with runtime data examples (for example, `@example {https://example.com} url`).
   * *ICU plural variables:* The i18n tool automatically parses variables in ICU plural format (such as `n` in `{n, plural, =0 {No issues} ...}`) as numeric counts, so they don’t require an `@example` tag in the `@description` comment.
   * *Terminal punctuation:* Every `@description` comment must end with a period (`.`), even if it is a single phrase or sentence.

## 4. Chrome writing style guide

Also consult the style guides at `google3/experimental/users/rachelandrew/tools/chrome_writing/knowledge/style/` for applicable guidelines.

## 5. Subagent critique of proposed changes

Before running tests or pausing for user review, enter an iterative critique loop with a subagent:
1. **Invoke subagent:** Use `invoke_subagent` with `TypeName: "self"` and `Role: "UX Writing Reviewer"`.
2. **Prompt instructions:** Provide the subagent with the `git diff` of your changes and instruct it to critique the refactoring against the **8-point UX writing checklist**:
   - Are `@description` comments specific, informative, and non-redundant (not restating string values)?
   - Are usage sites researched so the UI element type and location are accurately described?
   - Do `@description` comments and string values strictly follow the casing rule (ONLY panel names in sentence case, feature/view names in all lowercase unless starting a phrase)?
   - Are contractions, curly apostrophes, ellipses, and placeholders (`{PH1}`) correctly formatted?
   - Were all references in sibling code/tests properly updated?
3. **Address feedback and loop:**
   - If the subagent raises any feedback, concerns, or suggested fixes, apply the necessary code changes.
   - Re-invoke the subagent with the updated `git diff` to re-critique the changes.
   - **Repeat this loop continuously as long as the subagent has feedback, until the subagent explicitly approves the diff with no remaining issues.**

## 6. Pause for confirmation

Ask the user for a preliminary review of the proposed changes before proceeding. If the user has feedback, address feedback and pause again for confirmation.

## 7. Mandatory verification and testing

Don’t finish an edit without running the linter and test suite. In DevTools, i18n placeholder changes or string edits can easily break tests or linter rules.

1. **Update sibling unit tests**
   Unit test files (`*.test.ts`) alongside the implementation often assert exact UIString values (such as error messages or warnings). When you refactor a string, check sibling `*.test.ts` files for assertions that match the old string value, and update them to prevent test failures.
2. **Run the linter and auto-fix errors**
   ```bash
   npm run lint -- <folder_path>
   ```
3. **Run unit tests**
   You MUST run the full test suite using `npm run test` to verify that no cross-module regressions, e2e test failures, or snapshot regressions occurred. Do not only run a subset of tests:
   ```bash
   npm run test
   ```
   *(Optionally, you may run `npm run test -- <folder_path>` first for rapid initial feedback during iterative development, but running `npm run test` for full test suite coverage is required before completing the task.)*
4. **Run presubmit checks**
   Ensure that you commit or stage all changes before you run presubmit checks:
   ```bash
   git cl presubmit -u
   ```

## 8. Summarize changes and upload the CL

When all tests and presubmit checks pass, commit your changes and upload the CL to Gerrit. Don’t use `[uxw]` as a prefix.

1. **Stage and commit changes**
   ```bash
   git add <modified_files>
   git commit -m "Ensure consistent UI Strings in <folder_path>"
   ```
   *(If you update an existing commit on this branch, use `git commit --amend`).*

2. **Upload the CL to Gerrit**
   Upload the CL using `git cl upload -f`. Always pass `-f` (`--force`) to prevent `git cl upload` from prompting or opening an interactive text editor in background agent shells:
   ```bash
   git cl upload -f -d --commit-description="Ensure consistent UI Strings in <folder_path>

   Summary of changes:
   - <dynamically list specific words replaced, contractions adopted, or sentence case fixes>

   Fixed: <issue_number>"
   ```
   * **Formatting rules:**
     * Keep line length below 72 characters.
     * Include `Fixed: <issue_number>` on a separate line at the bottom of the description so that automation closes the issue.
