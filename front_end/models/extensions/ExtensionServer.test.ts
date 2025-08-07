// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {
  describeWithDevtoolsExtension,
  getExtensionOrigin,
} from '../../testing/ExtensionHelpers.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import {addChildFrame, FRAME_URL, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Bindings from '../bindings/bindings.js';
import * as Extensions from '../extensions/extensions.js';
import type * as HAR from '../har/har.js';
import * as Logs from '../logs/logs.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

const {urlString} = Platform.DevToolsPath;

describeWithDevtoolsExtension('Extensions', {}, context => {
  it('are initialized after the target is initialized and navigated to a non-privileged URL', async () => {
    // This check is a proxy for verifying that the extension has been initialized. Outside of the test the extension
    // API is available as soon as the extension page is loaded, which we don't do in the test.
    assert.isUndefined(context.chrome.devtools);

    const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    createTarget().setInspectedURL(urlString`http://example.com`);
    sinon.assert.calledOnceWithExactly(addExtensionStub, context.extensionDescriptor);
  });

  it('are not initialized before the target is initialized and navigated to a non-privileged URL', async () => {
    // This check is a proxy for verifying that the extension has been initialized. Outside of the test the extension
    // API is available as soon as the extension page is loaded, which we don't do in the test.
    assert.isUndefined(context.chrome.devtools);

    const addExtensionStub = sinon.stub(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    createTarget().setInspectedURL(urlString`chrome://version`);
    sinon.assert.notCalled(addExtensionStub);
  });

  it('defers loading extensions until after navigation from a privileged to a non-privileged host', async () => {
    const addExtensionSpy = sinon.spy(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`chrome://abcdef`);
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

    assert.deepEqual(resources.map(r => r.url), ['https://example.com/', 'http://example.com']);
  });

  describe('Resource', () => {
    let target: SDK.Target.Target;
    let project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject;

    beforeEach(() => {
      target = createTarget();
      const inspectedUrl = urlString`https://www.example.com/`;
      target.setInspectedURL(inspectedUrl);

      project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
          Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
          false /* isServiceProject */);

      const targetManager = target.targetManager();
      const resourceMapping =
          new Bindings.ResourceMapping.ResourceMapping(targetManager, Workspace.Workspace.WorkspaceImpl.instance());
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
      });
    });

    describe('setFunctionRangesForScript', () => {
      expectConsoleLogs({
        error: [
          'Extension server error: Invalid argument command: expected a source map script resource for url: https://example.com/',
          'Extension server error: Invalid argument command: expected valid scriptUrl and non-empty NamedFunctionRanges'
        ],
      });

      const validFunctionRanges = [{start: {line: 0, column: 0}, end: {line: 10, column: 1}, name: 'foo'}];
      it('correctly calls DebuggerWorkspaceBindings.setFunctionRanges via Resource.setFunctionRangesForScript API',
         async () => {
           // create a mock uiSourceCode for the sourceMap script
           const scriptUrl = urlString`https://example.com/foo.js.map/foo.js`;
           project.addUISourceCode(
               new Workspace.UISourceCode.UISourceCode(
                   project, scriptUrl, Common.ResourceType.resourceTypes.SourceMapScript),
           );
           const uiSourceCode = project.uiSourceCodeForURL(scriptUrl);
           assert.exists(uiSourceCode);
           assert.exists(context.chrome.devtools);

           const resources = await new Promise<Chrome.DevTools.Resource[]>(
               r => context.chrome.devtools?.inspectedWindow.getResources(r));

           const nonSourceMapScripts = resources.filter(r => r.type !== 'sm-script');
           const sourceMapScripts = resources.filter(r => r.type === 'sm-script');

           const workspaceBindingSetFunctionRangesStub =
               sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), 'setFunctionRanges');

           // The assert.throws() helper does not work with async/await, hence the manual try catch
           let didThrow = false;
           try {
             // Should throw if called with a non-sourceMap script
             await nonSourceMapScripts[0].setFunctionRangesForScript(validFunctionRanges);
           } catch (e) {
             didThrow = true;
             assertIsStatus(e);
             assert.strictEqual(e.code, 'E_BADARG');
           }
           assert.isTrue(didThrow, 'SetFunctionRangesForScript did not throw an error as expected.');

           try {
             // Should throw if called with invalid/empty ranges
             await sourceMapScripts[0].setFunctionRangesForScript([/** empty ranges */]);
           } catch (e) {
             didThrow = true;
             assertIsStatus(e);
             assert.strictEqual(e.code, 'E_BADARG');
           }
           assert.isTrue(didThrow, 'SetFunctionRangesForScript did not throw an error as expected.');
           sinon.assert.notCalled(workspaceBindingSetFunctionRangesStub);
           await sourceMapScripts[0].setFunctionRangesForScript(validFunctionRanges);
           sinon.assert.calledOnceWithExactly(workspaceBindingSetFunctionRangesStub, uiSourceCode, validFunctionRanges);
         });
    });

    it('returns the buildId', async () => {
      const stubScript = sinon.createStubInstance(SDK.Script.Script);
      // @ts-expect-error
      stubScript.buildId = 'my-build-id';
      sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), 'scriptsForUISourceCode')
          .returns([stubScript]);
      project.addUISourceCode(
          new Workspace.UISourceCode.UISourceCode(
              project, urlString`http://example.com/index.js`, Common.ResourceType.resourceTypes.Script),
      );

      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));

      assert.strictEqual(resources[0].url, 'http://example.com/index.js');
      assert.strictEqual(resources[0].buildId, 'my-build-id');
    });
  });
});

