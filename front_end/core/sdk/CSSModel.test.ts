// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {activate, getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('CSSModel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('gets the FontFace of a source URL', () => {
    const target = universe.createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const src = 'mock.com';
    const fontFace = {fontFamily: 'Roboto', src, fontDisplay: 'swap'} as unknown as Protocol.CSS.FontFace;
    cssModel.fontsUpdated(fontFace);
    const fontFaceForSource = cssModel.fontFaceForSource(src);
    assert.strictEqual(fontFaceForSource?.getFontFamily() as string, fontFace.fontFamily);
    assert.strictEqual(fontFaceForSource?.getSrc() as string, fontFace.src);
    assert.strictEqual(fontFaceForSource?.getFontDisplay() as string, fontFace.fontDisplay);
  });

  it('reports stylesheets that fail to load as constructed stylesheets', async () => {
    const target = universe.createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const header: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId: 'stylesheet' as Protocol.DOM.StyleSheetId,
      frameId: 'frame' as Protocol.Page.FrameId,
      sourceURL: 'http://stylesheet.test/404.css',
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      title: 'failed sheet',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      loadingFailed: true,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    };
    const addedPromise = cssModel.once(SDK.CSSModel.Events.StyleSheetAdded);
    cssModel.styleSheetAdded(header);

    const cssModelHeader = await addedPromise;
    assert.deepEqual(cssModelHeader.sourceURL, '');
    assert.isTrue(cssModelHeader.isConstructed);
  });

  describe('on primary page change', () => {
    let target: SDK.Target.Target;
    let cssModel: SDK.CSSModel.CSSModel|null;
    const header: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId: 'stylesheet' as Protocol.DOM.StyleSheetId,
      frameId: 'frame' as Protocol.Page.FrameId,
      sourceURL: 'http://example.com/styles.css',
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      title: 'title',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      loadingFailed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    };

    beforeEach(() => {
      target = universe.createTarget();
      cssModel = target.model(SDK.CSSModel.CSSModel);
    });

    it('resets on navigation', () => {
      assert.exists(cssModel);

      cssModel.styleSheetAdded(header);
      let styleSheetIds = cssModel.getStyleSheetIdsForURL(urlString`http://example.com/styles.css`);
      assert.deepEqual(styleSheetIds, ['stylesheet']);

      navigate(getMainFrame(target));
      styleSheetIds = cssModel.getStyleSheetIdsForURL(urlString`http://example.com/styles.css`);
      assert.deepEqual(styleSheetIds, []);
    });

    it('does not reset on prerender activation', () => {
      assert.exists(cssModel);

      getMainFrame(target);
      cssModel.styleSheetAdded(header);
      let styleSheetIds = cssModel.getStyleSheetIdsForURL(urlString`http://example.com/styles.css`);
      assert.deepEqual(styleSheetIds, ['stylesheet']);

      activate(target);
      styleSheetIds = cssModel.getStyleSheetIdsForURL(urlString`http://example.com/styles.css`);
      assert.deepEqual(styleSheetIds, ['stylesheet']);
    });
  });

  describe('getStyleSheetText', () => {
    it('should return null when the backend sends an error', async () => {
      const connection = new MockCDPConnection();
      connection.setFailureHandler(
          'CSS.getStyleSheetText', () => ({
                                     message: 'Some custom error',
                                     code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                                   }));

      const target = universe.createTarget({connection});
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;

      assert.isNull(await cssModel.getStyleSheetText('id' as Protocol.DOM.StyleSheetId));
    });
  });
});
