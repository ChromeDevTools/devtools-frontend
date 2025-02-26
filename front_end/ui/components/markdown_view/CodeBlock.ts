// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/legacy.js'; // for x-link

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../../ui/components/text_editor/text_editor.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import stylesRaw from './codeBlock.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const styles = new CSSStyleSheet();
styles.replaceSync(stylesRaw.cssContent);

const {html} = Lit;

const UIStrings = {
  /**
   * @description The header text if not present and language is not set.
   */
  code: 'Code',
  /**
   * @description The title of the button to copy the codeblock from a Markdown view.
   */
  copy: 'Copy code',
  /**
   * @description The title of the button after it was pressed and the text was copied to clipboard.
   */
  copied: 'Copied to clipboard',
  /**
   * @description Disclaimer shown in the code blocks.
   */
  disclaimer: 'Use code snippets with caution',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/components/markdown_view/CodeBlock.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CodeBlock extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});

  #code = '';
  #codeLang = '';
  #copyTimeout = 1000;
  #timer?: ReturnType<typeof setTimeout>;
  #copied = false;
  #editorState?: CodeMirror.EditorState;
  #languageConf = new CodeMirror.Compartment();
  /**
   * Whether to display a notice "​​Use code snippets with caution" in code
   * blocks.
   */
  #displayNotice = false;
  #header?: string;
  #showCopyButton = true;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
    this.#render();
  }

  set code(value: string) {
    this.#code = value;
    this.#editorState = CodeMirror.EditorState.create({
      doc: this.#code,
      extensions: [
        TextEditor.Config.baseConfiguration(this.#code),
        CodeMirror.EditorState.readOnly.of(true),
        CodeMirror.EditorView.lineWrapping,
        this.#languageConf.of(CodeMirror.javascript.javascript()),
      ],
    });
    this.#render();
  }

  get code(): string {
    return this.#code;
  }

  set codeLang(value: string) {
    this.#codeLang = value;
    this.#render();
  }

  set timeout(value: number) {
    this.#copyTimeout = value;
    this.#render();
  }

  set displayNotice(value: boolean) {
    this.#displayNotice = value;
    this.#render();
  }

  set header(header: string) {
    this.#header = header;
    this.#render();
  }

  set showCopyButton(show: boolean) {
    this.#showCopyButton = show;
    this.#render();
  }

  #onCopy(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#code);
    this.#copied = true;
    this.#render();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#copied = false;
      this.#render();
    }, this.#copyTimeout);
  }

  #renderNotice(): Lit.TemplateResult {
    // clang-format off
    return html`<p class="notice">
      <x-link class="link" href="https://support.google.com/legal/answer/13505487" jslog=${
        VisualLogging.link('code-disclaimer').track({
          click: true,
        })}>
        ${i18nString(UIStrings.disclaimer)}
      </x-link>
    </p>`;
    // clang-format on
  }

  #renderCopyButton(): Lit.LitTemplate {
    // clang-format off
    return html`
      <div class="copy-button-container">
        <devtools-button
          .data=${
            {
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              jslogContext: 'copy',
              iconName: 'copy',
              title: i18nString(UIStrings.copy),
            } as Buttons.Button.ButtonData
          }
          @click=${this.#onCopy}
        ></devtools-button>
        ${this.#copied ? html`<span>${i18nString(UIStrings.copied)}</span>` : Lit.nothing}
      </div>`;
    // clang-format on
  }

  #renderTextEditor(): Lit.TemplateResult {
    if (!this.#editorState) {
      throw new Error('Unexpected: trying to render the text editor without editorState');
    }
    // clang-format off
    return html`
      <div class="code">
        <devtools-text-editor .state=${this.#editorState}></devtools-text-editor>
      </div>
    `;
    // clang-format on
  }

  #render(): void {
    const header = (this.#header ?? this.#codeLang) || i18nString(UIStrings.code);

    // clang-format off
    Lit.render(
      html`<div class='codeblock' jslog=${VisualLogging.section('code')}>
      <div class="editor-wrapper">
        <div class="heading">
          <h4 class="heading-text">${header}</h4>
          ${this.#showCopyButton ? this.#renderCopyButton() : Lit.nothing}
        </div>
        ${this.#renderTextEditor()}
      </div>
      ${this.#displayNotice ? this.#renderNotice() : Lit.nothing}
    </div>`,
      this.#shadow,
      {
        host: this,
      },
    );
    // clang-format on

    const editor = this.#shadow?.querySelector('devtools-text-editor')?.editor;

    if (!editor) {
      return;
    }
    let language = CodeMirror.html.html({autoCloseTags: false, selfClosingTags: true});
    switch (this.#codeLang) {
      case 'js':
        language = CodeMirror.javascript.javascript();
        break;
      case 'ts':
        language = CodeMirror.javascript.javascript({typescript: true});
        break;
      case 'jsx':
        language = CodeMirror.javascript.javascript({jsx: true});
        break;
      case 'css':
        language = CodeMirror.css.css();
        break;
    }
    editor.dispatch({
      effects: this.#languageConf.reconfigure(language),
    });
  }
}

customElements.define('devtools-code-block', CodeBlock);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-code-block': CodeBlock;
  }
}
