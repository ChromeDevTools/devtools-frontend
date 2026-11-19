---
name: devtools/ui-and-widgets/ui-visual-logging-instrumentation
rubric: design
severity: should_fix
---

**Rule.** Instrument interactive UI elements and containers with kebab-case VisualLogging contexts registered in KnownContextValues
- **Look for**: Interactive elements (`<button>`, `<devtools-button>`, `<input>`, menus, drawers) missing `jslog` or `jslogContext`, passing `{jslog}` in `super(element, {jslog})` instead of `render(..., target, {container: {attributes: {jslog: ...}}})` in migrated `DEFAULT_VIEW` widgets, omitting `container.attributes.jslog` from one branch of a multi-branch `render()` view (`ui/lit/render.ts` strips container attributes omitted on subsequent renders), non-kebab-case context names (outside `Platform.StringUtilities.isExtendedKebabCase()`, which allows lowercase alphanumeric words separated by `-` or `.`), or new context values missing from (or existing strings removed from) `KnownContextValues.ts` (`CheckVisualLoggingNoContextValueRemoval` blocks removals to preserve historical telemetry hashes).
- **Do not flag**: Purely decorative icons or internal wrapper `<div>`s that represent neither a distinct visual section nor an interactive control, extended kebab-case context names using `.` separators (such as `'timeline.history-item'`), vendor-prefixed CSS entries with a leading `-` in `KnownContextValues.ts` (such as `'-webkit-appearance'`), unused historical strings kept in `KnownContextValues.ts`, or controls whose custom element or directive sets `jslog` automatically (such as `<devtools-checkbox ${bindToSetting(setting)}>` or `<devtools-button .jslogContext=${'...'}>`).

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
  .variant=${Buttons.Button.Variant.OUTLINED}
  .jslogContext=${'clear-all'}
  @click=${input.onClear}>${i18nString(UIStrings.clearAll)}</devtools-button>`
```
