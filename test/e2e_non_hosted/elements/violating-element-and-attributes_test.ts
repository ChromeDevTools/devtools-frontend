// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expandSelectedNodeRecursively, goToResourceAndWaitForStyleSection} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Element has violating properties', function() {
  setup({enabledDevToolsExperiments: ['highlight-errors-elements-panel']});

  async function expandFormWithIssues(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await goToResourceAndWaitForStyleSection('elements/form-with-issues.html', devToolsPage, inspectedPage);
    await expandSelectedNodeRecursively(devToolsPage);
  }

  it('tag is highlighted on input without name nor id', async ({devToolsPage, inspectedPage}) => {
    await expandFormWithIssues(devToolsPage, inspectedPage);
    const elements = await devToolsPage.waitForMany('.violating-element', 2);
    const violatingElementOrAttr = await elements[0].evaluate(node => node.textContent);
    assert.strictEqual(violatingElementOrAttr, 'input');
  });

  it('autocomplete attribute is highlighted when empty.', async ({devToolsPage, inspectedPage}) => {
    await expandFormWithIssues(devToolsPage, inspectedPage);
    const elements = await devToolsPage.waitForMany('.violating-element', 2);
    const violatingElementOrAttr = await elements[1].evaluate(node => node.textContent);
    assert.strictEqual(violatingElementOrAttr, 'autocomplete');
  });

  it('navigate to issues panel on hover', async ({devToolsPage, inspectedPage}) => {
    await expandFormWithIssues(devToolsPage, inspectedPage);
    const elements = await devToolsPage.waitForMany('.violating-element', 2);
    const violatingElementOrAttr = elements[0];
    await violatingElementOrAttr.hover();
    const popupParent = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    const popupText = await popupParent.evaluate(async node => {
      if (!node.shadowRoot) {
        throw new Error('Node shadow root not found.');
      }
      const popup = node.shadowRoot.querySelector('div.widget') as HTMLElement | null;
      if (!popup) {
        throw new Error('Popup not found.');
      }
      return popup.innerText;
    });

    assert.strictEqual(popupText, 'View Issue:\nA form field element should have an id or name attribute');
    // Open the issue panel and look for the title;
    await devToolsPage.click('div.widget x-link');
    const highlitedIssue = await devToolsPage.waitFor('.issue .header .title');
    const issueTitle = await highlitedIssue.evaluate(async node => node.textContent);
    assert.strictEqual(issueTitle, 'A form field element should have an id or name attribute');
  });
});

describe('The elements panel', function() {
  setup({enabledDevToolsExperiments: ['highlight-errors-elements-panel']});

  async function expandElementsWithIssues(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/select-element-with-issues.html');
    await expandSelectedNodeRecursively(devToolsPage);
  }

  it('displays squiggly lines on elements with issue', async ({devToolsPage, inspectedPage}) => {
    await expandElementsWithIssues(devToolsPage, inspectedPage);
    const elements = await devToolsPage.waitForMany('.violating-element', 2);
    const violatingElement = await elements[0].evaluate(node => node.textContent);
    assert.strictEqual(violatingElement, 'button');
  });

  it('displays multiple issues when hoverring over squiggly line', async ({devToolsPage, inspectedPage}) => {
    await expandElementsWithIssues(devToolsPage, inspectedPage);
    const elements = await devToolsPage.waitForMany('.violating-element', 2);
    const violatingElement = elements[1];
    await violatingElement.hover();
    const popupParent = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    const popupText = await popupParent.evaluate(async node => {
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

  it('navigates to issues panel when hovering over problematic element', async ({devToolsPage, inspectedPage}) => {
    await expandElementsWithIssues(devToolsPage, inspectedPage);
    const elements = await devToolsPage.waitForMany('.violating-element', 2);
    const violatingElement = elements[0];
    await violatingElement.hover();
    const popupParent = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    const popupText = await popupParent.evaluate(async node => {
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
    await devToolsPage.click('div.widget x-link');
    const highlitedIssue = await devToolsPage.waitFor('.issue .header .title');
    const issueTitle = await highlitedIssue.evaluate(async node => node.textContent);
    assert.strictEqual(issueTitle, 'Interactive element inside of a <legend> element');
  });
});
