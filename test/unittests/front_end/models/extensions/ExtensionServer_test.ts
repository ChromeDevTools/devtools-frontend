// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Extensions from '../../../../../front_end/models/extensions/extensions.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

import {describeWithDummyExtension} from './helpers.js';
import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';

describeWithDummyExtension('Extensions', context => {
  it('can register a recorder extension for export', async () => {
    class RecorderPlugin {
      async stringify(recording: object) {
        return JSON.stringify(recording);
      }
      async stringifyStep(step: object) {
        return JSON.stringify(step);
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools?.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Test', 'text/javascript');

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
    assert.strictEqual(manager.plugins()[0].getMediaType(), 'text/javascript');
    assert.strictEqual(manager.plugins()[0].getName(), 'Test');
    assert.deepStrictEqual(manager.plugins()[0].getCapabilities(), ['export']);
    assert.deepStrictEqual(result, '{"name":"test","steps":[]}');
    assert.deepStrictEqual(stepResult, '{"type":"scroll"}');

    await context.chrome.devtools?.recorder.unregisterRecorderExtensionPlugin(extensionPlugin);
  });

  it('can register a recorder extension for replay', async () => {
    class RecorderPlugin {
      replay(_recording: object) {
        return;
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools?.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Replay');

    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    assert.strictEqual(manager.plugins().length, 1);
    const plugin = manager.plugins()[0];

    await plugin.replay({
      name: 'test',
      steps: [],
    });

    assert.strictEqual(manager.plugins().length, 1);
    assert.deepStrictEqual(manager.plugins()[0].getCapabilities(), ['replay']);
    assert.strictEqual(manager.plugins()[0].getName(), 'Replay');

    await context.chrome.devtools?.recorder.unregisterRecorderExtensionPlugin(extensionPlugin);
  });

  it('can create and show a panel for Recorder', async () => {
    const panel = await new Promise<Chrome.DevTools.ExtensionPanel>(
        resolve => context.chrome.devtools?.panels.create('Test', 'test.png', 'test.html', resolve));
    class RecorderPlugin {
      replay(_recording: object) {
        panel?.show();
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools?.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Replay');
    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();

    assert.strictEqual(manager.plugins().length, 1);

    const plugin = manager.plugins()[0];

    const stub = sinon.stub(UI.InspectorView.InspectorView.instance(), 'showPanel').callsFake(() => Promise.resolve());
    await plugin.replay({
      name: 'test',
      steps: [],
    });

    assert.isTrue(stub.called);

    await context.chrome.devtools?.recorder.unregisterRecorderExtensionPlugin(extensionPlugin);
  });

  it('can create and show a view for Recorder', async () => {
    const view = await context.chrome.devtools?.recorder.createView('Test', 'test.html');
    class RecorderPlugin {
      replay(_recording: object) {
        view?.show();
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools?.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Replay');
    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();

    assert.strictEqual(manager.plugins().length, 1);
    assert.strictEqual(manager.views().length, 1);

    const plugin = manager.plugins()[0];
    const onceShowRequested = manager.once(Extensions.RecorderPluginManager.Events.ShowViewRequested);
    await plugin.replay({
      name: 'test',
      steps: [],
    });
    const viewDescriptor = await onceShowRequested;
    assert.deepStrictEqual(viewDescriptor.title, 'Test');

    await context.chrome.devtools?.recorder.unregisterRecorderExtensionPlugin(extensionPlugin);
  });

  it('can not show a view for Recorder without using the replay trigger', async () => {
    const view = await context.chrome.devtools?.recorder.createView('Test', 'test.html');
    class RecorderPlugin {
      replay(_recording: object) {
      }
      stringify(recording: object) {
        return JSON.stringify(recording);
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools?.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Replay');
    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();

    assert.strictEqual(manager.plugins().length, 1);
    assert.strictEqual(manager.views().length, 1);

    const events: object[] = [];
    manager.addEventListener(Extensions.RecorderPluginManager.Events.ShowViewRequested, event => {
      events.push(event);
    });
    view?.show();

    // Sending inspectedWindow.eval should flush the message queue and make sure
    // that the ShowViewRequested command was not actually dispatched.
    await new Promise(resolve => context.chrome.devtools?.inspectedWindow.eval('1', undefined, resolve));

    assert.deepStrictEqual(events, []);
    await context.chrome.devtools?.recorder.unregisterRecorderExtensionPlugin(extensionPlugin);
  });

  it('can dispatch hide and show events', async () => {
    const view = await context.chrome.devtools?.recorder.createView('Test', 'test.html');

    const onShownCalled = sinon.promise();
    const onShown = () => onShownCalled.resolve(true);
    const onHiddenCalled = sinon.promise();
    const onHidden = () => onHiddenCalled.resolve(true);

    view?.onHidden.addListener(onHidden);
    view?.onShown.addListener(onShown);

    class RecorderPlugin {
      replay(_recording: object) {
        view?.show();
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools?.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Replay');
    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();

    const plugin = manager.plugins()[0];
    const onceShowRequested = manager.once(Extensions.RecorderPluginManager.Events.ShowViewRequested);
    await plugin.replay({
      name: 'test',
      steps: [],
    });
    const viewDescriptor = await onceShowRequested;
    assert.deepStrictEqual(viewDescriptor.title, 'Test');

    const descriptor = manager.getViewDescriptor(viewDescriptor.id);

    descriptor?.onShown();
    await onShownCalled;

    descriptor?.onHidden();
    await onHiddenCalled;

    await context.chrome.devtools?.recorder.unregisterRecorderExtensionPlugin(extensionPlugin);
  });
});

describe('ExtensionServer', () => {
  it('can correctly expand resource paths', async () => {
    // Ideally this would be a chrome-extension://, but that doesn't work with URL in chrome headless.
    const extensionOrigin = 'chrome://abcdef' as Platform.DevToolsPath.UrlString;
    const almostOrigin = `${extensionOrigin}/` as Platform.DevToolsPath.UrlString;
    const expectation = `${extensionOrigin}/foo` as Platform.DevToolsPath.UrlString;
    assert.strictEqual(
        undefined,
        Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, 'http://example.com/foo'));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, expectation));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, '/foo'));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, 'foo'));

    assert.strictEqual(
        undefined,
        Extensions.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, 'http://example.com/foo'));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, expectation));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, '/foo'));
    assert.strictEqual(expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, 'foo'));
  });
});
