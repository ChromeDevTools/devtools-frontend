---
name: devtools/ui-and-widgets/ui-localization-and-uistrings-hygiene
rubric: design
severity: should_fix
---

**Rule.** Define user-facing strings in sentence-case UIStrings using complete sentences and i18nTemplate for embedded elements, and prune unused entries
- **Look for**: String concatenation around `i18nString(...)`, HTML/DOM elements interpolated without `i18nTemplate`, Title Case labels in `UIStrings`, unlocalized English literals in templates, or unused keys in `UIStrings`.
- **Do not flag**: Technical protocol identifiers, MIME types, or strings in `UIStringsNotTranslate` / `i18n.i18n.lockedString(...)`. Pre-existing `UIStrings` entries (such as legacy Title Case strings) or pre-existing unlocalized string literals that are moved verbatim from imperative DOM creation into a Lit template during a refactoring CL.

**Why.** Concatenating translated fragments breaks word order in non-English locales, title-Cased strings violate Chromium UX standards, translating English-only experimental strings wastes localization quota, and unused `UIStrings` entries bloat locale bundles.

## Examples

Bad:

```ts
const UIStrings = {
  learnMoreAbout: 'Learn More About ', // Title case + fragmented sentence
  unusedKey: 'Old label',
} as const;
html`${i18nString(UIStrings.learnMoreAbout)}<x-link href=${url}>CORS</x-link>`
```

Good:

```ts
const UIStrings = {
  /**
   * @description Link text explaining CORS errors.
   * @example {CORS} PH1
   */
  learnMoreAbout: 'Learn more about {PH1}',
} as const;
html`${i18nTemplate(UIStrings.learnMoreAbout, {PH1: html`<x-link href=${url}>CORS</x-link>`})}`
```
