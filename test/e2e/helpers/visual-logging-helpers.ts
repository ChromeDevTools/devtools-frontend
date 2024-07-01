// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';

// Corresponds to the type in front_end/ui/visual_logging/Debugging.ts
type TestLogEntry = {
  impressions: string[],
}|{
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

function compareVeImpressions(actual: string[], expected: string[]): {match: boolean, description?: string} {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter(k => !actualSet.has(k));

  if (missing.length) {
    return {
      match: false,
      description:
          'Missing VE events:\n' + formatImpressions(missing) + '\nActual impressions:\n' + formatImpressions(actual),
    };
  }
  return {match: true};
}

export function veImpression(ve: string, context?: string, children?: string[][]) {
  let key = ve;
  if (context) {
    key += ': ' + context;
  }
  const result = [key];
  for (const child of children || []) {
    for (const impression of child) {
      result.push(key + ' > ' + impression);
    }
  }
  return result;
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

export async function expectVeImpressions(expectedImpressions: string[]) {
  const {frontend} = getBrowserAndPages();
  const actualEvents =
      // @ts-ignore
      await frontend.evaluate(async () => (await globalThis.getVeDebugEventsLog()) as unknown as TestLogEntry[]);
  const actualImpressionEvent = actualEvents.findLast(event => 'impressions' in event);
  const actualImpressions =
      actualImpressionEvent && 'impressions' in actualImpressionEvent ? actualImpressionEvent.impressions : null;
  if (!actualImpressions) {
    assert.fail('Missing VE impressions:\n' + formatImpressions(expectedImpressions));
  }

  const {match, description} = compareVeImpressions(actualImpressions, expectedImpressions);
  assert.isTrue(
      match,
      description + '\nAll VE Events:\n' +
          actualEvents.map(e => 'impressions' in e ? formatImpressions(e.impressions) : e.interaction).join('\n\n'));
}
