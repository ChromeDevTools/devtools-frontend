// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';
import { SyntheticEventsManager } from './SyntheticEvents.js';
import { eventTimingsMicroSeconds } from './Timing.js';
/**
 * Extracts the raw stack trace in known trace events. Most likely than
 * not you want to use `getZeroIndexedStackTraceForEvent`, which returns
 * the stack with zero based numbering. Since some trace events are
 * one based this function can yield unexpected results when used
 * indiscriminately.
 *
 * Note: this only returns the stack trace contained in the payload of
 * an event, which only contains the synchronous portion of the call
 * stack. If you want to obtain the whole stack trace you might need to
 * use the @see Trace.Extras.StackTraceForEvent util.
 */
export function stackTraceInEvent(event) {
    if (event.args?.data?.stackTrace) {
        return event.args.data.stackTrace;
    }
    if (event.args?.stackTrace) {
        return event.args.stackTrace;
    }
    if (Types.Events.isRecalcStyle(event)) {
        return event.args.beginData?.stackTrace || null;
    }
    if (Types.Events.isLayout(event)) {
        return event.args.beginData.stackTrace ?? null;
    }
    if (Types.Events.isFunctionCall(event)) {
        const data = event.args.data;
        if (!data) {
            return null;
        }
        const { columnNumber, lineNumber, url, scriptId, functionName } = data;
        if (lineNumber === undefined || functionName === undefined || columnNumber === undefined ||
            scriptId === undefined || url === undefined) {
            return null;
        }
        return [{ columnNumber, lineNumber, url, scriptId, functionName }];
    }
    if (Types.Events.isProfileCall(event)) {
        // Of type Protocol.Runtime.CallFrame, handle accordingly.
        const callFrame = event.callFrame;
        if (!callFrame) {
            return null;
        }
        const { columnNumber, lineNumber, url, scriptId, functionName } = callFrame;
        if (lineNumber === undefined || functionName === undefined || columnNumber === undefined ||
            scriptId === undefined || url === undefined) {
            return null;
        }
        return [{ columnNumber, lineNumber, url, scriptId, functionName }];
    }
    return null;
}
export function extractOriginFromTrace(firstNavigationURL) {
    const url = Common.ParsedURL.ParsedURL.fromString(firstNavigationURL);
    if (url) {
        // We do this to save some space in the toolbar - seeing the `www` is less
        // useful than seeing `foo.com` if it's truncated at narrow widths
        if (url.host.startsWith('www.')) {
            return url.host.slice(4);
        }
        return url.host;
    }
    return null;
}
/**
 * Each thread contains events. Events indicate the thread and process IDs, which are
 * used to store the event in the correct process thread entry below.
 **/
export function addEventToProcessThread(event, eventsInProcessThread) {
    const { tid, pid } = event;
    let eventsInThread = eventsInProcessThread.get(pid);
    if (!eventsInThread) {
        eventsInThread = new Map();
    }
    let events = eventsInThread.get(tid);
    if (!events) {
        events = [];
    }
    events.push(event);
    eventsInThread.set(event.tid, events);
    eventsInProcessThread.set(event.pid, eventsInThread);
}
export function compareBeginAndEnd(aBeginTime, bBeginTime, aEndTime, bEndTime) {
    if (aBeginTime < bBeginTime) {
        return -1;
    }
    if (aBeginTime > bBeginTime) {
        return 1;
    }
    if (aEndTime > bEndTime) {
        return -1;
    }
    if (aEndTime < bEndTime) {
        return 1;
    }
    return 0;
}
export function eventTimeComparator(a, b) {
    const aBeginTime = a.ts;
    const bBeginTime = b.ts;
    const aDuration = a.dur ?? 0;
    const bDuration = b.dur ?? 0;
    const aEndTime = aBeginTime + aDuration;
    const bEndTime = bBeginTime + bDuration;
    const timeDifference = compareBeginAndEnd(aBeginTime, bBeginTime, aEndTime, bEndTime);
    if (timeDifference) {
        return timeDifference;
    }
    // If times are equal, prioritize profile calls over trace events,
    // since an exactly equal timestamp with a trace event is likely
    // indicates that the SamplesIntegrator meant to parent the trace
    // event with the profile call.
    if (Types.Events.isProfileCall(a) && !Types.Events.isProfileCall(b)) {
        return -1;
    }
    if (Types.Events.isProfileCall(b) && !Types.Events.isProfileCall(a)) {
        return 1;
    }
    return 0;
}
/**
 * Sorts all the events in place, in order, by their start time. If they have
 * the same start time, orders them by longest first.
 */
