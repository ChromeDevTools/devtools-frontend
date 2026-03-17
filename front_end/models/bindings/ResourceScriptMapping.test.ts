// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('ResourceScriptMapping', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  const url = urlString`http://localhost/example.js`;
  let target: SDK.Target.Target;
  let backend: MockDebuggerBackend;
  let resourceScriptMapping: Bindings.ResourceScriptMapping.ResourceScriptMapping;
  const contentWithSourceUrl = `console.log("Hi!");
  debugger;
  console.log("There!");
//# sourceURL=test.js`;
  const contentWithoutSourceUrl = `console.log("Hi!");
  debugger;
  console.log("There!");`;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    target = backend.createTarget();
    resourceScriptMapping = new Bindings.ResourceScriptMapping.ResourceScriptMapping(
        target.model(SDK.DebuggerModel.DebuggerModel)!, backend.universe.workspace,
        backend.universe.debuggerWorkspaceBinding);
  });

  describe('uiLocationRangeToRawLocationRanges', () => {
    it('maps UI location ranges on first line in scripts without sourceURL', async () => {
      const script =
          await backend.addScript(target, {content: contentWithoutSourceUrl, url, hasSourceURL: false}, null);
      const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocationRanges = resourceScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(0, 1, 0, 4));
      assert.exists(rawLocationRanges);
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
      assert.exists(uiSourceCode);

      const rawLocationRanges = resourceScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(1, 2, 2, 4));
      assert.exists(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, 1);
      assert.strictEqual(rawLocationRanges[0].start.lineNumber, 1);
      assert.strictEqual(rawLocationRanges[0].start.columnNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.lineNumber, 2);
      assert.strictEqual(rawLocationRanges[0].end.columnNumber, 4);
    });

    it('maps UI locations in inline scripts with sourceURL', async () => {
      const script = await backend.addScript(target, {content: contentWithSourceUrl, url, hasSourceURL: true}, null);
      const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const rawLocationRanges = resourceScriptMapping.uiLocationRangeToRawLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(4, 2, 4, 4));
      assert.exists(rawLocationRanges);
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
