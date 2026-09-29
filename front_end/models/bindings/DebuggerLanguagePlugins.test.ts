// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {TestPlugin} from '../../testing/LanguagePluginHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {protocolCallFrame, stringifyFrame, stringifyStackTrace} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
// eslint-disable-next-line @devtools/es-modules-import
import * as StackTraceImpl from '../stack_trace/stack_trace_impl.js';
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
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  describe('getFunctionInfo', () => {
    let target: SDK.Target.Target;
    let pluginManager: Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager;
    let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

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
          Promise<string[]|{missingSymbolFiles: string[]}> {
        return Promise.resolve(['https://script-host/script.js']);
      }
    }

    let universe: TestUniverse;
    beforeEach(() => {
      universe = new TestUniverse();
      target = universe.createTarget();
      debuggerWorkspaceBinding = universe.debuggerWorkspaceBinding;
      pluginManager = debuggerWorkspaceBinding.pluginManager;
    });

    function createAndRegisterScript(): SDK.Script.Script {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      const scriptUrl = urlString`https://script-host/script.js`;
      return debuggerModel.parsedScriptSource('0' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', null,
                                              undefined, false, false, 0, null, null, null, null, null, null, null);
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

    it('correctly updates locations when missing debug info is reported', async () => {
      const plugin = new Plugin('TestPlugin');
      sinon.stub(plugin, 'addRawModule').returns(Promise.resolve({missingSymbolFiles: [MISSING_DWO_FILE]}));
      pluginManager.addPlugin(plugin);

      const updateLocationsSpy = sinon.spy(debuggerWorkspaceBinding, 'updateLocations');

      const script = createAndRegisterScript();
      await pluginManager.getSourcesForScript(script);

      sinon.assert.calledWith(updateLocationsSpy, script);
    });
  });

  describe('translateRawFrame', () => {
    function setup() {
      const backend = new MockDebuggerBackend();
      const target = backend.createTarget();
      const debuggerWorkspaceBinding =
          sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
      const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
      const pluginManager = new Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager(
          target.targetManager(), workspace, debuggerWorkspaceBinding, target.targetManager().getConsole());
      return {target, backend, pluginManager, debuggerWorkspaceBinding};
    }

    it('returns null if no plugin is registered for the frame', async () => {
      const {target, backend, pluginManager} = setup();
      const script = await backend.addScript(target, {url: urlString`foo.js`, content: ''}, null);
      const rawFrame = protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`);

      assert.isNull(await pluginManager.translateRawFrame(rawFrame, target));
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
      const rawFrame = protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`);

      const translatedFrame = await pluginManager.translateRawFrame(rawFrame, target);

      assert.exists(translatedFrame);
      assert.deepInclude(translatedFrame, {kind: StackTraceImpl.Trie.FrameKind.VISIBLE, unmapped: true});
      assert.strictEqual(translatedFrame.frames.map(stringifyFrame).join('\n'), 'at foo (foo.js:1:10)');
      assert.strictEqual(translatedFrame.frames[0].missingDebugInfo?.type,
                         StackTrace.StackTrace.MissingDebugInfoType.NO_INFO);
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
      const rawFrame = protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`);

      const translatedFrame = await pluginManager.translateRawFrame(rawFrame, target);

      assert.exists(translatedFrame);
      assert.deepInclude(translatedFrame, {kind: StackTraceImpl.Trie.FrameKind.VISIBLE, unmapped: true});
      assert.strictEqual(translatedFrame.frames.map(stringifyFrame).join('\n'), 'at foo (foo.js:1:10)');
      assert.deepEqual(translatedFrame.frames[0].missingDebugInfo, {
        type: StackTrace.StackTrace.MissingDebugInfoType.PARTIAL_INFO,
        missingDebugFiles: [{resourceUrl: urlString`foo.dwo`, initiator: plugin.createPageResourceLoadInitiator()}],
      });
    });

    it('translates frames by their position', async () => {
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
      const [fooFrame, barFrame] = [
        `${script.sourceURL}:${script.scriptId}::0:10`,
        `${script.sourceURL}:${script.scriptId}::0:20`,
      ].map(protocolCallFrame);

      const translatedFoo = await pluginManager.translateRawFrame(fooFrame, target);
      const translatedBar = await pluginManager.translateRawFrame(barFrame, target);

      assert.strictEqual(translatedFoo?.frames.map(stringifyFrame).join('\n'), 'at foo (foo.cc:1:5)');
      assert.strictEqual(translatedBar?.frames.map(stringifyFrame).join('\n'), 'at bar (bar.cc:2:10)');
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
      const rawFrame = protocolCallFrame(`${script.sourceURL}:${script.scriptId}::0:10`);

      const translatedFrame = await pluginManager.translateRawFrame(rawFrame, target);

      assert.exists(translatedFrame);
      assert.deepInclude(translatedFrame, {kind: StackTraceImpl.Trie.FrameKind.VISIBLE, unmapped: false});
      assert.deepEqual(translatedFrame.frames.map(stringifyFrame), [
        'at foo (foo.cc:2:5)',
        'at bar (bar.cc:4:10)',
      ]);
    });

    it('uses the translated source position when the plugin lacks function info', async () => {
      const {target, backend, pluginManager, debuggerWorkspaceBinding} = setup();
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

      const uiSourceCode =
          createContentProviderUISourceCode({url: urlString`foo.cc`, target, mimeType: 'text/plain'}).uiSourceCode;
      debuggerWorkspaceBinding.rawLocationToUILocation.resolves(uiSourceCode.uiLocation(10, 5));

      const rawFrame = protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`);

      const translatedFrame = await pluginManager.translateRawFrame(rawFrame, target);

      assert.exists(translatedFrame);
      assert.strictEqual(translatedFrame.frames.map(stringifyFrame).join('\n'), 'at foo (foo.cc:10:5)');
      assert.strictEqual(translatedFrame.frames[0].uiSourceCode, uiSourceCode);
      assert.deepEqual(translatedFrame.frames[0].missingDebugInfo, {
        type: StackTrace.StackTrace.MissingDebugInfoType.PARTIAL_INFO,
        missingDebugFiles: [{resourceUrl: urlString`foo.dwo`, initiator: plugin.createPageResourceLoadInitiator()}],
      });
    });
  });

  describe('removePlugin', () => {
    it('updates existing stack traces and invalidates cached translations when no other plugin takes over',
       async () => {
         const backend = new MockDebuggerBackend();
         const target = backend.createTarget();
         const {debuggerWorkspaceBinding} = backend.universe;
         const {pluginManager} = debuggerWorkspaceBinding;

         const script = await backend.addScript(target, {url: urlString`http://example.com/foo.js`, content: ''}, null);
         const callFrames = [protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:1:10`)];

         const plugin = new (class extends TestPlugin {
           override handleScript(_: SDK.Script.Script) {
             return true;
           }
           override addRawModule(): Promise<string[]> {
             return Promise.resolve(['http://example.com/foo.cc']);
           }
           override getFunctionInfo(): Promise<{frames: Chrome.DevTools.FunctionInfo[]}> {
             return Promise.resolve({frames: [{name: 'plugin_func'}]});
           }
           override rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation):
               Promise<Chrome.DevTools.SourceLocation[]> {
             return Promise.resolve([{
               rawModuleId: rawLocation.rawModuleId,
               sourceFileURL: 'http://example.com/foo.cc',
               lineNumber: 2,
               columnNumber: 5,
             }]);
           }
         })('TestPlugin');
         pluginManager.addPlugin(plugin);
         await pluginManager.getSourcesForScript(script);

         const existingStackTrace =
             await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime({callFrames}, target);
         assert.strictEqual(stringifyStackTrace(existingStackTrace), 'at plugin_func (foo.cc:2:5)');

         const updatedPromise = existingStackTrace.once(StackTrace.StackTrace.Events.UPDATED);
         pluginManager.removePlugin(plugin);

         const newStackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime({callFrames}, target);
         assert.strictEqual(stringifyStackTrace(newStackTrace), 'at foo (foo.js:1:10)');

         await updatedPromise;
         assert.strictEqual(stringifyStackTrace(existingStackTrace), 'at foo (foo.js:1:10)');
       });
  });

  describe('project securityOrigin partitioning', () => {
    it('assigns the script network origin to language plugin projects and isolates cross-origin scripts', async () => {
      const backend = new MockDebuggerBackend();
      const target = backend.createTarget();
      const pluginManager = backend.universe.debuggerWorkspaceBinding.pluginManager;

      const plugin = new (class extends TestPlugin {
        override handleScript(_: SDK.Script.Script) {
          return true;
        }
        override addRawModule(_rawModuleId: string, _symbolsURL: string,
                              _rawModule: Chrome.DevTools.RawModule): Promise<string[]|{missingSymbolFiles: string[]}> {
          return Promise.resolve(['https://victim.example/source.c']);
        }
      })('TestPlugin');
      pluginManager.addPlugin(plugin);

      const attackerScript = await backend.addScript(target, {
        url: urlString`https://attacker.com/module.wasm`,
        embedderName: urlString`https://attacker.com/module.wasm`,
        content: '',
      },
                                                     null);
      const attackerUiSourceCode =
          await backend.universe.debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(
              attackerScript.debuggerModel, urlString`https://victim.example/source.c`);
      assert.isNotNull(attackerUiSourceCode);
      assert.strictEqual(attackerUiSourceCode.project().securityOrigin()?.siteId(), 'https://attacker.com');
      assert.isTrue(attackerUiSourceCode.project().id().includes('https://attacker.com'));

      const victimScript = await backend.addScript(target, {
        url: urlString`https://victim.example/module.wasm`,
        embedderName: urlString`https://victim.example/module.wasm`,
        content: '',
      },
                                                   null);
      await pluginManager.getSourcesForScript(victimScript);
      const victimUiSourceCode = pluginManager.uiSourceCodeForURL(
          victimScript.debuggerModel, urlString`https://victim.example/source.c`, victimScript);
      assert.isNotNull(victimUiSourceCode);
      assert.notStrictEqual(victimUiSourceCode, attackerUiSourceCode);
      assert.strictEqual(victimUiSourceCode.project().securityOrigin()?.siteId(), 'https://victim.example');
    });

    it('assigns an opaque security origin to language plugin projects for opaque scripts', async () => {
      const backend = new MockDebuggerBackend();
      const target = backend.createTarget();
      const pluginManager = backend.universe.debuggerWorkspaceBinding.pluginManager;

      const plugin = new (class extends TestPlugin {
        override handleScript(_: SDK.Script.Script) {
          return true;
        }
        override addRawModule(_rawModuleId: string, _symbolsURL: string,
                              _rawModule: Chrome.DevTools.RawModule): Promise<string[]|{missingSymbolFiles: string[]}> {
          return Promise.resolve(['https://victim.example/source.c']);
        }
      })('TestPlugin');
      pluginManager.addPlugin(plugin);

      const dataScript = await backend.addScript(target, {
        url: urlString`data:application/wasm;base64,AGFzbQEAAAA=`,
        embedderName: urlString`data:application/wasm;base64,AGFzbQEAAAA=`,
        content: '',
      },
                                                 null);
      const uiSourceCode =
          await backend.universe.debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(
              dataScript.debuggerModel, urlString`https://victim.example/source.c`);
      assert.isNotNull(uiSourceCode);
      assert.strictEqual(dataScript.securityOrigin(), dataScript.securityOrigin());
      assert.isNotNull(uiSourceCode.project().securityOrigin());
      assert.isTrue(uiSourceCode.project().securityOrigin()?.isOpaque());
      assert.strictEqual(pluginManager.uiSourceCodeForURL(dataScript.debuggerModel,
                                                          urlString`https://victim.example/source.c`, dataScript),
                         uiSourceCode);
    });
  });
});

