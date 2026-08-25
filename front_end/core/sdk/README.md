# Core SDK

The **Core SDK** (`front_end/core/sdk/`) is DevTools' foundational data access layer wrapping the [Chrome DevTools Protocol (CDP)](https://chromedevtools.github.io/devtools-protocol/). It creates typed data access objects and models for CDP structures, abstracting away low-level JSON-RPC commands and events into developer-friendly APIs.

---

## Architectural Principles

### 1. Single CDP Domain Responsibility
Each SDK model and data object encapsulates data and operations from a **single CDP domain** (e.g., `DOM`, `CSS`, `Network`, `Debugger`, `Audits`).

### 2. Cross-Domain Separation (What to Avoid)
Data from multiple CDP domains must be joined **outside** of `core/sdk`, typically in `front_end/models/` (such as `models/bindings/`, `models/issues_manager/`, or `models/trace/`).

#### ❌ Anti-pattern: Cross-domain getters on SDK objects
Do **not** add methods or getters to an SDK data object that fetch or resolve data from another CDP domain.

```ts
// ❌ BAD: DOMNode (DOM domain) must not reference Network or Audits domains directly.
class DOMNode {
  // Violates single-domain boundary:
  getNetworkRequest(): SDK.NetworkRequest.NetworkRequest|null {
    // ...
  }

  // Violates single-domain boundary:
  getIssues(): IssuesModel.Issue[] {
    // ...
  }
}
```

#### ✅ Best Practice: Aggregate in `models/`
Keep `DOMNode` strictly focused on the DOM domain, and correlate cross-domain data in a higher-level model or service:

```ts
// ✅ GOOD: A higher-level model in models/ joins DOM and Audits/Network data.
// In front_end/models/issues_manager/ or similar:
const issues = issuesManager.issuesForNode(domNode);
```
