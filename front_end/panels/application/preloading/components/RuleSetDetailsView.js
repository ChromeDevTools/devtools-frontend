// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../../core/i18n/i18n.js';
import { assertNotNullOrUndefined } from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Formatter from '../../../../models/formatter/formatter.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as CodeHighlighter from '../../../../ui/components/code_highlighter/code_highlighter.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as TextEditor from '../../../../ui/components/text_editor/text_editor.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import ruleSetDetailsViewStyles from './RuleSetDetailsView.css.js';
const { html } = Lit;
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
export class RuleSetDetailsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #shadow = this.attachShadow({ mode: 'open' });
    #data = null;
    #shouldPrettyPrint = true;
    #editorState;
    set data(data) {
        this.#data = data;
        void this.#render();
    }
    set shouldPrettyPrint(shouldPrettyPrint) {
        this.#shouldPrettyPrint = shouldPrettyPrint;
    }
    async #render() {
        await RenderCoordinator.write('RuleSetDetailsView render', async () => {
            if (this.#data === null) {
                Lit.render(html `
          <style>${ruleSetDetailsViewStyles}</style>
          <style>${UI.inspectorCommonStyles}</style>
          <div class="placeholder">
            <div class="empty-state">
              <span class="empty-state-header">${i18nString(UIStrings.noElementSelected)}</span>
              <span class="empty-state-description">${i18nString(UIStrings.selectAnElementForMoreDetails)}</span>
            </div>
          </div>
      `, this.#shadow, { host: this });
                // clang-format on
                return;
            }
            const sourceText = await this.#getSourceText();
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            Lit.render(html `
        <style>${ruleSetDetailsViewStyles}</style>
        <style>${UI.inspectorCommonStyles}</style>
        <div class="content">
          <div class="ruleset-header" id="ruleset-url">${this.#data?.url || SDK.TargetManager.TargetManager.instance().inspectedURL()}</div>
          ${this.#maybeError()}
        </div>
        <div class="text-ellipsis">
          ${this.#renderSource(sourceText)}
        </div>
      `, this.#shadow, { host: this });
            // clang-format on
        });
    }
    // TODO(https://crbug.com/1425354): Support i18n.
    #maybeError() {
        assertNotNullOrUndefined(this.#data);
        if (this.#data.errorMessage === undefined) {
            return Lit.nothing;
        }
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <div class="ruleset-header">
        <devtools-icon name="cross-circle" class="medium">
        </devtools-icon>
        <span id="error-message-text">${this.#data.errorMessage}</span>
      </div>
    `;
        // clang-format on
    }
    #renderSource(sourceText) {
        this.#editorState = CodeMirror.EditorState.create({
            doc: sourceText,
            extensions: [
                TextEditor.Config.baseConfiguration(sourceText || ''),
                CodeMirror.lineNumbers(),
                CodeMirror.EditorState.readOnly.of(true),
                codeMirrorJsonType,
                CodeMirror.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
            ],
        });
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        // TODO(https://crbug.com/1425354): Add Raw button.
        return html `
      <devtools-text-editor .style.flexGrow=${'1'} .state=${this.#editorState}></devtools-text-editor>
    `;
        // clang-format on
    }
    async #getSourceText() {
        if (this.#shouldPrettyPrint && this.#data?.sourceText !== undefined) {
            const formattedResult = await Formatter.ScriptFormatter.formatScriptContent('application/json', this.#data.sourceText);
            return formattedResult.formattedContent;
        }
        return this.#data?.sourceText || '';
    }
}
customElements.define('devtools-resources-rulesets-details-view', RuleSetDetailsView);
//# sourceMappingURL=RuleSetDetailsView.js.map