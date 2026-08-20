// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Extensions from '../../models/extensions/extensions.js';
import type * as HAR from '../../models/har/har.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {
  type ExtensionContext,
  getExtensionOrigin,
  setupDevtoolsExtensionHooks,
} from '../../testing/ExtensionHelpers.js';
import type {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {addChildFrame, FRAME_URL, getMainFrame, mockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

const {urlString} = Platform.DevToolsPath;

interface TestHARLog {
  entries: Array<{
    request: {
      url: string,
    },
  }&Chrome.DevTools.Request>;
}

function getBackend(context: ExtensionContext): MockDebuggerBackend {
  assert.exists(context.backend);
  return context.backend as MockDebuggerBackend;
}

describe('Extensions', () => {
  const context = setupDevtoolsExtensionHooks();

  it('are initialized after the target is initialized and navigated to a non-privileged URL', async () => {
    // This check is a proxy for verifying that the extension has been initialized. Outside of the test the extension
    // API is available as soon as the extension page is loaded, which we don't do in the test.
    assert.isUndefined(context.chrome.devtools);

    const addExtensionStub = sinon.stub(PanelCommon.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    getBackend(context).createTarget().setInspectedURL(urlString`http://example.com`);
    sinon.assert.calledOnceWithExactly(addExtensionStub, context.extensionDescriptor);
  });

  it('are not initialized before the target is initialized and navigated to a non-privileged URL', async () => {
    // This check is a proxy for verifying that the extension has been initialized. Outside of the test the extension
    // API is available as soon as the extension page is loaded, which we don't do in the test.
    assert.isUndefined(context.chrome.devtools);

    const addExtensionStub = sinon.stub(PanelCommon.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    getBackend(context).createTarget().setInspectedURL(urlString`chrome://version`);
    sinon.assert.notCalled(addExtensionStub);
  });

  it('applies network.addRequestHeaders when no host policy is configured', async () => {
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`http://example.com`);
    assert.exists(context.chrome.devtools);

    const headersCall = spyCall(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'setExtraHTTPHeaders');

    const networkApi = context.chrome.devtools?.network as Extensions.ExtensionAPI.PrivateAPI.Network;
    networkApi.addRequestHeaders({'X-Test': 'v'});

    const {args} = await headersCall;
    assert.deepEqual(args[0], {'X-Test': 'v'});
  });

  it('defers loading extensions until after navigation from a privileged to a non-privileged host', async () => {
    const addExtensionSpy = sinon.spy(PanelCommon.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`chrome://abcdef`);
    assert.isTrue(addExtensionSpy.notCalled, 'addExtension not called');

    target.setInspectedURL(allowedUrl);
    assert.isTrue(addExtensionSpy.calledOnce, 'addExtension called once');
    assert.isTrue(addExtensionSpy.returned(true), 'addExtension returned true');
  });

  it('only returns page resources for allowed targets', async () => {
    const urls = ['http://example.com', 'chrome://version'] as Platform.DevToolsPath.UrlString[];
    const targets = urls.map(async url => {
      const target = getBackend(context).createTarget({url});
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.isNotNull(resourceTreeModel);
      if (!resourceTreeModel.cachedResourcesLoaded()) {
        await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
      }
      target.setInspectedURL(url);
      const mainFrame = getMainFrame(target, {url});
      mainFrame.addResource(new SDK.Resource.Resource(resourceTreeModel, null, url, url, null, null,
                                                      Common.ResourceType.resourceTypes.Document, 'application/text',
                                                      null, null));
      return target;
    });

    await Promise.all(targets);

    const resources = await context.chrome.devtools!.inspectedWindow.getResources();

    assert.deepEqual(resources.map(r => r.url), ['http://example.com']);
  });

  describe('Resource', () => {
    let target: SDK.Target.Target;
    let project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject;

    beforeEach(() => {
      target = getBackend(context).createTarget();
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
        workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      });
    });

    describe('setFunctionRangesForScript', () => {
      expectConsoleLogs({
        error: [
          'Extension server error: Invalid argument command: expected a source map script resource for url: https://example.com/',
          'Extension server error: Invalid argument command: expected valid scriptUrl and non-empty NamedFunctionRanges',
        ],
      });

      const validFunctionRanges = [{start: {line: 0, column: 0}, end: {line: 10, column: 1}, name: 'foo'}];
      it('correctly calls DebuggerWorkspaceBindings.setFunctionRanges via Resource.setFunctionRangesForScript API',
         async () => {
           // create a mock uiSourceCode for the sourceMap script
           const scriptUrl = urlString`https://example.com/foo.js.map/foo.js`;
           project.addUISourceCode(
               new Workspace.UISourceCode.UISourceCode(project, scriptUrl,
                                                       Common.ResourceType.resourceTypes.SourceMapScript),
           );
           // create a mock uiSourceCode for the non-sourceMap script
           const normalScriptUrl = urlString`https://example.com/normal.js`;
           project.addUISourceCode(
               new Workspace.UISourceCode.UISourceCode(project, normalScriptUrl,
                                                       Common.ResourceType.resourceTypes.Script),
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
      stubScript.target.returns(target);
      stubScript.contentURL.returns(urlString`http://example.com/index.js`);
      stubScript.hasSourceURL = false;
      sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), 'scriptsForUISourceCode')
          .returns([stubScript]);
      project.addUISourceCode(
          new Workspace.UISourceCode.UISourceCode(project, urlString`http://example.com/index.js`,
                                                  Common.ResourceType.resourceTypes.Script),
      );

      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));

      assert.strictEqual(resources[0].url, 'http://example.com/index.js');
      assert.strictEqual(resources[0].buildId, 'my-build-id');
    });
  });
});

