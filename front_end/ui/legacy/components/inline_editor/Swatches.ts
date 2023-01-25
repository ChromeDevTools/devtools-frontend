// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';

import {ColorChangedEvent, ColorSwatch} from './ColorSwatch.js';

import {type CSSShadowModel} from './CSSShadowModel.js';
import bezierSwatchStyles from './bezierSwatch.css.js';
import cssShadowSwatchStyles from './cssShadowSwatch.css.js';

export class BezierSwatch extends HTMLSpanElement {
  private readonly iconElementInternal: UI.Icon.Icon;
  private textElement: HTMLElement;

  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, {
      cssFile: [bezierSwatchStyles],
      delegatesFocus: undefined,
    });
    this.iconElementInternal = UI.Icon.Icon.create('smallicon-bezier', 'bezier-swatch-icon');
    root.appendChild(this.iconElementInternal);
    this.textElement = this.createChild('span');
    root.createChild('slot');
  }

  static create(): BezierSwatch {
    let constructor: (() => Element)|((() => Element) | null) = BezierSwatch.constructorInternal;
    if (!constructor) {
      constructor = UI.Utils.registerCustomElement('span', 'bezier-swatch', BezierSwatch);
      BezierSwatch.constructorInternal = constructor;
    }

    return constructor() as BezierSwatch;
  }

  bezierText(): string {
    return this.textElement.textContent || '';
  }

  setBezierText(text: string): void {
    this.textElement.textContent = text;
  }

  hideText(hide: boolean): void {
    this.textElement.hidden = hide;
  }

  iconElement(): HTMLSpanElement {
    return this.iconElementInternal;
  }

  private static constructorInternal: (() => Element)|null = null;
}

export class CSSShadowSwatch extends HTMLSpanElement {
  private readonly iconElementInternal: UI.Icon.Icon;
  private contentElement: HTMLElement;
  private colorSwatchInternal!: ColorSwatch|null;
  private modelInternal?: CSSShadowModel;

  constructor() {
    super();
    const root = UI.Utils.createShadowRootWithCoreStyles(this, {
      cssFile: [cssShadowSwatchStyles],
      delegatesFocus: undefined,
    });
    this.iconElementInternal = UI.Icon.Icon.create('smallicon-shadow', 'shadow-swatch-icon');
    root.appendChild(this.iconElementInternal);
    root.createChild('slot');
    this.contentElement = this.createChild('span');
  }

  static create(): CSSShadowSwatch {
    let constructor: (() => Element)|((() => Element) | null) = CSSShadowSwatch.constructorInternal;
    if (!constructor) {
      constructor = UI.Utils.registerCustomElement('span', 'css-shadow-swatch', CSSShadowSwatch);
      CSSShadowSwatch.constructorInternal = constructor;
    }

    return constructor() as CSSShadowSwatch;
  }

  model(): CSSShadowModel {
    return this.modelInternal as CSSShadowModel;
  }

  setCSSShadow(model: CSSShadowModel): void {
    this.modelInternal = model;
    this.contentElement.removeChildren();
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(
        model.asCSSText(), [/!important/g, /inset/g, Common.Color.Regex]);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.regexIndex === 2) {
        if (!this.colorSwatchInternal) {
          this.colorSwatchInternal = new ColorSwatch();
          const value = this.colorSwatchInternal.createChild('span');
          this.colorSwatchInternal.addEventListener(ColorChangedEvent.eventName, (event: ColorChangedEvent) => {
            value.textContent = event.data.text;
          });
        }

        this.colorSwatchInternal.renderColor(model.color());
        const value = this.colorSwatchInternal.querySelector('span');
        if (value) {
          value.textContent = model.color().getAuthoredText() ?? model.color().asString();
        }
        this.contentElement.appendChild(this.colorSwatchInternal);
      } else {
        this.contentElement.appendChild(document.createTextNode(result.value));
      }
    }
  }

  hideText(hide: boolean): void {
    this.contentElement.hidden = hide;
  }

  iconElement(): HTMLSpanElement {
    return this.iconElementInternal;
  }

  colorSwatch(): ColorSwatch|null {
    return this.colorSwatchInternal;
  }

  private static constructorInternal: (() => Element)|null = null;
}
