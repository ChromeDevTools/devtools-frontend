// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { assert } from 'chai';
import * as CPUProfile from '../models/cpu_profile/cpu_profile.js';
import * as Trace from '../models/trace/trace.js';
/**
 * We create here a cross-test base trace event. It is assumed that each
 * test will import this default event and copy-override properties at will.
 **/
export const defaultTraceEvent = {
    name: 'process_name',
    tid: Trace.Types.Events.ThreadID(0),
    pid: Trace.Types.Events.ProcessID(0),
    ts: Trace.Types.Timing.Micro(0),
    cat: 'test',
    ph: "M" /* Trace.Types.Events.Phase.METADATA */,
};
/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export function getTree(thread) {
    const tree = thread.tree;
    assert(tree, `Couldn't get tree in thread ${thread.name}`);
    return tree;
}
/**
 * Gets the n-th root from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getRootAt(thread, index) {
    const tree = getTree(thread);
    const node = [...tree.roots][index];
    assert(node, `Couldn't get the id of the root at index ${index} in thread ${thread.name}`);
    return node;
}
/**
 * Gets all nodes in a thread. To finish this task, we Walk through all the nodes, starting from the root node.
 */
export function getAllNodes(roots) {
    const allNodes = [];
    const children = Array.from(roots);
    while (children.length > 0) {
        const childNode = children.shift();
        if (childNode) {
            allNodes.push(childNode);
            children.push(...childNode.children);
        }
    }
    return allNodes;
}
/**
 * Gets all the `events` for the `nodes`.
 */
export function getEventsIn(nodes) {
    return [...nodes].flatMap(node => node ? node.entry : []);
}
/**
 * Pretty-prints a tree.
 */
export function prettyPrint(tree, predicate = () => true, indentation = 2, delimiter = ' ', prefix = '-', newline = '\n', out = '') {
    let skipped = false;
    return printNodes(tree.roots);
    function printNodes(nodes) {
        for (const node of nodes) {
            const event = node.entry;
            if (!predicate(node, event)) {
                out += `${!skipped ? newline : ''}.`;
                skipped = true;
                continue;
            }
            skipped = false;
            const spacing = new Array(node.depth * indentation).fill(delimiter).join('');
            const eventType = Trace.Types.Events.isDispatch(event) ? `(${event.args.data?.type})` : false;
            const jsFunctionName = Trace.Types.Events.isProfileCall(event) ? `(${event.callFrame.functionName || 'anonymous'})` : false;
            const duration = `[${(event.dur || 0) / 1000}ms]`;
            const info = [jsFunctionName, eventType, duration].filter(Boolean);
            out += `${newline}${spacing}${prefix}${event.name} ${info.join(' ')}`;
            out = printNodes(node.children);
        }
        return out;
    }
}
/**
 * Builds a mock Complete.
 */
export function makeCompleteEvent(name, ts, dur, cat = '*', pid = 0, tid = 0) {
    return {
        args: {},
        cat,
        name,
        ph: "X" /* Trace.Types.Events.Phase.COMPLETE */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(ts),
        dur: Trace.Types.Timing.Micro(dur),
    };
}
export function makeAsyncStartEvent(name, ts, pid = 0, tid = 0) {
    return {
        args: {},
        cat: '*',
        name,
        ph: "b" /* Trace.Types.Events.Phase.ASYNC_NESTABLE_START */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(ts),
    };
}
export function makeAsyncEndEvent(name, ts, pid = 0, tid = 0) {
    return {
        args: {},
        cat: '*',
        name,
        ph: "e" /* Trace.Types.Events.Phase.ASYNC_NESTABLE_END */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(ts),
    };
}
/**
 * Builds a mock flow phase event.
 */
export function makeFlowPhaseEvent(name, ts, cat = '*', ph, id = 0, pid = 0, tid = 0) {
    return {
        args: {},
        cat,
        name,
        id,
        ph,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(ts),
        dur: Trace.Types.Timing.Micro(0),
    };
}
/**
 * Builds flow phase events for a list of events belonging to the same
 * flow. `events` must be ordered.
 */