describe('Extensions', () => {
  const context = setupDevtoolsExtensionHooks();

  beforeEach(() => {
    getBackend(context).createTarget().setInspectedURL(urlString`http://example.com`);
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
});

describe('Extensions', () => {
  const context = setupDevtoolsExtensionHooks();

  expectConsoleLogs({
    error: [
      'Extension server error: Invalid argument urlScheme: Scheme is forbidden',
      'Extension server error: Invalid argument urlScheme: Scheme is forbidden',
    ],
  });
  beforeEach(() => {
    getBackend(context).createTarget().setInspectedURL(Platform.DevToolsPath.urlString`http://example.com`);
  });

  it('cannot register an open resource handler for forbidden schemes', async () => {
    const registerLinkHandlerSpy = sinon.spy(Components.Linkifier.Linkifier, 'registerLinkHandler');

    context.chrome.devtools?.panels.setOpenResourceHandler(() => {}, 'chrome:');
    context.chrome.devtools?.panels.setOpenResourceHandler(() => {}, 'file:');

    // Wait for the messages to be processed by sending a dummy eval request
    await new Promise(resolve => context.chrome.devtools?.inspectedWindow.eval('1', undefined, resolve));

    sinon.assert.notCalled(registerLinkHandlerSpy);
  });
});

describe('Extensions', () => {
  const context = setupDevtoolsExtensionHooks();

  beforeEach(() => {
    getBackend(context).createTarget().setInspectedURL(Platform.DevToolsPath.urlString`http://example.com`);
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

describe('Extensions', () => {
  const context = setupDevtoolsExtensionHooks();

  expectConsoleLogs({
    warn: ['evaluate: the main frame is not yet available'],
    error: [
      'Extension server error: Object not found: <top>',
      'Extension server error: Operation failed: https://example.com/ has no execution context',
    ],
  });
  beforeEach(() => {
    getBackend(context).createTarget().setInspectedURL(urlString`http://example.com`);
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
    const panel = await context.chrome.devtools?.panels.create('Test', 'test.png', 'test.html');
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

  it('cannot show a Recorder view registered by another extension', async () => {
    const view = await context.chrome.devtools?.recorder.createView('Test', 'test.html');
    assert.isNotNull(view);
    const viewId = (view as unknown as {_id: string})._id;

    const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
    const attackerOrigin = Platform.DevToolsPath.urlString`chrome-extension://attacker`;
    const attackerDescriptor = {
      startPage: `${attackerOrigin}/blank.html`,
      name: 'AttackerExtension',
      exposeExperimentalAPIs: true,
      allowFileAccess: false,
    };
    server.addExtension(attackerDescriptor);

    const channel = new MessageChannel();
    (server as unknown as {
      registerExtension: (origin: Platform.DevToolsPath.UrlString, port: MessagePort) => void,
    }).registerExtension(attackerOrigin, channel.port1);

    const responsePromise = new Promise<{
      command: string,
      connectId: number,
      result: PanelCommon.ExtensionServer.Record,
    }>(resolve => {
      channel.port2.onmessage = (event: MessageEvent<{
        command: string,
        connectId: number,
        result: PanelCommon.ExtensionServer.Record,
      }>) => resolve(event.data);
    });
    channel.port2.postMessage({
      command: 'showRecorderView',
      id: viewId,
      requestId: 123,
    });

    const response = await responsePromise;
    assert.isTrue(response.result.isError);
    assert.strictEqual(response.result.code, 'E_FAILED');
    assert.strictEqual(response.result.description, 'Operation failed: %s');
    assert.deepEqual(response.result.details, ['Permission denied']);
  });

  it('reload only the main toplevel frame', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.isNotNull(target);
    const secondTarget = getBackend(context).createTarget();

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
    const extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance();

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
    const extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance();

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

describe('Runtime hosts policy', () => {
  const context = setupDevtoolsExtensionHooks({hostsPolicy});
  expectConsoleLogs({error: ['Extension server error: Operation failed: Permission denied']});

  for (const protocol of ['devtools', 'chrome', 'chrome-untrusted', 'chrome-error', 'chrome-search']) {
    it(`blocks API calls on blocked protocols: ${protocol}`, async () => {
      assert.isUndefined(context.chrome.devtools);
      const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
      const addExtensionStub = sinon.stub(PanelCommon.ExtensionServer.ExtensionServer.instance(), 'addExtension');

      target.setInspectedURL(urlString`${`${protocol}://foo`}`);
      sinon.assert.notCalled(addExtensionStub);
      assert.isUndefined(context.chrome.devtools);
    });
  }

  it('blocks API calls on blocked hosts', async () => {
    assert.isUndefined(context.chrome.devtools);
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    const addExtensionStub = sinon.spy(PanelCommon.ExtensionServer.ExtensionServer.instance(), 'addExtension');

    target.setInspectedURL(blockedUrl);
    assert.isTrue(addExtensionStub.alwaysReturned(undefined));
    assert.isUndefined(context.chrome.devtools);
  });

  it('allows API calls on allowlisted hosts', async () => {
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(allowedUrl);
    {
      const result = await context.chrome.devtools!.network.getHAR();
      assert.hasAnyKeys(result, ['entries']);
    }
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('allows API calls on non-blocked hosts', async () => {
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`http://example.com2`);
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb));
      assert.hasAnyKeys(result, ['entries']);
    }
  });

  it('defers loading extensions until after navigation from a blocked to an allowed host', async () => {
    const addExtensionSpy = sinon.spy(PanelCommon.ExtensionServer.ExtensionServer.instance(), 'addExtension');
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(blockedUrl);
    assert.isTrue(addExtensionSpy.calledOnce, 'addExtension called once');
    assert.deepEqual(addExtensionSpy.returnValues, [undefined]);

    target.setInspectedURL(allowedUrl);
    assert.isTrue(addExtensionSpy.calledTwice, 'addExtension called twice');
    assert.deepEqual(addExtensionSpy.returnValues, [undefined, true]);
  });

  it('does not include blocked hosts in the HAR entries', async () => {
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`http://example.com2`);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    createRequest(networkManager, frameId, 'blocked-url-request-id' as Protocol.Network.RequestId, blockedUrl);
    createRequest(networkManager, frameId, 'allowed-url-request-id' as Protocol.Network.RequestId, allowedUrl);
    {
      const result = await context.chrome.devtools!.network.getHAR() as TestHARLog;
      assert.exists(result.entries.find(e => e.request.url === allowedUrl));
      assert.notExists(result.entries.find(e => e.request.url === blockedUrl));
    }
    {
      const result = await new Promise<object>(cb => context.chrome.devtools?.network.getHAR(cb)) as TestHARLog;
      assert.exists(result.entries.find(e => e.request.url === allowedUrl));
      assert.notExists(result.entries.find(e => e.request.url === blockedUrl));
    }
  });

  it('does not include requests from blocked targets in the HAR entries even if request URL is allowed', async () => {
    const parentFrameUrl = allowedUrl;
    const childFrameUrl = blockedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl);
    const childFrame = await setUpFrame('child', childFrameUrl, parentFrame);

    const childTarget = childFrame.resourceTreeModel()?.target();
    assert.exists(childTarget);
    childTarget.setInspectedURL(blockedUrl);  // Explicitly set to blocked URL

    const networkManager = childTarget.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const frameId = 'child-frame-id' as Protocol.Page.FrameId;
    const requestUrl = urlString`${allowedUrl}?fromBlockedTarget`;
    createRequest(networkManager, frameId, 'request-from-blocked-target' as Protocol.Network.RequestId, requestUrl);

    const result = await context.chrome.devtools!.network.getHAR() as TestHARLog;
    assert.notExists(result.entries.find(e => e.request.url === requestUrl));
  });

  async function setUpFrame(name: string, url: Platform.DevToolsPath.UrlString,
                            parentFrame?: SDK.ResourceTreeModel.ResourceTreeFrame,
                            executionContextOrigin?: Platform.DevToolsPath.UrlString) {
    const parentTarget = parentFrame?.resourceTreeModel()?.target();
    const target =
        getBackend(context).createTarget({id: `${name}-target-id` as Protocol.Target.TargetID, parentTarget});
    const frame = parentFrame ? await addChildFrame(target, {url}) : getMainFrame(target, {url});

    target.setInspectedURL(url);

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
        r => context.chrome.devtools?.inspectedWindow.eval('4', {frameURL: childFrameUrl},
                                                           (result, error) => r({result, error})));

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

  it('evaluates expression via Promise return', async () => {
    const parentFrameUrl = allowedUrl;
    const childFrameUrl = urlString`${`${allowedUrl}/2`}`;
    const childExeContextOrigin = blockedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);
    const childFrame = await setUpFrame('child', childFrameUrl, parentFrame, childExeContextOrigin);

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

    const result = await context.chrome.devtools!.inspectedWindow.eval(
        '4', {frameURL: childFrameUrl, useContentScriptContext: true});

    assert.strictEqual(result, 4);
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

  it('blocks evaluation on other extension execution contexts', async () => {
    assert.isUndefined(context.chrome.devtools);

    const parentFrameUrl = allowedUrl;
    const parentFrame = await setUpFrame('parent', parentFrameUrl, undefined, parentFrameUrl);

    // Yield to the microtask queue to allow the extension to be initialized.
    await new Promise(r => setTimeout(r, 0));

    // Create a non-default context with a different extension origin.
    const otherExtensionOrigin = urlString`chrome-extension://other-extension`;
    const runtimeModel = parentFrame.resourceTreeModel()?.target().model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    runtimeModel.executionContextCreated({
      id: 1 as Protocol.Runtime.ExecutionContextId,
      origin: otherExtensionOrigin,
      name: otherExtensionOrigin,
      uniqueId: otherExtensionOrigin,
      auxData: {frameId: parentFrame.id, isDefault: false},
    });
    const result = await new Promise<{result: unknown, error?: {details: unknown[]}}>(
        r => context.chrome.devtools?.inspectedWindow.eval(
            // The typings don't match the implementation, so we need to cast to any here to make ts happy.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            '4', {frameURL: parentFrameUrl, scriptExecutionContext: otherExtensionOrigin} as any,
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
        r => context.chrome.devtools?.inspectedWindow.eval('4', {frameURL: childFrameUrl},
                                                           (result, error) => r({result, error})));

    assert.deepEqual(result.error?.details, ['Permission denied']);
  });

  async function createUISourceCode(project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
                                    url: Platform.DevToolsPath.UrlString,
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
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
                                          {scriptsForUISourceCode: [], sourceMapURLsForUISourceCode: []}));
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl);
    await createUISourceCode(project, allowedUrl);

    assert.exists(context.chrome.devtools);
    const resources = await context.chrome.devtools!.inspectedWindow.getResources();
    assert.deepEqual(resources.map(r => r.url), [allowedUrl]);

    const resourceContentsWithCallback = await Promise.all(
        resources.map(resource => new Promise<{url: string, content?: string, encoding?: string}>(
                          r => resource.getContent((content, encoding) => r({url: resource.url, content, encoding})))));

    assert.deepEqual(resourceContentsWithCallback, [
      {url: allowedUrl, content: 'content', encoding: ''},
    ]);

    const resourceContentsWithPromise = await Promise.all(resources.map(async resource => {
      const {content, encoding} = await resource.getContent();
      return {url: resource.url, content, encoding};
    }));

    assert.deepEqual(resourceContentsWithPromise, [
      {url: allowedUrl, content: 'content', encoding: ''},
    ]);
  });

  it('blocks getting resource contents on allowed urls if target is blocked', async () => {
    const parentTarget = getBackend(context).createTarget({id: 'parent' as Protocol.Target.TargetID});
    parentTarget.setInspectedURL(allowedUrl);

    const blockedTarget = getBackend(context).createTarget({id: 'blocked-target' as Protocol.Target.TargetID});
    blockedTarget.setInspectedURL(blockedUrl);
    sinon.stub(blockedTarget, 'inspectedURL').returns(blockedUrl);

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
                                          {scriptsForUISourceCode: [], sourceMapURLsForUISourceCode: []}));

    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), blockedTarget.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);

    Bindings.NetworkProject.NetworkProject.setTargetForProject(project, blockedTarget);

    const uniqueAllowedUrl = urlString`${allowedUrl}?uniqueResourceTest`;

    // Stub targetForUISourceCode to ensure it returns blockedTarget for our unique URL
    const targetForUISourceCodeStub = sinon.stub(Bindings.NetworkProject.NetworkProject, 'targetForUISourceCode');
    targetForUISourceCodeStub.returns(blockedTarget);

    await createUISourceCode(project, uniqueAllowedUrl);

    assert.exists(context.chrome.devtools);
    const resources = await context.chrome.devtools!.inspectedWindow.getResources();
    assert.notExists(resources.find(r => r.url === uniqueAllowedUrl));
  });

  it('allows arbitrary schemes in sourceURL comments, as long as the inspected target is allowed', async () => {
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const script = sinon.createStubInstance(SDK.Script.Script, {target, contentURL: blockedUrl});
    script.hasSourceURL = true;
    const workspaceBinding = sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    workspaceBinding.sourceMapURLsForUISourceCode.returns([]);
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

  it('blocks scripts with sourceURL comments if the embedderName is a blocked URL', async () => {
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const script = sinon.createStubInstance(SDK.Script.Script, {target, contentURL: allowedUrl});
    script.hasSourceURL = true;
    script.embedderName.returns(blockedUrl);
    const workspaceBinding = sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    workspaceBinding.sourceMapURLsForUISourceCode.returns([]);
    workspaceBinding.scriptsForUISourceCode.callsFake(uiSourceCode => {
      if (uiSourceCode.contentURL() === allowedUrl) {
        return [script];
      }
      return [];
    });
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance').returns(workspaceBinding);
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, allowedUrl, Common.ResourceType.resourceTypes.Script);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepEqual(resources.map(r => r.url), []);
  });

  it('blocks CSS sources originating from a blocked source map URL', async () => {
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
                                          {scriptsForUISourceCode: [], sourceMapURLsForUISourceCode: []}));
    const cssWorkspaceBinding = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance();
    (cssWorkspaceBinding.sourceMapURLsForUISourceCode as sinon.SinonStub).returns([blockedUrl]);
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, allowedUrl, Common.ResourceType.resourceTypes.SourceMapStyleSheet);

    const resources = await context.chrome.devtools!.inspectedWindow.getResources();
    assert.deepEqual(resources.map(resource => resource.url), []);
  });

  it('allows scripts with sourceURL comments if the embedderName is not a URL', async () => {
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const script = sinon.createStubInstance(SDK.Script.Script, {target, contentURL: allowedUrl});
    script.hasSourceURL = true;
    script.embedderName.returns(urlString`eval`);
    const workspaceBinding = sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    workspaceBinding.sourceMapURLsForUISourceCode.returns([]);
    workspaceBinding.scriptsForUISourceCode.callsFake(uiSourceCode => {
      if (uiSourceCode.contentURL() === allowedUrl) {
        return [script];
      }
      return [];
    });
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance').returns(workspaceBinding);
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, allowedUrl, Common.ResourceType.resourceTypes.Script);

    assert.exists(context.chrome.devtools);
    const resources =
        await new Promise<Chrome.DevTools.Resource[]>(r => context.chrome.devtools?.inspectedWindow.getResources(r));
    assert.deepEqual(resources.map(r => r.url), [allowedUrl]);
  });

  const requestToManager = new Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkManager.NetworkManager>();

  function createRequest(
      networkManager: SDK.NetworkManager.NetworkManager,
      frameId: Protocol.Page.FrameId,
      requestId: Protocol.Network.RequestId,
      url: Platform.DevToolsPath.UrlString,
      responseHeaders: SDK.NetworkRequest.NameValue[] = [],
      initiator: Protocol.Network.Initiator|null = null,
      ): void {
    if (!(SDK.NetworkManager.NetworkManager.forRequest as unknown as {isSinonProxy?: boolean}).isSinonProxy) {
      requestToManager.clear();
      sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest')
          .callsFake(request => requestToManager.get(request) || null);
    }
    const request = SDK.NetworkRequest.NetworkRequest.create(requestId, url, url, frameId, null, initiator, undefined);
    request.responseHeaders = responseHeaders;
    requestToManager.set(request, networkManager);
    const dataProvider = () =>
        Promise.resolve(new TextUtils.ContentData.ContentData('content', false, request.mimeType));
    request.setContentDataProvider(dataProvider);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestStarted, {request, originalRequest: null});
    request.finished = true;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
  }

  it('can get request content', async () => {
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    createRequest(networkManager, frameId, 'request-id' as Protocol.Network.RequestId, allowedUrl);

    const harLog = await context.chrome.devtools!.network.getHAR() as TestHARLog;
    assert.lengthOf(harLog.entries, 1);
    const request = harLog.entries[0] as Chrome.DevTools.Request;

    const promise = request.getContent();
    assert.exists(promise);
    const contentData = await promise;
    assert.deepEqual(contentData, {content: 'content', encoding: ''});

    const callbackData = await new Promise<{content: string, encoding: string}>(resolve => {
      request.getContent((content, encoding) => resolve({content, encoding}));
    });
    assert.deepEqual(callbackData, {content: 'content', encoding: ''});
  });

  it('does not include blocked hosts in onRequestFinished event listener', async () => {
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const requests: HAR.Log.EntryDTO[] = [];
    // onRequestFinished returns a type of Request. However in actual fact, the returned object contains HAR data
    // which result type mismatch due to the Request type not containing the respective fields in HAR.Log.EntryDTO.
    // Therefore, cast through unknown to resolve this.
    // TODO: (crbug.com/1482763) Update Request type to match HAR.Log.EntryDTO
    context.chrome.devtools?.network.onRequestFinished.addListener(r =>
                                                                       requests.push(r as unknown as HAR.Log.EntryDTO));
    await waitForFunction(() => PanelCommon.ExtensionServer.ExtensionServer.instance().hasSubscribers(
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

  it('omits getHAR entries whose redirectURL references a blocked host', async () => {
    Logs.NetworkLog.NetworkLog.instance();
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const blockedRedirectUrl = urlString`${`${blockedUrl}/secret?token=abc`}`;
    // Entry with a redirect to a blocked URL — should be omitted.
    createRequest(networkManager, frameId, 'redirect-to-blocked' as Protocol.Network.RequestId, allowedUrl,
                  [{name: 'Location', value: `${blockedRedirectUrl}`}]);
    // Entry with no blocked references — should be kept.
    createRequest(networkManager, frameId, 'clean-entry' as Protocol.Network.RequestId, allowedUrl);

    const result = await context.chrome.devtools!.network.getHAR() as HAR.Log.LogDTO;
    assert.lengthOf(result.entries, 1);
    assert.notExists(result.entries.find(e => e.response.headers.some(h => h.name === 'Location')));
  });

  it('omits getHAR entries whose initiator references a blocked host', async () => {
    Logs.NetworkLog.NetworkLog.instance();
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const blockedScriptUrl = urlString`${`${blockedUrl}/app.js`}`;
    // Entry whose initiator URL is blocked — should be omitted.
    createRequest(networkManager, frameId, 'blocked-initiator' as Protocol.Network.RequestId, allowedUrl, [], {
      type: Protocol.Network.InitiatorType.Script,
      url: blockedScriptUrl,
      stack: {
        callFrames: [{
          functionName: 'leakyFn',
          scriptId: '1' as Protocol.Runtime.ScriptId,
          url: blockedScriptUrl,
          lineNumber: 1,
          columnNumber: 0,
        }],
      },
    });
    // Entry with no blocked references — should be kept.
    createRequest(networkManager, frameId, 'clean-entry' as Protocol.Network.RequestId, allowedUrl);

    const result = await context.chrome.devtools!.network.getHAR() as HAR.Log.LogDTO;
    assert.lengthOf(result.entries, 1);
    assert.isNull(result.entries[0]._initiator);
  });

  it('omits getHAR entries with Location, Content-Location, Refresh, or Link headers referencing blocked hosts',
     async () => {
       Logs.NetworkLog.NetworkLog.instance();
       const frameId = 'frame-id' as Protocol.Page.FrameId;
       const target = createTarget({id: 'target' as Protocol.Target.TargetID});
       target.setInspectedURL(allowedUrl);

       const networkManager = target.model(SDK.NetworkManager.NetworkManager);
       assert.exists(networkManager);

       const blockedRedirectUrl = urlString`${`${blockedUrl}/target-page`}`;
       // Each of these should cause the entry to be omitted.
       createRequest(networkManager, frameId, 'content-loc' as Protocol.Network.RequestId, allowedUrl,
                     [{name: 'Content-Location', value: `${blockedRedirectUrl}`}]);
       createRequest(networkManager, frameId, 'refresh' as Protocol.Network.RequestId, allowedUrl,
                     [{name: 'Refresh', value: `5; url=${blockedRedirectUrl}`}]);
       createRequest(networkManager, frameId, 'link' as Protocol.Network.RequestId, allowedUrl,
                     [{name: 'Link', value: `<${blockedRedirectUrl}>; rel=preload`}]);
       // This entry references only allowed URLs — should be kept.
       createRequest(networkManager, frameId, 'clean' as Protocol.Network.RequestId, allowedUrl,
                     [{name: 'Link', value: `<${allowedUrl}>; rel=stylesheet`}]);

       const result = await context.chrome.devtools!.network.getHAR() as HAR.Log.LogDTO;
       assert.lengthOf(result.entries, 1);
       assert.strictEqual(result.entries[0].response.headers.find(h => h.name === 'Link')?.value,
                          `<${allowedUrl}>; rel=stylesheet`);
     });

  it('omits onRequestFinished entries that reference blocked hosts in redirectURL or initiator', async () => {
    const frameId = 'frame-id' as Protocol.Page.FrameId;
    const target = createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    const requests: HAR.Log.EntryDTO[] = [];
    context.chrome.devtools?.network.onRequestFinished.addListener(r =>
                                                                       requests.push(r as unknown as HAR.Log.EntryDTO));
    await waitForFunction(() => PanelCommon.ExtensionServer.ExtensionServer.instance().hasSubscribers(
                              Extensions.ExtensionAPI.PrivateAPI.Events.NetworkRequestFinished));

    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const blockedRedirectUrl = urlString`${`${blockedUrl}/redirect-target?code=xyz`}`;
    const blockedScriptUrl = urlString`${`${blockedUrl}/subframe.js`}`;
    // Entry redirecting to blocked URL — should be omitted.
    createRequest(networkManager, frameId, 'redirect-blocked' as Protocol.Network.RequestId, allowedUrl,
                  [{name: 'Location', value: `${blockedRedirectUrl}`}]);
    // Entry with blocked initiator — should be omitted.
    createRequest(networkManager, frameId, 'initiator-blocked' as Protocol.Network.RequestId, allowedUrl, [], {
      type: Protocol.Network.InitiatorType.Script,
      url: blockedScriptUrl,
      stack: {
        callFrames: [{
          functionName: 'fn',
          scriptId: '1' as Protocol.Runtime.ScriptId,
          url: blockedScriptUrl,
          lineNumber: 10,
          columnNumber: 1,
        }],
      },
    });
    // Clean entry — should be delivered.
    createRequest(networkManager, frameId, 'clean-entry' as Protocol.Network.RequestId, allowedUrl);

    await waitForFunction(() => requests.length >= 1);
    // Give a tick for any additional events to arrive.
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.lengthOf(requests, 1);
    assert.strictEqual(requests[0].request.url, allowedUrl);
    assert.strictEqual(requests[0].response.redirectURL, '');
  });

  it('does not include requests from blocked targets in onRequestFinished event listener even if request URL is allowed',
     async () => {
       const frameId = 'frame-id' as Protocol.Page.FrameId;

       const allowedTarget = getBackend(context).createTarget({id: 'allowed-target' as Protocol.Target.TargetID});
       allowedTarget.setInspectedURL(allowedUrl);

       const blockedTarget = getBackend(context).createTarget({id: 'blocked-target' as Protocol.Target.TargetID});
       blockedTarget.setInspectedURL(blockedUrl);

       const requestUrlFromBlocked = urlString`${allowedUrl}?fromBlockedTarget`;
       const requestUrlFromAllowed = urlString`${allowedUrl}?fromAllowedTarget`;

       const requests: HAR.Log.EntryDTO[] = [];
       context.chrome.devtools?.network.onRequestFinished.addListener(
           r => requests.push(r as unknown as HAR.Log.EntryDTO));
       await waitForFunction(() => PanelCommon.ExtensionServer.ExtensionServer.instance().hasSubscribers(
                                 Extensions.ExtensionAPI.PrivateAPI.Events.NetworkRequestFinished));

       const networkManager = blockedTarget.model(SDK.NetworkManager.NetworkManager);
       assert.exists(networkManager);

       createRequest(networkManager, frameId, 'request-from-blocked-target' as Protocol.Network.RequestId,
                     requestUrlFromBlocked);

       const allowedNetworkManager = allowedTarget.model(SDK.NetworkManager.NetworkManager);
       assert.exists(allowedNetworkManager);
       createRequest(allowedNetworkManager, frameId, 'request-from-allowed-target' as Protocol.Network.RequestId,
                     requestUrlFromAllowed);

       await waitForFunction(() => requests.length >= 1);

       assert.lengthOf(requests, 1);
       assert.strictEqual(requests[0].request.url, requestUrlFromAllowed);
     });

  it('blocks setting resource contents on blocked urls', async () => {
    const target = getBackend(context).createTarget({id: 'target' as Protocol.Target.TargetID});
    target.setInspectedURL(allowedUrl);

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
                                          {scriptsForUISourceCode: [], sourceMapURLsForUISourceCode: []}));
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    await createUISourceCode(project, blockedUrl);
    await createUISourceCode(project, allowedUrl);

    assert.exists(context.chrome.devtools);
    const resources = await context.chrome.devtools!.inspectedWindow.getResources();
    assert.deepEqual(resources.map(r => r.url), [allowedUrl]);

    assert.deepEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'content');
    assert.deepEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');
    const responsesWithCallback =
        await Promise.all(
            resources.map(resource => new Promise<object|undefined>(r => resource.setContent('modified', true, r)))) as
        Array<undefined|{code: string, details: string[]}>;

    assert.deepEqual(responsesWithCallback.map(response => response?.code), ['OK']);
    assert.deepEqual(responsesWithCallback.map(response => response?.details), [[]]);

    assert.deepEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'modified');
    assert.deepEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');

    // Test promise version
    await Promise.all(resources.map(resource => resource.setContent('modified_again', true)));

    assert.deepEqual(project.uiSourceCodeForURL(allowedUrl)?.content(), 'modified_again');
    assert.deepEqual(project.uiSourceCodeForURL(blockedUrl)?.content(), 'content');
  });

  it('blocks network.addRequestHeaders when runtime_blocked_hosts is set', async () => {
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(allowedUrl);
    assert.exists(context.chrome.devtools);

    const setHeadersSpy = sinon.spy(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'setExtraHTTPHeaders');

    const networkApi = context.chrome.devtools?.network as Extensions.ExtensionAPI.PrivateAPI.Network;
    networkApi.addRequestHeaders({'X-Test': '1'});
    // Round-trip a command on the same MessagePort to ensure the
    // addRequestHeaders message has been processed before we assert.
    await context.chrome.devtools!.network.getHAR();

    sinon.assert.notCalled(setHeadersSpy);
  });

  it('rejects recorder extension plugin and view registration when runtime_blocked_hosts is set', async () => {
    const target = getBackend(context).createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(allowedUrl);
    assert.exists(context.chrome.devtools);

    class RecorderPlugin {
      async stringify(recording: object) {
        return JSON.stringify(recording);
      }
      async stringifyStep(step: object) {
        return JSON.stringify(step);
      }
      replay(_recording: object) {
        return;
      }
    }
    const extensionPlugin = new RecorderPlugin();
    await context.chrome.devtools.recorder.registerRecorderExtensionPlugin(extensionPlugin, 'Test', 'text/javascript');

    const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    assert.lengthOf(manager.plugins(), 0);

    await context.chrome.devtools.recorder.createView('Test View', 'test.html');
    assert.isUndefined(manager.views().find(v => v.title === 'Test View'));
  });
});

