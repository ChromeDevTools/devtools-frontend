// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../text_utils/text_utils.js';

import {CSSMedia} from './CSSMedia.js';
import {CSSModel, Edit} from './CSSModel.js';  // eslint-disable-line no-unused-vars
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class CSSRule {
  /**
   * @param {!CSSModel} cssModel
   * @param {{style: !Protocol.CSS.CSSStyle, styleSheetId: (string|undefined), origin: !Protocol.CSS.StyleSheetOrigin}} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this.styleSheetId = payload.styleSheetId;

    if (this.styleSheetId) {
      const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
      this.sourceURL = styleSheetHeader.sourceURL;
    }
    this.origin = payload.origin;
    this.style = new CSSStyleDeclaration(this._cssModel, this, payload.style, Type.Regular);
  }

  /**
   * @param {!Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId) {
      return;
    }
    this.style.rebase(edit);
  }

  /**
   * @return {string}
   */
  resourceURL() {
    if (!this.styleSheetId) {
      return '';
    }
    const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.resourceURL();
  }

  /**
   * @return {boolean}
   */
  isUserAgent() {
    return this.origin === Protocol.CSS.StyleSheetOrigin.UserAgent;
  }

  /**
   * @return {boolean}
   */
  isInjected() {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Injected;
  }

  /**
   * @return {boolean}
   */
  isViaInspector() {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Inspector;
  }

  /**
   * @return {boolean}
   */
  isRegular() {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Regular;
  }

  /**
   * @return {!CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  /**
   * @param {string} styleSheetId
   * @return {!CSSStyleSheetHeader}
   */
  _getStyleSheetHeader(styleSheetId) {
    const styleSheetHeader = this._cssModel.styleSheetHeaderForId(styleSheetId);
    console.assert(styleSheetHeader !== null);
    return /** @type {!CSSStyleSheetHeader} */ (styleSheetHeader);
  }
}


class CSSValue {
  /**
   * @param {!Protocol.CSS.Value} payload
   */
  constructor(payload) {
    this.text = payload.text;
    if (payload.range) {
      this.range = TextUtils.TextRange.TextRange.fromObject(payload.range);
    }
  }

  /**
   * @param {!Edit} edit
   */
  rebase(edit) {
    if (!this.range) {
      return;
    }
    this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
  }
}


export class CSSStyleRule extends CSSRule {
  /**
   * @param {!CSSModel} cssModel
   * @param {!Protocol.CSS.CSSRule} payload
   * @param {boolean=} wasUsed
   */
  constructor(cssModel, payload, wasUsed) {
    // TODO(crbug.com/1011811): Replace with spread operator or better types once Closure is gone.
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});

    /** @type {!Array.<!CSSValue>} */
    this.selectors;
    this._reinitializeSelectors(payload.selectorList);
    this.media = payload.media ? CSSMedia.parseMediaArrayPayload(cssModel, payload.media) : [];
    this.wasUsed = wasUsed || false;
  }

  /**
   * @param {!CSSModel} cssModel
   * @param {string} selectorText
   * @return {!CSSStyleRule}
   */
  static createDummyRule(cssModel, selectorText) {
    const dummyPayload = {
      selectorList: {
        text: '',
        selectors: [{text: selectorText, value: undefined}],
      },
      style: {
        styleSheetId: '0',
        range: new TextUtils.TextRange.TextRange(0, 0, 0, 0),
        shorthandEntries: [],
        cssProperties: []
      },
      origin: Protocol.CSS.StyleSheetOrigin.Inspector,
    };
    return new CSSStyleRule(cssModel, /** @type {!Protocol.CSS.CSSRule} */ (dummyPayload));
  }


  /**
   * @param {!Protocol.CSS.SelectorList} selectorList
   */
  _reinitializeSelectors(selectorList) {
    this.selectors = [];
    for (let i = 0; i < selectorList.selectors.length; ++i) {
      this.selectors.push(new CSSValue(selectorList.selectors[i]));
    }
  }

  /**
   * @param {string} newSelector
   * @return {!Promise.<boolean>}
   */
  setSelectorText(newSelector) {
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

  /**
   * @return {string}
   */
  selectorText() {
    return this.selectors.map(selector => selector.text).join(', ');
  }

  /**
   * @return {?TextUtils.TextRange.TextRange}
   */
  selectorRange() {
    const firstRange = this.selectors[0].range;
    const lastRange = this.selectors[this.selectors.length - 1].range;
    if (!firstRange || !lastRange) {
      return null;
    }
    return new TextUtils.TextRange.TextRange(
        firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
  }

  /**
   * @param {number} selectorIndex
   * @return {number}
   */
  lineNumberInSource(selectorIndex) {
    const selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId) {
      return 0;
    }
    const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.lineNumberInSource(selector.range.startLine);
  }

  /**
   * @param {number} selectorIndex
   * @return {number|undefined}
   */
  columnNumberInSource(selectorIndex) {
    const selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId) {
      return undefined;
    }
    const styleSheetHeader = this._getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
  }

  /**
   * @override
   * @param {!Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId) {
      return;
    }
    const range = this.selectorRange();
    if (range && range.equal(edit.oldRange)) {
      this._reinitializeSelectors(/** @type {!Protocol.CSS.SelectorList} */ (edit.payload));
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
  /**
   * @param {!CSSModel} cssModel
   * @param {!Protocol.CSS.CSSKeyframesRule} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this._animationName = new CSSValue(payload.animationName);
    this._keyframes = payload.keyframes.map(keyframeRule => new CSSKeyframeRule(cssModel, keyframeRule));
  }

  /**
   * @return {!CSSValue}
   */
  name() {
    return this._animationName;
  }

  /**
   * @return {!Array.<!CSSKeyframeRule>}
   */
  keyframes() {
    return this._keyframes;
  }
}

/**
 * @unrestricted
 */
export class CSSKeyframeRule extends CSSRule {
  /**
   * @param {!CSSModel} cssModel
   * @param {!Protocol.CSS.CSSKeyframeRule} payload
   */
  constructor(cssModel, payload) {
    // TODO(crbug.com/1011811): Replace with spread operator or better types once Closure is gone.
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});
    /** @type {!CSSValue} */
    this._keyText;
    this._reinitializeKey(payload.keyText);
  }

  /**
   * @return {!CSSValue}
   */
  key() {
    return this._keyText;
  }

  /**
   * @param {!Protocol.CSS.Value} payload
   */
  _reinitializeKey(payload) {
    this._keyText = new CSSValue(payload);
  }

  /**
   * @override
   * @param {!Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId || !this._keyText.range) {
      return;
    }
    if (edit.oldRange.equal(this._keyText.range)) {
      this._reinitializeKey(/** @type {!Protocol.CSS.Value} */ (edit.payload));
    } else {
      this._keyText.rebase(edit);
    }

    super.rebase(edit);
  }

  /**
   * @param {string} newKeyText
   * @return {!Promise.<boolean>}
   */
  setKeyText(newKeyText) {
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
