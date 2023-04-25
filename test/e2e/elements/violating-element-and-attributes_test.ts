// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, enableExperiment, waitFor, waitForMany} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandSelectedNodeRecursively, goToResourceAndWaitForStyleSection} from '../helpers/elements-helpers.js';

/**
 * Skipping this test for now as it only works on non-headless chrome.
 */
describe.skip('[crbug.com/1399414]: Element has violating properties', async function() {
  beforeEach(async function() {
    await enableExperiment('highlightErrorsElementsPanel');
    await goToResourceAndWaitForStyleSection('elements/form-with-issues.html');
    await expandSelectedNodeRecursively();
  });

  it('tag is highlighted on input without name nor id', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElementOrAttr = await elements[0].evaluate(node => node.textContent);
    assert.strictEqual(violatingElementOrAttr, 'input');
  });

  it('autocomplete attribute is highlighted when empty.', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElementOrAttr = await elements[1].evaluate(node => node.textContent);
    assert.strictEqual(violatingElementOrAttr, 'autocomplete');
  });

  it('navigate to issues panel on hover', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElementOrAttr = elements[0];
    await violatingElementOrAttr.hover();
    const popupParent = await waitFor('div.vbox.flex-auto.no-pointer-events');
    const popupText = await popupParent.evaluate(async (node: Element) => {
      if (!node.shadowRoot) {
        throw new Error('Node shadow root not found.');
      }
      const popup = node.shadowRoot.querySelector('div.widget.has-padding');
      if (!popup) {
        throw new Error('Popup not found.');
      }
      return popup.textContent;
    });

    assert.strictEqual(popupText, 'View issue:A form field element should have an id or name attribute');
    // Open the issue panel and look for the title;
    await click('div.widget.has-padding a');
    const highlitedIssue = await waitFor('.issue .header .title');
    const issueTitle = await highlitedIssue.evaluate(async (node: Element) => node.textContent);
    assert.strictEqual(issueTitle, 'A form field element should have an id or name attribute');
  });
});