describe('addRequestHeaders security', () => {
  const context = setupDevtoolsExtensionHooks();
  // Helper: sets headers on a permitted page, navigates to the given URL, then
  // manually triggers modelAdded on a new target and verifies that the injected
  // headers are NOT applied via CDP.
  async function assertHeadersNotAppliedAfterNavigation(
      navigateToUrl: Platform.DevToolsPath.UrlString,
      injectedHeaders: Record<string, string>,
      ): Promise<void> {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    target.setInspectedURL(urlString`http://example.com`);
    assert.exists(context.chrome.devtools);

    const multitargetManager = SDK.NetworkManager.MultitargetNetworkManager.instance();

    // Set headers while on a permitted page.
    const headersCall = spyCall(multitargetManager, 'setExtraHTTPHeaders');
    const networkApi = context.chrome.devtools?.network as Extensions.ExtensionAPI.PrivateAPI.Network;
    networkApi.addRequestHeaders(injectedHeaders);
    await headersCall;

    // Navigate to a URL where the extension should NOT have access.
    target.setInspectedURL(navigateToUrl);

    // Simulate a new target attaching (e.g., OOPIF or service worker).
    // Set up the spy before manually calling modelAdded so we capture exactly
    // what headers get pushed via CDP.
    const newTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: target});
    const networkAgent = newTarget.networkAgent();
    const cdpSpy = sinon.spy(networkAgent, 'invoke_setExtraHTTPHeaders');
    const networkManager = newTarget.model(SDK.NetworkManager.NetworkManager);
    assert.exists(cdpSpy);
    assert.exists(networkManager);
    assert.exists(multitargetManager);
    multitargetManager.modelAdded(networkManager);

    // Confirm invoke_setExtraHTTPHeaders was called by modelAdded.
    sinon.assert.called(cdpSpy);
    const appliedHeaders = cdpSpy.lastCall.args[0].headers;
    for (const key of Object.keys(injectedHeaders)) {
      assert.notProperty(appliedHeaders, key,
                         `Header "${key}" was applied to a target on ${navigateToUrl} — ` +
                             `extension-set headers persisted across navigation to a disallowed URL`);
    }
  }

  it('extension-injected headers must not leak to chrome:// targets after navigation', async () => {
    await assertHeadersNotAppliedAfterNavigation(
        urlString`chrome://settings`,
        {Cookie: 'session=attacker', 'X-CSRF-Token': 'injected'},
    );
  });

  it('extension-injected headers must not leak to forbidden-origin targets after navigation', async () => {
    const oldDevToolsAPI = window.DevToolsAPI;
    try {
      // Simulate getOriginsForbiddenForExtensions returning a forbidden origin.
      window.DevToolsAPI = {
        getOriginsForbiddenForExtensions: () => ['https://addons.example.com'],
      };

      await assertHeadersNotAppliedAfterNavigation(
          urlString`https://addons.example.com/extensions`,
          {Authorization: 'Bearer attacker'},
      );
    } finally {
      window.DevToolsAPI = oldDevToolsAPI;
    }
  });

  it('extension-injected headers must not leak to file:// targets without file access', async () => {
    await assertHeadersNotAppliedAfterNavigation(
        urlString`file:///etc/passwd`,
        {'X-Injected': 'value'},
    );
  });
});

