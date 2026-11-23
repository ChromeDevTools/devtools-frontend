// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as Common from '../../../../core/common/common.js';
import * as Lit from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';

import colorMixSwatchStyles from './colorMixSwatch.css.js';

const {html, render, Directives: {ref, classMap}} = Lit;

export class ColorMixChangedEvent extends Event {
  static readonly eventName = 'colormixchanged';

  data: {text: string};

  constructor(text: string) {
    super(ColorMixChangedEvent.eventName, {});
    this.data = {text};
  }
}

export function serializeColorMix(space: string, items: string[]): string {
  return `color-mix(${space ? `${space}, ` : ''}${items.join(', ')})`;
}

export class ColorMixSwatch extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private space = '';             // in srgb
  private items: string[] = [];   // hotpink 20%, white
  private colors: string[] = [];  // hotpink, white
  #icon: HTMLElement|null = null;

  mixedColor(): Common.Color.Color|null {
    const colorText = this.#icon?.computedStyleMap().get('color')?.toString() ?? null;
    return colorText ? Common.Color.parse(colorText) : null;
  }

  setColorMix(space: string, items: string[]): void {
    this.space = space;
    this.items = [...items];
    this.colors = items.map(() => '');
    this.dispatchEvent(new ColorMixChangedEvent(this.getText()));
    this.#render();
  }

  setColor(index: number, text: string): void {
    if (index < 0 || index >= this.items.length) {
      return;
    }
    // We need to replace the color in its item because the text is the CSS
    // for the section where we actually show the mixed colors. Replacing it
    // within the item handles the same colors case, i.e. replacing the second
    // color of `color-mix(in srgb, red 50%, red 10%)` with `blue` should result
    // in `color-mix(in srgb, red 50%, blue 10%)`.
    if (this.colors[index]) {
      this.items[index] = this.items[index].replace(this.colors[index], text);
    }
    this.colors[index] = text;
    this.dispatchEvent(new ColorMixChangedEvent(this.getText()));
    this.#render();
  }

  getText(): string {
    if (!this.items.length) {
      return '';
    }
    return serializeColorMix(this.space, this.items);
  }

  #render(): void {
    const colorMixText = this.getText();
    if (!colorMixText || this.colors.some(color => !color)) {
      render(colorMixText, this.shadow, {host: this});
      return;
    }

    // The icon shows how two colors overlap into the mixed color. It shows
    // only the mixed color when there's one color, or more than two.
    const mixOnly = this.colors.length !== 2;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off

    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    render(
      html`<style>${colorMixSwatchStyles}</style><div class=${classMap({'swatch-icon': true, 'mix-only': mixOnly})}
      ${ref(e => {this.#icon = e as HTMLElement; })}
      jslog=${VisualLogging.cssColorMix()}
      style="--color: ${colorMixText}">${mixOnly ? html`
        <span class="swatch" id="mix-result" style="--color: ${colorMixText}"></span>` : html`
        <span class="swatch swatch-left" id="swatch-1" style="--color: ${this.colors[0]}"></span>
        <span class="swatch swatch-right" id="swatch-2" style="--color: ${this.colors[1]}"></span>
        <span class="swatch swatch-mix" id="mix-result" style="--color: ${colorMixText}"></span>`}</div>`,
      this.shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-color-mix-swatch', ColorMixSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-color-mix-swatch': ColorMixSwatch;
  }

  interface HTMLElementEventMap {
    [ColorMixChangedEvent.eventName]: ColorMixChangedEvent;
  }
}
