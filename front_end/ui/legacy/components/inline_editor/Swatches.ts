// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import bezierSwatchStyles from './bezierSwatch.css.js';
import type {CSSShadowModel} from './CSSShadowEditor.js';
import cssShadowSwatchStyles from './cssShadowSwatch.css.js';

const {html} = LitHtml;

export class BezierSwatch extends HTMLElement {
  readonly #icon: IconButton.Icon.Icon;
  readonly #text: HTMLSpanElement;

  constructor() {
    super();
    const root = UI.UIUtils.createShadowRootWithCoreStyles(this, {
      cssFile: [bezierSwatchStyles],
      delegatesFocus: undefined,
    });
    this.#icon = IconButton.Icon.create('bezier-curve-filled', 'bezier-swatch-icon');
    this.#icon.setAttribute('jslog', `${VisualLogging.showStyleEditor('bezier')}`);
    root.appendChild(this.#icon);
    this.#text = document.createElement('span');
    root.createChild('slot');
  }

  connectedCallback(): void {
    this.append(this.#text);
  }

  disconnectedCallback(): void {
    this.#text.remove();
  }

  static create(): BezierSwatch {
    return document.createElement('devtools-bezier-swatch');
  }

  bezierText(): string {
    return this.#text.textContent || '';
  }

  setBezierText(text: string): void {
    this.#text.textContent = text;
  }

  hideText(hide: boolean): void {
    this.#text.hidden = hide;
  }

  iconElement(): IconButton.Icon.Icon {
    return this.#icon;
  }
}

customElements.define('devtools-bezier-swatch', BezierSwatch);

export class CSSShadowSwatch extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #icon: IconButton.Icon.Icon;
  readonly #model: CSSShadowModel;

  constructor(model: CSSShadowModel) {
    super();
    this.#model = model;
    this.#shadow.adoptedStyleSheets = [
      cssShadowSwatchStyles,
    ];

    LitHtml.render(
        html`<devtools-icon name="shadow" class="shadow-swatch-icon"></devtools-icon><slot></slot>`, this.#shadow,
        {host: this});

    this.#icon = this.#shadow.querySelector('devtools-icon') as IconButton.Icon.Icon;
  }

  model(): CSSShadowModel {
    return this.#model;
  }

  iconElement(): IconButton.Icon.Icon {
    return this.#icon;
  }
}

customElements.define('css-shadow-swatch', CSSShadowSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-bezier-swatch': BezierSwatch;
    'css-shadow-swatch': CSSShadowSwatch;
  }
}