describe('ExtensionServer', () => {
  it('can correctly expand resource paths', async () => {
    // Ideally this would be a chrome-extension://, but that doesn't work with URL in chrome headless.
    const extensionOrigin = urlString`chrome://abcdef`;
    const almostOrigin = urlString`${`${extensionOrigin}/`}`;
    const expectation = urlString`${`${extensionOrigin}/foo`}`;
    assert.isUndefined(
        PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, 'http://example.com/foo'));
    assert.strictEqual(expectation,
                       PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, expectation));
    assert.strictEqual(expectation,
                       PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, '/foo'));
    assert.strictEqual(expectation,
                       PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(extensionOrigin, 'foo'));

    assert.isUndefined(
        PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, 'http://example.com/foo'));
    assert.strictEqual(expectation,
                       PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, expectation));
    assert.strictEqual(expectation,
                       PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, '/foo'));
    assert.strictEqual(expectation,
                       PanelCommon.ExtensionServer.ExtensionServer.expandResourcePath(almostOrigin, 'foo'));
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
      assert.isFalse(PanelCommon.ExtensionServer.ExtensionServer.canInspectURL(url), url);
    }
    for (const url of allowedUrls as Platform.DevToolsPath.UrlString[]) {
      assert.isTrue(PanelCommon.ExtensionServer.ExtensionServer.canInspectURL(url), url);
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
      assert.isFalse(PanelCommon.ExtensionServer.ExtensionServer.canInspectURL(url), url);
    }
  });
});

