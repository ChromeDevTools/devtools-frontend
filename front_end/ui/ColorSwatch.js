// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ColorSwatch = class extends HTMLSpanElement {
  constructor() {
    super();
  }

  /**
   * @return {!WebInspector.ColorSwatch}
   */
  static create() {
    if (!WebInspector.ColorSwatch._constructor)
      WebInspector.ColorSwatch._constructor =
          registerCustomElement('span', 'color-swatch', WebInspector.ColorSwatch.prototype);

    return /** @type {!WebInspector.ColorSwatch} */ (new WebInspector.ColorSwatch._constructor());
  }

  /**
   * @param {!WebInspector.Color} color
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
    var cf = WebInspector.Color.Format;

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
   * @return {!WebInspector.Color} color
   */
  color() {
    return this._color;
  }

  /**
   * @param {!WebInspector.Color} color
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
   * @return {!WebInspector.Color.Format}
   */
  format() {
    return this._format;
  }

  /**
   * @param {!WebInspector.Color.Format} format
   */
  setFormat(format) {
    this._format = format;
    this._colorValueElement.textContent = this._color.asString(this._format);
  }

  toggleNextFormat() {
    do {
      this._format = WebInspector.ColorSwatch._nextColorFormat(this._color, this._format);
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
    var root = WebInspector.createShadowRootWithCoreStyles(this, 'ui/colorSwatch.css');

    this._iconElement = root.createChild('span', 'color-swatch');
    this._iconElement.title = WebInspector.UIString('Shift-click to change color format');
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
WebInspector.BezierSwatch = class extends HTMLSpanElement {
  constructor() {
    super();
  }

  /**
   * @return {!WebInspector.BezierSwatch}
   */
  static create() {
    if (!WebInspector.BezierSwatch._constructor)
      WebInspector.BezierSwatch._constructor =
          registerCustomElement('span', 'bezier-swatch', WebInspector.BezierSwatch.prototype);

    return /** @type {!WebInspector.BezierSwatch} */ (new WebInspector.BezierSwatch._constructor());
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
    var root = WebInspector.createShadowRootWithCoreStyles(this, 'ui/bezierSwatch.css');
    this._iconElement = WebInspector.Icon.create('smallicon-bezier', 'bezier-swatch-icon');
    root.appendChild(this._iconElement);
    this._textElement = this.createChild('span');
    root.createChild('content');
  }
};


/**
 * @unrestricted
 */
WebInspector.CSSShadowSwatch = class extends HTMLSpanElement {
  constructor() {
    super();
  }

  /**
   * @return {!WebInspector.CSSShadowSwatch}
   */
  static create() {
    if (!WebInspector.CSSShadowSwatch._constructor)
      WebInspector.CSSShadowSwatch._constructor =
          registerCustomElement('span', 'css-shadow-swatch', WebInspector.CSSShadowSwatch.prototype);

    return /** @type {!WebInspector.CSSShadowSwatch} */ (new WebInspector.CSSShadowSwatch._constructor());
  }

  /**
   * @return {!WebInspector.CSSShadowModel} cssShadowModel
   */
  model() {
    return this._model;
  }

  /**
   * @param {!WebInspector.CSSShadowModel} model
   */
  setCSSShadow(model) {
    this._model = model;
    this._contentElement.removeChildren();
    var results = WebInspector.TextUtils.splitStringByRegexes(model.asCSSText(), [/inset/g, WebInspector.Color.Regex]);
    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      if (result.regexIndex === 1) {
        if (!this._colorSwatch)
          this._colorSwatch = WebInspector.ColorSwatch.create();
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
   * @return {?WebInspector.ColorSwatch}
   */
  colorSwatch() {
    return this._colorSwatch;
  }

  /**
   * @override
   */
  createdCallback() {
    var root = WebInspector.createShadowRootWithCoreStyles(this, 'ui/cssShadowSwatch.css');
    this._iconElement = WebInspector.Icon.create('smallicon-shadow', 'shadow-swatch-icon');
    root.appendChild(this._iconElement);
    root.createChild('content');
    this._contentElement = this.createChild('span');
  }
};
