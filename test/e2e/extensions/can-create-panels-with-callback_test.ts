// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {loadExtension} from '../helpers/extension-helpers.js';

describe('The Extension API', async () => {
  it('can create panels with callbacks', async () => {
    const extension = await loadExtension('TestExtension');

    const callbackArgs = await extension.evaluate(
        () => new Promise<string>(
            r => window.chrome.devtools.panels.create('title', '', '', (...args) => r(JSON.stringify(args)))));

    assert.deepEqual(callbackArgs, '[{"onShown":{},"onHidden":{},"onSearch":{}}]');
  });
});
