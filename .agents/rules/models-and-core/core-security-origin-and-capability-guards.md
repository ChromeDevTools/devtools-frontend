---
name: devtools/models-and-core/core-security-origin-and-capability-guards
rubric: security
severity: blocking
---

**Rule.** Enforce security origin validation, enterprise policy guards, and branded UrlString types in the model and host layers
- **Look for**: Unbranded `string` URLs in model/agent interfaces instead of `Platform.DevToolsPath.UrlString`, security origin checks performed only in UI views, or resource lookup errors returned before permission checks in `ExtensionServer`.
- **Do not flag**: Internal display-only label strings that are never used for resource resolution or security checks.

**Why.** Security origin checks (SOP), workspace access boundaries, and enterprise/geo-restriction capability checks must be enforced in `core/` and `models/` using `SecurityOrigin`, `Common.ParsedURL`, and `Platform.DevToolsPath.UrlString` rather than relying on UI-layer checks or unvalidated source URLs.

## Examples

Bad:

```ts
export interface SourceFile {
  url: string;
}
// Derive security origin from untrusted sourceMappingURL comment:
const origin = Common.ParsedURL.ParsedURL.extractOrigin(script.sourceURL);
```

Good:

```ts
export interface SourceFile {
  url: Platform.DevToolsPath.UrlString;
}
// Derive security origin from trusted execution context or frame metadata:
const origin = script.executionContext()?.securityOrigin;
```