export function sortTraceEventsInPlace(events) {
    events.sort(eventTimeComparator);
}
/**
 * Returns an array of ordered events that results after merging the two
 * ordered input arrays.
 */
export function mergeEventsInOrder(eventsArray1, eventsArray2) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < eventsArray1.length && j < eventsArray2.length) {
        const event1 = eventsArray1[i];
        const event2 = eventsArray2[j];
        const compareValue = eventTimeComparator(event1, event2);
        if (compareValue <= 0) {
            result.push(event1);
            i++;
        }
        if (compareValue === 1) {
            result.push(event2);
            j++;
        }
    }
    while (i < eventsArray1.length) {
        result.push(eventsArray1[i++]);
    }
    while (j < eventsArray2.length) {
        result.push(eventsArray2[j++]);
    }
    return result;
}
export function parseDevtoolsDetails(timingDetail, key) {
    try {
        // Attempt to parse the detail as an object that might be coming from a
        // DevTools Perf extension.
        // Wrapped in a try-catch because timingDetail might either:
        // 1. Not be `json.parse`-able (it should, but just in case...)
        // 2. Not be an object - in which case the `in` check will error.
        // If we hit either of these cases, we just ignore this mark and move on.
        const detailObj = JSON.parse(timingDetail);
        if (!(key in detailObj)) {
            return null;
        }
        if (!Types.Extensions.isValidExtensionPayload(detailObj[key])) {
            return null;
        }
        return detailObj[key];
    }
    catch {
        // No need to worry about this error, just discard this event and don't
        // treat it as having any useful information for the purposes of extensions.
        return null;
    }
}
export function getNavigationForTraceEvent(event, eventFrameId, navigationsByFrameId) {
    const navigations = navigationsByFrameId.get(eventFrameId);
    if (!navigations || eventFrameId === '') {
        // This event's navigation has been filtered out by the meta handler as a noise event
        // or contains an empty frameId.
        return null;
    }
    const eventNavigationIndex = Platform.ArrayUtilities.nearestIndexFromEnd(navigations, navigation => navigation.ts <= event.ts);
    if (eventNavigationIndex === null) {
        // This event's navigation has been filtered out by the meta handler as a noise event.
        return null;
    }
    return navigations[eventNavigationIndex];
}
export function extractId(event) {
    return event.id ?? event.id2?.global ?? event.id2?.local;
}
export function activeURLForFrameAtTime(frameId, time, rendererProcessesByFrame) {
    const processData = rendererProcessesByFrame.get(frameId);
    if (!processData) {
        return null;
    }
    for (const processes of processData.values()) {
        for (const processInfo of processes) {
            if (processInfo.window.min > time || processInfo.window.max < time) {
                continue;
            }
            return processInfo.frame.url;
        }
    }
    return null;
}
/**
 * @param node the node attached to the profile call. Here a node represents a function in the call tree.
 * @param profileId the profile ID that the sample came from that backs this call.
 * @param sampleIndex the index of the sample in the given profile that this call was created from
 * @param ts the timestamp of the profile call
 * @param pid the process ID of the profile call
 * @param tid the thread ID of the profile call
 *
 * See `panels/timeline/docs/profile_calls.md` for more context on how these events are created.
 */
export function makeProfileCall(node, profileId, sampleIndex, ts, pid, tid) {
    return {
        cat: '',
        name: 'ProfileCall',
        nodeId: node.id,
        args: {},
        ph: "X" /* Types.Events.Phase.COMPLETE */,
        pid,
        tid,
        ts,
        dur: Types.Timing.Micro(0),
        callFrame: node.callFrame,
        sampleIndex,
        profileId,
    };
}
/**
 * Matches beginning events with PairableAsyncEnd and PairableAsyncInstant
 * if provided. Traces may contain multiple instant events so we need to
 * account for that. Additionally we have seen cases where we might only have a
 * begin event & instant event(s), with no end event. So we account for that
 * situation also.
 *
 * You might also like to read the models/trace/README.md which has some
 * documentation on trace IDs. This is important as Perfetto will reuse trace
 * IDs when emitting events (if they do not overlap). This means it's not as
 * simple as grouping events by IDs. Instead, we group begin & instant events
 * by ID as we find them. When we find end events, we then pop any matching
 * begin/instant events off the stack and group those. That way, if we meet the
 * same ID later on it doesn't cause us collisions.
 *
 * @returns An array of all the matched event groups, along with their ID. Note
 * that two event groups can have the same ID if they were non-overlapping
 * events. You cannot rely on ID being unique across a trace. The returned set
 * of groups are NOT SORTED in any order.
 */
