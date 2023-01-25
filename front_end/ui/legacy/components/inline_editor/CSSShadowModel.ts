// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';

export class CSSShadowModel {
  private readonly isBoxShadowInternal: boolean;
  private insetInternal: boolean;
  private offsetXInternal: CSSLength;
  private offsetYInternal: CSSLength;
  private blurRadiusInternal: CSSLength;
  private spreadRadiusInternal: CSSLength;
  private colorInternal: Common.Color.Color;
  private format: Part[];
  private important: boolean;

  constructor(isBoxShadow: boolean) {
    this.isBoxShadowInternal = isBoxShadow;
    this.insetInternal = false;
    this.offsetXInternal = CSSLength.zero();
    this.offsetYInternal = CSSLength.zero();
    this.blurRadiusInternal = CSSLength.zero();
    this.spreadRadiusInternal = CSSLength.zero();
    this.colorInternal = (Common.Color.parse('black') as Common.Color.Color);
    this.format = [Part.OffsetX, Part.OffsetY];
    this.important = false;
  }

  static parseTextShadow(text: string): CSSShadowModel[] {
    return CSSShadowModel.parseShadow(text, false);
  }

  static parseBoxShadow(text: string): CSSShadowModel[] {
    return CSSShadowModel.parseShadow(text, true);
  }

  private static parseShadow(text: string, isBoxShadow: boolean): CSSShadowModel[] {
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
      shadow.format = [];
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
            shadow.important = true;
            shadow.format.push(Part.Important);
          } else if (result.regexIndex === 1) {
            shadow.insetInternal = true;
            shadow.format.push(Part.Inset);
          } else if (result.regexIndex === 2) {
            const color = Common.Color.parse(result.value);
            if (!color) {
              return [];
            }
            shadow.colorInternal = color;
            shadow.format.push(Part.Color);
          } else if (result.regexIndex === 3) {
            const length = CSSLength.parse(result.value);
            if (!length) {
              return [];
            }
            const previousPart = shadow.format.length > 0 ? shadow.format[shadow.format.length - 1] : '';
            if (previousPart === Part.OffsetX) {
              shadow.offsetYInternal = length;
              shadow.format.push(Part.OffsetY);
            } else if (previousPart === Part.OffsetY) {
              shadow.blurRadiusInternal = length;
              shadow.format.push(Part.BlurRadius);
            } else if (previousPart === Part.BlurRadius) {
              shadow.spreadRadiusInternal = length;
              shadow.format.push(Part.SpreadRadius);
            } else {
              shadow.offsetXInternal = length;
              shadow.format.push(Part.OffsetX);
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
      for (let i = 0; i < shadow.format.length; i++) {
        if (shadow.format[i] === part) {
          count++;
        }
      }
      return count < min || count > max;
    }
  }

  setInset(inset: boolean): void {
    this.insetInternal = inset;
    if (this.format.indexOf(Part.Inset) === -1) {
      this.format.unshift(Part.Inset);
    }
  }

  setOffsetX(offsetX: CSSLength): void {
    this.offsetXInternal = offsetX;
  }

  setOffsetY(offsetY: CSSLength): void {
    this.offsetYInternal = offsetY;
  }

  setBlurRadius(blurRadius: CSSLength): void {
    this.blurRadiusInternal = blurRadius;
    if (this.format.indexOf(Part.BlurRadius) === -1) {
      const yIndex = this.format.indexOf(Part.OffsetY);
      this.format.splice(yIndex + 1, 0, Part.BlurRadius);
    }
  }

  setSpreadRadius(spreadRadius: CSSLength): void {
    this.spreadRadiusInternal = spreadRadius;
    if (this.format.indexOf(Part.SpreadRadius) === -1) {
      this.setBlurRadius(this.blurRadiusInternal);
      const blurIndex = this.format.indexOf(Part.BlurRadius);
      this.format.splice(blurIndex + 1, 0, Part.SpreadRadius);
    }
  }

  setColor(color: Common.Color.Color): void {
    this.colorInternal = color;
    if (this.format.indexOf(Part.Color) === -1) {
      this.format.push(Part.Color);
    }
  }

  isBoxShadow(): boolean {
    return this.isBoxShadowInternal;
  }

  inset(): boolean {
    return this.insetInternal;
  }

  offsetX(): CSSLength {
    return this.offsetXInternal;
  }

  offsetY(): CSSLength {
    return this.offsetYInternal;
  }

  blurRadius(): CSSLength {
    return this.blurRadiusInternal;
  }

  spreadRadius(): CSSLength {
    return this.spreadRadiusInternal;
  }

  color(): Common.Color.Color {
    return this.colorInternal;
  }

  asCSSText(): string {
    const parts = [];
    for (let i = 0; i < this.format.length; i++) {
      const part = this.format[i];
      if (part === Part.Inset && this.insetInternal) {
        parts.push('inset');
      } else if (part === Part.OffsetX) {
        parts.push(this.offsetXInternal.asCSSText());
      } else if (part === Part.OffsetY) {
        parts.push(this.offsetYInternal.asCSSText());
      } else if (part === Part.BlurRadius) {
        parts.push(this.blurRadiusInternal.asCSSText());
      } else if (part === Part.SpreadRadius) {
        parts.push(this.spreadRadiusInternal.asCSSText());
      } else if (part === Part.Color) {
        parts.push(this.colorInternal.getAuthoredText() ?? this.colorInternal.asString());
      } else if (part === Part.Important && this.important) {
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
