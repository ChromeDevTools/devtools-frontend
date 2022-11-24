# Traces

This folder contains traces saved by the DevTools Performance Panel that can be used in tests.

To add a trace, copy the `*.json.gz` file into this folder, and add it to the `BUILD.gn`. You can also add the unzipped `*.json` file, but these are git-ignored. However, it's useful when working with a trace file to have it extracted and inspectable!

There are two helpers you can use to load a trace file into a test, depending on which model you are working with:

## OPP "legacy" model

Use `loadTraceEventsLegacyEventPayload`. This loads the file and assumes it returns a list of `SDK.TracingManager.EventPayload` events.

### Insights model

The Insights model supports trace files in two forms:

1. An array of events.
2. An object, with an array of `traceEvents` and associated `metadata`

You can use `loadEventsFromTraceFile` to return all the events in a trace file. If you want to load the entire file, you can use `loadTraceFile`.

If you have created an example website to generate a trace, consider contributing it to the [Performance Stories repository](https://github.com/ChromeDevTools/performance-stories).

# Trace descriptions

**If you add a trace, please update this file with a description of the file and how it was generated**.

## basic

A very barebones trace; contains info on browser processes and threads but very little else.

## slow-interaction-button-click

Generated from the [long-interaction story](https://github.com/ChromeDevTools/performance-stories/tree/main/long-interaction). Contains one slow interaction which is the user clicking on a button.

## slow-interaction-keydown

Generated from the [long-interaction story](https://github.com/ChromeDevTools/performance-stories/tree/main/long-interaction). Contains one slow interaction which is the user typing into the input field. There is also another interaction representing the user clicking into the text field to focus it, but this is not a long interaction.

## Example trace files

### basic

A barebones trace file with the main details about processes and threads but
little else.

### reload-and-trace-page

This trace is a trace of example.com which was recorded via the OPP's "Start profiling and reload the page" button.

### web-dev

A trace of web.dev being loaded.

### multiple-top-level-renderers

A trace containing multiple top level renderers.

### missing-process-data

A trace missing the renderer process.

### threejs-gpu

A trace containing a lot of GPU activity.

### forced-layouts-and-no-gpu

A trace that contains a button that, when clicked, will iterate over 30 paragraphs and increment their width to the width of a div. This causes a forced layout event for each one. Additionally this trace contains no GPU thread.

### multiple-navigations

This is a trace that includes multiple navigations:

* Starts on google.com
* Navigates to Google Images search (google.com/imghp)
* Search for "dogs" (https://www.google.com/search?q=dogs&...)

### user-timings

Generated from https://github.com/ChromeDevTools/performance-stories/tree/main/user-timings


