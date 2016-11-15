/*
 * Copyright (C) 2009 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Common.Color = class {
  /**
   * @param {!Array.<number>} rgba
   * @param {!Common.Color.Format} format
   * @param {string=} originalText
   */
  constructor(rgba, format, originalText) {
    this._rgba = rgba;
    this._originalText = originalText || null;
    this._originalTextIsValid = !!this._originalText;
    this._format = format;
    if (typeof this._rgba[3] === 'undefined')
      this._rgba[3] = 1;

    for (var i = 0; i < 4; ++i) {
      if (this._rgba[i] < 0) {
        this._rgba[i] = 0;
        this._originalTextIsValid = false;
      }
      if (this._rgba[i] > 1) {
        this._rgba[i] = 1;
        this._originalTextIsValid = false;
      }
    }
  }

  /**
   * @param {string} text
   * @return {?Common.Color}
   */
  static parse(text) {
    // Simple - #hex, rgb(), nickname, hsl()
    var value = text.toLowerCase().replace(/\s+/g, '');
    var simple =
        /^(?:#([0-9a-f]{3}|[0-9a-f]{6})|rgb\(((?:-?\d+%?,){2}-?\d+%?)\)|(\w+)|hsl\((-?\d+\.?\d*(?:,-?\d+\.?\d*%){2})\))$/i;
    var match = value.match(simple);
    if (match) {
      if (match[1]) {  // hex
        var hex = match[1].toLowerCase();
        var format;
        if (hex.length === 3) {
          format = Common.Color.Format.ShortHEX;
          hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
        } else {
          format = Common.Color.Format.HEX;
        }
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return new Common.Color([r / 255, g / 255, b / 255, 1], format, text);
      }

      if (match[2]) {  // rgb
        var rgbString = match[2].split(/\s*,\s*/);
        var rgba = [
          Common.Color._parseRgbNumeric(rgbString[0]), Common.Color._parseRgbNumeric(rgbString[1]),
          Common.Color._parseRgbNumeric(rgbString[2]), 1
        ];
        return new Common.Color(rgba, Common.Color.Format.RGB, text);
      }

      if (match[3]) {  // nickname
        var nickname = match[3].toLowerCase();
        if (nickname in Common.Color.Nicknames) {
          var rgba = Common.Color.Nicknames[nickname];
          var color = Common.Color.fromRGBA(rgba);
          color._format = Common.Color.Format.Nickname;
          color._originalText = text;
          return color;
        }
        return null;
      }

      if (match[4]) {  // hsl
        var hslString = match[4].replace(/%/g, '').split(/\s*,\s*/);
        var hsla = [
          Common.Color._parseHueNumeric(hslString[0]), Common.Color._parseSatLightNumeric(hslString[1]),
          Common.Color._parseSatLightNumeric(hslString[2]), 1
        ];
        var rgba = [];
        Common.Color.hsl2rgb(hsla, rgba);
        return new Common.Color(rgba, Common.Color.Format.HSL, text);
      }

      return null;
    }

    // Advanced - rgba(), hsla()
    var advanced =
        /^(?:rgba\(((?:-?\d+%?,){3}-?(?:\d+|\d*\.\d+))\)|hsla\((-?(?:\d+|\d*\.\d+)(?:,-?(?:\d+|\d*\.\d+)*%){2},-?(?:\d+|\d*\.\d+))\))$/;
    match = value.match(advanced);
    if (match) {
      if (match[1]) {  // rgba
        var rgbaString = match[1].split(/\s*,\s*/);
        var rgba = [
          Common.Color._parseRgbNumeric(rgbaString[0]), Common.Color._parseRgbNumeric(rgbaString[1]),
          Common.Color._parseRgbNumeric(rgbaString[2]), Common.Color._parseAlphaNumeric(rgbaString[3])
        ];
        return new Common.Color(rgba, Common.Color.Format.RGBA, text);
      }

      if (match[2]) {  // hsla
        var hslaString = match[2].replace(/%/g, '').split(/\s*,\s*/);
        var hsla = [
          Common.Color._parseHueNumeric(hslaString[0]), Common.Color._parseSatLightNumeric(hslaString[1]),
          Common.Color._parseSatLightNumeric(hslaString[2]), Common.Color._parseAlphaNumeric(hslaString[3])
        ];
        var rgba = [];
        Common.Color.hsl2rgb(hsla, rgba);
        return new Common.Color(rgba, Common.Color.Format.HSLA, text);
      }
    }

    return null;
  }

  /**
   * @param {!Array.<number>} rgba
   * @return {!Common.Color}
   */
  static fromRGBA(rgba) {
    return new Common.Color([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]], Common.Color.Format.RGBA);
  }

  /**
   * @param {!Array.<number>} hsva
   * @return {!Common.Color}
   */
  static fromHSVA(hsva) {
    var rgba = [];
    Common.Color.hsva2rgba(hsva, rgba);
    return new Common.Color(rgba, Common.Color.Format.HSLA);
  }

  /**
   * @param {string} value
   * return {number}
   */
  static _parseRgbNumeric(value) {
    var parsed = parseInt(value, 10);
    if (value.indexOf('%') !== -1)
      parsed /= 100;
    else
      parsed /= 255;
    return parsed;
  }

  /**
   * @param {string} value
   * return {number}
   */
  static _parseHueNumeric(value) {
    return isNaN(value) ? 0 : (parseFloat(value) / 360) % 1;
  }

  /**
   * @param {string} value
   * return {number}
   */
  static _parseSatLightNumeric(value) {
    return Math.min(1, parseFloat(value) / 100);
  }

  /**
   * @param {string} value
   * return {number}
   */
  static _parseAlphaNumeric(value) {
    return isNaN(value) ? 0 : parseFloat(value);
  }

  /**
   * @param {!Array.<number>} hsva
   * @param {!Array.<number>} out_hsla
   */
  static _hsva2hsla(hsva, out_hsla) {
    var h = hsva[0];
    var s = hsva[1];
    var v = hsva[2];

    var t = (2 - s) * v;
    if (v === 0 || s === 0)
      s = 0;
    else
      s *= v / (t < 1 ? t : 2 - t);

    out_hsla[0] = h;
    out_hsla[1] = s;
    out_hsla[2] = t / 2;
    out_hsla[3] = hsva[3];
  }

  /**
   * @param {!Array.<number>} hsl
   * @param {!Array.<number>} out_rgb
   */
  static hsl2rgb(hsl, out_rgb) {
    var h = hsl[0];
    var s = hsl[1];
    var l = hsl[2];

    function hue2rgb(p, q, h) {
      if (h < 0)
        h += 1;
      else if (h > 1)
        h -= 1;

      if ((h * 6) < 1)
        return p + (q - p) * h * 6;
      else if ((h * 2) < 1)
        return q;
      else if ((h * 3) < 2)
        return p + (q - p) * ((2 / 3) - h) * 6;
      else
        return p;
    }

    if (s < 0)
      s = 0;

    if (l <= 0.5)
      var q = l * (1 + s);
    else
      var q = l + s - (l * s);

    var p = 2 * l - q;

    var tr = h + (1 / 3);
    var tg = h;
    var tb = h - (1 / 3);

    out_rgb[0] = hue2rgb(p, q, tr);
    out_rgb[1] = hue2rgb(p, q, tg);
    out_rgb[2] = hue2rgb(p, q, tb);
    out_rgb[3] = hsl[3];
  }

  /**
   * @param {!Array<number>} hsva
   * @param {!Array<number>} out_rgba
   */
  static hsva2rgba(hsva, out_rgba) {
    Common.Color._hsva2hsla(hsva, Common.Color.hsva2rgba._tmpHSLA);
    Common.Color.hsl2rgb(Common.Color.hsva2rgba._tmpHSLA, out_rgba);

    for (var i = 0; i < Common.Color.hsva2rgba._tmpHSLA.length; i++)
      Common.Color.hsva2rgba._tmpHSLA[i] = 0;
  }

  /**
   * Calculate the luminance of this color using the WCAG algorithm.
   * See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
   * @param {!Array<number>} rgba
   * @return {number}
   */
  static luminance(rgba) {
    var rSRGB = rgba[0];
    var gSRGB = rgba[1];
    var bSRGB = rgba[2];

    var r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow(((rSRGB + 0.055) / 1.055), 2.4);
    var g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow(((gSRGB + 0.055) / 1.055), 2.4);
    var b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow(((bSRGB + 0.055) / 1.055), 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Combine the two given color according to alpha blending.
   * @param {!Array<number>} fgRGBA
   * @param {!Array<number>} bgRGBA
   * @param {!Array<number>} out_blended
   */
  static blendColors(fgRGBA, bgRGBA, out_blended) {
    var alpha = fgRGBA[3];

    out_blended[0] = ((1 - alpha) * bgRGBA[0]) + (alpha * fgRGBA[0]);
    out_blended[1] = ((1 - alpha) * bgRGBA[1]) + (alpha * fgRGBA[1]);
    out_blended[2] = ((1 - alpha) * bgRGBA[2]) + (alpha * fgRGBA[2]);
    out_blended[3] = alpha + (bgRGBA[3] * (1 - alpha));
  }

  /**
   * Calculate the contrast ratio between a foreground and a background color.
   * Returns the ratio to 1, for example for two two colors with a contrast ratio of 21:1, this function will return 21.
   * See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
   * @param {!Array<number>} fgRGBA
   * @param {!Array<number>} bgRGBA
   * @return {number}
   */
  static calculateContrastRatio(fgRGBA, bgRGBA) {
    Common.Color.blendColors(fgRGBA, bgRGBA, Common.Color.calculateContrastRatio._blendedFg);

    var fgLuminance = Common.Color.luminance(Common.Color.calculateContrastRatio._blendedFg);
    var bgLuminance = Common.Color.luminance(bgRGBA);
    var contrastRatio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);

    for (var i = 0; i < Common.Color.calculateContrastRatio._blendedFg.length; i++)
      Common.Color.calculateContrastRatio._blendedFg[i] = 0;

    return contrastRatio;
  }

  /**
   * Compute a desired luminance given a given luminance and a desired contrast
   * ratio.
   * @param {number} luminance The given luminance.
   * @param {number} contrast The desired contrast ratio.
   * @param {boolean} lighter Whether the desired luminance is lighter or darker
   * than the given luminance. If no luminance can be found which meets this
   * requirement, a luminance which meets the inverse requirement will be
   * returned.
   * @return {number} The desired luminance.
   */
  static desiredLuminance(luminance, contrast, lighter) {
    function computeLuminance() {
      if (lighter)
        return (luminance + 0.05) * contrast - 0.05;
      else
        return (luminance + 0.05) / contrast - 0.05;
    }
    var desiredLuminance = computeLuminance();
    if (desiredLuminance < 0 || desiredLuminance > 1) {
      lighter = !lighter;
      desiredLuminance = computeLuminance();
    }
    return desiredLuminance;
  }

  /**
   * @param {!Common.Color} color
   * @return {!Common.Color.Format}
   */
  static detectColorFormat(color) {
    const cf = Common.Color.Format;
    var format;
    var formatSetting = Common.moduleSetting('colorFormat').get();
    if (formatSetting === cf.Original)
      format = cf.Original;
    else if (formatSetting === cf.RGB)
      format = (color.hasAlpha() ? cf.RGBA : cf.RGB);
    else if (formatSetting === cf.HSL)
      format = (color.hasAlpha() ? cf.HSLA : cf.HSL);
    else if (!color.hasAlpha())
      format = (color.canBeShortHex() ? cf.ShortHEX : cf.HEX);
    else
      format = cf.RGBA;

    return format;
  }

  /**
   * @return {!Common.Color.Format}
   */
  format() {
    return this._format;
  }

  /**
   * @return {!Array.<number>} HSLA with components within [0..1]
   */
  hsla() {
    if (this._hsla)
      return this._hsla;
    var r = this._rgba[0];
    var g = this._rgba[1];
    var b = this._rgba[2];
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var diff = max - min;
    var add = max + min;

    if (min === max)
      var h = 0;
    else if (r === max)
      var h = ((1 / 6 * (g - b) / diff) + 1) % 1;
    else if (g === max)
      var h = (1 / 6 * (b - r) / diff) + 1 / 3;
    else
      var h = (1 / 6 * (r - g) / diff) + 2 / 3;

    var l = 0.5 * add;

    if (l === 0)
      var s = 0;
    else if (l === 1)
      var s = 0;
    else if (l <= 0.5)
      var s = diff / add;
    else
      var s = diff / (2 - add);

    this._hsla = [h, s, l, this._rgba[3]];
    return this._hsla;
  }

  /**
   * @return {!Array.<number>}
   */
  canonicalHSLA() {
    var hsla = this.hsla();
    return [Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100), hsla[3]];
  }

  /**
   * @return {!Array.<number>} HSVA with components within [0..1]
   */
  hsva() {
    var hsla = this.hsla();
    var h = hsla[0];
    var s = hsla[1];
    var l = hsla[2];

    s *= l < 0.5 ? l : 1 - l;
    return [h, s !== 0 ? 2 * s / (l + s) : 0, (l + s), hsla[3]];
  }

  /**
   * @return {boolean}
   */
  hasAlpha() {
    return this._rgba[3] !== 1;
  }

  /**
   * @return {boolean}
   */
  canBeShortHex() {
    if (this.hasAlpha())
      return false;
    for (var i = 0; i < 3; ++i) {
      var c = Math.round(this._rgba[i] * 255);
      if (c % 17)
        return false;
    }
    return true;
  }

  /**
   * @return {?string}
   */
  asString(format) {
    if (format === this._format && this._originalTextIsValid)
      return this._originalText;

    if (!format)
      format = this._format;

    /**
     * @param {number} value
     * @return {number}
     */
    function toRgbValue(value) {
      return Math.round(value * 255);
    }

    /**
     * @param {number} value
     * @return {string}
     */
    function toHexValue(value) {
      var hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }

    /**
     * @param {number} value
     * @return {string}
     */
    function toShortHexValue(value) {
      return (Math.round(value * 255) / 17).toString(16);
    }

    switch (format) {
      case Common.Color.Format.Original:
        return this._originalText;
      case Common.Color.Format.RGB:
        if (this.hasAlpha())
          return null;
        return String.sprintf(
            'rgb(%d, %d, %d)', toRgbValue(this._rgba[0]), toRgbValue(this._rgba[1]), toRgbValue(this._rgba[2]));
      case Common.Color.Format.RGBA:
        return String.sprintf(
            'rgba(%d, %d, %d, %f)', toRgbValue(this._rgba[0]), toRgbValue(this._rgba[1]), toRgbValue(this._rgba[2]),
            this._rgba[3]);
      case Common.Color.Format.HSL:
        if (this.hasAlpha())
          return null;
        var hsl = this.hsla();
        return String.sprintf(
            'hsl(%d, %d%, %d%)', Math.round(hsl[0] * 360), Math.round(hsl[1] * 100), Math.round(hsl[2] * 100));
      case Common.Color.Format.HSLA:
        var hsla = this.hsla();
        return String.sprintf(
            'hsla(%d, %d%, %d%, %f)', Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100),
            hsla[3]);
      case Common.Color.Format.HEX:
        if (this.hasAlpha())
          return null;
        return String
            .sprintf('#%s%s%s', toHexValue(this._rgba[0]), toHexValue(this._rgba[1]), toHexValue(this._rgba[2]))
            .toLowerCase();
      case Common.Color.Format.ShortHEX:
        if (!this.canBeShortHex())
          return null;
        return String
            .sprintf(
                '#%s%s%s', toShortHexValue(this._rgba[0]), toShortHexValue(this._rgba[1]),
                toShortHexValue(this._rgba[2]))
            .toLowerCase();
      case Common.Color.Format.Nickname:
        return this.nickname();
    }

    return this._originalText;
  }

  /**
   * @return {!Array<number>}
   */
  rgba() {
    return this._rgba.slice();
  }

  /**
   * @return {!Array.<number>}
   */
  canonicalRGBA() {
    var rgba = new Array(4);
    for (var i = 0; i < 3; ++i)
      rgba[i] = Math.round(this._rgba[i] * 255);
    rgba[3] = this._rgba[3];
    return rgba;
  }

  /**
   * @return {?string} nickname
   */
  nickname() {
    if (!Common.Color._rgbaToNickname) {
      Common.Color._rgbaToNickname = {};
      for (var nickname in Common.Color.Nicknames) {
        var rgba = Common.Color.Nicknames[nickname];
        if (rgba.length !== 4)
          rgba = rgba.concat(1);
        Common.Color._rgbaToNickname[rgba] = nickname;
      }
    }

    return Common.Color._rgbaToNickname[this.canonicalRGBA()] || null;
  }

  /**
   * @return {!{r: number, g: number, b: number, a: (number|undefined)}}
   */
  toProtocolRGBA() {
    var rgba = this.canonicalRGBA();
    var result = {r: rgba[0], g: rgba[1], b: rgba[2]};
    if (rgba[3] !== 1)
      result.a = rgba[3];
    return result;
  }

  /**
   * @return {!Common.Color}
   */
  invert() {
    var rgba = [];
    rgba[0] = 1 - this._rgba[0];
    rgba[1] = 1 - this._rgba[1];
    rgba[2] = 1 - this._rgba[2];
    rgba[3] = this._rgba[3];
    return new Common.Color(rgba, Common.Color.Format.RGBA);
  }

  /**
   * @param {number} alpha
   * @return {!Common.Color}
   */
  setAlpha(alpha) {
    var rgba = this._rgba.slice();
    rgba[3] = alpha;
    return new Common.Color(rgba, Common.Color.Format.RGBA);
  }
};

