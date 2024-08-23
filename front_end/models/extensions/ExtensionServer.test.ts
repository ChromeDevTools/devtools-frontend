// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithDevtoolsExtension,
  getExtensionOrigin,
} from '../../testing/ExtensionHelpers.js';
import {addChildFrame, FRAME_URL, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Bindings from '../bindings/bindings.js';
import * as Extensions from '../extensions/extensions.js';
import type * as HAR from '../har/har.js';
import * as Logs from '../logs/logs.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

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

  it('defers loading extensions until after navigation from a privileged to a non-privileged host', async () => {
    const addExtensionSpy = sinon.spy(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL('chrome://abcdef' as Platform.DevToolsPath.UrlString);
    assert.isTrue(addExtensionSpy.notCalled, 'addExtension not called');

    target.setInspectedURL(allowedUrl);
    assert.isTrue(addExtensionSpy.calledOnce, 'addExtension called once');
    assert.isTrue(addExtensionSpy.returned(true), 'addExtension returned true');
  });

  it('only returns page resources for allowed targets', async () => {
    const urls = ['http://example.com', 'chrome://version'] as Platform.DevToolsPath.UrlString[];
    const targets = urls.map(async url => {
      const target = createTarget({url});
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.isNotNull(resourceTreeModel);
      await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
      target.setInspectedURL(url);
      resourceTreeModel.mainFrame?.addResource(new SDK.Resource.Resource(
          resourceTreeModel, null, url, url, null, null, Common.ResourceType.resourceTypes.Document, 'application/text',
          null, null));
      return target;
    });

    await Promise.all(targets);

    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools!.inspectedWindow.getResources(r));

    assert.deepStrictEqual(resources.map(r => r.url), ['https://example.com/', 'http://example.com']);
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
    const onceShowRequested = manager.once(Extensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED);
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
    manager.addEventListener(Extensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED, event => {
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
    const onceShowRequested = manager.once(Extensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED);
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

  it('reload only the main toplevel frame', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.isNotNull(target);
    const secondTarget = createTarget();

    const secondResourceTreeModel = secondTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isNotNull(secondResourceTreeModel);
    const secondReloadStub = sinon.stub(secondResourceTreeModel, 'reloadPage');
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isNotNull(resourceTreeModel);
    const reloadStub = sinon.stub(resourceTreeModel, 'reloadPage');
    const reloadPromise = new Promise(resolve => reloadStub.callsFake(resolve));
    context.chrome.devtools!.inspectedWindow.reload();
    await reloadPromise;
    assert.isTrue(reloadStub.calledOnce);
    assert.isTrue(secondReloadStub.notCalled);
  });

  it('correcly installs blocked extensions after navigation', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.isOk(target);
    target.setInspectedURL('chrome://version' as Platform.DevToolsPath.UrlString);
    const extensionServer = Extensions.ExtensionServer.ExtensionServer.instance();

    const addExtensionSpy = sinon.spy(extensionServer, 'addExtension');

    assert.isUndefined(extensionServer.addExtension({
      startPage: 'about:blank',
      name: 'ext',
      exposeExperimentalAPIs: false,
    }));
    target.setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);

    assert.deepStrictEqual(addExtensionSpy.returnValues, [undefined, true]);
  });

  it('correcly reenables extensions after navigation', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.isOk(target);
    const extensionServer = Extensions.ExtensionServer.ExtensionServer.instance();

    assert.isTrue(extensionServer.isEnabledForTest);
    target.setInspectedURL('chrome://version' as Platform.DevToolsPath.UrlString);
    assert.isFalse(extensionServer.isEnabledForTest);
    target.setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);
    assert.isTrue(extensionServer.isEnabledForTest);
  });
});

const allowedUrl = FRAME_URL;
const blockedUrl = 'http://web.dev' as Platform.DevToolsPath.UrlString;
const hostsPolicy = {
  runtimeAllowedHosts: [allowedUrl],
  runtimeBlockedHosts: [allowedUrl, blockedUrl],
};

