// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';
import * as ColorSwatch from './ColorSwatch_bridge.js';

import {CSSShadowModel} from './CSSShadowModel.js';  // eslint-disable-line no-unused-vars

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
   * @return {!HTMLSpanElement}
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
          this._colorSwatch = ColorSwatch.createColorSwatch();
          const value = this._colorSwatch.createChild('span');
          this._colorSwatch.addEventListener('format-changed', event => {
            value.textContent = event.data.text;
          });
        }

        this._colorSwatch.renderColor(model.color());
        const value = this._colorSwatch.querySelector('span');
        if (value) {
          value.textContent = model.color().asString();
        }
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
   * @return {!HTMLSpanElement}
   */
  iconElement() {
    return this._iconElement;
  }

  /**
   * @return {?ColorSwatch.ColorSwatchClosureInterface}
   */
  colorSwatch() {
    return this._colorSwatch;
  }
}
