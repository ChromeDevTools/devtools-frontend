// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/spinners/spinners.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../../ui/components/snackbars/snackbars.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import styles from './exportForAgentsDialog.css.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Title for the export for agents dialog.
   */
  exportForAgents: 'Copy to coding agent',
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
  disclaimer:
      'This is an experimental AI feature and won’t always get it right. Double check this text before pasting into another tool.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/ExportForAgentsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum StateType {
  PROMPT = 'prompt',
  CONVERSATION = 'conversation',
}

export interface State {
  activeType: StateType;
  promptText: string;
  conversationText: string;
  isPromptLoading: boolean;
}

interface ViewInput {
  onButtonClick: (event: Event) => void;
  state: State;
  onStateChange: (stateType: StateType) => void;
  jslogContext: string;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target): void => {
  const isPrompt = input.state.activeType === StateType.PROMPT;
  const buttonText = isPrompt ? i18nString(UIStrings.copyToClipboard) : i18nString(UIStrings.saveAsMarkdown);
  const exportText = isPrompt && input.state.isPromptLoading ?
      i18nString(UIStrings.generatingSummary) :
      (isPrompt ? input.state.promptText : input.state.conversationText);
  // clang-format off

  render(html`
    <style>${styles}</style>
    <div class="export-for-agents-dialog">
      <header>
        <h1 id="export-for-agents-dialog-title" tabindex="-1">
          ${i18nString(UIStrings.exportForAgents)}
        </h1>
      </header>
      <div class="state-selection" role="radiogroup" aria-labelledby="export-for-agents-dialog-title">
        <label>
          <input
            type="radio"
            value="prompt"
            name="export-state"
            .checked=${isPrompt}
            aria-label=${i18nString(UIStrings.asPrompt)}
            @change=${() => input.onStateChange(StateType.PROMPT)}
          >
          ${i18nString(UIStrings.asPrompt)}
        </label>
        <label>
          <input
            type="radio"
            value="conversation"
            name="export-state"
            .checked=${!isPrompt}
            aria-label=${i18nString(UIStrings.asMarkdown)}
            @change=${() => input.onStateChange(StateType.CONVERSATION)}
          >
          ${i18nString(UIStrings.asMarkdown)}
        </label>
      </div>
      <main>
        ${input.state.isPromptLoading ? html`
          <span class="prompt-loading">
            <devtools-spinner></devtools-spinner>
            ${i18nString(UIStrings.generatingSummary)}
          </span>
          ` : Lit.nothing}
        <textarea readonly .value=${input.state.isPromptLoading ? '' : exportText}></textarea>
      </main>
      <div class="disclaimer">${i18nString(UIStrings.disclaimer)}</div>
      <footer>
        <div class="right-buttons">
          <devtools-button
            @click=${input.onButtonClick}
            .jslogContext=${input.jslogContext}
            .variant=${Buttons.Button.Variant.PRIMARY}
            .disabled=${isPrompt && input.state.isPromptLoading}
            .accessibleLabel=${buttonText}
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
  readonly #view: View;
  readonly #dialog: UI.Dialog.Dialog;
  #state: State;
  #onConversationSaveAs: () => void;

  constructor(
      options: {
        dialog: UI.Dialog.Dialog,
        promptText: string|Promise<string>,
        markdownText: string,
        onConversationSaveAs: () => void,
      },
      view: View = DEFAULT_VIEW) {
    super();
    this.#dialog = options.dialog;
    this.#state = {
      activeType: StateType.PROMPT,
      promptText: typeof options.promptText === 'string' ? options.promptText : '',
      conversationText: options.markdownText,
      isPromptLoading: typeof options.promptText !== 'string',
    };
    this.#onConversationSaveAs = options.onConversationSaveAs;
    this.#view = view;

    if (typeof options.promptText !== 'string') {
      void options.promptText.then(promptText => {
        this.#state.promptText = promptText;
        this.#state.isPromptLoading = false;
        this.requestUpdate();
      });
    }

    this.requestUpdate();
  }

  #onStateChange = (newState: StateType): void => {
    this.#state.activeType = newState;
    this.requestUpdate();
  };

  override performUpdate(): void {
    let onButtonClick: (event: Event) => void;
    let jslogContext = '';

    switch (this.#state.activeType) {
      case StateType.PROMPT:
        jslogContext = 'ai-export-for-agents.copy-to-clipboard';
        onButtonClick = (event: Event): void => {
          event.preventDefault();
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#state.promptText);
          const snackbar = Snackbars.Snackbar.Snackbar.show({
            message: i18nString(UIStrings.copiedToClipboard),
          });
          snackbar.setAttribute('aria-label', i18nString(UIStrings.copiedToClipboard));
          this.#dialog.hide();
        };
        break;
      case StateType.CONVERSATION:
        jslogContext = 'ai-export-for-agents.save-as-markdown';
        onButtonClick = (): void => {
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

  static show({
    promptText,
    markdownText,
    onConversationSaveAs,
  }: {
    promptText: string|Promise<string>,
    markdownText: string,
    onConversationSaveAs: () => void,
  }): void {
    const dialog = new UI.Dialog.Dialog();
    dialog.setAriaLabel(i18nString(UIStrings.exportForAgents));

    dialog.setOutsideClickCallback(ev => {
      ev.consume(true);
      dialog.hide();
    });

    dialog.addCloseButton();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    dialog.setDimmed(true);

    const exportDialog = new ExportForAgentsDialog({dialog, promptText, markdownText, onConversationSaveAs});
    exportDialog.show(dialog.contentElement);
    // Because the Dialog sets its height based off its content, we need
    // the Export Dialog widget to have rendered fully before we show
    // the dialog with its contents.
    void exportDialog.updateComplete.then(() => {
      dialog.show();
    });
  }
}
