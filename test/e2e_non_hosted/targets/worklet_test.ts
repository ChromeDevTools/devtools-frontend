// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getStructuredConsoleMessages,
  navigateToConsoleTab,
} from '../../e2e/helpers/console-helpers.js';

describe('Audio worklet support', () => {
  it('Receiving log messages from Audio worklets', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.evaluate(() => {
      const blob = new Blob(['console.log(\'hello from worklet\')'], {type: 'application/javascript'});
      const url = URL.createObjectURL(blob);
      const audioContext = new AudioContext();
      return audioContext.audioWorklet.addModule(url);
    });
    const message = await devToolsPage.waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages(devToolsPage);
      return messages[0];
    });
    assert.strictEqual(message.message, 'hello from worklet');
  });
});
