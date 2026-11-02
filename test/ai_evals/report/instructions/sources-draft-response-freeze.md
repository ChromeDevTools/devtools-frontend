## Expected Findings for `sources-draft-response-freeze`

A high-quality response to "page freezes every time i click the draft response button, can you check what's hanging it?" will include:
- Identifies `handleDraftResponse()` in `pages/inbox/customer-threads.js` (`CustomerThreadsPage`, wired to `#draft-response-btn`) and `buildThreadContextEmbeddings(threadMessages, vocabularySize)` in `/assets/inbox/thread-embeddings.js` (`window.CobaltThreadEmbeddings.buildThreadContextEmbeddings`) and `pages/inbox/customer-threads.js`.
- Explains that `buildThreadContextEmbeddings` executes a synchronous nested loop (`outerIterations = 5000` by `innerIterations = 5000`, totaling 25,000,000 iterations of `Math.sin`, `Math.cos`, and `Math.sqrt` operations) on the main UI thread before calling `setDraftText`.