describeWithDevtoolsExtension('Extensions', {}, context => {
  beforeEach(() => {
    createTarget().setInspectedURL(urlString`http://example.com`);
  });

  it('can register and unregister a global open resource handler', async () => {
    const registerLinkHandlerSpy = spyCall(Components.Linkifier.Linkifier, 'registerLinkHandler');
    const unregisterLinkHandlerSpy = spyCall(Components.Linkifier.Linkifier, 'unregisterLinkHandler');

    // Register without a specific scheme (global handler).
    context.chrome.devtools?.panels.setOpenResourceHandler(() => {});

    const registration = await (await registerLinkHandlerSpy).args[0];
    assert.strictEqual(registration.title, 'TestExtension');
    assert.isUndefined(registration.scheme);
    assert.isFunction(registration.handler);
    assert.isFunction(registration.shouldHandleOpenResource);

    // Now unregister the extension.
    context.chrome.devtools?.panels.setOpenResourceHandler();

    const unregistration = await (await unregisterLinkHandlerSpy).args[0];
    assert.strictEqual(unregistration.title, 'TestExtension');
    assert.isUndefined(unregistration.scheme);
    assert.isFunction(unregistration.handler);
    assert.isFunction(unregistration.shouldHandleOpenResource);
  });

  it('can register and unregister a scheme specific open resource handler', async () => {
    const registerLinkHandlerSpy = spyCall(Components.Linkifier.Linkifier, 'registerLinkHandler');
    const unregisterLinkHandlerSpy = spyCall(Components.Linkifier.Linkifier, 'unregisterLinkHandler');

    context.chrome.devtools?.panels.setOpenResourceHandler(() => {}, 'foo-extension:');

    const registration = await (await registerLinkHandlerSpy).args[0];
    assert.strictEqual(registration.title, 'TestExtension');
    assert.strictEqual(registration.scheme, 'foo-extension:');
    assert.isFunction(registration.handler);
    assert.isFunction(registration.shouldHandleOpenResource);

    // Now unregister the extension.
    context.chrome.devtools?.panels.setOpenResourceHandler();

    const unregistration = await (await unregisterLinkHandlerSpy).args[0];
    assert.strictEqual(unregistration.title, 'TestExtension');
    assert.isUndefined(unregistration.scheme);
    assert.isFunction(unregistration.handler);
    assert.isFunction(unregistration.shouldHandleOpenResource);
  });
});

