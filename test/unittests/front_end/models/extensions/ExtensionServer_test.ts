// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Extensions from '../../../../../front_end/models/extensions/extensions.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

const {assert} = chai;

import {describeWithDevtoolsExtension} from './helpers.js';
import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {createTarget, expectConsoleLogs} from '../../helpers/EnvironmentHelpers.js';

describeWithDevtoolsExtension('Extensions', {}, context => {
  it('are initialized after the target is initialized and navigated to a non-privileged URL', async () => {
    // This check is a proxy for verifying that the extension has been initialized. Outside of the test the extension
    // API is available as soon as the extension page is loaded, which we don't do in the test.
    assert.isUndefined(context.chrome.devtools);

    const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    createTarget().setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);
    assert.isTrue(addExtensionStub.calledOnceWithExactly(context.extensionDescriptor));
  });

  it('are not initialized before the target is initialized and navigated to a non-privileged URL', async () => {
    // This check is a proxy for verifying that the extension has been initialized. Outside of the test the extension
    // API is available as soon as the extension page is loaded, which we don't do in the test.
    assert.isUndefined(context.chrome.devtools);

    const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    createTarget().setInspectedURL('chrome://version' as Platform.DevToolsPath.UrlString);
    assert.isTrue(addExtensionStub.notCalled);
  });
});

