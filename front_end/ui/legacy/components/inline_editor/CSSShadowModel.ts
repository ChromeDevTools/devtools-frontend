// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../../../core/common/common.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';

export class CSSShadowModel {
  _isBoxShadow: boolean;
  _inset: boolean;
  _offsetX: CSSLength;
  _offsetY: CSSLength;
  _blurRadius: CSSLength;
  _spreadRadius: CSSLength;
  _color: Common.Color.Color;
  _format: Part[];
  _important: boolean;

  constructor(isBoxShadow: boolean) {
    this._isBoxShadow = isBoxShadow;
    this._inset = false;
    this._offsetX = CSSLength.zero();
    this._offsetY = CSSLength.zero();
    this._blurRadius = CSSLength.zero();
    this._spreadRadius = CSSLength.zero();
    this._color = (Common.Color.Color.parse('black') as Common.Color.Color);
    this._format = [Part.OffsetX, Part.OffsetY];
    this._important = false;
  }

  static parseTextShadow(text: string): CSSShadowModel[] {
    return CSSShadowModel._parseShadow(text, false);
  }

  static parseBoxShadow(text: string): CSSShadowModel[] {
    return CSSShadowModel._parseShadow(text, true);
  }

  static _parseShadow(text: string, isBoxShadow: boolean): CSSShadowModel[] {
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
      const regexes = [/!important/gi, /inset/gi, Common.Color.Regex, CSSLength.Regex];
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
            shadow._important = true;
            shadow._format.push(Part.Important);
          } else if (result.regexIndex === 1) {
            shadow._inset = true;
            shadow._format.push(Part.Inset);
          } else if (result.regexIndex === 2) {
            const color = Common.Color.Color.parse(result.value);
            if (!color) {
              return [];
            }
            shadow._color = color;
            shadow._format.push(Part.Color);
          } else if (result.regexIndex === 3) {
            const length = CSSLength.parse(result.value);
            if (!length) {
              return [];
            }
            const previousPart = shadow._format.length > 0 ? shadow._format[shadow._format.length - 1] : '';
            if (previousPart === Part.OffsetX) {
              shadow._offsetY = length;
              shadow._format.push(Part.OffsetY);
            } else if (previousPart === Part.OffsetY) {
              shadow._blurRadius = length;
              shadow._format.push(Part.BlurRadius);
            } else if (previousPart === Part.BlurRadius) {
              shadow._spreadRadius = length;
              shadow._format.push(Part.SpreadRadius);
            } else {
              shadow._offsetX = length;
              shadow._format.push(Part.OffsetX);
            }
          }
        }
      }
      if (invalidCount(shadow, Part.OffsetX, 1, 1) || invalidCount(shadow, Part.OffsetY, 1, 1) ||
          invalidCount(shadow, Part.Color, 0, 1) || invalidCount(shadow, Part.BlurRadius, 0, 1) ||
          invalidCount(shadow, Part.Inset, 0, isBoxShadow ? 1 : 0) ||
          invalidCount(shadow, Part.SpreadRadius, 0, isBoxShadow ? 1 : 0) ||
          invalidCount(shadow, Part.Important, 0, 1)) {
        return [];
      }
      shadows.push(shadow);
    }
    return shadows;

    function invalidCount(shadow: CSSShadowModel, part: string, min: number, max: number): boolean {
      let count = 0;
      for (let i = 0; i < shadow._format.length; i++) {
        if (shadow._format[i] === part) {
          count++;
        }
      }
      return count < min || count > max;
    }
  }

  setInset(inset: boolean): void {
    this._inset = inset;
    if (this._format.indexOf(Part.Inset) === -1) {
      this._format.unshift(Part.Inset);
    }
  }

  setOffsetX(offsetX: CSSLength): void {
    this._offsetX = offsetX;
  }

  setOffsetY(offsetY: CSSLength): void {
    this._offsetY = offsetY;
  }

  setBlurRadius(blurRadius: CSSLength): void {
    this._blurRadius = blurRadius;
    if (this._format.indexOf(Part.BlurRadius) === -1) {
      const yIndex = this._format.indexOf(Part.OffsetY);
      this._format.splice(yIndex + 1, 0, Part.BlurRadius);
    }
  }

  setSpreadRadius(spreadRadius: CSSLength): void {
    this._spreadRadius = spreadRadius;
    if (this._format.indexOf(Part.SpreadRadius) === -1) {
      this.setBlurRadius(this._blurRadius);
      const blurIndex = this._format.indexOf(Part.BlurRadius);
      this._format.splice(blurIndex + 1, 0, Part.SpreadRadius);
    }
  }

  setColor(color: Common.Color.Color): void {
    this._color = color;
    if (this._format.indexOf(Part.Color) === -1) {
      this._format.push(Part.Color);
    }
  }

  isBoxShadow(): boolean {
    return this._isBoxShadow;
  }

  inset(): boolean {
    return this._inset;
  }

  offsetX(): CSSLength {
    return this._offsetX;
  }

  offsetY(): CSSLength {
    return this._offsetY;
  }

  blurRadius(): CSSLength {
    return this._blurRadius;
  }

  spreadRadius(): CSSLength {
    return this._spreadRadius;
  }

  color(): Common.Color.Color {
    return this._color;
  }

  asCSSText(): string {
    const parts = [];
    for (let i = 0; i < this._format.length; i++) {
      const part = this._format[i];
      if (part === Part.Inset && this._inset) {
        parts.push('inset');
      } else if (part === Part.OffsetX) {
        parts.push(this._offsetX.asCSSText());
      } else if (part === Part.OffsetY) {
        parts.push(this._offsetY.asCSSText());
      } else if (part === Part.BlurRadius) {
        parts.push(this._blurRadius.asCSSText());
      } else if (part === Part.SpreadRadius) {
        parts.push(this._spreadRadius.asCSSText());
      } else if (part === Part.Color) {
        parts.push(this._color.asString(this._color.format()));
      } else if (part === Part.Important && this._important) {
        parts.push('!important');
      }
    }
    return parts.join(' ');
  }
}

const enum Part {
  Inset = 'I',
  OffsetX = 'X',
  OffsetY = 'Y',
  BlurRadius = 'B',
  SpreadRadius = 'S',
  Color = 'C',
  Important = 'M',
}


export class CSSLength {
  amount: number;
  unit: string;
  constructor(amount: number, unit: string) {
    this.amount = amount;
    this.unit = unit;
  }

  static parse(text: string): CSSLength|null {
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

  static zero(): CSSLength {
    return new CSSLength(0, '');
  }

  asCSSText(): string {
    return this.amount + this.unit;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static Regex = (function(): RegExp {
    const number = '([+-]?(?:[0-9]*[.])?[0-9]+(?:[eE][+-]?[0-9]+)?)';
    const unit = '(ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmax|vmin|vw)';
    const zero = '[+-]?(?:0*[.])?0+(?:[eE][+-]?[0-9]+)?';
    return new RegExp(number + unit + '|' + zero, 'gi');
  })();
}
