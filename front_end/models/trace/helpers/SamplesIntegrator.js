// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var _a;
import * as Types from '../types/types.js';
import { milliToMicro } from './Timing.js';
import { extractSampleTraceId, makeProfileCall, mergeEventsInOrder, sortTraceEventsInPlace } from './Trace.js';
/**
 * This is a helper that integrates CPU profiling data coming in the
 * shape of samples, with trace events. Samples indicate what the JS
 * stack trace looked at a given point in time, but they don't have
 * duration. The SamplesIntegrator task is to make an approximation
 * of what the duration of each JS call was, given the sample data and
 * given the trace events profiled during that time. At the end of its
 * execution, the SamplesIntegrator returns an array of ProfileCalls
 * (under SamplesIntegrator::buildProfileCalls()), which
 * represent JS calls, with a call frame and duration. These calls have
 * the shape of a complete trace events and can be treated as flame
 * chart entries in the timeline.
 *
 * The approach to build the profile calls consists in tracking the
 * current stack as the following events happen (in order):
 * 1. A sample was done.
 * 2. A trace event started.
 * 3. A trace event ended.
 * Depending on the event and on the data that's coming with it the
 * stack is updated by adding or removing JS calls to it and updating
 * the duration of the calls in the tracking stack.
 *
 * note: Although this approach has been implemented since long ago, and
 * is relatively efficient (adds a complexity over the trace parsing of
 * O(n) where n is the number of samples) it has proven to be faulty.
 * It might be worthwhile experimenting with improvements or with a
 * completely different approach. Improving the approach is tracked in
 * crbug.com/1417439
 */
