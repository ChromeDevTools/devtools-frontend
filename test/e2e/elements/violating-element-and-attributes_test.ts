// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, enableExperiment, goToResource, waitFor, waitForMany} from '../../shared/helper.js';
import {expandSelectedNodeRecursively, goToResourceAndWaitForStyleSection} from '../helpers/elements-helpers.js';

/**
 * Skipping this test for now as it only works on non-headless chrome.
 */
describe.skip('[crbug.com/1399414]: Element has violating properties', function() {
  beforeEach(async function() {
    await enableExperiment('highlight-errors-elements-panel');
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
      const popup = node.shadowRoot.querySelector('div.widget');
      if (!popup) {
        throw new Error('Popup not found.');
      }
      return popup.textContent;
    });

    assert.strictEqual(popupText, 'View issue:A form field element should have an id or name attribute');
    // Open the issue panel and look for the title;
    await click('div.widget a');
    const highlitedIssue = await waitFor('.issue .header .title');
    const issueTitle = await highlitedIssue.evaluate(async (node: Element) => node.textContent);
    assert.strictEqual(issueTitle, 'A form field element should have an id or name attribute');
  });
});

describe('The elements panel', function() {
  beforeEach(async function() {
    await enableExperiment('highlight-errors-elements-panel');
    await goToResource('elements/select-element-with-issues.html');
    await expandSelectedNodeRecursively();
  });

  it('displays squiggly lines on elements with issue', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElement = await elements[0].evaluate(node => node.textContent);
    assert.strictEqual(violatingElement, 'button');
  });

  it('displays multiple issues when hoverring over squiggly line', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElement = elements[1];
    await violatingElement.hover();
    const popupParent = await waitFor('div.vbox.flex-auto.no-pointer-events');
    const popupText = await popupParent.evaluate(async (node: Element) => {
      if (!node.shadowRoot) {
        throw new Error('Node shadow root not found.');
      }
      const popup = node.shadowRoot.querySelector('div.widget');
      if (!popup) {
        throw new Error('Popup not found.');
      }
      const spans = popup.querySelectorAll('span');
      return Array.from(spans).map(span => span.textContent);
    });
    assert.strictEqual(popupText[0], 'Element with invalid attributes within a <select> element');
    assert.strictEqual(popupText[1], 'No label associated with a form field');
  });

  it('navigates to issues panel when hovering over problematic element', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElement = elements[0];
    await violatingElement.hover();
    const popupParent = await waitFor('div.vbox.flex-auto.no-pointer-events');
    const popupText = await popupParent.evaluate(async (node: Element) => {
      if (!node.shadowRoot) {
        throw new Error('Node shadow root not found.');
      }
      const popup = node.shadowRoot.querySelector('div.widget');
      if (!popup) {
        throw new Error('Popup not found.');
      }
      const span = popup.querySelector('span');
      if (!span) {
        throw new Error('Span not found.');
      }
      return span.textContent;
    });

    assert.strictEqual(popupText, 'Interactive element inside of a <legend> element');
    await click('div.widget x-link');
    const highlitedIssue = await waitFor('.issue .header .title');
    const issueTitle = await highlitedIssue.evaluate(async (node: Element) => node.textContent);
    assert.strictEqual(issueTitle, 'Interactive element inside of a <legend> element');
  });
});
