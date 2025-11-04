// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/legacy/legacy.js'; // for x-link
import * as i18n from '../../../core/i18n/i18n.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../../ui/components/text_editor/text_editor.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import styles from './codeBlock.css.js';
const { html } = Lit;
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
};
const str_ = i18n.i18n.registerUIStrings('ui/components/markdown_view/CodeBlock.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export async function languageFromToken(lang) {
    switch (lang) {
        case 'javascript':
        case 'js':
        case 'jsx':
            // We intentionally allow JSX in normal .js as well as .jsx files,
            // because there are simply too many existing applications and
            // examples out there that use JSX within .js files, and we don't
            // want to break them.
            return CodeMirror.javascript.javascript({ jsx: true });
        case 'typescript':
        case 'ts':
            return CodeMirror.javascript.javascript({ typescript: true });
        case 'tsx':
            return CodeMirror.javascript.javascript({ typescript: true, jsx: true });
        case 'less':
        case 'scss':
        case 'sass':
        case 'css':
            return CodeMirror.css.css();
        case 'html':
            return CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true });
        case 'xml':
            return (await CodeMirror.xml()).xml();
        case 'cpp':
            return (await CodeMirror.cpp()).cpp();
        case 'go':
            return new CodeMirror.LanguageSupport(await CodeMirror.go());
        case 'java':
            return (await CodeMirror.java()).java();
        case 'kotlin':
            return new CodeMirror.LanguageSupport(await CodeMirror.kotlin());
        case 'json': {
            const jsonLanguage = CodeMirror.javascript.javascriptLanguage.configure({ top: 'SingleExpression' });
            return new CodeMirror.LanguageSupport(jsonLanguage);
        }
        case 'php':
            return (await CodeMirror.php()).php();
        case 'python':
        case 'py':
            return (await CodeMirror.python()).python();
        case 'markdown':
        case 'md':
            return (await CodeMirror.markdown()).markdown();
        case 'sh':
        case 'bash':
            return new CodeMirror.LanguageSupport(await CodeMirror.shell());
        case 'dart':
            return new CodeMirror.LanguageSupport(await CodeMirror.dart());
        case 'angular':
            return (await CodeMirror.angular()).angular();
        case 'svelte':
            return (await CodeMirror.svelte()).svelte();
        case 'vue':
            return (await CodeMirror.vue()).vue();
        default:
            return CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true });
    }
}
export class CodeBlock extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #code = '';
    #codeLang = '';
    #copyTimeout = 1000;
    #timer;
    #copied = false;
    #editorState;
    #languageConf = new CodeMirror.Compartment();
    /**
     * Whether to display a notice "​​Use code snippets with caution" in code
     * blocks.
     */
    #displayNotice = false;
    #header;
    #showCopyButton = true;
    #citations = [];
    connectedCallback() {
        void this.#render();
    }
    set code(value) {
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
        void this.#render();
    }
    get code() {
        return this.#code;
    }
    set codeLang(value) {
        this.#codeLang = value;
        void this.#render();
    }
    set timeout(value) {
        this.#copyTimeout = value;
        void this.#render();
    }
    set displayNotice(value) {
        this.#displayNotice = value;
        void this.#render();
    }
    set header(header) {
        this.#header = header;
        void this.#render();
    }
    set showCopyButton(show) {
        this.#showCopyButton = show;
        void this.#render();
    }
    set citations(citations) {
        this.#citations = citations;
    }
    #onCopy() {
        UI.UIUtils.copyTextToClipboard(this.#code, i18nString(UIStrings.copied));
        this.#copied = true;
        void this.#render();
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => {
            this.#copied = false;
            void this.#render();
        }, this.#copyTimeout);
    }
    #renderNotice() {
        // clang-format off
        return html `<p class="notice">
      <x-link class="link" href="https://support.google.com/legal/answer/13505487" jslog=${VisualLogging.link('code-disclaimer').track({
            click: true,
        })}>
        ${i18nString(UIStrings.disclaimer)}
      </x-link>
    </p>`;
        // clang-format on
    }
    #renderCopyButton() {
        // clang-format off
        return html `
      <div class="copy-button-container">
        <devtools-button
          .data=${{
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
            jslogContext: 'copy',
            iconName: 'copy',
            title: i18nString(UIStrings.copy),
        }}
          @click=${this.#onCopy}
        ></devtools-button>
        ${this.#copied ? html `<span>${i18nString(UIStrings.copied)}</span>` : Lit.nothing}
      </div>`;
        // clang-format on
    }
    #maybeRenderCitations() {
        if (!this.#citations.length) {
            return Lit.nothing;
        }
        // clang-format off
        return html `
      ${this.#citations.map(citation => html `
        <button
          class="citation"
          jslog=${VisualLogging.link('inline-citation').track({ click: true })}
          @click=${citation.clickHandler}
        >[${citation.index}]</button>
      `)}
    `;
        // clang-format on
    }
    async #render() {
        const header = (this.#header ?? this.#codeLang) || i18nString(UIStrings.code);
        if (!this.#editorState) {
            throw new Error('Unexpected: trying to render the text editor without editorState');
        }
        // clang-format off
        Lit.render(html `<div class='codeblock' jslog=${VisualLogging.section('code')}>
      <style>${styles}</style>
        <div class="editor-wrapper">
        <div class="heading">
          <div class="heading-text-wrapper">
            <h4 class="heading-text">${header}</h4>
            ${this.#maybeRenderCitations()}
          </div>
          ${this.#showCopyButton ? this.#renderCopyButton() : Lit.nothing}
        </div>
        <div class="code">
          <devtools-text-editor .state=${this.#editorState}></devtools-text-editor>
        </div>
      </div>
      ${this.#displayNotice ? this.#renderNotice() : Lit.nothing}
    </div>`, this.#shadow, {
            host: this,
        });
        // clang-format on
        const editor = this.#shadow?.querySelector('devtools-text-editor')?.editor;
        if (!editor) {
            return;
        }
        const language = await languageFromToken(this.#codeLang);
        editor.dispatch({
            effects: this.#languageConf.reconfigure(language),
        });
    }
}
customElements.define('devtools-code-block', CodeBlock);
//# sourceMappingURL=CodeBlock.js.map