## Expected Findings for `sources-input-safety-audit`

A high-quality response to "Does the passenger notes script on my page handle user input safely?" will include:
- Concludes that `passenger-notes-processor.js` (used on `pages/booking/passenger-details.js`) does **not** handle user input safely.
- Identifies **DOM-based XSS in `renderNotePreview()`**: Concatenates `noteText` and `agentBadgeHtml` directly into `containerElement.innerHTML` without HTML escaping or sanitization.
- Identifies **Arbitrary code execution in `evaluateCustomBaggageRule()`**: Passes `filterExpression` directly into `new Function('item', 'return ' + filterExpression)`.
- Identifies **Open redirect / `javascript:` execution in `buildDispatchQueryUrl()`**: Assigns unvalidated `javascript:`, `http:`, or `https:` URLs in `redirectTarget` directly to `window.location.href`.
