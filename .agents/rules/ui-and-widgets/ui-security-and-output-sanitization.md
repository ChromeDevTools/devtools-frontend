---
name: devtools/ui-and-widgets/ui-security-and-output-sanitization
rubric: security
severity: blocking
---

**Rule.** Sanitize untrusted strings, URLs, CSS selectors, and Markdown exports before rendering or exporting
- **Look for**: Raw string interpolation in `querySelector('[attr="' + val + '"]')` without `CSS.escape`, imperative DOM text assignments (`el.textContent = untrusted`, `el.title = untrusted`) on untrusted or inspected strings without `Platform.StringUtilities.escapeUnicodeAsText(...)` or `Platform.StringUtilities.safeEscapeUnicode(...)`, `Lit.Directives.unsafeHTML(...)` on unsanitized strings, `href` attribute bindings with unvalidated `javascript:` URLs, Markdown table cell serialization without escaping `|*_<>\`, or raw HTML snippet generation without HTML escaping.
- **Do not flag**: Standard Lit `html` text bindings (`${text}`), which escape HTML entities automatically (DevTools' `html` tag in `ui/lit/lit.js` also sanitizes Unicode formatting/BiDi characters across strings, nested arrays, and standard directives such as `ifDefined`, `live`, `repeat`, and `classMap` via `Platform.StringUtilities.safeEscapeUnicode(...)`), or compile-time constant strings in `querySelector`.

**Why.** Interpolating untrusted network URLs, DOM attributes, or user strings into raw HTML snippets, `CSS.escape`-free attribute selectors, Markdown table exports, or `href` attributes without protocol validation risks injection, XSS, broken layout formatting, or text spoofing.

## Examples

Bad:

```ts
const el = root.querySelector(`[data-key="${dynamicKey}"]`);
const markdownRow = `| ${cell.name} | ${cell.value} |`;
```

Good:

```ts
const el = root.querySelector(`[data-key="${CSS.escape(dynamicKey)}"]`);
const escapeMd = (s: string): string => s.replace(/[\\*_|<>]/g, '\\$&');
const markdownRow = `| ${escapeMd(cell.name)} | ${escapeMd(cell.value)} |`;
```
