// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import cssHintDetailsViewStyles from './cssHintDetailsView.css.js';

const UIStrings = {
  /**
   *@description Text for button that redirects to CSS property documentation.
   */
    learnMore: 'Learn More',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSHintDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html, Directives} = LitHtml;

interface Hint {
  getMessage(): string;
  getPossibleFixMessage(): string|null;
  getLearnMoreLink(): string|undefined;
}

export class CSSHintDetailsView extends HTMLElement {
    readonly #shadow = this.attachShadow({mode: 'open'});
    readonly #authoringHint: Hint;

    constructor(authoringHint: Hint) {
        super();
        this.#authoringHint = authoringHint;
        this.#shadow.adoptedStyleSheets = [cssHintDetailsViewStyles];
        this.#render();
    }

    #render(): void {
      const link = this.#authoringHint.getLearnMoreLink();
      // clang-format off
      render(html`
        <div class="hint-popup-wrapper">
          <div class="hint-popup-reason">
            ${Directives.unsafeHTML(this.#authoringHint.getMessage())}
          </div>
          ${this.#authoringHint.getPossibleFixMessage() ? html`
              <div class="hint-popup-possible-fix">
                  ${Directives.unsafeHTML(this.#authoringHint.getPossibleFixMessage())}
                  ${link ? html`
                      <x-link id="learn-more" href=${link} class="clickable underlined unbreakable-text">
                          ${i18nString(UIStrings.learnMore)}
                      </x-link>
                  `: ''}
              </div>
          ` : ''}
        </div>
      `, this.#shadow, {
        host: this,
      });
      // clang-format on
    }
}

customElements.define('devtools-css-hint-details-view', CSSHintDetailsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-hint-details-view': CSSHintDetailsView;
  }
}
