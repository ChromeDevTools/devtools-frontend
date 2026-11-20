// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('DefaultScriptMapping', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  const url = urlString`file:///tmp/example.js`;
  let target: SDK.Target.Target;
  let backend: MockDebuggerBackend;
  let defaultScriptMapping: Bindings.DefaultScriptMapping.DefaultScriptMapping;
  const contentWithSourceUrl = `<p>
  Hello!
</p>
<script>console.log("Hi!");
  debugger;
  console.log("There!");
//# sourceURL=test.js
</script>`;
  const contentWithoutSourceUrl = `<p>
  Hello!
</p>
<script>console.log("Hi!");
  debugger;
  console.log("There!");
</script>`;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    target = backend.createTarget();
    defaultScriptMapping = new Bindings.DefaultScriptMapping.DefaultScriptMapping(
        target.model(SDK.DebuggerModel.DebuggerModel)!, backend.universe.workspace,
        backend.universe.debuggerWorkspaceBinding);
  });

  describe('rawLocationToUILocation', () => {
    it('maps raw locations on first line in inline scripts without sourceURL', async () => {
      const {scriptId, debuggerModel} = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiLocation = defaultScriptMapping.rawLocationToUILocation(
          new SDK.DebuggerModel.Location(debuggerModel, scriptId, 3, 9, 0));
      assert.strictEqual(uiLocation?.lineNumber, 0);
      assert.strictEqual(uiLocation?.columnNumber, 1);
    });

    it('maps raw locations in inline scripts without sourceURL', async () => {
      const {scriptId, debuggerModel} = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiLocation = defaultScriptMapping.rawLocationToUILocation(
          new SDK.DebuggerModel.Location(debuggerModel, scriptId, 4, 2, 0));
      assert.strictEqual(uiLocation?.lineNumber, 1);
      assert.strictEqual(uiLocation?.columnNumber, 2);
    });

    it('maps raw locations in inline scripts with sourceURL', async () => {
      const {scriptId, debuggerModel} = await backend.addScript(
          target, {content: contentWithSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: true}, null);
      const uiLocation = defaultScriptMapping.rawLocationToUILocation(
          new SDK.DebuggerModel.Location(debuggerModel, scriptId, 4, 2, 0));
      assert.strictEqual(uiLocation?.lineNumber, 4);
      assert.strictEqual(uiLocation?.columnNumber, 2);
    });
  });

  describe('uiLocationToRawLocations', () => {
    it('maps UI locations on first line in inline scripts without sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 0, 1);
      assert.lengthOf(rawLocations, 1);
      assert.strictEqual(rawLocations[0].lineNumber, 3);
      assert.strictEqual(rawLocations[0].columnNumber, 9);
    });

    it('maps UI locations in inline scripts without sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 1, 2);
      assert.lengthOf(rawLocations, 1);
      assert.strictEqual(rawLocations[0].lineNumber, 4);
      assert.strictEqual(rawLocations[0].columnNumber, 2);
    });

    it('maps UI locations in inline scripts with sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: true}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 4, 2);
      assert.lengthOf(rawLocations, 1);
      assert.strictEqual(rawLocations[0].lineNumber, 4);
      assert.strictEqual(rawLocations[0].columnNumber, 2);
    });
  });

  describe('uiLocationRangeToRawLocationRanges', () => {
    it('maps UI location ranges on first line in inline scripts without sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocationRanges = defaultScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(0, 1, 0, 4));
      assert.exists(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 3);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 9);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 3);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 12);
    });

    it('maps UI location ranges in inline scripts without sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocationRanges = defaultScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(1, 2, 2, 4));
      assert.exists(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 4);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 5);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 4);
    });

    it('maps UI locations in inline scripts with sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: true}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocationRanges = defaultScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(4, 2, 4, 4));
      assert.exists(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 4);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 4);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 4);
    });
  });

  it('marks conditional breakpoint scripts as ignored', async () => {
    const content = 'x === 5\n\n//# sourceURL=debugger://breakpoint';
    const script = await backend.addScript(
        target, {content, url: SDK.DebuggerModel.COND_BREAKPOINT_SOURCE_URL, hasSourceURL: true}, null);
    const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
    assert.exists(uiSourceCode);

    assert.isTrue(uiSourceCode.isUnconditionallyIgnoreListed());
  });

  it('marks logpoint scripts as ignored', async () => {
    const content = 'console.log(x)\n\n//# sourceURL=debugger://logpoint';
    const script = await backend.addScript(
        target, {content, url: SDK.DebuggerModel.LOGPOINT_SOURCE_URL, hasSourceURL: true}, null);
    const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
    assert.exists(uiSourceCode);

    assert.isTrue(uiSourceCode.isUnconditionallyIgnoreListed());
  });

  it('registers Wasm scripts with application/wasm MIME type', async () => {
    const script = await backend.addScript(target, {
      content: '00 61 73 6d',
      url: urlString`wasm://wasm/test`,
      hasSourceURL: false,
      scriptLanguage: Protocol.Debugger.ScriptLanguage.WebAssembly,
    },
                                           null);
    const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
    assert.exists(uiSourceCode);

    assert.strictEqual(uiSourceCode.mimeType(), 'application/wasm');
  });

  it('associates created UISourceCodes with their script and target', async () => {
    const script = await backend.addScript(
        target, {content: 'console.log(1);', url, startLine: 0, startColumn: 0, hasSourceURL: false}, null);
    const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
    assert.exists(uiSourceCode);

    assert.strictEqual(defaultScriptMapping.scriptForUISourceCode(uiSourceCode), script);
    assert.strictEqual(Bindings.DefaultScriptMapping.DefaultScriptMapping.scriptForUISourceCode(uiSourceCode), script);
    assert.strictEqual(Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode), target);
  });
});

