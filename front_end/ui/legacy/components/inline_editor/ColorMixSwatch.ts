// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

import colorMixSwatchStyles from './colorMixSwatch.css.js';

export class ColorMixSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-color-mix-swatch`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  private text: string = 'color-mix(in srgb, hotpink, white)';
  private firstColorText: string = 'hotpink';
  private secondColorText: string = 'white';

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      colorMixSwatchStyles,
    ];
  }

  setText(text: string): void {
    this.text = text;

    const parametersMatch = text.match(/color-mix\(in\s+(?:\w+)\s*,(?<firstColor>.+),(?<secondColor>.+)\)/);
    if (!parametersMatch || !parametersMatch.groups || parametersMatch.length !== 3) {
      this.#renderTextOnly();
      return;
    }

    const firstColorAndPercentage = parametersMatch.groups['firstColor'];
    const secondColorAndPercentage = parametersMatch.groups['secondColor'];

    const firstColorMatch = firstColorAndPercentage.match(Common.Color.Regex);
    if (!firstColorMatch) {
      this.#renderTextOnly();
      return;
    }

    const secondColorMatch = secondColorAndPercentage.match(Common.Color.Regex);
    if (!secondColorMatch) {
      this.#renderTextOnly();
      return;
    }

    this.firstColorText = firstColorMatch[0];
    this.secondColorText = secondColorMatch[0];

    this.#render();
  }

  #renderTextOnly(): void {
    LitHtml.render(this.text, this.shadow, {host: this});
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off

    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    LitHtml.render(
      LitHtml.html`<div class="swatch-icon">
        <span class="swatch swatch-left" id="swatch-1" style="--color: ${this.firstColorText}"></span>
        <span class="swatch swatch-right" id="swatch-2" style="--color: ${this.secondColorText}"></span>
        <span class="swatch swatch-mix" id="mix-result" style="--color: ${this.text}"></span>
      </div><slot>${this.text}</slot>`,
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
