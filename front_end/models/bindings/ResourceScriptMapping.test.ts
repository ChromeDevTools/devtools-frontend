// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {getMainFrame, SECURITY_ORIGIN} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('ResourceScriptMapping', () => {
  setupLocaleHooks();
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
      getMainFrame(target);
      const script = await backend.addScript(
          target, {content: contentWithSourceUrl, url: `${SECURITY_ORIGIN}/example.js`, hasSourceURL: true}, null);
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

  describe('for scripts with a `//# sourceURL` annotation', () => {
    const content = contentWithSourceUrl;

    it('creates a UISourceCode for same-origin URLs', async () => {
      getMainFrame(target);

      const script = await backend.addScript(
          target, {content, url: `${SECURITY_ORIGIN}/from-source-url.js`, hasSourceURL: true}, null);

      const uiSourceCode = resourceScriptMapping.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);
      assert.isTrue(Bindings.NetworkProject.NetworkProject.isSourceURLSynthesized(uiSourceCode));
    });

    it('ignores annotations claiming a cross-origin URL', async () => {
      getMainFrame(target);

      const script = await backend.addScript(
          target, {content, url: 'https://not-example.com/from-source-url.js', hasSourceURL: true}, null);

      assert.isNull(resourceScriptMapping.uiSourceCodeForScript(script));
    });

    it('accepts annotations with schemes that cannot be network resources', async () => {
      getMainFrame(target);

      const script = await backend.addScript(
          target, {content, url: 'webpack-internal:///./src/index.js', hasSourceURL: true}, null);

      assert.exists(resourceScriptMapping.uiSourceCodeForScript(script));
    });

    it('does not evict the UISourceCode of a script that was fetched from the network', async () => {
      getMainFrame(target);
      const networkURL = `${SECURITY_ORIGIN}/example.js`;
      const networkScript = await backend.addScript(
          target, {content: contentWithoutSourceUrl, url: networkURL, hasSourceURL: false}, null);
      const networkUISourceCode = resourceScriptMapping.uiSourceCodeForScript(networkScript);
      assert.exists(networkUISourceCode);

      const spoofingScript = await backend.addScript(target, {content, url: networkURL, hasSourceURL: true}, null);

      assert.isNull(resourceScriptMapping.uiSourceCodeForScript(spoofingScript));
      assert.strictEqual(resourceScriptMapping.uiSourceCodeForScript(networkScript), networkUISourceCode);
      assert.isFalse(Bindings.NetworkProject.NetworkProject.isSourceURLSynthesized(networkUISourceCode));
    });

    it('falls back to the inspected origin when the frame is unknown', async () => {
      target.setInspectedURL(urlString`${`${SECURITY_ORIGIN}/index.html`}`);

      const sameOrigin = await backend.addScript(
          target, {content, url: `${SECURITY_ORIGIN}/from-source-url.js`, hasSourceURL: true}, null);
      const crossOrigin = await backend.addScript(
          target, {content, url: 'https://not-example.com/from-source-url.js', hasSourceURL: true}, null);

      assert.exists(resourceScriptMapping.uiSourceCodeForScript(sameOrigin));
      assert.isNull(resourceScriptMapping.uiSourceCodeForScript(crossOrigin));
    });

    it('ignores annotations when no origin can be established', async () => {
      // Neither a frame nor an inspected URL: we can't tell whether the annotation
      // spoofs another origin, so it must not be used.
      const script = await backend.addScript(
          target, {content, url: `${SECURITY_ORIGIN}/from-source-url.js`, hasSourceURL: true}, null);

      assert.isNull(resourceScriptMapping.uiSourceCodeForScript(script));
    });

    it('replaces the UISourceCode of an earlier script with the same annotation', async () => {
      getMainFrame(target);
      const sourceURL = `${SECURITY_ORIGIN}/from-source-url.js`;
      const oldScript = await backend.addScript(target, {content, url: sourceURL, hasSourceURL: true}, null);
      assert.exists(resourceScriptMapping.uiSourceCodeForScript(oldScript));

      const newScript = await backend.addScript(target, {content, url: sourceURL, hasSourceURL: true}, null);

      assert.exists(resourceScriptMapping.uiSourceCodeForScript(newScript));
      assert.isNull(resourceScriptMapping.uiSourceCodeForScript(oldScript));
    });
  });
});
