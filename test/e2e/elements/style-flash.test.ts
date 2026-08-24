// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clickTreeElementWithPartialText,
  expandSelectedNodeRecursively,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';

describe('The Styles Pane', () => {
  it('does not double-redraw when toggling the last active style property', async ({devToolsPage, inspectedPage}) => {
    // 1. Navigate directly to a fully-formed document.
    // By providing the target styles and element at navigation time, we completely bypass
    // the dynamic DOMMutated -> ComputedStyleUpdated 500ms race condition throttle in DevTools.
    const html = `
      <!DOCTYPE html>
      <style>
        .other-rule { color: blue; }
        .toggled-rule { background-color: red; }
      </style>
      <div id="test-target" class="other-rule toggled-rule"></div>
    `;
    await inspectedPage.goTo(`data:text/html,${encodeURIComponent(html)}`);

    // 2. Wait for the styles pane to populate initially
    await devToolsPage.waitFor('.styles-selector');

    await expandSelectedNodeRecursively(devToolsPage);

    await clickTreeElementWithPartialText(devToolsPage, 'test-target');

    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'test-target');

    // 3. Retrieve the correct property checkboxes by their explicit DevTools ARIA labels
    const getCheckboxByAria = async (ariaLabel: string) => {
      await devToolsPage.waitForFunction(async () => {
        const boxes = await devToolsPage.$$(`input.enabled-button[aria-label="${ariaLabel}"]`, undefined, 'pierce');
        return boxes.length >= 1;
      });
      const matches = await devToolsPage.$$(`input.enabled-button[aria-label="${ariaLabel}"]`, undefined, 'pierce');
      return matches[0];
    };

    const toggledCheckbox = await getCheckboxByAria('background-color red');
    const controlCheckbox = await getCheckboxByAria('color blue');

    // 4. Toggle the correct .toggled-rule checkbox
    // This immediately modifies the computed style for 'background-color', firing ComputedStyleChanged.
    // We use .evaluate to bypass Puppeteer's visibility check, since the checkbox is opacity: 0 until hovered.
    await toggledCheckbox.evaluate(el => (el as HTMLElement).click());

    // Wait for the inspected page to actually reflect the disabled property.
    await inspectedPage.waitForFunction(async () => {
      return await inspectedPage.evaluate(() => {
        const el = document.getElementById('test-target');
        return el ? window.getComputedStyle(el).backgroundColor !== 'rgb(255, 0, 0)' : false;
      });
    });

    // Quick yield to give the DevTools frontend time to process the CSSModelChanged/ComputedStyleChanged events
    // and potentially trigger the double-flash if the bug was present. (Throttler uses 0ms timeout if idle)
    await new Promise(r => setTimeout(r, 50));
    // 5. Assert that toggling the property didn't cause the ENTIRE Styles panel to completely rebuild (double-flash)
    let isConnected = false;
    try {
      // We check controlCheckbox (which belongs to a different rule, .other-rule).
      // Optimal updates only rebuild the precisely edited section (where toggledCheckbox lives).
      // A double-flash bug would cause a full pane ResetCache & update, wiping controlCheckbox as well!
      isConnected = await controlCheckbox.evaluate(el => el.isConnected);
    } catch {
      // ElementHandle throws if the node is already fully detached from the DOM footprint
      isConnected = false;
    }

    assert.isTrue(
        isConnected,
        'Toggling the last active style property caused an additional unexpected redraw (double flash)',
    );
  });
});
