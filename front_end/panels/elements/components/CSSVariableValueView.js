// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import cssVariableValueViewStyles from './cssVariableValueView.css.js';
const UIStrings = {
    /**
     * @description Text for a link from a custom property to its defining registration.
     */
    registeredPropertyLinkTitle: 'View registered property',
    /**
     * @description Error message for a property value that failed to parse because it had an incorrect type. The message
     * is shown in a popover when hovering the property value. The `type` placeholder will be rendered as an HTML element
     * to apply some styling (color and monospace font).
     * @example {<color>} type
     */
    invalidPropertyValue: 'Invalid property value, expected type {type}',
    /**
     * @description Text displayed in a tooltip shown when hovering over a var() CSS function in the Styles tab when the custom property in this function does not exist. The parameter is the name of the property.
     * @example {--my-custom-property-name} PH1
     */
    sIsNotDefined: '{PH1} isn’t defined',
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
export const DEFAULT_PARSER_ERROR_VIEW = (input, _output, target) => {
    const type = html `<span class="monospace css-property">${input.details.registration.syntax()}</span>`;
    render(html `
    <style>${cssVariableValueViewStyles}</style>
    <div class="variable-value-popup-wrapper">
      ${i18nTemplate(UIStrings.invalidPropertyValue, { type })}
      ${getLinkSection(input.details)}
    </div>`, target, { container: { classes: ['css-variable-parser-error'] } });
};
export class CSSVariableParserError extends UI.Widget.Widget {
    #view;
    #details;
    constructor(details, view = DEFAULT_PARSER_ERROR_VIEW) {
        super();
        this.#view = view;
        this.#details = details;
        this.performUpdate();
    }
    wasShown() {
        super.wasShown();
        this.performUpdate();
    }
    performUpdate() {
        this.#view({ details: this.#details }, undefined, this.contentElement);
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    const initialValue = input.details?.registration.initialValue();
    const registrationView = input.details ? html `
      <hr class=divider />
      <div class=registered-property-popup-wrapper>
        <div class="monospace">
          <div><span class="css-property">syntax:</span> ${input.details.registration.syntax()}</div>
          <div><span class="css-property">inherits:</span> ${input.details.registration.inherits()}</div>
          ${initialValue ? html `<div><span class="css-property">initial-value:</span> ${initialValue}</div>` : ''}
        </div>
        ${getLinkSection(input.details)}
      </div>` :
        '';
    const valueText = input.value ?? i18nString(UIStrings.sIsNotDefined, { PH1: input.variableName });
    render(html `<style>${cssVariableValueViewStyles}</style>
           <div class="variable-value-popup-wrapper">
             ${valueText}
           </div>
           ${registrationView}
           `, target, { container: { classes: ['css-variable-value-view'] } });
};
export class CSSVariableValueView extends UI.Widget.Widget {
    #view;
    #variableName = '';
    #value;
    #details;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    get variableName() {
        return this.#variableName;
    }
    set variableName(variableName) {
        if (this.#variableName === variableName) {
            return;
        }
        this.#variableName = variableName;
        this.requestUpdate();
    }
    get value() {
        return this.#value;
    }
    set value(value) {
        if (this.#value === value) {
            return;
        }
        this.#value = value;
        this.requestUpdate();
    }
    get details() {
        return this.#details;
    }
    set details(details) {
        if (this.#details === details) {
            return;
        }
        this.#details = details;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.performUpdate();
    }
    performUpdate() {
        this.#view({
            variableName: this.#variableName,
            value: this.#value,
            details: this.#details,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=CSSVariableValueView.js.map