function matchEvents(unpairedEvents) {
    sortTraceEventsInPlace(unpairedEvents);
    // map to store begin and end of the event
    const matches = [];
    const beginEventsById = new Map();
    const instantEventsById = new Map();
    for (const event of unpairedEvents) {
        const id = getSyntheticId(event);
        if (id === undefined) {
            continue;
        }
        if (Types.Events.isPairableAsyncBegin(event)) {
            const existingEvents = beginEventsById.get(id) ?? [];
            existingEvents.push(event);
            beginEventsById.set(id, existingEvents);
        }
        else if (Types.Events.isPairableAsyncInstant(event)) {
            const existingEvents = instantEventsById.get(id) ?? [];
            existingEvents.push(event);
            instantEventsById.set(id, existingEvents);
        }
        else if (Types.Events.isPairableAsyncEnd(event)) {
            // Find matching begin event by ID
            const beginEventsWithMatchingId = beginEventsById.get(id) ?? [];
            const beginEvent = beginEventsWithMatchingId.pop();
            if (!beginEvent) {
                continue;
            }
            const instantEventsWithMatchingId = instantEventsById.get(id) ?? [];
            // Find all instant events after the begin event ts.
            const instantEventsForThisGroup = [];
            while (instantEventsWithMatchingId.length > 0) {
                if (instantEventsWithMatchingId[0].ts >= beginEvent.ts) {
                    const event = instantEventsWithMatchingId.pop();
                    if (event) {
                        instantEventsForThisGroup.push(event);
                    }
                }
                else {
                    break;
                }
            }
            const matchingGroup = {
                begin: beginEvent,
                end: event,
                instant: instantEventsForThisGroup,
                syntheticId: id,
            };
            matches.push(matchingGroup);
        }
    }
    // At this point we know we have paired up all the Begin & End & Instant
    // events. But it is possible to see only begin & instant events with the
    // same ID, and no end event. So now we do a second pass through our begin
    // events to find any that did not have an end event. If we find some
    // instant events for the begin event, we create a new group.
    // Also, because there were no end events, we know that the IDs will be
    // unique now; e.g. each key in the map should have no more than one item in
    // it.
    for (const [id, beginEvents] of beginEventsById) {
        const beginEvent = beginEvents.pop();
        if (!beginEvent) {
            continue;
        }
        const matchingInstantEvents = instantEventsById.get(id);
        if (matchingInstantEvents?.length) {
            matches.push({
                syntheticId: id,
                begin: beginEvent,
                end: null,
                instant: matchingInstantEvents,
            });
        }
    }
    return matches;
}
export function getSyntheticId(event) {
    const id = extractId(event);
    return id && `${event.cat}:${id}:${event.name}`;
}
function createSortedSyntheticEvents(matchedPairs) {
    const syntheticEvents = [];
    for (const eventsTriplet of matchedPairs) {
        const id = eventsTriplet.syntheticId;
        const beginEvent = eventsTriplet.begin;
        const endEvent = eventsTriplet.end;
        const instantEvents = eventsTriplet.instant;
        if (!beginEvent || !(endEvent || instantEvents)) {
            // This should never happen, the backend only creates the events once it
            // has them both (beginEvent & endEvent/instantEvents), so we should never get into this state.
            // If we do, something is very wrong, so let's just drop that problematic event.
            continue;
        }
        const triplet = { beginEvent, endEvent, instantEvents };
        /**
         * When trying to pair events with instant events present, there are times when these
         * ASYNC_NESTABLE_INSTANT ('n') don't have a corresponding ASYNC_NESTABLE_END ('e') event.
         * In these cases, pair without needing the endEvent.
         */
        function eventsArePairable(data) {
            const instantEventsMatch = data.instantEvents ? data.instantEvents.some(e => id === getSyntheticId(e)) : false;
            const endEventMatch = data.endEvent ? id === getSyntheticId(data.endEvent) : false;
            return Boolean(id) && (instantEventsMatch || endEventMatch);
        }
        if (!eventsArePairable(triplet)) {
            continue;
        }
        const targetEvent = endEvent || beginEvent;
        const event = SyntheticEventsManager.registerSyntheticEvent({
            rawSourceEvent: triplet.beginEvent,
            cat: targetEvent.cat,
            ph: targetEvent.ph,
            pid: targetEvent.pid,
            tid: targetEvent.tid,
            id,
            // Both events have the same name, so it doesn't matter which we pick to
            // use as the description
            name: beginEvent.name,
            dur: Types.Timing.Micro(targetEvent.ts - beginEvent.ts),
            ts: beginEvent.ts,
            args: {
                data: triplet,
            },
        });
        if (event.dur < 0) {
            // We have seen in the backend that sometimes animation events get
            // generated with multiple begin entries, or multiple end entries, and this
            // can cause invalid data on the performance panel, so we drop them.
            // crbug.com/1472375
            continue;
        }
        syntheticEvents.push(event);
    }
    sortTraceEventsInPlace(syntheticEvents);
    return syntheticEvents;
}
/**
 * Groups up sets of async events into synthetic events.
 * @param unpairedAsyncEvents the raw array of begin, end and async instant
 * events. These MUST be sorted in timestamp ASC order.
 */
