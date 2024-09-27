// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, click, getBrowserAndPages, goToResource, typeText, waitForFunction} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, STACK_PREVIEW_CONTAINER} from '../helpers/console-helpers.js';
import {openSettingsTab} from '../helpers/settings-helpers.js';

const CONSOLE_MESSAGE_WRAPPER = '.console-message-stack-trace-wrapper';
const ADD_FILENAME_PATTERN_BUTTON = 'devtools-button[aria-label="Add a regular expression rule for the script\'s URL"]';
const ADD_BUTTON = '.editor-buttons devtools-button:nth-of-type(2)';
const CLOSE_SETTINGS_BUTTON = '.close-button[aria-label="Close"]';
const SHOW_MORE_LINK = '.show-all-link .link';
const SHOW_LESS_LINK = '.show-less-link .link';

describe('The Console Tab', () => {
  it('shows messages with stack traces', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await goToResource('console/stack-trace.html');

    await frontend.waitForSelector(CONSOLE_MESSAGE_WRAPPER);
    await click(CONSOLE_MESSAGE_WRAPPER);
    const stack = await $(STACK_PREVIEW_CONTAINER);

    const expected = [
      {text: '\nshown3 @ showMe.js:10', visible: true},
      {text: '\nshown2 @ showMe.js:6', visible: true},
      {text: '\nshown1 @ showMe.js:2', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:21', visible: true},
      {text: '\nPromise.then', visible: true},
      {text: '\nignoreListed4 @ ignoreMe.js:20', visible: true},
      {text: '\nignoreListed3 @ ignoreMe.js:16', visible: true},
      {text: '\nignoreListed2 @ ignoreMe.js:12', visible: true},
      {text: '\nignoreListed1 @ ignoreMe.js:8', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:5', visible: true},
      {text: '', visible: false},
      {text: '', visible: false},
    ];

    await waitForFunction(async () => {
      const stackTraceRows = await frontend.evaluate((stack: Element) => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, visible: node.checkVisibility()}));
      }, stack);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expected);
    });
  });

  it('shows messages with stack traces containing ignore-listed frames', async () => {
    const {frontend} = getBrowserAndPages();
    await openSettingsTab('Ignore list');
    await click(ADD_FILENAME_PATTERN_BUTTON);
    await typeText('ignoreMe.js');
    await click(ADD_BUTTON);
    await click(CLOSE_SETTINGS_BUTTON);

    await goToResource('console/stack-trace.html');
    await click(CONSOLE_TAB_SELECTOR);

    await frontend.waitForSelector(CONSOLE_MESSAGE_WRAPPER);
    await click(CONSOLE_MESSAGE_WRAPPER);
    const stack = await $(STACK_PREVIEW_CONTAINER);

    const expected = [
      {text: '\nshown3 @ showMe.js:10', visible: true},
      {text: '\nshown2 @ showMe.js:6', visible: true},
      {text: '\nshown1 @ showMe.js:2', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:21', visible: false},
      {text: '\nPromise.then', visible: false},
      {text: '\nignoreListed4 @ ignoreMe.js:20', visible: false},
      {text: '\nignoreListed3 @ ignoreMe.js:16', visible: false},
      {text: '\nignoreListed2 @ ignoreMe.js:12', visible: false},
      {text: '\nignoreListed1 @ ignoreMe.js:8', visible: false},
      {text: '\n(anonymous) @ ignoreMe.js:5', visible: false},
      {text: '', visible: true},
      {text: '', visible: false},
    ];

    await waitForFunction(async () => {
      const stackTraceRows = await frontend.evaluate((stack: Element) => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, visible: node.checkVisibility()}));
      }, stack);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expected);
    });

    // assert that hidden rows are not shown initially
    let showHidden = stack ? await stack.evaluate(x => x.classList.contains('show-hidden-rows')) : null;
    assert.strictEqual(showHidden, false);

    // assert that after clicking 'show all'-button, hidden rows are shown
    await click(SHOW_MORE_LINK);
    showHidden = stack ? await stack.evaluate(x => x.classList.contains('show-hidden-rows')) : null;
    assert.strictEqual(showHidden, true);

    const expectedUnhidden = [
      {text: '\nshown3 @ showMe.js:10', visible: true},
      {text: '\nshown2 @ showMe.js:6', visible: true},
      {text: '\nshown1 @ showMe.js:2', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:21', visible: true},
      {text: '\nPromise.then', visible: true},
      {text: '\nignoreListed4 @ ignoreMe.js:20', visible: true},
      {text: '\nignoreListed3 @ ignoreMe.js:16', visible: true},
      {text: '\nignoreListed2 @ ignoreMe.js:12', visible: true},
      {text: '\nignoreListed1 @ ignoreMe.js:8', visible: true},
      {text: '\n(anonymous) @ ignoreMe.js:5', visible: true},
      {text: '', visible: false},
      {text: '', visible: true},
    ];

    await waitForFunction(async () => {
      const stackTraceRows = await frontend.evaluate((stack: Element) => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, visible: node.checkVisibility()}));
      }, stack);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expectedUnhidden);
    });

    // assert that after clicking 'show less'-button, hidden rows are hidden again
    await click(SHOW_LESS_LINK);
    showHidden = stack ? await stack.evaluate(x => x.classList.contains('show-hidden-rows')) : null;
    assert.strictEqual(showHidden, false);
  });
});