export function makeFlowEvents(events, flowId = 0) {
    const firstEvent = events.at(0);
    const lastEvent = events.at(-1);
    if (!lastEvent || !firstEvent) {
        return [];
    }
    const flowName = firstEvent.name;
    const flowStart = makeFlowPhaseEvent(flowName, firstEvent.ts, firstEvent.cat, "s" /* Trace.Types.Events.Phase.FLOW_START */, flowId, firstEvent.pid, firstEvent.tid);
    const flowEnd = makeFlowPhaseEvent(flowName, lastEvent.ts, lastEvent.cat, "f" /* Trace.Types.Events.Phase.FLOW_END */, flowId, lastEvent.pid, lastEvent.tid);
    const flowSteps = [];
    for (let i = 1; i < events.length - 1; i++) {
        flowSteps.push(makeFlowPhaseEvent(flowName, events[i].ts, events[i].cat, "t" /* Trace.Types.Events.Phase.FLOW_STEP */, flowId, events[i].pid, events[i].tid));
    }
    return [flowStart, ...flowSteps, flowEnd];
}
/**
 * Builds a mock Instant.
 */
export function makeInstantEvent(name, tsMicroseconds, cat = '', pid = 0, tid = 0, s = "t" /* Trace.Types.Events.Scope.THREAD */) {
    return {
        args: {},
        cat,
        name,
        ph: "I" /* Trace.Types.Events.Phase.INSTANT */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(tsMicroseconds),
        s,
    };
}
/**
 * Builds a mock Begin.
 */
export function makeBeginEvent(name, ts, cat = '*', pid = 0, tid = 0) {
    return {
        args: {},
        cat,
        name,
        ph: "B" /* Trace.Types.Events.Phase.BEGIN */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(ts),
    };
}
/**
 * Builds a mock End.
 */
export function makeEndEvent(name, ts, cat = '*', pid = 0, tid = 0) {
    return {
        args: {},
        cat,
        name,
        ph: "E" /* Trace.Types.Events.Phase.END */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(ts),
    };
}
export function makeProfileCall(functionName, tsUs, durUs, pid = 0, tid = 0, nodeId = 0, url = '') {
    return {
        cat: '',
        name: 'ProfileCall',
        nodeId,
        sampleIndex: 0,
        profileId: Trace.Types.Events.ProfileID('fake-profile-id'),
        ph: "X" /* Trace.Types.Events.Phase.COMPLETE */,
        pid: Trace.Types.Events.ProcessID(pid),
        tid: Trace.Types.Events.ThreadID(tid),
        ts: Trace.Types.Timing.Micro(tsUs),
        dur: Trace.Types.Timing.Micro(durUs),
        callFrame: {
            functionName,
            scriptId: '',
            url,
            lineNumber: -1,
            columnNumber: -1,
        },
        args: {},
    };
}
/**
 * Mocks an object compatible with the return type of the
 * RendererHandler using only an array of ordered entries.
 */
export function makeMockRendererHandlerData(entries, pid = 1, tid = 1) {
    const { tree, entryToNode } = Trace.Helpers.TreeHelpers.treify(entries, { filter: { has: () => true } });
    const mockThread = {
        tree,
        name: 'thread',
        entries,
        profileCalls: entries.filter(Trace.Types.Events.isProfileCall),
        layoutEvents: entries.filter(Trace.Types.Events.isLayout),
        recalcStyleEvents: entries.filter(Trace.Types.Events.isRecalcStyle),
    };
    const mockProcess = {
        url: 'url',
        isOnMainFrame: true,
        threads: new Map([[tid, mockThread]]),
    };
    return {
        processes: new Map([[pid, mockProcess]]),
        compositorTileWorkers: new Map(),
        entryToNode,
        entityMappings: {
            entityByEvent: new Map(),
            eventsByEntity: new Map(),
            createdEntityCache: new Map(),
            entityByUrlCache: new Map(),
        },
    };
}
/**
 * Mocks an object compatible with the return type of the
 * SamplesHandler using only an array of ordered profile calls.
 */
