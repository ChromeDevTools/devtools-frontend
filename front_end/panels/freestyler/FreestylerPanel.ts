// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import {ErrorType, ResponseType} from './AiAgent.js';
import {ChangeManager} from './ChangeManager.js';
import {
  AgentType,
  ChatMessageEntity,
  DOGFOOD_INFO,
  FreestylerChatUi,
  type ModelChatMessage,
  type Props as FreestylerChatUiProps,
  State as FreestylerChatUiState,
  type Step,
} from './components/FreestylerChatUi.js';
import {
  DrJonesNetworkAgent,
} from './DrJonesNetworkAgent.js';
import {FreestylerAgent} from './FreestylerAgent.js';
import freestylerPanelStyles from './freestylerPanel.css.js';

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description AI assistance UI text for clearing messages.
   */
  clearMessages: 'Clear messages',
  /**
   *@description AI assistance UI tooltip text for the help button.
   */
  help: 'Help',
  /**
   *@description AI assistant UI tooltip text for the settings button (gear icon).
   */
  settings: 'Settings',
};

const lockedString = i18n.i18n.lockedString;

type ViewOutput = {
  freestylerChatUi?: FreestylerChatUi,
};
type View = (input: FreestylerChatUiProps, output: ViewOutput, target: HTMLElement) => void;

