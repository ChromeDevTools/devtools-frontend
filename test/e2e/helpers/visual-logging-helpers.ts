// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

// Corresponds to the type in front_end/ui/visual_logging/Debugging.ts
interface TestImpressionLogEntry {
  impressions: string[];
}
type TestLogEntry = TestImpressionLogEntry|{
  interaction: string,
};

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

function veImpressionForTabHeader(panel: string) {
  return veImpression('PanelTabHeader', panel);
}

export function veImpressionForMainToolbar(options?: {
  selectedPanel?: string,
  expectClosedPanels?: string[],
  dockable?: boolean,
}) {
  const panels = [
    'elements',
    'console',
    'sources',
    'network',
  ];
  if (!options?.dockable) {
    panels.push('security', 'chrome-recorder', 'timeline', 'heap-profiler', 'resources', 'lighthouse');
  }

  if (options?.selectedPanel && !panels.includes(options?.selectedPanel)) {
    panels.push(options.selectedPanel);
  }

  const dockableItems = options?.dockable ?
      [
        veImpression('DropDown', 'more-tabs'),
        veImpression('Toggle', 'emulation.toggle-device-mode'),
        veImpression('Close'),
      ] :
      [];

  return veImpression('Toolbar', 'main', [
    ...panels.map(panel => veImpressionForTabHeader(panel)),
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
        veImpression('CSSRuleHeader', 'selector'),
        veImpression('Tree', undefined, [
          veImpression('TreeItem', 'display', [/* veImpression('Toggle'), */veImpression('Key'), veImpression('Value')]),
          veImpression('TreeItem', 'margin', [
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
      veImpression('TextField', 'filter'),
    ]),
  ]);
}

export function veImpressionForDrawerToolbar(options?: {
  selectedPanel?: string,
}) {
  const panels = options?.selectedPanel ? [options?.selectedPanel] : [];
  return veImpression('Toolbar', 'drawer', [
    veImpressionForTabHeader('console'),
    ...panels.map(panel => veImpressionForTabHeader(panel)),
    veImpression('DropDown', 'more-tabs'),
    veImpression('Close'),
  ]);
}

// Prints all VE events that haven't been matched by expectVeEvents calls
// Useful for writing new assertions.
export async function dumpVeEvents(label: string) {
  const {frontend} = getBrowserAndPages();
  const events =
      // @ts-expect-error
      await frontend.evaluate(async () => (await globalThis.getUnmatchedVeEvents()) as unknown as string[]);
  // eslint-disable-next-line no-console
  console.log(label + '\n', events);
}

// Verifies that VE events contains all the expected events in given order.
// Unexpected VE events are ignored.
export async function expectVeEvents(
    expectedEvents: TestLogEntry[], root?: string,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  collapseConsecutiveImpressions(expectedEvents);
  prependRoot(expectedEvents, root);
  // @ts-expect-error
  await devToolsPage.evaluate(async expectedEvents => await globalThis.expectVeEvents(expectedEvents), expectedEvents);
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

function prependRoot(events: TestLogEntry[], root?: string): void {
  if (!root) {
    return;
  }
  for (const event of events) {
    if ('interaction' in event) {
      if (event.interaction.endsWith(': ')) {
        event.interaction = event.interaction + root;
      } else {
        event.interaction = event.interaction.replace(': ', ': ' + root + ' > ');
      }
    }

    if ('impressions' in event) {
      event.impressions = event.impressions.map(i => root + ' > ' + i);
    }
  }
}
