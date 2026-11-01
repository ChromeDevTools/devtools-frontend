---
name: devtools-uistrings
description: >-
  Reviews added or modified UIStrings and localization (@description / @example)
  comments in Chrome DevTools for UX writing style, inline backtick locking,
  sentence case, UI glossary terminology, translator context, and sibling string
  consistency beyond what ESLint and check-strings.js enforce. Use when a CL or
  local diff adds or edits UIStrings or i18n calls in front_end/. Don't use for
  syntax rules already enforced by l10n ESLint rules or for unlocalized locked
  strings.
---

# Reviewing DevTools `UIStrings` and Localization Comments

Apply these checks when a diff adds or modifies `const UIStrings = { ... }`
entries or their JSDoc comments in `front_end/`.

## 1. Do Not Flag

- **Already enforced by ESLint (`scripts/eslint_rules/lib/l10n-*.ts`):** Do not
  comment on curly apostrophes (`’`) vs. straight quotes (`"`) inside
  `UIStrings` values, Unicode ellipses (`…`) vs. `...`, uppercase `URL`,
  negative contractions (`don’t`, `can’t`, `isn’t`, etc.), single- vs.
  multi-sentence trailing periods, whole-phrase backtick locking, or unused keys
  in regular `*.ts` files.
- **Already enforced by `third_party/i18n/check-strings.js`:** Do not comment
  on missing/empty `@description` tags, missing `@example` tags for `{PH1}`
  placeholders, unclosed backticks, malformed Markdown links, or `\n` literals.
- **Exempt strings:** Do not flag `UIStringsNotTranslate`,
  `i18n.i18n.lockedString(...)`, or pre-existing `UIStrings` entries that were
  not modified (including verbatim moves during a refactor).
- **Non-issues:** Do not nitpick minor `@description` lead-in wording variations
  that are equally clear to translators (e.g., `Tooltip text for…` vs. `Tooltip
  for…`), and do not force synonym swaps where grammar or spec precision breaks
  (e.g., `a suitable Cross-Origin Resource Policy` where `a fit …` is
  ungrammatical, or RFC terms like `additional parameters`).

## 2. Shared Capitalization & DevTools UI Terminology

Apply these rules consistently in both `UIStrings` values and `@description`
comments:

- **Sentence case:** Capitalize only the first word, proper nouns, product
  names (`Chrome DevTools`), acronyms, backtick-locked spec terms (e.g.,
  `` '`Trusted Type` violations' ``), and web platform APIs / worker types
  (`Background Fetch API`, `Service Worker` / `Service Workers`, `Web Worker` /
  `Web Workers`).
- **Panels vs. features/concepts:**
  - Capitalize user-facing panel names (`Console`, `Network`, `Elements`,
    `Sources`, `Performance`, `Memory`, `Application`, `Security`,
    `Lighthouse`, `Recorder`, `Issues`). For multi-word panel or tab names,
    capitalize only the first word (`Developer resources panel`, `Memory
    inspector panel`, `Remote devices tab`). When paired with a noun, keep the
    second word lowercase (`Console panel`, `Console sidebar`, `Memory panel`).
  - Map internal folder or class names to user-facing panel names (`profiler` ->
    `Memory panel`, `Timeline UIUtils` -> `Performance panel`,
    `linear_memory_inspector` -> `Memory inspector panel`).
  - Keep feature, view, tool, and concept names **lowercase** unless starting a
    sentence (`conditional breakpoint`, `command menu`, `quick open`, `heap
    profiler`, `heap snapshot view`, `allocation sampling`, `isolate selector`,
    `summary view`, `console message`, `network log`).
- **UI glossary & platform terms:** Use `panel`, `tab`, `drawer`, `sidebar`,
  `table` (or `datagrid`), `action bar`, and `status bar`; never call a tab,
  sidebar, or section a `pane`. Prefer `JavaScript modules` over `ES modules`,
  and write `top level` with a space when used as a noun (`The top level of
  JavaScript modules`).

## 3. User-Facing String Values

