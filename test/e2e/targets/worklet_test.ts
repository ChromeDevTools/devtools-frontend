// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  goToResource,
  waitForFunction,
} from '../../shared/helper.js';

import {
  getStructuredConsoleMessages,
  navigateToConsoleTab,
} from '../helpers/console-helpers.js';

describe('Audio worklet support', () => {
  it('Receiving log messages from Audio worklets', async () => {
    const {target} = getBrowserAndPages();
    await goToResource('empty.html');
    await navigateToConsoleTab();
    await target.evaluate(() => {
      const blob = new Blob(['console.log(\'hello from worklet\')'], {type: 'application/javascript'});
      const url = URL.createObjectURL(blob);
      const audioContext = new AudioContext();
      return audioContext.audioWorklet.addModule(url);
    });
    const message = await waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages();
      return messages[0];
    });
    assert.strictEqual(message.message, 'hello from worklet');
  });
});
