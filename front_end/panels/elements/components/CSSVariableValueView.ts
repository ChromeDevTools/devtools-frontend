// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import cssVariableValueViewStyles from './cssVariableValueView.css.js';

const UIStrings = {
  /**
   *@description Text for a link from custom property to its defining registration
   */
  registeredPropertyLinkTitle: 'View registered property',
  /**
   *@description Error message for a property value that failed to parse because it had an incorrect type. The message
   * is shown in a popover when hovering the property value. The `type` placeholder will be rendered as an HTML element
   * to apply some styling (color and monospace font)
   *@example {<color>} type
   */
  invalidPropertyValue: 'Invalid property value, expected type {type}',
  /**
   *@description Text displayed in a tooltip shown when hovering over a var() CSS function in the Styles pane when the custom property in this function does not exist. The parameter is the name of the property.
   *@example {--my-custom-property-name} PH1
   */
  sIsNotDefined: '{PH1} is not defined',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSVariableValueView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = LitHtml.i18nTemplate.bind(undefined, str_);

const {render, html} = LitHtml;

export interface RegisteredPropertyDetails {
  registration: SDK.CSSMatchedStyles.CSSRegisteredProperty;
  goToDefinition: () => void;
}

function getLinkSection(details: RegisteredPropertyDetails): LitHtml.TemplateResult {
  return html`<div class="registered-property-links">
            <span role="button" @click=${details?.goToDefinition} class="clickable underlined unbreakable-text">
              ${i18nString(UIStrings.registeredPropertyLinkTitle)}
            </span>
          </div>`;
}

export class CSSVariableParserError extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor(details: RegisteredPropertyDetails) {
    super();
    this.#shadow.adoptedStyleSheets = [cssVariableValueViewStyles];
    this.#render(details);
  }

  #render(details: RegisteredPropertyDetails): void {
    const type = html`<span class="monospace css-property">${details.registration.syntax()}</span>`;
    render(
        html`
      <div class="variable-value-popup-wrapper">
        ${i18nTemplate(UIStrings.invalidPropertyValue, {type})}
        ${getLinkSection(details)}
      </div>`,
        this.#shadow, {
          host: this,
        });
  }
}

export class CSSVariableValueView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly variableName: string;
  readonly value: string|undefined;
  readonly details: RegisteredPropertyDetails|undefined;

  constructor({
    variableName,
    value,
    details,
  }: {
    variableName: string,
    value: string|undefined,
    details?: RegisteredPropertyDetails,
  }) {
    super();
    this.#shadow.adoptedStyleSheets = [cssVariableValueViewStyles];
    this.variableName = variableName;
    this.value = value;
    this.details = details;
    this.#render();
  }

  #render(): void {
    const initialValue = this.details?.registration.initialValue();
    const registrationView = this.details ? html`
        <hr class=divider />
        <div class=registered-property-popup-wrapper>
          <div class="monospace">
            <div><span class="css-property">syntax:</span> ${this.details.registration.syntax()}</div>
            <div><span class="css-property">inherits:</span> ${this.details.registration.inherits()}</div>
            ${initialValue ? html`<div><span class="css-property">initial-value:</span> ${initialValue}</div>` : ''}
          </div>
          ${getLinkSection(this.details)}
        </div>` :
                                            '';

    const valueText = this.value ?? i18nString(UIStrings.sIsNotDefined, {PH1: this.variableName});
    render(
        html`<div class="variable-value-popup-wrapper">
               ${valueText}
             </div>
             ${registrationView}
             `,
        this.#shadow, {
          host: this,
        });
  }
}

customElements.define('devtools-css-variable-value-view', CSSVariableValueView);
customElements.define('devtools-css-variable-parser-error', CSSVariableParserError);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-variable-value-view': CSSVariableValueView;
    'devtools-css-variable-parser-error': CSSVariableParserError;
  }
}