export function makeMockSamplesHandlerData(profileCalls) {
    const { tree, entryToNode } = Trace.Helpers.TreeHelpers.treify(profileCalls, { filter: { has: () => true } });
    const profile = {
        nodes: [],
        startTime: profileCalls.at(0)?.ts || Trace.Types.Timing.Micro(0),
        endTime: profileCalls.at(-1)?.ts || Trace.Types.Timing.Micro(10e5),
        samples: [],
        timeDeltas: [],
    };
    const nodesIds = new Map();
    const lastTimestamp = profile.startTime;
    for (const profileCall of profileCalls) {
        let node = nodesIds.get(profileCall.nodeId);
        if (!node) {
            node = {
                id: profileCall.nodeId,
                callFrame: profileCall.callFrame,
            };
            profile.nodes.push(node);
            nodesIds.set(profileCall.nodeId, node);
        }
        profile.samples?.push(node.id);
        const timeDelta = profileCall.ts - lastTimestamp;
        profile.timeDeltas?.push(timeDelta);
    }
    const profileData = {
        rawProfile: profile,
        parsedProfile: new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile),
        profileCalls,
        profileTree: tree,
        profileId: Trace.Types.Events.ProfileID('fake-profile-id'),
    };
    const profilesInThread = new Map([[1, profileData]]);
    return {
        profilesInProcess: new Map([[1, profilesInThread]]),
        entryToNode,
    };
}
export function getMainThread(data) {
    let mainThread = null;
    for (const [, process] of data.processes) {
        for (const [, thread] of process.threads) {
            if (thread.name === 'CrRendererMain') {
                mainThread = thread;
                break;
            }
        }
    }
    assert.isNotNull(mainThread, 'Could not find main thread');
    return mainThread;
}
export function getBaseTraceHandlerData(overrides = {}) {
    const data = {
        Animations: { animations: [] },
        AnimationFrames: {
            animationFrames: [],
            presentationForFrame: new Map(),
        },
        DOMStats: {
            domStatsByFrameId: new Map(),
        },
        LayoutShifts: {
            clusters: [],
            clustersByNavigationId: new Map(),
            sessionMaxScore: 0,
            clsWindowID: 0,
            prePaintEvents: [],
            layoutInvalidationEvents: [],
            scheduleStyleInvalidationEvents: [],
            styleRecalcInvalidationEvents: [],
            renderFrameImplCreateChildFrameEvents: [],
            domLoadingEvents: [],
            layoutImageUnsizedEvents: [],
            remoteFonts: [],
            scoreRecords: [],
            backendNodeIds: [],
            paintImageEvents: [],
        },
        Meta: {
            traceBounds: {
                min: Trace.Types.Timing.Micro(0),
                max: Trace.Types.Timing.Micro(100),
                range: Trace.Types.Timing.Micro(100),
            },
            browserProcessId: Trace.Types.Events.ProcessID(-1),
            browserThreadId: Trace.Types.Events.ThreadID(-1),
            gpuProcessId: Trace.Types.Events.ProcessID(-1),
            gpuThreadId: Trace.Types.Events.ThreadID(-1),
            threadsInProcess: new Map(),
            navigationsByFrameId: new Map(),
            navigationsByNavigationId: new Map(),
            finalDisplayUrlByNavigationId: new Map(),
            mainFrameId: '',
            mainFrameURL: '',
            rendererProcessesByFrame: new Map(),
            topLevelRendererIds: new Set(),
            frameByProcessId: new Map(),
            mainFrameNavigations: [],
            traceIsGeneric: false,
            processNames: new Map(),
        },
        Renderer: {
            processes: new Map(),
            compositorTileWorkers: new Map(),
            entryToNode: new Map(),
            entityMappings: {
                entityByEvent: new Map(),
                eventsByEntity: new Map(),
                createdEntityCache: new Map(),
                entityByUrlCache: new Map(),
            },
        },
        Screenshots: {
            legacySyntheticScreenshots: [],
            screenshots: [],
        },
        Samples: {
            entryToNode: new Map(),
            profilesInProcess: new Map(),
        },
        PageLoadMetrics: { metricScoresByFrameId: new Map(), allMarkerEvents: [] },
        UserInteractions: {
            allEvents: [],
            interactionEvents: [],
            beginCommitCompositorFrameEvents: [],
            parseMetaViewportEvents: [],
            interactionEventsWithNoNesting: [],
            longestInteractionEvent: null,
            interactionsOverThreshold: new Set(),
        },
        NetworkRequests: {
            byId: new Map(),
            incompleteInitiator: new Map(),
            byTime: [],
            webSocket: [],
            entityMappings: {
                entityByEvent: new Map(),
                eventsByEntity: new Map(),
                createdEntityCache: new Map(),
                entityByUrlCache: new Map(),
            },
            linkPreconnectEvents: [],
        },
        GPU: {
            mainGPUThreadTasks: [],
        },
        UserTimings: {
            consoleTimings: [],
            performanceMarks: [],
            performanceMeasures: [],
            timestampEvents: [],
            measureTraceByTraceId: new Map(),
        },
        LargestImagePaint: {
            lcpRequestByNavigationId: new Map(),
        },
        LargestTextPaint: new Map(),
        AuctionWorklets: {
            worklets: new Map(),
        },
        ExtensionTraceData: {
            entryToNode: new Map(),
            extensionMarkers: [],
            extensionTrackData: [],
            syntheticConsoleEntriesForTimingsTrack: [],
        },
        Frames: {
            frames: [],
            framesById: {},
        },
        ImagePainting: {
            paintImageByDrawLazyPixelRef: new Map(),
            paintImageForEvent: new Map(),
            paintImageEventForUrl: new Map(),
            paintEventToCorrectedDisplaySize: new Map(),
            didCorrectForHostDpr: false,
        },
        Initiators: {
            eventToInitiator: new Map(),
            initiatorToEvents: new Map(),
        },
        Invalidations: {
            invalidationCountForEvent: new Map(),
            invalidationsForEvent: new Map(),
        },
        LayerTree: {
            paints: [],
            paintsToSnapshots: new Map(),
            snapshots: [],
        },
        Memory: {
            updateCountersByProcess: new Map(),
        },
        PageFrames: {
            frames: new Map(),
        },
        SelectorStats: {
            dataForRecalcStyleEvent: new Map(),
            invalidatedNodeList: [],
        },
        Warnings: {
            perEvent: new Map(),
            perWarning: new Map(),
        },
        Workers: {
            workerIdByThread: new Map(),
            workerSessionIdEvents: [],
            workerURLById: new Map(),
        },
        Flows: {
            flows: [],
        },
        AsyncJSCalls: {
            schedulerToRunEntryPoints: new Map(),
            asyncCallToScheduler: new Map(),
            runEntryPointToScheduler: new Map(),
        },
        Scripts: {
            scripts: [],
        },
        ...overrides,
    };
    return {
        data,
        insights: null,
        traceEvents: [],
        metadata: {},
        // @ts-expect-error
        syntheticEventsManager: null,
    };
}
/**
 * A helper that will query the given array of events and find the first event
 * matching the predicate. It will also assert that a match is found, which
 * saves the need to do that for every test.
 */
