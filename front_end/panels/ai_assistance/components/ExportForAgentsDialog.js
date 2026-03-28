// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../../ui/components/snackbars/snackbars.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import styles from './exportForAgentsDialog.css.js';
const { html, render } = Lit;
const UIStrings = {
    /**
     * @description Title for the export for agents dialog.
     */
    exportForAgents: 'Copy for your coding agent',
    /**
     * @description Button text for copying to clipboard.
     */
    copyToClipboard: 'Copy to clipboard',
    /**
     * @description Text displayed in a toast to indicate that the content was copied to the clipboard.
     */
    copiedToClipboard: 'Copied to clipboard',
    /**
     * @description Label for the 'as prompt' radio button in the export for agents dialog.
     */
    asPrompt: 'As prompt',
    /**
     * @description Label for the 'as markdown' radio button in the export for agents dialog.
     */
    asMarkdown: 'As markdown',
    /**
     * @description Button text for saving content as a markdown file.
     */
    saveAsMarkdown: 'Save as…',
    /**
     * @description Text displayed while the summary is being generated.
     */
    generatingSummary: 'Generating summary…',
    /**
     * @description Disclaimer text for the export for agents dialog.
     */
    disclaimer: 'This is an experimental AI feature and won’t always get it right. Double check this text before pasting into another tool.',
};
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/ExportForAgentsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const isPrompt = input.state.activeType === "prompt" /* StateType.PROMPT */;
    const buttonText = isPrompt ? i18nString(UIStrings.copyToClipboard) : i18nString(UIStrings.saveAsMarkdown);
    const exportText = isPrompt && input.state.isPromptLoading ?
        i18nString(UIStrings.generatingSummary) :
        (isPrompt ? input.state.promptText : input.state.conversationText);
    // clang-format off
    render(html `
    <style>${styles}</style>
    <div class="export-for-agents-dialog">
      <header>
        <h2 tabindex="-1">
          ${i18nString(UIStrings.exportForAgents)}
        </h2>
      </header>
      <div class="state-selection">
        <label>
          <input
            type="radio"
            value="prompt"
            name="export-state"
            .checked=${isPrompt}
            @change=${() => input.onStateChange("prompt" /* StateType.PROMPT */)}
          >
          ${i18nString(UIStrings.asPrompt)}
        </label>
        <label>
          <input
            type="radio"
            value="conversation"
            name="export-state"
            .checked=${!isPrompt}
            @change=${() => input.onStateChange("conversation" /* StateType.CONVERSATION */)}
          >
          ${i18nString(UIStrings.asMarkdown)}
        </label>
      </div>
      <main>
        <textarea readonly .value=${exportText}></textarea>
      </main>
      ${isPrompt ? html `<div class="disclaimer">${i18nString(UIStrings.disclaimer)}</div>` : Lit.nothing}
      <footer>
        <div class="right-buttons">
          <devtools-button
            @click=${input.onButtonClick}
            .jslogContext=${input.jslogContext}
            .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
            .disabled=${isPrompt && input.state.isPromptLoading}
          >
            ${buttonText}
          </devtools-button>
        </div>
      </footer>
    </div>
  `, target);
    // clang-format on
};
export class ExportForAgentsDialog extends UI.Widget.VBox {
    #view;
    #dialog;
    #state;
    #onConversationSaveAs;
    constructor(options, view = DEFAULT_VIEW) {
        super();
        this.#dialog = options.dialog;
        this.#state = {
            activeType: "prompt" /* StateType.PROMPT */,
            promptText: typeof options.promptText === 'string' ? options.promptText : '',
            conversationText: options.markdownText,
            isPromptLoading: typeof options.promptText !== 'string',
        };
        this.#onConversationSaveAs = options.onConversationSaveAs;
        this.#view = view;
        if (options.promptText instanceof Promise) {
            void options.promptText.then(promptText => {
                this.#state.promptText = promptText;
                this.#state.isPromptLoading = false;
                this.requestUpdate();
            });
        }
        this.requestUpdate();
    }
    #onStateChange = (newState) => {
        this.#state.activeType = newState;
        this.requestUpdate();
    };
    performUpdate() {
        let onButtonClick;
        let jslogContext = '';
        switch (this.#state.activeType) {
            case "prompt" /* StateType.PROMPT */:
                jslogContext = 'ai-export-for-agents.copy-to-clipboard';
                onButtonClick = (event) => {
                    event.preventDefault();
                    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#state.promptText);
                    Snackbars.Snackbar.Snackbar.show({
                        message: i18nString(UIStrings.copiedToClipboard),
                    });
                    this.#dialog.hide();
                };
                break;
            case "conversation" /* StateType.CONVERSATION */:
                jslogContext = 'ai-export-for-agents.save-as-markdown';
                onButtonClick = () => {
                    this.#dialog.hide();
                    this.#onConversationSaveAs();
                };
                break;
        }
        const viewInput = {
            onButtonClick,
            state: this.#state,
            onStateChange: this.#onStateChange,
            jslogContext,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    static show({ promptText, markdownText, onConversationSaveAs, }) {
        const dialog = new UI.Dialog.Dialog();
        dialog.setAriaLabel(i18nString(UIStrings.exportForAgents));
        dialog.setOutsideClickCallback(ev => {
            ev.consume(true);
            dialog.hide();
        });
        dialog.addCloseButton();
        dialog.setSizeBehavior("MeasureContent" /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */);
        dialog.setDimmed(true);
        const exportDialog = new ExportForAgentsDialog({ dialog, promptText, markdownText, onConversationSaveAs });
        exportDialog.show(dialog.contentElement);
        // Because the Dialog sets its height based off its content, we need
        // the Export Dialog widget to have rendered fully before we show
        // the dialog with its contents.
        void exportDialog.updateComplete.then(() => {
            dialog.show();
        });
    }
}
//# sourceMappingURL=ExportForAgentsDialog.js.map