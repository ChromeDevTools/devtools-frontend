# Tracing vs Profiling

There are a few different concepts that need to be understood to fully understand how the panel gathers data to show in the timeline.

## Tracing and Profiling

The performance panel supports gathering and ingesting data from two sources:

1. Chrome tracing, which is consumed as a series of events and represented as JSON.
2. CDP profiling, which uses CDP to gather data and return CPU Profiles.

If a user is using DevTools on their website, they are using Chrome tracing. If they are debugging their Node application, they are using CDP.

## Chrome tracing workflow

When a user traces a website, we call [`Tracing.start`](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/#method-start) to instruct Chrome to begin tracing. CDP will emit events via the [`Tracing.dataCollected`](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/#event-dataCollected) event.

We then call [`Tracing.end`](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/#method-end) to manually stop tracing. Once we have called that we still want to wait for all the trace events to be emitted; and we do that by waiting for the [`Tracing.tracingComplete`](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/#event-tracingComplete) event.


## CDP profiling workflow

For this workflow, we use the [`Profiler`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/) domain to gather data. When the user hits record we send two commands to CDP:

1. [`Profiler.setSamplingInterval`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-setSamplingInterval) to set the sampling rate.
2. [`Profiler.start`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-start) to start profiling.

When the user hits stop, we call [`Profiler.stop`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-stop) to stop profiling. This method then returns us a list of gathered CPU Profiles.
