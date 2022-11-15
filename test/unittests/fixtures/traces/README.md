# Traces

This folder contains traces saved by the DevTools Performance Panel that can be used in tests.

To add a trace, copy the `*.json.gz` file into this folder, and add it to the `BUILD.gn`. You can also add the unzipped `*.json` file, but these are git-ignored. However, it's useful when working with a trace file to have it extracted and inspectable!

To load a trace in a test, use the `loadTraceFile` function from `helpers/TraceHelpers.ts`.

If you have created an example website to generate a trace, consider contributing it to the [Performance Stories repository](https://github.com/ChromeDevTools/performance-stories).

# Trace descriptions

**If you add a trace, please update this file with a description of the file and how it was generated**.

## slow-interaction-button-click

Generated from the [long-interaction story](https://github.com/ChromeDevTools/performance-stories/tree/main/long-interaction). Contains one slow interaction which is the user clicking on a button.


