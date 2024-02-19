// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Extensions from '../../../../../front_end/models/extensions/extensions.js';

const {assert} = chai;

describe('RecorderPluginManager', () => {
  it('emits events when the plugin list is modified', async () => {
    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    const events: Array<{event: string, plugin: Extensions.RecorderExtensionEndpoint.RecorderExtensionEndpoint}> = [];
    manager.addEventListener(
        Extensions.RecorderPluginManager.Events.PluginAdded,
        event => events.push({event: 'pluginAdded', plugin: event.data}));
    manager.addEventListener(
        Extensions.RecorderPluginManager.Events.PluginRemoved,
        event => events.push({event: 'pluginRemoved', plugin: event.data}));
    const plugin = new Extensions.RecorderExtensionEndpoint.RecorderExtensionEndpoint(
        'test', new MessageChannel().port1, ['export'], 'application/javascript');

    manager.addPlugin(plugin);
    manager.removePlugin(plugin);

    assert.deepStrictEqual(events, [
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