describe('SourceScope', () => {
  function createMockCallFrame(): SDK.DebuggerModel.CallFrame {
    const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    const runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
    const target = sinon.createStubInstance(SDK.Target.Target);
    runtimeModel.target.returns(target);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.runtimeModel.returns(runtimeModel);
    callFrame.debuggerModel = debuggerModel;

    const script = sinon.createStubInstance(SDK.Script.Script);
    script.codeOffset.returns(0);
    Object.defineProperty(script, 'sourceURL', {value: 'test.wasm'});
    Object.defineProperty(script, 'scriptId', {value: '1'});
    Object.defineProperty(callFrame, 'script', {value: script});
    callFrame.location.returns(new SDK.DebuggerModel.Location(debuggerModel, script.scriptId, 0));
    Object.defineProperty(callFrame, 'inlineFrameIndex', {value: 0});
    return callFrame;
  }

  it('handles Object.prototype property names in the root namespace', async () => {
    const callFrame = createMockCallFrame();
    const plugin = new TestPlugin('TestPlugin');
    const scope = new Bindings.DebuggerLanguagePlugins.SourceScope(callFrame, 0n, 'LOCAL', 'Local', undefined, plugin);

    scope.object().variables = [
      {scope: 'LOCAL', name: 'v', nestedName: ['__proto__', 'polluted'], type: 'i32'},
      {scope: 'LOCAL', name: 'w', nestedName: ['constructor', 'evil'], type: 'i32'},
    ];

    const result = await scope.object().getAllProperties(false, false);
    assert.isNotNull(result.properties);
    assert.sameMembers(result.properties!.map(property => property.name), ['__proto__', 'constructor']);
  });

  it('handles Object.prototype property names in a child namespace', async () => {
    const callFrame = createMockCallFrame();
    const plugin = new TestPlugin('TestPlugin');
    const scope = new Bindings.DebuggerLanguagePlugins.SourceScope(callFrame, 0n, 'LOCAL', 'Local', undefined, plugin);

    scope.object().variables = [
      {scope: 'LOCAL', name: 'v', nestedName: ['safe', '__proto__', 'polluted'], type: 'i32'},
    ];

    const result = await scope.object().getAllProperties(false, false);
    assert.isNotNull(result.properties);
    assert.deepEqual(result.properties!.map(property => property.name), ['safe']);
  });
});
