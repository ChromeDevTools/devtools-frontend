// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {TestPlugin} from '../../testing/LanguagePluginHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import {protocolCallFrame, stringifyFrame} from '../../testing/StackTraceHelpers.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
import type * as StackTraceImpl from '../stack_trace/stack_trace_impl.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('ExtensionRemoteObject', () => {
  describe('isLinearMemoryInspectable', () => {
    it('yields false when the extension object has no linear memory address', () => {
      const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
      const extensionObject: Chrome.DevTools.RemoteObject = {
        type: 'object',
        hasChildren: false,
      };
      const plugin = new TestPlugin('TestPlugin');
      const remoteObject =
          new Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject(callFrame, extensionObject, plugin);
      assert.isFalse(remoteObject.isLinearMemoryInspectable());
    });

    it('yields true when the extension object has a linear memory address', () => {
      const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
      const extensionObject: Chrome.DevTools.RemoteObject = {
        type: 'object',
        linearMemoryAddress: 42,
        hasChildren: false,
      };
      const plugin = new TestPlugin('TestPlugin');
      const remoteObject =
          new Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject(callFrame, extensionObject, plugin);
      assert.isTrue(remoteObject.isLinearMemoryInspectable());
    });
  });
});

describe('DebuggerLanguagePluginManager', () => {
  describeWithMockConnection('getFunctionInfo', () => {
    let target: SDK.Target.Target;
    let pluginManager: Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager;

    const MISSING_DWO_FILE = 'test.dwo';
    const MISSING_DEBUG_FILES: SDK.DebuggerModel.MissingDebugFiles = {
      resourceUrl: urlString`${MISSING_DWO_FILE}`,
      initiator: {
        target: null,
        frameId: null,
        extensionId: 'chrome-extension-id',
        initiatorUrl: urlString`chrome-extension-id`,
      },
    };
    const FUNCTION_NAME = 'test';

    class Plugin extends TestPlugin {
      override getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation):
          Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
                  {frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
        return Promise.resolve({missingSymbolFiles: []});
      }
      override handleScript(_: SDK.Script.Script) {
        return true;
      }
      override addRawModule(_rawModuleId: string, _symbolsURL: string, _rawModule: Chrome.DevTools.RawModule):
          Promise<string[]> {
        return Promise.resolve(['https://script-host/script.js']);
      }
    }

    beforeEach(() => {
      target = createTarget();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const targetManager = target.targetManager();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
      });
      pluginManager = debuggerWorkspaceBinding.pluginManager;
    });

    function createAndRegisterScript(): SDK.Script.Script {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      const scriptUrl = urlString`https://script-host/script.js`;
      return debuggerModel.parsedScriptSource(
          '0' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', null, false, undefined, false, false, 0, null,
          null, null, null, null, null, null);
    }

    it('correctly processes missing debug info if available', async () => {
      const plugin = new Plugin('TestPlugin');
      sinon.stub(plugin, 'getFunctionInfo').returns(Promise.resolve({missingSymbolFiles: [MISSING_DWO_FILE]}));
      pluginManager.addPlugin(plugin);

      const script = createAndRegisterScript();

      const location = sinon.createStubInstance(SDK.DebuggerModel.Location);
      const result = await pluginManager.getFunctionInfo(script, location);
      assert.exists(result);
      assert.deepEqual(result, {missingSymbolFiles: [MISSING_DEBUG_FILES]});
    });

    it('correctly returns frames if available', async () => {
      const plugin = new Plugin('TestPlugin');
      sinon.stub(plugin, 'getFunctionInfo').returns(Promise.resolve({frames: [{name: FUNCTION_NAME}]}));
      pluginManager.addPlugin(plugin);

      const script = createAndRegisterScript();
      const location = sinon.createStubInstance(SDK.DebuggerModel.Location);

      const result = await pluginManager.getFunctionInfo(script, location);
      assert.exists(result);
      assert.deepEqual(result, {frames: [{name: FUNCTION_NAME}]});
    });

    it('correctly returns frames and missing debug info if both are available', async () => {
      const plugin = new Plugin('TestPlugin');
      sinon.stub(plugin, 'getFunctionInfo')
          .returns(Promise.resolve({frames: [{name: FUNCTION_NAME}], missingSymbolFiles: [MISSING_DWO_FILE]}));
      pluginManager.addPlugin(plugin);

      const script = createAndRegisterScript();
      const location = sinon.createStubInstance(SDK.DebuggerModel.Location);

      const result = await pluginManager.getFunctionInfo(script, location);
      assert.exists(result);
      assert.deepEqual(result, {frames: [{name: FUNCTION_NAME}], missingSymbolFiles: [MISSING_DEBUG_FILES]});
    });
  });

  describeWithMockConnection('translateRawFramesStep', () => {
    function setup() {
      const target = createTarget();
      const backend = new MockProtocolBackend();
      const debuggerWorkspaceBinding =
          sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
      const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
      const pluginManager = new Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager(
          target.targetManager(), workspace, debuggerWorkspaceBinding);
      return {target, backend, pluginManager};
    }

    it('returns false if no plugin is registered for the top-most frame', async () => {
      const {target, backend, pluginManager} = setup();
      const script = await backend.addScript(target, {url: urlString`foo.js`, content: ''}, null);
      const rawFrames = [protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`)];

      assert.isFalse(await pluginManager.translateRawFramesStep(rawFrames, [], target));
      assert.lengthOf(rawFrames, 1);
    });

    it('identity maps the frame with a NO_INFO status when the plugin returns an empty array', async () => {
      const {target, backend, pluginManager} = setup();
      const script = await backend.addScript(target, {url: urlString`foo.js`, content: ''}, null);
      const plugin = new (class extends TestPlugin {
        override getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation):
            Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
                    {frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
          return Promise.resolve({frames: []});
        }
        override handleScript(_: SDK.Script.Script) {
          return true;
        }
      })('TestPlugin');
      pluginManager.addPlugin(plugin);
      const rawFrames = [protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`)];
      const translatedFrames: Awaited<ReturnType<StackTraceImpl.StackTraceModel.TranslateRawFrames>> = [];

      assert.isTrue(await pluginManager.translateRawFramesStep(rawFrames, translatedFrames, target));

      assert.lengthOf(rawFrames, 0);
      assert.lengthOf(translatedFrames, 1);
      assert.strictEqual(translatedFrames[0].map(stringifyFrame).join('\n'), 'at foo (foo.js:1:10)');
      assert.strictEqual(
          translatedFrames[0][0].missingDebugInfo?.type, StackTrace.StackTrace.MissingDebugInfoType.NO_INFO);
    });

    it('identity maps the frame with a PARTIAL_INFO status when the plugin returns missing debug symbols', async () => {
      const {target, backend, pluginManager} = setup();
      const script = await backend.addScript(target, {url: urlString`foo.js`, content: ''}, null);
      const plugin = new (class extends TestPlugin {
        override getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation):
            Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
                    {frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
          return Promise.resolve({missingSymbolFiles: ['foo.dwo']});
        }
        override handleScript(_: SDK.Script.Script) {
          return true;
        }
      })('TestPlugin');
      pluginManager.addPlugin(plugin);
      const rawFrames = [protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`)];
      const translatedFrames: Awaited<ReturnType<StackTraceImpl.StackTraceModel.TranslateRawFrames>> = [];

      assert.isTrue(await pluginManager.translateRawFramesStep(rawFrames, translatedFrames, target));

      assert.lengthOf(rawFrames, 0);
      assert.lengthOf(translatedFrames, 1);
      assert.strictEqual(translatedFrames[0].map(stringifyFrame).join('\n'), 'at foo (foo.js:1:10)');
      assert.deepEqual(translatedFrames[0][0].missingDebugInfo, {
        type: StackTrace.StackTrace.MissingDebugInfoType.PARTIAL_INFO,
        missingDebugFiles: [{resourceUrl: urlString`foo.dwo`, initiator: plugin.createPageResourceLoadInitiator()}],
      });
    });

    it('translates one frame at a time', async () => {
      const {target, backend, pluginManager} = setup();
      sinon.stub(pluginManager, 'uiSourceCodeForURL')
          .callsFake(
              (_model, url) => createContentProviderUISourceCode({url, target, mimeType: 'text/plain'}).uiSourceCode);
      const script = await backend.addScript(target, {url: urlString`foo.js`, content: ''}, null);
      const plugin = new (class extends TestPlugin {
        override getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation):
            Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
                    {frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
          const name = rawLocation.codeOffset === 10 ? 'foo' : rawLocation.codeOffset === 20 ? 'bar' : 'unknown';
          return Promise.resolve({frames: [{name}]});
        }
        override handleScript(_: SDK.Script.Script) {
          return true;
        }
        override rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation):
            Promise<Chrome.DevTools.SourceLocation[]> {
          const sourceFileURL = rawLocation.codeOffset === 10 ? 'foo.cc' :
              rawLocation.codeOffset === 20                   ? 'bar.cc' :
                                                                'unknown';
          return Promise.resolve([{
            rawModuleId: rawLocation.rawModuleId,
            sourceFileURL,
            lineNumber: rawLocation.codeOffset / 10,
            columnNumber: rawLocation.codeOffset / 2,
          }]);
        }
      })('TestPlugin');
      pluginManager.addPlugin(plugin);
      const rawFrames = [
        `${script.sourceURL}:${script.scriptId}::0:10`,
        `${script.sourceURL}:${script.scriptId}::0:20`,
      ].map(protocolCallFrame);
      const translatedFrames: Awaited<ReturnType<StackTraceImpl.StackTraceModel.TranslateRawFrames>> = [];

      assert.isTrue(await pluginManager.translateRawFramesStep(rawFrames, translatedFrames, target));

      assert.lengthOf(rawFrames, 1);
      assert.lengthOf(translatedFrames, 1);
      assert.strictEqual(translatedFrames[0].map(stringifyFrame).join('\n'), 'at foo (foo.cc:1:5)');

      assert.isTrue(await pluginManager.translateRawFramesStep(rawFrames, translatedFrames, target));

      assert.lengthOf(rawFrames, 0);
      assert.lengthOf(translatedFrames, 2);
      assert.strictEqual(translatedFrames[1].map(stringifyFrame).join('\n'), 'at bar (bar.cc:2:10)');
    });

    it('translates inlined frames correctly', async () => {
      const {target, backend, pluginManager} = setup();
      sinon.stub(pluginManager, 'uiSourceCodeForURL')
          .callsFake(
              (_model, url) => createContentProviderUISourceCode({url, target, mimeType: 'text/plain'}).uiSourceCode);
      const script = await backend.addScript(target, {url: urlString`foo.js`, content: ''}, null);
      const plugin = new (class extends TestPlugin {
        override getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation):
            Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
                    {frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
          return Promise.resolve({frames: [{name: 'foo'}, {name: 'bar'}]});
        }
        override handleScript(_: SDK.Script.Script) {
          return true;
        }
        override rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation):
            Promise<Chrome.DevTools.SourceLocation[]> {
          const sourceFileURL = rawLocation.inlineFrameIndex === 0 ? 'foo.cc' :
              rawLocation.inlineFrameIndex === 1                   ? 'bar.cc' :
                                                                     'unknown';
          return Promise.resolve([{
            rawModuleId: rawLocation.rawModuleId,
            sourceFileURL,
            lineNumber: (rawLocation.inlineFrameIndex + 1) * 2,
            columnNumber: (rawLocation.inlineFrameIndex + 1) * 5,
          }]);
        }
      })('TestPlugin');
      pluginManager.addPlugin(plugin);
      const rawFrames = [protocolCallFrame(`${script.sourceURL}:${script.scriptId}::0:10`)];
      const translatedFrames: Awaited<ReturnType<StackTraceImpl.StackTraceModel.TranslateRawFrames>> = [];

      assert.isTrue(await pluginManager.translateRawFramesStep(rawFrames, translatedFrames, target));

      assert.lengthOf(rawFrames, 0);
      assert.lengthOf(translatedFrames, 1);
      assert.deepEqual(translatedFrames[0].map(stringifyFrame), [
        'at foo (foo.cc:2:5)',
        'at bar (bar.cc:4:10)',
      ]);
    });
  });
});
