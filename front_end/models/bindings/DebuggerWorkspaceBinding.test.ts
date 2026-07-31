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
import {protocolCallFrame, stringifyStackTrace} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('DebuggerWorkspaceBinding', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

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
      const spy = sinon.spy(universe.debuggerWorkspaceBinding.pluginManager, 'translateRawFramesStep');

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
  });
});
