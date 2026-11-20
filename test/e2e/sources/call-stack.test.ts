// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {getCallFrameNames, openSourcesPanel, PAUSE_INDICATOR_SELECTOR} from '../helpers/sources-helpers.js';

describe('Sources', () => {
  it('shows a "Shows more" link when call stack gets too large', async ({devToolsPage, inspectedPage}) => {
    void inspectedPage.evaluate(function() {
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
    void inspectedPage.evaluate(function() {
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

  it('shows async stack traces for nested async/await functions', async ({devToolsPage, inspectedPage}) => {
    await openSourcesPanel(devToolsPage);
    await inspectedPage.evaluate(() => {
      eval(`
        async function foo() {
          await Promise.resolve(1);
          await Promise.resolve(2);
          debugger;
        }

        async function boo() {
          await Promise.resolve(3);
          await foo();
        }

        async function testFunction() {
          await Promise.resolve(4);
          await boo();
        }

        function scheduleTestFunction() {
          setTimeout(testFunction, 0);
        }

        scheduleTestFunction();
        //# sourceURL=test.js
      `);
    });

    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    const expectedCallStack = [
      {title: 'foo', location: 'test.js:5'},
      {title: 'await in foo', location: null},
      {title: 'boo', location: 'test.js:10'},
      {title: 'await in boo', location: null},
      {title: 'testFunction', location: 'test.js:15'},
      {title: 'setTimeout', location: null},
      {title: 'scheduleTestFunction', location: 'test.js:19'},
      {title: 'eval', location: 'test.js:22'},
      {title: '(anonymous)', location: 'VM:2'},
    ];

    const callStack = await devToolsPage.waitForFunction(async () => {
      const items = await devToolsPage.$$('.call-frame-item:not([hidden]):not(.hidden)');
      if (items.length !== expectedCallStack.length) {
        await Promise.all(items.map(item => item.dispose()));
        return undefined;
      }
      return await Promise.all(items.map(async item => {
        try {
          return await item.evaluate(el => {
            const title = el.querySelector('.call-frame-item-title')?.textContent?.trim() ?? '';
            const location =
                el.querySelector('.call-frame-location')?.textContent?.trim().replace(/^VM\d+:/, 'VM:') ?? null;
            return {title, location};
          });
        } finally {
          await item.dispose();
        }
      }));
    });

    assert.deepEqual(callStack, expectedCallStack);
  });
});
