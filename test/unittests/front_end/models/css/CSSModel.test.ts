// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

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
    let cssModel: SDK.CSSModel.CSSModel|null;
    let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
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
    const frame = {
      url: 'http://example.com/',
      resourceTreeModel: () => resourceTreeModel,
      backForwardCacheDetails: {explanations: []},
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;

    beforeEach(() => {
      const target = createTarget();
      resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      cssModel = target.model(SDK.CSSModel.CSSModel);
    });

    it('resets on navigation', () => {
      assertNotNullOrUndefined(cssModel);
      assertNotNullOrUndefined(resourceTreeModel);

      cssModel.styleSheetAdded(header);
      let styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, ['stylesheet']);

      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
      styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, []);
    });

    it('does not reset on prerender activation', () => {
      assertNotNullOrUndefined(cssModel);
      assertNotNullOrUndefined(resourceTreeModel);

      cssModel.styleSheetAdded(header);
      let styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, ['stylesheet']);

      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Activation});
      styleSheetIds =
          cssModel.getStyleSheetIdsForURL('http://example.com/styles.css' as Platform.DevToolsPath.UrlString);
      assert.deepEqual(styleSheetIds, ['stylesheet']);
    });
  });
});
