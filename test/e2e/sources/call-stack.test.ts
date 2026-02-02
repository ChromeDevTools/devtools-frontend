// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getCallFrameNames, PAUSE_INDICATOR_SELECTOR} from '../helpers/sources-helpers.js';

describe('Sources', () => {
  it('shows a "Shows more" link when call stack gets too large', async ({devToolsPage, inspectedPage}) => {
    inspectedPage.evaluate(function() {
      function callWithAsyncStack(f: () => void, depth: number) {
        if (depth === 0) {
          f();
          return;
        }
        const wrapper =
            eval('(function call' + depth + '() { callWithAsyncStack(f, depth - 1) }) //# sourceURL=wrapper.js');
        void Promise.resolve().then(wrapper);
      }
      (function testFunction() {
        callWithAsyncStack(() => {
          debugger;  // eslint-disable-line no-debugger
        }, 36);
      })();
    });

    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForMany('.call-frame-item', 99);

    await devToolsPage.click('.show-more-message > .link');

    await devToolsPage.waitForMany('.call-frame-item', 112);
  });

  it('shows async stack traces across worker and the page', async ({devToolsPage, inspectedPage}) => {
    inspectedPage.evaluate(function() {
      const response = `
        postMessage('ready');
        self.onmessage=function(e){
          debugger;
        }
        //# sourceURL=worker.js`;
      const blob = new Blob([response], {type: 'application/javascript'});
      (function testFunction() {
        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = function() {
          worker.postMessage(42);
        };
      })();
    });

    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForMany('.call-frame-item', 8);

    assert.deepEqual(await getCallFrameNames(devToolsPage), [
      'self.onmessage',
      'Worker.postMessage',
      'worker.onmessage',
      'postMessage',
      '(anonymous)',
      'Worker Created',
      'testFunction',
      '(anonymous)',
    ]);
  });
});
