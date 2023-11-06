// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../ui/components/helpers/helpers.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import autofillViewStyles from './autofillView.css.js';

const UIStrings = {
  /**
   * @description Title text for the Autofill pane.
   */
  autofill: 'Autofill',
};

const str_ = i18n.i18n.registerUIStrings('panels/autofill/AutofillView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AutofillView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-autofill-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [autofillViewStyles];
    void this.#render();
  }

  async #render(): Promise<void> {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <h1>${i18nString(UIStrings.autofill)}</h1>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-autofill-view', AutofillView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-autofill-view': AutofillView;
  }
}
