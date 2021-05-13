// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../../../core/common/common.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';

import {ColorSwatch} from './ColorSwatch.js';
import type {CSSShadowModel} from './CSSShadowModel.js'; // eslint-disable-line no-unused-vars

export class BezierSwatch extends HTMLSpanElement {
  _iconElement: UI.Icon.Icon;
  _textElement: HTMLElement;

  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, {
      cssFile: 'ui/legacy/components/inline_editor/bezierSwatch.css',
      enableLegacyPatching: false,
      delegatesFocus: undefined,
    });
    this._iconElement = UI.Icon.Icon.create('smallicon-bezier', 'bezier-swatch-icon');
    root.appendChild(this._iconElement);
    this._textElement = this.createChild('span');
    root.createChild('slot');
  }

  static create(): BezierSwatch {
    let constructor: (() => Element)|((() => Element) | null) = BezierSwatch._constructor;
    if (!constructor) {
      constructor = UI.Utils.registerCustomElement('span', 'bezier-swatch', BezierSwatch);
      BezierSwatch._constructor = constructor;
    }

    return constructor() as BezierSwatch;
  }

  bezierText(): string {
    return this._textElement.textContent || '';
  }

  setBezierText(text: string): void {
    this._textElement.textContent = text;
  }

  hideText(hide: boolean): void {
    this._textElement.hidden = hide;
  }

  iconElement(): HTMLSpanElement {
    return this._iconElement;
  }

  static _constructor: (() => Element)|null = null;
}

export class CSSShadowSwatch extends HTMLSpanElement {
  _iconElement: UI.Icon.Icon;
  _contentElement: HTMLElement;
  _colorSwatch!: ColorSwatch|null;
  _model?: CSSShadowModel;

  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, {
      cssFile: 'ui/legacy/components/inline_editor/cssShadowSwatch.css',
      enableLegacyPatching: true,
      delegatesFocus: undefined,
    });
    this._iconElement = UI.Icon.Icon.create('smallicon-shadow', 'shadow-swatch-icon');
    root.appendChild(this._iconElement);
    root.createChild('slot');
    this._contentElement = this.createChild('span');
  }

  static create(): CSSShadowSwatch {
    let constructor: (() => Element)|((() => Element) | null) = CSSShadowSwatch._constructor;
    if (!constructor) {
      constructor = UI.Utils.registerCustomElement('span', 'css-shadow-swatch', CSSShadowSwatch);
      CSSShadowSwatch._constructor = constructor;
    }

    return constructor() as CSSShadowSwatch;
  }

  model(): CSSShadowModel {
    return this._model as CSSShadowModel;
  }

  setCSSShadow(model: CSSShadowModel): void {
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
          this._colorSwatch.addEventListener('formatchanged', (event: Event) => {
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            value.textContent = (event as any).data.text;
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

  hideText(hide: boolean): void {
    this._contentElement.hidden = hide;
  }

  iconElement(): HTMLSpanElement {
    return this._iconElement;
  }

  colorSwatch(): ColorSwatch|null {
    return this._colorSwatch;
  }

  static _constructor: (() => Element)|null = null;
}