describeWithDevtoolsExtension('Extensions', {}, context => {
  expectConsoleLogs({
    warn: ['evaluate: the main frame is not yet available'],
    error: [
      'Extension server error: Object not found: <top>',
      'Extension server error: Operation failed: https://example.com/ has no execution context'
    ],
  });
  beforeEach(() => {
    createTarget().setInspectedURL(urlString`http://example.com`);
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
    assert.lengthOf(manager.plugins(), 1);
    const plugin = manager.plugins()[0];

    const result = await plugin.stringify({
      name: 'test',
      steps: [],
    });

    const stepResult = await plugin.stringifyStep({
      type: 'scroll',
    });

    assert.lengthOf(manager.plugins(), 1);
    assert.strictEqual(manager.plugins()[0].getMediaType(), 'text/javascript');
    assert.strictEqual(manager.plugins()[0].getName(), 'Test');
    assert.deepEqual(manager.plugins()[0].getCapabilities(), ['export']);
    assert.deepEqual(result, '{"name":"test","steps":[]}');
    assert.deepEqual(stepResult, '{"type":"scroll"}');

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
    assert.lengthOf(manager.plugins(), 1);
    const plugin = manager.plugins()[0];

    await plugin.replay({
      name: 'test',
      steps: [],
    });

    assert.lengthOf(manager.plugins(), 1);
    assert.deepEqual(manager.plugins()[0].getCapabilities(), ['replay']);
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

    assert.lengthOf(manager.plugins(), 1);

    const plugin = manager.plugins()[0];

    const stub = sinon.stub(UI.InspectorView.InspectorView.instance(), 'showPanel').callsFake(() => Promise.resolve());
    await plugin.replay({
      name: 'test',
      steps: [],
    });

    sinon.assert.called(stub);

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

    assert.lengthOf(manager.plugins(), 1);
    assert.lengthOf(manager.views(), 1);

    const plugin = manager.plugins()[0];
    const onceShowRequested = manager.once(Extensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED);
    await plugin.replay({
      name: 'test',
      steps: [],
    });
    const viewDescriptor = await onceShowRequested;
    assert.deepEqual(viewDescriptor.title, 'Test');

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

    assert.lengthOf(manager.plugins(), 1);
    assert.lengthOf(manager.views(), 1);

    const events: object[] = [];
    manager.addEventListener(Extensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED, event => {
      events.push(event);
    });
    view?.show();

    // Sending inspectedWindow.eval should flush the message queue and make sure
    // that the ShowViewRequested command was not actually dispatched.
    await new Promise(resolve => context.chrome.devtools?.inspectedWindow.eval('1', undefined, resolve));

    assert.deepEqual(events, []);
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
    assert.deepEqual(viewDescriptor.title, 'Test');

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
    sinon.assert.calledOnce(reloadStub);
    sinon.assert.notCalled(secondReloadStub);
  });

  it('correcly installs blocked extensions after navigation', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.isOk(target);
    target.setInspectedURL(urlString`chrome://version`);
    const extensionServer = Extensions.ExtensionServer.ExtensionServer.instance();

    const addExtensionSpy = sinon.spy(extensionServer, 'addExtension');

    assert.isUndefined(extensionServer.addExtension({
      startPage: 'about:blank',
      name: 'ext',
      exposeExperimentalAPIs: false,
    }));
    target.setInspectedURL(urlString`http://example.com`);

    assert.deepEqual(addExtensionSpy.returnValues, [undefined, true]);
  });

  it('correcly reenables extensions after navigation', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.isOk(target);
    const extensionServer = Extensions.ExtensionServer.ExtensionServer.instance();

    assert.isTrue(extensionServer.isEnabledForTest);
    target.setInspectedURL(urlString`chrome://version`);
    assert.isFalse(extensionServer.isEnabledForTest);
    target.setInspectedURL(urlString`http://example.com`);
    assert.isTrue(extensionServer.isEnabledForTest);
  });
});

