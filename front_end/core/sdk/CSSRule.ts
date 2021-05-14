// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import {CSSMedia} from './CSSMedia.js';

import type {CSSModel, Edit} from './CSSModel.js'; // eslint-disable-line no-unused-vars
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import type {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js'; // eslint-disable-line no-unused-vars

export class CSSRule {
  _cssModel: CSSModel;
  styleSheetId: string|undefined;
  sourceURL: string|undefined;
  origin: Protocol.CSS.StyleSheetOrigin;
  style: CSSStyleDeclaration;
  constructor(cssModel: CSSModel, payload: {
    style: Protocol.CSS.CSSStyle,
    styleSheetId: (string|undefined),
    origin: Protocol.CSS.StyleSheetOrigin,
  }) {
    this._cssModel = cssModel;
    this.styleSheetId = payload.styleSheetId;

    if (this.styleSheetId) {
      const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
      this.sourceURL = styleSheetHeader.sourceURL;
    }
    this.origin = payload.origin;
    this.style = new CSSStyleDeclaration(this._cssModel, this, payload.style, Type.Regular);
  }

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId) {
      return;
    }
    this.style.rebase(edit);
  }

  resourceURL(): string {
    if (!this.styleSheetId) {
      return '';
    }
    const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.resourceURL();
  }

  isUserAgent(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.UserAgent;
  }

  isInjected(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Injected;
  }

  isViaInspector(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Inspector;
  }

  isRegular(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Regular;
  }

  cssModel(): CSSModel {
    return this._cssModel;
  }

  _getStyleSheetHeader(styleSheetId: string): CSSStyleSheetHeader {
    const styleSheetHeader = this._cssModel.styleSheetHeaderForId(styleSheetId);
    console.assert(styleSheetHeader !== null);
    return /** @type {!CSSStyleSheetHeader} */ styleSheetHeader as CSSStyleSheetHeader;
  }
}

class CSSValue {
  text: string;
  range: TextUtils.TextRange.TextRange|undefined;
  constructor(payload: Protocol.CSS.Value) {
    this.text = payload.text;
    if (payload.range) {
      this.range = TextUtils.TextRange.TextRange.fromObject(payload.range);
    }
  }

  rebase(edit: Edit): void {
    if (!this.range) {
      return;
    }
    this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
  }
}

export class CSSStyleRule extends CSSRule {
  selectors!: CSSValue[];
  media: CSSMedia[];
  wasUsed: boolean;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSRule, wasUsed?: boolean) {
    // TODO(crbug.com/1011811): Replace with spread operator or better types once Closure is gone.
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});
    this._reinitializeSelectors(payload.selectorList);
    this.media = payload.media ? CSSMedia.parseMediaArrayPayload(cssModel, payload.media) : [];
    this.wasUsed = wasUsed || false;
  }

  static createDummyRule(cssModel: CSSModel, selectorText: string): CSSStyleRule {
    const dummyPayload = {
      selectorList: {
        text: '',
        selectors: [{text: selectorText, value: undefined}],
      },
      style: {
        styleSheetId: '0',
        range: new TextUtils.TextRange.TextRange(0, 0, 0, 0),
        shorthandEntries: [],
        cssProperties: [],
      },
      origin: Protocol.CSS.StyleSheetOrigin.Inspector,
    };
    return new CSSStyleRule(cssModel, (dummyPayload as Protocol.CSS.CSSRule));
  }

  _reinitializeSelectors(selectorList: Protocol.CSS.SelectorList): void {
    this.selectors = [];
    for (let i = 0; i < selectorList.selectors.length; ++i) {
      this.selectors.push(new CSSValue(selectorList.selectors[i]));
    }
  }

  setSelectorText(newSelector: string): Promise<boolean> {
    const styleSheetId = this.styleSheetId;
    if (!styleSheetId) {
      throw 'No rule stylesheet id';
    }
    const range = this.selectorRange();
    if (!range) {
      throw 'Rule selector is not editable';
    }
    return this._cssModel.setSelectorText(styleSheetId, range, newSelector);
  }

  selectorText(): string {
    return this.selectors.map(selector => selector.text).join(', ');
  }

  selectorRange(): TextUtils.TextRange.TextRange|null {
    const firstRange = this.selectors[0].range;
    const lastRange = this.selectors[this.selectors.length - 1].range;
    if (!firstRange || !lastRange) {
      return null;
    }
    return new TextUtils.TextRange.TextRange(
        firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
  }

  lineNumberInSource(selectorIndex: number): number {
    const selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId) {
      return 0;
    }
    const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.lineNumberInSource(selector.range.startLine);
  }

  columnNumberInSource(selectorIndex: number): number|undefined {
    const selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId) {
      return undefined;
    }
    const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
  }

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId) {
      return;
    }
    const range = this.selectorRange();
    if (range && range.equal(edit.oldRange)) {
      this._reinitializeSelectors((edit.payload as Protocol.CSS.SelectorList));
    } else {
      for (let i = 0; i < this.selectors.length; ++i) {
        this.selectors[i].rebase(edit);
      }
    }
    for (const media of this.media) {
      media.rebase(edit);
    }

    super.rebase(edit);
  }
}

export class CSSKeyframesRule {
  _cssModel: CSSModel;
  _animationName: CSSValue;
  _keyframes: CSSKeyframeRule[];
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSKeyframesRule) {
    this._cssModel = cssModel;
    this._animationName = new CSSValue(payload.animationName);
    this._keyframes = payload.keyframes.map(keyframeRule => new CSSKeyframeRule(cssModel, keyframeRule));
  }

  name(): CSSValue {
    return this._animationName;
  }

  keyframes(): CSSKeyframeRule[] {
    return this._keyframes;
  }
}

export class CSSKeyframeRule extends CSSRule {
  _keyText!: CSSValue;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSKeyframeRule) {
    // TODO(crbug.com/1011811): Replace with spread operator or better types once Closure is gone.
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});
    this._reinitializeKey(payload.keyText);
  }

  key(): CSSValue {
    return this._keyText;
  }

  _reinitializeKey(payload: Protocol.CSS.Value): void {
    this._keyText = new CSSValue(payload);
  }

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId || !this._keyText.range) {
      return;
    }
    if (edit.oldRange.equal(this._keyText.range)) {
      this._reinitializeKey((edit.payload as Protocol.CSS.Value));
    } else {
      this._keyText.rebase(edit);
    }

    super.rebase(edit);
  }

  setKeyText(newKeyText: string): Promise<boolean> {
    const styleSheetId = this.styleSheetId;
    if (!styleSheetId) {
      throw 'No rule stylesheet id';
    }
    const range = this._keyText.range;
    if (!range) {
      throw 'Keyframe key is not editable';
    }
    return this._cssModel.setKeyframeKey(styleSheetId, range, newKeyText);
  }
}