function assertIsStatus<T>(value: T|
                           PanelCommon.ExtensionServer.Record): asserts value is PanelCommon.ExtensionServer.Record {
  if (value && typeof value === 'object' && 'code' in value) {
    assert.isTrue(value.code === 'OK' || Boolean(value.isError), `Value ${value} is not a status code`);
  } else {
    assert.fail(`Value ${value} is not a status code`);
  }
}

describe('Wasm extension API', () => {
  const context = setupDevtoolsExtensionHooks();
  let stopId: unknown;
  beforeEach(() => {
    const target = getBackend(context).createTarget();
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
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
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

async function createScriptResource(
    context: ExtensionContext,
    options?: {
      scriptUrl?: Platform.DevToolsPath.UrlString,
      scriptContent?: string,
      inspectedUrl?: Platform.DevToolsPath.UrlString,
    },
    ): Promise<{
  target: SDK.Target.Target,
  currentScript: SDK.Script.Script,
  scriptResource: Chrome.DevTools.Resource,
}> {
  const scriptUrl = options?.scriptUrl ?? urlString`http://example.com/script.js`;
  const scriptContent =
      options?.scriptContent ?? 'function f(x) { console.log(x); } function ignore(y){ console.log(y); }';

  const backend = getBackend(context);
  mockResourceTree(backend.cdpConnection);
  const target = backend.createTarget({type: SDK.Target.Type.FRAME});
  if (options?.inspectedUrl) {
    target.setInspectedURL(options.inspectedUrl);
  }
  const debuggerWorkspaceBinding = backend.universe.debuggerWorkspaceBinding;
  sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance').returns(debuggerWorkspaceBinding);

  const scriptInfo = {url: scriptUrl, content: scriptContent};
  const uiSourceCodePromise = debuggerWorkspaceBinding.waitForUISourceCodeAdded(scriptInfo.url, target);
  const currentScript = await backend.addScript(target, scriptInfo, null);
  await uiSourceCodePromise;

  const resources = await new Promise<Chrome.DevTools.Resource[]>(r => {
    context.chrome.devtools?.inspectedWindow.getResources(r);
  });
  const scriptResource = resources.find(item => item.url === scriptInfo.url.toString());
  if (!scriptResource) {
    throw new Error(`Expected script resource to be registered for ${scriptInfo.url}`);
  }

  return {target, currentScript, scriptResource};
}

describe('Language Extension API', () => {
  const context = setupDevtoolsExtensionHooks();
  it('reports loaded resources', async () => {
    const target = getBackend(context).createTarget();
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

for (const allowFileAccess of [false, true]) {
  describe(`Source map resources with {allowFileAccess: ${allowFileAccess}}`, () => {
    const context = setupDevtoolsExtensionHooks({allowFileAccess});

    it(`${allowFileAccess ? 'exposes' : 'hides'} sources originating from a file:// source map`, async () => {
      const backend = getBackend(context);
      mockResourceTree(backend.cdpConnection);
      const target = backend.createTarget({type: SDK.Target.Type.FRAME});
      target.setInspectedURL(urlString`http://example.com`);
      sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
          .returns(backend.universe.debuggerWorkspaceBinding);

      const sourceURL = urlString`http://example.com/source.ts`;
      await backend.addScript(target, {url: urlString`http://example.com/eval.js`, content: '42;'}, {
        url: 'file:///tmp/secret.map',
        content: {
          version: 3,
          sources: [sourceURL],
          sourcesContent: ['secret content'],
          mappings: 'AAAA',
        },
      });

      const resources = await context.chrome.devtools?.inspectedWindow.getResources();
      const sourceResource = resources?.find(resource => resource.url === sourceURL);

      if (allowFileAccess) {
        assert.exists(sourceResource);
        assert.deepEqual(await sourceResource.getContent(), {content: 'secret content', encoding: ''});
      } else {
        assert.notExists(sourceResource);
      }
    });
  });
}

for (const allowFileAccess of [true, false]) {
  describe(
      `Language Extension API with {allowFileAccess: ${allowFileAccess}}`, () => {
        const context = setupDevtoolsExtensionHooks({allowFileAccess});
        let target: SDK.Target.Target;
        beforeEach(() => {
          target = getBackend(context).createTarget();
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
            workspace: Workspace.Workspace.WorkspaceImpl.instance(),
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
          debuggerModel.parsedScriptSource('0' as Protocol.Runtime.ScriptId, urlString`file:///source/url`, 0, 0, 100,
                                           100, 0, '', {}, 'file:///source/url.map', false, false, 200, true, null,
                                           null, Protocol.Debugger.ScriptLanguage.JavaScript, [{
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

describe('attachSourceMapURL', () => {
  const context = setupDevtoolsExtensionHooks();
  it('correctly attaches a source map to a registered script', async () => {
    const sourceRoot = 'http://example.com';
    const scriptName = 'script.ts';
    const scriptUrl = urlString`${sourceRoot}/script.js`;
    const scriptContent = 'function f(x) { console.log(x); } function ignore(y){ console.log(y); }';
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
      sources: [scriptUrl],
      mappings: sourceMap.mappings,
      file: `${scriptUrl}.map`,
    };

    const {currentScript, scriptResource} = await createScriptResource(context, {scriptUrl, scriptContent});

    // Script should not have a source map url attached yet.
    assert.notExists(currentScript.sourceMapURL);

    // Call attachSourceMapURL with encoded source map as a dataURL
    const encodedSourceMap = `data:text/plain;base64,${btoa(JSON.stringify(sourceMapString))}`;

    await scriptResource.attachSourceMapURL(encodedSourceMap);

    // Validate that the script has the sourcemap dataURL attached.
    assert.deepEqual(currentScript.sourceMapURL, encodedSourceMap);
  });
});

describe('Extension panel with non-ASCII titles', () => {
  const context = setupDevtoolsExtensionHooks();
  beforeEach(() => {
    getBackend(context).createTarget().setInspectedURL(urlString`http://example.com`);
  });

  it('creates a panel with a title containing only non-ASCII characters', async () => {
    const panel = await new Promise<Chrome.DevTools.ExtensionPanel>(
        resolve => context.chrome.devtools?.panels.create('\u4E2D\u6587', 'test.png', 'test.html', resolve));
    assert.exists(panel);
  });
});

describe('Extension Panels', () => {
  const context = setupDevtoolsExtensionHooks();
  async function setUpFrame(name: string, url: Platform.DevToolsPath.UrlString,
                            parentFrame?: SDK.ResourceTreeModel.ResourceTreeFrame,
                            executionContextOrigin?: Platform.DevToolsPath.UrlString) {
    const parentTarget = parentFrame?.resourceTreeModel()?.target();
    const target =
        getBackend(context).createTarget({id: `${name}-target-id` as Protocol.Target.TargetID, parentTarget});
    const frame = parentFrame ? await addChildFrame(target, {url}) : getMainFrame(target, {url});

    target.setInspectedURL(url);

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

    return {frame, target};
  }

  beforeEach(async () => {
    const {target} = await setUpFrame('main', urlString`http://example.com`, undefined, urlString`http://example.com`);
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const executionContext = runtimeModel.defaultExecutionContext();
    assert.exists(executionContext);
    sinon.stub(executionContext, 'evaluate').callsFake(async (options: SDK.RuntimeModel.EvaluationOptions) => {
      return {
        // Return the expression itself as the object's value so we can verify it was passed correctly.
        object: SDK.RemoteObject.RemoteObject.fromLocalObject(options.expression),
      };
    });
  });

  /**
   * Verifies that DevTools extension panels can be successfully created
   * using both Promise-based and Callback-based API styles, supporting
   * titles with mixed ASCII and non-ASCII characters.
   */
  it('can create a panel', async () => {
    const assertHasPanelWithTitle = (title: string) => {
      const extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance();
      // Access the private `clientObjects` field via `Reflect.get()` because extension
      // panels created via `chrome.devtools.panels.create()` are registered in
      // `ExtensionServer.clientObjects`, but are not added to
      // `UI.InspectorView.InspectorView:instance().tabbedPane` until shown.
      const clientObjects = Reflect.get(extensionServer, 'clientObjects') as Map<string, UI.View.View>;
      let found = false;
      for (const obj of clientObjects.values()) {
        if (typeof obj.title === 'function' && obj.title() === title) {
          found = true;
          break;
        }
      }
      assert.isTrue(found, `Expected to find a panel view with title "${title}"`);
    };

    // Create a panel using the Promise-based `chrome.devtools.panels.create` API with a mixed ASCII/non-ASCII title.
    const panelFromPromise =
        await context.chrome.devtools!.panels.create('Test\u4E2D\u6587PanelPromise', 'test.png', 'test.html');
    assert.exists(panelFromPromise);
    assertHasPanelWithTitle('Test\u4E2D\u6587PanelPromise');

    // Create a panel using the Callback-based `chrome.devtools.panels.create` API with a mixed ASCII/non-ASCII title.
    const panelFromCallback = await new Promise<Chrome.DevTools.ExtensionPanel>(resolve => {
      context.chrome.devtools!.panels.create('Test\u4E2D\u6587PanelCallback', 'test.png', 'test.html', resolve);
    });
    assert.exists(panelFromCallback);
    assertHasPanelWithTitle('Test\u4E2D\u6587PanelCallback');

    // Create a panel using the Promise-based `chrome.devtools.panels.create` API with a title containing only non-ASCII characters.
    const panelFromPromiseOnlyNonAscii =
        await context.chrome.devtools!.panels.create('\u4E2D\u6587', 'test.png', 'test.html');
    assert.exists(panelFromPromiseOnlyNonAscii);
    assertHasPanelWithTitle('\u4E2D\u6587');

    // Create a panel using the Callback-based `chrome.devtools.panels.create` API with a title containing only non-ASCII characters.
    const panelFromCallbackOnlyNonAscii = await new Promise<Chrome.DevTools.ExtensionPanel>(resolve => {
      context.chrome.devtools!.panels.create('\u4E2D\u6587', 'test.png', 'test.html', resolve);
    });
    assert.exists(panelFromCallbackOnlyNonAscii);
    assertHasPanelWithTitle('\u4E2D\u6587');
  });

  /**
   * Verifies that `openResource` successfully opens the specified resource
   * URL and reveals it in the editor, testing various overload signatures
   * (Promise-based, Callback-based, with/without column numbers) and error handling.
   */
  it('can open a resource', async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const mockUiLocation = {} as Workspace.UISourceCode.UILocation;
    const mockUISourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    mockUISourceCode.uiLocation.returns(mockUiLocation);

    const uiSourceCodeStub = sinon.stub(workspace, 'uiSourceCodeForURL').returns(mockUISourceCode);
    const revealRegistry = Common.Revealer.RevealerRegistry.instance();
    const revealStub = sinon.stub(revealRegistry, 'reveal').resolves();

    const url = urlString`http://example.com/script.js`;

    // Local helper to assert that the stubs are called correctly.
    const assertOpenSuccess =
        async (lineNumber: number, columnNumber: number, triggerCall: () => Promise<unknown>| void) => {
      uiSourceCodeStub.resetHistory();
      revealStub.resetHistory();
      mockUISourceCode.uiLocation.resetHistory();
      await triggerCall();
      sinon.assert.calledWith(uiSourceCodeStub, url);
      sinon.assert.calledWith(mockUISourceCode.uiLocation, lineNumber, columnNumber);
      sinon.assert.calledWith(revealStub, mockUiLocation);
    };

    // Test Promise-based version.
    await assertOpenSuccess(/* lineNumber */ 10, /* columnNumber */ 0,
                            () => context.chrome.devtools!.panels.openResource(url, /* lineNumber */ 10));

    // Test Promise-based version with column.
    await assertOpenSuccess(
        /* lineNumber */ 10, /* columnNumber */ 5,
        () => context.chrome.devtools!.panels.openResource(url, /* lineNumber */ 10, /* columnNumber */ 5));

    // Test Callback-based version.
    await assertOpenSuccess(/* lineNumber */ 10, /* columnNumber */ 0,
                            () => new Promise<void>(resolve => {
                              context.chrome.devtools!.panels.openResource(
                                  url, /* lineNumber */ 10, /* columnNumber */ undefined, /* callback */ resolve);
                            }));

    // Test callback-based JavaScript caller version (skipping `columnNumber`).
    await assertOpenSuccess(
        /* lineNumber */ 10, /* columnNumber */ 0,
        () => new Promise<void>(resolve => {
          // Cast to `any` is required to bypass TypeScript compiler errors.
          // We are verifying the legacy runtime behavior for JavaScript callers
          // who skip the `columnNumber` argument, which is no longer statically
          // allowed in TypeScript.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (context.chrome.devtools!.panels as any).openResource(url, /* lineNumber */ 10, /* callback */ resolve);
        }));

    // Test Callback-based version with column.
    await assertOpenSuccess(/* lineNumber */ 10, /* columnNumber */ 5,
                            () => new Promise<void>(resolve => {
                              context.chrome.devtools!.panels.openResource(
                                  url, /* lineNumber */ 10, /* columnNumber */ 5, /* callback */ resolve);
                            }));

    // Test error case (Promise rejection when resource is not found).
    uiSourceCodeStub.returns(null);
    try {
      await context.chrome.devtools!.panels.openResource(url, /* lineNumber */ 10);
      assert.fail('Expected promise to reject');
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'DevTools API encountered an error');
    }
  });

  /**
   * Verifies that `ExtensionSidebarPane` can be successfully created
   * under the Elements panel using both Promise-based and Callback-based API styles.
   */
  it('can create a sidebar pane', async () => {
    const assertHasSidebarWithTitle = (title: string) => {
      const extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const sidebarPanes = extensionServer.sidebarPanes();
      const found = sidebarPanes.some(pane => pane.title() === title);
      assert.isTrue(found, `Expected to find a sidebar pane with title "${title}"`);
    };

    // Create a sidebar pane using the Promise-based `chrome.devtools.panels.elements.createSidebarPane` API.
    const paneFromPromise = await context.chrome.devtools!.panels.elements.createSidebarPane('SidebarPromise');
    assert.exists(paneFromPromise);
    assertHasSidebarWithTitle('SidebarPromise');

    // Create a sidebar pane using the Callback-based `chrome.devtools.panels.elements.createSidebarPane` API.
    const paneFromCallback = await new Promise<Chrome.DevTools.ExtensionSidebarPane>(resolve => {
      context.chrome.devtools!.panels.elements.createSidebarPane('SidebarCallback', resolve);
    });
    assert.exists(paneFromCallback);
    assertHasSidebarWithTitle('SidebarCallback');
  });

  /**
   * Verifies that the `ExtensionSidebarPane`'s `setObject` method successfully
   * evaluates and sets objects using various API overloads.
   */
  it('can set object in sidebar pane', async () => {
    const pane = await context.chrome.devtools!.panels.elements.createSidebarPane('Sidebar');

    const getSidebar = (): PanelCommon.ExtensionPanel.ExtensionSidebarPane => {
      const extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const sidebarPanes = extensionServer.sidebarPanes();
      if (sidebarPanes.length > 0) {
        return sidebarPanes[0];
      }
      throw new Error('Sidebar pane not found in ExtensionServer');
    };

    const runs = [
      // Test Promise-based version with only object.
      {
        run: () => pane.setObject('{"a": 1}'),
        expectedObject: '{"a": 1}',
      },
      // Test Promise-based version with object and title.
      {
        run: () => pane.setObject('{"b": 2}', 'RootTitle'),
        expectedObject: '{"b": 2}',
      },
      // Test Callback-based version with only object.
      {
        run: () => new Promise<void>(resolve => pane.setObject('{"c": 3}', /* rootTitle */ undefined, resolve)),
        expectedObject: '{"c": 3}',
      },
      // Test Callback-based version with object and title.
      {
        run: () => new Promise<void>(resolve => pane.setObject('{"e": 5}', 'RootTitle', resolve)),
        expectedObject: '{"e": 5}',
      },
    ];
    for (const {run, expectedObject} of runs) {
      await run();
      const sidebar = getSidebar();
      // Verify that the JSON string object is rendered correctly.
      const sectionElement = sidebar.element.firstElementChild?.firstElementChild;
      assert.exists(sectionElement);
      const section = UI.Widget.Widget.get(sectionElement);
      assert.instanceOf(section, ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget);
      assert.exists(section.objectTree?.object);
      assert.strictEqual(section.objectTree.object.value, expectedObject);
    }
  });

  /**
   * Verifies that the `ExtensionSidebarPane`'s `setExpression` method successfully
   * evaluates and sets expressions using various API overloads.
   */
  it('can set expression in sidebar pane', async () => {
    const pane = await context.chrome.devtools!.panels.elements.createSidebarPane('Sidebar');

    const getSidebar = (): PanelCommon.ExtensionPanel.ExtensionSidebarPane => {
      const extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const sidebarPanes = extensionServer.sidebarPanes();
      if (sidebarPanes.length > 0) {
        return sidebarPanes[0];
      }
      throw new Error('Sidebar pane not found in ExtensionServer');
    };

    const runs = [
      // Test Promise-based version with expression and title.
      {
        run: () => pane.setExpression('1 + 1', 'RootTitle'),
        expectedObject: '1 + 1',
      },
      // Test Promise-based version with expression, title, and evaluate options.
      {
        run: () => pane.setExpression('2 + 2', 'RootTitle', /* evaluateOptions */ {}),
        expectedObject: '2 + 2',
      },
      // Test callback-based JavaScript caller version with expression and title (skipping `evaluateOptions`).
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        run: () => new Promise<void>(resolve => (pane as any).setExpression('3 + 3', 'RootTitle', resolve)),
        expectedObject: '3 + 3',
      },
      // Test Callback-based version with expression, title, evaluate options, and callback.
      {
        run: () =>
            new Promise<void>(resolve => pane.setExpression('4 + 4', 'RootTitle', /* evaluateOptions */ {}, resolve)),
        expectedObject: '4 + 4',
      },
    ];
    for (const {run, expectedObject} of runs) {
      await run();
      const sidebar = getSidebar();
      // The expression evaluates to the expression itself because of the stub on executionContext.evaluate.
      const sectionElement = sidebar.element.firstElementChild?.firstElementChild;
      assert.exists(sectionElement);
      const section = UI.Widget.Widget.get(sectionElement);
      assert.instanceOf(section, ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget);
      assert.exists(section.objectTree?.object);
      assert.strictEqual(section.objectTree.object.value, expectedObject);
    }
  });

  /**
   * Verifies that `ExtensionSidebarPane.setObject` returns a rejected Promise
   * when the operation fails.
   */
  it('ExtensionSidebarPane.setObject returns rejected promise on error', async () => {
    const pane = await context.chrome.devtools!.panels.elements.createSidebarPane('Sidebar');

    // Stub `setObject` on the server-side pane to simulate a failure by invoking the callback with an error message.
    sinon.stub(PanelCommon.ExtensionPanel.ExtensionSidebarPane.prototype, 'setObject')
        .callsFake((object, title, callback) => {
          callback('mock setObject error');
        });

    try {
      // Attempt to set object, which should reject the returned Promise.
      await pane.setObject('{"a": 1}');
      assert.fail('Expected promise to reject');
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'DevTools API encountered an error');
    }
  });

  /**
   * Verifies that `ExtensionSidebarPane.setExpression` returns a rejected Promise
   * when the operation fails.
   */
  it('ExtensionSidebarPane.setExpression returns rejected promise on error', async () => {
    const pane = await context.chrome.devtools!.panels.elements.createSidebarPane('Sidebar');

    // Stub `setExpression` on the server-side pane to simulate a failure by invoking the callback with an error message.
    sinon.stub(PanelCommon.ExtensionPanel.ExtensionSidebarPane.prototype, 'setExpression')
        .callsFake((expression, title, evaluateOptions, securityOrigin, callback) => {
          callback('mock setExpression error');
        });

    try {
      // Attempt to set expression, which should reject the returned Promise.
      await pane.setExpression('1 + 1', 'RootTitle');
      assert.fail('Expected promise to reject');
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.message, 'DevTools API encountered an error');
    }
  });

  /**
   * Verifies that callback-based `openResource` API calls still invoke the
   * provided callback even when the operation fails (e.g., resource not found).
   */
  it('openResource callback is called on error', async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    // Stub `uiSourceCodeForURL` to return null to simulate a resource not found failure.
    sinon.stub(workspace, 'uiSourceCodeForURL').returns(null);
    const url = Platform.DevToolsPath.urlString`http://example.com/script.js`;

    await new Promise<void>(resolve => {
      // Call `openResource` with a callback that resolves the outer Promise when called.
      context.chrome.devtools!.panels.openResource(url, /* lineNumber */ 10, /* columnNumber */ undefined,
                                                   /* callback */ () => {
                                                     // Callback should still be invoked even on failure.
                                                     resolve();
                                                   });
    });
  });

  describe('forwardKeyboardEvent', () => {
    interface ForwardedKeyboardEvent extends KeyboardEvent {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __keyCode?: number;
    }

    interface WindowWithOptionalChrome {
      chrome?: Partial<Chrome.DevTools.Chrome>;
    }

    interface TestExtensionServerClient {
      sendRequest: sinon.SinonStub;
    }

    it('dispatches allowed global shortcut keys', () => {
      const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKey('P', UI.KeyboardShortcut.Modifiers.Ctrl.value);
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry.instance(), 'globalShortcutKeys').returns([shortcutKey]);

      const dispatchedEvents: KeyboardEvent[] = [];
      const listener = (event: Event) => dispatchedEvents.push(event as KeyboardEvent);
      document.addEventListener('keydown', listener);

      try {
        const result = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: [{
            eventType: 'keydown',
            ctrlKey: true,
            altKey: false,
            metaKey: false,
            shiftKey: false,
            key: 'p',
            code: 'KeyP',
            keyCode: 80,
            location: 0,
          }],
        });

        assert.isUndefined(result);
        assert.lengthOf(dispatchedEvents, 1);
        const [event] = dispatchedEvents;
        assert.strictEqual(event.type, 'keydown');
        assert.isTrue(event.ctrlKey);
        assert.isFalse(event.altKey);
        assert.strictEqual(event.key, 'p');
        assert.strictEqual(event.code, 'KeyP');
        assert.strictEqual((event as ForwardedKeyboardEvent).__keyCode, 80);
      } finally {
        document.removeEventListener('keydown', listener);
      }
    });

    it('handles synthetic Escape key code', () => {
      const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const escapeKey = UI.KeyboardShortcut.KeyboardShortcut.makeKey(27, UI.KeyboardShortcut.Modifiers.None.value);
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry.instance(), 'globalShortcutKeys').returns([escapeKey]);

      const dispatchedEvents: KeyboardEvent[] = [];
      const listener = (event: Event) => dispatchedEvents.push(event as KeyboardEvent);
      document.addEventListener('keydown', listener);

      try {
        const result = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: [{
            eventType: 'keydown',
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            shiftKey: false,
            key: Platform.KeyboardUtilities.ESCAPE_KEY,
            code: 'Escape',
            keyCode: 0,
            location: 0,
          }],
        });

        assert.isUndefined(result);
        assert.lengthOf(dispatchedEvents, 1);
        const [event] = dispatchedEvents;
        assert.strictEqual((event as ForwardedKeyboardEvent).__keyCode, 27);
      } finally {
        document.removeEventListener('keydown', listener);
      }
    });

    it('rejects keys that are not allowed global shortcuts', () => {
      const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry.instance(), 'globalShortcutKeys').returns([]);

      const dispatchedEvents: KeyboardEvent[] = [];
      const listener = (event: Event) => dispatchedEvents.push(event as KeyboardEvent);
      document.addEventListener('keydown', listener);

      try {
        const result = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: [{
            eventType: 'keydown',
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            shiftKey: false,
            key: 'a',
            code: 'KeyA',
            keyCode: 65,
            location: 0,
          }],
        });

        assertIsStatus(result);
        assert.strictEqual(result.code, 'E_BADARG');
        assert.lengthOf(dispatchedEvents, 0);
      } finally {
        document.removeEventListener('keydown', listener);
      }
    });

    it('rejects malformed entries without dispatching events', () => {
      const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKey('P', UI.KeyboardShortcut.Modifiers.Ctrl.value);
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry.instance(), 'globalShortcutKeys').returns([shortcutKey]);

      const dispatchedEvents: KeyboardEvent[] = [];
      const listener = (event: Event) => dispatchedEvents.push(event as KeyboardEvent);
      document.addEventListener('keydown', listener);

      try {
        // Non-array entries
        const result1 = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: 'not an array' as unknown as Extensions.ExtensionAPI.PrivateAPI.ForwardKeyboardEventRequestEntry[],
        });
        assertIsStatus(result1);
        assert.strictEqual(result1.code, 'E_BADARG');

        // Invalid eventType
        const result2 = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: [{
            eventType: 'keyup',
            ctrlKey: true,
            altKey: false,
            metaKey: false,
            shiftKey: false,
            key: 'p',
            code: 'KeyP',
            keyCode: 80,
            location: 0,
          }],
        });
        assertIsStatus(result2);
        assert.strictEqual(result2.code, 'E_BADARG');

        // Invalid property type (keyCode as string)
        const result3 = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: [{
            eventType: 'keydown',
            ctrlKey: true,
            altKey: false,
            metaKey: false,
            shiftKey: false,
            key: 'p',
            code: 'KeyP',
            keyCode: '80' as unknown as number,
            location: 0,
          }],
        });
        assertIsStatus(result3);
        assert.strictEqual(result3.code, 'E_BADARGTYPE');

        // Array with one valid and one invalid entry should dispatch nothing
        const result4 = server.onForwardKeyboardEventForTest({
          command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
          entries: [
            {
              eventType: 'keydown',
              ctrlKey: true,
              altKey: false,
              metaKey: false,
              shiftKey: false,
              key: 'p',
              code: 'KeyP',
              keyCode: 80,
              location: 0,
            },
            {
              eventType: 'keydown',
              ctrlKey: false,
              altKey: false,
              metaKey: false,
              shiftKey: false,
              key: 'q',
              code: 'KeyQ',
              keyCode: 81,
              location: 0,
            },
          ],
        });
        assertIsStatus(result4);
        assert.strictEqual(result4.code, 'E_BADARG');
        assert.lengthOf(dispatchedEvents, 0);
      } finally {
        document.removeEventListener('keydown', listener);
      }
    });

    it('extension client reads event properties once and forwards allowed shortcuts', async () => {
      let sendRequestStub: sinon.SinonStub|undefined;
      const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKey('P', UI.KeyboardShortcut.Modifiers.Ctrl.value);

      const fakeDocument = document.createElement('div');
      const fakeWindow = {
        postMessage: sinon.stub(),
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub(),
        document: fakeDocument,
      } as unknown as Window;

      const windowWithChrome = window as unknown as WindowWithOptionalChrome;
      const originalChrome = windowWithChrome.chrome;
      delete windowWithChrome.chrome;

      try {
        self.injectedExtensionAPI(context.extensionDescriptor, 'main', 'dark',
                                  [shortcutKey], (extensionServer: unknown) => {
                                    const client = extensionServer as TestExtensionServerClient;
                                    sendRequestStub = sinon.stub(client, 'sendRequest');
                                  }, 1, fakeWindow);

        assert.exists(sendRequestStub);

        let keyReadCount = 0;
        let ctrlKeyReadCount = 0;
        let keyCodeReadCount = 0;

        const keydownEvent = new KeyboardEvent('keydown', {
          ctrlKey: true,
          key: 'p',
          code: 'KeyP',
          keyCode: 80,
        });

        Object.defineProperty(keydownEvent, 'ctrlKey', {
          get() {
            ctrlKeyReadCount++;
            return true;
          },
        });
        Object.defineProperty(keydownEvent, 'key', {
          get() {
            keyReadCount++;
            return 'p';
          },
        });
        Object.defineProperty(keydownEvent, 'keyCode', {
          get() {
            keyCodeReadCount++;
            return 80;
          },
        });

        // Dispatch the event to trigger forwardKeyboardEvent
        fakeDocument.dispatchEvent(keydownEvent);

        // Verify properties were read exactly once
        assert.strictEqual(ctrlKeyReadCount, 1);
        assert.strictEqual(keyReadCount, 1);
        assert.strictEqual(keyCodeReadCount, 1);

        // Wait for forwardTimer debounce.
        await new Promise(resolve => setTimeout(resolve, 10));

        sinon.assert.calledWith(
            sendRequestStub,
            sinon.match({
              command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
              entries: sinon.match.some(sinon.match({
                eventType: 'keydown',
                ctrlKey: true,
                altKey: false,
                metaKey: false,
                shiftKey: false,
                key: 'p',
                code: 'KeyP',
                keyCode: 80,
                location: 0,
              })),
            }),
        );
      } finally {
        windowWithChrome.chrome = originalChrome;
      }
    });

    it('extension client ignores input keystrokes without modifier keys', async () => {
      let sendRequestStub: sinon.SinonStub|undefined;
      const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKey('P', UI.KeyboardShortcut.Modifiers.None.value);

      const fakeDocument = document.createElement('div');
      const input = document.createElement('input');
      fakeDocument.appendChild(input);
      Object.defineProperty(fakeDocument, 'activeElement', {
        get() {
          return input;
        },
      });

      const fakeWindow = {
        postMessage: sinon.stub(),
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub(),
        document: fakeDocument,
      } as unknown as Window;

      const windowWithChrome = window as unknown as WindowWithOptionalChrome;
      const originalChrome = windowWithChrome.chrome;
      delete windowWithChrome.chrome;

      try {
        self.injectedExtensionAPI(context.extensionDescriptor, 'main', 'dark',
                                  [shortcutKey], (extensionServer: unknown) => {
                                    const client = extensionServer as TestExtensionServerClient;
                                    sendRequestStub = sinon.stub(client, 'sendRequest');
                                  }, 1, fakeWindow);

        assert.exists(sendRequestStub);

        const keydownEvent = new KeyboardEvent('keydown', {
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          key: 'p',
          code: 'KeyP',
          keyCode: 80,
          cancelable: true,
        });
        const preventDefaultSpy = sinon.spy(keydownEvent, 'preventDefault');

        fakeDocument.dispatchEvent(keydownEvent);
        sinon.assert.notCalled(preventDefaultSpy);

        await new Promise(resolve => setTimeout(resolve, 10));
        sinon.assert.notCalled(sendRequestStub);
      } finally {
        windowWithChrome.chrome = originalChrome;
      }
    });

    it('rejects commands other than ForwardKeyboardEvent', () => {
      const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const result = server.onForwardKeyboardEventForTest({
        command: 'invalidCommand' as Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
        entries: [],
      });
      assertIsStatus(result);
      assert.strictEqual(result.code, 'E_BADARG');
    });

    it('rejects invalid keyCode values and non-boolean modifiers', () => {
      const server = PanelCommon.ExtensionServer.ExtensionServer.instance();
      const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKey('P', UI.KeyboardShortcut.Modifiers.Ctrl.value);
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry.instance(), 'globalShortcutKeys').returns([shortcutKey]);

      // Invalid keyCode (out of range)
      const result1 = server.onForwardKeyboardEventForTest({
        command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
        entries: [{
          eventType: 'keydown',
          ctrlKey: true,
          altKey: false,
          metaKey: false,
          shiftKey: false,
          key: 'p',
          code: 'KeyP',
          keyCode: 300,
          location: 0,
        }],
      });
      assertIsStatus(result1);
      assert.strictEqual(result1.code, 'E_BADARG');

      // Invalid modifier type (ctrlKey as string)
      const result2 = server.onForwardKeyboardEventForTest({
        command: Extensions.ExtensionAPI.PrivateAPI.Commands.ForwardKeyboardEvent,
        entries: [{
          eventType: 'keydown',
          ctrlKey: 'true' as unknown as boolean,
          altKey: false,
          metaKey: false,
          shiftKey: false,
          key: 'p',
          code: 'KeyP',
          keyCode: 80,
          location: 0,
        }],
      });
      assertIsStatus(result2);
      assert.strictEqual(result2.code, 'E_BADARGTYPE');
    });
  });
});
