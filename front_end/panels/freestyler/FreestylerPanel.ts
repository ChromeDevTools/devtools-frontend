// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as ElementsPanel from '../../panels/elements/elements.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as NetworkPanel from '../../panels/network/network.js';
import * as SourcesPanel from '../../panels/sources/sources.js';
import * as TimelinePanel from '../../panels/timeline/timeline.js';
import * as TimelineUtils from '../../panels/timeline/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import {
  AgentType,
  type AiAgent,
  type ConversationContext,
  ErrorType,
  type ResponseData,
  ResponseType,
} from './AiAgent.js';
import {ChangeManager} from './ChangeManager.js';
import {
  ChatMessageEntity,
  FreestylerChatUi,
  type ModelChatMessage,
  type Props as FreestylerChatUiProps,
  State as FreestylerChatUiState,
  type Step,
} from './components/FreestylerChatUi.js';
import {
  DrJonesFileAgent,
  FileContext,
} from './DrJonesFileAgent.js';
import {
  DrJonesNetworkAgent,
  RequestContext,
} from './DrJonesNetworkAgent.js';
import {CallTreeContext, DrJonesPerformanceAgent} from './DrJonesPerformanceAgent.js';
import {FreestylerAgent, NodeContext} from './FreestylerAgent.js';
import freestylerPanelStyles from './freestylerPanel.css.js';

const {html} = LitHtml;

const AI_ASSISTANCE_SEND_FEEDBACK = 'https://crbug.com/364805393' as Platform.DevToolsPath.UrlString;
const AI_ASSISTANCE_HELP = 'https://goo.gle/devtools-ai-assistance' as Platform.DevToolsPath.UrlString;

const UIStrings = {
  /**
   *@description AI assistance UI text creating a new chat.
   */
  newChat: 'New chat',
  /**
   *@description AI assistance UI tooltip text for the help button.
   */
  help: 'Help',
  /**
   *@description AI assistant UI tooltip text for the settings button (gear icon).
   */
  settings: 'Settings',
  /**
   *@description AI assistant UI tooltip sending feedback.
   */
  sendFeedback: 'Send feedback',
  /**
   *@description Announcement text for screen readers when a new chat is created.
   */
  newChatCreated: 'New chat created',
  /**
   *@description Announcement text for screen readers when the chat is deleted.
   */
  chatDeleted: 'Chat deleted',
  /**
   *@description AI assistance UI text creating selecting a history entry.
   */
  history: 'History',
  /**
   *@description AI assistance UI text deleting the current chat session.
   */
  deleteChat: 'Delete chat',
  /**
   *@description AI assistance UI text that deletes all history entries.
   */
  clearChatHistory: 'Clear chat history',
  /**
   *@description AI assistance UI text explains that he user had no pas conversations.
   */
  noPastConversations: 'No past conversations',
};

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {

  /**
   *@description Announcement text for screen readers when the conversation starts.
   */
  answerLoading: 'Answer loading',
  /**
   *@description Announcement text for screen readers when the answer comes.
   */
  answerReady: 'Answer ready',
};

