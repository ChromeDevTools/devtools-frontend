// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';

import * as SDK from './sdk.js';

describe('CSSStyleSheetHeader', () => {
  describe('createPageResourceLoadInitiator', () => {
    const frameId = 'Frame#123' as Protocol.Page.FrameId;
    const styleSheetId = 'StyleSheet#123' as Protocol.CSS.StyleSheetId;
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
});
