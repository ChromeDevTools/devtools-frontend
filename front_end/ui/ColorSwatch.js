// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.ColorSwatch = class extends HTMLSpanElement {
  constructor() {
    super();
  }

  /**
   * @return {!UI.ColorSwatch}
   */
  static create() {
    if (!UI.ColorSwatch._constructor)
      UI.ColorSwatch._constructor = UI.registerCustomElement('span', 'color-swatch', UI.ColorSwatch.prototype);

    return /** @type {!UI.ColorSwatch} */ (new UI.ColorSwatch._constructor());
  }

  /**
   * @param {!Common.Color} color
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
    var cf = Common.Color.Format;

    switch (curFormat) {
      case cf.Original:
        return !color.hasAlpha() ? cf.RGB : cf.RGBA;

      case cf.RGB:
      case cf.RGBA:
        return !color.hasAlpha() ? cf.HSL : cf.HSLA;

      case cf.HSL:
      case cf.HSLA:
        if (color.nickname())
          return cf.Nickname;
        if (!color.hasAlpha())
          return color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
        else
          return cf.Original;

      case cf.ShortHEX:
        return cf.HEX;

      case cf.HEX:
        return cf.Original;

      case cf.Nickname:
        if (!color.hasAlpha())
          return color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
        else
          return cf.Original;

      default:
        return cf.RGBA;
    }
  }

  /**
   * @return {!Common.Color} color
   */
  color() {
    return this._color;
  }

  /**
   * @param {!Common.Color} color
   */
  setColor(color) {
    this._color = color;
    this._format = this._color.format();
    var colorString = this._color.asString(this._format);
    this._colorValueElement.textContent = colorString;
    this._swatchInner.style.backgroundColor = colorString;
  }

  /**
   * @param {boolean} hide
   */
  hideText(hide) {
    this._colorValueElement.hidden = hide;
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
    this._colorValueElement.textContent = this._color.asString(this._format);
  }

  toggleNextFormat() {
    do {
      this._format = UI.ColorSwatch._nextColorFormat(this._color, this._format);
      var currentValue = this._color.asString(this._format);
    } while (currentValue === this._colorValueElement.textContent);
    this._colorValueElement.textContent = currentValue;
  }

  /**
   * @return {!Element}
   */
  iconElement() {
    return this._iconElement;
  }

  /**
   * @override
   */
  createdCallback() {
    var root = UI.createShadowRootWithCoreStyles(this, 'ui/colorSwatch.css');

    this._iconElement = root.createChild('span', 'color-swatch');
    this._iconElement.title = Common.UIString('Shift-click to change color format');
    this._swatchInner = this._iconElement.createChild('span', 'color-swatch-inner');
    this._swatchInner.addEventListener('dblclick', (e) => e.consume(), false);
    this._swatchInner.addEventListener('mousedown', (e) => e.consume(), false);
    this._swatchInner.addEventListener('click', this._handleClick.bind(this), true);

    root.createChild('content');
    this._colorValueElement = this.createChild('span');
  }

  /**
   * @param {!Event} event
   */
  _handleClick(event) {
    if (!event.shiftKey)
      return;
    event.target.parentNode.parentNode.host.toggleNextFormat();
    event.consume(true);
  }
};


/**
 * @unrestricted
 */
UI.BezierSwatch = class extends HTMLSpanElement {
  constructor() {
    super();
  }

  /**
   * @return {!UI.BezierSwatch}
   */
  static create() {
    if (!UI.BezierSwatch._constructor)
      UI.BezierSwatch._constructor = UI.registerCustomElement('span', 'bezier-swatch', UI.BezierSwatch.prototype);

    return /** @type {!UI.BezierSwatch} */ (new UI.BezierSwatch._constructor());
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

  /**
   * @override
   */
  createdCallback() {
    var root = UI.createShadowRootWithCoreStyles(this, 'ui/bezierSwatch.css');
    this._iconElement = UI.Icon.create('smallicon-bezier', 'bezier-swatch-icon');
    root.appendChild(this._iconElement);
    this._textElement = this.createChild('span');
    root.createChild('content');
  }
};


/**
 * @unrestricted
 */
UI.CSSShadowSwatch = class extends HTMLSpanElement {
  constructor() {
    super();
  }

  /**
   * @return {!UI.CSSShadowSwatch}
   */
  static create() {
    if (!UI.CSSShadowSwatch._constructor) {
      UI.CSSShadowSwatch._constructor =
          UI.registerCustomElement('span', 'css-shadow-swatch', UI.CSSShadowSwatch.prototype);
    }

    return /** @type {!UI.CSSShadowSwatch} */ (new UI.CSSShadowSwatch._constructor());
  }

  /**
   * @return {!Common.CSSShadowModel} cssShadowModel
   */
  model() {
    return this._model;
  }

  /**
   * @param {!Common.CSSShadowModel} model
   */
  setCSSShadow(model) {
    this._model = model;
    this._contentElement.removeChildren();
    var results = Common.TextUtils.splitStringByRegexes(model.asCSSText(), [/inset/g, Common.Color.Regex]);
    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      if (result.regexIndex === 1) {
        if (!this._colorSwatch)
          this._colorSwatch = UI.ColorSwatch.create();
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
   * @return {?UI.ColorSwatch}
   */
  colorSwatch() {
    return this._colorSwatch;
  }

  /**
   * @override
   */
  createdCallback() {
    var root = UI.createShadowRootWithCoreStyles(this, 'ui/cssShadowSwatch.css');
    this._iconElement = UI.Icon.create('smallicon-shadow', 'shadow-swatch-icon');
    root.appendChild(this._iconElement);
    root.createChild('content');
    this._contentElement = this.createChild('span');
  }
};
