// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  findElementById,
  goToResourceAndWaitForStyleSection,
  isDOMBreakpointEnabled,
  setDOMBreakpointOnSelectedNode,
  waitForElementsDOMBreakpointsSection,
} from '../helpers/elements-helpers.js';
import {getCallFrameNames, getPausedMessages, RESUME_BUTTON} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

declare global {
  function appendElementToOpenShadowRoot(childId: string): void;
  function appendElementToAuthorShadowTree(parentId: string, childId: string): void;
  function appendElement(parentId: string, childId: string): void;
}

async function waitForDOMBreakpointCount(expectedCount: number, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const breakpoints = await devToolsPage.$$('.breakpoint-entry');
    return breakpoints.length === expectedCount;
  });
}

describe('DOM Breakpoints', () => {
  it('persists subtree modifications DOM breakpoint state between page reloads',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('sources/dom-breakpoints.html', devToolsPage, inspectedPage);
       await findElementById('rootElement', devToolsPage);
       await setDOMBreakpointOnSelectedNode('subtree modifications', devToolsPage);

       await waitForElementsDOMBreakpointsSection(devToolsPage);
       await waitForDOMBreakpointCount(1, devToolsPage);
       const breakpoints = await devToolsPage.$$('.breakpoint-entry');
       assert.isTrue(await isDOMBreakpointEnabled(breakpoints[0], devToolsPage));

       await inspectedPage.reload();
       await waitForElementsDOMBreakpointsSection(devToolsPage);

       const scriptPromise = inspectedPage.evaluate(() => {
         appendElement('rootElement', 'childElement');
       });

       const status = await getPausedMessages(devToolsPage);
       assert.strictEqual(status.statusMain, 'Paused on subtree modifications');
       assert.strictEqual(status.statusSub, 'Child  added');

       const callFrames = await getCallFrameNames(devToolsPage);
       assert.deepEqual(callFrames, ['appendElement', '(anonymous)']);

       await devToolsPage.click(RESUME_BUTTON);
       await scriptPromise;
     });

  it('pauses on subtree modifications DOM breakpoint set on shadow root when a child is appended',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('sources/dom-breakpoints.html', devToolsPage, inspectedPage);
       await findElementById('outerElement', devToolsPage);
       await devToolsPage.pressKey('ArrowUp');
       await setDOMBreakpointOnSelectedNode('subtree modifications', devToolsPage);

       await waitForElementsDOMBreakpointsSection(devToolsPage);
       await waitForDOMBreakpointCount(1, devToolsPage);
       const breakpoints = await devToolsPage.$$('.breakpoint-entry');
       assert.isTrue(await isDOMBreakpointEnabled(breakpoints[0], devToolsPage));

       const scriptPromise = inspectedPage.evaluate(() => {
         appendElementToOpenShadowRoot('childElement');
       });

       const status = await getPausedMessages(devToolsPage);
       assert.strictEqual(status.statusMain, 'Paused on subtree modifications');
       assert.strictEqual(status.statusSub, 'Child  added');

       const callFrames = await getCallFrameNames(devToolsPage);
       assert.deepEqual(callFrames, ['appendElementToOpenShadowRoot', '(anonymous)']);

       await devToolsPage.click(RESUME_BUTTON);
       await scriptPromise;
     });

  it('persists shadow DOM breakpoints between page reloads', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('sources/dom-breakpoints.html', devToolsPage, inspectedPage);
    await findElementById('outerElement', devToolsPage);
    await setDOMBreakpointOnSelectedNode('subtree modifications', devToolsPage);

    await waitForElementsDOMBreakpointsSection(devToolsPage);
    await waitForDOMBreakpointCount(1, devToolsPage);
    const breakpoints = await devToolsPage.$$('.breakpoint-entry');
    assert.isTrue(await isDOMBreakpointEnabled(breakpoints[0], devToolsPage));

    await inspectedPage.reload();
    await waitForElementsDOMBreakpointsSection(devToolsPage);

    const scriptPromise = inspectedPage.evaluate(() => {
      appendElementToAuthorShadowTree('outerElement', 'childElement');
    });

    const status = await getPausedMessages(devToolsPage);
    assert.strictEqual(status.statusMain, 'Paused on subtree modifications');
    assert.strictEqual(status.statusSub, 'Child  added');

    const callFrames = await getCallFrameNames(devToolsPage);
    assert.deepEqual(callFrames, ['appendElementToAuthorShadowTree', '(anonymous)']);

    await devToolsPage.click(RESUME_BUTTON);
    await scriptPromise;
  });
});