const str_ = i18n.i18n.registerUIStrings('panels/freestyler/FreestylerPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

type ViewOutput = {
  freestylerChatUi?: FreestylerChatUi,
};
type View = (input: FreestylerChatUiProps, output: ViewOutput, target: HTMLElement) => void;

function selectedElementFilter(maybeNode: SDK.DOMModel.DOMNode|null): SDK.DOMModel.DOMNode|null {
  if (maybeNode) {
    return maybeNode.nodeType() === Node.ELEMENT_NODE ? maybeNode : null;
  }

  return null;
}

function defaultView(input: FreestylerChatUiProps, output: ViewOutput, target: HTMLElement): void {
  // clang-format off
  LitHtml.render(html`
    <devtools-freestyler-chat-ui .props=${input} ${LitHtml.Directives.ref((el: Element|undefined) => {
      if (!el || !(el instanceof FreestylerChatUi)) {
        return;
      }

      output.freestylerChatUi = el;
    })}></devtools-freestyler-chat-ui>
  `, target, {host: input}); // eslint-disable-line rulesdir/lit_html_host_this
  // clang-format on
}

function createNodeContext(node: SDK.DOMModel.DOMNode|null): NodeContext|null {
  if (!node) {
    return null;
  }
  return new NodeContext(node);
}

function createFileContext(file: Workspace.UISourceCode.UISourceCode|null): FileContext|null {
  if (!file) {
    return null;
  }
  return new FileContext(file);
}

function createRequestContext(request: SDK.NetworkRequest.NetworkRequest|null): RequestContext|null {
  if (!request) {
    return null;
  }
  return new RequestContext(request);
}

function createCallTreeContext(callTree: TimelineUtils.AICallTree.AICallTree|null): CallTreeContext|null {
  if (!callTree) {
    return null;
  }
  return new CallTreeContext(callTree);
}

let freestylerPanelInstance: FreestylerPanel;
export class FreestylerPanel extends UI.Panel.Panel {
  static panelName = 'freestyler';

  #toggleSearchElementAction: UI.ActionRegistration.Action;
  #contentContainer: HTMLElement;
  #aidaClient: Host.AidaClient.AidaClient;
  #viewProps: FreestylerChatUiProps;
  #viewOutput: ViewOutput = {};
  #serverSideLoggingEnabled = isFreestylerServerSideLoggingEnabled();
  #freestylerEnabledSetting: Common.Settings.Setting<boolean>|undefined;
  #changeManager = new ChangeManager();

  #newChatButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStrings.newChat), 'plus', undefined, 'freestyler.new-chat');
  #historyEntriesButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStrings.history), 'history', undefined, 'freestyler.history');
  #deleteHistoryEntryButton =
      new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteChat), 'bin', undefined, 'freestyler.delete');

  #agents = new Set<AiAgent<unknown>>();
  #currentAgent?: AiAgent<unknown>;

  #previousSameOriginContext?: ConversationContext<unknown>;
  #selectedFile: FileContext|null = null;
  #selectedElement: NodeContext|null = null;
  #selectedCallTree: CallTreeContext|null = null;
  #selectedRequest: RequestContext|null = null;

  constructor(private view: View = defaultView, {aidaClient, aidaAvailability, syncInfo}: {
    aidaClient: Host.AidaClient.AidaClient,
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation,
  }) {
    super(FreestylerPanel.panelName);
    this.#freestylerEnabledSetting = this.#getAiAssistanceEnabledSetting();

    this.#createToolbar();
    this.#toggleSearchElementAction =
        UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    this.#aidaClient = aidaClient;
    this.#contentContainer = this.contentElement.createChild('div', 'freestyler-chat-ui-container');

    this.#viewProps = {
      state: this.#getChatUiState(),
      aidaAvailability,
      messages: [],
      inspectElementToggled: this.#toggleSearchElementAction.toggled(),
      isLoading: false,
      onTextSubmit: (text: string) => {
        void this.#startConversation(text);
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceQuerySubmitted);
      },
      onInspectElementClick: this.#handleSelectElementClick.bind(this),
      onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
      onCancelClick: this.#cancel.bind(this),
      onContextClick: this.#handleContextClick.bind(this),
      onNewConversation: this.#handleNewChatRequest.bind(this),
      canShowFeedbackForm: this.#serverSideLoggingEnabled,
      userInfo: {
        accountImage: syncInfo.accountImage,
        accountFullName: syncInfo.accountFullName,
      },
      selectedContext: null,
      blockedByCrossOrigin: false,
      stripLinks: false,
      isReadOnly: false,
    };
  }

  #createToolbar(): void {
    const toolbarContainer = this.contentElement.createChild('div', 'freestyler-toolbar-container');
    const leftToolbar = new UI.Toolbar.Toolbar('freestyler-left-toolbar', toolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('freestyler-right-toolbar', toolbarContainer);

    this.#newChatButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.#handleNewChatRequest.bind(this));
    leftToolbar.appendToolbarItem(this.#newChatButton);
    leftToolbar.appendSeparator();

    this.#historyEntriesButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, event => {
      this.#onHistoryClicked(event.data);
    });
    leftToolbar.appendToolbarItem(this.#historyEntriesButton);
    this.#deleteHistoryEntryButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK, this.#onDeleteClicked.bind(this));
    leftToolbar.appendToolbarItem(this.#deleteHistoryEntryButton);

    const link = UI.XLink.XLink.create(
        AI_ASSISTANCE_SEND_FEEDBACK, i18nString(UIStrings.sendFeedback), undefined, undefined,
        'freestyler.send-feedback');
    link.style.setProperty('display', null);
    link.style.setProperty('color', 'var(--sys-color-primary)');
    link.style.setProperty('margin', '0 var(--sys-size-3)');
    link.style.setProperty('height', 'calc(100% - 6px)');
    const linkItem = new UI.Toolbar.ToolbarItem(link);
    rightToolbar.appendToolbarItem(linkItem);

    rightToolbar.appendSeparator();
    const helpButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.help), 'help', undefined, 'freestyler.help');
    helpButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(AI_ASSISTANCE_HELP);
    });
    rightToolbar.appendToolbarItem(helpButton);

    const settingsButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.settings), 'gear', undefined, 'freestyler.settings');
    settingsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    });
    rightToolbar.appendToolbarItem(settingsButton);
  }

  #getChatUiState(): FreestylerChatUiState {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const blockedByAge = config.aidaAvailability?.blockedByAge === true;
    return (this.#freestylerEnabledSetting?.getIfNotDisabled() && !blockedByAge) ? FreestylerChatUiState.CHAT_VIEW :
                                                                                   FreestylerChatUiState.CONSENT_VIEW;
  }

  #getAiAssistanceEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('ai-assistance-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  #createAgent(agentType: AgentType): AiAgent<unknown> {
    switch (agentType) {
      case AgentType.FREESTYLER:
        return this.#createFreestylerAgent();
      case AgentType.DRJONES_FILE:
        return this.#createDrJonesFileAgent();
      case AgentType.DRJONES_NETWORK_REQUEST:
        return this.#createDrJonesNetworkAgent();
      case AgentType.DRJONES_PERFORMANCE:
        return this.#createDrJonesPerformanceAgent();
    }
  }

  #updateToolbarState(): void {
    this.#deleteHistoryEntryButton.setVisible(Boolean(this.#currentAgent && !this.#currentAgent.isEmpty));
  }

  #createFreestylerAgent(): FreestylerAgent {
    const agent = new FreestylerAgent({
      aidaClient: this.#aidaClient,
      changeManager: this.#changeManager,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    });
    this.#agents.add(agent);
    return agent;
  }

  #createDrJonesFileAgent(): DrJonesFileAgent {
    const agent = new DrJonesFileAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    });
    this.#agents.add(agent);
    return agent;
  }

  #createDrJonesNetworkAgent(): DrJonesNetworkAgent {
    const agent = new DrJonesNetworkAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    });
    this.#agents.add(agent);
    return agent;
  }

  #createDrJonesPerformanceAgent(): DrJonesPerformanceAgent {
    const agent = new DrJonesPerformanceAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    });
    this.#agents.add(agent);
    return agent;
  }

  static async instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): Promise<FreestylerPanel> {
    const {forceNew} = opts;
    if (!freestylerPanelInstance || forceNew) {
      const aidaClient = new Host.AidaClient.AidaClient();
      const syncInfoPromise = new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
      const [aidaAvailability, syncInfo] =
          await Promise.all([Host.AidaClient.AidaClient.checkAccessPreconditions(), syncInfoPromise]);
      freestylerPanelInstance = new FreestylerPanel(defaultView, {aidaClient, aidaAvailability, syncInfo});
    }

    return freestylerPanelInstance;
  }

  // We select the default agent based on the open panels if
  // there isn't any active conversation.
  #selectDefaultAgentIfNeeded(): void {
    // If there already is an agent and not it is not empty,
    // we don't automatically change the agent.
    if (this.#currentAgent && !this.#currentAgent.isEmpty) {
      return;
    }

    const config = Common.Settings.Settings.instance().getHostConfig();
    const isElementsPanelVisible =
        Boolean(UI.Context.Context.instance().flavor(ElementsPanel.ElementsPanel.ElementsPanel));
    const isNetworkPanelVisible = Boolean(UI.Context.Context.instance().flavor(NetworkPanel.NetworkPanel.NetworkPanel));
    const isSourcesPanelVisible = Boolean(UI.Context.Context.instance().flavor(SourcesPanel.SourcesPanel.SourcesPanel));
    const isPerformancePanelVisible =
        Boolean(UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel));

    let targetAgentType: AgentType|undefined = undefined;
    if (isElementsPanelVisible && config.devToolsFreestyler?.enabled) {
      targetAgentType = AgentType.FREESTYLER;
    } else if (isNetworkPanelVisible && config.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetAgentType = AgentType.DRJONES_NETWORK_REQUEST;
    } else if (isSourcesPanelVisible && config.devToolsAiAssistanceFileAgent?.enabled) {
      targetAgentType = AgentType.DRJONES_FILE;
    } else if (isPerformancePanelVisible && config.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetAgentType = AgentType.DRJONES_PERFORMANCE;
    }

    this.#currentAgent = targetAgentType ? this.#createAgent(targetAgentType) : undefined;
    this.#viewProps.agentType = targetAgentType;
    this.#onContextSelectionChanged();
    this.doUpdate();
  }

  override wasShown(): void {
    this.registerCSSFiles([freestylerPanelStyles]);
    this.#viewOutput.freestylerChatUi?.restoreScrollPosition();
    this.#viewOutput.freestylerChatUi?.focusTextInput();
    this.#selectDefaultAgentIfNeeded();
    void this.#handleAidaAvailabilityChange();
    void this
        .#handleFreestylerEnabledSettingChanged();  // If the setting was switched on/off while the FreestylerPanel was not shown.
    this.#selectedElement =
        createNodeContext(selectedElementFilter(UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode))),
    this.#selectedRequest =
        createRequestContext(UI.Context.Context.instance().flavor(SDK.NetworkRequest.NetworkRequest)),
    this.#selectedCallTree =
        createCallTreeContext(UI.Context.Context.instance().flavor(TimelineUtils.AICallTree.AICallTree)),
    this.#selectedFile = createFileContext(UI.Context.Context.instance().flavor(Workspace.UISourceCode.UISourceCode)),
    this.#viewProps = {
      ...this.#viewProps,
      agentType: this.#currentAgent?.type,
      inspectElementToggled: this.#toggleSearchElementAction.toggled(),
      selectedContext: this.#getConversationContext(),
    };
    this.doUpdate();

    this.#freestylerEnabledSetting?.addChangeListener(this.#handleFreestylerEnabledSettingChanged, this);
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction.addEventListener(
        UI.ActionRegistration.Events.TOGGLED, this.#handleSearchElementActionToggled);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelineUtils.AICallTree.AICallTree, this.#handleTraceEntryNodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        ElementsPanel.ElementsPanel.ElementsPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        NetworkPanel.NetworkPanel.NetworkPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        SourcesPanel.SourcesPanel.SourcesPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelinePanel.TimelinePanel.TimelinePanel, this.#selectDefaultAgentIfNeeded, this);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistancePanelOpened);
  }

  override willHide(): void {
    this.#freestylerEnabledSetting?.removeChangeListener(this.#handleFreestylerEnabledSettingChanged, this);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction.removeEventListener(
        UI.ActionRegistration.Events.TOGGLED, this.#handleSearchElementActionToggled);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        TimelineUtils.AICallTree.AICallTree, this.#handleTraceEntryNodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        ElementsPanel.ElementsPanel.ElementsPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().removeFlavorChangeListener(
        NetworkPanel.NetworkPanel.NetworkPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().removeFlavorChangeListener(
        SourcesPanel.SourcesPanel.SourcesPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().removeFlavorChangeListener(
        TimelinePanel.TimelinePanel.TimelinePanel, this.#selectDefaultAgentIfNeeded, this);
  }

  #handleAidaAvailabilityChange = async(): Promise<void> => {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#viewProps.aidaAvailability) {
      this.#viewProps.aidaAvailability = currentAidaAvailability;
      const syncInfo = await new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
      this.#viewProps.userInfo = {
        accountImage: syncInfo.accountImage,
        accountFullName: syncInfo.accountFullName,
      };
      this.#viewProps.state = this.#getChatUiState();
      this.doUpdate();
    }
  };

  #handleSearchElementActionToggled = (ev: Common.EventTarget.EventTargetEvent<boolean>): void => {
    if (this.#viewProps.inspectElementToggled === ev.data) {
      return;
    }

    this.#viewProps.inspectElementToggled = ev.data;
    this.doUpdate();
  };

  #handleDOMNodeFlavorChange = (ev: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void => {
    if (this.#selectedElement?.getItem() === ev.data) {
      return;
    }

    this.#selectedElement = createNodeContext(selectedElementFilter(ev.data));
    this.#onContextSelectionChanged();
  };

  #handleNetworkRequestFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void => {
        if (this.#selectedRequest?.getItem() === ev.data) {
          return;
        }

        this.#selectedRequest = Boolean(ev.data) ? new RequestContext(ev.data) : null;
        this.#onContextSelectionChanged();
      };

  #handleTraceEntryNodeFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<TimelineUtils.AICallTree.AICallTree>): void => {
        if (this.#selectedCallTree?.getItem() === ev.data) {
          return;
        }

        this.#selectedCallTree = Boolean(ev.data) ? new CallTreeContext(ev.data) : null;
        this.#onContextSelectionChanged();
      };

  #handleUISourceCodeFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void => {
        const newFile = ev.data;
        if (!newFile) {
          return;
        }
        if (this.#selectedFile?.getItem() === newFile) {
          return;
        }
        this.#selectedFile = new FileContext(ev.data);
        this.#onContextSelectionChanged();
      };

  #handleFreestylerEnabledSettingChanged = (): void => {
    const nextChatUiState = this.#getChatUiState();
    if (this.#viewProps.state === nextChatUiState) {
      return;
    }

    this.#viewProps.state = nextChatUiState;
    this.doUpdate();
  };

  doUpdate(): void {
    this.#updateToolbarState();
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

  #handleContextClick(): void|Promise<void> {
    const context = this.#viewProps.selectedContext;
    if (context instanceof RequestContext) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          context.getItem(), NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
      return Common.Revealer.reveal(requestLocation);
    }
    if (context instanceof FileContext) {
      return Common.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof CallTreeContext) {
      const trace = new SDK.TraceObject.RevealableEvent(context.getItem().selectedNode.event);
      return Common.Revealer.reveal(trace);
    }
    // Node picker is using linkifier.
  }

  handleAction(actionId: string): void {
    if (this.#viewProps.isLoading) {
      // If running some queries already, focus the input with the abort
      // button and do nothing.
      this.#viewOutput.freestylerChatUi?.focusTextInput();
      return;
    }

    let targetAgentType: AgentType|undefined;
    switch (actionId) {
      case 'freestyler.elements-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.FreestylerOpenedFromElementsPanelFloatingButton);
        targetAgentType = AgentType.FREESTYLER;
        break;
      }
      case 'freestyler.element-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.FreestylerOpenedFromElementsPanel);
        targetAgentType = AgentType.FREESTYLER;
        break;
      }
      case 'drjones.network-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.DrJonesOpenedFromNetworkPanelFloatingButton);
        targetAgentType = AgentType.DRJONES_NETWORK_REQUEST;
        break;
      }
      case 'drjones.network-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.DrJonesOpenedFromNetworkPanel);
        targetAgentType = AgentType.DRJONES_NETWORK_REQUEST;
        break;
      }
      case 'drjones.performance-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.DrJonesOpenedFromPerformancePanel);
        targetAgentType = AgentType.DRJONES_PERFORMANCE;
        break;
      }
      case 'drjones.sources-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.DrJonesOpenedFromSourcesPanelFloatingButton);
        targetAgentType = AgentType.DRJONES_FILE;
        break;
      }
      case 'drjones.sources-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.DrJonesOpenedFromSourcesPanel);
        targetAgentType = AgentType.DRJONES_FILE;
        break;
      }
    }

    if (!targetAgentType) {
      return;
    }

    let newAgent = false;
    if (!this.#currentAgent || this.#currentAgent.type !== targetAgentType || this.#currentAgent.isHistoryEntry ||
        targetAgentType === AgentType.DRJONES_PERFORMANCE) {
      this.#currentAgent = this.#createAgent(targetAgentType);
      newAgent = true;
    }
    this.#viewProps.agentType = this.#currentAgent.type;
    this.#viewOutput.freestylerChatUi?.focusTextInput();
    this.#onContextSelectionChanged();
    void this.doUpdate();
    if (newAgent) {
      this.#viewProps.messages = [];
      this.#viewProps.isReadOnly = false;
      void this.#doConversation(this.#currentAgent.runFromHistory());
    }
  }

  #onHistoryClicked(event: Event): void {
    const boundingRect = this.#historyEntriesButton.element.getBoundingClientRect();
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {
      x: boundingRect.left,
      y: boundingRect.bottom,
      useSoftMenu: true,
    });

    for (const agent of [...this.#agents].reverse()) {
      if (agent.isEmpty) {
        continue;
      }
      const title = agent.title;
      if (!title) {
        continue;
      }

      contextMenu.defaultSection().appendItem(title, () => {
        void this.#switchAgent(agent);
      });
    }

    const historyEmpty = contextMenu.defaultSection().items.length === 0;
    if (historyEmpty) {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.noPastConversations), () => {}, {
        disabled: true,
      });
    }

    contextMenu.footerSection().appendItem(
        i18nString(UIStrings.clearChatHistory),
        () => {
          this.#clearHistory();
        },
        {
          disabled: historyEmpty,
        },
    );

    void contextMenu.show();
  }

  #clearHistory(): void {
    this.#agents = new Set();
    this.#currentAgent = undefined;
    this.#viewProps.messages = [];
    this.#viewProps.agentType = undefined;
    this.doUpdate();
  }

  #onDeleteClicked(): void {
    if (this.#currentAgent) {
      this.#agents.delete(this.#currentAgent);
      this.#currentAgent = undefined;
      this.#cancel();
    }

    this.#viewProps.messages = [];

    this.#selectDefaultAgentIfNeeded();
    this.#onContextSelectionChanged();
    this.doUpdate();
    UI.ARIAUtils.alert(i18nString(UIStrings.chatDeleted));
  }

  async #switchAgent(agent: AiAgent<unknown>): Promise<void> {
    if (this.#currentAgent === agent) {
      return;
    }

    this.#currentAgent = agent;
    this.#viewProps.messages = [];
    this.#viewProps.agentType = agent.type;
    this.#onContextSelectionChanged();
    this.#viewProps.isReadOnly = true;
    await this.#doConversation(agent.runFromHistory());
  }

  #handleNewChatRequest(): void {
    this.#viewProps.messages = [];
    this.#viewProps.isLoading = false;
    this.#currentAgent = undefined;
    this.#cancel();

    this.#selectDefaultAgentIfNeeded();
    this.doUpdate();
    UI.ARIAUtils.alert(i18nString(UIStrings.newChatCreated));
  }

  #handleCrossOriginChatCancellation(): void {
    if (this.#previousSameOriginContext) {
      this.#onContextSelectionChanged(this.#previousSameOriginContext);
    }
  }

  #runAbortController = new AbortController();
  #cancel(): void {
    this.#runAbortController.abort();
    this.#viewProps.isLoading = false;
    this.doUpdate();
  }

  #onContextSelectionChanged(contextToRestore?: ConversationContext<unknown>): void {
    if (!this.#currentAgent) {
      this.#viewProps.blockedByCrossOrigin = false;
      this.doUpdate();
      return;
    }
    const currentContext = contextToRestore ?? this.#getConversationContext();
    this.#viewProps.selectedContext = currentContext;
    if (!currentContext) {
      this.#viewProps.blockedByCrossOrigin = false;
      this.#viewProps.requiresNewConversation = false;
      this.doUpdate();
      return;
    }
    this.#viewProps.blockedByCrossOrigin = !currentContext.isOriginAllowed(this.#currentAgent.origin);
    if (!this.#viewProps.blockedByCrossOrigin) {
      this.#previousSameOriginContext = currentContext;
    }
    if (this.#viewProps.blockedByCrossOrigin && this.#previousSameOriginContext) {
      this.#viewProps.onCancelCrossOriginChat = this.#handleCrossOriginChatCancellation.bind(this);
    }
    this.#viewProps.isReadOnly = this.#currentAgent.isHistoryEntry;
    this.#viewProps.requiresNewConversation = this.#currentAgent.type === AgentType.DRJONES_PERFORMANCE &&
        Boolean(this.#currentAgent.context) && this.#currentAgent.context !== currentContext;
    this.#viewProps.stripLinks = this.#viewProps.agentType === AgentType.DRJONES_PERFORMANCE;
    this.doUpdate();
  }

  #getConversationContext(): ConversationContext<unknown>|null {
    if (!this.#currentAgent) {
      return null;
    }
    let context: ConversationContext<unknown>|null;
    switch (this.#currentAgent.type) {
      case AgentType.FREESTYLER:
        context = this.#selectedElement;
        break;
      case AgentType.DRJONES_FILE:
        context = this.#selectedFile;
        break;
      case AgentType.DRJONES_NETWORK_REQUEST:
        context = this.#selectedRequest;
        break;
      case AgentType.DRJONES_PERFORMANCE:
        context = this.#selectedCallTree;
        break;
    }
    return context;
  }

  async #startConversation(text: string): Promise<void> {
    if (!this.#currentAgent) {
      return;
    }
    this.#runAbortController = new AbortController();
    const signal = this.#runAbortController.signal;
    const context = this.#getConversationContext();
    // If a different context is provided, it must be from the same origin.
    if (context && !context.isOriginAllowed(this.#currentAgent.origin)) {
      // This error should not be reached. If it happens, some
      // invariants do not hold anymore.
      throw new Error('cross-origin context data should not be included');
    }
    const runner = this.#currentAgent.run(text, {
      signal,
      selected: context,
    });
    UI.ARIAUtils.alert(lockedString(UIStringsNotTranslate.answerLoading));
    await this.#doConversation(runner);
    UI.ARIAUtils.alert(lockedString(UIStringsNotTranslate.answerReady));
  }

  async #doConversation(generator: AsyncGenerator<ResponseData, void, void>): Promise<void> {
    let systemMessage: ModelChatMessage = {
      entity: ChatMessageEntity.MODEL,
      steps: [],
    };
    let step: Step = {isLoading: true};
    for await (const data of generator) {
      step.sideEffect = undefined;
      switch (data.type) {
        case ResponseType.USER_QUERY: {
          this.#viewProps.messages.push({
            entity: ChatMessageEntity.USER,
            text: data.query,
          });
          this.#viewProps.isLoading = true;
          systemMessage = {
            entity: ChatMessageEntity.MODEL,
            steps: [],
          };
          this.#viewProps.messages.push(systemMessage);
          break;
        }
        case ResponseType.QUERYING: {
          step = {isLoading: true};
          if (!systemMessage.steps.length) {
            systemMessage.steps.push(step);
          }

          break;
        }
        case ResponseType.CONTEXT: {
          step.title = data.title;
          step.contextDetails = data.details;
          step.isLoading = false;
          if (systemMessage.steps.at(-1) !== step) {
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
          systemMessage.suggestions = data.suggestions;
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
          systemMessage.error = data.error;
          systemMessage.rpcId = undefined;
          this.#viewProps.isLoading = false;
          const lastStep = systemMessage.steps.at(-1);
          if (lastStep) {
            // Mark the last step as cancelled to make the UI feel better.
            if (data.error === ErrorType.ABORT) {
              lastStep.canceled = true;
              // If error happens while the step is still loading remove it.
            } else if (lastStep.isLoading) {
              systemMessage.steps.pop();
            }
          }
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
      case 'freestyler.elements-floating-button':
      case 'freestyler.element-panel-context':
      case 'drjones.network-floating-button':
      case 'drjones.network-panel-context':
      case 'drjones.performance-panel-context':
      case 'drjones.sources-floating-button':
      case 'drjones.sources-panel-context': {
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
