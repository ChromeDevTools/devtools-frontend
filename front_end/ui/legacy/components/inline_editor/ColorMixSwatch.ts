// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';

import colorMixSwatchStyles from './colorMixSwatch.css.js';

export class ColorMixSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-color-mix-swatch`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  private colorMixText: string = '';     // color-mix(in srgb, hotpink, white)
  private firstColorText: string = '';   // hotpink
  private secondColorText: string = '';  // white

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      colorMixSwatchStyles,
    ];
  }

  setFirstColor(text: string): void {
    // We need to replace `colorMixText` because it is the CSS for the
    // the middle section where we actually show the mixed colors.
    // So, when a color changed, we need to update colorMixText to
    // reflect the new color (not the old one).
    if (this.firstColorText) {
      this.colorMixText = this.colorMixText.replace(this.firstColorText, text);
    }
    this.firstColorText = text;
    this.#render();
  }

  setSecondColor(text: string): void {
    // We need to replace from the last to handle the same colors case
    // i.e. replacing the second color of `color-mix(in srgb, red 50%, red 10%)`
    // to `blue` should result in `color-mix(in srgb, red 50%, blue 10%)`.
    if (this.secondColorText) {
      this.colorMixText = Platform.StringUtilities.replaceLast(this.colorMixText, this.secondColorText, text);
    }
    this.secondColorText = text;
    this.#render();
  }

  setColorMixText(text: string): void {
    this.colorMixText = text;
    this.#render();
  }

  #render(): void {
    if (!this.colorMixText || !this.firstColorText || !this.secondColorText) {
      LitHtml.render(this.colorMixText, this.shadow, {host: this});
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off

    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    LitHtml.render(
      LitHtml.html`<div class="swatch-icon" jslog=${VisualLogging.cssColorMix()}>
        <span class="swatch swatch-left" id="swatch-1" style="--color: ${this.firstColorText}"></span>
        <span class="swatch swatch-right" id="swatch-2" style="--color: ${this.secondColorText}"></span>
        <span class="swatch swatch-mix" id="mix-result" style="--color: ${this.colorMixText}"></span>
      </div><slot>${this.colorMixText}</slot>`,
      this.shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-color-mix-swatch', ColorMixSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-color-mix-swatch': ColorMixSwatch;
  }
}
