// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

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

  describe('getLayoutPropertiesFromComputedStyle', () => {
    it('correctly identifies display: contents', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([['display', 'contents']]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isTrue(layoutProperties?.isContents);
    });
  });

  describe('stylesheet tracking', () => {
    it('tracks styleSheetAdded and styleSheetRemoved events', async () => {
      const connection = new MockCDPConnection();
      const target = universe.createTarget({connection});
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;

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

      const addedPromise = cssModel.once(SDK.CSSModel.Events.StyleSheetAdded);
      connection.dispatchEvent('CSS.styleSheetAdded', {header}, undefined);
      const addedHeader = await addedPromise;
      assert.strictEqual(addedHeader.id, 'stylesheet');
      assert.deepEqual(cssModel.styleSheetHeaders(), [addedHeader]);

      const removedPromise = cssModel.once(SDK.CSSModel.Events.StyleSheetRemoved);
      connection.dispatchEvent('CSS.styleSheetRemoved', {styleSheetId: 'stylesheet' as Protocol.DOM.StyleSheetId},
                               undefined);
      const removedHeader = await removedPromise;
      assert.strictEqual(removedHeader.id, 'stylesheet');
      assert.deepEqual(cssModel.styleSheetHeaders(), []);
    });

    it('tracks stylesheets in multiple frames', async () => {
      const connection = new MockCDPConnection();
      const target = universe.createTarget({connection});
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;

      const header1: Protocol.CSS.CSSStyleSheetHeader = {
        styleSheetId: 'stylesheet1' as Protocol.DOM.StyleSheetId,
        frameId: 'frame1' as Protocol.Page.FrameId,
        sourceURL: 'http://example.com/styles1.css',
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'title1',
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

      const header2: Protocol.CSS.CSSStyleSheetHeader = {
        styleSheetId: 'stylesheet2' as Protocol.DOM.StyleSheetId,
        frameId: 'frame2' as Protocol.Page.FrameId,
        sourceURL: 'http://example.com/styles2.css',
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'title2',
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

      connection.dispatchEvent('CSS.styleSheetAdded', {header: header1}, undefined);
      connection.dispatchEvent('CSS.styleSheetAdded', {header: header2}, undefined);

      assert.deepEqual(cssModel.styleSheetHeaders().map(h => h.id), ['stylesheet1', 'stylesheet2']);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(urlString`http://example.com/styles1.css`), ['stylesheet1']);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(urlString`http://example.com/styles2.css`), ['stylesheet2']);
    });

    it('creates inspector stylesheet', async () => {
      const connection = new MockCDPConnection();
      const target = universe.createTarget({connection});
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      const frameId = 'frame1' as Protocol.Page.FrameId;
      const styleSheetId = 'inspector-sheet-id' as Protocol.DOM.StyleSheetId;

      connection.setSuccessHandler('CSS.createStyleSheet', params => {
        assert.strictEqual(params.frameId, frameId);

        const header: Protocol.CSS.CSSStyleSheetHeader = {
          styleSheetId,
          frameId,
          sourceURL: 'http://example.com/inspector-stylesheet',
          origin: Protocol.CSS.StyleSheetOrigin.Inspector,
          title: 'inspector',
          disabled: false,
          isInline: false,
          isMutable: true,
          isConstructed: false,
          loadingFailed: false,
          startLine: 0,
          startColumn: 0,
          length: 0,
          endLine: 0,
          endColumn: 0,
        };
        connection.dispatchEvent('CSS.styleSheetAdded', {header}, undefined);

        return {styleSheetId};
      });

      const header = await cssModel.requestViaInspectorStylesheet(frameId);
      assert.isNotNull(header);
      assert.strictEqual(header?.id, styleSheetId);
      assert.isTrue(header?.isViaInspector());

      // Requesting again should return the cached one without calling the backend again.
      connection.setHandler('CSS.createStyleSheet', null);
      connection.setHandler('CSS.createStyleSheet', () => {
        throw new Error('Should not be called again');
      });

      const header2 = await cssModel.requestViaInspectorStylesheet(frameId);
      assert.strictEqual(header2, header);
    });
  });

  it('coalesces simultaneous getComputedStyle requests and fetches fresh styles after StyleSheetChanged', async () => {
    const target = universe.createTarget();
    const cssModel = target.model(SDK.CSSModel.CSSModel)!;
    sinon.stub(cssModel.agent, 'invoke_enable').resolves({getError: () => undefined});
    await cssModel.resumeModel();

    let colorValue = 'red';
    const getComputedStyleStub = sinon.stub(cssModel.agent, 'invoke_getComputedStyleForNode')
                                     .callsFake(async () => ({
                                                  computedStyle: [{name: 'color', value: colorValue}],
                                                  extraFields: {isAppearanceBase: false},
                                                  getError: () => undefined,
                                                }));

    const nodeId = 1 as Protocol.DOM.NodeId;
    const [style1, style2] = await Promise.all([
      cssModel.getComputedStyle(nodeId),
      cssModel.getComputedStyle(nodeId),
    ]);
    sinon.assert.calledOnce(getComputedStyleStub);
    assert.strictEqual(style1?.get('color'), 'red');
    assert.strictEqual(style2?.get('color'), 'red');

    colorValue = 'green';
    cssModel.fireStyleSheetChanged('sheet-1' as Protocol.DOM.StyleSheetId);

    const updatedStyle = await cssModel.getComputedStyle(nodeId);
    sinon.assert.calledTwice(getComputedStyleStub);
    assert.strictEqual(updatedStyle?.get('color'), 'green');
  });

  it('updates stylesheet text via setStyleSheetText and dispatches StyleSheetChanged', async () => {
    const target = universe.createTarget();
    const cssModel = target.model(SDK.CSSModel.CSSModel)!;
    const styleSheetId = 'sheet-1' as Protocol.DOM.StyleSheetId;

    cssModel.styleSheetAdded({
      styleSheetId,
      frameId: 'frame-1' as Protocol.Page.FrameId,
      sourceURL: 'http://example.com/styles.css',
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      title: 'styles.css',
      disabled: false,
      isInline: false,
      isMutable: true,
      isConstructed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    });

    let storedText = 'h1 { color: blue; }';
    sinon.stub(cssModel.agent, 'invoke_getStyleSheetText').callsFake(async () => ({
                                                                       text: storedText,
                                                                       getError: () => undefined,
                                                                     }));
    sinon.stub(cssModel.agent, 'invoke_setStyleSheetText').callsFake(async ({text}) => {
      storedText = text;
      return {sourceMapURL: '', getError: () => undefined};
    });

    assert.strictEqual(await cssModel.getStyleSheetText(styleSheetId), 'h1 { color: blue; }');

    const changedPromise = cssModel.once(SDK.CSSModel.Events.StyleSheetChanged);
    const error = await cssModel.setStyleSheetText(styleSheetId, 'h1 { COLOR: Red; }', true);
    assert.isNull(error);

    const changedEvent = await changedPromise;
    assert.strictEqual(changedEvent.styleSheetId, styleSheetId);
    assert.strictEqual(await cssModel.getStyleSheetText(styleSheetId), 'h1 { COLOR: Red; }');
  });
});
