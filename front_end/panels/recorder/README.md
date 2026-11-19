# Recorder

Recorder is a panel in DevTools that allows recording and replaying user actions.

## Code overview

- `components` folder contains lit-html components that implement Recorder-specific UI.
- `images` folder contains Recorder-specific icons and images.
- `models` folder contains the "business logic" part of Recorder wrapping DevTools SDK modules and Puppeteer to provide record/replay/import/export functionality. The name `models` is historical and, probably, a better name could be found: record/replay used to be implemented as a single SDK Model and was placed in the `models` folder in DevTools before ending up here.
- `injected` folder holds the code that gets injected into the target page. This code is responsible for interpreting client side events and sending information about them to the `models`.
- `RecorderController.ts` is the main component for the Recorder panel. It manages the state and renders the UI.

## How it works

In general, there are 3 important use cases which the Recorder panel covers:

1. Browsing: covers the user navigation between recordings, viewing recording details, editing recordings, import/export.
2. Recording: covers the scenario when a user creates a new recorder and starts recording actions. In this use case, most of the browsing functionality is disabled until the user stops the recordings. Here is what approximately happens when the user hits Start Recording:
   1. A new `RecordingSession` is created.
   2. The `RecordingSession` attaches itself to all the targets and install a binding.
   3. Then it injects `injected` code into all the inspected targets.
   4. `injected` code detects user actions on the target and sends them back to the `RecordingSession` using the binding.
   5. `RecordingSession` interprets the events from the client and updates the current recording.
3. Playback: covers the scenaraio when a user has a recording and hits the Replay button:
   1. A new `RecordingPlayer` instance gets created.
   2. The instance suspends of the DevTools interactions with the targets (i.e., `SDK.TargetManager.TargetManager.instance().suspendAllTargets();`) and creates a `PuppeteerConnection`.
      1. If the playback includes measuring performance, additionally the tracing API is enabled to capture the performance trace.
   3. The `PuppeteerConnection` is sending and receiving messages on top of the original DevTools connection (which could be a web socket or a binding connection).
   4. Then `RecordingPlayer` interprets the steps and translates them into Puppeteer commands.

## Navigation guard

During a replay, `RecordingPlayer` sends input to pages with the permissions of DevTools. The navigation guard (`models/NavigationGuard.ts`) stops the replay if a page that receives input commits a document from an origin that is not in the recording.

### Allowed origins

The guard allows the origins of these URLs:

- The URL of each `navigate` step.
- The URL of each asserted navigation event (`assertedEvents`).
- Each step `target` that is not `main` (a popup or an out-of-process iframe).
- The URL of the inspected page at the start of the replay, but only in these cases:
  - An interactive step on the main page can run before the first `navigate` step on the main page. A step with a `target` other than `main` does not count.
  - The recording has no `navigate` step on the main page.
  - The target is a `devtools://` page, where the replay skips `navigate` steps.

Rules for the allowed origins:

- The allowed origins apply to the full replay and to all frames, not step by step. An origin from one step is allowed before and after that step.
- For a URL with an opaque origin (for example, `data:`), the guard allows only the same complete URL.

### Situations that the guard handles

The guard uses the `Fetch` CDP domain. It pauses document responses and fails each response that would commit a document from an origin that is not allowed.

