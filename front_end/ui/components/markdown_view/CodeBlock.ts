// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/legacy.js'; // for x-link

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../../ui/components/text_editor/text_editor.js';
import * as IconButton from '../../components/icon_button/icon_button.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import styles from './codeBlock.css.js';

const UIStrings = {
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
};
const str_ = i18n.i18n.registerUIStrings('ui/components/markdown_view/CodeBlock.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CodeBlock extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-code-block`;

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

  #render(): void {
    const copyButtonClasses = LitHtml.Directives.classMap({
      copied: this.#copied,
      'copy-button': true,
    });
    // clang-format off
    LitHtml.render(LitHtml.html`<div class="codeblock">
      <div class="toolbar">
        <div class="lang">${this.#codeLang}</div>
        <div class="copy">
          <button class=${copyButtonClasses}
            title=${i18nString(UIStrings.copy)}
            @click=${this.#onCopy}>
            <${IconButton.Icon.Icon.litTagName}
              .data=${{
                iconName: 'copy',
                width: '16px',
                height: '16px',
                color: 'var(--copy-icon-color, var(--icon-default))',
              } as IconButton.Icon.IconData}
            >
            </${IconButton.Icon.Icon.litTagName}>
            <span>${this.#copied ?
              i18nString(UIStrings.copied) :
              i18nString(UIStrings.copy)}</span>
          </button>
        </div>
      </div>
      <div class="editor-wrapper">
        <${TextEditor.TextEditor.TextEditor.litTagName} .state=${
          this.#editorState
        }></${TextEditor.TextEditor.TextEditor.litTagName}>
        ${this.#displayNotice ? LitHtml.html`<p class="notice">
          <x-link class="link" href="https://support.google.com/legal/answer/13505487">${i18nString(UIStrings.disclaimer)}</x-link>
        </p>` : LitHtml.nothing}
      </div>
    </div>`, this.#shadow, {
      host: this,
    });
    // clang-format on

    const editor = this.#shadow?.querySelector('devtools-text-editor')?.editor;

    if (!editor) {
      return;
    }
    let language = CodeMirror.html.html();
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
