---
name: network
description: Analyzing network traffic, network requests, HTTP/HTTPS headers, status codes, payload details, timing/performance, and request sizes.
allowed-tools:
  - listNetworkRequests
  - getNetworkRequestDetails
---

# Tools & Workflow

1. **Discover Requests (`listNetworkRequests`)**:
   - Call `listNetworkRequests` to list recorded requests initiated by the active origin as `id;url;status;duration;size` rows, where same-origin URLs omit the `origin` prefix and long query or `data:` URLs end with `...<truncated>`.
   - Inspect the returned list for URLs, status codes, durations, transfer sizes, and unique request `id` values.

2. **Inspect Request Details (`getNetworkRequestDetails`)**:
   - Call `getNetworkRequestDetails` with the specific request `id` to obtain the full untruncated URL, full headers, timing phases (DNS, initial connection, SSL, TTFB, content download), status text, and response body.

# Considerations

* **Privacy**: If the request or response payload contains sensitive personal data, authorization tokens, or API secrets, redact or generalize it in your response.
* **Origin Lock**: Only requests initiated by the conversation's established origin can be inspected.
* **Recording**: DevTools only records requests made while DevTools is open and network recording is enabled (and the log has not been cleared). If `listNetworkRequests` reports that no requests have been recorded, ask the user to ensure network recording is enabled, reload the page or repeat the action that triggers the request, and try again.
