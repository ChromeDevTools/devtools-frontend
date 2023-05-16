// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, click, getBrowserAndPages, goToResource, typeText, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, STACK_PREVIEW_CONTAINER} from '../helpers/console-helpers.js';
import {openSettingsTab} from '../helpers/settings-helpers.js';

const CONSOLE_MESSAGE_WRAPPER = '.console-message-stack-trace-wrapper';
const ADD_FILENAME_PATTERN_BUTTON = 'button[aria-label="Add filename pattern"]';
const ADD_BUTTON = '.editor-buttons .primary-button';
const CLOSE_SETTINGS_BUTTON = '.close-button[aria-label="Close"]';
const SHOW_MORE_LINK = '.show-all-link .link';
const SHOW_LESS_LINK = '.show-less-link .link';

describe('The Console Tab', async () => {
  it('shows messages with stack traces', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await goToResource('console/stack-trace.html');

    await frontend.waitForSelector(CONSOLE_MESSAGE_WRAPPER);
    await click(CONSOLE_MESSAGE_WRAPPER);
    const stack = await $(STACK_PREVIEW_CONTAINER);

    const expected = [
      {text: '\nshown3 @ showMe.js:10', classes: {}},
      {text: '\nshown2 @ showMe.js:6', classes: {}},
      {text: '\nshown1 @ showMe.js:2', classes: {}},
      {text: '\n(anonymous) @ ignoreMe.js:21', classes: {}},
      {text: '\nPromise.then (async)', classes: {}},
      {text: '\nignoreListed4 @ ignoreMe.js:20', classes: {}},
      {text: '\nignoreListed3 @ ignoreMe.js:16', classes: {}},
      {text: '\nignoreListed2 @ ignoreMe.js:12', classes: {}},
      {text: '\nignoreListed1 @ ignoreMe.js:8', classes: {}},
      {text: '\n(anonymous) @ ignoreMe.js:5', classes: {}},
    ];

    await waitForFunction(async () => {
      const stackTraceRows = await frontend.evaluate((stack: Element) => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, classes: node.classList}));
      }, stack);
      return JSON.stringify(stackTraceRows) === JSON.stringify(expected);
    });
  });

  it('shows messages with stack traces containing ignore-listed frames', async () => {
    const {frontend} = getBrowserAndPages();
    await openSettingsTab('Ignore List');
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
      {text: '\nshown3 @ showMe.js:10', classes: {}},
      {text: '\nshown2 @ showMe.js:6', classes: {}},
      {text: '\nshown1 @ showMe.js:2', classes: {}},
      {text: '\n(anonymous) @ ignoreMe.js:21', classes: {'0': 'hidden-row'}},
      {text: '\nPromise.then (async)', classes: {'0': 'hidden-row'}},
      {text: '\nignoreListed4 @ ignoreMe.js:20', classes: {'0': 'hidden-row'}},
      {text: '\nignoreListed3 @ ignoreMe.js:16', classes: {'0': 'hidden-row'}},
      {text: '\nignoreListed2 @ ignoreMe.js:12', classes: {'0': 'hidden-row'}},
      {text: '\nignoreListed1 @ ignoreMe.js:8', classes: {'0': 'hidden-row'}},
      {text: '\n(anonymous) @ ignoreMe.js:5', classes: {'0': 'hidden-row'}},
      {text: '\nShow 6 more frames', classes: {'0': 'show-all-link'}},
      {text: '\nShow less', classes: {'0': 'show-less-link'}},
    ];

    await waitForFunction(async () => {
      const stackTraceRows = await frontend.evaluate((stack: Element) => {
        return Array.from(stack.querySelectorAll('tr'))
            .map(node => ({text: node.textContent, classes: node.classList}));
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

    // assert that after clicking 'show less'-button, hidden rows are hidden again
    await click(SHOW_LESS_LINK);
    showHidden = stack ? await stack.evaluate(x => x.classList.contains('show-hidden-rows')) : null;
    assert.strictEqual(showHidden, false);
  });
});