export function createMatchedSortedSyntheticEvents(unpairedAsyncEvents) {
    const matchedPairs = matchEvents(unpairedAsyncEvents);
    const syntheticEvents = createSortedSyntheticEvents(matchedPairs);
    return syntheticEvents;
}
/**
 * Different trace events return line/column numbers that are 1 or 0 indexed.
 * This function knows which events return 1 indexed numbers and normalizes
 * them. The UI expects 0 indexed line numbers, so that is what we return.
 */
export function getZeroIndexedLineAndColumnForEvent(event) {
    // Some events emit line numbers that are 1 indexed, but the UI layer expects
    // numbers to be 0 indexed. So here, if the event matches a known 1-indexed
    // number event, we subtract one from the line and column numbers.
    // Otherwise, if the event has args.data.lineNumber/colNumber, we return it
    // as is.
    const numbers = getRawLineAndColumnNumbersForEvent(event);
    const { lineNumber, columnNumber } = numbers;
    switch (event.name) {
        // All these events have line/column numbers which are 1 indexed; so we
        // subtract to make them 0 indexed.
        case "FunctionCall" /* Types.Events.Name.FUNCTION_CALL */:
        case "EvaluateScript" /* Types.Events.Name.EVALUATE_SCRIPT */:
        case "v8.compile" /* Types.Events.Name.COMPILE */:
        case "v8.produceCache" /* Types.Events.Name.CACHE_SCRIPT */: {
            return {
                lineNumber: typeof lineNumber === 'number' ? lineNumber - 1 : undefined,
                columnNumber: typeof columnNumber === 'number' ? columnNumber - 1 : undefined,
            };
        }
        case "ProfileCall" /* Types.Events.Name.PROFILE_CALL */: {
            const callFrame = event.callFrame;
            return {
                lineNumber: typeof lineNumber === 'number' ? callFrame.lineNumber - 1 : undefined,
                columnNumber: typeof columnNumber === 'number' ? callFrame.columnNumber - 1 : undefined,
            };
        }
        default: {
            return numbers;
        }
    }
}
/**
 * Different trace events contain stack traces with line/column numbers
 * that are 1 or 0 indexed.
 * This function knows which events return 1 indexed numbers and normalizes
 * them. The UI expects 0 indexed line numbers, so that is what we return.
 *
 * Note: this only returns the stack trace contained in the payload of
 * an event, which only contains the synchronous portion of the call
 * stack. If you want to obtain the whole stack trace you might need to
 * use the @see Trace.Extras.StackTraceForEvent util.
 */
export function getZeroIndexedStackTraceInEventPayload(event) {
    const stack = stackTraceInEvent(event);
    if (!stack) {
        return null;
    }
    switch (event.name) {
        case "ScheduleStyleRecalculation" /* Types.Events.Name.SCHEDULE_STYLE_RECALCULATION */:
        case "InvalidateLayout" /* Types.Events.Name.INVALIDATE_LAYOUT */:
        case "FunctionCall" /* Types.Events.Name.FUNCTION_CALL */:
        case "Layout" /* Types.Events.Name.LAYOUT */:
        case "UpdateLayoutTree" /* Types.Events.Name.RECALC_STYLE */: {
            return stack.map(makeZeroBasedCallFrame);
        }
        default: {
            if (Types.Events.isUserTiming(event) || Types.Extensions.isSyntheticExtensionEntry(event)) {
                return stack.map(makeZeroBasedCallFrame);
            }
            return stack;
        }
    }
}
/**
 * Same as getZeroIndexedStackTraceInEventPayload, but only returns the top call frame.
 */
