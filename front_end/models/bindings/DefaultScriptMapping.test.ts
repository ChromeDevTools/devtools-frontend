// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

describeWithMockConnection('DefaultScriptMapping', () => {
  const url = 'file:///tmp/example.js' as Platform.DevToolsPath.UrlString;
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
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
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    target = createTarget();
    backend = new MockProtocolBackend();
    defaultScriptMapping = new Bindings.DefaultScriptMapping.DefaultScriptMapping(
        target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel,
        Workspace.Workspace.WorkspaceImpl.instance(),
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance());
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
      assert.strictEqual(rawLocations.length, 1);
      assert.strictEqual(rawLocations[0].lineNumber, 3);
      assert.strictEqual(rawLocations[0].columnNumber, 9);
    });

    it('maps UI locations in inline scripts without sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: false}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 1, 2);
      assert.strictEqual(rawLocations.length, 1);
      assert.strictEqual(rawLocations[0].lineNumber, 4);
      assert.strictEqual(rawLocations[0].columnNumber, 2);
    });

    it('maps UI locations in inline scripts with sourceURL', async () => {
      const script = await backend.addScript(
          target, {content: contentWithSourceUrl, url, startLine: 3, startColumn: 8, hasSourceURL: true}, null);
      const uiSourceCode = defaultScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocations = defaultScriptMapping.uiLocationToRawLocations(uiSourceCode, 4, 2);
      assert.strictEqual(rawLocations.length, 1);
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
});
