// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Extensions from '../../../../../front_end/models/extensions/extensions.js';
import type {Chrome} from '../../../../../extension-api/ExtensionAPI.js';

const {assert} = chai;

describe('Extensions', () => {
  function cleanup() {
    delete (window as {chrome?: Chrome.DevTools.Chrome}).chrome;
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('can register a recorder extension', async () => {
    const server = Extensions.ExtensionServer.ExtensionServer.instance({forceNew: true});
    const extensionDescriptor = {
      startPage: 'blank.html',
      name: 'TestExtension',
      exposeExperimentalAPIs: true,
    };
    server.addExtensionForTest(extensionDescriptor, window.location.origin);
    const chrome: Partial<Chrome.DevTools.Chrome> = {};
    (window as {chrome?: Partial<Chrome.DevTools.Chrome>}).chrome = chrome;

    self.injectedExtensionAPI(extensionDescriptor, 'main', 'dark', [], () => {}, 1, window);

    class RecorderPlugin {
      async stringify(recording: object) {
        return JSON.stringify(recording);
      }
      async stringifyStep(step: object) {
        return JSON.stringify(step);
      }
    }
    await chrome.devtools?.recorder.registerRecorderExtensionPlugin(new RecorderPlugin(), 'Test', 'text/javascript');

    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    assert.strictEqual(manager.plugins().length, 1);
    const plugin = manager.plugins()[0];

    const result = await plugin.stringify({
      name: 'test',
      steps: [],
    });

    const stepResult = await plugin.stringifyStep({
      type: 'scroll',
    });

    assert.strictEqual(manager.plugins().length, 1);
    assert.strictEqual(manager.plugins()[0].getMimeType(), 'text/javascript');
    assert.strictEqual(manager.plugins()[0].getName(), 'Test');
    assert.deepStrictEqual(result, '{"name":"test","steps":[]}');
    assert.deepStrictEqual(stepResult, '{"type":"scroll"}');
  });
});