- **Prefer short, everyday synonyms (when grammatical and spec-accurate):**
  - `preserve` -> `keep` | `additional` -> `more` | `prevent` -> `stop`
  - `submit` -> `send` | `modification` -> `change` | `create` -> `add` |
    `suitable` -> `fit`
  - `receive` -> `get` in general prose (e.g., `get the reports`), **except**
    keep `receive` / `received` for network or worker data/message reception
    (e.g., `receive data while cached`, `received a message from a
    SharedWorker`).
- **Cut filler, politeness & banned branding:** Remove `please`, `sorry`,
  `very`, `strongly`, `there is` / `there are`, marketing adjectives
  (`seamless`, `awesome`, `fast`, `quick`), and `"Powered by AI"` (use neutral
  action labels such as `'Understand this message'`).
- **Inline backtick-locking (`\`...\``):** Wrap embedded technical tokens (CSS
  properties, values, and media features like `` `print` ``, `` `screen` ``,
  `` `prefers-color-scheme` ``; HTTP headers like `` `Alt-Svc` ``; HTML
  attributes; and JS APIs like `` `console.clear()` ``) in backticks so
  translators do not translate them. Keep spec capitalization inside backticks
  while using sentence case outside (`` '`Trusted Type` violations' ``).
- **Articles, positive contractions, symbols & actionability:** Avoid fragile
  `a` / `an` articles before `{PH1}` placeholders or initialisms (`HTTP`, `XHR`)
  when shorter article-free phrasing works. Use natural positive contractions
  not checked by ESLint (`it’s`, `you’re`, `we’re`, `that’s`, with curly `’`),
  and use prime (`′`) and double prime (`″`) for measurements or coordinates.
  State how to recover in error messages (e.g., `Shorten filename to 64
  characters or less` instead of `Invalid filename`).

## 4. Localization Comments (`@description` & `@example`)

- **Explain UI role and concrete sub-location, never repeat the string:**
  Inspect where `UIStrings.<key>` is called and name the UI element type (button
  label, tooltip, column header, checkbox label, context menu item,
  `aria-label`, status text) and concrete panel/sub-view location instead of
  echoing the message text. Keep specific sub-locations such as `in the summary
  view of the Performance panel` rather than collapsing them to `in the
  Performance panel`.
- **No internal code or protocol names:** Do not reference C++ identifiers, CDP
  enum names, or class names in `@description` comments. Describe the
  user-visible state instead.
- **Verify `@example` values against the call site:** Check what
  `i18nString(UIStrings.<key>, {PH1: ...})` passes at runtime (especially
  whether units like `%` or `ms` are already formatted inside `{PH1}` vs.
  outside in the template, e.g., `@example {12.34%} PH2`) and use realistic
  runtime values rather than type names like `{string}`. Do not ask for
  `@example` tags on ICU plural count variables.
- **Comment formatting:** Use straight apostrophes (`'`) and straight quotes
  (`"`) in code comments (even when `UIStrings` uses curly `’`), and end every
  `@description` with a period (`.`).

```ts
// Bad: repeats the string, uses internal/legacy names, unlocked token, vague example
/**
 * @description Text for preserve log checkbox in Timeline UIUtils Pane
 * @example {string} PH1
 */
preserveLog: 'Please preserve additional print log entries in {PH1}',

// Good: role + sub-location, sentence case, locked token, realistic example
/**
 * @description Checkbox label in the summary view of the Performance panel to
 * keep log entries across page loads.
 * @example {https://example.com} PH1
 */
keepLog: 'Keep more `print` log entries for {PH1}',
```

## 5. Neighbor, Module & Linter-Gap Consistency

- **Adjacent `UIStrings` & `-meta.ts` alignment:** Compare added or edited
  entries against neighboring entries in the same `UIStrings` block and
  companion `-meta.ts` file so panel names, feature casing, inline backticks,
  and separators (`or` vs. `/`) stay consistent across sibling strings.
- **Quoted label renames:** When a CL renames a setting or button label (e.g.,
  `Preserve log` -> `Keep log`), check sibling files in the same module for
  explanatory `UIStrings` that quote the old label (e.g., `` '`console.clear()`
  was prevented due to \'Keep log\'' ``) and update them together.
- **Unused keys in linter-exempt files:** `l10n-no-unused-message` skips
  `ModuleUIStrings.ts` and `models/trace/insights/*.ts`; flag orphaned keys
  left behind in those files when their last caller is removed.