export function getStackTraceTopCallFrameInEventPayload(event) {
    const stack = stackTraceInEvent(event);
    if (!stack || stack.length === 0) {
        return null;
    }
    switch (event.name) {
        case "ScheduleStyleRecalculation" /* Types.Events.Name.SCHEDULE_STYLE_RECALCULATION */:
        case "InvalidateLayout" /* Types.Events.Name.INVALIDATE_LAYOUT */:
        case "FunctionCall" /* Types.Events.Name.FUNCTION_CALL */:
        case "Layout" /* Types.Events.Name.LAYOUT */:
        case "UpdateLayoutTree" /* Types.Events.Name.RECALC_STYLE */: {
            return makeZeroBasedCallFrame(stack[0]);
        }
        default: {
            if (Types.Events.isUserTiming(event) || Types.Extensions.isSyntheticExtensionEntry(event)) {
                return makeZeroBasedCallFrame(stack[0]);
            }
            return stack[0];
        }
    }
}
/**
 * Given a 1-based call frame creates a 0-based one.
 */
export function makeZeroBasedCallFrame(callFrame) {
    const normalizedCallFrame = { ...callFrame };
    normalizedCallFrame.lineNumber = callFrame.lineNumber && callFrame.lineNumber - 1;
    normalizedCallFrame.columnNumber = callFrame.columnNumber && callFrame.columnNumber - 1;
    return normalizedCallFrame;
}
/**
 * NOTE: you probably do not want this function! (Which is why it is not exported).
 *
 * Some trace events have 0 indexed line/column numbers, and others have 1
 * indexed. This function does NOT normalize them, but
 * `getZeroIndexedLineAndColumnNumbersForEvent` does. It is best to use that!
 *
 * @see {@link getZeroIndexedLineAndColumnForEvent}
 **/
function getRawLineAndColumnNumbersForEvent(event) {
    if (!event.args?.data) {
        return {
            lineNumber: undefined,
            columnNumber: undefined,
        };
    }
    let lineNumber = undefined;
    let columnNumber = undefined;
    if ('lineNumber' in event.args.data && typeof event.args.data.lineNumber === 'number') {
        lineNumber = event.args.data.lineNumber;
    }
    if ('columnNumber' in event.args.data && typeof event.args.data.columnNumber === 'number') {
        columnNumber = event.args.data.columnNumber;
    }
    return { lineNumber, columnNumber };
}
export function frameIDForEvent(event) {
    // There are a few events (for example RecalcStyle, ParseHTML) that have
    // the frame stored in args.beginData
    // Rather than list them all we just check for the presence of the field, so
    // we are robust against future trace events also doing this.
    // This check seems very robust, but it also helps satisfy TypeScript and
    // prevents us against unexpected data.
    if (event.args && 'beginData' in event.args && typeof event.args.beginData === 'object' &&
        event.args.beginData !== null && 'frame' in event.args.beginData &&
        typeof event.args.beginData.frame === 'string') {
        return event.args.beginData.frame;
    }
    // Otherwise, we expect frame to be in args.data
    if (event.args?.data?.frame) {
        return event.args.data.frame;
    }
    // No known frame for this event.
    return null;
}
const DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline';
export function isTopLevelEvent(event) {
    return event.cat.includes(DevToolsTimelineEventCategory) && event.name === "RunTask" /* Types.Events.Name.RUN_TASK */;
}
export function isExtensionUrl(url) {
    return url.startsWith('extensions:') || url.startsWith('chrome-extension:');
}
function topLevelEventIndexEndingAfter(events, time) {
    let index = Platform.ArrayUtilities.upperBound(events, time, (time, event) => time - event.ts) - 1;
    while (index > 0 && !isTopLevelEvent(events[index])) {
        index--;
    }
    return Math.max(index, 0);
}
export function findRecalcStyleEvents(events, startTime, endTime) {
    const foundEvents = [];
    const startEventIndex = topLevelEventIndexEndingAfter(events, startTime);
    for (let i = startEventIndex; i < events.length; i++) {
        const event = events[i];
        if (!Types.Events.isRecalcStyle(event)) {
            continue;
        }
        if (event.ts >= (endTime || Infinity)) {
            continue;
        }
        foundEvents.push(event);
    }
    return foundEvents;
}
export function findNextEventAfterTimestamp(candidates, ts) {
    const index = Platform.ArrayUtilities.nearestIndexFromBeginning(candidates, candidate => ts < candidate.ts);
    return index === null ? null : candidates[index];
}
export function findPreviousEventBeforeTimestamp(candidates, ts) {
    const index = Platform.ArrayUtilities.nearestIndexFromEnd(candidates, candidate => candidate.ts < ts);
    return index === null ? null : candidates[index];
}
/**
 * Iterates events in a tree hierarchically, from top to bottom,
 * calling back on every event's start and end in the order
 * dictated by the corresponding timestamp.
 *
 * Events are assumed to be in ascendent order by timestamp.
 *
 * Events with 0 duration are treated as instant events. These do not have a
 * begin and end, but will be passed to the config.onInstantEvent callback as
 * they are discovered. Do not provide this callback if you are not interested
 * in them.
 *
 * For example, given this tree, the following callbacks
 * are expected to be made in the following order
 * |---------------A---------------|
 *  |------B------||-------D------|
 *    |---C---|
 *
 * 1. Start A
 * 3. Start B
 * 4. Start C
 * 5. End C
 * 6. End B
 * 7. Start D
 * 8. End D
 * 9. End A
 *
 * By default, async events are skipped. This behaviour can be
 * overridden making use of the config.ignoreAsyncEvents parameter.
 */