const allowedUrl = FRAME_URL;
const blockedUrl = urlString`http://web.dev`;
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

      target.setInspectedURL(urlString`${`${protocol}://foo`}`);
      sinon.assert.notCalled(addExtensionStub);
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
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('allows API calls on non-blocked hosts', async () => {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`http://example.com2`);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('defers loading extensions until after navigation from a blocked to an allowed host', async () => {
    const addExtensionSpy = sinon.spy(Extensions.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(blockedUrl);
    assert.isTrue(addExtensionSpy.calledOnce, 'addExtension called once');
    assert.deepEqual(addExtensionSpy.returnValues, [undefined]);

    target.setInspectedURL(allowedUrl);
    assert.isTrue(addExtensionSpy.calledTwice, 'addExtension called twice');
    assert.deepEqual(addExtensionSpy.returnValues, [undefined, true]);
  });

  it('does not include blocked hosts in the HAR entries', async () => {
    Logs.NetworkLog.NetworkLog.instance();
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`http://example.com2`);
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
      executionContextOrigin = urlString`${new URL(executionContextOrigin).origin}`;
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

    assert.deepEqual(result.error?.details, ['Permission denied']);
  });

  it('doesn\'t block evaluation on blocked sub-executioncontexts with useContentScriptContext', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = allowedUrl;
    const childFrameUrl = urlString`${`${allowedUrl}/2`}`;
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

    assert.deepEqual(result.result, 4);
  });

  it('blocks evaluation on blocked sub-executioncontexts with explicit scriptExecutionContextOrigin', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = allowedUrl;
    const childFrameUrl = urlString`${`${allowedUrl}/2`}`;
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

    assert.deepEqual(result.error?.details, ['Permission denied']);
  });

  it('blocks evaluation on blocked sub-executioncontexts', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = allowedUrl;
    const childFrameUrl = urlString`${`${allowedUrl}/2`}`;
    const childExeContextOrigin = blockedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    await setUpFrame('child', childFrameUrl, parentFrame, childExeContextOrigin);

    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            '4', {frameURL: childFrameUrl}, (result, error) => r({result, error})));

    assert.deepEqual(result.error?.details, ['Permission denied']);
  });

  async function createUISourceCode(
      project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject, url: Platform.DevToolsPath.UrlString,
      contentType = Common.ResourceType.resourceTypes.Document) {
    const mimeType = 'text/html';
    const dataProvider = () =>
        Promise.resolve(new TextUtils.ContentData.ContentData('content', /* isBase64 */ false, mimeType));
    project.addUISourceCodeWithProvider(
        new Workspace.UISourceCode.UISourceCode(project, url, contentType),
        new TextUtils.StaticContentProvider.StaticContentProvider(url, contentType, dataProvider), null, mimeType);
    await project.uiSourceCodeForURL(url)?.requestContentData();
  }

  it('blocks getting resource contents on blocked urls', async () => {
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(sinon.createStubInstance(
            Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, {scriptsForUISourceCode: []}));
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl);
    await createUISourceCode(project, allowedUrl);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepEqual(resources.map(r => r.url), [allowedUrl]);

    const resourceContents = await Promise.all(resources.map(
        resource => new Promise<{url: string, content?: string, encoding?: string}>(
            r => resource.getContent((content, encoding) => r({url: resource.url, content, encoding})))));

    assert.deepEqual(resourceContents, [
      {url: allowedUrl, content: 'content', encoding: ''},
    ]);
  });

  it('allows arbitrary schemes in sourceURL comments, as long as the inspected target is allowed', async () => {
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const script = sinon.createStubInstance(SDK.Script.Script, {target, contentURL: blockedUrl});
    script.hasSourceURL = true;
    const workspaceBinding = sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    workspaceBinding.scriptsForUISourceCode.callsFake(uiSourceCode => {
      if (uiSourceCode.contentURL() === blockedUrl) {
        return [script];
      }
      return [];
    });
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance').returns(workspaceBinding);
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl, Common.ResourceType.resourceTypes.Script);
    await createUISourceCode(project, allowedUrl, Common.ResourceType.resourceTypes.Script);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepEqual(resources.map(r => r.url), [blockedUrl, allowedUrl]);
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

    assert.lengthOf(requests, 1);
    assert.exists(requests.find(e => e.request.url === allowedUrl));
    assert.notExists(requests.find(e => e.request.url === blockedUrl));
  });

  it('blocks setting resource contents on blocked urls', async () => {
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(sinon.createStubInstance(
            Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, {scriptsForUISourceCode: []}));
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl);
    await createUISourceCode(project, allowedUrl);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepEqual(resources.map(r => r.url), [allowedUrl]);

    assert.deepEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'content');
    assert.deepEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');
    const responses = await Promise.all(resources.map(
                          resource => new Promise<Object|undefined>(r => resource.setContent('modified', true, r)))) as
        Array<undefined|{code: string, details: string[]}>;

    assert.deepEqual(responses.map(response => response?.code), ['OK']);
    assert.deepEqual(responses.map(response => response?.details), [[]]);

    assert.deepEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'modified');
    assert.deepEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');
  });
});

describe('ExtensionServer', () => {
  it('can correctly expand resource paths', async () => {
    // Ideally this would be a chrome-extension://, but that doesn't work with URL in chrome headless.
    const extensionOrigin = urlString`chrome://abcdef`;
    const almostOrigin = urlString`${`${extensionOrigin}/`}`;
    const expectation = urlString`${`${extensionOrigin}/foo`}`;
    assert.isUndefined(
        Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, 'http://example.com/foo'));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, expectation));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, '/foo'));
    assert.strictEqual(
        expectation, Extensions.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, 'foo'));

    assert.isUndefined(
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

  it('cannot inspect non-HTTP URL schemes', () => {
    const blockedUrls = [
      'devtools://devtools/bundled/front_end/devtools_app.html',
      'devtools://devtools/anything',
      'chrome://extensions',
      'chrome-untrusted://extensions',
      'chrome-error://crash',
      'chrome-search://foo/bar',
    ];
    for (const url of blockedUrls as Platform.DevToolsPath.UrlString[]) {
      assert.isFalse(Extensions.ExtensionServer.ExtensionServer.canInspectURL(url), url);
    }
  });
});

