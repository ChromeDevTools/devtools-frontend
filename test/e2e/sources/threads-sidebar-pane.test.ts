// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function expandThreads(devToolsPage: DevToolsPage): Promise<void> {
  await devToolsPage.click('aria/Threads');
  await devToolsPage.waitFor('.expandable-view-title.expanded[aria-label="Threads"]');
}

async function getThreads(devToolsPage: DevToolsPage):
    Promise<Array<{name: string, paused: boolean, selected: boolean}>> {
  const threadsList = await devToolsPage.waitFor('.widget:has(> div > .thread-item)');
  const threads = await threadsList.$$('.thread-item');
  return await Promise.all(threads.map(thread => thread.evaluate(element => {
    const selected = element.getAttribute('aria-selected') === 'true';
    const name = element.querySelector('.thread-item-title')?.textContent ?? '';
    const paused = element.querySelector('.thread-item-paused-state')?.textContent === 'paused';
    return {name, paused, selected};
  })));
}

async function switchToThread(thread: number, devToolsPage: DevToolsPage) {
  const threadSelector = `.thread-item:nth-of-type(${thread + 1})`;
  await devToolsPage.click(threadSelector);
  await devToolsPage.waitFor(threadSelector + '[aria-selected="true"]');
}

describe('The Sources Tab Threads Sidebar Pane', function() {
  it('synchronizes active thread with console panel', async ({devToolsPage, inspectedPage}) => {
    // Have the target load the page.
    await inspectedPage.goToResource('sources/different-workers.html');

    await devToolsPage.click('aria/Sources');
    await devToolsPage.waitForAria('Sources panel');
    await expandThreads(devToolsPage);

    assert.sameDeepMembers(await getThreads(devToolsPage), [
      {name: 'Main', paused: false, selected: true},
      {name: 'worker1.js', paused: false, selected: false},
      {name: 'worker2.js', paused: false, selected: false},
    ]);

    await switchToThread(2, devToolsPage);

    assert.sameDeepMembers(await getThreads(devToolsPage), [
      {name: 'Main', paused: false, selected: false},
      {name: 'worker1.js', paused: false, selected: false},
      {name: 'worker2.js', paused: false, selected: true},
    ]);

    // Switch to the console panel
    await devToolsPage.click('aria/Console');
    await devToolsPage.waitForAria('Console panel');

    // Use the context dropdown, which should currently be on worker2js
    await devToolsPage.click('aria/JavaScript context: \u2699 worker2.js');
    await devToolsPage.click('text/\u2699 worker1.js');
    await devToolsPage.waitForAria('JavaScript context: \u2699 worker1.js');

    // Switch back to the sources panel
    await devToolsPage.click('aria/Sources');
    await devToolsPage.waitForAria('Sources panel');

    assert.sameDeepMembers(await getThreads(devToolsPage), [
      {name: 'Main', paused: false, selected: false},
      {name: 'worker1.js', paused: false, selected: true},
      {name: 'worker2.js', paused: false, selected: false},
    ]);
  });

  it('shows paused state when on the paused thread', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/different-workers.html');

    await devToolsPage.click('aria/Sources');
    await devToolsPage.waitForAria('Sources panel');
    await expandThreads(devToolsPage);

    assert.deepEqual(await getThreads(devToolsPage), [
      {name: 'Main', paused: false, selected: true},
      {name: 'worker1.js', paused: false, selected: false},
      {name: 'worker2.js', paused: false, selected: false},
    ]);

    // Switch away from the main thread
    await switchToThread(1, devToolsPage);

    assert.deepEqual(await getThreads(devToolsPage), [
      {name: 'Main', paused: false, selected: false},
      {name: 'worker1.js', paused: false, selected: true},
      {name: 'worker2.js', paused: false, selected: false},
    ]);

    // Pause the main thread
    await inspectedPage.evaluate('setTimeout(() => {debugger;}, 0)');
    await devToolsPage.waitFor(RESUME_BUTTON);
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    // We automatically switch to the paused thread
    assert.deepEqual(await getThreads(devToolsPage), [
      {name: 'Main', paused: true, selected: true},
      {name: 'worker1.js', paused: false, selected: false},
      {name: 'worker2.js', paused: false, selected: false},
    ]);

    // Switch away from the paused thread
    await switchToThread(2, devToolsPage);
    await devToolsPage.waitForNone(RESUME_BUTTON);
    await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);

    assert.deepEqual(await getThreads(devToolsPage), [
      {name: 'Main', paused: true, selected: false},
      {name: 'worker1.js', paused: false, selected: false},
      {name: 'worker2.js', paused: false, selected: true},
    ]);

    // Switch back to the paused thread
    await switchToThread(0, devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    assert.deepEqual(await getThreads(devToolsPage), [
      {name: 'Main', paused: true, selected: true},
      {name: 'worker1.js', paused: false, selected: false},
      {name: 'worker2.js', paused: false, selected: false},
    ]);
  });
});