describeWithDevtoolsExtension('Extensions', {}, context => {
  expectConsoleLogs({
    warn: ['evaluate: the main frame is not yet available'],
    error: ['Extension server error: Object not found: <top>'],
  });
  beforeEach(() => {
    createTarget().setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);
  });

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

const hostsPolicy = {
  runtimeAllowedHosts: ['http://example.com'],
  runtimeBlockedHosts: ['http://example.com', 'http://web.dev'],
};

describeWithDevtoolsExtension('Runtime hosts policy', {hostsPolicy}, context => {
  expectConsoleLogs({error: ['Extension server error: Operation failed: Permission denied']});

  for (const protocol of ['devtools', 'chrome', 'chrome-untrusted']) {
    it(`blocks API calls on blocked protocols: ${protocol}`, async () => {
      assert.isUndefined(context.chrome.devtools);
      const target = createTarget({type: SDK.Target.Type.Frame});
      const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');

      target.setInspectedURL(`${protocol}://foo` as Platform.DevToolsPath.UrlString);
      assert.isTrue(addExtensionStub.notCalled);
      assert.isUndefined(context.chrome.devtools);
    });
  }

  it('blocks API calls on blocked hosts', async () => {
    assert.isUndefined(context.chrome.devtools);
    const target = createTarget({type: SDK.Target.Type.Frame});
    const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');

    target.setInspectedURL('http://web.dev' as Platform.DevToolsPath.UrlString);
    assert.isTrue(addExtensionStub.alwaysReturned(undefined));
    assert.isUndefined(context.chrome.devtools);
  });

  it('allows API calls on allowlisted hosts', async () => {
    const target = createTarget({type: SDK.Target.Type.Frame});
    target.setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      // eslint-disable-next-line rulesdir/compare_arrays_with_assert_deepequal
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('allows API calls on non-blocked hosts', async () => {
    const target = createTarget({type: SDK.Target.Type.Frame});
    target.setInspectedURL('http://example.com2' as Platform.DevToolsPath.UrlString);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      // eslint-disable-next-line rulesdir/compare_arrays_with_assert_deepequal
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  function setUpFrame(
      name: string, url: Platform.DevToolsPath.UrlString, parentFrame?: SDK.ResourceTreeModel.ResourceTreeFrame,
      executionContextOrigin?: Platform.DevToolsPath.UrlString) {
    const mimeType = 'text/html';
    const secureContextType = Protocol.Page.SecureContextType.Secure;
    const crossOriginIsolatedContextType = Protocol.Page.CrossOriginIsolatedContextType.Isolated;
    const loaderId = 'loader' as Protocol.Network.LoaderId;

    const parentTarget = parentFrame?.resourceTreeModel()?.target();
    const target = createTarget({id: `${name}-target-id` as Protocol.Target.TargetID, parentTarget});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    Platform.assertNotNullOrUndefined(resourceTreeModel);

    const id = `${name}-frame-id` as Protocol.Page.FrameId;
    resourceTreeModel.frameNavigated(
        {
          id,
          parentId: parentFrame?.id,
          loaderId,
          url,
          domainAndRegistry: new URL(url).hostname,
          securityOrigin: new URL(url).origin,
          mimeType,
          secureContextType,
          crossOriginIsolatedContextType,
          gatedAPIFeatures: [],
        },
        Protocol.Page.NavigationType.Navigation);

    if (executionContextOrigin) {
      executionContextOrigin = new URL(executionContextOrigin).origin as Platform.DevToolsPath.UrlString;
      const parentRuntimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      Platform.assertNotNullOrUndefined(parentRuntimeModel);
      parentRuntimeModel.executionContextCreated({
        id: 0 as Protocol.Runtime.ExecutionContextId,
        origin: executionContextOrigin,
        name: executionContextOrigin,
        uniqueId: executionContextOrigin,
        auxData: {frameId: id, isDefault: true},
      });
    }

    const frame = resourceTreeModel.frameForId(id);
    Platform.assertNotNullOrUndefined(frame);
    return frame;
  }

  it('blocks evaluation on blocked subframes', async () => {
    assert.isUndefined(context.chrome.devtools);
    const parentFrameUrl = 'http://example.com' as Platform.DevToolsPath.UrlString;
    const childFrameUrl = 'http://web.dev' as Platform.DevToolsPath.UrlString;
    const parentFrame = setUpFrame('parent', parentFrameUrl);
    setUpFrame('child', childFrameUrl, parentFrame);

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            '4', {frameURL: childFrameUrl}, (result, error) => r({result, error})));

    assert.deepStrictEqual(result.error?.details, ['Permission denied']);
  });

  it('doesn\'t block evaluation on blocked sub-executioncontexts with useContentScriptContext', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = 'http://example.com' as Platform.DevToolsPath.UrlString;
    const childFrameUrl = 'http://example.com/2' as Platform.DevToolsPath.UrlString;
    const childExeContextOrigin = 'http://web.dev' as Platform.DevToolsPath.UrlString;
    const parentFrame = setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    const childFrame = setUpFrame('child', childFrameUrl, parentFrame, childExeContextOrigin);

    // Create a fake content script execution context, i.e., a non-default context with the extension's (== window's)
    // origin.
    const runtimeModel = childFrame.resourceTreeModel()?.target().model(SDK.RuntimeModel.RuntimeModel);
    Platform.assertNotNullOrUndefined(runtimeModel);
    runtimeModel.executionContextCreated({
      id: 1 as Protocol.Runtime.ExecutionContextId,
      origin: window.location.origin,
      name: window.location.origin,
      uniqueId: window.location.origin,
      auxData: {frameId: childFrame.id, isDefault: false},
    });
    const contentScriptExecutionContext = runtimeModel.executionContext(1);
    Platform.assertNotNullOrUndefined(contentScriptExecutionContext);
    sinon.stub(contentScriptExecutionContext, 'evaluate').returns(Promise.resolve({
      object: SDK.RemoteObject.RemoteObject.fromLocalObject(4),
    }));

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            '4', {frameURL: childFrameUrl, useContentScriptContext: true}, (result, error) => r({result, error})));

    assert.deepStrictEqual(result.result, 4);
  });

  it('blocks evaluation on blocked sub-executioncontexts with explicit scriptExecutionContextOrigin', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = 'http://example.com' as Platform.DevToolsPath.UrlString;
    const childFrameUrl = 'http://example.com/2' as Platform.DevToolsPath.UrlString;
    const parentFrame = setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    const childFrame = setUpFrame('child', childFrameUrl, parentFrame, parentFrameUrl);

    // Create a non-default context with a blocked origin.
    const childExeContextOrigin = 'http://web.dev' as Platform.DevToolsPath.UrlString;
    const runtimeModel = childFrame.resourceTreeModel()?.target().model(SDK.RuntimeModel.RuntimeModel);
    Platform.assertNotNullOrUndefined(runtimeModel);
    runtimeModel.executionContextCreated({
      id: 1 as Protocol.Runtime.ExecutionContextId,
      origin: childExeContextOrigin,
      name: childExeContextOrigin,
      uniqueId: childExeContextOrigin,
      auxData: {frameId: childFrame.id, isDefault: false},
    });

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            // The typings don't match the implementation, so we need to cast to any here to make ts happy.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            '4', {frameURL: childFrameUrl, scriptExecutionContext: childExeContextOrigin} as any,
            (result, error) => r({result, error})));

    assert.deepStrictEqual(result.error?.details, ['Permission denied']);
  });

  it('blocks evaluation on blocked sub-executioncontexts', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = 'http://example.com' as Platform.DevToolsPath.UrlString;
    const childFrameUrl = 'http://example.com/2' as Platform.DevToolsPath.UrlString;
    const childExeContextOrigin = 'http://web.dev' as Platform.DevToolsPath.UrlString;
    const parentFrame = setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    setUpFrame('child', childFrameUrl, parentFrame, childExeContextOrigin);

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            '4', {frameURL: childFrameUrl}, (result, error) => r({result, error})));

    assert.deepStrictEqual(result.error?.details, ['Permission denied']);
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
