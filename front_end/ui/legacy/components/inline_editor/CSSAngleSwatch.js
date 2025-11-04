// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Lit from '../../../lit/lit.js';
import cssAngleSwatchStyles from './cssAngleSwatch.css.js';
import { get2DTranslationsForAngle } from './CSSAngleUtils.js';
const { render, html } = Lit;
const styleMap = Lit.Directives.styleMap;
const swatchWidth = 11;
export class CSSAngleSwatch extends HTMLElement {
    shadow = this.attachShadow({ mode: 'open' });
    angle = {
        value: 0,
        unit: "rad" /* AngleUnit.RAD */,
    };
    set data(data) {
        this.angle = data.angle;
        this.render();
    }
    render() {
        const { translateX, translateY } = get2DTranslationsForAngle(this.angle, swatchWidth / 4);
        const miniHandStyle = {
            transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle.value}${this.angle.unit})`,
        };
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
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
//# sourceMappingURL=CSSAngleSwatch.js.map