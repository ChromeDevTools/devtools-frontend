// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {CSSShadowModel} from './CSSShadowModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class ColorSwatch extends HTMLSpanElement {
  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, 'inline_editor/colorSwatch.css');

    this._iconElement = root.createChild('span', 'color-swatch');
    this._iconElement.title = Common.UIString.UIString('Shift-click to change color format');
    this._swatchInner = this._iconElement.createChild('span', 'color-swatch-inner');
    this._swatchInner.addEventListener('dblclick', e => e.consume(), false);
    this._swatchInner.addEventListener('mousedown', e => e.consume(), false);
    this._swatchInner.addEventListener('click', this._handleClick.bind(this), true);

    root.createChild('slot');
    this._colorValueElement = this.createChild('span');
  }

  /**
   * @return {!ColorSwatch}
   */
  static create() {
    if (!ColorSwatch._constructor) {
      ColorSwatch._constructor = UI.Utils.registerCustomElement('span', 'color-swatch', ColorSwatch);
    }


    return /** @type {!ColorSwatch} */ (ColorSwatch._constructor());
  }

  /**
   * @param {!Common.Color.Color} color
   * @param {string} curFormat
   */
  static _nextColorFormat(color, curFormat) {
    // The format loop is as follows:
    // * original
    // * rgb(a)
    // * hsl(a)
    // * nickname (if the color has a nickname)
    // * shorthex (if has short hex)
    // * hex
    const cf = Common.Color.Format;

    switch (curFormat) {
      case cf.Original:
        return !color.hasAlpha() ? cf.RGB : cf.RGBA;

      case cf.RGB:
      case cf.RGBA:
        return !color.hasAlpha() ? cf.HSL : cf.HSLA;

      case cf.HSL:
      case cf.HSLA:
        if (color.nickname()) {
          return cf.Nickname;
        }
        return color.detectHEXFormat();

      case cf.ShortHEX:
        return cf.HEX;

      case cf.ShortHEXA:
        return cf.HEXA;

      case cf.HEXA:
      case cf.HEX:
        return cf.Original;

      case cf.Nickname:
        return color.detectHEXFormat();

      default:
        return cf.RGBA;
    }
  }

  /**
   * @return {!Common.Color.Color} color
   */
  color() {
    return this._color;
  }

  /**
   * @param {!Common.Color.Color} color
   */
  setColor(color) {
    this._color = color;
    this._format = this._color.format();
    const colorString = /** @type {string} */ (this._color.asString(this._format));
    this.setText(colorString);
    this._swatchInner.style.backgroundColor = colorString;
  }

  /**
   * @param {boolean} hide
   */
  hideText(hide) {
    this._colorValueElement.hidden = hide;
  }

  /**
   * @param {string} text
   * @param {string=} tooltip
   */
  setText(text, tooltip) {
    this._colorValueElement.textContent = text;
    this._colorValueElement.title = tooltip;
  }

  /**
   * @return {!Common.Color.Format}
   */
  format() {
    return this._format;
  }

  /**
   * @param {!Common.Color.Format} format
   */
  setFormat(format) {
    this._format = format;
    this.setText(this._color.asString(this._format));
  }

  toggleNextFormat() {
    let currentValue;
    do {
      this._format = ColorSwatch._nextColorFormat(this._color, this._format);
      currentValue = this._color.asString(this._format);
    } while (currentValue === this._colorValueElement.textContent);
    this.setText(currentValue);
  }

  /**
   * @return {!Element}
   */
  iconElement() {
    return this._iconElement;
  }

  /**
   * @param {!Event} event
   */
  _handleClick(event) {
    if (!event.shiftKey) {
      return;
    }
    event.target.parentNode.parentNode.host.toggleNextFormat();
    event.consume(true);
  }
}


/**
 * @unrestricted
 */
export class BezierSwatch extends HTMLSpanElement {
  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, 'inline_editor/bezierSwatch.css');
    this._iconElement = UI.Icon.Icon.create('smallicon-bezier', 'bezier-swatch-icon');
    root.appendChild(this._iconElement);
    this._textElement = this.createChild('span');
    root.createChild('slot');
  }

  /**
   * @return {!BezierSwatch}
   */
  static create() {
    if (!BezierSwatch._constructor) {
      BezierSwatch._constructor = UI.Utils.registerCustomElement('span', 'bezier-swatch', BezierSwatch);
    }


    return /** @type {!BezierSwatch} */ (BezierSwatch._constructor());
  }

  /**
   * @return {string}
   */
  bezierText() {
    return this._textElement.textContent;
  }

  /**
   * @param {string} text
   */
  setBezierText(text) {
    this._textElement.textContent = text;
  }

  /**
   * @param {boolean} hide
   */
  hideText(hide) {
    this._textElement.hidden = hide;
  }

  /**
   * @return {!Element}
   */
  iconElement() {
    return this._iconElement;
  }
}

/**
 * @unrestricted
 */
export class CSSShadowSwatch extends HTMLSpanElement {
  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, 'inline_editor/cssShadowSwatch.css');
    this._iconElement = UI.Icon.Icon.create('smallicon-shadow', 'shadow-swatch-icon');
    root.appendChild(this._iconElement);
    root.createChild('slot');
    this._contentElement = this.createChild('span');
  }

  /**
   * @return {!CSSShadowSwatch}
   */
  static create() {
    if (!CSSShadowSwatch._constructor) {
      CSSShadowSwatch._constructor = UI.Utils.registerCustomElement('span', 'css-shadow-swatch', CSSShadowSwatch);
    }

    return /** @type {!CSSShadowSwatch} */ (CSSShadowSwatch._constructor());
  }

  /**
   * @return {!CSSShadowModel} cssShadowModel
   */
  model() {
    return this._model;
  }

  /**
   * @param {!CSSShadowModel} model
   */
  setCSSShadow(model) {
    this._model = model;
    this._contentElement.removeChildren();
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(model.asCSSText(), [/inset/g, Common.Color.Regex]);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.regexIndex === 1) {
        if (!this._colorSwatch) {
          this._colorSwatch = ColorSwatch.create();
        }
        this._colorSwatch.setColor(model.color());
        this._contentElement.appendChild(this._colorSwatch);
      } else {
        this._contentElement.appendChild(createTextNode(result.value));
      }
    }
  }

  /**
   * @param {boolean} hide
   */
  hideText(hide) {
    this._contentElement.hidden = hide;
  }

  /**
   * @return {!Element}
   */
  iconElement() {
    return this._iconElement;
  }

  /**
   * @return {?ColorSwatch}
   */
  colorSwatch() {
    return this._colorSwatch;
  }
}
