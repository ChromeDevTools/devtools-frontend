# Performance panel

This folder contains the majority of the source code for the Performance panel in DevTools (once called Timeline, hence the naming in this folder).

Some of the UI components are reused across other panels; those live in `front_end/ui/legacy/components/perf_ui`.

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