function assertIsStatus<T>(value: T|Extensions.ExtensionServer.Record):
    asserts value is Extensions.ExtensionServer.Record {
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
    target.setInspectedURL(urlString`http://example.com`);
    const targetManager = target.targetManager();
    const resourceMapping =
        new Bindings.ResourceMapping.ResourceMapping(targetManager, Workspace.Workspace.WorkspaceImpl.instance());
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
    });

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
    sinon.assert.calledOnce(log);
    assert.strictEqual(result.code, 'E_BADARG');
    assert.strictEqual(result.details[0], 'global');
  });

  it('getWasmLocal does not block on invalid indices', async () => {
    const log = captureError('Extension server error: Invalid argument local: No local with index 0');
    const result = await context.chrome.devtools?.languageServices.getWasmLocal(0, stopId);
    assertIsStatus(result);
    sinon.assert.calledOnce(log);
    assert.strictEqual(result.code, 'E_BADARG');
    assert.strictEqual(result.details[0], 'local');
  });

  it('getWasmOp does not block on invalid indices', async () => {
    const log = captureError('Extension server error: Invalid argument op: No operand with index 0');
    const result = await context.chrome.devtools?.languageServices.getWasmOp(0, stopId);
    assertIsStatus(result);
    sinon.assert.calledOnce(log);
    assert.strictEqual(result.code, 'E_BADARG');
    assert.strictEqual(result.details[0], 'op');
  });
});

class StubLanguageExtension implements Chrome.DevTools.LanguageExtensionPlugin {
  async addRawModule(): Promise<string[]|{missingSymbolFiles: string[]}> {
    return [];
  }
  async sourceLocationToRawLocation(): Promise<Chrome.DevTools.RawLocationRange[]> {
    return [];
  }
  async rawLocationToSourceLocation(): Promise<Chrome.DevTools.SourceLocation[]> {
    return [];
  }
  async getScopeInfo(): Promise<Chrome.DevTools.ScopeInfo> {
    throw new Error('Method not implemented.');
  }
  async listVariablesInScope(): Promise<Chrome.DevTools.Variable[]> {
    return [];
  }
  async removeRawModule(): Promise<void> {
  }
  async getFunctionInfo(): Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
                                   {missingSymbolFiles: string[]}|{frames: Chrome.DevTools.FunctionInfo[]}> {
    return {frames: []};
  }
  async getInlinedFunctionRanges(): Promise<Chrome.DevTools.RawLocationRange[]> {
    return [];
  }
  async getInlinedCalleesRanges(): Promise<Chrome.DevTools.RawLocationRange[]> {
    return [];
  }
  async getMappedLines(): Promise<number[]|undefined> {
    return undefined;
  }
  async evaluate(): Promise<Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject|null> {
    return null;
  }
  async getProperties(): Promise<Chrome.DevTools.PropertyDescriptor[]> {
    return [];
  }
  async releaseObject(): Promise<void> {
  }
}

describeWithDevtoolsExtension('Language Extension API', {}, context => {
  it('reports loaded resources', async () => {
    const target = createTarget();
    target.setInspectedURL(urlString`http://example.com`);

    const pageResourceLoader =
        SDK.PageResourceLoader.PageResourceLoader.instance({forceNew: true, loadOverride: null, maxConcurrentLoads: 1});
    const spy = sinon.spy(pageResourceLoader, 'resourceLoadedThroughExtension');
    await context.chrome.devtools?.languageServices.reportResourceLoad('test.dwo', {success: true, size: 10});

    sinon.assert.calledOnce(spy);
    assert.strictEqual(pageResourceLoader.getNumberOfResources().resources, 1);

    const resource = spy.args[0][0];
    const extensionId = getExtensionOrigin();
    const expectedInitiator = {target: null, frameId: null, initiatorUrl: urlString`${extensionId}`, extensionId};
    const expectedResource = {
      url: urlString`test.dwo`,
      initiator: expectedInitiator,
      success: true,
      size: 10,
      duration: null,
      errorMessage: undefined,
    };
    assert.deepEqual(resource, expectedResource);
  });
});

