// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import CSSPropertyDocsViewStyles from './cssPropertyDocsView.css.js';

const UIStrings = {
  /**
   *@description Text for button that redirects to CSS property documentation.
   */
  learnMore: 'Learn more',
  /**
   *@description Prefix for the syntax section of CSS property documentation.
   */
  syntax: 'Syntax',
  /**
   *@description Text for a checkbox to turn off the CSS property documentation.
   */
  dontShow: 'Don\'t show',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSPropertyDocsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

interface CSSProperty {
  name: string;
  description?: string;
  syntax?: string;
  references?: Array<{
    name: string,
    url: string,
  }>;
}

export class CSSPropertyDocsView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-property-docs-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #cssProperty: CSSProperty;

  constructor(cssProperty: CSSProperty) {
    super();
    this.#cssProperty = cssProperty;
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, CSSPropertyDocsViewStyles];
    this.#render();
  }

  #dontShowChanged(e: Event): void {
    const showDocumentation = !(e.target as HTMLInputElement).checked;
    Common.Settings.Settings.instance().moduleSetting('showCSSPropertyDocumentationOnHover').set(showDocumentation);
  }

  #render(): void {
    const description = this.#cssProperty.description;
    const syntax = this.#cssProperty.syntax;
    const link = this.#cssProperty.references?.[0].url;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="docs-popup-wrapper">
        ${description ? html`
          <div id="description">
            ${description}
          </div>
        ` : LitHtml.nothing}
        ${syntax ? html`
          <div
            id="syntax"
            class="docs-popup-section"
          >
            ${i18nString(UIStrings.syntax)}: <code>${syntax}</code>
          </div>
        ` : LitHtml.nothing}
        ${link ? html`
          <div class="docs-popup-section footer">
            <x-link
              id="learn-more"
              href=${link}
              class="clickable underlined unbreakable-text"
            >
              ${i18nString(UIStrings.learnMore)}
            </x-link>
            <label class="dont-show">
              <input type="checkbox" @change=${this.#dontShowChanged} />
              ${i18nString(UIStrings.dontShow)}
            </label>
          </div>
        ` : LitHtml.nothing}
      </div>
    `, this.#shadow, {
        host: this,
      });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-css-property-docs-view', CSSPropertyDocsView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-css-property-docs-view': CSSPropertyDocsView;
  }
}
