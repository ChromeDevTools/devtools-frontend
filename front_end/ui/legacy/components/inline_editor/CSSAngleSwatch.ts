// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import cssAngleSwatchStyles from './cssAngleSwatch.css.js';

import {AngleUnit, get2DTranslationsForAngle, type Angle} from './CSSAngleUtils.js';

const {render, html} = LitHtml;
const styleMap = LitHtml.Directives.styleMap;

const swatchWidth = 11;

export interface CSSAngleSwatchData {
  angle: Angle;
}

export class CSSAngleSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-angle-swatch`;

  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle: Angle = {
    value: 0,
    unit: AngleUnit.Rad,
  };

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [cssAngleSwatchStyles];
  }

  set data(data: CSSAngleSwatchData) {
    this.angle = data.angle;
    this.render();
  }

  private render(): void {
    const {translateX, translateY} = get2DTranslationsForAngle(this.angle, swatchWidth / 4);
    const miniHandStyle = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle.value}${this.angle.unit})`,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="swatch">
        <span class="mini-hand" style=${styleMap(miniHandStyle)}></span>
      </div>
    `, this.shadow, {
      host: this,
    });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-css-angle-swatch', CSSAngleSwatch);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-css-angle-swatch': CSSAngleSwatch;
  }
}
