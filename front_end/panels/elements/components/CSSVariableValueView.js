// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../core/i18n/i18n.js';
import * as Lit from '../../../ui/lit/lit.js';
import cssVariableValueViewStyles from './cssVariableValueView.css.js';
const UIStrings = {
    /**
     * @description Text for a link from custom property to its defining registration
     */
    registeredPropertyLinkTitle: 'View registered property',
    /**
     * @description Error message for a property value that failed to parse because it had an incorrect type. The message
     * is shown in a popover when hovering the property value. The `type` placeholder will be rendered as an HTML element
     * to apply some styling (color and monospace font)
     * @example {<color>} type
     */
    invalidPropertyValue: 'Invalid property value, expected type {type}',
    /**
     * @description Text displayed in a tooltip shown when hovering over a var() CSS function in the Styles pane when the custom property in this function does not exist. The parameter is the name of the property.
     * @example {--my-custom-property-name} PH1
     */
    sIsNotDefined: '{PH1} is not defined',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSVariableValueView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = Lit.i18nTemplate.bind(undefined, str_);
const { render, html } = Lit;
function getLinkSection(details) {
    return html `<div class="registered-property-links">
            <span role="button" @click=${details?.goToDefinition} class="clickable underlined unbreakable-text">
              ${i18nString(UIStrings.registeredPropertyLinkTitle)}
            </span>
          </div>`;
}
export class CSSVariableParserError extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    constructor(details) {
        super();
        this.#render(details);
    }
    #render(details) {
        const type = html `<span class="monospace css-property">${details.registration.syntax()}</span>`;
        render(html `
      <style>${cssVariableValueViewStyles}</style>
      <div class="variable-value-popup-wrapper">
        ${i18nTemplate(UIStrings.invalidPropertyValue, { type })}
        ${getLinkSection(details)}
      </div>`, this.#shadow, {
            host: this,
        });
    }
}
export class CSSVariableValueView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    variableName;
    #value;
    details;
    constructor({ variableName, value, details, }) {
        super();
        this.variableName = variableName;
        this.details = details;
        this.value = value;
    }
    get value() {
        return this.#value;
    }
    set value(value) {
        this.#value = value;
        this.#render();
    }
    #render() {
        const initialValue = this.details?.registration.initialValue();
        const registrationView = this.details ? html `
        <hr class=divider />
        <div class=registered-property-popup-wrapper>
          <div class="monospace">
            <div><span class="css-property">syntax:</span> ${this.details.registration.syntax()}</div>
            <div><span class="css-property">inherits:</span> ${this.details.registration.inherits()}</div>
            ${initialValue ? html `<div><span class="css-property">initial-value:</span> ${initialValue}</div>` : ''}
          </div>
          ${getLinkSection(this.details)}
        </div>` :
            '';
        const valueText = this.value ?? i18nString(UIStrings.sIsNotDefined, { PH1: this.variableName });
        render(html `<style>${cssVariableValueViewStyles}</style>
             <div class="variable-value-popup-wrapper">
               ${valueText}
             </div>
             ${registrationView}
             `, this.#shadow, {
            host: this,
        });
    }
}
customElements.define('devtools-css-variable-value-view', CSSVariableValueView);
customElements.define('devtools-css-variable-parser-error', CSSVariableParserError);
//# sourceMappingURL=CSSVariableValueView.js.map