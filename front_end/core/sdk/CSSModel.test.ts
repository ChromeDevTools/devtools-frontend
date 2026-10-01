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

    it('correctly identifies anchor-positioned elements with position-anchor', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'absolute'],
        ['position-anchor', '--test-anchor'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isTrue(layoutProperties?.isAnchorPositioned);
    });

    it('correctly identifies anchor-positioned elements with position-area', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'absolute'],
        ['position-area', 'top left'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isTrue(layoutProperties?.isAnchorPositioned);
    });

    it('correctly identifies anchor-positioned elements with anchor() function in insets', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'absolute'],
        ['top', 'anchor(--test-anchor top)'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isTrue(layoutProperties?.isAnchorPositioned);
    });

    it('correctly identifies anchor-positioned elements with anchor-size() function in sizing', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'fixed'],
        ['width', 'anchor-size(width)'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isTrue(layoutProperties?.isAnchorPositioned);
    });

    it('returns false for in-flow elements even with anchor properties', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'static'],
        ['position-anchor', '--test-anchor'],
        ['position-area', 'top left'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isFalse(layoutProperties?.isAnchorPositioned);
    });

    it('returns false for standard out-of-flow elements without anchor features', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'absolute'],
        ['top', '10px'],
        ['left', '20px'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isFalse(layoutProperties?.isAnchorPositioned);
    });

    it('returns false when position-anchor and position-area are explicitly none', async () => {
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      sinon.stub(cssModel, 'getComputedStyle').resolves(new Map([
        ['position', 'absolute'],
        ['position-anchor', 'none'],
        ['position-area', 'none'],
      ]));

      const layoutProperties = await cssModel.getLayoutPropertiesFromComputedStyle(1 as Protocol.DOM.NodeId);
      assert.isNotNull(layoutProperties);
      assert.isFalse(layoutProperties?.isAnchorPositioned);
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

    it('keeps per-URL bookkeeping consistent when several stylesheets in one frame share a URL', () => {
      const connection = new MockCDPConnection();
      const target = universe.createTarget({connection});
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      const frameId = 'frame' as Protocol.Page.FrameId;
      const sharedURL = urlString`http://example.com/imported-1.css`;
      const otherURL = urlString`http://example.com/imported-2.css`;

      function addHeader(styleSheetId: string, sourceURL: string): void {
        connection.dispatchEvent('CSS.styleSheetAdded', {
          header: {
            styleSheetId: styleSheetId as Protocol.DOM.StyleSheetId,
            frameId,
            sourceURL,
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            title: '',
            disabled: false,
            isInline: false,
            isMutable: false,
            isConstructed: false,
            startLine: 0,
            startColumn: 0,
            length: 0,
            endLine: 0,
            endColumn: 0,
          },
        },
                                 undefined);
      }

      // The same stylesheet imported twice (e.g. two identical @import rules) yields two headers with one URL.
      addHeader('import-1a', sharedURL);
      addHeader('import-2', otherURL);
      addHeader('import-1b', sharedURL);

      assert.sameMembers(cssModel.getStyleSheetIdsForURL(sharedURL), ['import-1a', 'import-1b']);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(otherURL), ['import-2']);

      connection.dispatchEvent('CSS.styleSheetRemoved', {styleSheetId: 'import-1a' as Protocol.DOM.StyleSheetId},
                               undefined);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(sharedURL), ['import-1b']);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(otherURL), ['import-2']);
      assert.isNotNull(cssModel.styleSheetHeaderForId('import-1b' as Protocol.DOM.StyleSheetId));

      connection.dispatchEvent('CSS.styleSheetRemoved', {styleSheetId: 'import-1b' as Protocol.DOM.StyleSheetId},
                               undefined);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(sharedURL), []);
      assert.deepEqual(cssModel.styleSheetHeaders().map(header => header.id), ['import-2']);

      // Re-adding a sheet with the previously emptied URL works again.
      addHeader('import-1c', sharedURL);
      assert.deepEqual(cssModel.getStyleSheetIdsForURL(sharedURL), ['import-1c']);
    });
  });

  it('resolves a relative sourceURL and an absolute-path sourceMappingURL of an inline stylesheet against the page URL',
     async () => {
       const sourceMapContent = JSON.stringify({version: 3, sources: ['y.scss'], mappings: 'AAAA'});
       const loadOverride = sinon.spy(async (_url: string) => ({
                                        success: true,
                                        content: sourceMapContent,
                                        errorDescription: {
                                          message: '',
                                          statusCode: 0,
                                          netError: 0,
                                          netErrorName: '',
                                          urlValid: true,
                                        },
                                      }));
       const universeWithLoader = new TestUniverse({pageResourceLoaderOptions: {loadOverride}});
       const target = universeWithLoader.createTarget();
       target.setInspectedURL(urlString`http://h/page.html`);
       const cssModel = target.model(SDK.CSSModel.CSSModel)!;

       const addedPromise = cssModel.once(SDK.CSSModel.Events.StyleSheetAdded);
       cssModel.styleSheetAdded({
         styleSheetId: 'inline' as Protocol.DOM.StyleSheetId,
         frameId: 'frame' as Protocol.Page.FrameId,
         sourceURL: 'style.css',
         hasSourceURL: true,
         sourceMapURL: '/x/y.css.map',
         origin: Protocol.CSS.StyleSheetOrigin.Regular,
         title: '',
         disabled: false,
         isInline: true,
         isMutable: false,
         isConstructed: false,
         startLine: 1,
         startColumn: 7,
         length: 20,
         endLine: 3,
         endColumn: 0,
       });
       const header = await addedPromise;

       const sourceMap = await cssModel.sourceMapManager().sourceMapForClientPromise(header);
       assert.exists(sourceMap);
       sinon.assert.calledOnceWithExactly(loadOverride, 'http://h/x/y.css.map');
       assert.strictEqual(sourceMap.url(), urlString`http://h/x/y.css.map`);
       assert.strictEqual(sourceMap.compiledURL(), urlString`http://h/style.css`);
       assert.deepEqual(sourceMap.sourceURLs(), [urlString`http://h/x/y.scss`]);
       assert.strictEqual(cssModel.sourceMapManager().sourceMapForClient(header), sourceMap);
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