function waitForFunction<T>(fn: () => T): Promise<T> {
  return new Promise<T>(r => {
    const check = () => {
      const result = fn();
      if (result) {
        r(result);
      } else {
        setTimeout(check);
      }
    };
    check();
  });
}

describeWithDevtoolsExtension('Runtime hosts policy', {hostsPolicy}, context => {
  expectConsoleLogs({error: ['Extension server error: Operation failed: Permission denied']});

  for (const protocol of ['devtools', 'chrome', 'chrome-untrusted', 'chrome-error', 'chrome-search']) {
    it(`blocks API calls on blocked protocols: ${protocol}`, async () => {
      assert.isUndefined(context.chrome.devtools);
      const target = createTarget({type: SDK.Target.Type.FRAME});
      const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');

      target.setInspectedURL(`${protocol}://foo` as Platform.DevToolsPath.UrlString);
      assert.isTrue(addExtensionStub.notCalled);
      assert.isUndefined(context.chrome.devtools);
    });
  }

  it('blocks API calls on blocked hosts', async () => {
    assert.isUndefined(context.chrome.devtools);
    const target = createTarget({type: SDK.Target.Type.FRAME});
    const addExtensionStub = sinon.spy(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');

    target.setInspectedURL(blockedUrl);
    assert.isTrue(addExtensionStub.alwaysReturned(undefined));
    assert.isUndefined(context.chrome.devtools);
  });

  it('allows API calls on allowlisted hosts', async () => {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(allowedUrl);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      // eslint-disable-next-line rulesdir/compare_arrays_with_assert_deepequal
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('allows API calls on non-blocked hosts', async () => {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL('http://example.com2' as Platform.DevToolsPath.UrlString);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      // eslint-disable-next-line rulesdir/compare_arrays_with_assert_deepequal
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('defers loading extensions until after navigation from a blocked to an allowed host', async () => {
    const addExtensionSpy = sinon.spy(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(blockedUrl);
    assert.isTrue(addExtensionSpy.calledOnce, 'addExtension called once');
    assert.deepStrictEqual(addExtensionSpy.returnValues, [undefined]);

    target.setInspectedURL(allowedUrl);
    assert.isTrue(addExtensionSpy.calledTwice, 'addExtension called twice');
    assert.deepStrictEqual(addExtensionSpy.returnValues, [undefined, true]);
  });

  it('does not include blocked hosts in the HAR entries', async () => {
    Logs.NetworkLog.NetworkLog.instance();
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL('http://example.com2' as Platform.DevToolsPath.UrlString);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    createRequest(networkManager, frameId, 'blocked-url-request-id' as Protocol.Network.RequestId, blockedUrl);
    createRequest(networkManager, frameId, 'allowed-url-request-id' as Protocol.Network.RequestId, allowedUrl);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb)) as HAR.Log.LogDTO;
      assert.exists(result.entries.find(e => e.request.url === allowedUrl));
      assert.notExists(result.entries.find(e => e.request.url === blockedUrl));
    }
  });

  async function setUpFrame(
      name: string, url: Platform.DevToolsPath.UrlString, parentFrame?: SDK.ResourceTreeModel.ResourceTreeFrame,
      executionContextOrigin?: Platform.DevToolsPath.UrlString) {
    const parentTarget = parentFrame?.resourceTreeModel()?.target();
    const target = createTarget({id: `${name}-target-id` as Protocol.Target.TargetID, parentTarget});
    const frame = parentFrame ? await addChildFrame(target, {url}) : getMainFrame(target, {url});

    if (executionContextOrigin) {
      executionContextOrigin = new URL(executionContextOrigin).origin as Platform.DevToolsPath.UrlString;
      const parentRuntimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(parentRuntimeModel);
      parentRuntimeModel.executionContextCreated({
        id: 0 as Protocol.Runtime.ExecutionContextId,
        origin: executionContextOrigin,
        name: executionContextOrigin,
        uniqueId: executionContextOrigin,
        auxData: {frameId: frame.id, isDefault: true},
      });
    }

    return frame;
  }

  it('blocks evaluation on blocked subframes', async () => {
    assert.isUndefined(context.chrome.devtools);
    const parentFrameUrl = allowedUrl;
    const childFrameUrl = blockedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl);
    await setUpFrame('child', childFrameUrl, parentFrame);

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            '4', {frameURL: childFrameUrl}, (result, error) => r({result, error})));

    assert.deepStrictEqual(result.error?.details, ['Permission denied']);
  });

  it('doesn\'t block evaluation on blocked sub-executioncontexts with useContentScriptContext', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = allowedUrl;
    const childFrameUrl = `${allowedUrl}/2` as Platform.DevToolsPath.UrlString;
    const childExeContextOrigin = blockedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    const childFrame = await setUpFrame('child', childFrameUrl, parentFrame, childExeContextOrigin);

    // Create a fake content script execution context, i.e., a non-default context with the extension's (== window's)
    // origin.
    const runtimeModel = childFrame.resourceTreeModel()?.target().model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    runtimeModel.executionContextCreated({
      id: 1 as Protocol.Runtime.ExecutionContextId,
      origin: window.location.origin,
      name: window.location.origin,
      uniqueId: window.location.origin,
      auxData: {frameId: childFrame.id, isDefault: false},
    });
    const contentScriptExecutionContext = runtimeModel.executionContext(1);
    assert.exists(contentScriptExecutionContext);
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

    const parentFrameUrl = allowedUrl;
    const childFrameUrl = `${allowedUrl}/2` as Platform.DevToolsPath.UrlString;
    const parentFrame = await setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    const childFrame = await setUpFrame('child', childFrameUrl, parentFrame, parentFrameUrl);

    // Create a non-default context with a blocked origin.
    const childExeContextOrigin = blockedUrl;
    const runtimeModel = childFrame.resourceTreeModel()?.target().model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
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

    const parentFrameUrl = allowedUrl;
    const childFrameUrl = `${allowedUrl}/2` as Platform.DevToolsPath.UrlString;
    const childExeContextOrigin = blockedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    await setUpFrame('child', childFrameUrl, parentFrame, childExeContextOrigin);

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            '4', {frameURL: childFrameUrl}, (result, error) => r({result, error})));

    assert.deepStrictEqual(result.error?.details, ['Permission denied']);
  });

  async function createUISourceCode(
      project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject, url: Platform.DevToolsPath.UrlString) {
    const mimeType = 'text/html';
    const dataProvider = () =>
        Promise.resolve(new TextUtils.ContentData.ContentData('content', /* isBase64 */ false, mimeType));
    project.addUISourceCodeWithProvider(
        new Workspace.UISourceCode.UISourceCode(project, url, Common.ResourceType.resourceTypes.Document),
        new TextUtils.StaticContentProvider.StaticContentProvider(
            url, Common.ResourceType.resourceTypes.Document, dataProvider),
        null, mimeType);
    await project.uiSourceCodeForURL(url)?.requestContentData();
  }

  it('blocks getting resource contents on blocked urls', async () => {
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl);
    await createUISourceCode(project, allowedUrl);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepStrictEqual(resources.map(r => r.url), [blockedUrl, allowedUrl]);

    const resourceContents = await Promise.all(resources.map(
        resource => new Promise<{url: string, content?: string, encoding?: string}>(
            r => resource.getContent((content, encoding) => r({url: resource.url, content, encoding})))));

    assert.deepStrictEqual(resourceContents, [
      {url: blockedUrl, content: undefined, encoding: undefined},
      {url: allowedUrl, content: 'content', encoding: ''},
    ]);
  });

  function createRequest(
      networkManager: SDK.NetworkManager.NetworkManager, frameId: Protocol.Page.FrameId,
      requestId: Protocol.Network.RequestId, url: Platform.DevToolsPath.UrlString): void {
    const request = SDK.NetworkRequest.NetworkRequest.create(requestId, url, url, frameId, null, null, undefined);
    const dataProvider = () =>
        Promise.resolve(new TextUtils.ContentData.ContentData('content', false, request.mimeType));
    request.setContentDataProvider(dataProvider);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestStarted, {request, originalRequest: null});
    request.finished = true;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
  }

  it('does not include blocked hosts in onRequestFinished event listener', async () => {
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const requests: HAR.Log.EntryDTO[] = [];
    // onRequestFinished returns a type of Request. However in actual fact, the returned object contains HAR data
    // which result type mismatch due to the Request type not containing the respective fields in HAR.Log.EntryDTO.
    // Therefore, cast through unknown to resolve this.
    // TODO: (crbug.com/1482763) Update Request type to match HAR.Log.EntryDTO
    context.chrome.devtools?.network.onRequestFinished.addListener(
        r => requests.push(r as unknown as HAR.Log.EntryDTO));
    await waitForFunction(
        () => Extensions.ExtensionServer.ExtensionServer.instance().hasSubscribers(
            Extensions.ExtensionAPI.PrivateAPI.Events.NetworkRequestFinished));

    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    createRequest(networkManager, frameId, 'blocked-url-request-id' as Protocol.Network.RequestId, blockedUrl);
    createRequest(networkManager, frameId, 'allowed-url-request-id' as Protocol.Network.RequestId, allowedUrl);

    await waitForFunction(() => requests.length >= 1);

    assert.strictEqual(requests.length, 1);
    assert.exists(requests.find(e => e.request.url === allowedUrl));
    assert.notExists(requests.find(e => e.request.url === blockedUrl));
  });

  it('blocks setting resource contents on blocked urls', async () => {
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl);
    await createUISourceCode(project, allowedUrl);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepStrictEqual(resources.map(r => r.url), [blockedUrl, allowedUrl]);

    assert.deepStrictEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'content');
    assert.deepStrictEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');
    const responses = await Promise.all(resources.map(
                          resource => new Promise<Object|undefined>(r => resource.setContent('modified', true, r)))) as
        Array<undefined|{code: string, details: string[]}>;

    assert.deepStrictEqual(responses.map(response => response?.code), ['E_FAILED', 'OK']);
    assert.deepStrictEqual(responses.map(response => response?.details), [['Permission denied'], []]);

    assert.deepStrictEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'modified');
    assert.deepStrictEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');
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

  it('cannot inspect chrome webstore URLs', () => {
    const blockedUrls = [
      'http://chrome.google.com/webstore',
      'https://chrome.google.com./webstore',
      'http://chrome.google.com/webstore',
      'https://chrome.google.com./webstore',
      'http://chrome.google.com/webstore/foo',
      'https://chrome.google.com./webstore/foo',
      'http://chrome.google.com/webstore/foo',
      'https://chrome.google.com./webstore/foo',
      'http://chromewebstore.google.com/',
      'https://chromewebstore.google.com./',
      'http://chromewebstore.google.com/',
      'https://chromewebstore.google.com./',
      'http://chromewebstore.google.com/foo',
      'https://chromewebstore.google.com./foo',
      'http://chromewebstore.google.com/foo',
      'https://chromewebstore.google.com./foo',
    ];
    const allowedUrls = [
      'http://chrome.google.com/webstor',
      'https://chrome.google.com./webstor',
      'http://chrome.google.com/webstor',
      'https://chrome.google.com./webstor',
      'http://chrome.google.com/',
      'https://chrome.google.com./',
      'http://chrome.google.com/',
      'https://chrome.google.com./',
      'http://google.com/webstore',
      'https://google.com./webstore',
      'http://google.com/webstore',
      'https://google.com./webstore',
      'http://chromewebstor.google.com/',
      'https://chromewebstor.google.com./',
      'http://chromewebstor.google.com/',
      'https://chromewebstor.google.com./',
    ];
    for (const url of blockedUrls as Platform.DevToolsPath.UrlString[]) {
      assert.isFalse(Extensions.ExtensionServer.ExtensionServer.canInspectURL(url), url);
    }
    for (const url of allowedUrls as Platform.DevToolsPath.UrlString[]) {
      assert.isTrue(Extensions.ExtensionServer.ExtensionServer.canInspectURL(url), url);
    }
  });
});

