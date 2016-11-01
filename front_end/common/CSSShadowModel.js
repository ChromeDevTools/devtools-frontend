// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.CSSShadowModel = class {
  /**
   * @param {boolean} isBoxShadow
   */
  constructor(isBoxShadow) {
    this._isBoxShadow = isBoxShadow;
    this._inset = false;
    this._offsetX = WebInspector.CSSLength.zero();
    this._offsetY = WebInspector.CSSLength.zero();
    this._blurRadius = WebInspector.CSSLength.zero();
    this._spreadRadius = WebInspector.CSSLength.zero();
    this._color = /** @type {!WebInspector.Color} */ (WebInspector.Color.parse('black'));
    this._format = [WebInspector.CSSShadowModel._Part.OffsetX, WebInspector.CSSShadowModel._Part.OffsetY];
  }

  /**
   * @param {string} text
   * @return {!Array<!WebInspector.CSSShadowModel>}
   */
  static parseTextShadow(text) {
    return WebInspector.CSSShadowModel._parseShadow(text, false);
  }

  /**
   * @param {string} text
   * @return {!Array<!WebInspector.CSSShadowModel>}
   */
  static parseBoxShadow(text) {
    return WebInspector.CSSShadowModel._parseShadow(text, true);
  }

  /**
   * @param {string} text
   * @param {boolean} isBoxShadow
   * @return {!Array<!WebInspector.CSSShadowModel>}
   */
  static _parseShadow(text, isBoxShadow) {
    var shadowTexts = [];
    // Split by commas that aren't inside of color values to get the individual shadow values.
    var splits = WebInspector.TextUtils.splitStringByRegexes(text, [WebInspector.Color.Regex, /,/g]);
    var currentIndex = 0;
    for (var i = 0; i < splits.length; i++) {
      if (splits[i].regexIndex === 1) {
        var comma = splits[i];
        shadowTexts.push(text.substring(currentIndex, comma.position));
        currentIndex = comma.position + 1;
      }
    }
    shadowTexts.push(text.substring(currentIndex, text.length));

    var shadows = [];
    for (var i = 0; i < shadowTexts.length; i++) {
      var shadow = new WebInspector.CSSShadowModel(isBoxShadow);
      shadow._format = [];
      var nextPartAllowed = true;
      var regexes = [/inset/gi, WebInspector.Color.Regex, WebInspector.CSSLength.Regex];
      var results = WebInspector.TextUtils.splitStringByRegexes(shadowTexts[i], regexes);
      for (var j = 0; j < results.length; j++) {
        var result = results[j];
        if (result.regexIndex === -1) {
          // Don't allow anything other than inset, color, length values, and whitespace.
          if (/\S/.test(result.value))
            return [];
          // All parts must be separated by whitespace.
          nextPartAllowed = true;
        } else {
          if (!nextPartAllowed)
            return [];
          nextPartAllowed = false;

          if (result.regexIndex === 0) {
            shadow._inset = true;
            shadow._format.push(WebInspector.CSSShadowModel._Part.Inset);
          } else if (result.regexIndex === 1) {
            var color = WebInspector.Color.parse(result.value);
            if (!color)
              return [];
            shadow._color = color;
            shadow._format.push(WebInspector.CSSShadowModel._Part.Color);
          } else if (result.regexIndex === 2) {
            var length = WebInspector.CSSLength.parse(result.value);
            if (!length)
              return [];
            var previousPart = shadow._format.length > 0 ? shadow._format[shadow._format.length - 1] : '';
            if (previousPart === WebInspector.CSSShadowModel._Part.OffsetX) {
              shadow._offsetY = length;
              shadow._format.push(WebInspector.CSSShadowModel._Part.OffsetY);
            } else if (previousPart === WebInspector.CSSShadowModel._Part.OffsetY) {
              shadow._blurRadius = length;
              shadow._format.push(WebInspector.CSSShadowModel._Part.BlurRadius);
            } else if (previousPart === WebInspector.CSSShadowModel._Part.BlurRadius) {
              shadow._spreadRadius = length;
              shadow._format.push(WebInspector.CSSShadowModel._Part.SpreadRadius);
            } else {
              shadow._offsetX = length;
              shadow._format.push(WebInspector.CSSShadowModel._Part.OffsetX);
            }
          }
        }
      }
      if (invalidCount(WebInspector.CSSShadowModel._Part.OffsetX, 1, 1) ||
          invalidCount(WebInspector.CSSShadowModel._Part.OffsetY, 1, 1) ||
          invalidCount(WebInspector.CSSShadowModel._Part.Color, 0, 1) ||
          invalidCount(WebInspector.CSSShadowModel._Part.BlurRadius, 0, 1) ||
          invalidCount(WebInspector.CSSShadowModel._Part.Inset, 0, isBoxShadow ? 1 : 0) ||
          invalidCount(WebInspector.CSSShadowModel._Part.SpreadRadius, 0, isBoxShadow ? 1 : 0))
        return [];
      shadows.push(shadow);
    }
    return shadows;

    /**
     * @param {string} part
     * @param {number} min
     * @param {number} max
     * @return {boolean}
     */
    function invalidCount(part, min, max) {
      var count = 0;
      for (var i = 0; i < shadow._format.length; i++) {
        if (shadow._format[i] === part)
          count++;
      }
      return count < min || count > max;
    }
  }

  /**
   * @param {boolean} inset
   */
  setInset(inset) {
    this._inset = inset;
    if (this._format.indexOf(WebInspector.CSSShadowModel._Part.Inset) === -1)
      this._format.unshift(WebInspector.CSSShadowModel._Part.Inset);
  }

  /**
   * @param {!WebInspector.CSSLength} offsetX
   */
  setOffsetX(offsetX) {
    this._offsetX = offsetX;
  }

  /**
   * @param {!WebInspector.CSSLength} offsetY
   */
  setOffsetY(offsetY) {
    this._offsetY = offsetY;
  }

  /**
   * @param {!WebInspector.CSSLength} blurRadius
   */
  setBlurRadius(blurRadius) {
    this._blurRadius = blurRadius;
    if (this._format.indexOf(WebInspector.CSSShadowModel._Part.BlurRadius) === -1) {
      var yIndex = this._format.indexOf(WebInspector.CSSShadowModel._Part.OffsetY);
      this._format.splice(yIndex + 1, 0, WebInspector.CSSShadowModel._Part.BlurRadius);
    }
  }

  /**
   * @param {!WebInspector.CSSLength} spreadRadius
   */
  setSpreadRadius(spreadRadius) {
    this._spreadRadius = spreadRadius;
    if (this._format.indexOf(WebInspector.CSSShadowModel._Part.SpreadRadius) === -1) {
      this.setBlurRadius(this._blurRadius);
      var blurIndex = this._format.indexOf(WebInspector.CSSShadowModel._Part.BlurRadius);
      this._format.splice(blurIndex + 1, 0, WebInspector.CSSShadowModel._Part.SpreadRadius);
    }
  }

  /**
   * @param {!WebInspector.Color} color
   */
  setColor(color) {
    this._color = color;
    if (this._format.indexOf(WebInspector.CSSShadowModel._Part.Color) === -1)
      this._format.push(WebInspector.CSSShadowModel._Part.Color);
  }

  /**
   * @return {boolean}
   */
  isBoxShadow() {
    return this._isBoxShadow;
  }

  /**
   * @return {boolean}
   */
  inset() {
    return this._inset;
  }

  /**
   * @return {!WebInspector.CSSLength}
   */
  offsetX() {
    return this._offsetX;
  }

  /**
   * @return {!WebInspector.CSSLength}
   */
  offsetY() {
    return this._offsetY;
  }

  /**
   * @return {!WebInspector.CSSLength}
   */
  blurRadius() {
    return this._blurRadius;
  }

  /**
   * @return {!WebInspector.CSSLength}
   */
  spreadRadius() {
    return this._spreadRadius;
  }

  /**
   * @return {!WebInspector.Color}
   */
  color() {
    return this._color;
  }

  /**
   * @return {string}
   */
  asCSSText() {
    var parts = [];
    for (var i = 0; i < this._format.length; i++) {
      var part = this._format[i];
      if (part === WebInspector.CSSShadowModel._Part.Inset && this._inset)
        parts.push('inset');
      else if (part === WebInspector.CSSShadowModel._Part.OffsetX)
        parts.push(this._offsetX.asCSSText());
      else if (part === WebInspector.CSSShadowModel._Part.OffsetY)
        parts.push(this._offsetY.asCSSText());
      else if (part === WebInspector.CSSShadowModel._Part.BlurRadius)
        parts.push(this._blurRadius.asCSSText());
      else if (part === WebInspector.CSSShadowModel._Part.SpreadRadius)
        parts.push(this._spreadRadius.asCSSText());
      else if (part === WebInspector.CSSShadowModel._Part.Color)
        parts.push(this._color.asString(this._color.format()));
    }
    return parts.join(' ');
  }
};

