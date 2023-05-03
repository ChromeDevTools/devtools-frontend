# Recorder

Recorder is a panel in DevTools that allows recording and replaying user actions.

## Code overview

- `components` folder contains lit-html components that implement Recorder-specific UI.
- `images` folder contains Recorder-specific icons and images.
- `models` folder contains the "business logic" part of Recorder wrapping DevTools SDK modules and Puppeteer to provide record/replay/import/export functionality. The name `models` is historical and, probably, a better name could be found: record/replay used to be implemented as a single SDK Model and was placed in the `models` folder in DevTools before ending up here.
- `injected` folder holds the code that gets injected into the target page. This code is responsible for interpreting client side events and sending information about them to the `models`.
- `RecorderPanel.ts` is a light wrapper around `RecorderController` that integrates with `UI.Panel.Panel`, a generic interface for a top-level panel.
- `RecorderController.ts` is the main class that is responsible for rendering the panel and holds the entire panel state.

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
