// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SDK.CSSValue = class {
  /**
   * @param {!Protocol.CSS.Value} payload
   */
  constructor(payload) {
    this.text = payload.text;
    if (payload.range)
      this.range = Common.TextRange.fromObject(payload.range);
  }

  /**
   * @param {!SDK.CSSModel.Edit} edit
   */
  rebase(edit) {
    if (!this.range)
      return;
    this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
  }
};

/**
 * @unrestricted
 */
SDK.CSSRule = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {{style: !Protocol.CSS.CSSStyle, styleSheetId: (string|undefined), origin: !Protocol.CSS.StyleSheetOrigin}} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this.styleSheetId = payload.styleSheetId;

    if (this.styleSheetId) {
      var styleSheetHeader = cssModel.styleSheetHeaderForId(this.styleSheetId);
      this.sourceURL = styleSheetHeader.sourceURL;
    }
    this.origin = payload.origin;
    this.style = new SDK.CSSStyleDeclaration(this._cssModel, this, payload.style, SDK.CSSStyleDeclaration.Type.Regular);
  }

  /**
   * @param {!SDK.CSSModel.Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId)
      return;
    this.style.rebase(edit);
  }

  /**
   * @return {string}
   */
  resourceURL() {
    if (!this.styleSheetId)
      return '';
    var styleSheetHeader = this._cssModel.styleSheetHeaderForId(this.styleSheetId);
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
   * @return {!SDK.CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }
};

/**
 * @unrestricted
 */
SDK.CSSStyleRule = class extends SDK.CSSRule {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Protocol.CSS.CSSRule} payload
   * @param {boolean=} wasUsed
   */
  constructor(cssModel, payload, wasUsed) {
    super(cssModel, payload);

    this._reinitializeSelectors(payload.selectorList);
    this.media = payload.media ? SDK.CSSMedia.parseMediaArrayPayload(cssModel, payload.media) : [];
    this.wasUsed = wasUsed || false;
  }

  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {string} selectorText
   * @return {!SDK.CSSStyleRule}
   */
  static createDummyRule(cssModel, selectorText) {
    var dummyPayload = {
      selectorList: {
        selectors: [{text: selectorText}],
      },
      style: {styleSheetId: '0', range: new Common.TextRange(0, 0, 0, 0), shorthandEntries: [], cssProperties: []}
    };
    return new SDK.CSSStyleRule(cssModel, /** @type {!Protocol.CSS.CSSRule} */ (dummyPayload));
  }

  /**
   * @param {!Protocol.CSS.SelectorList} selectorList
   */
  _reinitializeSelectors(selectorList) {
    /** @type {!Array.<!SDK.CSSValue>} */
    this.selectors = [];
    for (var i = 0; i < selectorList.selectors.length; ++i)
      this.selectors.push(new SDK.CSSValue(selectorList.selectors[i]));
  }

  /**
   * @param {string} newSelector
   * @return {!Promise.<boolean>}
   */
  setSelectorText(newSelector) {
    var styleSheetId = this.styleSheetId;
    if (!styleSheetId)
      throw 'No rule stylesheet id';
    var range = this.selectorRange();
    if (!range)
      throw 'Rule selector is not editable';
    return this._cssModel.setSelectorText(styleSheetId, range, newSelector);
  }

  /**
   * @return {string}
   */
  selectorText() {
    return this.selectors.select('text').join(', ');
  }

  /**
   * @return {?Common.TextRange}
   */
  selectorRange() {
    var firstRange = this.selectors[0].range;
    if (!firstRange)
      return null;
    var lastRange = this.selectors.peekLast().range;
    return new Common.TextRange(firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
  }

  /**
   * @param {number} selectorIndex
   * @return {number}
   */
  lineNumberInSource(selectorIndex) {
    var selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId)
      return 0;
    var styleSheetHeader = this._cssModel.styleSheetHeaderForId(this.styleSheetId);
    return styleSheetHeader.lineNumberInSource(selector.range.startLine);
  }

  /**
   * @param {number} selectorIndex
   * @return {number|undefined}
   */
  columnNumberInSource(selectorIndex) {
    var selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId)
      return undefined;
    var styleSheetHeader = this._cssModel.styleSheetHeaderForId(this.styleSheetId);
    console.assert(styleSheetHeader);
    return styleSheetHeader.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
  }

  /**
   * @override
   * @param {!SDK.CSSModel.Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId)
      return;
    if (this.selectorRange().equal(edit.oldRange)) {
      this._reinitializeSelectors(/** @type {!Protocol.CSS.SelectorList} */ (edit.payload));
    } else {
      for (var i = 0; i < this.selectors.length; ++i)
        this.selectors[i].rebase(edit);
    }
    for (var media of this.media)
      media.rebase(edit);

    super.rebase(edit);
  }
};


/**
 * @unrestricted
 */
SDK.CSSKeyframesRule = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Protocol.CSS.CSSKeyframesRule} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this._animationName = new SDK.CSSValue(payload.animationName);
    this._keyframes = payload.keyframes.map(keyframeRule => new SDK.CSSKeyframeRule(cssModel, keyframeRule));
  }

  /**
   * @return {!SDK.CSSValue}
   */
  name() {
    return this._animationName;
  }

  /**
   * @return {!Array.<!SDK.CSSKeyframeRule>}
   */
  keyframes() {
    return this._keyframes;
  }
};

/**
 * @unrestricted
 */
SDK.CSSKeyframeRule = class extends SDK.CSSRule {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Protocol.CSS.CSSKeyframeRule} payload
   */
  constructor(cssModel, payload) {
    super(cssModel, payload);
    this._reinitializeKey(payload.keyText);
  }

  /**
   * @return {!SDK.CSSValue}
   */
  key() {
    return this._keyText;
  }

  /**
   * @param {!Protocol.CSS.Value} payload
   */
  _reinitializeKey(payload) {
    this._keyText = new SDK.CSSValue(payload);
  }

  /**
   * @override
   * @param {!SDK.CSSModel.Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId || !this._keyText.range)
      return;
    if (edit.oldRange.equal(this._keyText.range))
      this._reinitializeKey(/** @type {!Protocol.CSS.Value} */ (edit.payload));
    else
      this._keyText.rebase(edit);

    super.rebase(edit);
  }

  /**
   * @param {string} newKeyText
   * @return {!Promise.<boolean>}
   */
  setKeyText(newKeyText) {
    var styleSheetId = this.styleSheetId;
    if (!styleSheetId)
      throw 'No rule stylesheet id';
    var range = this._keyText.range;
    if (!range)
      throw 'Keyframe key is not editable';
    return this._cssModel.setKeyframeKey(styleSheetId, range, newKeyText);
  }
};
