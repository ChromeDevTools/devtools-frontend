# Performance panel

This folder contains the majority of the source code for the Performance panel in DevTools (once called Timeline, hence the naming in this folder).

Some of the UI components are reused across other panels; those live in `front_end/ui/legacy/components/perf_ui`.

## Working on the performance panel locally

There are a few different ways to run the Performance Panel locally:

#### Option 1: run real DevTools

The first method is to run DevTools! Load up the Chrome for Testing version that comes within DevTools ([see the DevTools documentation here[(https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md#running-from-file-system)]).

DevTools, navigate to the Performance Panel and record or import a trace. There are a number of trace files saved in `devtools-frontend/test/unittests/fixtures/traces` that you can use.

#### Option 2: the components server

You can also use the DevTools component server. This server runs standalone parts of DevTools in the browser. To do this, run `npm run components-server` in the terminal, which will run a server on `localhost:8090`.

You can then navigate to the Performance Panel examples using the link on the index page. This runs the real Performance Panel code in isolation, and you can additionally preload a trace by appending `?trace=name-of-trace-file-from-fixtures`. This is a nicer development cycle because you do not have to manually import a trace after each change. Note though that some parts of the experience are stubbed, so you always should test your work in proper DevTools too.

These examples can also be used to create screenshot tests, which are an important tool for the Performance Panel because it is the only way to test `<canvas>` output. We define these as interaction tests (`devtools-frontend/tests/interactions/panels/performance`).

#### Option 3: bundled DevTools in the browser

This option loads the DevTools frontend in a browser tab in Chrome, but requires a little more setup to easily load traces.

1.  Head to `devtools-frontend/test/unittests/fixtures/traces` and run `npx statikk --cors`. [This is a tool built by @paulirish to serve local files on a server](https://github.com/paulirish/statikk).
2.  Build and run the Chrome for Testing binary from devtools-frontend.
3.  Visit `devtools://devtools/bundled/devtools_app.html` and let it load (you only need to do this the first time you load up the Chrome for Testing binary).
4.  Update the URL by appending `?loadTimelineFromURL=http://localhost:1234/name-of-trace-file.json`. **Swap the port to the one `statikk` is using on your machine**.
5.  When you make changes and rebuild DevTools, simply refresh the URL! **Make sure you disable network caching in your DevTools on DevTools instance.**

Each one has its pros and cons, but typically **this option is preferred** for quick iteration because you don't have to manually record or import a trace every time you reload.

## Trace bounds and visible windows

One slightly confusing aspect of the panel is how the zooming, panning and minimap interactions impact what time-range is shown in the timeline, and how these are tracked in code.

To ensure that these values are defined in one place, we use the TraceBounds service (`front_end/services/trace_bounds`) to track the three windows we care about:

1. `entireTraceBounds`: the bounds of the entire trace file.
2. `minimapTraceBounds`: the bounds of what is shown on the minimap. Think of this as the bounds that the handles are limited by.
3. `timelineTraceWindow`: this is the visible window that is shown in the main timeline.

To update and track these values, there are a few layers that are walked through, which is necessary because some of this code is reused in the network panel, and therefore cannot be tied directly to the TraceBounds service.

### TimelineOverviewPane (used in Performance & Network panel)

The OverviewPane, which is responsible for the small timeline overview (and is used for the same reason in the Network Panel) can dispatch two events:

- `OverviewPaneWindowChanged`: emitted when the window changes via the user dragging or resizing the handles.
- `OverviewPaneBreadcrumbAdded`: emitted when the user clicks to create a breadcrumb (this is only used in the Performance Panel, not in the network panel).

Both these events contain a millisecond `startTime` and `endTime`. This panel is told about current times via two methods:

- `setBounds` which sets the bounds for the handles
- `setWindowTimes` which sets the current value of the drag handles.

Because this component is used across multiple panels, it does not know about the TraceBounds service or have any interaction with it.

> Sidenote: if you are wondering where the code for the actual dragging of the handles is implemented, it is done in `front_end/ui/legacy/components/perf_ui/OverviewGrid.ts`

### TimelineMiniMap

The timeline minimap (which is only used in the Performance Panel) listens to the two OverviewPane events emitted.

When an `OverviewPaneBreadcrumbAdded` event is emitted it will:

1. Create a new breadcrumb and update the Breadcrumbs component.
2. Update the `TraceBounds` service, updating it with:
   1. `minimapBounds` which are set to the bounds of the breadcrumb
   2. `timelineVisibleWindow` which are set to the bounds of the breadcrumb

If a breadcrumb is removed (which is handled via a `RemoveBreadcrumb` event dispatched by the Breadcrumbs UI component), the minimap does the exact same as above.

When an `OverviewPaneWindowChanged` event is emitted, the minimap simply re-emits the event up the chain such that the `TimelinePanel` can listen to it. This is a stylistic choice as it makes more sense for the `TimelinePanel` to be the entity that handles global window changed events.

The TimelineMiniMap also **listens to updates from the TraceBounds service**. When it gets either a new `timelineVisibleWindow` or `minimapBounds` value, it will call `TimelineOverviewPane#setWindowTimes` and/or `TimelineOverviewPane#setBounds` to ensure that it is re-rendered with the new values.

### TimelinePanel

Finally, the `TimelinePanel` listens to `OverviewPaneWindowChanged` events. When it gets this event it will update the `TraceBounds` service, setting the new `timelineVisibleWindow` based on the `startTime` and `endTime` contained in the event.

The TimelinePanel is also where the initial values are set for the `TraceBounds` service. When a trace is imported (or recorded - the code path is the same in this case) the TimelinePanel will call `resetWithNewBounds(traceBounds)` on the `TraceBounds` service to ensure they match the new trace.

### Other components that need to know the active windows

Any components that need to know any of the active windows can add a listener to be notified of changes, and re-render if required.

This is used in:

1. `TimelineDetailsView` to ensure the details at the bottom of the panel reflect only the active time range.
2. `TimelineFlameChartView` to ensure the main canvas with the tracks is redrawn as the user changes views.
3. `TimelineMiniMap` as mentioned above, to update the minimap as required.

## Serializing and Deserializing Events

Serializing/Deserializing events allows for the creation of data (such as annotations) associated with events and enabling to save them to/load them from the trace file. Several classes handle the serialization and application of these serialized annotations:

1. `SyntheticEventsManager` - stores all synthetic events based on a raw event. They are stored in an array indexed by the position the corresponding raw events have in the `Model::rawEvents` array. The `SyntheticEventsManager` needs to be called by handlers as synthetic events are created. To enforce this we make use of a branded type called `SyntheticEntry`, which the `SyntheticEventsManager` adds to trace-event-like objects.
   Having a single place where all synthetic events are stored allows us to easily map from a synthetic event key back to the event object.

2. `EventsSerializer` - is responsible for event serialization. It generates the string key saved into the trace file and maps the key back to the corresponding Event (after reading keys from the trace file). To perform this mapping, it retrieves the raw event array registered by `SyntheticEventsManager` at the id extracted from the key. For profile calls, a binary search is conducted on the complete profile call list to efficiently find a match based on the sample index and node id retrieved from the string key.

3. `ModificationsManager` - Takes the serialized modifications (ex. annotations, breadcrumbs, track customisations) in a trace file (under `metadata.modifications`) and applies it to the current timeline after `EventsSerializer` mapped the keys to events (by initializing `EntriesFilter` with the loaded modifications), as well as creates the object that gets saved under `metadata.modifications` when a trace file with modifications is saved.

## Overlays

Overlays are what we use to draw on top of the performance panel to draw the user's attention or to mark areas of interest.

As of July 2024, they are used to power:

1. Overlays for Insights; when a user expands an Insight in the sidebar, that insight can draw overlays over the timeline to highlight areas of interest.
2. Annotations; the user has the ability to create labels and attach them to entries. These are drawn with overlays.
3. Selected entry; the box drawn around the entry a user selects is drawn as an overlay.
4. Vertical ruler: when holding shift and moving their mouse, the vertical cursor drawn is drawn as an overlay.

Overlays are drawn in **DOM**, not Canvas, and are drawn on a layer that sits above the entire timeline. This is important because it means they are drawn over both the canvases we have in the panel (network + main/rest).

Overlays are rendered and positioned absolutely; by default an overlay will sit at (0, 0) which will put it in the very top left of the timeline.

Overlays are managed by the `Overlays` class instance. An instance of this exists in `TimelineFlameChartView`.

To render an overlay, call the `add()` method and pass in the overlay you would like to create. Once you have done this, you must then call the `update()` method to trigger a redraw, otherwise the overlay will not be added.

> When the user pans/scrolls/zooms the timeline, the `update()` method is called automatically.

To remove one or some overlays, check out the `remove()` or `removeOverlaysOfType()`.

### Creating a new overlay

To create a new overlay, add it in the `OverlaysImpl.ts` file, first define its type. This is done as an interface, and must contain a `type` field.

All other fields are completely custom and depend on the specifics of the overlay.

```
/**
 * Represents when a user has selected an entry in the timeline
 */
export interface EntrySelected {
  type: 'ENTRY_SELECTED';
  entry: OverlayEntry;
}
```

Once you have done this, add the interface to the union type `TimelineOverlay`. This will likely trigger some TypeScript errors because there are some places in the code where we check we have exhaustively dealt with every possible overlay type.
Also if you want to make this overlay a singleton, add the interface to the union type `SingletonOverlay`.

When you create an overlay by default it will be created as a `div` with a class, and no contents. Sometimes this is all you need (for example, the `ENTRY_SELECTED` outline has no other HTML), but if you need more you can tell the Overlays class what DOM to create for your overlay. To do this, modify the `#createElementForNewOverlay` method. You will see examples there of how we use custom elements to build out overlays.

Once you have created the overlay, you now need to teach the Overlays class how to position the element on the page relative to the timeline. To do this, add a new case to the `#positionOverlay` method for your new overlay type. There are some helpers available to you to aid with the positioning:

1. `#xPixelForMicroSeconds` will take a microseconds value and convert it into the X coordinate on screen.
1. `#xPixelForEventOnChart` will calculate the X position from a given `OverlayEntry` (e.g. an entry from the main thread).
1. `pixelHeightForEventOnChart` will calculate the pixel height of an entry.
1. `#yPixelForEventOnChart` will calculate the Y pixel for an entry on the timeline.

Now you are ready to use this new type of overlays, to add/remove it you can check the [Overlays](#overlays) section.

### Charts

You will notice in the Overlays code we also check which chart an entry is in - either `main` or `network`. This is required because of how the overlays are drawn over both canvases. If we want an overlay to be positioned relative to an entry on the main canvas, we need to bump its Y position down by the height of the network canvas.

If you ever need to know how high the network canvas is, use `networkChartOffsetHeight()` which will calculate this for you.

```
+-------------------------------------------+
|                                           | |
|     Network canvas                        | | have to adjust an overlay by this height
|                                           | v if we are drawing it on the main canvas
+-------------------------------------------+
|                                           |
|                                           |
|     Main canvas                           |
|                                           |
+-------------------------------------------+
```

## Timeline tree views

The `TimelineTreeView` base class provides the foundation for creating various tree-based views within the Performance panel (e.g., Summary, Bottom-Up, Call Tree, Event Log). It handles core functionality like:

- Data grid creation
- Filtering
- Hover actions
- Toolbar management
- Event handling

The data grid is the core UI element, with each `GridNode` representing a row containing a name and associated values.

### Tree Data Sources

The Summary (ThirdParty), Bottom-Up, Call Tree, and Event Log views primarily use `this.selectedEvents()` as their data source. This method returns the events currently selected and in view by the user in the main timeline view. For example, if a user clicks on a track other than the Main track, `this.selectedEvents()` will represent that.

**Important Considerations:**

- **Lazily built:** trees are lazily built - child nodes are not created until
  they are needed. In most cases, trees are fully built when `.children()` is called from `refreshTree()`
- **Single Track Focus:** `this.selectedEvents()` only captures events from a _single_ track at a time. Selecting the main track will not include what one would consider
  "relevant events" from other tracks (e.g. a Frame's track).
- **No Synthetic Network Events:** Tree views do not consume `SyntheticNetworkEvents` due to their unique "overlapping" behavior, which differs from standard trace events.
- **Filters:** Filters can be applied to determine which events are included when building the tree.

### Event aggregation

`AggregatedTimelineTreeView` allows grouping similar events into single nodes. The `TraceTree.ts` module handles this aggregation.

**Aggregation Logic for BottomUp tree views:**

1.  **Default Aggregation:** By default, aggregation is determined by the `generateEventID()` function, and optionally by `eventGroupIdCallback`.
2.  **Pre-Grouping (`ungroupedTopNodes`)**: Before explicit grouping, `ungroupedTopNodes()` organizes events into a `ChildrenCache` map (`<string, Node>`). Even without explicit `GroupBy` grouping, `ungroupedTopNodes()` aggregates nodes by event name using `generateEventID()`.
3.  **Third Party Grouping (`forceGroupIdCallback`)**: In `ThirdPartyTreeView`, `forceGroupIdCallback` is used to ensure that `eventGroupIdCallback` is used to generate the node ID. This is crucial because events with the same name can belong to different third parties. Without this, the initial aggregation by event name would lead to incorrect third-party grouping.

## Call stacks

### Source
Call stacks in the Performance panel are taken from two sources:

1. Samples in CPU profiles. These are taken in two ways:

    1. With automatic periodic samples: when the V8 sampler is enabled during a trace, a separate thread (profiler thread) is started which interrupts the main thread and samples the JS stack every fixed amount of microseconds (see [where the sampling interval is set when tracing]). The sampled stack, which is not symbolized (memory addresses are not yet resolved into source locations) at this point, is added to a buffer. The symbolization of the stack happens asynchronously between samples, where the profiler thread symbolizes samples in the buffer until it needs to take the next sample. When the samples are symbolized they are added to a cache containing the CPU profile to be exported when the profiling is over. [See the V8 CPU profiler implementation] for more details.

    2. With "manual" collections of samples: V8 offers [an API to collect a stack sample "on demand"], called V8::CollectSample. It calls the profiler method that samples the JS stack (without symbolization) and adds it to the buffer to be asynchronously symbolized and cached in the CPU profile to be exported. This API also offers the possibility to pass a `trace_id` which is included in the exported CPU profile as an identifier for the manually collected sample. This is particularly useful in cases where a stack trace wants to be obtained for a trace event, as an id can be created and passed to the sample API and to the trace event payload ([see an example of how to do this]), allowing the frontend to easily match the stack trace with the corresponding trace event. This is considered fast because the stack is symbolized asynchronously in a different thread, not when the sample is taken. Note that at the time of writing, this change is relatively new and thus not widely adopted.

    Stacks in CPU profiles contain frames that point to function declarations, not to function call sites. When sampling is enabled, the frontend receives a CPU profile per thread in the target.

2. Stack traces in trace events: Blink's V8 bindings offer an API to synchronously take and symbolize a stack trace: [CaptureSourceLocation]. For many trace events, this API is called and the resulting stack trace is included in the event's payload. This is slow because the stack trace is symbolized and thus a manual collection of samples (see 1.2) is preferred unless sampling is not an option.

    Stack traces taken with [CaptureSourceLocation] have frames pointing to the call site, not function declarations.


### JS flamechart

The JS calls displayed in the flamechart are built from CPU samples in the [SamplesIntegrator.ts](../../models/trace/helpers/SamplesIntegrator.ts). Its output is an array of `SyntheticProfileCall`, each represents the time in which a function was called according to the thread's CPU profile (hence the name) and its duration. This output is then merged with the trace events in the same thread and a single call hierarchy is created in the [RendererHandler.ts]. This hierarchy ends up being drawn as a flamechart in the timeline.

Because the stack trace data in the CPU profile are samples, the output of the SamplesIntegrator is not guaranteed to be correct, as there is no way to know the status of the stack in the time window between samples. For this reason, we leverage different mechanisms to improve the accuracy of the resulting calls. In particular:

1. Incorporating the fact that the stack cannot change within the duration of an event dispatched by the running script. For example, if the script contains a `elem.offsetLeft = val;`, we know the stack from that point cannot change before the end of the `Layout` trace event dispatched by it, so we "lock" the stack at the beginning of the trace event.

2. We collect a stack sample with a trace id using the "manual" collection mechanism described above for some trace events (and include the id in the trace event). In the SamplesIntegrator, when we encounter an event with a matching sample (via an equal trace id) we use the stack in the sample as the event's parent.

### Asynchronous stack traces

Async stacks are tracked using the pair of trace events composed of [v8::Debugger::AsyncTaskScheduled] and [v8::Debugger::AsyncTaskRun]. These events are dispatched for async tasks in Blink and JS, including tasks run with `console.createTask`. They are also dispatched using perfetto's flow API, using the task memory address as flow id. This means that in the frontend we get events tracking the handling of a single async task grouped together (see [FlowsHandler.ts](../../models/trace/handlers/FlowsHandler.ts)).

The main implementation of async call stack parsing is in the [AsyncJSCallsHandler], where the async task flows are used to connect `SyntheticProfileCall`s representing the scheduler and the task being run. These connections are stored as mappings: [async js task scheduler -> async js task run] and its inverse.

There is a caveat to this: Because of the incompleteness of CPU profile data (since it's composed of samples), we don't always find the corresponding `SyntheticProfileCall` at either end of the async task. In these cases we default to using the corresponding trace event representing the JS execution, AKA the JS entrypoint (like `FunctionCall`, `RunMicrotasks`, `EvaluateScript`, etc.) at that end of the task, which is always present.

### Stack traces in entry details (bottom drawer)

Stack traces for individual events are computed by the [StackTraceForEvents.ts](../../models/trace/extras/StackTraceForEvent.ts). Given a trace event it moves up from its corresponding node in the call hierarchy built by the [RendererHandler.ts] (composed of trace events and `SyntheticProfileCall`s) and appends call frames as they are found. In order to track async call stacks, before moving to a node's parent, an asynchronous parent is looked up for the node in the output of the [AsyncJSCallsHandler]. If an async parent is present, it moves there instead, and continues the call frame appending from there.

Note: because this approach uses `SyntheticProfileCalls`, which are built from CPU profile samples, the frames in the resulting stack trace point to the source location of the function declaration, not the call site (see the explanation in the [source](#source) section).

[where the sampling interval is set when tracing]: https://source.chromium.org/chromium/chromium/src/+/1fab167b80daecb09e388ac021861eecd60340f8:v8/src/profiler/tracing-cpu-profiler.cc;l=90;bpv=1;bpt=0
[See the V8 CPU profiler implementation]: https://source.chromium.org/chromium/chromium/src/+/main:v8/src/profiler/cpu-profiler.cc;l=276;drc=c0883e36f0f65273f002c2ca8b7e9474256e00e4;bpv=0;bpt=1
[an API to collect a stack sample "on demand"]: https://source.chromium.org/chromium/chromium/src/+/main:v8/src/profiler/cpu-profiler.h;l=356;drc=86fc160bf60f45bddce6a7e37c1f900a8b6fe5a6
[see an example of how to do this]: https://chromium-review.googlesource.com/c/v8/v8/+/6383360/7/src/inspector/v8-debugger.cc
[CaptureSourceLocation]: https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/bindings/core/v8/capture_source_location.h;l=35;drc=8bf7a2a5fe85a01019ab5777e5b55a6c50ce72b3
[v8::Debugger::AsyncTaskScheduled]: https://source.chromium.org/chromium/chromium/src/+/main:v8/src/inspector/v8-debugger.cc;l=1214;drc=ed6ca45bf1ee83042ee0d325fed822302e331e09)
[v8::Debugger::AsyncTaskRun]: https://source.chromium.org/chromium/chromium/src/+/main:v8/src/inspector/v8-debugger.cc;l=1252;drc=ed6ca45bf1ee83042ee0d325fed822302e331e09)[AsyncJSCallsHandler](../../models/trace/handlers/AsyncJSCallsHandler.ts
[AsyncJSCallsHandler]: ../../models/trace/handlers/AsyncJSCallsHandler.ts

## Track configuration

We allow the user to edit the visual status and order of tracks in the main flame chart. Initially when we shipped this feature it was not persisted, meaning that if you refreshed or imported another trace, your configuration was lost. This was changed in crrev.com/c/6632596 which added persisting of the track configuration into memory, and added these docs too :)

As of crrev.com/c/6862799, this feature was changed to be persisted across all traces, whereas previously configuration was only applied per trace, which made it much less useful.

### How tracks get rendered

Tracks on the timeline are called `Groups` in the code (`PerfUI.FlameChart.Group`). These get constructed in the data providers and pushed onto the `groups` array.

The key thing to note is that **once the groups are created, their order in code does not change**. Even if the user moves Group 1 to the end visually, in the `timelineData.groups` array, it will still be in its original position. The original order is dictated by us in code based on the track appenders and the weights we give them.

The order in which the groups are _drawn_ is determined in the `FlameChart` component. To track the visual order, we use a tree structure. This structure allows us to track the order of groups, including nested groups (side-note: users are not able to re-order nested groups, only top-level ones). This tree **does represent the visual order and is updated as the user modifies the UI**.

If we have the following:

- Group 1
- Group 2
  - Group 2.1
  - Group 2.2
- Group 3

Then the tree will look like this (we create a fake root node):

```
       ===Root===
      /    |    \
     /     |     \
    /      |      \
Group 1  Group 2  Group 3
           / \
          /   \
     Group 2.1 Group 2.2
```

If the user re-orders the UI to put `Group 3` first then it will look like this:

```
       ===Root===
      /    |    \
     /     |     \
    /      |      \
Group 3  Group 2  Group 1
           / \
          /   \
     Group 2.1 Group 2.2
```

If a user hides a group, it remains in the tree, but is marked as `hidden`.

When rendering, we walk through this tree in DFS to determine the visual order of the groups. If we have 3 groups numbered 1-3, and the user re-orders them to be 3, 1, 2, then our visual order would be represented as `[2, 0, 1]`. This is because we take the original `groups` array (which **does not change at all**), and map the indexes to the array showing their visual position. Read `[2, 0, 1]` as saying "The group originally at index 2 is now at index 0", and so on.

## Persisting this state

We persist the order of the groups and for each group its `hidden` and `expanded` state:

```
{
  originalIndex: 0,
  visualIndex: 2,
  hidden: false,
  expanded: true,
  trackName: 'Frames',
}
```

When the user makes any visual change to the UI, which happens in `FlameChart.ts`, we notify the data provider of that change. It can then choose to persist this data anywhere it likes. In our case, we persist into a DevTools setting which is persisted globally (e.g. it survives restarts).

We store this as two global settings (one for the main flame chart, one for the network flame chart). This means that the user can make changes to one trace and it is applied to all future traces. This is by design - we have lots of feedback that there is a lot of noise that people want to hide.
