// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import { VisualElements } from './LoggingConfig.js';
import { getLoggingState } from './LoggingState.js';
let veDebuggingEnabled = false;
let debugOverlay = null;
let debugPopover = null;
const highlightedElements = [];
const nonDomDebugElements = new WeakMap();
let onInspect = undefined;
function ensureDebugOverlay() {
    if (!debugOverlay) {
        debugOverlay = document.createElement('div');
        debugOverlay.style.position = 'fixed';
        debugOverlay.style.top = '0';
        debugOverlay.style.left = '0';
        debugOverlay.style.width = '100vw';
        debugOverlay.style.height = '100vh';
        debugOverlay.style.zIndex = '100000';
        debugOverlay.style.pointerEvents = 'none';
        document.body.appendChild(debugOverlay);
        debugPopover = document.createElement('div');
        debugPopover.classList.add('ve-debug');
        debugPopover.style.position = 'absolute';
        debugPopover.style.background = 'var(--sys-color-cdt-base-container)';
        debugPopover.style.borderRadius = '2px';
        debugPopover.style.padding = '8px';
        debugPopover.style.boxShadow = 'var(--drop-shadow)';
        debugOverlay.appendChild(debugPopover);
    }
}
export function setVeDebuggingEnabled(enabled, inspect) {
    veDebuggingEnabled = enabled;
    if (enabled) {
        ensureDebugOverlay();
    }
    onInspect = inspect;
    if (!enabled) {
        highlightElement(null);
    }
}
// @ts-expect-error
globalThis.setVeDebuggingEnabled = setVeDebuggingEnabled;
let highlightedVeKey = null;
export function setHighlightedVe(veKey) {
    ensureDebugOverlay();
    highlightedVeKey = veKey;
    highlightElement(null);
}
function maybeHighlightElement(element, highlightedKey) {
    highlightedKey = highlightedKey.trim();
    let state = getLoggingState(element);
    let trailingVe = state?.config?.ve ? VisualElements[state?.config?.ve] : null;
    while (state && highlightedKey) {
        const currentKey = elementKey(state.config);
        if (highlightedKey.endsWith(currentKey)) {
            highlightedKey = highlightedKey.slice(0, -currentKey.length).trim();
        }
        else if (trailingVe && highlightedKey.endsWith(trailingVe)) {
            highlightedKey = highlightedKey.slice(0, -trailingVe.length).trim();
            trailingVe = null;
        }
        else {
            break;
        }
        state = state.parent;
        if (state && !highlightedKey.endsWith('>')) {
            break;
        }
        highlightedKey = highlightedKey.slice(0, -1).trim();
    }
    if (!highlightedKey && !state) {
        highlightElement(element, true);
    }
}
export function processForDebugging(loggable) {
    if (highlightedVeKey && loggable instanceof HTMLElement) {
        maybeHighlightElement(loggable, highlightedVeKey);
    }
    const loggingState = getLoggingState(loggable);
    if (!veDebuggingEnabled || !loggingState || loggingState.processedForDebugging) {
        return;
    }
    if (loggable instanceof HTMLElement) {
        processElementForDebugging(loggable, loggingState);
    }
    else {
        processNonDomLoggableForDebugging(loggable, loggingState);
    }
}
function showDebugPopover(content, rect) {
    if (!debugPopover) {
        return;
    }
    // Set these first so we get the correct information from
    // getBoundingClientRect
    debugPopover.style.display = 'block';
    debugPopover.textContent = content;
    if (rect) {
        const debugPopoverReact = debugPopover.getBoundingClientRect();
        // If there is no space under the element
        // render render it above the element
        if (window.innerHeight < rect.bottom + debugPopoverReact.height + 8) {
            debugPopover.style.top = `${rect.top - debugPopoverReact.height - 8}px`;
        }
        else {
            debugPopover.style.top = `${rect.bottom + 8}px`;
        }
        // If the element will go outside the viewport on the right
        // render it with it's and at the viewport end.
        if (window.innerWidth < rect.left + debugPopoverReact.width) {
            debugPopover.style.right = '0px';
            debugPopover.style.left = '';
        }
        else {
            debugPopover.style.right = '';
            debugPopover.style.left = `${rect.left}px`;
        }
    }
}
function highlightElement(element, allowMultiple = false) {
    if (highlightedElements.length > 0 && !allowMultiple && debugOverlay) {
        [...debugOverlay.children].forEach(e => {
            if (e !== debugPopover) {
                e.remove();
            }
        });
        highlightedElements.length = 0;
    }
    if (element && !highlightedElements.includes(element)) {
        assertNotNullOrUndefined(debugOverlay);
        const rect = element.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.style.position = 'absolute';
        highlight.style.top = `${rect.top}px`;
        highlight.style.left = `${rect.left}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        highlight.style.background = 'rgb(71 140 222 / 50%)';
        highlight.style.border = 'dashed 1px #7327C6';
        highlight.style.pointerEvents = 'none';
        debugOverlay.appendChild(highlight);
        highlightedElements.push(element);
    }
}
function processElementForDebugging(element, loggingState) {
    if (element.tagName === 'OPTION') {
        if (loggingState.parent?.selectOpen && debugPopover) {
            debugPopover.innerHTML += '<br>' + debugString(loggingState.config);
            loggingState.processedForDebugging = true;
        }
    }
    else {
        element.addEventListener('mousedown', event => {
            if (highlightedElements.length && debugPopover && veDebuggingEnabled) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, { capture: true });
        element.addEventListener('click', event => {
            if (highlightedElements.includes(event.currentTarget) && debugPopover && veDebuggingEnabled) {
                onInspect?.(debugPopover.textContent || '');
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, { capture: true });
        element.addEventListener('mouseenter', () => {
            if (!veDebuggingEnabled) {
                return;
            }
            highlightElement(element);
            assertNotNullOrUndefined(debugPopover);
            const pathToRoot = [loggingState];
            let ancestor = loggingState.parent;
            while (ancestor) {
                pathToRoot.unshift(ancestor);
                ancestor = ancestor.parent;
            }
            showDebugPopover(pathToRoot.map(s => elementKey(s.config)).join(' > '), element.getBoundingClientRect());
        }, { capture: true });
        element.addEventListener('mouseleave', () => {
            element.style.backgroundColor = '';
            element.style.outline = '';
            assertNotNullOrUndefined(debugPopover);
            debugPopover.style.display = 'none';
        }, { capture: true });
        loggingState.processedForDebugging = true;
    }
}
export function processEventForDebugging(event, state, extraInfo) {
    const format = localStorage.getItem('veDebugLoggingEnabled');
    if (!format) {
        return;
    }
    switch (format) {
        case "Intuitive" /* DebugLoggingFormat.INTUITIVE */:
            processEventForIntuitiveDebugging(event, state, extraInfo);
            break;
        case "Test" /* DebugLoggingFormat.TEST */:
            processEventForTestDebugging(event, state, extraInfo);
            break;
        case "AdHocAnalysis" /* DebugLoggingFormat.AD_HOC_ANALYSIS */:
            processEventForAdHocAnalysisDebugging(event, state, extraInfo);
            break;
    }
}
export function processEventForIntuitiveDebugging(event, state, extraInfo) {
    const entry = {
        event,
        ve: state ? VisualElements[state?.config.ve] : undefined,
        veid: state?.veid,
        context: state?.config.context,
        time: Date.now() - sessionStartTime,
        ...extraInfo,
    };
    deleteUndefinedFields(entry);
    maybeLogDebugEvent(entry);
}
export function processEventForTestDebugging(event, state, _extraInfo) {
    if (event !== 'SettingAccess' && event !== 'FunctionCall') {
        lastImpressionLogEntry = null;
    }
    maybeLogDebugEvent({ interaction: event, veid: state?.veid || 0 });
    checkPendingEventExpectation();
}
export function processEventForAdHocAnalysisDebugging(event, state, extraInfo) {
    const ve = state ? adHocAnalysisEntries.get(state.veid) : null;
    if (ve) {
        const interaction = { time: Date.now() - sessionStartTime, type: event, ...extraInfo };
        deleteUndefinedFields(interaction);
        ve.interactions.push(interaction);
    }
}
function deleteUndefinedFields(entry) {
    for (const stringKey in entry) {
        const key = stringKey;
        if (typeof entry[key] === 'undefined') {
            delete entry[key];
        }
    }
}
export function processImpressionsForDebugging(states) {
    const format = localStorage.getItem('veDebugLoggingEnabled');
    switch (format) {
        case "Intuitive" /* DebugLoggingFormat.INTUITIVE */:
            processImpressionsForIntuitiveDebugLog(states);
            break;
        case "Test" /* DebugLoggingFormat.TEST */:
            processImpressionsForTestDebugLog(states);
            break;
        case "AdHocAnalysis" /* DebugLoggingFormat.AD_HOC_ANALYSIS */:
            processImpressionsForAdHocAnalysisDebugLog(states);
            break;
        default:
    }
}
function processImpressionsForIntuitiveDebugLog(states) {
    const impressions = new Map();
    for (const state of states) {
        const entry = {
            event: 'Impression',
            ve: VisualElements[state.config.ve],
            context: state?.config.context,
            width: state.size.width,
            height: state.size.height,
            veid: state.veid,
        };
        deleteUndefinedFields(entry);
        impressions.set(state.veid, entry);
        if (!state.parent || !impressions.has(state.parent?.veid)) {
            entry.parent = state.parent?.veid;
        }
        else {
            const parent = impressions.get(state.parent?.veid);
            parent.children = parent.children || [];
            parent.children.push(entry);
        }
    }
    const entries = [...impressions.values()].filter(i => 'parent' in i);
    if (entries.length === 1) {
        entries[0].time = Date.now() - sessionStartTime;
        maybeLogDebugEvent(entries[0]);
    }
    else {
        maybeLogDebugEvent({ event: 'Impression', children: entries, time: Date.now() - sessionStartTime });
    }
}
const veTestKeys = new Map();
let lastImpressionLogEntry = null;
function processImpressionsForTestDebugLog(states) {
    if (!lastImpressionLogEntry) {
        lastImpressionLogEntry = { impressions: [] };
        veDebugEventsLog.push(lastImpressionLogEntry);
    }
    for (const state of states) {
        let key = '';
        if (state.parent) {
            key = (veTestKeys.get(state.parent.veid) || '<UNKNOWN>') + ' > ';
        }
        key += VisualElements[state.config.ve];
        if (state.config.context) {
            key += ': ' + state.config.context;
        }
        veTestKeys.set(state.veid, key);
        lastImpressionLogEntry.impressions.push(key);
    }
    checkPendingEventExpectation();
}
const adHocAnalysisEntries = new Map();
function processImpressionsForAdHocAnalysisDebugLog(states) {
    for (const state of states) {
        const buildVe = (state) => {
            const ve = {
                ve: VisualElements[state.config.ve],
                veid: state.veid,
                width: state.size?.width,
                height: state.size?.height,
                context: state.config.context,
            };
            deleteUndefinedFields(ve);
            if (state.parent) {
                ve.parent = buildVe(state.parent);
            }
            return ve;
        };
        const entry = { ...buildVe(state), interactions: [], time: Date.now() - sessionStartTime };
        adHocAnalysisEntries.set(state.veid, entry);
        maybeLogDebugEvent(entry);
    }
}
function processNonDomLoggableForDebugging(loggable, loggingState) {
    let debugElement = nonDomDebugElements.get(loggable);
    if (!debugElement) {
        debugElement = document.createElement('div');
        debugElement.classList.add('ve-debug');
        debugElement.style.background = 'black';
        debugElement.style.color = 'white';
        debugElement.style.zIndex = '100000';
        debugElement.textContent = debugString(loggingState.config);
        nonDomDebugElements.set(loggable, debugElement);
        setTimeout(() => {
            if (!loggingState.size?.width || !loggingState.size?.height) {
                debugElement?.parentElement?.removeChild(debugElement);
                nonDomDebugElements.delete(loggable);
            }
        }, 10000);
    }
    const parentDebugElement = parent instanceof HTMLElement ? parent : nonDomDebugElements.get(parent) || debugPopover;
    assertNotNullOrUndefined(parentDebugElement);
    if (!parentDebugElement.classList.contains('ve-debug')) {
        debugElement.style.position = 'absolute';
        parentDebugElement.insertBefore(debugElement, parentDebugElement.firstChild);
    }
    else {
        debugElement.style.marginLeft = '10px';
        parentDebugElement.appendChild(debugElement);
    }
}
function elementKey(config) {
    return `${VisualElements[config.ve]}${config.context ? `: ${config.context}` : ''}`;
}
export function debugString(config) {
    const components = [VisualElements[config.ve]];
    if (config.context) {
        components.push(`context: ${config.context}`);
    }
    if (config.parent) {
        components.push(`parent: ${config.parent}`);
    }
    if (config.track) {
        components.push(`track: ${Object.entries(config.track)
            .map(([key, value]) => `${key}${typeof value === 'string' ? `: ${value}` : ''}`)
            .join(', ')}`);
    }
    return components.join('; ');
}
const veDebugEventsLog = [];
function maybeLogDebugEvent(entry) {
    const format = localStorage.getItem('veDebugLoggingEnabled');
    if (!format) {
        return;
    }
    veDebugEventsLog.push(entry);
    if (format === "Intuitive" /* DebugLoggingFormat.INTUITIVE */) {
        // eslint-disable-next-line no-console
        console.info('VE Debug:', entry);
    }
}
export function setVeDebugLoggingEnabled(enabled, format = "Intuitive" /* DebugLoggingFormat.INTUITIVE */) {
    if (enabled) {
        localStorage.setItem('veDebugLoggingEnabled', format);
    }
    else {
        localStorage.removeItem('veDebugLoggingEnabled');
    }
}
function findVeDebugImpression(veid, includeAncestorChain) {
    const findImpression = (entry) => {
        if (entry.event === 'Impression' && entry.veid === veid) {
            return entry;
        }
        let i = 0;
        for (const childEntry of entry.children || []) {
            const matchingEntry = findImpression(childEntry);
            if (matchingEntry) {
                if (includeAncestorChain) {
                    const children = [];
                    children[i] = matchingEntry;
                    return { ...entry, children };
                }
                return matchingEntry;
            }
            ++i;
        }
        return undefined;
    };
    return findImpression({ children: veDebugEventsLog });
}
function fieldValuesForSql(obj, fields) {
    return [
        ...fields.strings.map(f => obj[f] ? `"${obj[f]}"` : '$NullString'),
        ...fields.numerics.map(f => obj[f] ?? 'null'),
        ...fields.booleans.map(f => obj[f] ?? '$NullBool'),
    ].join(', ');
}
function exportAdHocAnalysisLogForSql() {
    const VE_FIELDS = {
        strings: ['ve', 'context'],
        numerics: ['veid', 'width', 'height'],
        booleans: [],
    };
    const INTERACTION_FIELDS = {
        strings: ['type', 'context'],
        numerics: ['width', 'height', 'mouseButton', 'time'],
        booleans: ['width', 'height', 'mouseButton', 'time'],
    };
    const fieldsDefsForSql = (fields) => fields.map((f, i) => `$${i + 1} as ${f}`).join(', ');
    const veForSql = (e) => `$VeFields(${fieldValuesForSql(e, VE_FIELDS)}, ${e.parent ? `STRUCT(${veForSql(e.parent)})` : null})`;
    const interactionForSql = (i) => `$Interaction(${fieldValuesForSql(i, INTERACTION_FIELDS)})`;
    const entryForSql = (e) => `$Entry(${veForSql(e)}, ([${e.interactions.map(interactionForSql).join(', ')}]), ${e.time})`;
    const entries = veDebugEventsLog;
    // eslint-disable-next-line no-console
    console.log(`
DEFINE MACRO NullString CAST(null AS STRING);
DEFINE MACRO NullBool CAST(null AS BOOL);
DEFINE MACRO VeFields ${fieldsDefsForSql([
        ...VE_FIELDS.strings,
        ...VE_FIELDS.numerics,
        'parent',
    ])};
DEFINE MACRO Interaction STRUCT(${fieldsDefsForSql([
        ...INTERACTION_FIELDS.strings,
        ...INTERACTION_FIELDS.numerics,
        ...INTERACTION_FIELDS.booleans,
    ])});
DEFINE MACRO Entry STRUCT($1, $2 AS interactions, $3 AS time);

// This fake entry put first fixes nested struct fields names being lost
DEFINE MACRO FakeVeFields $VeFields("", $NullString, 0, 0, 0, $1);
DEFINE MACRO FakeVe STRUCT($FakeVeFields($1));
DEFINE MACRO FakeEntry $Entry($FakeVeFields($FakeVe($FakeVe($FakeVe($FakeVe($FakeVe($FakeVe($FakeVe(null)))))))), ([]), 0);

WITH
  processed_logs AS (
      SELECT * FROM UNNEST([
        $FakeEntry,
        ${entries.map(entryForSql).join(', \n')}
      ])
    )



SELECT * FROM processed_logs;`);
}
function getStateFlowMutations() {
    const mutations = [];
    for (const entry of veDebugEventsLog) {
        mutations.push(entry);
        const veid = entry.veid;
        for (const interaction of entry.interactions) {
            mutations.push({ ...interaction, veid });
        }
    }
    mutations.sort((e1, e2) => e1.time - e2.time);
    return mutations;
}
class StateFlowElementsByArea {
    #data = new Map();
    add(e) {
        this.#data.set(e.veid, e);
    }
    get(veid) {
        return this.#data.get(veid);
    }
    getArea(e) {
        let area = (e.width || 0) * (e.height || 0);
        const parent = e.parent ? this.#data.get(e.parent?.veid) : null;
        if (!parent) {
            return area;
        }
        const parentArea = this.getArea(parent);
        if (area > parentArea) {
            area = parentArea;
        }
        return area;
    }
    get data() {
        return [...this.#data.values()].filter(e => this.getArea(e)).sort((e1, e2) => this.getArea(e2) - this.getArea(e1));
    }
}
function updateStateFlowTree(rootNode, elements, time, interactions) {
    let node = rootNode;
    for (const element of elements.data) {
        if (!('children' in node)) {
            return;
        }
        let nextNode = node.children[node.children.length - 1];
        const nextNodeId = nextNode?.type === 'Impression' ? nextNode.veid : null;
        if (nextNodeId !== element.veid) {
            node.children.push(...interactions);
            interactions.length = 0;
            nextNode = { type: 'Impression', ve: element.ve, veid: element.veid, context: element.context, time, children: [] };
            node.children.push(nextNode);
        }
        node = nextNode;
    }
}
function normalizeNode(node) {
    if (node.type !== 'Impression') {
        return;
    }
    while (node.children.length === 1) {
        if (node.children[0].type === 'Impression') {
            node.children = node.children[0].children;
        }
    }
    for (const child of node.children) {
        normalizeNode(child);
    }
}
function buildStateFlow() {
    const mutations = getStateFlowMutations();
    const elements = new StateFlowElementsByArea();
    const rootNode = { type: 'Session', children: [] };
    let time = mutations[0].time;
    const interactions = [];
    for (const mutation of mutations) {
        if (mutation.time > time + 1000) {
            updateStateFlowTree(rootNode, elements, time, interactions);
            interactions.length = 0;
        }
        if (!('type' in mutation)) {
            elements.add(mutation);
        }
        else if (mutation.type === 'Resize') {
            const element = elements.get(mutation.veid);
            if (!element) {
                continue;
            }
            const oldArea = elements.getArea(element);
            element.width = mutation.width;
            element.height = mutation.height;
            if (elements.getArea(element) !== 0 && oldArea !== 0) {
                interactions.push(mutation);
            }
        }
        else {
            interactions.push(mutation);
        }
        time = mutation.time;
    }
    updateStateFlowTree(rootNode, elements, time, interactions);
    normalizeNode(rootNode);
    return rootNode;
}
let sessionStartTime = Date.now();
export function processStartLoggingForDebugging() {
    sessionStartTime = Date.now();
    if (localStorage.getItem('veDebugLoggingEnabled') === "Intuitive" /* DebugLoggingFormat.INTUITIVE */) {
        maybeLogDebugEvent({ event: 'SessionStart' });
    }
}
/**
 * Compares the 'actual' log entry against the 'expected'.
 * For impressions events to match, all expected impressions need to be present
 * in the actual event. Unexpected impressions in the actual event are ignored.
 * Interaction events need to match exactly.
 **/
function compareVeEvents(actual, expected) {
    if ('interaction' in expected && 'interaction' in actual) {
        const actualString = formatInteraction(actual);
        return expected.interaction === actualString;
    }
    if ('impressions' in expected && 'impressions' in actual) {
        const actualSet = new Set(actual.impressions);
        const expectedSet = new Set(expected.impressions);
        const missing = [...expectedSet].filter(k => !actualSet.has(k));
        return !Boolean(missing.length);
    }
    return false;
}
let pendingEventExpectation = null;
function formatImpressions(impressions) {
    const result = [];
    let lastImpression = '';
    for (const impression of impressions.sort()) {
        if (impression === lastImpression) {
            continue;
        }
        while (!impression.startsWith(lastImpression)) {
            lastImpression = lastImpression.substr(0, lastImpression.lastIndexOf(' > '));
        }
        result.push(' '.repeat(lastImpression.length) + impression.substr(lastImpression.length));
        lastImpression = impression;
    }
    return result.join('\n');
}
const EVENT_EXPECTATION_TIMEOUT = 5000;
function formatInteraction(e) {
    if ('interaction' in e) {
        if (e.veid !== undefined) {
            const key = veTestKeys.get(e.veid) || (e.veid ? '<UNKNOWN>' : '');
            return `${e.interaction}: ${key}`;
        }
        return e.interaction;
    }
    return '';
}
function formatVeEvents(events) {
    return events
        .map(e => {
        if ('interaction' in e) {
            return formatInteraction(e);
        }
        return formatImpressions(e.impressions);
    })
        .join('\n');
}
/**
 * Verifies that VE events contains all the expected events in given order.
 * Unexpected VE events are ignored.
 **/
export async function expectVeEvents(expectedEvents) {
    if (pendingEventExpectation) {
        throw new Error('VE events expectation already set. Cannot set another one until the previous is resolved');
    }
    const { promise, resolve: success, reject: fail } = Promise.withResolvers();
    pendingEventExpectation = { expectedEvents, success, fail, unmatchedEvents: [] };
    checkPendingEventExpectation();
    const timeout = setTimeout(() => {
        if (pendingEventExpectation?.missingEvents) {
            const allLogs = veDebugEventsLog.filter(ve => {
                if ('interaction' in ve) {
                    // Very noisy in the error and not providing context
                    return ve.interaction !== 'SettingAccess';
                }
                return true;
            });
            pendingEventExpectation.fail(new Error(`
Missing VE Events:
${formatVeEvents(pendingEventExpectation.missingEvents)}
Unmatched VE Events:
${formatVeEvents(pendingEventExpectation.unmatchedEvents)}
All events:
${JSON.stringify(allLogs, null, 2)}
`));
        }
    }, EVENT_EXPECTATION_TIMEOUT);
    return await promise.finally(() => {
        clearTimeout(timeout);
        pendingEventExpectation = null;
    });
}
let numMatchedEvents = 0;
function checkPendingEventExpectation() {
    if (!pendingEventExpectation) {
        return;
    }
    const actualEvents = [...veDebugEventsLog];
    let partialMatch = false;
    const matchedImpressions = new Set();
    pendingEventExpectation.unmatchedEvents = [];
    for (let i = 0; i < pendingEventExpectation.expectedEvents.length; ++i) {
        const expectedEvent = pendingEventExpectation.expectedEvents[i];
        while (true) {
            if (actualEvents.length <= i) {
                pendingEventExpectation.missingEvents = pendingEventExpectation.expectedEvents.slice(i);
                for (const event of pendingEventExpectation.missingEvents) {
                    if ('impressions' in event) {
                        event.impressions = event.impressions.filter(impression => !matchedImpressions.has(impression));
                    }
                }
                return;
            }
            if (!compareVeEvents(actualEvents[i], expectedEvent)) {
                if (partialMatch) {
                    const unmatched = { ...actualEvents[i] };
                    if ('impressions' in unmatched && 'impressions' in expectedEvent) {
                        unmatched.impressions = unmatched.impressions.filter(impression => {
                            const matched = expectedEvent.impressions.includes(impression);
                            if (matched) {
                                matchedImpressions.add(impression);
                            }
                            return !matched;
                        });
                    }
                    pendingEventExpectation.unmatchedEvents.push(unmatched);
                }
                actualEvents.splice(i, 1);
            }
            else {
                partialMatch = true;
                break;
            }
        }
    }
    numMatchedEvents = veDebugEventsLog.length - actualEvents.length + pendingEventExpectation.expectedEvents.length;
    pendingEventExpectation.success();
}
function getUnmatchedVeEvents() {
    console.error(numMatchedEvents);
    return formatVeEvents(veDebugEventsLog.slice(numMatchedEvents));
}
// @ts-expect-error
globalThis.setVeDebugLoggingEnabled = setVeDebugLoggingEnabled;
// @ts-expect-error
globalThis.getUnmatchedVeEvents = getUnmatchedVeEvents;
// @ts-expect-error
globalThis.veDebugEventsLog = veDebugEventsLog;
// @ts-expect-error
globalThis.findVeDebugImpression = findVeDebugImpression;
// @ts-expect-error
globalThis.exportAdHocAnalysisLogForSql = exportAdHocAnalysisLogForSql;
// @ts-expect-error
globalThis.buildStateFlow = buildStateFlow;
// @ts-expect-error
globalThis.expectVeEvents = expectVeEvents;
//# sourceMappingURL=Debugging.js.map