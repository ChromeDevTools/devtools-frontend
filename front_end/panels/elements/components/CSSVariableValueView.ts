// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSVariableValueView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = Lit.i18nTemplate.bind(undefined, str_);

const {render, html} = Lit;

export interface RegisteredPropertyDetails {
  registration: SDK.CSSMatchedStyles.CSSRegisteredProperty;
  goToDefinition: () => void;
}

function getLinkSection(details: RegisteredPropertyDetails): Lit.TemplateResult {
  return html`<div class="registered-property-links">
            <span role="button" @click=${details?.goToDefinition} class="clickable underlined unbreakable-text">
              ${i18nString(UIStrings.registeredPropertyLinkTitle)}
            </span>
          </div>`;
}

export interface ParserErrorViewInput {
  details: RegisteredPropertyDetails;
}

export type ParserErrorView = (input: ParserErrorViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_PARSER_ERROR_VIEW: ParserErrorView = (input, _output, target) => {
  const type = html`<span class="monospace css-property">${input.details.registration.syntax()}</span>`;
  render(html`
    <style>${cssVariableValueViewStyles}</style>
    <div class="variable-value-popup-wrapper">
      ${i18nTemplate(UIStrings.invalidPropertyValue, {type})}
      ${getLinkSection(input.details)}
    </div>`,
         target, {container: {classes: ['css-variable-parser-error']}});
};

export class CSSVariableParserError extends UI.Widget.Widget {
  #view: ParserErrorView;
  readonly #details: RegisteredPropertyDetails;

  constructor(details: RegisteredPropertyDetails, view: ParserErrorView = DEFAULT_PARSER_ERROR_VIEW) {
    super();
    this.#view = view;
    this.#details = details;
    this.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }

  override performUpdate(): void {
    this.#view({details: this.#details}, undefined, this.contentElement);
  }
}

export interface ViewInput {
  variableName: string;
  value?: string;
  details?: RegisteredPropertyDetails;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const initialValue = input.details?.registration.initialValue();
  const registrationView = input.details ? html`
      <hr class=divider />
      <div class=registered-property-popup-wrapper>
        <div class="monospace">
          <div><span class="css-property">syntax:</span> ${input.details.registration.syntax()}</div>
          <div><span class="css-property">inherits:</span> ${input.details.registration.inherits()}</div>
          ${initialValue ? html`<div><span class="css-property">initial-value:</span> ${initialValue}</div>` : ''}
        </div>
        ${getLinkSection(input.details)}
      </div>` :
                                           '';

  const valueText = input.value ?? i18nString(UIStrings.sIsNotDefined, {PH1: input.variableName});
  render(html`<style>${cssVariableValueViewStyles}</style>
           <div class="variable-value-popup-wrapper">
             ${valueText}
           </div>
           ${registrationView}
           `,
         target, {container: {classes: ['css-variable-value-view']}});
};

export class CSSVariableValueView extends UI.Widget.Widget {
  #view: View;
  #variableName = '';
  #value: string|undefined;
  #details: RegisteredPropertyDetails|undefined;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  get variableName(): string {
    return this.#variableName;
  }

  set variableName(variableName: string) {
    if (this.#variableName === variableName) {
      return;
    }
    this.#variableName = variableName;
    this.requestUpdate();
  }

  get value(): string|undefined {
    return this.#value;
  }

  set value(value: string|undefined) {
    if (this.#value === value) {
      return;
    }
    this.#value = value;
    this.requestUpdate();
  }

  get details(): RegisteredPropertyDetails|undefined {
    return this.#details;
  }

  set details(details: RegisteredPropertyDetails|undefined) {
    if (this.#details === details) {
      return;
    }
    this.#details = details;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }

  override performUpdate(): void {
    this.#view({
      variableName: this.#variableName,
      value: this.#value,
      details: this.#details,
    },
               undefined, this.contentElement);
  }
}