export class SamplesIntegrator {
    /**
     * The result of running the samples integrator. Holds the JS calls
     * with their approximated duration after integrating samples into the
     * trace event tree.
     */
    #constructedProfileCalls = [];
    /**
     * tracks the state of the JS stack at each point in time to update
     * the profile call durations as new events arrive. This doesn't only
     * happen with new profile calls (in which case we would compare the
     * stack in them) but also with trace events (in which case we would
     * update the duration of the events we are tracking at the moment).
     */
    #currentJSStack = [];
    /**
     * Process holding the CPU profile and trace events.
     */
    #processId;
    /**
     * Thread holding the CPU profile and trace events.
     */
    #threadId;
    /**
     * Tracks the depth of the JS stack at the moment a trace event starts
     * or ends. It is assumed that for the duration of a trace event, the
     * JS stack's depth cannot decrease, since JS calls that started
     * before a trace event cannot end during the trace event. So as trace
     * events arrive, we store the "locked" amount of JS frames that were
     * in the stack before the event came.
     */
    #lockedJsStackDepth = [];
    /**
     * Used to keep track when samples should be integrated even if they
     * are not children of invocation trace events. This is useful in
     * cases where we can be missing the start of JS invocation events if
     * we start tracing half-way through.
     */
    #fakeJSInvocation = false;
    /**
     * The parsed CPU profile, holding the tree hierarchy of JS frames and
     * the sample data.
     */
    #profileModel;
    /**
     * Because GC nodes don't have a stack, we artificially add a stack to
     * them which corresponds to that of the previous sample. This map
     * tracks which node is used for the stack of a GC call.
     * Note that GC samples are not shown in the flamechart, however they
     * are used during the construction of for profile calls, as we can
     * infer information about the duration of the executed code when a
     * GC node is sampled.
     */
    #nodeForGC = new Map();
    #engineConfig;
    #profileId;
    /**
     * Keeps track of the individual samples from the CPU Profile.
     * Only used with Debug Mode experiment enabled.
     */
    jsSampleEvents = [];
    constructor(profileModel, profileId, pid, tid, configuration) {
        this.#profileModel = profileModel;
        this.#threadId = tid;
        this.#processId = pid;
        this.#engineConfig = configuration || Types.Configuration.defaults();
        this.#profileId = profileId;
    }
    buildProfileCalls(traceEvents) {
        const mergedEvents = mergeEventsInOrder(traceEvents, this.callsFromProfileSamples());
        const stack = [];
        for (let i = 0; i < mergedEvents.length; i++) {
            const event = mergedEvents[i];
            // Because instant trace events have no duration, they don't provide
            // useful information for possible changes in the duration of calls
            // in the JS stack.
            if (event.ph === "I" /* Types.Events.Phase.INSTANT */ && !extractSampleTraceId(event)) {
                continue;
            }
            if (stack.length === 0) {
                if (Types.Events.isProfileCall(event)) {
                    this.#onProfileCall(event);
                    continue;
                }
                stack.push(event);
                this.#onTraceEventStart(event);
                continue;
            }
            const parentEvent = stack.at(-1);
            if (parentEvent === undefined) {
                continue;
            }
            const begin = event.ts;
            const parentBegin = parentEvent.ts;
            const parentDuration = parentEvent.dur || 0;
            const parentEnd = parentBegin + parentDuration;
            const startsAfterParent = begin >= parentEnd;
            if (startsAfterParent) {
                this.#onTraceEventEnd(parentEvent);
                stack.pop();
                i--;
                continue;
            }
            if (Types.Events.isProfileCall(event)) {
                this.#onProfileCall(event, parentEvent);
                continue;
            }
            this.#onTraceEventStart(event);
            stack.push(event);
        }
        while (stack.length) {
            const last = stack.pop();
            if (last) {
                this.#onTraceEventEnd(last);
            }
        }
        sortTraceEventsInPlace(this.jsSampleEvents);
        return this.#constructedProfileCalls;
    }
    #onTraceEventStart(event) {
        // Top level events cannot be nested into JS frames so we reset
        // the stack when we find one.
        if (event.name === "RunMicrotasks" /* Types.Events.Name.RUN_MICROTASKS */ || event.name === "RunTask" /* Types.Events.Name.RUN_TASK */) {
            this.#lockedJsStackDepth = [];
            this.#truncateJSStack(0, event.ts);
            this.#fakeJSInvocation = false;
        }
        if (this.#fakeJSInvocation) {
            this.#truncateJSStack(this.#lockedJsStackDepth.pop() || 0, event.ts);
            this.#fakeJSInvocation = false;
        }
        this.#extractStackTrace(event);
        // Keep track of the call frames in the stack before the event
        // happened. For the duration of this event, these frames cannot
        // change (none can be terminated before this event finishes).
        //
        // Also, every frame that is opened after this event, is considered
        // to be a descendant of the event. So once the event finishes, the
        // frames that were opened after it, need to be closed (see
        // onEndEvent).
        //
        // TODO(crbug.com/1417439):
        // The assumption that every frame opened after an event is a
        // descendant of the event is incorrect. For example, a JS call that
        // parents a trace event might have been sampled after the event was
        // dispatched. In this case the JS call would be discarded if this
        // event isn't an invocation event, otherwise the call will be
        // considered a child of the event. In both cases, the result would
        // be incorrect.
        this.#lockedJsStackDepth.push(this.#currentJSStack.length);
    }
    #onProfileCall(event, parent) {
        if ((parent && Types.Events.isJSInvocationEvent(parent)) || this.#fakeJSInvocation) {
            this.#extractStackTrace(event);
        }
        else if (Types.Events.isProfileCall(event) && this.#currentJSStack.length === 0) {
            // Force JS Samples to show up even if we are not inside a JS
            // invocation event, because we can be missing the start of JS
            // invocation events if we start tracing half-way through. Pretend
            // we have a top-level JS invocation event.
            this.#fakeJSInvocation = true;
            const stackDepthBefore = this.#currentJSStack.length;
            this.#extractStackTrace(event);
            this.#lockedJsStackDepth.push(stackDepthBefore);
        }
    }
    #onTraceEventEnd(event) {
        // Because the event has ended, any frames that happened after
        // this event are terminated. Frames that are ancestors to this
        // event are extended to cover its ending.
        const endTime = Types.Timing.Micro(event.ts + (event.dur ?? 0));
        this.#truncateJSStack(this.#lockedJsStackDepth.pop() || 0, endTime);
    }
    /**
     * Builds the initial calls with no duration from samples. Their
     * purpose is to be merged with the trace event array being parsed so
     * that they can be traversed in order with them and their duration
     * can be updated as the SampleIntegrator callbacks are invoked.
     */
    callsFromProfileSamples() {
        const samples = this.#profileModel.samples;
        const timestamps = this.#profileModel.timestamps;
        if (!samples) {
            return [];
        }
        const calls = [];
        let prevNode;
        for (let i = 0; i < samples.length; i++) {
            const node = this.#profileModel.nodeByIndex(i);
            const timestamp = milliToMicro(Types.Timing.Milli(timestamps[i]));
            if (!node) {
                continue;
            }
            const call = makeProfileCall(node, this.#profileId, i, timestamp, this.#processId, this.#threadId);
            calls.push(call);
            if (this.#engineConfig.debugMode) {
                const traceId = this.#profileModel.traceIds?.[i];
                this.jsSampleEvents.push(this.#makeJSSampleEvent(call, timestamp, traceId));
            }
            if (node.id === this.#profileModel.gcNode?.id && prevNode) {
                // GC samples have no stack, so we just put GC node on top of the
                // last recorded sample. Cache the previous sample for future
                // reference.
                this.#nodeForGC.set(call, prevNode);
                continue;
            }
            prevNode = node;
        }
        return calls;
    }
    /**
     * Given a synthetic profile call, returns an array of profile calls
     * representing the stack trace that profile call belongs to based on
     * its nodeId. The input profile call will be at the top of the
     * returned stack (last position), meaning that any other frames that
     * were effectively above it are omitted.
     * @param profileCall
     * @param overrideTimeStamp a custom timestamp to use for the returned
     * profile calls. If not defined, the timestamp of the input
     * profileCall is used instead. This param is useful for example when
     * creating the profile calls for a sample with a trace id, since the
     * timestamp of the corresponding trace event should be used instead
     * of the sample's.
     */
    #makeProfileCallsForStack(profileCall, overrideTimeStamp) {
        let node = this.#profileModel.nodeById(profileCall.nodeId);
        const isGarbageCollection = node?.id === this.#profileModel.gcNode?.id;
        if (isGarbageCollection) {
            // Because GC don't have a stack, we use the stack of the previous
            // sample.
            node = this.#nodeForGC.get(profileCall) || null;
        }
        if (!node) {
            return [];
        }
        // `node.depth` is 0 based, so to set the size of the array we need
        // to add 1 to its value.
        const callFrames = new Array(node.depth + 1 + Number(isGarbageCollection));
        // Add the stack trace in reverse order (bottom first).
        let i = callFrames.length - 1;
        if (isGarbageCollection) {
            // Place the garbage collection call frame on top of the stack.
            callFrames[i--] = profileCall;
        }
        // Many of these ProfileCalls will be GC'd later when we estimate the frame
        // durations
        while (node) {
            callFrames[i--] = makeProfileCall(node, profileCall.profileId, profileCall.sampleIndex, overrideTimeStamp ?? profileCall.ts, this.#processId, this.#threadId);
            node = node.parent;
        }
        return callFrames;
    }
    #getStackForSampleTraceId(traceId, timestamp) {
        const nodeId = this.#profileModel.traceIds?.[traceId];
        const node = nodeId && this.#profileModel.nodeById(nodeId);
        const maybeCallForTraceId = node && makeProfileCall(node, this.#profileId, -1, timestamp, this.#processId, this.#threadId);
        if (!maybeCallForTraceId) {
            return null;
        }
        if (this.#engineConfig.debugMode) {
            this.jsSampleEvents.push(this.#makeJSSampleEvent(maybeCallForTraceId, timestamp, traceId));
        }
        return this.#makeProfileCallsForStack(maybeCallForTraceId);
    }
    /**
     * Update tracked stack using this event's call stack.
     */
    #extractStackTrace(event) {
        let stackTrace = this.#currentJSStack;
        if (Types.Events.isProfileCall(event)) {
            stackTrace = this.#makeProfileCallsForStack(event);
        }
        const traceId = extractSampleTraceId(event);
        const maybeCallForTraceId = traceId && this.#getStackForSampleTraceId(traceId, event.ts);
        if (maybeCallForTraceId) {
            stackTrace = maybeCallForTraceId;
        }
        _a.filterStackFrames(stackTrace, this.#engineConfig);
        const endTime = event.ts + (event.dur || 0);
        const minFrames = Math.min(stackTrace.length, this.#currentJSStack.length);
        let i;
        // Merge a sample's stack frames with the stack frames we have
        // so far if we detect they are equivalent.
        // Graphically
        // This:
        // Current stack trace       Sample
        // [-------A------]          [A]
        // [-------B------]          [B]
        // [-------C------]          [C]
        //                ^ t = x1    ^ t = x2
        // Becomes this:
        // New stack trace after merge
        // [--------A-------]
        // [--------B-------]
        // [--------C-------]
        //                  ^ t = x2
        for (i = this.#lockedJsStackDepth.at(-1) || 0; i < minFrames; ++i) {
            const newFrame = stackTrace[i].callFrame;
            const oldFrame = this.#currentJSStack[i].callFrame;
            if (!_a.framesAreEqual(newFrame, oldFrame)) {
                break;
            }
            // Scoot the right edge of this callFrame to the right
            this.#currentJSStack[i].dur =
                Types.Timing.Micro(Math.max(this.#currentJSStack[i].dur || 0, endTime - this.#currentJSStack[i].ts));
        }
        // If there are call frames in the sample that differ with the stack
        // we have, update the stack, but keeping the common frames in place
        // Graphically
        // This:
        // Current stack trace       Sample
        // [-------A------]          [A]
        // [-------B------]          [B]
        // [-------C------]          [C]
        // [-------D------]          [E]
        //                ^ t = x1    ^ t = x2
        // Becomes this:
        // New stack trace after merge
        // [--------A-------]
        // [--------B-------]
        // [--------C-------]
        //                [E]
        //                  ^ t = x2
        this.#truncateJSStack(i, event.ts);
        for (; i < stackTrace.length; ++i) {
            const call = stackTrace[i];
            if (call.nodeId === this.#profileModel.programNode?.id || call.nodeId === this.#profileModel.root?.id ||
                call.nodeId === this.#profileModel.idleNode?.id || call.nodeId === this.#profileModel.gcNode?.id) {
                // Skip (root), (program) and (idle) frames, since this are not
                // relevant for web profiling and we don't want to show them in
                // the timeline.
                continue;
            }
            this.#currentJSStack.push(call);
            this.#constructedProfileCalls.push(call);
        }
    }
    /**
     * When a call stack that differs from the one we are tracking has
     * been detected in the samples, the latter is "truncated" by
     * setting the ending time of its call frames and removing the top
     * call frames that aren't shared with the new call stack. This way,
     * we can update the tracked stack with the new call frames on top.
     * @param depth the amount of call frames from bottom to top that
     * should be kept in the tracking stack trace. AKA amount of shared
     * call frames between two stacks.
     * @param time the new end of the call frames in the stack.
     */
    #truncateJSStack(depth, time) {
        if (this.#lockedJsStackDepth.length) {
            const lockedDepth = this.#lockedJsStackDepth.at(-1);
            if (lockedDepth && depth < lockedDepth) {
                console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);
                depth = lockedDepth;
            }
        }
        if (this.#currentJSStack.length < depth) {
            console.error(`Trying to truncate higher than the current stack size at ${time}`);
            depth = this.#currentJSStack.length;
        }
        for (let k = 0; k < this.#currentJSStack.length; ++k) {
            this.#currentJSStack[k].dur = Types.Timing.Micro(Math.max(time - this.#currentJSStack[k].ts, 0));
        }
        this.#currentJSStack.length = depth;
    }
    #makeJSSampleEvent(call, timestamp, traceId) {
        const JSSampleEvent = {
            name: "JSSample" /* Types.Events.Name.JS_SAMPLE */,
            cat: 'devtools.timeline',
            args: {
                data: { traceId, stackTrace: this.#makeProfileCallsForStack(call).map(e => e.callFrame) },
            },
            ph: "I" /* Types.Events.Phase.INSTANT */,
            ts: timestamp,
            dur: Types.Timing.Micro(0),
            pid: this.#processId,
            tid: this.#threadId,
        };
        return JSSampleEvent;
    }
    static framesAreEqual(frame1, frame2) {
        return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName &&
            frame1.lineNumber === frame2.lineNumber;
    }
    static showNativeName(name, runtimeCallStatsEnabled) {
        return runtimeCallStatsEnabled && Boolean(_a.nativeGroup(name));
    }
    static nativeGroup(nativeName) {
        if (nativeName.startsWith('Parse')) {
            return "Parse" /* SamplesIntegrator.NativeGroups.PARSE */;
        }
        if (nativeName.startsWith('Compile') || nativeName.startsWith('Recompile')) {
            return "Compile" /* SamplesIntegrator.NativeGroups.COMPILE */;
        }
        return null;
    }
    static isNativeRuntimeFrame(frame) {
        return frame.url === 'native V8Runtime';
    }
    static filterStackFrames(stack, engineConfig) {
        const showAllEvents = engineConfig.showAllEvents;
        if (showAllEvents) {
            return;
        }
        let previousNativeFrameName = null;
        let j = 0;
        for (let i = 0; i < stack.length; ++i) {
            const frame = stack[i].callFrame;
            const nativeRuntimeFrame = _a.isNativeRuntimeFrame(frame);
            if (nativeRuntimeFrame &&
                !_a.showNativeName(frame.functionName, engineConfig.includeRuntimeCallStats)) {
                continue;
            }
            const nativeFrameName = nativeRuntimeFrame ? _a.nativeGroup(frame.functionName) : null;
            if (previousNativeFrameName && previousNativeFrameName === nativeFrameName) {
                continue;
            }
            previousNativeFrameName = nativeFrameName;
            stack[j++] = stack[i];
        }
        stack.length = j;
    }
    static createFakeTraceFromCpuProfile(profile, tid) {
        if (!profile) {
            return { traceEvents: [], metadata: {} };
        }
        // The |Name.CPU_PROFILE| will let MetaHandler to set |traceIsGeneric| to false
        // The start time and duration is important here because we'll use them to determine the traceBounds
        // We use the start and end time of the profile (which is longer than all samples), so the Performance
        // panel won't truncate this time period.
        const cpuProfileEvent = {
            cat: 'disabled-by-default-devtools.timeline',
            name: "CpuProfile" /* Types.Events.Name.CPU_PROFILE */,
            ph: "X" /* Types.Events.Phase.COMPLETE */,
            pid: Types.Events.ProcessID(1),
            tid,
            ts: Types.Timing.Micro(profile.startTime),
            dur: Types.Timing.Micro(profile.endTime - profile.startTime),
            args: { data: { cpuProfile: profile } },
            // Create an arbitrary profile id.
            id: '0x1',
        };
        return {
            traceEvents: [cpuProfileEvent],
            metadata: {
                dataOrigin: "CPUProfile" /* Types.File.DataOrigin.CPU_PROFILE */,
            }
        };
    }
    static extractCpuProfileFromFakeTrace(traceEvents) {
        const profileEvent = traceEvents.find(e => Types.Events.isSyntheticCpuProfile(e));
        const profile = profileEvent?.args.data.cpuProfile;
        if (!profile) {
            throw new Error('Missing cpuProfile data');
        }
        return profile;
    }
}
_a = SamplesIntegrator;
//# sourceMappingURL=SamplesIntegrator.js.map