describe('DefaultScriptMapping discarded anonymous scripts', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  setupSettingsHooks();

  let universe: TestUniverse|undefined;
  let connection: MockCDPConnection;
  let target: SDK.Target.Target;
  let workspace: Workspace.Workspace.WorkspaceImpl;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    connection.setSuccessHandler('Debugger.enable',
                                 () => ({debuggerId: 'DEBUGGER_ID' as Protocol.Runtime.UniqueDebuggerId}));
    // Eagerly instantiate DebuggerWorkspaceBinding so its TargetManager observer
    // registers DefaultScriptMapping before the target is created.
    void universe.debuggerWorkspaceBinding;
    target = universe.createTarget({connection});
    workspace = universe.workspace;
  });

  afterEach(() => {
    universe?.dispose();
    universe = undefined;
  });

  it('discards anonymous scripts without sourceURL that fail to parse', async () => {
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    if (!debuggerModel.isReadyToPause()) {
      await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
    }

    let discardedScripts = 0;
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DiscardedAnonymousScriptSource, () => {
      ++discardedScripts;
    });

    for (let i = 0; i < 2000; ++i) {
      const source = `#BAD SCRIPT# ${i}`;
      connection.dispatchEvent('Debugger.scriptFailedToParse', {
        scriptId: `${i + 1}` as Protocol.Runtime.ScriptId,
        url: '',
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: source.length,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        executionContextAuxData: {isDefault: true, type: 'default'},
        sourceMapURL: '',
        hasSourceURL: false,
        isModule: false,
        length: source.length,
        stackTrace: {
          callFrames: [{
            functionName: 'generateErrorScripts',
            scriptId: '0' as Protocol.Runtime.ScriptId,
            url: '',
            lineNumber: 0,
            columnNumber: 0,
          }],
        },
        scriptLanguage: Protocol.Debugger.ScriptLanguage.JavaScript,
        embedderName: '',
      },
                               target.sessionId);
    }

    const codes = workspace.uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.Debugger);
    assert.strictEqual(discardedScripts, 1100);
    assert.lengthOf(codes, 900);
  });
});