export function getEventOfType(events, predicate) {
    const match = events.find(predicate);
    assert(match, 'Failed to find matching event of type');
    return match;
}
export function microsecondsTraceWindow(min, max) {
    return Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);
}
export function microseconds(x) {
    return Trace.Types.Timing.Micro(x);
}
/**
 * Creates a mock `ParsedTrace` object for use in tests. This is a simple
 * cast of an empty object to the `ParsedTrace` type to reduce noise in tests
 * that only need a typed trace object without specific data.
 */
export function makeFakeParsedTrace() {
    return {};
}
export function milliseconds(x) {
    return Trace.Types.Timing.Milli(x);
}
export function getAllNetworkRequestsByHost(networkRequests, host) {
    const reqs = networkRequests.filter(r => {
        const parsedUrl = new URL(r.args.data.url);
        return parsedUrl.host === host;
    });
    return reqs;
}
const allThreadEntriesForTraceCache = new WeakMap();
/**
 * A function to get a list of all thread entries that exist. This is
 * reasonably expensive, so it's cached to avoid a huge impact on our test suite
 * speed.
 */
export function allThreadEntriesInTrace(parsedTrace) {
    const fromCache = allThreadEntriesForTraceCache.get(parsedTrace);
    if (fromCache) {
        return fromCache;
    }
    const allEvents = [];
    for (const process of parsedTrace.data.Renderer.processes.values()) {
        for (const thread of process.threads.values()) {
            for (const entry of thread.entries) {
                allEvents.push(entry);
            }
        }
    }
    Trace.Helpers.Trace.sortTraceEventsInPlace(allEvents);
    allThreadEntriesForTraceCache.set(parsedTrace, allEvents);
    return allEvents;
}
let idCounter = 0;
export function makeTimingEventWithPerformanceExtensionData({ name, ts: tsMicro, detail, dur: durMicro }) {
    const isMark = durMicro === undefined;
    const currentId = idCounter++;
    const traceEventBase = {
        cat: 'blink.user_timing',
        pid: Trace.Types.Events.ProcessID(2017),
        tid: Trace.Types.Events.ThreadID(259),
        id2: { local: `${currentId}` },
    };
    const stringDetail = JSON.stringify(detail);
    const args = isMark ? { data: { detail: stringDetail } } : { detail: stringDetail };
    const firstEvent = {
        args,
        name,
        ph: isMark ? "I" /* Trace.Types.Events.Phase.INSTANT */ : "b" /* Trace.Types.Events.Phase.ASYNC_NESTABLE_START */,
        ts: Trace.Types.Timing.Micro(tsMicro),
        ...traceEventBase,
    };
    if (isMark) {
        return [firstEvent];
    }
    return [
        firstEvent,
        {
            name,
            ...traceEventBase,
            ts: Trace.Types.Timing.Micro(tsMicro + (durMicro || 0)),
            ph: "e" /* Trace.Types.Events.Phase.ASYNC_NESTABLE_END */,
        },
    ];
}
export function makeTimingEventWithConsoleExtensionData({ name, ts, start, end, track, trackGroup, color }) {
    return {
        cat: 'devtools.timeline',
        pid: Trace.Types.Events.ProcessID(2017),
        tid: Trace.Types.Events.ThreadID(259),
        name: "TimeStamp" /* Trace.Types.Events.Name.TIME_STAMP */,
        args: {
            data: {
                message: name,
                start,
                end,
                track,
                trackGroup,
                color,
            }
        },
        ts: Trace.Types.Timing.Micro(ts),
        ph: "I" /* Trace.Types.Events.Phase.INSTANT */,
    };
}
export async function createTraceExtensionDataFromPerformanceAPITestInput(extensionData) {
    const events = extensionData.flatMap(makeTimingEventWithPerformanceExtensionData).sort((e1, e2) => e1.ts - e2.ts);
    return await createTraceExtensionDataFromEvents(events);
}
export async function createTraceExtensionDataFromEvents(events) {
    Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events);
    Trace.Handlers.ModelHandlers.UserTimings.reset();
    for (const event of events) {
        Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.UserTimings.finalize();
    Trace.Handlers.ModelHandlers.ExtensionTraceData.reset();
    // ExtensionTraceData handler doesn't need to handle events since
    // it only consumes the output of the user timings handler.
    await Trace.Handlers.ModelHandlers.ExtensionTraceData.finalize();
    return Trace.Handlers.ModelHandlers.ExtensionTraceData.data();
}
//# sourceMappingURL=TraceHelpersCore.js.map