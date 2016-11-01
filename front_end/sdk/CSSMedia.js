// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.CSSMediaQuery = class {
  /**
   * @param {!CSSAgent.MediaQuery} payload
   */
  constructor(payload) {
    this._active = payload.active;
    this._expressions = [];
    for (var j = 0; j < payload.expressions.length; ++j)
      this._expressions.push(WebInspector.CSSMediaQueryExpression.parsePayload(payload.expressions[j]));
  }

  /**
   * @param {!CSSAgent.MediaQuery} payload
   * @return {!WebInspector.CSSMediaQuery}
   */
  static parsePayload(payload) {
    return new WebInspector.CSSMediaQuery(payload);
  }

  /**
   * @return {boolean}
   */
  active() {
    return this._active;
  }

  /**
   * @return {!Array.<!WebInspector.CSSMediaQueryExpression>}
   */
  expressions() {
    return this._expressions;
  }
};


/**
 * @unrestricted
 */
WebInspector.CSSMediaQueryExpression = class {
  /**
   * @param {!CSSAgent.MediaQueryExpression} payload
   */
  constructor(payload) {
    this._value = payload.value;
    this._unit = payload.unit;
    this._feature = payload.feature;
    this._valueRange = payload.valueRange ? WebInspector.TextRange.fromObject(payload.valueRange) : null;
    this._computedLength = payload.computedLength || null;
  }

  /**
   * @param {!CSSAgent.MediaQueryExpression} payload
   * @return {!WebInspector.CSSMediaQueryExpression}
   */
  static parsePayload(payload) {
    return new WebInspector.CSSMediaQueryExpression(payload);
  }

  /**
   * @return {number}
   */
  value() {
    return this._value;
  }

  /**
   * @return {string}
   */
  unit() {
    return this._unit;
  }

  /**
   * @return {string}
   */
  feature() {
    return this._feature;
  }

  /**
   * @return {?WebInspector.TextRange}
   */
  valueRange() {
    return this._valueRange;
  }

  /**
   * @return {?number}
   */
  computedLength() {
    return this._computedLength;
  }
};


/**
 * @unrestricted
 */
WebInspector.CSSMedia = class {
  /**
   * @param {!WebInspector.CSSModel} cssModel
   * @param {!CSSAgent.CSSMedia} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this._reinitialize(payload);
  }

  /**
   * @param {!WebInspector.CSSModel} cssModel
   * @param {!CSSAgent.CSSMedia} payload
   * @return {!WebInspector.CSSMedia}
   */
  static parsePayload(cssModel, payload) {
    return new WebInspector.CSSMedia(cssModel, payload);
  }

  /**
   * @param {!WebInspector.CSSModel} cssModel
   * @param {!Array.<!CSSAgent.CSSMedia>} payload
   * @return {!Array.<!WebInspector.CSSMedia>}
   */
  static parseMediaArrayPayload(cssModel, payload) {
    var result = [];
    for (var i = 0; i < payload.length; ++i)
      result.push(WebInspector.CSSMedia.parsePayload(cssModel, payload[i]));
    return result;
  }

  /**
   * @param {!CSSAgent.CSSMedia} payload
   */
  _reinitialize(payload) {
    this.text = payload.text;
    this.source = payload.source;
    this.sourceURL = payload.sourceURL || '';
    this.range = payload.range ? WebInspector.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
    this.mediaList = null;
    if (payload.mediaList) {
      this.mediaList = [];
      for (var i = 0; i < payload.mediaList.length; ++i)
        this.mediaList.push(WebInspector.CSSMediaQuery.parsePayload(payload.mediaList[i]));
    }
  }

  /**
   * @param {!WebInspector.CSSModel.Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId || !this.range)
      return;
    if (edit.oldRange.equal(this.range))
      this._reinitialize(/** @type {!CSSAgent.CSSMedia} */ (edit.payload));
    else
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
  }

  /**
   * @param {!WebInspector.CSSMedia} other
   * @return {boolean}
   */
  equal(other) {
    if (!this.styleSheetId || !this.range || !other.range)
      return false;
    return this.styleSheetId === other.styleSheetId && this.range.equal(other.range);
  }

  /**
   * @return {boolean}
   */
  active() {
    if (!this.mediaList)
      return true;
    for (var i = 0; i < this.mediaList.length; ++i) {
      if (this.mediaList[i].active())
        return true;
    }
    return false;
  }

  /**
   * @return {number|undefined}
   */
  lineNumberInSource() {
    if (!this.range)
      return undefined;
    var header = this.header();
    if (!header)
      return undefined;
    return header.lineNumberInSource(this.range.startLine);
  }

  /**
   * @return {number|undefined}
   */
  columnNumberInSource() {
    if (!this.range)
      return undefined;
    var header = this.header();
    if (!header)
      return undefined;
    return header.columnNumberInSource(this.range.startLine, this.range.startColumn);
  }

  /**
   * @return {?WebInspector.CSSStyleSheetHeader}
   */
  header() {
    return this.styleSheetId ? this._cssModel.styleSheetHeaderForId(this.styleSheetId) : null;
  }

  /**
   * @return {?WebInspector.CSSLocation}
   */
  rawLocation() {
    var header = this.header();
    if (!header || this.lineNumberInSource() === undefined)
      return null;
    var lineNumber = Number(this.lineNumberInSource());
    return new WebInspector.CSSLocation(header, lineNumber, this.columnNumberInSource());
  }
};

WebInspector.CSSMedia.Source = {
  LINKED_SHEET: 'linkedSheet',
  INLINE_SHEET: 'inlineSheet',
  MEDIA_RULE: 'mediaRule',
  IMPORT_RULE: 'importRule'
};