/** @type {!RegExp} */
Common.Color.Regex = /((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b[a-zA-Z]+\b(?!-))/g;

/**
 * @enum {string}
 */
Common.Color.Format = {
  Original: 'original',
  Nickname: 'nickname',
  HEX: 'hex',
  ShortHEX: 'shorthex',
  RGB: 'rgb',
  RGBA: 'rgba',
  HSL: 'hsl',
  HSLA: 'hsla'
};


/** @type {!Array<number>} */
Common.Color.hsva2rgba._tmpHSLA = [0, 0, 0, 0];


Common.Color.calculateContrastRatio._blendedFg = [0, 0, 0, 0];


Common.Color.Nicknames = {
  'aliceblue': [240, 248, 255],
  'antiquewhite': [250, 235, 215],
  'aqua': [0, 255, 255],
  'aquamarine': [127, 255, 212],
  'azure': [240, 255, 255],
  'beige': [245, 245, 220],
  'bisque': [255, 228, 196],
  'black': [0, 0, 0],
  'blanchedalmond': [255, 235, 205],
  'blue': [0, 0, 255],
  'blueviolet': [138, 43, 226],
  'brown': [165, 42, 42],
  'burlywood': [222, 184, 135],
  'cadetblue': [95, 158, 160],
  'chartreuse': [127, 255, 0],
  'chocolate': [210, 105, 30],
  'coral': [255, 127, 80],
  'cornflowerblue': [100, 149, 237],
  'cornsilk': [255, 248, 220],
  'crimson': [237, 20, 61],
  'cyan': [0, 255, 255],
  'darkblue': [0, 0, 139],
  'darkcyan': [0, 139, 139],
  'darkgoldenrod': [184, 134, 11],
  'darkgray': [169, 169, 169],
  'darkgrey': [169, 169, 169],
  'darkgreen': [0, 100, 0],
  'darkkhaki': [189, 183, 107],
  'darkmagenta': [139, 0, 139],
  'darkolivegreen': [85, 107, 47],
  'darkorange': [255, 140, 0],
  'darkorchid': [153, 50, 204],
  'darkred': [139, 0, 0],
  'darksalmon': [233, 150, 122],
  'darkseagreen': [143, 188, 143],
  'darkslateblue': [72, 61, 139],
  'darkslategray': [47, 79, 79],
  'darkslategrey': [47, 79, 79],
  'darkturquoise': [0, 206, 209],
  'darkviolet': [148, 0, 211],
  'deeppink': [255, 20, 147],
  'deepskyblue': [0, 191, 255],
  'dimgray': [105, 105, 105],
  'dimgrey': [105, 105, 105],
  'dodgerblue': [30, 144, 255],
  'firebrick': [178, 34, 34],
  'floralwhite': [255, 250, 240],
  'forestgreen': [34, 139, 34],
  'fuchsia': [255, 0, 255],
  'gainsboro': [220, 220, 220],
  'ghostwhite': [248, 248, 255],
  'gold': [255, 215, 0],
  'goldenrod': [218, 165, 32],
  'gray': [128, 128, 128],
  'grey': [128, 128, 128],
  'green': [0, 128, 0],
  'greenyellow': [173, 255, 47],
  'honeydew': [240, 255, 240],
  'hotpink': [255, 105, 180],
  'indianred': [205, 92, 92],
  'indigo': [75, 0, 130],
  'ivory': [255, 255, 240],
  'khaki': [240, 230, 140],
  'lavender': [230, 230, 250],
  'lavenderblush': [255, 240, 245],
  'lawngreen': [124, 252, 0],
  'lemonchiffon': [255, 250, 205],
  'lightblue': [173, 216, 230],
  'lightcoral': [240, 128, 128],
  'lightcyan': [224, 255, 255],
  'lightgoldenrodyellow': [250, 250, 210],
  'lightgreen': [144, 238, 144],
  'lightgray': [211, 211, 211],
  'lightgrey': [211, 211, 211],
  'lightpink': [255, 182, 193],
  'lightsalmon': [255, 160, 122],
  'lightseagreen': [32, 178, 170],
  'lightskyblue': [135, 206, 250],
  'lightslategray': [119, 136, 153],
  'lightslategrey': [119, 136, 153],
  'lightsteelblue': [176, 196, 222],
  'lightyellow': [255, 255, 224],
  'lime': [0, 255, 0],
  'limegreen': [50, 205, 50],
  'linen': [250, 240, 230],
  'magenta': [255, 0, 255],
  'maroon': [128, 0, 0],
  'mediumaquamarine': [102, 205, 170],
  'mediumblue': [0, 0, 205],
  'mediumorchid': [186, 85, 211],
  'mediumpurple': [147, 112, 219],
  'mediumseagreen': [60, 179, 113],
  'mediumslateblue': [123, 104, 238],
  'mediumspringgreen': [0, 250, 154],
  'mediumturquoise': [72, 209, 204],
  'mediumvioletred': [199, 21, 133],
  'midnightblue': [25, 25, 112],
  'mintcream': [245, 255, 250],
  'mistyrose': [255, 228, 225],
  'moccasin': [255, 228, 181],
  'navajowhite': [255, 222, 173],
  'navy': [0, 0, 128],
  'oldlace': [253, 245, 230],
  'olive': [128, 128, 0],
  'olivedrab': [107, 142, 35],
  'orange': [255, 165, 0],
  'orangered': [255, 69, 0],
  'orchid': [218, 112, 214],
  'palegoldenrod': [238, 232, 170],
  'palegreen': [152, 251, 152],
  'paleturquoise': [175, 238, 238],
  'palevioletred': [219, 112, 147],
  'papayawhip': [255, 239, 213],
  'peachpuff': [255, 218, 185],
  'peru': [205, 133, 63],
  'pink': [255, 192, 203],
  'plum': [221, 160, 221],
  'powderblue': [176, 224, 230],
  'purple': [128, 0, 128],
  'rebeccapurple': [102, 51, 153],
  'red': [255, 0, 0],
  'rosybrown': [188, 143, 143],
  'royalblue': [65, 105, 225],
  'saddlebrown': [139, 69, 19],
  'salmon': [250, 128, 114],
  'sandybrown': [244, 164, 96],
  'seagreen': [46, 139, 87],
  'seashell': [255, 245, 238],
  'sienna': [160, 82, 45],
  'silver': [192, 192, 192],
  'skyblue': [135, 206, 235],
  'slateblue': [106, 90, 205],
  'slategray': [112, 128, 144],
  'slategrey': [112, 128, 144],
  'snow': [255, 250, 250],
  'springgreen': [0, 255, 127],
  'steelblue': [70, 130, 180],
  'tan': [210, 180, 140],
  'teal': [0, 128, 128],
  'thistle': [216, 191, 216],
  'tomato': [255, 99, 71],
  'turquoise': [64, 224, 208],
  'violet': [238, 130, 238],
  'wheat': [245, 222, 179],
  'white': [255, 255, 255],
  'whitesmoke': [245, 245, 245],
  'yellow': [255, 255, 0],
  'yellowgreen': [154, 205, 50],
  'transparent': [0, 0, 0, 0],
};

Common.Color.PageHighlight = {
  Content: Common.Color.fromRGBA([111, 168, 220, .66]),
  ContentLight: Common.Color.fromRGBA([111, 168, 220, .5]),
  ContentOutline: Common.Color.fromRGBA([9, 83, 148]),
  Padding: Common.Color.fromRGBA([147, 196, 125, .55]),
  PaddingLight: Common.Color.fromRGBA([147, 196, 125, .4]),
  Border: Common.Color.fromRGBA([255, 229, 153, .66]),
  BorderLight: Common.Color.fromRGBA([255, 229, 153, .5]),
  Margin: Common.Color.fromRGBA([246, 178, 107, .66]),
  MarginLight: Common.Color.fromRGBA([246, 178, 107, .5]),
  EventTarget: Common.Color.fromRGBA([255, 196, 196, .66]),
  Shape: Common.Color.fromRGBA([96, 82, 177, 0.8]),
  ShapeMargin: Common.Color.fromRGBA([96, 82, 127, .6])
};
