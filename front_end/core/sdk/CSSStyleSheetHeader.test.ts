// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as SDK from './sdk.js';

describe('CSSStyleSheetHeader', () => {
  describe('createPageResourceLoadInitiator', () => {
    const frameId = 'Frame#123' as Protocol.Page.FrameId;
    const styleSheetId = 'StyleSheet#123' as Protocol.DOM.StyleSheetId;
    const sourceURL = 'http://localhost/style.css';

    it('yields the correct frame ID', () => {
      const target = sinon.createStubInstance(SDK.Target.Target);
      const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
      cssModel.target.returns(target);
      const cssStyleSheetHeader = new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
        styleSheetId,
        frameId,
        sourceURL,
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'style.css',
        disabled: false,
        isInline: false,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 10,
        endLine: 1,
        endColumn: 8,
      });
      assert.strictEqual(cssStyleSheetHeader.createPageResourceLoadInitiator().frameId, 'Frame#123');
    });

    it('yields the correct initiator URL', () => {
      const target = sinon.createStubInstance(SDK.Target.Target);
      const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
      cssModel.target.returns(target);
      const cssStyleSheetHeader = new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
        styleSheetId,
        frameId,
        sourceURL,
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'style.css',
        disabled: false,
        isInline: false,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 10,
        endLine: 1,
        endColumn: 8,
      });
      assert.strictEqual(cssStyleSheetHeader.createPageResourceLoadInitiator().initiatorUrl, sourceURL);
    });

    it('yields an empty initiator URL when //# sourceMappingURL is present', () => {
      const target = sinon.createStubInstance(SDK.Target.Target);
      const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
      cssModel.target.returns(target);
      const cssStyleSheetHeader = new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
        styleSheetId,
        frameId,
        sourceURL,
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'style.css',
        disabled: false,
        hasSourceURL: true,
        isInline: false,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 10,
        endLine: 1,
        endColumn: 8,
      });
      assert.isEmpty(cssStyleSheetHeader.createPageResourceLoadInitiator().initiatorUrl);
    });

    it('yields the correct target', () => {
      const target = sinon.createStubInstance(SDK.Target.Target);
      const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
      cssModel.target.returns(target);
      const cssStyleSheetHeader = new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
        styleSheetId,
        frameId,
        sourceURL,
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'style.css',
        disabled: false,
        isInline: false,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 10,
        endLine: 1,
        endColumn: 8,
      });
      assert.strictEqual(cssStyleSheetHeader.createPageResourceLoadInitiator().target, target);
    });
  });

  describe('resourceURL()', () => {
    const frameId = '123' as Protocol.Page.FrameId;
    const styleSheetId = '456' as Protocol.DOM.StyleSheetId;
    const sourceURL = 'http://localhost/style.css';

    it('returns a unique resourceURL for inspector originated stylesheet', () => {
      const target = sinon.createStubInstance(SDK.Target.Target);
      const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
      cssModel.target.returns(target);
      const cssStyleSheetHeader = new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
        styleSheetId,
        frameId,
        sourceURL,
        origin: Protocol.CSS.StyleSheetOrigin.Inspector,
        title: 'my-frame',
        disabled: false,
        isInline: false,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 10,
        endLine: 1,
        endColumn: 8,
      });
      assert.strictEqual(cssStyleSheetHeader.resourceURL(), 'inspector://inspector-stylesheet#456');
    });
  });

  describe('originalContentProvider()', () => {
    setupLocaleHooks();
    setupSettingsHooks();
    setupRuntimeHooks();

    it('returns the initial unmodified stylesheet text even after content changes', async () => {
      const universe = new TestUniverse();
      const target = universe.createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      const styleSheetId = 'sheet-1' as Protocol.DOM.StyleSheetId;

      cssModel.styleSheetAdded({
        styleSheetId,
        frameId: 'frame-1' as Protocol.Page.FrameId,
        sourceURL: 'http://localhost/style.css',
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'style.css',
        disabled: false,
        isInline: false,
        isMutable: true,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 18,
        endLine: 0,
        endColumn: 18,
      });

      let currentText = 'div { color: red; }';
      sinon.stub(cssModel.agent, 'invoke_getStyleSheetText').callsFake(async () => ({
                                                                         text: currentText,
                                                                         getError: () => undefined,
                                                                       }));
      sinon.stub(cssModel.agent, 'invoke_setStyleSheetText').callsFake(async ({text}) => {
        currentText = text;
        return {sourceMapURL: '', getError: () => undefined};
      });

      const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
      assert.exists(header);

      await cssModel.setStyleSheetText(styleSheetId, 'div { color: blue; }', true);

      const updatedContent = await header.requestContentData();
      assert.instanceOf(updatedContent, TextUtils.ContentData.ContentData);
      assert.strictEqual(updatedContent.text, 'div { color: blue; }');

      const originalContent = await header.originalContentProvider().requestContentData();
      assert.instanceOf(originalContent, TextUtils.ContentData.ContentData);
      assert.strictEqual(originalContent.text, 'div { color: red; }');
    });
  });
});