| Situation | Behaviour |
| --- | --- |
| Main frame navigation to an origin that is not allowed (link, form, script, `navigate` step) | The guard fails the response. The replay stops with an error. |
| HTTP redirect (301, 302, 303, 307, 308 with a valid `Location` header) | The guard continues the redirect response and checks the response that commits. A redirect chain through an origin that is not allowed (for example, SSO) works. |
| Redirect status without a valid `Location` header, or a 304 response | Chrome commits the response body. The guard checks it as a document. |
| Download (a 2xx response with exactly one `Content-Disposition` header that has the `attachment` type) | The guard continues the response, because it does not commit a document. |
| Subframe navigation, recording without subframe steps | The guard continues the response. Third-party iframes (ads, embeds) do not stop the replay. Input can still reach such an iframe through coordinates or focus. |
| Subframe navigation, recording with a `frame` or a `target` other than `main` | The guard checks subframes as it checks the main frame. |
| Out-of-process iframe (OOPIF) | The guard enables interception in the new session before Chrome runs the frame. |
| Popup that a step targets | Before the step runs, the guard enables interception on each page that has the target URL or contains a frame with this URL. It also checks the URLs that the frames have at that time. The guard ignores a target page that is closed. |
| Page that gets the URL of a step target later | Replay finds the target of a step after the guard looked for it. The guard listens to `targetcreated` and `targetchanged` on the browser, and it enables itself on each page that gets the URL of a step target later. |
| The guard has an error while a step waits for its target | The wait stops (`AbortSignal`), and the replay reports the error. |
| Popup that no step targets | Not guarded. The replay does not send input to it. |
| Prerendered page that starts during the replay | The guard enables interception in the prerender session before the page runs. It checks all documents of the session until the activation. |
| Prerendered page from before the replay | The guard enables interception in the existing session. If a step can send input to the inspected page before the page navigates, the guard also checks the document of the prerendered page: it reads the URL of the main frame from the session, and it listens to `Page.frameNavigated` on the session for a document that commits later. If the document has an origin that is not allowed, the replay stops. If the replay navigates the page first, the guard does not make this check. The guard ignores a prerendered page that is closed. |
| `history.back()` to a page from before the replay (back/forward cache) | Chrome does not pause a response for a back/forward cache restore. If the session history has an entry with an origin that is not allowed, the guard removes the history at the start. If the current document has such an origin, the page first navigates to `about:blank`. If all entries are allowed, the guard keeps the history. If the subframe check is on, the guard always removes the history, because the history reports only the URLs of main frames. In that mode, the page also navigates to `about:blank` first if a frame of the current document is not allowed. The guard does not change the page if it has an error at that time. |
| Document that commits without a paused response | A `framenavigated` listener checks the URL after the commit and stops the replay. |
| Frames that the page has at the start of the replay | If a step can send input to the inspected page before the page navigates, the guard checks the URLs of the frames that exist at the start. It checks subframes only if the subframe check is on. |
| Interception cannot be enabled on the main frame | The replay stops with an error (fail closed). |
| Interception cannot be enabled in a prerender session | The replay stops with an error (fail closed). |
| Interception cannot be enabled in a subframe session (at the start, or later for a new OOPIF) | If the subframe check is on, the replay stops with an error. If the subframe check is off, the guard ignores the failure, because it does not check subframes in that mode. |
| Interception cannot be enabled in a closed session, or in a session of a target without frames (for example, a worker) | The guard ignores the failure. It reads the target type of the session. If the target is not known, it handles the session as a frame session. |
| A navigation is blocked while a step is in progress | The Puppeteer connection rejects the commands that send input, run script, read objects of the page, or navigate. The replay does not wait for the step and reports the error. |
| A navigation is blocked before a step starts, or while the player prepares the step | The step does not run. |

### Situations that the guard does not handle

- Replay through an extension. The extension receives the recording and uses its own permissions.
- `about:blank`, `about:srcdoc`, and same-document navigations. They do not make a network request and do not change the origin of the document.
- Requests reach the server of an origin that is not allowed before the guard fails the response.
- Commands that Puppeteer sent before the guard reported an error can still reach the document.
- A navigation that starts when the replay stops. The guard stops with the replay.
- A response that a service worker makes with `respondWith()` does not pause in the `Fetch` domain, so the guard cannot fail it before the commit. The `framenavigated` listener checks the URL after the commit and stops the replay. For a subframe, this check runs only if the subframe check is on. No test covers a service worker.

### Side effects

- The tab can lose its session history (see the table). If the recording has a subframe step or a step with a `target` other than `main`, the tab always loses it.
- A blocked main frame navigation shows the Chrome error page.
- Recorded values that are not valid URLs do not add an allowed origin.
- If the subframe check is on, a third-party iframe (for example, an ad or an embed) from an origin that is not in the recording stops the replay.
- If the replay starts with a `navigate` step on a page that is not allowed (for example, the New Tab page), the page navigates to `about:blank` before the guard removes the history. A performance trace of the replay contains this navigation.

### Tests

- Unit tests: `models/NavigationGuard.test.ts` and the `Navigation guard` suite in `models/RecordingPlayer.test.ts`.
- API tests against a real browser: `models/NavigationGuard.test.api.ts`.
- E2E tests: `test/e2e/recorder/replay.test.ts`.
