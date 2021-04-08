// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as TextUtils from '../models/text_utils/text_utils.js';
import * as UI from '../ui/legacy/legacy.js';

import {ColorSwatch} from './ColorSwatch.js';
import {CSSShadowModel} from './CSSShadowModel.js';  // eslint-disable-line no-unused-vars

export class BezierSwatch extends HTMLSpanElement {
  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(
        this, {cssFile: 'inline_editor/bezierSwatch.css', enableLegacyPatching: true, delegatesFocus: undefined});
    this._iconElement = UI.Icon.Icon.create('smallicon-bezier', 'bezier-swatch-icon');
    root.appendChild(this._iconElement);
    this._textElement = this.createChild('span');
    root.createChild('slot');
  }

  /**
   * @return {!BezierSwatch}
   */
  static create() {
    let constructor = BezierSwatch._constructor;
    if (!constructor) {
      constructor = UI.Utils.registerCustomElement('span', 'bezier-swatch', BezierSwatch);
      BezierSwatch._constructor = constructor;
    }

    return /** @type {!BezierSwatch} */ (constructor());
  }

  /**
   * @return {string}
   */
  bezierText() {
    return this._textElement.textContent || '';
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
   * @return {!HTMLSpanElement}
   */
  iconElement() {
    return this._iconElement;
  }
}

/** @type {?function():!Element} */
BezierSwatch._constructor = null;

export class CSSShadowSwatch extends HTMLSpanElement {
  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(
        this, {cssFile: 'inline_editor/cssShadowSwatch.css', enableLegacyPatching: true, delegatesFocus: undefined});
    this._iconElement = UI.Icon.Icon.create('smallicon-shadow', 'shadow-swatch-icon');
    root.appendChild(this._iconElement);
    root.createChild('slot');
    this._contentElement = this.createChild('span');

    /** @type {?ColorSwatch} */
    this._colorSwatch;
  }

  /**
   * @return {!CSSShadowSwatch}
   */
  static create() {
    let constructor = CSSShadowSwatch._constructor;
    if (!constructor) {
      constructor = UI.Utils.registerCustomElement('span', 'css-shadow-swatch', CSSShadowSwatch);
      CSSShadowSwatch._constructor = constructor;
    }

    return /** @type {!CSSShadowSwatch} */ (constructor());
  }

  /**
   * @return {!CSSShadowModel}
   */
  model() {
    return /** @type {!CSSShadowModel} */ (this._model);
  }

  /**
   * @param {!CSSShadowModel} model
   */
  setCSSShadow(model) {
    this._model = model;
    this._contentElement.removeChildren();
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(
        model.asCSSText(), [/!important/g, /inset/g, Common.Color.Regex]);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.regexIndex === 2) {
        if (!this._colorSwatch) {
          this._colorSwatch = new ColorSwatch();
          const value = this._colorSwatch.createChild('span');
          this._colorSwatch.addEventListener('format-changed', /** @param {!Event} event */ event => {
            value.textContent = /** @type {*} */ (event).data.text;
          });
        }

        this._colorSwatch.renderColor(model.color());
        const value = this._colorSwatch.querySelector('span');
        if (value) {
          value.textContent = model.color().asString();
        }
        this._contentElement.appendChild(this._colorSwatch);
      } else {
        this._contentElement.appendChild(document.createTextNode(result.value));
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
   * @return {!HTMLSpanElement}
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

/** @type {?function():!Element} */
CSSShadowSwatch._constructor = null;
