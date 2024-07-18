// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import {
  ChatMessageEntity,
  DOGFOOD_INFO,
  FreestylerChatUi,
  type ModelChatMessage,
  type Props as FreestylerChatUiProps,
  State as FreestylerChatUiState,
} from './components/FreestylerChatUi.js';
import {FIX_THIS_ISSUE_PROMPT, FreestylerAgent, Step} from './FreestylerAgent.js';
import freestylerPanelStyles from './freestylerPanel.css.js';

/*
  * TODO(nvitkov): b/346933425
  * Temporary string that should not be translated
  * as they may change often during development.
  */
const UIStringsTemp = {
  /**
   *@description Freestyler UI text for clearing messages.
   */
  clearMessages: 'Clear messages',
  /**
   *@description Freestyler UI text for sending feedback.
   */
  sendFeedback: 'Send feedback',
  /**
   *@description Displayed when the user stop the response
   */
  stoppedResponse: 'You stopped this response',
};

// TODO(nvitkov): b/346933425
// const str_ = i18n.i18n.registerUIStrings('panels/freestyler/FreestylerPanel.ts', UIStrings);
// const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/* eslint-disable  rulesdir/l10n_i18nString_call_only_with_uistrings */
const i18nString = i18n.i18n.lockedString;

type ViewOutput = {
  freestylerChatUi?: FreestylerChatUi,
};
type View = (input: FreestylerChatUiProps, output: ViewOutput, target: HTMLElement) => void;

// TODO(ergunsh): Use the WidgetElement instead of separately creating the toolbar.
function createToolbar(target: HTMLElement, {onClearClick}: {onClearClick: () => void}): void {
  const toolbarContainer = target.createChild('div', 'freestyler-toolbar-container');
  const leftToolbar = new UI.Toolbar.Toolbar('', toolbarContainer);
  const rightToolbar = new UI.Toolbar.Toolbar('freestyler-right-toolbar', toolbarContainer);

  const clearButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStringsTemp.clearMessages), 'clear', undefined, 'freestyler.clear');
  clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, onClearClick);
  leftToolbar.appendToolbarItem(clearButton);

  rightToolbar.appendSeparator();
  const helpButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStringsTemp.sendFeedback), 'help', undefined, 'freestyler.feedback');
  helpButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(DOGFOOD_INFO);
  });
  rightToolbar.appendToolbarItem(helpButton);
}

function defaultView(input: FreestylerChatUiProps, output: ViewOutput, target: HTMLElement): void {
  // clang-format off
  LitHtml.render(LitHtml.html`
    <${FreestylerChatUi.litTagName} .props=${input} ${LitHtml.Directives.ref((el: Element|undefined) => {
      if (!el || !(el instanceof FreestylerChatUi)) {
        return;
      }

      output.freestylerChatUi = el;
    })}></${FreestylerChatUi.litTagName}>
  `, target, {host: input}); // eslint-disable-line rulesdir/lit_html_host_this
  // clang-format on
}

let freestylerPanelInstance: FreestylerPanel;
export class FreestylerPanel extends UI.Panel.Panel {
  static panelName = 'freestyler';

  #toggleSearchElementAction: UI.ActionRegistration.Action;
  #selectedNode: SDK.DOMModel.DOMNode|null;
  #contentContainer: HTMLElement;
  #aidaClient: Host.AidaClient.AidaClient;
  #agent: FreestylerAgent;
  #viewProps: FreestylerChatUiProps;
  #viewOutput: ViewOutput = {};
  #serverSideLoggingEnabled = isFreestylerServerSideLoggingEnabled();
  #consentViewAcceptedSetting =
      Common.Settings.Settings.instance().createLocalSetting('freestyler-dogfood-consent-onboarding-finished', false);
  constructor(private view: View = defaultView, {aidaClient, aidaAvailability}: {
    aidaClient: Host.AidaClient.AidaClient,
    aidaAvailability: Host.AidaClient.AidaAvailability,
  }) {
    super(FreestylerPanel.panelName);

    createToolbar(this.contentElement, {onClearClick: this.#clearMessages.bind(this)});
    this.#toggleSearchElementAction =
        UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    this.#aidaClient = aidaClient;
    this.#contentContainer = this.contentElement.createChild('div', 'freestyler-chat-ui-container');

    this.#selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    this.#viewProps = {
      state: this.#consentViewAcceptedSetting.get() ? FreestylerChatUiState.CHAT_VIEW :
                                                      FreestylerChatUiState.CONSENT_VIEW,
      aidaAvailability,
      messages: [],
      inspectElementToggled: this.#toggleSearchElementAction.toggled(),
      selectedNode: this.#selectedNode,
      isLoading: false,
      onTextSubmit: this.#startConversation.bind(this),
      onInspectElementClick: this.#handleSelectElementClick.bind(this),
      onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
      onAcceptConsentClick: this.#handleAcceptConsentClick.bind(this),
      onCancelClick: this.#cancel.bind(this),
      onFixThisIssueClick: () => {
        void this.#startConversation(FIX_THIS_ISSUE_PROMPT, true);
      },
    };
    this.#toggleSearchElementAction.addEventListener(UI.ActionRegistration.Events.Toggled, ev => {
      this.#viewProps.inspectElementToggled = ev.data;
      this.doUpdate();
    });
    this.#agent = this.#createAgent();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, ev => {
      if (this.#viewProps.selectedNode === ev.data) {
        return;
      }

