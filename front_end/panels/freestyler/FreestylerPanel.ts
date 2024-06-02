// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import {
  type ChatMessage,
  ChatMessageEntity,
  FreestylerChatUi,
  type Props as FreestylerChatUiProps,
  State as FreestylerChatUiState,
} from './components/FreestylerChatUi.js';
import {FreestylerAgent, type Step} from './FreestylerAgent.js';
import freestylerPanelStyles from './freestylerPanel.css.js';

const UIStrings = {
  /**
   *@description Freestyler UI text for clearing messages.
   */
  clearMessages: 'Clear messages',
  /**
   *@description Freestyler UI text for sending feedback.
   */
  sendFeedback: 'Send feedback',
};
const str_ = i18n.i18n.registerUIStrings('panels/freestyler/FreestylerPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type ViewInput = {
  onTextSubmit: (text: string) => void,
  onAcceptPrivacyNotice: () => void,
  state: FreestylerChatUiState,
  messages: ChatMessage[],
};

type ViewOutput = {};

type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

// TODO(ergunsh): Use the WidgetElement instead of separately creating the toolbar.
function createToolbar(target: HTMLElement, {onClearClick}: {onClearClick: () => void}): void {
  const toolbarContainer = target.createChild('div', 'freestyler-toolbar-container');
  const leftToolbar = new UI.Toolbar.Toolbar('', toolbarContainer);
  const rightToolbar = new UI.Toolbar.Toolbar('freestyler-right-toolbar', toolbarContainer);

  const clearButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearMessages), 'clear', undefined, 'freestyler.clear');
  clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, onClearClick);
  leftToolbar.appendToolbarItem(clearButton);

  rightToolbar.appendSeparator();
  const feedbackButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStrings.sendFeedback), 'bug', undefined, 'freestyler.feedback');
  const helpButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStrings.sendFeedback), 'help', undefined, 'freestyler.help');
  rightToolbar.appendToolbarItem(feedbackButton);
  rightToolbar.appendToolbarItem(helpButton);
}

function defaultView(input: ViewInput, output: ViewOutput, target: HTMLElement): void {
  // clang-format off
  LitHtml.render(LitHtml.html`
    <${FreestylerChatUi.litTagName} .props=${{
        onTextSubmit: input.onTextSubmit,
        onAcceptPrivacyNotice: input.onAcceptPrivacyNotice,
        state: input.state,
        messages: input.messages,
      } as FreestylerChatUiProps} >
    </${FreestylerChatUi.litTagName}>
  `, target, {host: input}); // eslint-disable-line rulesdir/lit_html_host_this
  // clang-format on
}

let freestylerPanelInstance: FreestylerPanel;
export class FreestylerPanel extends UI.Panel.Panel {
  #contentContainer: HTMLElement;
  #aidaClient: Host.AidaClient.AidaClient;
  #agent: FreestylerAgent;
  #viewProps: FreestylerChatUiProps;
  private constructor(private view: View = defaultView) {
    super('freestyler');

    createToolbar(this.contentElement, {onClearClick: this.#handleClearClick.bind(this)});
    this.#aidaClient = new Host.AidaClient.AidaClient();
    this.#contentContainer = this.contentElement.createChild('div', 'freestyler-chat-ui-container');
    this.#agent = new FreestylerAgent({aidaClient: this.#aidaClient});

    this.#viewProps = {
      state: FreestylerChatUiState.CONSENT_VIEW,
      messages: [],
      onTextSubmit: this.#handleTextSubmit.bind(this),
      onAcceptPrivacyNotice: this.#handleAcceptPrivacyNotice.bind(this),
    };
    this.doUpdate();
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): FreestylerPanel {
    const {forceNew} = opts;
    if (!freestylerPanelInstance || forceNew) {
      freestylerPanelInstance = new FreestylerPanel();
    }

    return freestylerPanelInstance;
  }

  override wasShown(): void {
    this.registerCSSFiles([freestylerPanelStyles]);
  }

  doUpdate(): void {
    this.view(this.#viewProps, this, this.#contentContainer);
  }

  // TODO(ergunsh): Handle cancelling agent run.
  #handleClearClick(): void {
    this.#viewProps.messages = [];
    this.#viewProps.state = FreestylerChatUiState.CHAT_VIEW;
    this.doUpdate();
  }

  async #handleTextSubmit(text: string): Promise<void> {
    this.#viewProps.messages.push({
      entity: ChatMessageEntity.USER,
      text,
    });
    this.#viewProps.state = FreestylerChatUiState.CHAT_VIEW_LOADING;
    this.doUpdate();

    const systemMessage = {
      entity: ChatMessageEntity.MODEL,
      text: '',
    };
    this.#viewProps.messages.push(systemMessage);

    await this.#agent.run(text, (step: Step, output: string) => {
      if (this.#viewProps.state === FreestylerChatUiState.CHAT_VIEW_LOADING) {
        this.#viewProps.state = FreestylerChatUiState.CHAT_VIEW;
      }
      // TODO(ergunsh): Better visualize.
      systemMessage.text += `\n${output}`;
      this.doUpdate();
    });
  }

  #handleAcceptPrivacyNotice(): void {
    this.#viewProps.state = FreestylerChatUiState.CHAT_VIEW;
    this.doUpdate();
  }
}
