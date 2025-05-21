// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Lit from '../../../lit/lit.js';

import cssAngleSwatchStyles from './cssAngleSwatch.css.js';
import {type Angle, AngleUnit, get2DTranslationsForAngle} from './CSSAngleUtils.js';

const {render, html} = Lit;
const styleMap = Lit.Directives.styleMap;

const swatchWidth = 11;

export interface CSSAngleSwatchData {
  angle: Angle;
}

export class CSSAngleSwatch extends HTMLElement {

  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle: Angle = {
    value: 0,
    unit: AngleUnit.RAD,
  };

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
      <style>${cssAngleSwatchStyles}</style>
      <div class="swatch">
        <span class="mini-hand" style=${styleMap(miniHandStyle)}></span>
      </div>
    `, this.shadow, {
      host: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-css-angle-swatch', CSSAngleSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-angle-swatch': CSSAngleSwatch;
  }
}
