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
  FreestylerChatUi,
  type ModelChatMessage,
  type Props as FreestylerChatUiProps,
  Rating,
  State as FreestylerChatUiState,
} from './components/FreestylerChatUi.js';
import {FreestylerAgent, Step} from './FreestylerAgent.js';
import freestylerPanelStyles from './freestylerPanel.css.js';

/*
  * TODO(nvitkov): b/346933425
  * Temporary string that should not be translated
  * as they may change often during development.
  */
const TempUIStrings = {
  /**
   *@description Freestyler UI text for clearing messages.
   */
  clearMessages: 'Clear messages',
  /**
   *@description Freestyler UI text for sending feedback.
   */
  sendFeedback: 'Send feedback',
  /**
   *@description Freestyelr UI text for the help button.
   */
  help: 'Help',
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
      new UI.Toolbar.ToolbarButton(i18nString(TempUIStrings.clearMessages), 'clear', undefined, 'freestyler.clear');
  clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, onClearClick);
  leftToolbar.appendToolbarItem(clearButton);

  rightToolbar.appendSeparator();
  const feedbackButton =
      new UI.Toolbar.ToolbarButton(i18nString(TempUIStrings.sendFeedback), 'bug', undefined, 'freestyler.feedback');
  const helpButton = new UI.Toolbar.ToolbarButton(i18nString(TempUIStrings.help), 'help', undefined, 'freestyler.help');
  rightToolbar.appendToolbarItem(feedbackButton);
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
    this.#agent =
        new FreestylerAgent({aidaClient: this.#aidaClient, confirmSideEffect: this.showConfirmSideEffectUi.bind(this)});
    this.#selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    this.#viewProps = {
      state: this.#consentViewAcceptedSetting.get() ? FreestylerChatUiState.CHAT_VIEW :
                                                      FreestylerChatUiState.CONSENT_VIEW,
      aidaAvailability,
      messages: [],
      inspectElementToggled: this.#toggleSearchElementAction.toggled(),
      selectedNode: this.#selectedNode,
      isLoading: false,
      onTextSubmit: this.#handleTextSubmit.bind(this),
      onInspectElementClick: this.#handleSelectElementClick.bind(this),
      onRateClick: this.#handleRateClick.bind(this),
      onAcceptConsentClick: this.#handleAcceptConsentClick.bind(this),
      onCancelClick: this.#cancel.bind(this),
    };
    this.#toggleSearchElementAction.addEventListener(UI.ActionRegistration.Events.Toggled, ev => {
      this.#viewProps.inspectElementToggled = ev.data;
      this.doUpdate();
    });

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, ev => {
      if (this.#viewProps.selectedNode === ev.data) {
        return;
      }

      this.#viewProps.selectedNode = ev.data;
      this.doUpdate();
    });
    this.doUpdate();
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

  #handleRateClick(rpcId: number, rating: Rating): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerAidaClientEvent(JSON.stringify({
      client: Host.AidaClient.CLIENT_NAME,
      event_time: new Date().toISOString(),
      corresponding_aida_rpc_global_id: rpcId,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: rating === Rating.POSITIVE ? 'POSITIVE' : 'NEGATIVE',
        },
      },
    }));
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
    this.#agent.resetHistory();
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

  async #handleTextSubmit(text: string): Promise<void> {
    this.#viewProps.messages.push({
      entity: ChatMessageEntity.USER,
      text,
    });
    this.#viewProps.isLoading = true;
    let systemMessage: ModelChatMessage = {
      entity: ChatMessageEntity.MODEL,
      steps: [],
    };
    this.doUpdate();

    this.#runAbortController = new AbortController();

    const signal = this.#runAbortController.signal;
    signal.addEventListener('abort', () => {
      systemMessage.rpcId = undefined;
      systemMessage.steps.push({step: Step.ERROR, text: i18nString(TempUIStrings.stoppedResponse)});
    });
    for await (const data of this.#agent.run(text, {signal})) {
      if (data.step === Step.QUERYING) {
        systemMessage = {
          entity: ChatMessageEntity.MODEL,
          steps: [],
        };
        this.#viewProps.messages.push(systemMessage);
        this.doUpdate();
        continue;
      }

      if (data.step === Step.ANSWER || data.step === Step.ERROR) {
        this.#viewProps.isLoading = false;
      }

      systemMessage.rpcId = data.rpcId;
      systemMessage.steps.push(data);
      this.doUpdate();
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