      this.#viewProps.selectedNode = ev.data;
      this.doUpdate();
    });
    this.doUpdate();
  }

  #createAgent(): FreestylerAgent {
    return new FreestylerAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
      confirmSideEffect: this.showConfirmSideEffectUi.bind(this),
    });
  }

  static async instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): Promise<FreestylerPanel> {
    const {forceNew} = opts;
    if (!freestylerPanelInstance || forceNew) {
      const aidaAvailability = await Host.AidaClient.AidaClient.getAidaClientAvailability();
      const aidaClient = new Host.AidaClient.AidaClient();
      freestylerPanelInstance = new FreestylerPanel(defaultView, {aidaClient, aidaAvailability});
    }

    return freestylerPanelInstance;
  }

  override wasShown(): void {
    this.registerCSSFiles([freestylerPanelStyles]);
    this.#viewOutput.freestylerChatUi?.focusTextInput();
  }

  doUpdate(): void {
    this.view(this.#viewProps, this.#viewOutput, this.#contentContainer);
  }

  async showConfirmSideEffectUi(action: string): Promise<boolean> {
    const sideEffectConfirmationPromiseWithResolvers = Platform.PromiseUtilities.promiseWithResolvers<boolean>();
    this.#viewProps.confirmSideEffectDialog = {
      code: action,
      onAnswer: (answer: boolean) => sideEffectConfirmationPromiseWithResolvers.resolve(answer),
    };
    this.doUpdate();

    const result = await sideEffectConfirmationPromiseWithResolvers.promise;
    this.#viewProps.confirmSideEffectDialog = undefined;
    this.doUpdate();

    return result;
  }

  #handleSelectElementClick(): void {
    void this.#toggleSearchElementAction.execute();
  }

  #handleFeedbackSubmit(rpcId: number, rating: Host.AidaClient.Rating, feedback?: string): void {
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcId,
      disable_user_content_logging: !this.#serverSideLoggingEnabled,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: rating,
          user_input: {
            comment: feedback,
          },
        },
      },
    });
  }

  #handleAcceptConsentClick(): void {
    this.#consentViewAcceptedSetting.set(true);
    this.#viewProps.state = FreestylerChatUiState.CHAT_VIEW;
    this.doUpdate();
  }

  handleAction(actionId: string): void {
    switch (actionId) {
      case 'freestyler.element-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.FreestylerOpenedFromElementsPanel);
        this.doUpdate();
        break;
      }
      case 'freestyler.style-tab-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.FreestylerOpenedFromStylesTab);
        this.doUpdate();
        break;
      }
    }
  }

  #clearMessages(): void {
    this.#viewProps.messages = [];
    this.#viewProps.isLoading = false;
    this.#agent = this.#createAgent();
    this.#cancel();
    this.doUpdate();
  }

  #runAbortController = new AbortController();
  #cancel(): void {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
    this.#viewProps.isLoading = false;
    this.doUpdate();
  }

  async #startConversation(text: string, isFixQuery: boolean = false): Promise<void> {
    this.#viewProps.messages.push({
      entity: ChatMessageEntity.USER,
      text,
    });
    this.#viewProps.isLoading = true;
    // TODO: We should only show "Fix this issue" button when the answer suggests fix or fixes.
    // We shouldn't show this when the answer is complete like a confirmation without any suggestion.
    const suggestingFix = text !== FIX_THIS_ISSUE_PROMPT;
    let systemMessage: ModelChatMessage = {
      entity: ChatMessageEntity.MODEL,
      suggestingFix,
      steps: [],
    };
    this.doUpdate();

    this.#runAbortController = new AbortController();

    const signal = this.#runAbortController.signal;
    signal.addEventListener('abort', () => {
      systemMessage.rpcId = undefined;
      systemMessage.suggestingFix = false;
      systemMessage.steps.push({step: Step.ERROR, text: i18nString(UIStringsTemp.stoppedResponse)});
    });
    for await (const data of this.#agent.run(text, {signal, isFixQuery})) {
      if (data.step === Step.QUERYING) {
        systemMessage = {
          entity: ChatMessageEntity.MODEL,
          suggestingFix,
          steps: [],
        };
        this.#viewProps.messages.push(systemMessage);
        this.doUpdate();
        this.#viewOutput.freestylerChatUi?.scrollToLastMessage();
        continue;
      }

      if (data.step === Step.ANSWER || data.step === Step.ERROR) {
        this.#viewProps.isLoading = false;
      }

      systemMessage.rpcId = data.rpcId;
      systemMessage.steps.push(data);
      this.doUpdate();
      this.#viewOutput.freestylerChatUi?.scrollToLastMessage();
    }
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(
      _context: UI.Context.Context,
      actionId: string,
      ): boolean {
    switch (actionId) {
      case 'freestyler.element-panel-context':
      case 'freestyler.style-tab-context': {
        void (async () => {
          const view = UI.ViewManager.ViewManager.instance().view(
              FreestylerPanel.panelName,
          );

          if (view) {
            await UI.ViewManager.ViewManager.instance().showView(
                FreestylerPanel.panelName,
            );
            const widget = (await view.widget()) as FreestylerPanel;
            widget.handleAction(actionId);
          }
        })();
        return true;
      }
    }

    return false;
  }
}

function setFreestylerServerSideLoggingEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('freestyler_enableServerSideLogging', 'true');
  } else {
    localStorage.removeItem('freestyler_enableServerSideLogging');
  }
}

function isFreestylerServerSideLoggingEnabled(): boolean {
  return localStorage.getItem('freestyler_enableServerSideLogging') === 'true';
}

// @ts-ignore
globalThis.setFreestylerServerSideLoggingEnabled = setFreestylerServerSideLoggingEnabled;
