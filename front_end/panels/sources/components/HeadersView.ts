// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import type * as Workspace from '../../../models/workspace/workspace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import HeadersViewStyles from './HeadersView.css.js';

const UIStrings = {
  /**
  *@description Error message for files which cannot not be parsed.
  *@example {.headers} PH1
  */
  errorWhenParsing: 'Error when parsing \'\'{PH1}\'\'.',
  /**
  *@description Explainer for files which cannot be parsed.
  *@example {.headers} PH1
  */
  parsingErrorExplainer:
      'This is most likely due to a syntax error in \'\'{PH1}\'\'. Try opening this file in an external editor to fix the error or delete the file and re-create the override.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/components/HeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class HeadersView extends UI.View.SimpleView {
  readonly #headersViewComponent = new HeadersViewComponent();
  #uiSourceCode: Workspace.UISourceCode.UISourceCode;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super('HeadersView');
    this.#uiSourceCode = uiSourceCode;
    this.element.appendChild(this.#headersViewComponent);
    this.#headersViewComponent.data = {
      uiSourceCode: this.#uiSourceCode,
    };
  }

  commitEditing(): void {
    this.#uiSourceCode.commitWorkingCopy();
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().updateInterceptionPatterns();
  }
}

export interface HeadersViewComponentData {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
}

export class HeadersViewComponent extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-sources-headers-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #uiSourceCode: Workspace.UISourceCode.UISourceCode|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [HeadersViewStyles];
  }

  set data(data: HeadersViewComponentData) {
    this.#uiSourceCode = data.uiSourceCode;
    this.#render();
  }

  #render(): void {
    const fileName = this.#uiSourceCode?.name() || '.headers';
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="center-wrapper">
        <div class="centered">
          <div class="error-header">${i18nString(UIStrings.errorWhenParsing, {PH1: fileName})}</div>
          <div class="error-body">${i18nString(UIStrings.parsingErrorExplainer, {PH1: fileName})}</div>
        </div>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-sources-headers-view', HeadersViewComponent);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-sources-headers-view': HeadersViewComponent;
  }
}
