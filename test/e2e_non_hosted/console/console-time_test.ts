// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getCurrentConsoleMessages,
} from '../../e2e/helpers/console-helpers.js';

describe('console.time', () => {
  it('produces time messages', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.evaluate(async () => {
      console.time();
      await new Promise(resolve => setTimeout(resolve, 1));
      console.timeEnd();
      console.time('42');
      await new Promise(resolve => setTimeout(resolve, 1));
      console.timeEnd('42');
      // @ts-expect-error not supported type in @types/node.
      console.time(239);
      await new Promise(resolve => setTimeout(resolve, 1));
      // @ts-expect-error not supported type in @types/node.
      console.timeEnd(239);
      // @ts-expect-error not supported type in @types/node.
      console.time({});
      await new Promise(resolve => setTimeout(resolve, 1));
      // @ts-expect-error not supported type in @types/node.
      console.timeEnd({});
    });

    await devToolsPage.waitForFunction(async function() {
      try {
        let messages = await getCurrentConsoleMessages(false, undefined, undefined, devToolsPage);
        messages = messages.map(message => message.replace(/\d+\.\d+ ?ms/, '<time>'));
        assert.deepEqual(messages, ['default: <time>', '42: <time>', '239: <time>', '[object Object]: <time>']);
        return true;
      } catch {
        return false;
      }
    });
  });
});
