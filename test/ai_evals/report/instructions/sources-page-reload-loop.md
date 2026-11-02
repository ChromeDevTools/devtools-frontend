## Expected Findings for `sources-page-reload-loop`

A high-quality response to "the page keeps reloading in a loop when I click the sync billing button, why?" will include:
- Identifies `handleSyncClick()` in `pages/billing/subscription-sync.js` (`SubscriptionSyncPage`, wired to `#sync-billing-region-btn`) and `reconcileBillingRegion(activeRegionCode, queryString)` in `/assets/billing/ledger-sync.js` (`window.CobaltBillingSync.reconcileBillingRegion`) and `pages/billing/subscription-sync.js`.
- Explains that `reconcileBillingRegion` navigates to `?autoreconcile=1&region=<activeRegionCode>` via `window.location.assign(...)` and calls `window.location.reload()`.
- Explains that on reload, the `useEffect` hook in `SubscriptionSyncPage` checks `window.location.search.includes('autoreconcile=1')` and immediately calls `reconcileBillingRegion` again, repeating the reload loop until `cobalt_billing_sync_attempt` in `sessionStorage` reaches the cap (`attempts >= 2`).
