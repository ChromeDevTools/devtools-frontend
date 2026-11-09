# The life of a `ProfileCall`

ProfileCalls are how the trace engine represents JavaScript data from the sampling profiler.

### Related resources

- [sync_tracks.md](./sync_tracks.md) offers a great overview of how sampling and tracing data are handled in the codebase.
- The [_JS Sampling meets Tracing_ deck](https://docs.google.com/presentation/d/1E6_A9p5bVaeDeCJ1KSmV-9CCUUesLKoU3M9cTlM0uc0/edit?usp=sharing) illustrates some of these operations.

## From CPU profile to finalized `ProfileCall`s

### 1. Building `CPUProfileDataModel`

We parse the CPU profile received from the backend containing the samples to recreate the call tree (in `CPUProfileDataModel`). A sample is a representation of the JS stack at a point in time, V8 represents this information in the following format (which we call a [cpu profile](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-Profile)):

- A list of `nodes`, each representing a function in the call tree (not to be confused with a function call in the program). Each node has an `id` and a list of ids pointing to its children, which represents the functions it calls. We recreate the call tree from this data. Each node in the tree has a reference to its parent and to its children.
- The list of `samples` itself. On each position, it contains the node id of the function on top of the JS stack at the moment the sample was taken.
- A list of time deltas. On each position x, it contains the time passed between samples x and x-1.

With this data we can deduce with certainty how the full JS stack looked at the time of each sample, **but** we can only guess/estimate how it looked at any point in between samples.

### 2. Streaming samples and trace events with two cursors

`SamplesIntegrator#buildProfileCalls()` streams the sorted trace events and the sorted CPU profile samples in chronological order using two cursors rather than allocating a `ProfileCall` for every sample or building a merged input array up front.

Before the merge loop starts, `#prepareSamples()` indexes the preceding non-GC node for each garbage-collection sample by `sampleIndex` (and populates `jsSampleEvents` when `debugMode` is enabled). During the merge loop, `advanceSample()` reuses a single mutable scratch `SyntheticProfileCall` carrying the current sample's top-of-stack `nodeId`, `callFrame`, `sampleIndex`, and `ts` (`dur` is `0`).

### 3. Estimate JS call durations

To estimate the duration of JS calls, `SamplesIntegrator` maintains an active JS stack (`#currentJSStack`), where each entry is a `SyntheticProfileCall`. As the two cursors advance through trace events and CPU samples, the integrator updates `#currentJSStack`:

For example, when the first sample arrives, `SamplesIntegrator` walks the CPU profile call tree from step 1 to reconstruct the sample's stack frames and allocates `SyntheticProfileCall` objects for the frames pushed onto `#currentJSStack`. When a subsequent sample arrives, its stack frames are compared with `#currentJSStack` position by position: matching frames are extended to cover the new sample's timestamp, frames that ended are truncated from `#currentJSStack`, and only newly opened frames allocate new `SyntheticProfileCall` objects.

Graphically,

This:

    Current stack trace                         New Sample to process
    [-------A------]  dur = t2 - t1             [A]
    [-------B------]  dur = t2 - t1             [B]
    [-------C------]  dur = t2 - t1             [C]
    [-------D------]  dur = t2 - t1             [E]
    ^ t1             ^ t2                                ^ t 3

Becomes this:

    New stack trace after merge:
    [--------A-------]  dur = t3- t1
    [--------B-------]  dur = t3- t1
    [--------C-------]  dur = t3- t1
                      [E]  dur = 0
    ^ t1              ^ t3

_Note: Because `advanceSample()` reuses one scratch `SyntheticProfileCall` and `#extractStackTrace()` only allocates `SyntheticProfileCall` entries for frames newly pushed onto `#currentJSStack` (`[E]` above), repeated samples of already-open frames (`[A]`, `[B]`, `[C]`) extend durations in place without transient allocations._

Every time we add a call frame to the JS stack array, we also add them to another array, called `constructedProfileCalls` to hold a reference. At the end of the loop, `constructedProfileCalls` contains all estimated JS calls with their estimated duration.

There are other ways in which the stack is modified. Examples:

- If a `Task` trace event is found, the stack “truncated”.
- If a `FunctionCall` appears, the stack is “locked”.

These are heuristics that try to make the estimation of the calls come closer to reality given the limitations of using a sample based approach in tandem with tracing.
