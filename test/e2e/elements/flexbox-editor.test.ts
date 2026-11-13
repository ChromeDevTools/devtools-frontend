// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  clickNthChildOfSelectedElementNode,
  editCSSProperty,
  focusElementsTree,
  getCSSPropertyInRule,
  waitForChildrenOfSelectedElementNode,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../helpers/style-property-editor-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

describe('Flexbox Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/flexbox-editor.html');
    await waitForContentOfSelectedElementsNode(devToolsPage, '<body>\u200B');
    await focusElementsTree(devToolsPage);
    await waitForChildrenOfSelectedElementNode(devToolsPage, ['<div id=\u200B"target">']);
    await clickNthChildOfSelectedElementNode(devToolsPage, 1);
    await waitForCSSPropertyValue(devToolsPage, '#target', 'display', 'flex', undefined);
  }

  async function assertPopoverFitsContent(devToolsPage: DevToolsPage) {
    const metrics = await devToolsPage.evaluate(() => {
      const glassPane = document.querySelector('[data-devtools-glass-pane]');
      const widget = glassPane?.shadowRoot?.querySelector<HTMLElement>('.widget.swatch-popover');
      const innerEditor = widget?.querySelector<HTMLElement>('devtools-widget.flexbox-editor');
      const container = innerEditor?.querySelector<HTMLElement>('.container');
      if (!widget || !innerEditor || !container) {
        return null;
      }
      const outerRect = widget.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        clientWidth: widget.clientWidth,
        scrollWidth: widget.scrollWidth,
        clientHeight: widget.clientHeight,
        scrollHeight: widget.scrollHeight,
        innerBoxShadow: window.getComputedStyle(innerEditor).boxShadow,
        leftInset: containerRect.left - outerRect.left,
        topInset: containerRect.top - outerRect.top,
      };
    });
    assert.isNotNull(metrics);
    assert.isAtMost(metrics.scrollWidth, metrics.clientWidth);
    assert.isAtMost(metrics.scrollHeight, metrics.clientHeight);
    assert.strictEqual(metrics.innerBoxShadow, 'none');
    assert.isAbove(metrics.leftInset, 0);
    assert.isAbove(metrics.topInset, 0);
  }

  it('can be opened and flexbox styles can be edited', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);

    await clickStylePropertyEditorButton(devToolsPage, 'Open flexbox editor', 'devtools-widget.flexbox-editor');
    await assertPopoverFitsContent(devToolsPage);

    // Clicking once sets the value.
    await clickPropertyButton(devToolsPage, '[title="Add flex-direction: column"]');
    await waitForCSSPropertyValue(devToolsPage, '#target', 'flex-direction', 'column', undefined);
    await devToolsPage.waitFor('[title="Remove flex-direction: column"]');
    await assertPopoverFitsContent(devToolsPage);

    // Selecting a wider value resizes the popover so it still fits without overflow.
    await clickPropertyButton(devToolsPage, '[title="Add justify-content: space-between"]');
    await waitForCSSPropertyValue(devToolsPage, '#target', 'justify-content', 'space-between', undefined);
    await devToolsPage.waitFor('[title="Remove justify-content: space-between"]');
    await assertPopoverFitsContent(devToolsPage);

    // Clicking again removes the value.
    await clickPropertyButton(devToolsPage, '[title="Remove justify-content: space-between"]');
    await devToolsPage.waitFor('[title="Add justify-content: space-between"]');
    await clickPropertyButton(devToolsPage, '[title="Remove flex-direction: column"]');
    // Wait for the button's title to be updated so that we know the change
    // was made.
    await devToolsPage.waitFor('[title="Add flex-direction: column"]');
    await devToolsPage.waitForFunction(async () => {
      const property = await getCSSPropertyInRule(devToolsPage, '#target', 'flex-direction', undefined);
      return property === undefined;
    });
  });

  it('can be opened for flexbox styles with !important', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);
    await editCSSProperty(devToolsPage, '#target', 'display', 'flex !important');
    await devToolsPage.drainTaskQueue();
    await waitForCSSPropertyValue(devToolsPage, '#target', 'display', 'flex !important', undefined);
    await clickStylePropertyEditorButton(devToolsPage, 'Open flexbox editor', 'devtools-widget.flexbox-editor');
  });
});
