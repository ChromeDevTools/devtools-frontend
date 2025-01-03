// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';

// Corresponds to the type in front_end/ui/visual_logging/Debugging.ts
type TestImpressionLogEntry = {
  impressions: string[],
};
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
      veImpression('TextField', 'filter'),
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

// Prints all VE events that haven't been matched by expectVeEvents calls
// Useful for writing new assertions.
export async function dumpVeEvents(label: string) {
  const {frontend} = getBrowserAndPages();
  const events =
      // @ts-ignore
      await frontend.evaluate(async () => (await globalThis.getUnmatchedVeEvents()) as unknown as string[]);
  // eslint-disable-next-line no-console
  console.log(label + '\n', events);
}

// Verifies that VE events contains all the expected events in given order.
// Unexpected VE events are ignored.
export async function expectVeEvents(expectedEvents: TestLogEntry[], root?: string) {
  collapseConsecutiveImpressions(expectedEvents);
  prependRoot(expectedEvents, root);

  const {frontend} = getBrowserAndPages();
  // @ts-ignore
  await frontend.evaluate(async expectedEvents => await globalThis.expectVeEvents(expectedEvents), expectedEvents);
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
