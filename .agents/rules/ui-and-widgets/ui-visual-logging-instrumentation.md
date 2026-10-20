---
name: devtools/ui-and-widgets/ui-visual-logging-instrumentation
rubric: design
severity: should_fix
---

**Rule.** Instrument interactive UI elements and containers with kebab-case VisualLogging contexts registered in KnownContextValues
- **Look for**: Interactive elements (`<button>`, `<devtools-button>`, `<input>`, menus, drawers) missing `jslog` or `jslogContext`, non-kebab-case context names, or new context values missing from `KnownContextValues.ts`.
- **Do not flag**: Purely decorative icons or internal wrapper `<div>`s that represent neither a distinct visual section nor an interactive control.

**Why.** DevTools relies on Visual Elements (`jslog`) telemetry to measure feature usage. Omitting `jslog` on new buttons/toggles/menus, using localized or camelCase context strings, adding redundant panel prefixes inside already-logged containers, or dropping `jslog` during Lit refactors breaks analytics.

## Examples

Bad:

```ts
html`<button @click=${input.onToggle}>${input.label}</button>`
// Or using localized string as context:
jslog=${VisualLogging.action(i18nString(UIStrings.clearAll)).track({click: true})}
```

Good:

```ts
html`<devtools-button
  .jslogContext=${'clear-all'}
  @click=${input.onClear}>${i18nString(UIStrings.clearAll)}</devtools-button>`
```
