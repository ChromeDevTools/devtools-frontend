// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {renderCoordinatorQueueEmpty} from '../../shared/helper.js';

// Corresponds to the type in front_end/ui/visual_logging/Debugging.ts
type TestImpressionLogEntry = {
  impressions: string[],
};
type TestLogEntry = TestImpressionLogEntry|{
  interaction: string,
};

function formatImpressions(impressions: string[]) {
  const result: string[] = [];
  let lastImpression = '';
  for (const impression of impressions.sort()) {
    while (!impression.startsWith(lastImpression)) {
      lastImpression = lastImpression.substr(0, lastImpression.lastIndexOf(' > '));
    }
    result.push(' '.repeat(lastImpression.length) + impression.substr(lastImpression.length));
    lastImpression = impression;
  }
  return result.join('\n');
}

// Compares the 'actual' log entry against the 'expected'. The difference of 0
// indicates that events match. Positive values, maximum 1.0, means no match,
// higher values represent larger difference.
// For impressions events to match, all expected impressions need to be present
// in the actual event. Unexected impressions in the actual event are ignored.
// Interaction events need to match exactly.
function compareVeEvents(actual: TestLogEntry, expected: TestLogEntry): {difference: number, description?: string} {
  if ('interaction' in expected && 'interaction' in actual) {
    if (expected.interaction !== actual.interaction) {
      return {
        difference: editDistance(expected.interaction, actual.interaction) /
            Math.max(expected.interaction.length, actual.interaction.length),
        description: `Missing VE interaction: ${expected.interaction}, got: ${actual.interaction}`,
      };
    }
    return {difference: 0};
  }
  if ('impressions' in expected && 'impressions' in actual) {
    const actualSet = new Set(actual.impressions);
    const expectedSet = new Set(expected.impressions);
    const missing = [...expectedSet].filter(k => !actualSet.has(k));

    if (missing.length) {
      return {
        difference: missing.length / expected.impressions.length,
        description: 'Missing VE impressions:\n' + formatImpressions(missing),
      };
    }
    return {difference: 0};
  }
  return {
    difference: 1,
    description: 'interaction' in expected ? 'Missing VE interaction:\n' + expected.interaction :
                                             'Missing VE impressions:\n' + formatImpressions(expected.impressions),
  };
}

export function veImpressionsUnder(key: string, children: TestImpressionLogEntry[]) {
  const result: TestImpressionLogEntry = {impressions: []};
  for (const child of children || []) {
    for (const impression of child.impressions) {
      result.impressions.push(key + ' > ' + impression);
    }
  }
  return result;
}

export function veClick(ve: string): TestLogEntry {
  return {interaction: `Click: ${ve}`};
}

export function veChange(ve: string): TestLogEntry {
  return {interaction: `Change: ${ve}`};
}

export function veKeyDown(ve: string): TestLogEntry {
  return {interaction: `KeyDown: ${ve}`};
}

export function veResize(ve: string): TestLogEntry {
  return {interaction: `Resize: ${ve}`};
}

export function veImpression(ve: string, context?: string, children?: TestImpressionLogEntry[]) {
  let key = ve;
  if (context) {
    key += ': ' + context;
  }
  return {impressions: [key, ...veImpressionsUnder(key, children || []).impressions]};
}

function veImpressionForTabHeader(panel: string, options?: {closable: boolean}) {
  if (options?.closable) {
    return veImpression('PanelTabHeader', panel, [veImpression('Close')]);
  }
  return veImpression('PanelTabHeader', panel);
}

export function veImpressionForMainToolbar(options?: {
  selectedPanel?: string,
  expectClosedPanels?: string[],
  dockable?: boolean,
}) {
  const regularPanels = ['elements', 'console', 'sources', 'network'];
  if (!options?.dockable) {
    regularPanels.push('timeline', 'heap-profiler', 'resources', 'lighthouse');
  }

  const closablePanels =
      options?.dockable ? [] : ['security', 'chrome-recorder'].filter(p => !options?.expectClosedPanels?.includes(p));
  if (options?.selectedPanel && !regularPanels.includes(options?.selectedPanel)) {
    closablePanels.push(options.selectedPanel);
  }

  const dockableItems = options?.dockable ?
      [
        veImpression('DropDown', 'more-tabs'),
        veImpression('Toggle', 'emulation.toggle-device-mode'),
        veImpression('Close'),
      ] :
      [];

  return veImpression('Toolbar', 'main', [
    ...regularPanels.map(panel => veImpressionForTabHeader(panel)),
    ...closablePanels.map(panel => veImpressionForTabHeader(panel, {closable: true})),
    veImpression('Toggle', 'elements.toggle-element-search'),
    veImpression('Action', 'settings.show'),
    veImpression('DropDown', 'main-menu'),
    ...dockableItems,
  ]);
}

