// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import {protocolCallFrame, stringifyStackTrace} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Formatter from '../formatter/formatter.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
// eslint-disable-next-line @devtools/es-modules-import
import type * as StackTraceImpl from '../stack_trace/stack_trace_impl.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('DebuggerWorkspaceBinding', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  afterEach(() => {
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });

  it('can wait for a uiSourceCode if it is not yet available', async () => {
    const backend = new MockDebuggerBackend();
    const debuggerWorkspaceBinding = backend.universe.debuggerWorkspaceBinding;
    const target =
        backend.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const scriptUrl = urlString`http://script-host/script.js`;
    const scriptInfo = {url: scriptUrl, content: 'console.log(1);', startLine: 0, startColumn: 0, hasSourceURL: false};

    // Create a second target.
    const workerTarget = backend.createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      name: 'worker',
      type: SDK.Target.Type.ServiceWorker,
      parentTarget: target,
    });

    // Before any script is registered, there shouldn't be any uiSourceCodes.
    assert.isNull(backend.universe.workspace.uiSourceCodeForURL(scriptUrl));

    // Create promise to await the uiSourceCode given the url and its target.
    const uiSourceCodePromise = debuggerWorkspaceBinding.waitForUISourceCodeAdded(scriptUrl, target);

    // Register the script, which will kick off creating the uiSourceCode.
    await backend.addScript(target, scriptInfo, null);
    await backend.addScript(workerTarget, scriptInfo, null);

    // Await the promise to retrieve the uiSourceCode.
    const uiSourceCode = await uiSourceCodePromise;

    // Check if the uiSourceCode is the expected one (from the main target, and having the correct sourceURL).
    assert.strictEqual(uiSourceCode.url(), scriptUrl);
    assert.deepEqual(Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode), target);
  });

  it('augments sourcemap with scopes via DebuggerWorkspaceBindings.setFunctionRanges', async () => {
    const backend = new MockDebuggerBackend();
    const {debuggerWorkspaceBinding} = backend.universe;
    const target =
        backend.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    const validFunctionRanges = [{start: {line: 0, column: 0}, end: {line: 10, column: 1}, name: 'foo'}];
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);

    const scriptUrl = urlString`file://main.js`;
    const scriptSource =
        'function n(){o("hi");console.log("done")}function o(n){const o=performance.now();while(performance.now()-o<n);}n();o(200);\n//# sourceMappingURL=gen.js.map';
    const sourceMapUrl = 'file://gen.js.map/';
    const sourceMapContent = {
      version: 3,
      names: ['sayHi', 'someFunction', 'console', 'log', 'breakDuration', 'started', 'performance', 'now'],
      sources: ['main.js'],
      mappings:
          'AAAA,SAASA,IACLC,EAAW,MACXC,QAAQC,IAAI,OAChB,CAEA,SAASF,EAAWG,GAChB,MAAMC,EAAUC,YAAYC,MAC5B,MAAQD,YAAYC,MAAQF,EAAWD,GAC3C,CAEAJ,IACAC,EAAW',
    };

    const script = await backend.addScript(target, {url: scriptUrl, content: scriptSource},
                                           {url: sourceMapUrl, content: sourceMapContent});
    const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);

    assert.exists(sourceMap);
    await sourceMap.waitForScopeInfo();
    assert.strictEqual(sourceMap.url(), 'file://gen.js.map/');

    const uiSourceCodeForSourceMap = backend.universe.workspace.uiSourceCodeForURL(sourceMap.sourceURLs()[0]);
    assert.exists(uiSourceCodeForSourceMap);

    debuggerWorkspaceBinding.setFunctionRanges(uiSourceCodeForSourceMap, validFunctionRanges);

    assert.isTrue(sourceMap.hasScopeInfo());
    assert.strictEqual(sourceMap.findOriginalFunctionName({line: 0, column: 110}), 'foo');
  });

  it('re-translates existing stack traces after DebuggerWorkspaceBindings.setFunctionRanges', async () => {
    const backend = new MockDebuggerBackend();
    const {debuggerWorkspaceBinding} = backend.universe;
    const target =
        backend.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);

    //                                                   10        20        30        40
    //                                         0123456789012345678901234567890123456789012345678
    const script = await backend.addScript(
        target, {url: urlString`file://main.js`, content: 'function n(){o("hi")}function o(n){debugger}n();'}, {
          url: 'file://gen.js.map/',
          content: encodeSourceMap(['0:0 => main.js:0:0', '0:35 => main.js:5:2']),
        });
    const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    assert.exists(sourceMap);
    const uiSourceCodeForSourceMap = backend.universe.workspace.uiSourceCodeForURL(sourceMap.sourceURLs()[0]);
    assert.exists(uiSourceCodeForSourceMap);

    // Translated before the extension provides function ranges: the name comes from the AST-derived scopes.
    const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
        {callFrames: [protocolCallFrame(`${script.sourceURL}:${script.scriptId}:o:0:35`)]}, target);
    assert.strictEqual(stackTrace.syncFragment.frames[0].name, 'o');
    const updatedSpy = sinon.spy();
    stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, updatedSpy);

    debuggerWorkspaceBinding.setFunctionRanges(
        uiSourceCodeForSourceMap, [{start: {line: 0, column: 0}, end: {line: 10, column: 1}, name: 'foo'}]);
    await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

    sinon.assert.calledOnce(updatedSpy);
    assert.strictEqual(stackTrace.syncFragment.frames[0].name, 'foo');
  });

  describe('createStackTraceFromProtocolRuntime', () => {
    it('identity translates frames by default', async () => {
      const universe = new TestUniverse();
      const target =
          universe.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
      const stackTrace = await universe.debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime({
        callFrames: [
          'foo.js:1:foo:1:10',
          'bar.js:2:bar:2:20',
          'baz.js:3:baz:3:30',
        ].map(protocolCallFrame),
      },
                                                                                                     target);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (bar.js:2:20)',
        'at baz (baz.js:3:30)',
      ].join('\n'));
    });

    it('identity translates frames for disposed targets (no ModelData instance)', async () => {
      const universe = new TestUniverse();
      const target =
          universe.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
      target.dispose('disposed for testing');
      const stackTrace = await universe.debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime({
        callFrames: [
          'foo.js:1:foo:1:10',
          'bar.js:2:bar:2:20',
          'baz.js:3:baz:3:30',
        ].map(protocolCallFrame),
      },
                                                                                                     target);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (bar.js:2:20)',
        'at baz (baz.js:3:30)',
      ].join('\n'));
    });

    it('calls the debugger language plugin', async () => {
      const universe = new TestUniverse();
      const target =
          universe.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
      const spy = sinon.spy(universe.debuggerWorkspaceBinding.pluginManager, 'translateRawFrame');

      await universe.debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime({
        callFrames: [
          'foo.js:1:foo:1:10',
          'bar.js:2:bar:2:20',
          'baz.js:3:baz:3:30',
        ].map(protocolCallFrame),
      },
                                                                                  target);

      sinon.assert.calledThrice(spy);
    });

    it('translates source location via the fallback script mapping', async () => {
      const backend = new MockDebuggerBackend();
      const debuggerWorkspaceBinding = backend.universe.debuggerWorkspaceBinding;
      const target =
          backend.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
      const script = await backend.addScript(
          target, {
            url: Platform.DevToolsPath.urlString`http://example.com/foo.js`,
            content: '// content omitted as its not required',
          },
          null);
      const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
          {
            callFrames: [
              `${script.contentURL()}:${script.scriptId}:foo:1:10`,
              `${script.contentURL()}:${script.scriptId}:bar:2:20`,
              `${script.contentURL()}:${script.scriptId}:baz:3:30`,
            ].map(protocolCallFrame),
          },
          target);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (foo.js:2:20)',
        'at baz (foo.js:3:30)',
      ].join('\n'));

      assert.strictEqual(stackTrace.syncFragment.frames[0].uiSourceCode, uiSourceCode);
      assert.strictEqual(stackTrace.syncFragment.frames[1].uiSourceCode, uiSourceCode);
      assert.strictEqual(stackTrace.syncFragment.frames[2].uiSourceCode, uiSourceCode);
    });

    describe('isUnmapped', () => {
      function isUnmapped(stackTrace: StackTrace.StackTrace.StackTrace): boolean[] {
        const fragment = stackTrace.syncFragment as StackTraceImpl.StackTraceImpl.FragmentImpl;
        return [...fragment.node?.getCallStack() ?? []].map(node => node.isUnmapped);
      }

      function setup() {
        const backend = new MockDebuggerBackend();
        const target =
            backend.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
        return {backend, target, debuggerWorkspaceBinding: backend.universe.debuggerWorkspaceBinding};
      }

      it('is true for frames of scripts without source map and for builtins', async () => {
        const {backend, target, debuggerWorkspaceBinding} = setup();
        const script =
            await backend.addScript(target, {url: urlString`http://example.com/foo.js`, content: 'foo'}, null);

        const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
            {callFrames: [`${script.sourceURL}:${script.scriptId}:foo:0:0`, '::forEach::'].map(protocolCallFrame)},
            target);

        assert.deepEqual(isUnmapped(stackTrace), [true, true]);
      });

      it('is true for frames of scripts whose source map is still loading', async () => {
        const {backend, target, debuggerWorkspaceBinding} = setup();
        sinon.stub(backend.universe.pageResourceLoader, 'loadResource').returns(new Promise(() => {}));
        const url = urlString`http://example.com/foo.js`;
        // Doesn't resolve, as the source map never loads.
        void backend.addScript(target, {url, content: 'foo'}, {url: 'http://example.com/foo.js.map', content: ''});
        const script = target.model(SDK.DebuggerModel.DebuggerModel)?.scripts().find(s => s.sourceURL === url);
        assert.exists(script);

        const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
            {callFrames: [protocolCallFrame(`${url}:${script.scriptId}:foo:0:0`)]}, target);

        assert.deepEqual(isUnmapped(stackTrace), [true]);
        assert.strictEqual(stackTrace.syncFragment.frames[0].uiSourceCode?.url(), `${url}:sourcemap`);
      });

      it('is false for source-mapped frames that fall back to the default translation', async () => {
        const {backend, target, debuggerWorkspaceBinding} = setup();
        sinon.stub(Bindings.CompilerScriptMapping.CompilerScriptMapping.prototype, 'translateRawFrame').resolves(null);
        const script = await backend.addScript(target, {url: urlString`http://example.com/foo.js`, content: 'foo'}, {
          url: 'http://example.com/foo.js.map',
          content: {version: 3, sources: ['foo.ts'], mappings: 'AAAA', names: []},
        });

        const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
            {callFrames: [protocolCallFrame(`${script.sourceURL}:${script.scriptId}:foo:0:0`)]}, target);

        assert.deepEqual(isUnmapped(stackTrace), [false]);
        assert.strictEqual(stackTrace.syncFragment.frames[0].uiSourceCode?.url(), 'http://example.com/foo.ts');
      });
    });
  });
});