export function forEachEvent(events, config) {
    const globalStartTime = config.startTime ?? Types.Timing.Micro(0);
    const globalEndTime = config.endTime || Types.Timing.Micro(Infinity);
    const ignoreAsyncEvents = config.ignoreAsyncEvents === false ? false : true;
    const stack = [];
    const startEventIndex = topLevelEventIndexEndingAfter(events, globalStartTime);
    for (let i = startEventIndex; i < events.length; i++) {
        const currentEvent = events[i];
        const currentEventTimings = eventTimingsMicroSeconds(currentEvent);
        if (currentEventTimings.endTime < globalStartTime) {
            continue;
        }
        if (currentEventTimings.startTime > globalEndTime) {
            break;
        }
        const isIgnoredAsyncEvent = ignoreAsyncEvents && Types.Events.isPhaseAsync(currentEvent.ph);
        if (isIgnoredAsyncEvent || Types.Events.isFlowPhase(currentEvent.ph)) {
            continue;
        }
        // If we have now reached an event that is after a bunch of events, we need
        // to call the onEndEvent callback for those events before moving on.
        let lastEventOnStack = stack.at(-1);
        let lastEventEndTime = lastEventOnStack ? eventTimingsMicroSeconds(lastEventOnStack).endTime : null;
        while (lastEventOnStack && lastEventEndTime && lastEventEndTime <= currentEventTimings.startTime) {
            stack.pop();
            config.onEndEvent(lastEventOnStack);
            lastEventOnStack = stack.at(-1);
            lastEventEndTime = lastEventOnStack ? eventTimingsMicroSeconds(lastEventOnStack).endTime : null;
        }
        // Now we have dealt with all events prior to this one, see if we need to care about this one.
        if (config.eventFilter && !config.eventFilter(currentEvent)) {
            // The user has chosen to filter this event out, so continue on and do nothing
            continue;
        }
        if (currentEventTimings.duration) {
            config.onStartEvent(currentEvent);
            stack.push(currentEvent);
        }
        else if (config.onInstantEvent) {
            // An event with 0 duration is an instant event.
            config.onInstantEvent(currentEvent);
        }
    }
    // Now we have finished looping over all events; any events remaining on the
    // stack need to have their onEndEvent called.
    while (stack.length) {
        const last = stack.pop();
        if (last) {
            config.onEndEvent(last);
        }
    }
}
// Parsed categories are cached to prevent calling cat.split()
// multiple times on the same categories string.
const parsedCategories = new Map();
export function eventHasCategory(event, category) {
    let parsedCategoriesForEvent = parsedCategories.get(event.cat);
    if (!parsedCategoriesForEvent) {
        parsedCategoriesForEvent = new Set(event.cat.split(',') || []);
    }
    return parsedCategoriesForEvent.has(category);
}
/**
 * This compares Types.Events.CallFrame with Protocol.Runtime.CallFrame and checks for equality.
 */
export function isMatchingCallFrame(eventFrame, nodeFrame) {
    return eventFrame.columnNumber === nodeFrame.columnNumber && eventFrame.lineNumber === nodeFrame.lineNumber &&
        String(eventFrame.scriptId) === nodeFrame.scriptId && eventFrame.url === nodeFrame.url &&
        eventFrame.functionName === nodeFrame.functionName;
}
export function eventContainsTimestamp(event, ts) {
    return event.ts <= ts && event.ts + (event.dur || 0) >= ts;
}
export function extractSampleTraceId(event) {
    if (!event.args) {
        return null;
    }
    if ('beginData' in event.args) {
        const beginData = event.args['beginData'];
        return beginData.sampleTraceId ?? null;
    }
    return event.args?.sampleTraceId ?? event.args?.data?.sampleTraceId ?? null;
}
/**
 * This exactly matches Trace.Styles.visibleTypes. See the runtime verification in maybeInitStylesMap.
 * TODO(crbug.com/410884528)
 **/