for (const allowFileAccess of [true, false]) {
  describeWithDevtoolsExtension(
      `Language Extension API with {allowFileAccess: ${allowFileAccess}}`, {allowFileAccess}, context => {
        let target: SDK.Target.Target;
        beforeEach(() => {
          target = createTarget();
          const targetManager = target.targetManager();
          const workspace = Workspace.Workspace.WorkspaceImpl.instance();
          const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
          target.setInspectedURL(urlString`http://example.com`);
          const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
          Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
            forceNew: true,
            resourceMapping,
            targetManager,
            ignoreListManager,
          });
        });

        it('passes allowFileAccess to the LanguageExtensionEndpoint', async () => {
          const endpointSpy =
              sinon.spy(Extensions.LanguageExtensionEndpoint.LanguageExtensionEndpoint.prototype, 'handleScript');
          const plugin = new StubLanguageExtension();
          await context.chrome.devtools?.languageServices.registerLanguageExtensionPlugin(plugin, 'plugin', {
            language: Protocol.Debugger.ScriptLanguage.JavaScript,
            symbol_types: [Protocol.Debugger.DebugSymbolsType.SourceMap],
          });

          const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
          assert.isOk(debuggerModel);
          debuggerModel.parsedScriptSource(
              '0' as Protocol.Runtime.ScriptId, urlString`file:///source/url`, 0, 0, 100, 100, 0, '', {}, false,
              'file:///source/url.map', false, false, 200, true, null, null,
              Protocol.Debugger.ScriptLanguage.JavaScript, [{
                type: Protocol.Debugger.DebugSymbolsType.SourceMap,
                externalURL: 'file:///source/url.map',
              }],
              null, null);

          sinon.assert.calledOnce(endpointSpy);
          assert.strictEqual(
              (endpointSpy.thisValues[0] as Extensions.LanguageExtensionEndpoint.LanguageExtensionEndpoint)
                  .allowFileAccess,
              allowFileAccess);
        });
      });
}

describeWithDevtoolsExtension('validate attachSourceMapURL ', {}, context => {
  it('correctly attaches a source map to a registered script', async () => {
    const sourceRoot = 'http://example.com';
    const scriptName = 'script.ts';
    const scriptInfo = {
      url: urlString`${sourceRoot}/script.js`,
      content: 'function f(x) { console.log(x); } function ignore(y){ console.log(y); }',
    };
    const sourceMap = encodeSourceMap(
        [
          `0:9 => ${scriptName}:0:1`,
          `1:0 => ${scriptName}:4:0`,
          `1:2 => ${scriptName}:4:2`,
          `2:0 => ${scriptName}:2:0`,
        ],
        sourceRoot);

    const sourceMapString = {
      version: 3,
      names: ['f', 'console', 'log', 'ignore'],
      sources: [scriptInfo.url],
      mappings: sourceMap.mappings,
      file: `${scriptInfo.url}.map`,
    };

    const target = createTarget({type: SDK.Target.Type.FRAME});
    const targetManager = target.targetManager();
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
    });
    const backend = new MockProtocolBackend();

    // Before any script is registered, there shouldn't be any uiSourceCodes.
    assert.isNull(Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(scriptInfo.url));

    // Create promise to await the uiSourceCode given the url and its target.
    const uiSourceCodePromise = debuggerWorkspaceBinding.waitForUISourceCodeAdded(scriptInfo.url, target);

    // Register the script.
    const currentScript = await backend.addScript(target, scriptInfo, null);

    // Await the promise for sourceCode to be added.
    await uiSourceCodePromise;

    assert.exists(context.chrome.devtools);

    const resources = await new Promise<Chrome.DevTools.Resource[]>(r => {
      context.chrome.devtools?.inspectedWindow.getResources(r);
    });

    // Validate that resource is registered.
    assert.isTrue(resources && resources.length > 0);

    // Script should not have a source map url attached yet.
    assert.notExists(currentScript.sourceMapURL);

    // Call attachSourceMapURL with encoded source map as a dataURL
    const scriptResource = resources.find(item => item.url === scriptInfo.url.toString());
    const encodedSourceMap = `data:text/plain;base64,${btoa(JSON.stringify(sourceMapString))}`;

    await scriptResource?.attachSourceMapURL(encodedSourceMap);

    // Validate that the script has the sourcemap dataURL attached.
    assert.deepEqual(currentScript.sourceMapURL, encodedSourceMap);
  });
});
