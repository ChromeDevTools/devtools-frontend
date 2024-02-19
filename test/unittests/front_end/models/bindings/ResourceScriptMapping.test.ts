// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';

describeWithMockConnection('ResourceScriptMapping', () => {
  const url = 'http://localhost/example.js' as Platform.DevToolsPath.UrlString;
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let resourceScriptMapping: Bindings.ResourceScriptMapping.ResourceScriptMapping;
  const contentWithSourceUrl = `console.log("Hi!");
  debugger;
  console.log("There!");
//# sourceURL=test.js`;
  const contentWithoutSourceUrl = `console.log("Hi!");
  debugger;
  console.log("There!");`;

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
    resourceScriptMapping = new Bindings.ResourceScriptMapping.ResourceScriptMapping(
        target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel, workspace,
        debuggerWorkspaceBinding);
  });

  describe('uiLocationRangeToRawLocationRanges', () => {
    it('maps UI location ranges on first line in scripts without sourceURL', async () => {
      const script =
          await backend.addScript(target, {content: contentWithoutSourceUrl, url, hasSourceURL: false}, null);
      const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);

      const rawLocationRanges = resourceScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(0, 1, 0, 4));
      assertNotNullOrUndefined(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 0);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 1);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 0);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 4);
    });

    it('maps UI location ranges in inline scripts without sourceURL', async () => {
      const script =
          await backend.addScript(target, {content: contentWithoutSourceUrl, url, hasSourceURL: false}, null);
      const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);

      const rawLocationRanges = resourceScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(1, 2, 2, 4));
      assertNotNullOrUndefined(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 1);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 4);
    });

    it('maps UI locations in inline scripts with sourceURL', async () => {
      const script = await backend.addScript(target, {content: contentWithSourceUrl, url, hasSourceURL: true}, null);
      const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);

      const rawLocationRanges = resourceScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(4, 2, 4, 4));
      assertNotNullOrUndefined(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 4);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 4);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 4);
    });
  });

  it('does not create a mapping UISourceCode for conditional breakpoint scripts', async () => {
    const content = 'x === 5\n\n//# sourceURL=debugger://breakpoint';
    const script = await backend.addScript(
        target, {content, url: SDK.DebuggerModel.COND_BREAKPOINT_SOURCE_URL, hasSourceURL: true}, null);
    assert.isTrue(script.isBreakpointCondition);

    const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);

    assert.isNull(uiSourceCode);
  });

  it('does not create a mapping UISourceCode for logpoint scripts', async () => {
    const content = 'console.log(x)\n\n//# sourceURL=debugger://logpoint';
    const script = await backend.addScript(
        target, {content, url: SDK.DebuggerModel.LOGPOINT_SOURCE_URL, hasSourceURL: true}, null);
    assert.isTrue(script.isBreakpointCondition);

    const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);

    assert.isNull(uiSourceCode);
  });
});
