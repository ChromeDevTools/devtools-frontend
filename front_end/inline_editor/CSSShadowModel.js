// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';

/**
 * @unrestricted
 */
export class CSSShadowModel {
  /**
   * @param {boolean} isBoxShadow
   */
  constructor(isBoxShadow) {
    this._isBoxShadow = isBoxShadow;
    this._inset = false;
    this._offsetX = CSSLength.zero();
    this._offsetY = CSSLength.zero();
    this._blurRadius = CSSLength.zero();
    this._spreadRadius = CSSLength.zero();
    this._color = /** @type {!Common.Color.Color} */ (Common.Color.Color.parse('black'));
    this._format = [_Part.OffsetX, _Part.OffsetY];
  }

  /**
   * @param {string} text
   * @return {!Array<!CSSShadowModel>}
   */
  static parseTextShadow(text) {
    return CSSShadowModel._parseShadow(text, false);
  }

  /**
   * @param {string} text
   * @return {!Array<!CSSShadowModel>}
   */
  static parseBoxShadow(text) {
    return CSSShadowModel._parseShadow(text, true);
  }

  /**
   * @param {string} text
   * @param {boolean} isBoxShadow
   * @return {!Array<!CSSShadowModel>}
   */
  static _parseShadow(text, isBoxShadow) {
    const shadowTexts = [];
    // Split by commas that aren't inside of color values to get the individual shadow values.
    const splits = TextUtils.TextUtils.Utils.splitStringByRegexes(text, [Common.Color.Regex, /,/g]);
    let currentIndex = 0;
    for (let i = 0; i < splits.length; i++) {
      if (splits[i].regexIndex === 1) {
        const comma = splits[i];
        shadowTexts.push(text.substring(currentIndex, comma.position));
        currentIndex = comma.position + 1;
      }
    }
    shadowTexts.push(text.substring(currentIndex, text.length));

    const shadows = [];
    for (let i = 0; i < shadowTexts.length; i++) {
      const shadow = new CSSShadowModel(isBoxShadow);
      shadow._format = [];
      let nextPartAllowed = true;
      const regexes = [/inset/gi, Common.Color.Regex, CSSLength.Regex];
      const results = TextUtils.TextUtils.Utils.splitStringByRegexes(shadowTexts[i], regexes);
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.regexIndex === -1) {
          // Don't allow anything other than inset, color, length values, and whitespace.
          if (/\S/.test(result.value)) {
            return [];
          }
          // All parts must be separated by whitespace.
          nextPartAllowed = true;
        } else {
          if (!nextPartAllowed) {
            return [];
          }
          nextPartAllowed = false;

          if (result.regexIndex === 0) {
            shadow._inset = true;
            shadow._format.push(_Part.Inset);
          } else if (result.regexIndex === 1) {
            const color = Common.Color.Color.parse(result.value);
            if (!color) {
              return [];
            }
            shadow._color = color;
            shadow._format.push(_Part.Color);
          } else if (result.regexIndex === 2) {
            const length = CSSLength.parse(result.value);
            if (!length) {
              return [];
            }
            const previousPart = shadow._format.length > 0 ? shadow._format[shadow._format.length - 1] : '';
            if (previousPart === _Part.OffsetX) {
              shadow._offsetY = length;
              shadow._format.push(_Part.OffsetY);
            } else if (previousPart === _Part.OffsetY) {
              shadow._blurRadius = length;
              shadow._format.push(_Part.BlurRadius);
            } else if (previousPart === _Part.BlurRadius) {
              shadow._spreadRadius = length;
              shadow._format.push(_Part.SpreadRadius);
            } else {
              shadow._offsetX = length;
              shadow._format.push(_Part.OffsetX);
            }
          }
        }
      }
      if (invalidCount(shadow, _Part.OffsetX, 1, 1) || invalidCount(shadow, _Part.OffsetY, 1, 1) ||
          invalidCount(shadow, _Part.Color, 0, 1) || invalidCount(shadow, _Part.BlurRadius, 0, 1) ||
          invalidCount(shadow, _Part.Inset, 0, isBoxShadow ? 1 : 0) ||
          invalidCount(shadow, _Part.SpreadRadius, 0, isBoxShadow ? 1 : 0)) {
        return [];
      }
      shadows.push(shadow);
    }
    return shadows;

    /**
     * @param {!CSSShadowModel} shadow
     * @param {string} part
     * @param {number} min
     * @param {number} max
     * @return {boolean}
     */
    function invalidCount(shadow, part, min, max) {
      let count = 0;
      for (let i = 0; i < shadow._format.length; i++) {
        if (shadow._format[i] === part) {
          count++;
        }
      }
      return count < min || count > max;
    }
  }

  /**
   * @param {boolean} inset
   */
  setInset(inset) {
    this._inset = inset;
    if (this._format.indexOf(_Part.Inset) === -1) {
      this._format.unshift(_Part.Inset);
    }
  }

  /**
   * @param {!CSSLength} offsetX
   */
  setOffsetX(offsetX) {
    this._offsetX = offsetX;
  }

  /**
   * @param {!CSSLength} offsetY
   */
  setOffsetY(offsetY) {
    this._offsetY = offsetY;
  }

  /**
   * @param {!CSSLength} blurRadius
   */
  setBlurRadius(blurRadius) {
    this._blurRadius = blurRadius;
    if (this._format.indexOf(_Part.BlurRadius) === -1) {
      const yIndex = this._format.indexOf(_Part.OffsetY);
      this._format.splice(yIndex + 1, 0, _Part.BlurRadius);
    }
  }

  /**
   * @param {!CSSLength} spreadRadius
   */
  setSpreadRadius(spreadRadius) {
    this._spreadRadius = spreadRadius;
    if (this._format.indexOf(_Part.SpreadRadius) === -1) {
      this.setBlurRadius(this._blurRadius);
      const blurIndex = this._format.indexOf(_Part.BlurRadius);
      this._format.splice(blurIndex + 1, 0, _Part.SpreadRadius);
    }
  }

  /**
   * @param {!Common.Color.Color} color
   */
  setColor(color) {
    this._color = color;
    if (this._format.indexOf(_Part.Color) === -1) {
      this._format.push(_Part.Color);
    }
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
   * @return {!CSSLength}
   */
  offsetX() {
    return this._offsetX;
  }

  /**
   * @return {!CSSLength}
   */
  offsetY() {
    return this._offsetY;
  }

  /**
   * @return {!CSSLength}
   */
  blurRadius() {
    return this._blurRadius;
  }

  /**
   * @return {!CSSLength}
   */
  spreadRadius() {
    return this._spreadRadius;
  }

  /**
   * @return {!Common.Color.Color}
   */
  color() {
    return this._color;
  }

  /**
   * @return {string}
   */
  asCSSText() {
    const parts = [];
    for (let i = 0; i < this._format.length; i++) {
      const part = this._format[i];
      if (part === _Part.Inset && this._inset) {
        parts.push('inset');
      } else if (part === _Part.OffsetX) {
        parts.push(this._offsetX.asCSSText());
      } else if (part === _Part.OffsetY) {
        parts.push(this._offsetY.asCSSText());
      } else if (part === _Part.BlurRadius) {
        parts.push(this._blurRadius.asCSSText());
      } else if (part === _Part.SpreadRadius) {
        parts.push(this._spreadRadius.asCSSText());
      } else if (part === _Part.Color) {
        parts.push(this._color.asString(this._color.format()));
      }
    }
    return parts.join(' ');
  }
}

/**
 * @enum {string}
 */
export const _Part = {
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
export class CSSLength {
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
   * @return {?CSSLength}
   */
  static parse(text) {
    const lengthRegex = new RegExp('^(?:' + CSSLength.Regex.source + ')$', 'i');
    const match = text.match(lengthRegex);
    if (!match) {
      return null;
    }
    if (match.length > 2 && match[2]) {
      return new CSSLength(parseFloat(match[1]), match[2]);
    }
    return CSSLength.zero();
  }

  /**
   * @return {!CSSLength}
   */
  static zero() {
    return new CSSLength(0, '');
  }

  /**
   * @return {string}
   */
  asCSSText() {
    return this.amount + this.unit;
  }
}

/** @type {!RegExp} */
CSSLength.Regex = (function() {
  const number = '([+-]?(?:[0-9]*[.])?[0-9]+(?:[eE][+-]?[0-9]+)?)';
  const unit = '(ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmax|vmin|vw)';
  const zero = '[+-]?(?:0*[.])?0+(?:[eE][+-]?[0-9]+)?';
  return new RegExp(number + unit + '|' + zero, 'gi');
})();
