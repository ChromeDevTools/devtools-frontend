// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import * as Extensions from '../extensions/extensions.js';

const {urlString} = Platform.DevToolsPath;

describe('RecorderPluginManager', () => {
  it('emits events when the plugin list is modified', async () => {
    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    const events: Array<{event: string, plugin: Extensions.RecorderExtensionEndpoint.RecorderExtensionEndpoint}> = [];
    manager.addEventListener(
        Extensions.RecorderPluginManager.Events.PLUGIN_ADDED,
        event => events.push({event: 'pluginAdded', plugin: event.data}));
    manager.addEventListener(
        Extensions.RecorderPluginManager.Events.PLUGIN_REMOVED,
        event => events.push({event: 'pluginRemoved', plugin: event.data}));
    const plugin = new Extensions.RecorderExtensionEndpoint.RecorderExtensionEndpoint(
        'test', new MessageChannel().port1, ['export'], urlString`chrome-extension://test`, 'application/javascript');

    manager.addPlugin(plugin);
    manager.removePlugin(plugin);

    assert.deepEqual(events, [
      {
        event: 'pluginAdded',
        plugin,
      },
      {
        event: 'pluginRemoved',
        plugin,
      },
    ]);
  });
});