/**
 * @enum {string}
 */
WebInspector.CSSShadowModel._Part = {
  Inset: 'I',
  OffsetX: 'X',
  OffsetY: 'Y',
  BlurRadius: 'B',
  SpreadRadius: 'S',
  Color: 'C'
};


/**
 * @unrestricted
 */
WebInspector.CSSLength = class {
  /**
   * @param {number} amount
   * @param {string} unit
   */
  constructor(amount, unit) {
    this.amount = amount;
    this.unit = unit;
  }

  /**
   * @param {string} text
   * @return {?WebInspector.CSSLength}
   */
  static parse(text) {
    var lengthRegex = new RegExp('^(?:' + WebInspector.CSSLength.Regex.source + ')$', 'i');
    var match = text.match(lengthRegex);
    if (!match)
      return null;
    if (match.length > 2 && match[2])
      return new WebInspector.CSSLength(parseFloat(match[1]), match[2]);
    return WebInspector.CSSLength.zero();
  }

  /**
   * @return {!WebInspector.CSSLength}
   */
  static zero() {
    return new WebInspector.CSSLength(0, '');
  }

  /**
   * @return {string}
   */
  asCSSText() {
    return this.amount + this.unit;
  }
};

/** @type {!RegExp} */
WebInspector.CSSLength.Regex = (function() {
  var number = '([+-]?(?:[0-9]*[.])?[0-9]+(?:[eE][+-]?[0-9]+)?)';
  var unit = '(ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmax|vmin|vw)';
  var zero = '[+-]?(?:0*[.])?0+(?:[eE][+-]?[0-9]+)?';
  return new RegExp(number + unit + '|' + zero, 'gi');
})();