export function veImpressionForElementsPanel(options?: {dockable?: boolean}) {
  return veImpression('Panel', 'elements', [
    veImpression('Toolbar', 'sidebar', [
      veImpressionForTabHeader('styles'),
      veImpressionForTabHeader('computed'),
      veImpressionForTabHeader('elements.layout'),
      ...(options?.dockable ? ['elements.event-listeners', 'elements.dom-breakpoints', 'elements.dom-properties'] : []).map(panel => veImpressionForTabHeader(panel)),
    ]),
    veImpression('ElementsBreadcrumbs', undefined, [veImpression('Item'), veImpression('Item')]),
    veImpression('Tree', 'elements', [
      veImpression('TreeItem'),
      veImpression('TreeItem', undefined, [veImpression('Value', 'tag-name'), veImpression('Expand')]),
      veImpression('TreeItem', undefined, [veImpression('Value', 'tag-name')]),
      veImpression('TreeItem', undefined, [veImpression('Value', 'tag-name')]),
      veImpression('TreeItem'),
    ]),
    veImpression('Pane', 'styles', [
      veImpression('Section', 'style-properties', [veImpression('CSSRuleHeader', 'selector')]),
      veImpression('Section', 'style-properties', [
        veImpression('Action', 'elements.new-style-rule'),
        veImpression('CSSRuleHeader', 'selector'),
        veImpression('Tree', undefined, [
          veImpression('TreeItem', 'display', [veImpression('Toggle'), veImpression('Key'), veImpression('Value')]),
          veImpression('TreeItem', 'margin', [
            veImpression('Toggle'),
            veImpression('Key'),
            veImpression('Expand'),
            veImpression('Value'),
            veImpression('Expand'),
          ]),
        ]),
      ]),
      veImpression('ToggleSubpane', 'element-states'),
      veImpression('ToggleSubpane', 'elements-classes'),
      veImpression('Action', 'elements.new-style-rule'),
      veImpression('DropDown', 'rendering-emulations'),
      veImpression('ToggleSubpane', 'computed-styles'),
      veImpression('TextField'),
    ]),
  ]);
}

export function veImpressionForDrawerToolbar(options?: {
  selectedPanel?: string,
}) {
  const closeablePanels = options?.selectedPanel ? [options?.selectedPanel] : [];
  return veImpression('Toolbar', 'drawer', [
    veImpressionForTabHeader('console'),
    ...closeablePanels.map(panel => veImpressionForTabHeader(panel, {closable: true})),
    veImpression('DropDown', 'more-tabs'),
    veImpression('Close'),
  ]);
}

// Verifies that VE events contains all the expected events in given order.
// Unexpected VE events are ignored.
export async function expectVeEvents(expectedEvents: TestLogEntry[]) {
  collapseConsecutiveImpressions(expectedEvents);

  const {frontend} = getBrowserAndPages();
  await Promise.race([renderCoordinatorQueueEmpty(), new Promise(resolve => setTimeout(resolve, 100))]);
  const actualEvents =
      // @ts-ignore
      await frontend.evaluate(async () => (await globalThis.getVeDebugEventsLog()) as unknown as TestLogEntry[]);
  const unmatchedEvents: TestLogEntry[] = [];
  for (let i = 0; i < expectedEvents.length; ++i) {
    let bestError: {difference: number, description?: string}|null = null;
    const expectedEvent = expectedEvents[i];
    while (true) {
      if (actualEvents.length <= i) {
        bestError ||= {
          difference: 1,
          description: 'interaction' in expectedEvent ?
              'Missing VE interaction:\n' + expectedEvent.interaction :
              'Missing VE impressions:\n' + formatImpressions(expectedEvent.impressions),
        };
        assert.fail(bestError.description);
      }
      const error = compareVeEvents(actualEvents[i], expectedEvent);
      if (error.difference) {
        unmatchedEvents.push(actualEvents[i]);
        actualEvents.splice(i, 1);
        if (error.difference <= (bestError?.difference || 1)) {
          bestError = error;
        }
      } else {
        break;
      }
    }
  }
  await frontend.evaluate(unmatchedEvents => {
    // @ts-ignore
    globalThis.veDebugEventsLog = unmatchedEvents;
  }, unmatchedEvents);
}

function collapseConsecutiveImpressions(events: TestLogEntry[]) {
  let group: {impressions: string[]}|null = null;
  for (let i = 0; i < events.length; ++i) {
    const event = events[i];
    if ('interaction' in event) {
      group = null;
    }

    if ('impressions' in event) {
      if (!group) {
        group = event;
      } else {
        group.impressions.push(...event.impressions);
        events.splice(i, 1);
        --i;
      }
    }
  }
}

// Computes the Levenshtein edit distance between two strings.
function editDistance(a: string, b: string) {
  const v0: number[] = [];
  const v1: number[] = [];
  if (a === b) {
    return 0;
  }
  if (!a.length || !b.length) {
    return Math.max(a.length, b.length);
  }
  for (let i = 0; i < b.length + 1; i++) {
    v0[i] = i;
  }
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = Number(a[i] !== b[j]);
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j < v0.length; j++) {
      v0[j] = v1[j];
    }
  }
  return v1[b.length];
}

// Prints all VE events that haven't been matched by expectVeEvents calls
// Useful for writing new assertions.
export async function dumpVeEvents(label: string) {
  const {frontend} = getBrowserAndPages();
  await renderCoordinatorQueueEmpty();
  const actualEvents =
      // @ts-ignore
      await frontend.evaluate(async () => (await globalThis.getVeDebugEventsLog()) as unknown as TestLogEntry[]);
  // eslint-disable-next-line no-console
  console.log(
      label, actualEvents.map(e => 'interaction' in e ? e.interaction : formatImpressions(e.impressions)).join('\n'));
}
