// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  expandSelectedNodeRecursively,
  waitForAndClickTreeElementWithPartialText,
  waitForElementWithPartialText,
  waitForStyleRule,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('shows iframe content', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/page-with-oopif.html', {waitUntil: 'networkidle0'});
    await expandSelectedNodeRecursively(devToolsPage);

    async function expandIframeContent() {
      await waitForAndClickTreeElementWithPartialText('#document', devToolsPage);
      // #document cannot be expanded. Using keyboard nav as a workaround.
      await devToolsPage.click('.selected[role="treeitem"]', {clickOptions: {count: 2}});
      await devToolsPage.pressKey('ArrowDown');
      await devToolsPage.pressKey('ArrowDown');
      await devToolsPage.pressKey('ArrowDown');
      await expandSelectedNodeRecursively(devToolsPage);
    }
    await expandIframeContent();

    // Part of the iframe URL.
    await waitForElementWithPartialText('devtools.oopif.test', devToolsPage);
    // iframe content.
    await waitForElementWithPartialText('Hello World', devToolsPage);

    // Navigate to a local frame.
    const frame = await inspectedPage.page.waitForFrame(frame => frame.url().includes('devtools.oopif.test'));
    await frame.goto(`${inspectedPage.getResourcesPath('127.0.0.1')}/empty.html`);
    await waitForStyleRule('iframe', devToolsPage);

    await expandIframeContent();
    // Part of the iframe URL.
    await waitForElementWithPartialText('127.0.0.1', devToolsPage);
    // iframe content.
    await waitForElementWithPartialText('Hello World', devToolsPage);
  });
});
