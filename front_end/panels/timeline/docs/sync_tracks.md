# Sync tracks

Sync Tracks, also known as thread and renderer tracks, show synchronous events happening on threads detected on a profile. A track is created for each thread in a profile, which could be for example each main thread of each frame in a website trace, or the single thread in a Node.js profile.

## Browser Traces

### Building the data
Threads are extracted from a trace and exported by the RendererHandler. To assemble the data of a thread, the renderer handler uses two distinct types of data: trace events and CPU samples. Trace events are dispatched by processes in the browser and denote activity happening in the browser and their content includes a timestamp and an optional duration. If no duration is present, it is assumed that the event is an instant.

CPU samples, on the other hand, are gathered by V8 and denote JS functions execution. Unlike trace events, samples don't have a duration. Instead, they carry information about the state of the JS stack at different points in time, separated by a [predefined interval](https://source.chromium.org/chromium/chromium/src/+/1fab167b80daecb09e388ac021861eecd60340f8:v8/src/profiler/tracing-cpu-profiler.cc;l=90;bpv=1;bpt=0). This means that the duration of each function executed during a profile (AKA profile call) is only implicit, and needs to be calculated by the client.

CPU samples come in a format we know as CPU profile. When a page is traced and JS sampling is enabled, the CPU profiles will come in the payload of trace events with names "Profile" and "ProfileChunk". It is the trace engine's task to extract every CPU profile for every thread.

Browser data from trace events and JS execution data from samples are combined in the Performance panel so that they are shown together in the timeline. That way, developers are able to know not only what was happening on the browser/renderer level but also what JS code was being executed at any given point in time. Because of the inherent incompleteness of the sampled JS data (information gaps between each sample), this combination is not trivial and requires us to use heuristics to approximate what the whole picture looked like. More details on this below.

At the moment, building the full data of each sync tracks has the following steps:

#### 1.  Determine existing threads in a trace (and do the next steps for each thread).

Threads and the process they belong to are extracted by keeping track of the `pid` and `tid` fields of trace events, which are the ids of the process and thread a trace event was dispatched in.

#### 2. Extract the CPU profiles from "Profile" and "ProfileChunk" trace events ([SamplesHandler]).
The `Profile` event contains the head of the CPU  profile, meaning its metadata like the start time. `ProfileChunk`, as its names suggests, contains chunks of the profile itself, with samples, times and parts of the call stack tree. The single `Profile` and the multiple `ProfileChunk`  events are matched using their `id`, and a single CPU profile is built for every unique profile id in each thread.

#### 3. Parse extracted CPU profiles (cache call hierarchy w/o info about their duration) ([CPUProfileDataModel]).
The call hierarchy is taken from `ProfileChunk` events, which contain information about functions in the profiled program represented as nodes, with data like a node's children, function name, code location and node id. Each node represents a function in a unique call path and the samples in the profile are simply a list of node ids.

#### 4. Build profile calls using the samples and hierarchy from the CPU profile and sync trace events ([RendererHandler] and [SamplesIntegrator]).
To combine trace events with JS profiles, an approach is taken where profile calls are not built beforehand and then combined with trace events. Instead, profile calls are built by considering JS samples and trace events together as a single set of events. This way, every time a new trace event starts or finishes or a new sample is found, an idea of how the stack looked at that time can be estimated, according to what we guessed the stack looked right before. This logic relies on the parsed profile resulting from step 3, in order to know what the stack looks like at the timestamp of each sample. [profile_calls.md](./profile_calls.md) provides a deeper exploration of this process.

The output of this step are the profile calls synthetically typed as trace events. We use the trace event format for compatibility with the UI implementation.

The [_JS Sampling meets Tracing_ deck](https://docs.google.com/presentation/d/1E6_A9p5bVaeDeCJ1KSmV-9CCUUesLKoU3M9cTlM0uc0/edit?usp=sharing) illustrates some of these operations.

#### 5. Build a single call tree of trace events and profile calls using the output from the previous step ([RendererHandler]).
With profile calls built, we can finally create a single call tree consisting of trace events and profile calls (synthetically formatted as trace events). In the tree, events are linked together in a parent -> children relationship, representing which task (trace event or profile call) called which other task.


##### A note on profile calls
Profile calls are the result of processing CPU profile data to determine the execution timings of JS functions in a profile. They contain a call frame, a timestamp and a duration. The term "JS Frame" is also used interchangeably. CPU profiles contain the parent-child relationships between functions, from which call stacks are derived, and the sample data itself, which records what was at the top of the stack at each sampled time. Using these two pieces of information, the JS flame chart can be easily built (see usages of the `forEachFrame` function in [CPUProfileDataModel] for examples of this). What is not trivial is combining this data with trace events, given that the intially resulting JS frames might not match with the trace events. For example, if a function was sampled after a trace event it caused, and it ended after such trace event, it might look as if the function started within the trace event and also finished after the trace event, something that shouldn't happen among sync events.

### Drawing the data
Built Sync events data is added to the flame chart data by the [ThreadAppender]. An instance of this appender is created for each unique thread in a trace. The implementation is rather simple given that the data exported by the [RendererHandler] is already in hierarchical order.

#### Styles
Styles for trace events tracked in the [`Name`](../../models/trace/types/TraceEvents.ts)  are defined in `EventStyles` in [EventUICategory]. An event style contains the event's label and the color we use to denote its category. This styles definitions are queried by the ThreadAppender to assign the corresponding styles when the timeline is rendered.

Given that profile calls are synthetically formatted as trace events, they are not included in the `Name` enum and as such don't have predefined styles. Instead, a color is generated using their script url as a seed. This way, calls from the same script are shown with the same color. Also, the name used for profile calls is the name of the function they represent.


[MetaHandler]: ../../models/trace/handlers/MetaHandler.ts
[SamplesHandler]: ../../models/trace/handlers/SamplesHandler.ts
[RendererHandler]: ../../models/trace/handlers/RendererHandler.ts
[CPUProfileDataModel]: ../../models/cpu_profile/CPUProfileDataModel.ts
[SamplesIntegrator]: ../../models/trace/helpers/SamplesIntegrator.ts
[ThreadAppender]: ./ThreadAppender.ts
[EventUICategory]: ./EventUICategory.ts
