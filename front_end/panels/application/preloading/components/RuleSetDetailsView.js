// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Formatter from '../../../../models/formatter/formatter.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as CodeHighlighter from '../../../../ui/components/code_highlighter/code_highlighter.js';
import * as TextEditor from '../../../../ui/components/text_editor/text_editor.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../../ui/lit/lit.js';
import ruleSetDetailsViewStyles from './RuleSetDetailsView.css.js';
const UIStrings = {
    /**
     * @description Text in RuleSetDetailsView of the Application panel if no element is selected. An element here is an item in a
     *             table of speculation rules. Speculation rules define the rules when and which urls should be prefetched.
     *             https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
     */
    noElementSelected: 'No element selected',
    /**
     * @description Text in RuleSetDetailsView of the Application panel if no element is selected. An element here is an item in a
     *             table of speculation rules. Speculation rules define the rules when and which urls should be prefetched.
     *             https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
     */
    selectAnElementForMoreDetails: 'Select an element for more details',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/RuleSetDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const codeMirrorJsonType = await CodeHighlighter.CodeHighlighter.languageFromMIME('application/json');
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${ruleSetDetailsViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    ${input
        ? html `
        <div class="content">
          <div class="ruleset-header" id="ruleset-url">${input.url}</div>
          ${input.errorMessage ? html `
            <div class="ruleset-header">
              <devtools-icon name="cross-circle" class="medium">
              </devtools-icon>
              <span id="error-message-text">${input.errorMessage}</span>
            </div>
          ` : nothing}
        </div>
        <div class="text-ellipsis">
          <devtools-text-editor .style.flexGrow=${'1'} .state=${input.editorState}></devtools-text-editor>
        </div>`
        : html `
          <div class="placeholder">
            <div class="empty-state">
              <span class="empty-state-header">${i18nString(UIStrings.noElementSelected)}</span>
              <span class="empty-state-description">${i18nString(UIStrings.selectAnElementForMoreDetails)}</span>
            </div>
          </div>`}
    `, target);
    // clang-format on
};
export class RuleSetDetailsView extends UI.Widget.VBox {
    #view;
    #ruleSet = null;
    #shouldPrettyPrint = true;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    set ruleSet(ruleSet) {
        this.#ruleSet = ruleSet;
        this.requestUpdate();
    }
    set shouldPrettyPrint(shouldPrettyPrint) {
        this.#shouldPrettyPrint = shouldPrettyPrint;
        this.requestUpdate();
    }
    async performUpdate() {
        if (!this.#ruleSet) {
            this.#view(null, {}, this.contentElement);
            return;
        }
        const sourceText = await this.#getSourceText();
        const editorState = CodeMirror.EditorState.create({
            doc: sourceText,
            extensions: [
                TextEditor.Config.baseConfiguration(sourceText),
                CodeMirror.lineNumbers(),
                CodeMirror.EditorState.readOnly.of(true),
                codeMirrorJsonType,
                CodeMirror.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
            ],
        });
        this.#view({
            url: this.#ruleSet.url || SDK.TargetManager.TargetManager.instance().inspectedURL(),
            errorMessage: this.#ruleSet.errorMessage,
            editorState,
            sourceText,
        }, {}, this.contentElement);
    }
    async #getSourceText() {
        if (this.#shouldPrettyPrint && this.#ruleSet?.sourceText !== undefined) {
            const formattedResult = await Formatter.ScriptFormatter.formatScriptContent('application/json', this.#ruleSet.sourceText);
            return formattedResult.formattedContent;
        }
        return this.#ruleSet?.sourceText || '';
    }
}
//# sourceMappingURL=RuleSetDetailsView.js.map