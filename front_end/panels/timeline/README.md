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
