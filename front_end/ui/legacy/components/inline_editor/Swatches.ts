// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import bezierSwatchStyles from './bezierSwatch.css.js';
import {type CSSShadowModel} from './CSSShadowEditor.js';
import cssShadowSwatchStyles from './cssShadowSwatch.css.js';

export class BezierSwatch extends HTMLSpanElement {
  private readonly iconElementInternal: IconButton.Icon.Icon;
  private textElement: HTMLElement;

  constructor() {
    super();
    const root = UI.UIUtils.createShadowRootWithCoreStyles(this, {
      cssFile: [bezierSwatchStyles],
      delegatesFocus: undefined,
    });
    this.iconElementInternal = IconButton.Icon.create('bezier-curve-filled', 'bezier-swatch-icon');
    this.iconElementInternal.setAttribute('jslog', `${VisualLogging.showStyleEditor('bezier')}`);
    root.appendChild(this.iconElementInternal);
    this.textElement = this.createChild('span');
    root.createChild('slot');
  }

  static create(): BezierSwatch {
    let constructor: (() => Element)|((() => Element) | null) = BezierSwatch.constructorInternal;
    if (!constructor) {
      constructor = UI.UIUtils.registerCustomElement('span', 'bezier-swatch', BezierSwatch);
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

export class CSSShadowSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`css-shadow-swatch`;
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
        LitHtml.html`<${IconButton.Icon.Icon.litTagName} name="shadow" class="shadow-swatch-icon"></${
            IconButton.Icon.Icon.litTagName}><slot></slot>`,
        this.#shadow, {host: this});

    this.#icon = this.#shadow.querySelector(IconButton.Icon.Icon.litTagName.value as string) as IconButton.Icon.Icon;
  }

  model(): CSSShadowModel {
    return this.#model;
  }

  iconElement(): HTMLSpanElement {
    return this.#icon;
  }
}

customElements.define('css-shadow-swatch', CSSShadowSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'css-shadow-swatch': CSSShadowSwatch;
  }
}
