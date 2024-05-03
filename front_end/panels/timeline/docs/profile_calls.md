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

### 2. Initial creation of `ProfileCall`s

We create fake trace events to represent samples. We take all samples from the profile and create a `ProfileCall` (a fake trace event representing a JS call) for each sample. We only do this for the function on top of the stack on each sample. ProfileCalls have a node `id`, pointing to the `node` of the cpu profile it corresponds to. At initialization, every ProfileCall is set a duration of 0.

### 3. Consolidating

We merge the trace data with the ProfileCalls created in the previous step, the resultant data is sorted by timestamp. Let’s call this data the “complete data”, since it contains the browser trace events and the fake profile calls we just created.

### 4. Estimate JS call durations

We estimate the duration of JS calls. For this, we create an array that represents the JS stack, each item in it being a call frame (AKA `JSFrame` / `ProfileCall`).  Then, we go through each event in the “complete data” and for each event we update the items in the JS stack.

For example, if we find a sample (represented as an empty profile call) for the first time, we push the call frames in the sample (which we create using the call tree we built on the first step) to the stack. If we then find a second sample, we compare the call frames in it with the current JS stack, position by position, and update the frames in the stack accordingly: repeated call frames are “merged” together by extending one’s duration to cover the other’s timestamp, obsolete call frames are removed from the stack and new call frames are pushed to it.

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

_Note: When call frames are "merged" only one of them is kept in the output data, meaning that we **drop many of the ProfileCalls we created** in steps 2 and 4. GC cleans them up._

Every time we add a call frame to the JS stack array, we also add them to another array, called `constructedProfileCalls` to hold a reference. At the end of the loop, `constructedProfileCalls` contains all estimated JS calls with their estimated duration.

There are other ways in which the stack is modified. Examples:

- If a `Task` trace event is found, the stack “truncated”.
- If a `FunctionCall` appears, the stack is “locked”.

These are heuristics that try to make the estimation of the calls come closer to reality given the limitations of using a sample based approach in tandem with tracing.