export const VISIBLE_TRACE_EVENT_TYPES = new Set([
    "AbortPostTaskCallback" /* Types.Events.Name.ABORT_POST_TASK_CALLBACK */,
    "Animation" /* Types.Events.Name.ANIMATION */,
    "AsyncTask" /* Types.Events.Name.ASYNC_TASK */,
    "v8.deserializeOnBackground" /* Types.Events.Name.BACKGROUND_DESERIALIZE */,
    "v8.produceModuleCache" /* Types.Events.Name.CACHE_MODULE */,
    "v8.produceCache" /* Types.Events.Name.CACHE_SCRIPT */,
    "CancelAnimationFrame" /* Types.Events.Name.CANCEL_ANIMATION_FRAME */,
    "CancelIdleCallback" /* Types.Events.Name.CANCEL_IDLE_CALLBACK */,
    "Commit" /* Types.Events.Name.COMMIT */,
    "V8.CompileCode" /* Types.Events.Name.COMPILE_CODE */,
    "V8.CompileModule" /* Types.Events.Name.COMPILE_MODULE */,
    "v8.compile" /* Types.Events.Name.COMPILE */,
    "CompositeLayers" /* Types.Events.Name.COMPOSITE_LAYERS */,
    "ComputeIntersections" /* Types.Events.Name.COMPUTE_INTERSECTION */,
    "ConsoleTime" /* Types.Events.Name.CONSOLE_TIME */,
    "CppGC.IncrementalSweep" /* Types.Events.Name.CPPGC_SWEEP */,
    "DoDecryptReply" /* Types.Events.Name.CRYPTO_DO_DECRYPT_REPLY */,
    "DoDecrypt" /* Types.Events.Name.CRYPTO_DO_DECRYPT */,
    "DoDigestReply" /* Types.Events.Name.CRYPTO_DO_DIGEST_REPLY */,
    "DoDigest" /* Types.Events.Name.CRYPTO_DO_DIGEST */,
    "DoEncryptReply" /* Types.Events.Name.CRYPTO_DO_ENCRYPT_REPLY */,
    "DoEncrypt" /* Types.Events.Name.CRYPTO_DO_ENCRYPT */,
    "DoSignReply" /* Types.Events.Name.CRYPTO_DO_SIGN_REPLY */,
    "DoSign" /* Types.Events.Name.CRYPTO_DO_SIGN */,
    "DoVerifyReply" /* Types.Events.Name.CRYPTO_DO_VERIFY_REPLY */,
    "DoVerify" /* Types.Events.Name.CRYPTO_DO_VERIFY */,
    "Decode Image" /* Types.Events.Name.DECODE_IMAGE */,
    "EmbedderCallback" /* Types.Events.Name.EMBEDDER_CALLBACK */,
    "v8.evaluateModule" /* Types.Events.Name.EVALUATE_MODULE */,
    "EvaluateScript" /* Types.Events.Name.EVALUATE_SCRIPT */,
    "EventDispatch" /* Types.Events.Name.EVENT_DISPATCH */,
    "EventTiming" /* Types.Events.Name.EVENT_TIMING */,
    "V8.FinalizeDeserialization" /* Types.Events.Name.FINALIZE_DESERIALIZATION */,
    "FireAnimationFrame" /* Types.Events.Name.FIRE_ANIMATION_FRAME */,
    "FireIdleCallback" /* Types.Events.Name.FIRE_IDLE_CALLBACK */,
    "FunctionCall" /* Types.Events.Name.FUNCTION_CALL */,
    "BlinkGC.AtomicPhase" /* Types.Events.Name.GC_COLLECT_GARBARGE */,
    "GCEvent" /* Types.Events.Name.GC */,
    "GPUTask" /* Types.Events.Name.GPU_TASK */,
    "HandlePostMessage" /* Types.Events.Name.HANDLE_POST_MESSAGE */,
    "HitTest" /* Types.Events.Name.HIT_TEST */,
    "JSSample" /* Types.Events.Name.JS_SAMPLE */,
    "Layerize" /* Types.Events.Name.LAYERIZE */,
    "Layout" /* Types.Events.Name.LAYOUT */,
    "MajorGC" /* Types.Events.Name.MAJOR_GC */,
    "MinorGC" /* Types.Events.Name.MINOR_GC */,
    "V8.OptimizeCode" /* Types.Events.Name.OPTIMIZE_CODE */,
    "PaintSetup" /* Types.Events.Name.PAINT_SETUP */,
    "Paint" /* Types.Events.Name.PAINT */,
    "ParseAuthorStyleSheet" /* Types.Events.Name.PARSE_AUTHOR_STYLE_SHEET */,
    "ParseHTML" /* Types.Events.Name.PARSE_HTML */,
    "PrePaint" /* Types.Events.Name.PRE_PAINT */,
    "ProfileCall" /* Types.Events.Name.PROFILE_CALL */,
    "Program" /* Types.Events.Name.PROGRAM */,
    "RasterTask" /* Types.Events.Name.RASTER_TASK */,
    "RequestAnimationFrame" /* Types.Events.Name.REQUEST_ANIMATION_FRAME */,
    "RequestIdleCallback" /* Types.Events.Name.REQUEST_IDLE_CALLBACK */,
    "ResourceFinish" /* Types.Events.Name.RESOURCE_FINISH */,
    "ResourceReceivedData" /* Types.Events.Name.RESOURCE_RECEIVE_DATA */,
    "ResourceReceiveResponse" /* Types.Events.Name.RESOURCE_RECEIVE_RESPONSE */,
    "ResourceSendRequest" /* Types.Events.Name.RESOURCE_SEND_REQUEST */,
    "ResourceWillSendRequest" /* Types.Events.Name.RESOURCE_WILL_SEND_REQUEST */,
    "RunMicrotasks" /* Types.Events.Name.RUN_MICROTASKS */,
    "RunPostTaskCallback" /* Types.Events.Name.RUN_POST_TASK_CALLBACK */,
    "RunTask" /* Types.Events.Name.RUN_TASK */,
    "SchedulePostMessage" /* Types.Events.Name.SCHEDULE_POST_MESSAGE */,
    "SchedulePostTaskCallback" /* Types.Events.Name.SCHEDULE_POST_TASK_CALLBACK */,
    "ScheduleStyleRecalculation" /* Types.Events.Name.SCHEDULE_STYLE_RECALCULATION */,
    "ScrollLayer" /* Types.Events.Name.SCROLL_LAYER */,
    "CpuProfiler::StartProfiling" /* Types.Events.Name.START_PROFILING */,
    "v8.parseOnBackgroundParsing" /* Types.Events.Name.STREAMING_COMPILE_SCRIPT_PARSING */,
    "v8.parseOnBackgroundWaiting" /* Types.Events.Name.STREAMING_COMPILE_SCRIPT_WAITING */,
    "v8.parseOnBackground" /* Types.Events.Name.STREAMING_COMPILE_SCRIPT */,
    "SyntheticLayoutShiftCluster" /* Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT_CLUSTER */,
    "SyntheticLayoutShift" /* Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT */,
    "TimeStamp" /* Types.Events.Name.TIME_STAMP */,
    "TimerFire" /* Types.Events.Name.TIMER_FIRE */,
    "TimerInstall" /* Types.Events.Name.TIMER_INSTALL */,
    "TimerRemove" /* Types.Events.Name.TIMER_REMOVE */,
    "UpdateLayerTree" /* Types.Events.Name.UPDATE_LAYER_TREE */,
    "UpdateLayoutTree" /* Types.Events.Name.RECALC_STYLE */,
    "UserTiming" /* Types.Events.Name.USER_TIMING */,
    "V8Console::runTask" /* Types.Events.Name.V8_CONSOLE_RUN_TASK */,
    "v8.wasm.cachedModule" /* Types.Events.Name.WASM_CACHED_MODULE */,
    "v8.wasm.compiledModule" /* Types.Events.Name.WASM_COMPILED_MODULE */,
    "v8.wasm.moduleCacheHit" /* Types.Events.Name.WASM_MODULE_CACHE_HIT */,
    "v8.wasm.moduleCacheInvalid" /* Types.Events.Name.WASM_MODULE_CACHE_INVALID */,
    "v8.wasm.streamFromResponseCallback" /* Types.Events.Name.WASM_STREAM_FROM_RESPONSE_CALLBACK */,
    "WebSocketCreate" /* Types.Events.Name.WEB_SOCKET_CREATE */,
    "WebSocketDestroy" /* Types.Events.Name.WEB_SOCKET_DESTROY */,
    "WebSocketReceiveHandshakeResponse" /* Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST */,
    "WebSocketReceive" /* Types.Events.Name.WEB_SOCKET_RECEIVE */,
    "WebSocketSendHandshakeRequest" /* Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST */,
    "WebSocketSend" /* Types.Events.Name.WEB_SOCKET_SEND */,
    "XHRLoad" /* Types.Events.Name.XHR_LOAD */,
    "XHRReadyStateChange" /* Types.Events.Name.XHR_READY_STATE_CHANGED */,
]);
//# sourceMappingURL=Trace.js.map