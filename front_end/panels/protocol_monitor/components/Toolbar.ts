// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../recorder/components/components.js';

import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import editorWidgetStyles from './JSONEditor.css.js';
import toolbarStyles from './toolbar.css.js';

const {html, Decorators, LitElement} = LitHtml;
const {customElement} = Decorators;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-pm-toolbar': Toolbar;
  }
}

const copyIconUrl = new URL('../../../Images/copy.svg', import.meta.url).toString();
const sendIconUrl = new URL('../../../Images/send.svg', import.meta.url).toString();

@customElement('devtools-pm-toolbar')
export class Toolbar extends LitElement {
  static override styles = [toolbarStyles, editorWidgetStyles];

  #handleCopy = (): void => {
    this.dispatchEvent(new CustomEvent('copycommand', {bubbles: true}));
  };

  #handleSend = (): void => {
    this.dispatchEvent(new CustomEvent('commandsent', {bubbles: true}));
  };

  override render(): LitHtml.TemplateResult {
    // clang-format off
    return html`
        <div class="toolbar">
          <${Buttons.Button.Button.litTagName}
          .size=${Buttons.Button.Size.MEDIUM}
          .iconUrl=${copyIconUrl}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${this.#handleCopy}
        ></${Buttons.Button.Button.litTagName}>
        <${Buttons.Button.Button.litTagName}
          .size=${Buttons.Button.Size.SMALL}
          .iconUrl=${sendIconUrl}
          .variant=${Buttons.Button.Variant.PRIMARY_TOOLBAR}
          @click=${this.#handleSend}
        ></${Buttons.Button.Button.litTagName}>
      </div>
    `;
    // clang-format on
  }
}
