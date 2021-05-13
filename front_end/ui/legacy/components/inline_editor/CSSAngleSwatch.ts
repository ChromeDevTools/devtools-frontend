// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

import type {Angle} from './CSSAngleUtils.js';
import {AngleUnit, get2DTranslationsForAngle} from './CSSAngleUtils.js';

const {render, html} = LitHtml;
const styleMap = LitHtml.Directives.styleMap;

const swatchWidth = 11;

export interface CSSAngleSwatchData {
  angle: Angle;
}

export class CSSAngleSwatch extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-css-angle-swatch`;

  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle: Angle = {
    value: 0,
    unit: AngleUnit.Rad,
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
      <style>
        .swatch {
          position: relative;
          display: inline-block;
          margin-bottom: -2px;
          width: 1em;
          height: 1em;
          border: 1px solid var(--legacy-selection-inactive-fg-color);
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          background-color: var(--color-background-elevation-1);
        }

        .mini-hand {
          position: absolute;
          margin: auto;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 55%;
          width: 2px;
          background-color: var(--legacy-accent-fg-color);
          border-radius: 5px;
        }
      </style>

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
