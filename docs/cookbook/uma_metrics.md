# UMA metrics in DevTools frontend

[TOC]

It is highly recommended to use
[Visual Logging](../../front_end/ui/visual_logging/README.md) for anything
related to the DevTools front-end, and use use counters or UMA histograms for
anything related to the DevTools back-end (Chromium, Blink, and V8). In some
rare cases that require complex analysis of behavior that is not reflected in
the UI you might need to also use UMA histograms in the DevTools front-end.

(Googlers only) Generally, the histogram or action data is available in the
Timeline category of the [UMA](http://uma/) page.

*   Select the channel you want to dive into.
*   Select the platforms you are interested in (for us, it is Linux, MacOS,
    Windows, ChromeOS and Lacros)
*   Add the metric you want to see, for example the generic histogram for action
    tracking, `DevTools.ActionTaken`.

## General histograms

*   `DevTools.ActionTaken` is a generic histogram for tracking actions performed
    via the DevTools front-end.
*   `DevTools.PanelShown` counts how often a given panel or tab is shown in the
    DevTools front-end.

## Histograms for the Workspaces feature

*   `DevTools.ActionTaken` records `AddFileSystemToWorkspace` (*Add Filesystem
    to Workspace*), `RemoveFileSystemFromWorkspace` (*Remove Filesystem from
    Workspace*) and `FileSystemSourceSelected` (*Filesystem source selected*)
    according to developer interactions with the *Filesystem* tab in the
    *Sources* panels sidebar.
*   `DevTools.Workspaces.PopulateWallClockTime` records the wall clock time in
    milliseconds elapsed while populating a project folder in the workspace.
*   `DevTools.SidebarPaneShown` records the `navigator-files` (*Sources -
    Filesystem*) enum whenever the *Filesystem* tab is revealed in the *Sources*
    panels sidebar.

## How to add UMA metrics in DevTools frontend

Decide on the metric (an
[enumerated histogram](https://chromium.googlesource.com/chromium/src/tools/+/HEAD/metrics/histograms/README.md#enum-histograms)
or an
[action](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/host/UserMetrics.ts;l=380)
to be logged to generic `DevTools.ActionTaken` histogram)

1.  For enumerated histogram (We use this when there are multiple related states
    that should be analyzed jointly. For example, we might want to know the
    source of an action like where it is performed from)
    1.  Choose a name for the new histogram prefixed with `DevTools`, for
        example, `DevTools.ColorPickerOpenedFrom`.
    2.  Decide on the values for the different enums you want to log, for
        example, `StylesPane` and `SourcesPanel` for
        `DevTools.ColorPickerOpenedFrom` histogram.
2.  For actions
    1.  Decide on the name of the action, for example, `DeviceModeEnabled`.

### Tracking an enumerated histogram

1.  Implement metric collection in devtools-frontend and create a CL. (Example
    [CL](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/3998783))
    1.  Add the new histogram name to the
        <code>[EnumeratedHistogram](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/host/InspectorFrontendHostAPI.ts;l=351?q=InspectorFrontendHostAPI.ts)</code>
        enum.
    2.  Add the same histogram name to the EnumeratedHistogram object in
        <code>[devtools_compatibility.js](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/devtools_compatibility.js;l=396?q=devtools_compatibil)</code>
        file.
    3.  Create a new function in
        <code>[UserMetrics.ts](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/host/UserMetrics.ts;l=351)</code>
        with an enum parameter that corresponds to the possible values like
        <code>colorPickerOpenedFrom(type: ColorPickerOpenedFrom): void</code>
        that calls
        <code>InspectorFrontendHostInstance.recordEnumeratedHistogram</code>.
    4.  Call the new function from <code>Host.userMetrics</code> in the places
        that you want to log the event.
    5.  Create the CL.
2.  Update
    [histograms.xml](https://source.corp.google.com/h/chromium/chromium/src/+/main:tools/metrics/histograms/metadata/dev/histograms.xml)
    and
    [enums.xml](https://source.chromium.org/chromium/chromium/src/+/main:tools/metrics/histograms/enums.xml;l=26267?q=tools%2Fmetrics%2Fhistograms%2Fenums.xml)
    in the Chromium codebase.
    1.  Add a new enum in
        [enums.xml](https://source.chromium.org/chromium/chromium/src/+/main:tools/metrics/histograms/enums.xml;l=26267?q=tools%2Fmetrics%2Fhistograms%2Fenums.xml)
        with values corresponding to the values in the frontend with name
        <code>DevTools&lt;HISTOGRAM_NAME></code> and make sure that enum values
        1-1 map to the values you’ve defined in the frontend.
    2.  Add the new histogram definition in
        [histograms.xml](https://source.corp.google.com/h/chromium/chromium/src/+/main:tools/metrics/histograms/metadata/dev/histograms.xml)
        and set enum name to be the enum you've defined in the 1st step. Make
        sure that histogram name is the same with the name you've used in the
        frontend change.
    3.  Create the CL.

### Tracking an action

1.  Implement metric collection in devtools-frontend and create a CL. (Example
    [CL](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/3998783))
    1.  Add the action you want to track to the
        <code>[Action](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/host/UserMetrics.ts;l=379)</code>
        enum in <code>UserMetrics.ts.</code>
    2.  Call <code>Host.userMetrics.actionTaken(Action.YOUR_ACTION)</code> in
        the places you want to the event.
    3.  Create the CL.
2.  Update enums in the Chromium side in
    <code>[tools/metrics/histograms/enums.xml](https://source.chromium.org/chromium/chromium/src/+/main:tools/metrics/histograms/enums.xml;l=26267?q=tools%2Fmetrics%2Fhistograms%2Fenums.xml)</code>.
    1.  Add the new action to the <code>DevToolsAction</code> enum.
    2.  Create the CL.

### Metrics Dashboard

After the both CLs are landed we expect your histogram or action data to be
available in [UMA](http://uma/p/chrome/timeline_v2). For seeing them:

*   Select the channel you want to dive into.
*   Select the platforms you are interested in (for us, it is Linux, MacOS,
    Windows, ChromeOS and Lacros)
*   Add the metric you want to see: either the histogram name you’ve newly added
    `DevTools.ColorPickerOpenedFrom` or the generic histogram for action
    tracking, `DevTools.ActionTaken`.
