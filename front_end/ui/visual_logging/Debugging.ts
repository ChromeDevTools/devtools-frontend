// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../core/platform/platform.js';

import type {Loggable} from './Loggable.js';
import {type LoggingConfig, VisualElements} from './LoggingConfig.js';
import {getLoggingState, type LoggingState} from './LoggingState.js';

let veDebuggingEnabled = false;
let debugPopover: HTMLElement|null = null;
const nonDomDebugElements = new WeakMap<Loggable, HTMLElement>();

function setVeDebuggingEnabled(enabled: boolean): void {
  veDebuggingEnabled = enabled;
  if (enabled && !debugPopover) {
    debugPopover = document.createElement('div');
    debugPopover.classList.add('ve-debug');
    debugPopover.style.position = 'absolute';
    debugPopover.style.bottom = '100px';
    debugPopover.style.left = '100px';
    debugPopover.style.background = 'black';
    debugPopover.style.color = 'white';
    debugPopover.style.zIndex = '100000';
    document.body.appendChild(debugPopover);
  }
}

// @ts-ignore
globalThis.setVeDebuggingEnabled = setVeDebuggingEnabled;

export function processForDebugging(loggable: Loggable): void {
  const loggingState = getLoggingState(loggable);
  if (!veDebuggingEnabled || !loggingState || loggingState.processedForDebugging) {
    return;
  }
  if (loggable instanceof Element) {
    processElementForDebugging(loggable, loggingState);
  } else {
    processNonDomLoggableForDebugging(loggable, loggingState);
  }
}

function showDebugPopover(content: string): void {
  if (!debugPopover) {
    return;
  }
  debugPopover.style.display = 'block';
  debugPopover.innerHTML = content;
}

function processElementForDebugging(element: Element, loggingState: LoggingState): void {
  if (element.tagName === 'OPTION') {
    if (loggingState.parent?.selectOpen && debugPopover) {
      debugPopover.innerHTML += '<br>' + debugString(loggingState.config);
      loggingState.processedForDebugging = true;
    }
  } else {
    (element as HTMLElement).style.outline = 'solid 1px red';
    element.addEventListener('mouseenter', () => {
      assertNotNullOrUndefined(debugPopover);
      const pathToRoot = [loggingState];
      let ancestor = loggingState.parent;
      while (ancestor) {
        pathToRoot.push(ancestor);
        ancestor = ancestor.parent;
      }
      showDebugPopover(pathToRoot.map(s => debugString(s.config)).join('<br>'));
    }, {capture: true});
    element.addEventListener('mouseleave', () => {
      assertNotNullOrUndefined(debugPopover);
      debugPopover.style.display = 'none';
    }, {capture: true});
    loggingState.processedForDebugging = true;
  }
}

type EventType = 'Click'|'Drag'|'Hover'|'Change'|'KeyDown'|'Resize';
export function processEventForDebugging(
    event: EventType, state: LoggingState|null, extraInfo?: EventAttributes): void {
  const format = localStorage.getItem('veDebugLoggingEnabled');
  if (!format) {
    return;
  }

  switch (format) {
    case DebugLoggingFormat.INTUITIVE:
      processEventForIntuitiveDebugging(event, state, extraInfo);
      break;
    case DebugLoggingFormat.TEST:
      processEventForTestDebugging(event, state, extraInfo);
      break;
    case DebugLoggingFormat.AD_HOC_ANALYSIS:
      processEventForAdHocAnalysisDebugging(event, state, extraInfo);
      break;
  }
}

