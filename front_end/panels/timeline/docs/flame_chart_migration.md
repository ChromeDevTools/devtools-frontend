# Flame chart migration to the new engine

## Flame charts

The panel has two flame charts: the network and the "main" flame chart. The main flame chart contains all the tracks rendered in the bottom pane of the split widget that composes the timeline.

## Flame Chart Data Provider

There are two data providers: one for the [network flame chart](TimelineFlameChartNetworkDataProvider.ts) and one for the [main flame chart](TimelineFlameChartDataProvider.ts).

Flame chart data providers have two jobs:

1. **Build flame chart data:** Abstract the timeline data from tracks and trace events into drawable bits: objects with a position and dimensions. This drawable data is also known as "flame chart data" and is what the [flame chart renderer implementation](../../ui/legacy/components/perf_ui/FlameChart.ts) uses to draw the timeline in a canvas. More details on the shape of this data can be seen on [this doc](http://go/rpp-flamechart-arch#heading=h.yc9qjrqyg3rf).

2. **Provide extra features about trace events:** Besides reshaping tracks' data into flame chart data format, the data providers implement methods that allow the flame chart renderer to obtain extra features about trace events when drawing the timeline (for example, the color and title of a trace event).

The main flame chart is currently being migrated to use the data of the new engine. This migration is supposed to be done on a track by track basis (https://crbug.com/1416533).


## Migrating a track from the main flame chart to use the new engine

Migrating a track consists of taking the code in the data provider corresponding to a track (both the appending into the flame chart data and the handling of extra features) and moving it to a dedicated "track appender". Generally this boils down to these steps (note that steps 3 - 6 must be implemented together in the same change):

0. Add screenshot tests for the track. In order to ensure no regressions are introduced after a migration we use screenshot tests for expanded and collapsed track. See for example the [gpu_track_test](../../../test/interactions/panels/performance/timeline/gpu_track_test.ts).

    After adding the test file, you can run `npm run auto-screenshotstest` to generate the screenshot locally to check before submitting.

    Or you can upload to the Gerrit and after the screenshot tests fails, run `./scripts/tools/update_goldens_v2.py` to update the screenshots.
    See [update_goldens_v2.py](../../../scripts/tools/update_goldens_v2.py) for more information.

1. Add missing related functionality to the new engine (not always needed).

    Whatever's needed to support using the new engine as source of data for the track being migrated. This could mean adding a new handler or buffering/exporting a new kind of event in a particular handler, for example.

2. Define a new appender for the track being migrated. Make sure the class implements the `CompatibilityTracksAppender.TrackAppender` interface. See for example the [TimingsTrackAppender](TimingsTrackAppender.ts).

3. Initialize the new track in the compatibility tracks appender. Pass to the new instance the timeline data which will be modified in-place (see the instantiation of the `TimingsTrackAppender` for an example). Make sure the appender instance is added to the `#allTrackAppenders` array property.

4. Move the appending of the data track in the data provider into the new track appender:

    The data appending happens at the [appendLegacyTrackData method](https://source.chromium.org/chromium/_/chromium/devtools/devtools-frontend/+/3925b7d73681966c9a8c844c49c7e815ecdcff82:front_end/panels/timeline/TimelineFlameChartDataProvider.ts;l=528). The implementation for each track should be under the switch case with the track being migrated.

    The appending is usually the result of calling `appendSyncEvents` and/or `appendAsyncEventsGroup`. These two methods are commonly shared across tracks in the legacy system, and as such contain the handling of particular details of all tracks, which makes them very complex. To migrate a track to the new system, you will have to inspect the code paths invoked to append a track in the legacy system and extract them. The extracted code should be re-implemented in a functionally-equivalent way under the `appendTrackAtLevel` method implementation of the new track appender.

    Note that there might be similarities in the way multiple track appenders "append" their data, in that case it would make sense to introduce new helpers that are shared between appenders to prevent code duplication.

    **Important:** Make sure you register the track appender as the owner of a level, each time you append an event to a level that hasn't been registered before. This is done by invoking the `registerTrackForLevel` of the `CompatibilityTracksAppender`.

5. Move the handling of the extra features.

    This is usually achieved by implementing the methods `colorForEvent`, `titleForEvent` and `highlightedEntryInfo`. Note how The implementation of these methods should be equivalent to the codepaths of the methods with the same names in the data provider related to the tracks/events being migrated. Here again we should look out for opportunities to introduce helpers to share between track appenders.

    Note: Queries done by the FlameChart renderer for events' extra features are passed from the data provider to the CompatibilityTracksAppender ([see example](https://source.chromium.org/chromium/_/chromium/devtools/devtools-frontend/+/3925b7d73681966c9a8c844c49c7e815ecdcff82:front_end/panels/timeline/TimelineFlameChartDataProvider.ts;l=1083)), which then [forwards](https://source.chromium.org/chromium/_/chromium/devtools/devtools-frontend/+/3925b7d73681966c9a8c844c49c7e815ecdcff82:front_end/panels/timeline/CompatibilityTracksAppender.ts;l=107) the query to the appropriate track appender using the data added when `registerTrackForLevel` was called.

6. Look for any remaining references to the track, or events in the track being migrated, throughout [TimelineFlameChartDataProvider.ts](TimelineFlameChartDataProvider.ts). Make sure they have an equivalent in the new system and that it would be invoked at the same time as it was before the migration. There is no more specific rule that can be followed: each track needs to be checked independently.


### Things to look out for:

* Timings: Trace events in the new engine uses raw timestamps coming from a trace. This means the new engine uses **microseconds**. However, most features in the panel use **milliseconds**. Make sure you make the appropriate time conversion when appending new tracks.



