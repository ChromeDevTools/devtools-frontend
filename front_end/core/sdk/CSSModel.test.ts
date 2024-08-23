// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {activate, getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

describeWithMockConnection('CSSModel', () => {
  it('gets the FontFace of a source URL', () => {
    const target = createTarget();
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
    const target = createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const header: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId: 'stylesheet' as Protocol.CSS.StyleSheetId,
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
    assert.deepEqual(cssModelHeader.isConstructed, true);
  });

  describe('on primary page change', () => {
    let target: SDK.Target.Target;
    let cssModel: SDK.CSSModel.CSSModel|null;
    const header: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId: 'stylesheet' as Protocol.CSS.StyleSheetId,
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
      target = createTarget();
      cssModel = target.model(SDK.CSSModel.CSSModel);
    });

    it('resets on navigation', () => {
      assert.exists(cssModel);

      cssModel.styleSheetAdded(header);
      let styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, ['stylesheet']);

      navigate(getMainFrame(target));
      styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, []);
    });

    it('does not reset on prerender activation', () => {
      assert.exists(cssModel);

      getMainFrame(target);
      cssModel.styleSheetAdded(header);
      let styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, ['stylesheet']);

      activate(target);
      styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, ['stylesheet']);
    });
  });

  describe('getStyleSheetText', () => {
    it('should return null when the backend sends an error', async () => {
      setMockConnectionResponseHandler('CSS.getStyleSheetText', () => ({
                                                                  getError: () => 'Some custom error',
                                                                }));

      const target = createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;

      assert.isNull(await cssModel.getStyleSheetText('id' as Protocol.CSS.StyleSheetId));
    });
  });
});