export function processEventForIntuitiveDebugging(
    event: EventType, state: LoggingState|null, extraInfo?: EventAttributes): void {
  const entry: IntuitiveLogEntry = {
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

export function processEventForTestDebugging(
    event: EventType, state: LoggingState|null, _extraInfo?: EventAttributes): void {
  lastImpressionLogEntry = null;
  maybeLogDebugEvent(
      {interaction: `${event}: ${veTestKeys.get(state?.veid || 0) || (state?.veid ? '<UNKNOWN>' : '')}`});
  checkPendingEventExpectation();
}

export function processEventForAdHocAnalysisDebugging(
    event: EventType, state: LoggingState|null, extraInfo?: EventAttributes): void {
  const ve = state ? adHocAnalysisEntries.get(state.veid) : null;
  if (ve) {
    const interaction: AdHocAnalysisInteraction = {time: Date.now() - sessionStartTime, type: event, ...extraInfo};
    deleteUndefinedFields(interaction);
    ve.interactions.push(interaction);
  }
}

function deleteUndefinedFields<T>(entry: T): void {
  for (const stringKey in entry) {
    const key = stringKey as keyof T;
    if (typeof entry[key] === 'undefined') {
      delete entry[key];
    }
  }
}

export type EventAttributes = {
  context?: string,
  width?: number,
  height?: number,
  mouseButton?: number,
  doubleClick?: boolean,
};

type VisualElementAttributes = {
  ve: string,
  veid: number,
  context?: string,
  width?: number,
  height?: number,
};

type IntuitiveLogEntry = {
  event?: EventType|'Impression'|'SessionStart',
  children?: IntuitiveLogEntry[],
  parent?: number,
  time?: number,
}&Partial<VisualElementAttributes>;

type AdHocAnalysisVisualElement = VisualElementAttributes&{
  parent?: AdHocAnalysisVisualElement,
};

type AdHocAnalysisInteraction = {
  type: EventType,
  time: number,
}&EventAttributes;

type AdHocAnalysisLogEntry = AdHocAnalysisVisualElement&{
  time: number,
  interactions: AdHocAnalysisInteraction[],
};

type TestLogEntry = {
  impressions: string[],
}|{
  interaction: string,
};

export function processImpressionsForDebugging(states: LoggingState[]): void {
  const format = localStorage.getItem('veDebugLoggingEnabled');
  switch (format) {
    case DebugLoggingFormat.INTUITIVE:
      processImpressionsForIntuitiveDebugLog(states);
      break;
    case DebugLoggingFormat.TEST:
      processImpressionsForTestDebugLog(states);
      break;
    case DebugLoggingFormat.AD_HOC_ANALYSIS:
      processImpressionsForAdHocAnalysisDebugLog(states);
      break;
    default:
  }
}

function processImpressionsForIntuitiveDebugLog(states: LoggingState[]): void {
  const impressions = new Map<number, IntuitiveLogEntry>();
  for (const state of states) {
    const entry: IntuitiveLogEntry = {
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
    } else {
      const parent = impressions.get(state.parent?.veid) as IntuitiveLogEntry;
      parent.children = parent.children || [];
      parent.children.push(entry);
    }
  }

  const entries = [...impressions.values()].filter(i => 'parent' in i);
  if (entries.length === 1) {
    entries[0].time = Date.now() - sessionStartTime;
    maybeLogDebugEvent(entries[0]);
  } else {
    maybeLogDebugEvent({event: 'Impression', children: entries, time: Date.now() - sessionStartTime});
  }
}

const veTestKeys = new Map<number, string>();
let lastImpressionLogEntry: {impressions: string[]}|null = null;

function processImpressionsForTestDebugLog(states: LoggingState[]): void {
  if (!lastImpressionLogEntry) {
    lastImpressionLogEntry = {impressions: []};
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

const adHocAnalysisEntries = new Map<number, AdHocAnalysisLogEntry>();

function processImpressionsForAdHocAnalysisDebugLog(states: LoggingState[]): void {
  for (const state of states) {
    const buildVe = (state: LoggingState): AdHocAnalysisVisualElement => {
      const ve: AdHocAnalysisVisualElement = {
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
    const entry = {...buildVe(state), interactions: [], time: Date.now() - sessionStartTime};
    adHocAnalysisEntries.set(state.veid, entry);
    maybeLogDebugEvent(entry);
  }
}

function processNonDomLoggableForDebugging(loggable: Loggable, loggingState: LoggingState): void {
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
  const parentDebugElement =
      parent instanceof HTMLElement ? parent : nonDomDebugElements.get(parent as Loggable) || debugPopover;
  assertNotNullOrUndefined(parentDebugElement);
  if (!parentDebugElement.classList.contains('ve-debug')) {
    debugElement.style.position = 'absolute';
    parentDebugElement.insertBefore(debugElement, parentDebugElement.firstChild);
  } else {
    debugElement.style.marginLeft = '10px';
    parentDebugElement.appendChild(debugElement);
  }
}

export function debugString(config: LoggingConfig): string {
  const components = [VisualElements[config.ve]];
  if (config.context) {
    components.push(`context: ${config.context}`);
  }
  if (config.parent) {
    components.push(`parent: ${config.parent}`);
  }
  if (config.track) {
    components.push(`track: ${
        Object.entries(config.track)
            .map(([key, value]) => `${key}${typeof value === 'string' ? `: ${value}` : ''}`)
            .join(', ')}`);
  }
  return components.join('; ');
}

const veDebugEventsLog: (IntuitiveLogEntry|AdHocAnalysisLogEntry|TestLogEntry)[] = [];

function maybeLogDebugEvent(entry: IntuitiveLogEntry|AdHocAnalysisLogEntry|TestLogEntry): void {
  const format = localStorage.getItem('veDebugLoggingEnabled');
  if (!format) {
    return;
  }
  veDebugEventsLog.push(entry);
  if (format === DebugLoggingFormat.INTUITIVE) {
    // eslint-disable-next-line no-console
    console.info('VE Debug:', entry);
  }
}

export const enum DebugLoggingFormat {
  INTUITIVE = 'Intuitive',
  TEST = 'Test',
  AD_HOC_ANALYSIS = 'AdHocAnalysis',
}

export function setVeDebugLoggingEnabled(enabled: boolean, format = DebugLoggingFormat.INTUITIVE): void {
  if (enabled) {
    localStorage.setItem('veDebugLoggingEnabled', format);
  } else {
    localStorage.removeItem('veDebugLoggingEnabled');
  }
}

function findVeDebugImpression(veid: number, includeAncestorChain?: boolean): IntuitiveLogEntry|undefined {
  const findImpression = (entry: IntuitiveLogEntry): IntuitiveLogEntry|undefined => {
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
          return {...entry, children};
        }
        return matchingEntry;
      }
      ++i;
    }
    return undefined;
  };
  return findImpression({children: veDebugEventsLog as IntuitiveLogEntry[]});
}

function fieldValuesForSql<T>(
    obj: T,
    fields: {strings: readonly(keyof T)[], numerics: readonly(keyof T)[], booleans: readonly(keyof T)[]}): string {
  return [
    ...fields.strings.map(f => obj[f] ? `"${obj[f]}"` : '$NullString'),
    ...fields.numerics.map(f => obj[f] ?? 'null'),
    ...fields.booleans.map(f => obj[f] ?? '$NullBool'),
  ].join(', ');
}

function exportAdHocAnalysisLogForSql(): void {
  const VE_FIELDS = {
    strings: ['ve', 'context'] as const,
    numerics: ['veid', 'width', 'height'] as const,
    booleans: [] as const,
  };
  const INTERACTION_FIELDS = {
    strings: ['type', 'context'] as const,
    numerics: ['width', 'height', 'mouseButton', 'time'] as const,
    booleans: ['width', 'height', 'mouseButton', 'time'] as const,
  };

  const fieldsDefsForSql = (fields: string[]): string => fields.map((f, i) => `$${i + 1} as ${f}`).join(', ');

  const veForSql = (e: AdHocAnalysisVisualElement): string =>
      `$VeFields(${fieldValuesForSql(e, VE_FIELDS)}, ${e.parent ? `STRUCT(${veForSql(e.parent)})` : null})`;

  const interactionForSql = (i: AdHocAnalysisInteraction): string =>
      `$Interaction(${fieldValuesForSql(i, INTERACTION_FIELDS)})`;

  const entryForSql = (e: AdHocAnalysisLogEntry): string =>
      `$Entry(${veForSql(e)}, ([${e.interactions.map(interactionForSql).join(', ')}]), ${e.time})`;

  const entries = veDebugEventsLog as AdHocAnalysisLogEntry[];

  // eslint-disable-next-line no-console
  console.log(`
DEFINE MACRO NullString CAST(null AS STRING);
DEFINE MACRO NullBool CAST(null AS BOOL);
DEFINE MACRO VeFields ${fieldsDefsForSql([
    ...VE_FIELDS.strings,
    ...VE_FIELDS.numerics,
    'parent',
  ])};
DEFINE MACRO Interaction STRUCT(${
      fieldsDefsForSql([
        ...INTERACTION_FIELDS.strings,
        ...INTERACTION_FIELDS.numerics,
        ...INTERACTION_FIELDS.booleans,
      ])});
DEFINE MACRO Entry STRUCT($1, $2 AS interactions, $3 AS time);

// This fake entry put first fixes nested struct fiels names being lost
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

type StateFlowNode = {
  type: 'Session',
  children: StateFlowNode[],
}|({type: 'Impression', children: StateFlowNode[], time: number}&AdHocAnalysisVisualElement)|AdHocAnalysisInteraction;

type StateFlowMutation = (AdHocAnalysisLogEntry|(AdHocAnalysisInteraction&{veid: number}));

function getStateFlowMutations(): StateFlowMutation[] {
  const mutations: StateFlowMutation[] = [];
  for (const entry of (veDebugEventsLog as AdHocAnalysisLogEntry[])) {
    mutations.push(entry);
    const veid = entry.veid;
    for (const interaction of entry.interactions) {
      mutations.push({...interaction, veid});
    }
  }
  mutations.sort((e1, e2) => e1.time - e2.time);
  return mutations;
}

class StateFlowElementsByArea {
  #data = new Map<number, AdHocAnalysisVisualElement>();

  add(e: AdHocAnalysisVisualElement): void {
    this.#data.set(e.veid, e);
  }

  get(veid: number): AdHocAnalysisVisualElement|undefined {
    return this.#data.get(veid);
  }

  getArea(e: AdHocAnalysisVisualElement): number {
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

  get data(): readonly AdHocAnalysisVisualElement[] {
    return [...this.#data.values()].filter(e => this.getArea(e)).sort((e1, e2) => this.getArea(e2) - this.getArea(e1));
  }
}

function updateStateFlowTree(
    rootNode: StateFlowNode, elements: StateFlowElementsByArea, time: number,
    interactions: AdHocAnalysisInteraction[]): void {
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
      nextNode = {type: 'Impression', ve: element.ve, veid: element.veid, context: element.context, time, children: []};
      node.children.push(nextNode);
    }
    node = nextNode;
  }
}

function normalizeNode(node: StateFlowNode): void {
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

function buildStateFlow(): StateFlowNode {
  const mutations = getStateFlowMutations();
  const elements = new StateFlowElementsByArea();
  const rootNode: StateFlowNode = {type: 'Session', children: []};

  let time = mutations[0].time;
  const interactions: AdHocAnalysisInteraction[] = [];
  for (const mutation of mutations) {
    if (mutation.time > time + 1000) {
      updateStateFlowTree(rootNode, elements, time, interactions);
      interactions.length = 0;
    }
    if (!('type' in mutation)) {
      elements.add(mutation);
    } else if (mutation.type === 'Resize') {
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
    } else {
      interactions.push(mutation);
    }
    time = mutation.time;
  }
  updateStateFlowTree(rootNode, elements, time, interactions);

  normalizeNode(rootNode);
  return rootNode;
}

let sessionStartTime: number = Date.now();

export function processStartLoggingForDebugging(): void {
  sessionStartTime = Date.now();
  if (localStorage.getItem('veDebugLoggingEnabled') === DebugLoggingFormat.INTUITIVE) {
    maybeLogDebugEvent({event: 'SessionStart'});
  }
}

// Compares the 'actual' log entry against the 'expected'.
// For impressions events to match, all expected impressions need to be present
// in the actual event. Unexected impressions in the actual event are ignored.
// Interaction events need to match exactly.
function compareVeEvents(actual: TestLogEntry, expected: TestLogEntry): boolean {
  if ('interaction' in expected && 'interaction' in actual) {
    return expected.interaction === actual.interaction;
  }
  if ('impressions' in expected && 'impressions' in actual) {
    const actualSet = new Set(actual.impressions);
    const expectedSet = new Set(expected.impressions);
    const missing = [...expectedSet].filter(k => !actualSet.has(k));

    return !Boolean(missing.length);
  }
  return false;
}

let pendingEventExpectation:
    {expectedEvents: TestLogEntry[], missingEvents?: TestLogEntry[], success: () => void, fail: (arg0: Error) => void}|
    null = null;

function formatImpressions(impressions: string[]): string {
  const result: string[] = [];
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

// Verifies that VE events contains all the expected events in given order.
// Unexpected VE events are ignored.
export async function expectVeEvents(expectedEvents: TestLogEntry[]): Promise<void> {
  if (pendingEventExpectation) {
    throw new Error('VE events expectation already set. Cannot set another one until the previous is resolved');
  }
  const {promise, resolve: success, reject: fail} = Promise.withResolvers<void>();
  pendingEventExpectation = {expectedEvents, success, fail};
  checkPendingEventExpectation();
  setTimeout(() => {
    if (pendingEventExpectation?.missingEvents) {
      pendingEventExpectation.fail(new Error(
          'Missing VE Events: ' +
          pendingEventExpectation.missingEvents
              .map(e => 'interaction' in e ? e.interaction : formatImpressions(e.impressions))
              .join('\n')));
    }
  }, EVENT_EXPECTATION_TIMEOUT);
  return promise;
}

let numMatchedEvents = 0;

function checkPendingEventExpectation(): void {
  if (!pendingEventExpectation) {
    return;
  }
  const actualEvents = [...veDebugEventsLog] as TestLogEntry[];
  for (let i = 0; i < pendingEventExpectation.expectedEvents.length; ++i) {
    const expectedEvent = pendingEventExpectation.expectedEvents[i];
    while (true) {
      if (actualEvents.length <= i) {
        pendingEventExpectation.missingEvents = pendingEventExpectation.expectedEvents.slice(i);
        return;
      }
      if (!compareVeEvents(actualEvents[i], expectedEvent)) {
        actualEvents.splice(i, 1);
      } else {
        break;
      }
    }
  }
  numMatchedEvents = veDebugEventsLog.length - actualEvents.length + pendingEventExpectation.expectedEvents.length;
  pendingEventExpectation.success();
  pendingEventExpectation = null;
}

function getUnmatchedVeEvents(): string {
  console.error(numMatchedEvents);
  return (veDebugEventsLog.slice(numMatchedEvents) as TestLogEntry[])
      .map(e => 'interaction' in e ? e.interaction : formatImpressions(e.impressions))
      .join('\n');
}

// @ts-ignore
globalThis.setVeDebugLoggingEnabled = setVeDebugLoggingEnabled;
// @ts-ignore
globalThis.getUnmatchedVeEvents = getUnmatchedVeEvents;
// @ts-ignore
globalThis.veDebugEventsLog = veDebugEventsLog;
// @ts-ignore
globalThis.findVeDebugImpression = findVeDebugImpression;
// @ts-ignore
globalThis.exportAdHocAnalysisLogForSql = exportAdHocAnalysisLogForSql;
// @ts-ignore
globalThis.buildStateFlow = buildStateFlow;
// @ts-ignore
globalThis.expectVeEvents = expectVeEvents;
