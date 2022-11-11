# Traces

This folder contains traces saved by the DevTools Performance Panel that can be used in tests.

To add a trace, copy the `*.json.gz` file into this folder, and add it to the `BUILD.gn`. You can also add the unzipped `*.json` file, but these are git-ignored. However, it's useful when working with a trace file to have it extracted and inspectable!

To load a trace in a test, use the `loadTraceFile` function from `helpers/TraceHelpers.ts`.