function assertIsStatus<T>(value: T|
                           Extensions.ExtensionServer.Record): asserts value is Extensions.ExtensionServer.Record {
  if (value && typeof value === 'object' && 'code' in value) {
    assert.isTrue(value.code === 'OK' || Boolean(value.isError), `Value ${value} is not a status code`);
  } else {
    assert.fail(`Value ${value} is not a status code`);
  }
}

describeWithDevtoolsExtension('Wasm extension API', {}, context => {
  let stopId: unknown;
  beforeEach(() => {
    const target = createTarget();
    target.setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);
    const targetManager = target.targetManager();
    const resourceMapping =
        new Bindings.ResourceMapping.ResourceMapping(targetManager, Workspace.Workspace.WorkspaceImpl.instance());
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager});

    const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    callFrame.debuggerModel = new SDK.DebuggerModel.DebuggerModel(target);
    sinon.stub(callFrame, 'id').get(() => '0' as Protocol.Debugger.CallFrameId);
    sinon.stub(callFrame.debuggerModel.agent, 'invoke_evaluateOnCallFrame')
        .returns(
            Promise.resolve({result: {type: Protocol.Runtime.RemoteObjectType.Undefined}, getError: () => undefined}));
    stopId = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pluginManager.stopIdForCallFrame(
        callFrame);
  });

  function captureError(expectedMessage: string): sinon.SinonStub {
    const original = console.error;
    return sinon.stub(console, 'error').callsFake((message, ...args) => {
      if (expectedMessage !== message) {
        original(message, ...args);
      }
    });
  }

  it('getWasmGlobal does not block on invalid indices', async () => {
    const log = captureError('Extension server error: Invalid argument global: No global with index 0');
    const result = await context.chrome.devtools?.languageServices.getWasmGlobal(0, stopId);
    assertIsStatus(result);
    assert.isTrue(log.calledOnce);
    assert.strictEqual(result.code, 'E_BADARG');
    assert.strictEqual(result.details[0], 'global');
  });

  it('getWasmLocal does not block on invalid indices', async () => {
    const log = captureError('Extension server error: Invalid argument local: No local with index 0');
    const result = await context.chrome.devtools?.languageServices.getWasmLocal(0, stopId);
    assertIsStatus(result);
    assert.isTrue(log.calledOnce);
    assert.strictEqual(result.code, 'E_BADARG');
    assert.strictEqual(result.details[0], 'local');
  });

  it('getWasmOp does not block on invalid indices', async () => {
    const log = captureError('Extension server error: Invalid argument op: No operand with index 0');
    const result = await context.chrome.devtools?.languageServices.getWasmOp(0, stopId);
    assertIsStatus(result);
    assert.isTrue(log.calledOnce);
    assert.strictEqual(result.code, 'E_BADARG');
    assert.strictEqual(result.details[0], 'op');
  });
});

describeWithDevtoolsExtension('Language Extension API', {}, context => {
  it('reports loaded resources', async () => {
    const target = createTarget();
    target.setInspectedURL('http://example.com' as Platform.DevToolsPath.UrlString);

    const pageResourceLoader =
        SDK.PageResourceLoader.PageResourceLoader.instance({forceNew: true, loadOverride: null, maxConcurrentLoads: 1});
    const spy = sinon.spy(pageResourceLoader, 'resourceLoadedThroughExtension');
    await context.chrome.devtools?.languageServices.reportResourceLoad('test.dwo', {success: true, size: 10});

    assert.isTrue(spy.calledOnce);
    assert.strictEqual(pageResourceLoader.getNumberOfResources().resources, 1);

    const resource = spy.args[0][0];
    const extensionId = getExtensionOrigin();
    const expectedInitiator =
        {target: null, frameId: null, initiatorUrl: extensionId as Platform.DevToolsPath.UrlString, extensionId};
    const expectedResource = {
      url: 'test.dwo' as Platform.DevToolsPath.UrlString,
      initiator: expectedInitiator,
      success: true,
      size: 10,
      errorMessage: undefined,
    };
    assert.deepEqual(resource, expectedResource);
  });
});