// TODO(ergunsh): Use the WidgetElement instead of separately creating the toolbar.
function createToolbar(target: HTMLElement, {onClearClick}: {onClearClick: () => void}): void {
  const toolbarContainer = target.createChild('div', 'freestyler-toolbar-container');
  const leftToolbar = new UI.Toolbar.Toolbar('', toolbarContainer);
  const rightToolbar = new UI.Toolbar.Toolbar('freestyler-right-toolbar', toolbarContainer);

  const clearButton = new UI.Toolbar.ToolbarButton(
      lockedString(UIStringsNotTranslate.clearMessages), 'clear', undefined, 'freestyler.clear');
  clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, onClearClick);
  leftToolbar.appendToolbarItem(clearButton);

  rightToolbar.appendSeparator();
  const helpButton =
      new UI.Toolbar.ToolbarButton(lockedString(UIStringsNotTranslate.help), 'help', undefined, 'freestyler.help');
  helpButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(DOGFOOD_INFO);
  });
  rightToolbar.appendToolbarItem(helpButton);

  const settingsButton = new UI.Toolbar.ToolbarButton(
      lockedString(UIStringsNotTranslate.settings), 'gear', undefined, 'freestyler.settings');
  settingsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
  });
  rightToolbar.appendToolbarItem(settingsButton);
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
  #selectedElement: SDK.DOMModel.DOMNode|null;
  #selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest|null;
  #contentContainer: HTMLElement;
  #aidaClient: Host.AidaClient.AidaClient;
  #freestylerAgent: FreestylerAgent;
  #drJonesNetworkAgent: DrJonesNetworkAgent;
  #viewProps: FreestylerChatUiProps;
  #viewOutput: ViewOutput = {};
  #serverSideLoggingEnabled = isFreestylerServerSideLoggingEnabled();
  #freestylerEnabledSetting: Common.Settings.Setting<boolean>|undefined;
  #changeManager = new ChangeManager();

  constructor(private view: View = defaultView, {aidaClient, aidaAvailability, syncInfo}: {
    aidaClient: Host.AidaClient.AidaClient,
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation,
  }) {
    super(FreestylerPanel.panelName);
    this.#freestylerEnabledSetting = this.#getFreestylerEnabledSetting();

    createToolbar(this.contentElement, {onClearClick: this.#clearMessages.bind(this)});
    this.#toggleSearchElementAction =
        UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    this.#aidaClient = aidaClient;
    this.#contentContainer = this.contentElement.createChild('div', 'freestyler-chat-ui-container');

    this.#selectedElement = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    this.#selectedNetworkRequest = UI.Context.Context.instance().flavor(SDK.NetworkRequest.NetworkRequest);
    this.#viewProps = {
      state: this.#freestylerEnabledSetting?.get() ? FreestylerChatUiState.CHAT_VIEW :
                                                     FreestylerChatUiState.CONSENT_VIEW,
      aidaAvailability,
      messages: [],
      inspectElementToggled: this.#toggleSearchElementAction.toggled(),
      selectedElement: this.#selectedElement,
      selectedNetworkRequest: this.#selectedNetworkRequest,
      isLoading: false,
      onTextSubmit: this.#startConversation.bind(this),
      onInspectElementClick: this.#handleSelectElementClick.bind(this),
      onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
      onCancelClick: this.#cancel.bind(this),
      onSelectedNetworkRequestClick: this.#handleSelectedNetworkRequestClick.bind(this),
      canShowFeedbackForm: this.#serverSideLoggingEnabled,
      userInfo: {
        accountImage: syncInfo.accountImage,
        accountFullName: syncInfo.accountFullName,
      },
      agentType: AgentType.FREESTYLER,
    };
    this.#toggleSearchElementAction.addEventListener(UI.ActionRegistration.Events.TOGGLED, ev => {
      this.#viewProps.inspectElementToggled = ev.data;
      this.doUpdate();
    });

    this.#freestylerAgent = this.#createFreestylerAgent();
    this.#drJonesNetworkAgent = this.#createDrJonesNetworkAgent();

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, ev => {
      if (this.#viewProps.selectedElement === ev.data) {
        return;
      }

      this.#viewProps.selectedElement = Boolean(ev.data) && ev.data.nodeType() === Node.ELEMENT_NODE ? ev.data : null;
      this.doUpdate();
    });
    UI.Context.Context.instance().addFlavorChangeListener(SDK.NetworkRequest.NetworkRequest, ev => {
      if (this.#viewProps.selectedNetworkRequest === ev.data) {
        return;
      }

      this.#viewProps.selectedNetworkRequest = Boolean(ev.data) ? ev.data : null;
      this.doUpdate();
    });
    this.doUpdate();
  }

  #getFreestylerEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('freestyler-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  #createFreestylerAgent(): FreestylerAgent {
    return new FreestylerAgent({
      aidaClient: this.#aidaClient,
      changeManager: this.#changeManager,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    });
  }

  #createDrJonesNetworkAgent(): DrJonesNetworkAgent {
    return new DrJonesNetworkAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    });
  }

  static async instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): Promise<FreestylerPanel> {
    const {forceNew} = opts;
    if (!freestylerPanelInstance || forceNew) {
      const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
      const aidaClient = new Host.AidaClient.AidaClient();
      const syncInfo = await new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(
              syncInfo => resolve(syncInfo)));
      freestylerPanelInstance = new FreestylerPanel(defaultView, {aidaClient, aidaAvailability, syncInfo});
    }

    return freestylerPanelInstance;
  }

  override wasShown(): void {
    this.registerCSSFiles([freestylerPanelStyles]);
    this.#viewOutput.freestylerChatUi?.restoreScrollPosition();
    this.#viewOutput.freestylerChatUi?.focusTextInput();
    this.#freestylerEnabledSetting?.addChangeListener(this.#handleFreestylerEnabledSettingChanged, this);
  }

  override willHide(): void {
    this.#freestylerEnabledSetting?.removeChangeListener(this.#handleFreestylerEnabledSettingChanged, this);
  }

  #handleFreestylerEnabledSettingChanged(): void {
    this.#viewProps.state =
        this.#freestylerEnabledSetting?.get() ? FreestylerChatUiState.CHAT_VIEW : FreestylerChatUiState.CONSENT_VIEW;
    this.doUpdate();
  }

  doUpdate(): void {
    this.view(this.#viewProps, this.#viewOutput, this.#contentContainer);
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

  #handleSelectedNetworkRequestClick(): void|Promise<void> {
    if (this.#viewProps.selectedNetworkRequest) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          this.#viewProps.selectedNetworkRequest, NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
      return Common.Revealer.reveal(requestLocation);
    }
  }

  handleAction(actionId: string): void {
    switch (actionId) {
      case 'freestyler.element-panel-context': {
        this.#viewOutput.freestylerChatUi?.focusTextInput();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.FreestylerOpenedFromElementsPanel);
        this.#viewProps.agentType = AgentType.FREESTYLER;
        this.doUpdate();
        break;
      }
      case 'drjones.network-panel-context': {
        // TODO(samiyac): Add UMA
        this.#viewOutput.freestylerChatUi?.focusTextInput();
        this.#viewProps.agentType = AgentType.DRJONES_NETWORK_REQUEST;
        this.doUpdate();
        break;
      }
    }
  }

  #clearMessages(): void {
    this.#viewProps.messages = [];
    this.#viewProps.isLoading = false;
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

  async #startConversation(text: string): Promise<void> {
    // TODO(samiyac): Refactor startConversation
    this.#viewProps.messages.push({
      entity: ChatMessageEntity.USER,
      text,
    });
    this.#viewProps.isLoading = true;
    const systemMessage: ModelChatMessage = {
      entity: ChatMessageEntity.MODEL,
      suggestingFix: false,
      steps: [],
    };
    this.#viewProps.messages.push(systemMessage);
    this.doUpdate();

    this.#runAbortController = new AbortController();

    const signal = this.#runAbortController.signal;

    if (this.#viewProps.agentType === AgentType.FREESTYLER) {
      await this.#conversationStepsForFreestylerAgent(text, signal, systemMessage);
    } else if (this.#viewProps.agentType === AgentType.DRJONES_NETWORK_REQUEST) {
      await this.#conversationStepsForDrJonesNetworkAgent(text, signal, systemMessage);
    }
  }

  async #conversationStepsForFreestylerAgent(text: string, signal: AbortSignal, systemMessage: ModelChatMessage):
      Promise<void> {
    let step: Step = {isLoading: true};

    for await (
        const data of this.#freestylerAgent.run(text, {signal, selectedElement: this.#viewProps.selectedElement})) {
      step.sideEffect = undefined;
      switch (data.type) {
        case ResponseType.QUERYING: {
          step = {isLoading: true};
          if (!systemMessage.steps.length) {
            systemMessage.steps.push(step);
          }

          break;
        }
        case ResponseType.TITLE: {
          step.title = data.title;
          if (systemMessage.steps.at(-1) !== step) {
            systemMessage.steps.push(step);
          }
          break;
        }
        case ResponseType.THOUGHT: {
          step.isLoading = false;
          step.thought = data.thought;
          if (systemMessage.steps.at(-1) !== step) {
            systemMessage.steps.push(step);
          }
          break;
        }
        case ResponseType.SIDE_EFFECT: {
          step.isLoading = false;
          step.code = data.code;
          step.sideEffect = {
            onAnswer: data.confirm,
          };
          if (systemMessage.steps.at(-1) !== step) {
            systemMessage.steps.push(step);
          }
          break;
        }
        case ResponseType.ACTION: {
          step.isLoading = false;
          step.code = data.code;
          step.output = data.output;
          step.canceled = data.canceled;
          if (systemMessage.steps.at(-1) !== step) {
            systemMessage.steps.push(step);
          }
          break;
        }
        case ResponseType.ANSWER: {
          systemMessage.suggestingFix = data.fixable;
          systemMessage.answer = data.text;
          systemMessage.rpcId = data.rpcId;
          // When there is an answer without any thinking steps, we don't want to show the thinking step.
          if (systemMessage.steps.length === 1 && systemMessage.steps[0].isLoading) {
            systemMessage.steps.pop();
          }
          step.isLoading = false;
          this.#viewProps.isLoading = false;
          break;
        }

        case ResponseType.ERROR: {
          step.isLoading = false;
          systemMessage.error = data.error;
          systemMessage.suggestingFix = false;
          systemMessage.rpcId = undefined;
          this.#viewProps.isLoading = false;
          if (data.error === ErrorType.ABORT) {
            const lastStep = systemMessage.steps.at(-1);
            // Mark the last step as cancelled to make the UI feel better.
            if (lastStep) {
              lastStep.canceled = true;
            }
          }
        }
      }

      this.doUpdate();
      this.#viewOutput.freestylerChatUi?.scrollToLastMessage();
    }
  }

  async #conversationStepsForDrJonesNetworkAgent(text: string, signal: AbortSignal, systemMessage: ModelChatMessage):
      Promise<void> {
    // TODO(samiyac): Only display the thinking step with context details when it is the first message
    const step: Step = {isLoading: true};

    for await (const data of this.#drJonesNetworkAgent.run(
        text, {signal, selectedNetworkRequest: this.#viewProps.selectedNetworkRequest})) {
      switch (data.type) {
        case ResponseType.TITLE: {
          step.title = data.title;
          if (systemMessage.steps.at(-1) !== step) {
            systemMessage.steps.push(step);
          }
          break;
        }
        case ResponseType.THOUGHT: {
          step.isLoading = false;
          step.thought = data.thought;
          step.contextDetails = data.contextDetails;
          if (systemMessage.steps.at(-1) !== step) {
            systemMessage.steps.push(step);
          }
          break;
        }

        case ResponseType.ANSWER: {
          systemMessage.answer = data.text;
          systemMessage.rpcId = data.rpcId;
          step.isLoading = false;
          this.#viewProps.isLoading = false;
          break;
        }

        case ResponseType.ERROR: {
          step.isLoading = false;
          systemMessage.error = ErrorType.UNKNOWN;
          this.#viewProps.isLoading = false;
        }
      }

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
      case 'drjones.network-panel-context': {
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
    localStorage.setItem('freestyler_enableServerSideLogging', 'false');
  }
}

function isFreestylerServerSideLoggingEnabled(): boolean {
  const config = Common.Settings.Settings.instance().getHostConfig();
  if (config.aidaAvailability?.disallowLogging) {
    return false;
  }
  return localStorage.getItem('freestyler_enableServerSideLogging') !== 'false';
}

// @ts-ignore
globalThis.setFreestylerServerSideLoggingEnabled = setFreestylerServerSideLoggingEnabled;
