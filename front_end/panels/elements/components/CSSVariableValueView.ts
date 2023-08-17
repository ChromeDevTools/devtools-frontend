// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import cssVariableValueViewStyles from './cssVariableValueView.css.js';

const UIStrings = {
  /**
   *@description Title text for the section describing the registration for a custom property
   */
  registeredPropertyTitle: 'Registered property',
  /**
   *@description Text for a link from custom property to its defining registration
   */
  goToDefinition: 'Go to definition',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSVariableValueView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

interface RegisteredPropertyDetails {
  registration: SDK.CSSMatchedStyles.CSSRegisteredProperty;
  goToDefinition: () => void;
}

export class CSSVariableValueView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-variable-value-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly value: string|undefined;
  readonly details: RegisteredPropertyDetails|undefined;

  constructor(value: string|undefined, details?: RegisteredPropertyDetails) {
    super();
    this.#shadow.adoptedStyleSheets = [cssVariableValueViewStyles];
    this.value = value;
    this.details = details;
    this.#render();
  }

  #render(): void {
    const initialValue = this.details?.registration.initialValue();
    const registrationView = this.details?.registration ? html`<div class="registered-property-popup-wrapper">
         <span class="title">${i18nString(UIStrings.registeredPropertyTitle)}</span>
          <div class="monospace">
            <div><span class="css-property">syntax:</span> ${this.details?.registration.syntax()}</div>
            <div><span class="css-property">inherits:</span> ${this.details?.registration.inherits()}</div>
            ${initialValue ? html`<div><span class="css-property">initial-value:</span> ${initialValue}</div>` : ''}
          </div>
          <div class="registered-property-links">
            <span role="button" @click=${this.details?.goToDefinition} class="clickable underlined unbreakable-text"}>
              ${i18nString(UIStrings.goToDefinition)}
            </span>
          </div>
        </div>` :
                                                          '';

    render(html`<div class="variable-value-popup-wrapper">${this.value}${registrationView}</div>`, this.#shadow, {
      host: this,
    });
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-css-variable-value-view', CSSVariableValueView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-css-variable-value-view': CSSVariableValueView;
  }
}
