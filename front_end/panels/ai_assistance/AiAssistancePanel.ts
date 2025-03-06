// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ElementsPanel from '../elements/elements.js';
import * as NetworkForward from '../network/forward/forward.js';
import * as NetworkPanel from '../network/network.js';
import * as SourcesPanel from '../sources/sources.js';
import * as TimelinePanel from '../timeline/timeline.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import {
  AgentType,
  AiAgent,
  type ConversationContext,
  ErrorType,
  type ResponseData,
  ResponseType,
} from './agents/AiAgent.js';
import {
  FileAgent,
  FileContext,
} from './agents/FileAgent.js';
import {
  NetworkAgent,
  RequestContext,
} from './agents/NetworkAgent.js';
import {CallTreeContext, PerformanceAgent} from './agents/PerformanceAgent.js';
import {InsightContext, PerformanceInsightsAgent} from './agents/PerformanceInsightsAgent.js';
import {NodeContext, StylingAgent, StylingAgentWithFunctionCalling} from './agents/StylingAgent.js';
import aiAssistancePanelStyles from './aiAssistancePanel.css.js';
import {AiHistoryStorage, Conversation, ConversationType} from './AiHistoryStorage.js';
import {ChangeManager} from './ChangeManager.js';
import {
  type ChatMessage,
  ChatMessageEntity,
  ChatView,
  type ImageInputData,
  type ModelChatMessage,
  type Props as ChatViewProps,
  State as ChatViewState,
  type Step
} from './components/ChatView.js';
import {isAiAssistancePatchingEnabled} from './PatchWidget.js';

const {html} = Lit;

const AI_ASSISTANCE_SEND_FEEDBACK = 'https://crbug.com/364805393' as Platform.DevToolsPath.UrlString;
const AI_ASSISTANCE_HELP = 'https://goo.gle/devtools-ai-assistance' as Platform.DevToolsPath.UrlString;
const SCREENSHOT_QUALITY = 100;
const SHOW_LOADING_STATE_TIMEOUT = 100;

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
   *@description AI assistance UI text deleting the current chat session from local history.
   */
  deleteChat: 'Delete local chat',
  /**
   *@description AI assistance UI text that deletes all local history entries.
   */
  clearChatHistory: 'Clear local chats',
  /**
   *@description AI assistance UI text explains that he user had no pas conversations.
   */
  noPastConversations: 'No past conversations',
  /**
   * @description Placeholder text for an inactive text field. When active, it's used for the user's input to the GenAI assistance.
   */
  followTheSteps: 'Follow the steps above to ask a question',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForEmptyState: 'This is an experimental AI feature and won\'t always get it right.',
} as const;

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
  /**
   * @description Placeholder text for the input shown when the conversation is blocked because a cross-origin context was selected.
   */
  crossOriginError: 'To talk about data from another origin, start a new chat',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForStyling: 'Ask a question about the selected element',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForNetwork: 'Ask a question about the selected network request',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForFile: 'Ask a question about the selected file',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformance: 'Ask a question about the selected item and its call tree',
  /**
   *@description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForStylingNoContext: 'Select an element to ask a question',
  /**
   *@description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForNetworkNoContext: 'Select a network request to ask a question',
  /**
   *@description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForFileNoContext: 'Select a file to ask a question',
  /**
   *@description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForPerformanceNoContext: 'Select an item to ask a question',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceInsights: 'Ask a question about the selected performance insight',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceInsightsNoContext: 'Select a performance insight to ask a question',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForStyling:
      'Chat messages and any data the inspected page can access via Web APIs are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForStylingEnterpriseNoLogging:
      'Chat messages and any data the inspected page can access via Web APIs are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNetwork:
      'Chat messages and the selected network request are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNetworkEnterpriseNoLogging:
      'Chat messages and the selected network request are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFile:
      'Chat messages and the selected file are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFileEnterpriseNoLogging:
      'Chat messages and the selected file are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForPerformance:
      'Chat messages and the selected call tree are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForPerformanceEnterpriseNoLogging:
      'Chat messages and the selected call stack are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/AiAssistancePanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

function selectedElementFilter(maybeNode: SDK.DOMModel.DOMNode|null): SDK.DOMModel.DOMNode|null {
  if (maybeNode) {
    return maybeNode.nodeType() === Node.ELEMENT_NODE ? maybeNode : null;
  }

  return null;
}

function getEmptyStateSuggestions(conversationType: ConversationType): string[] {
  switch (conversationType) {
    case ConversationType.STYLING:
      return [
        'What can you help me with?',
        'Why isn’t this element visible?',
        'How do I center this element?',
      ];
    case ConversationType.FILE:
      return [
        'What does this script do?',
        'Is the script optimized for performance?',
        'Does the script handle user input safely?',
      ];
    case ConversationType.NETWORK:
      return [
        'Why is this network request taking so long?',
        'Are there any security headers present?',
        'Why is the request failing?',
      ];
    case ConversationType.PERFORMANCE:
      return [
        'Identify performance issues in this call tree',
        'Where is most of the time being spent in this call tree?',
        'How can I reduce the time of this call tree?',
      ];
    case ConversationType.PERFORMANCE_INSIGHT:
      // TODO(b/393061683): Define these.
      return ['Help me optimize my LCP', 'Suggestions', 'For now'];
  }
}

interface ToolbarViewInput {
  onNewChatClick: () => void;
  onHistoryClick: (event: MouseEvent) => void;
  onDeleteClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  isDeleteHistoryButtonVisible: boolean;
}

export type ViewInput = ChatViewProps&ToolbarViewInput;
export interface PanelViewOutput {
  chatView?: ChatView;
}

type View = (input: ViewInput, output: PanelViewOutput, target: HTMLElement) => void;

function toolbarView(input: ToolbarViewInput): Lit.LitTemplate {
  // clang-format off
  return html`
    <div class="toolbar-container" role="toolbar" .jslogContext=${VisualLogging.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
        <devtools-button
          title=${i18nString(UIStrings.newChat)}
          aria-label=${i18nString(UIStrings.newChat)}
          .iconName=${'plus'}
          .jslogContext=${'freestyler.new-chat'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onNewChatClick}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${i18nString(UIStrings.history)}
          aria-label=${i18nString(UIStrings.history)}
          .iconName=${'history'}
          .jslogContext=${'freestyler.history'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onHistoryClick}></devtools-button>
        ${input.isDeleteHistoryButtonVisible
          ? html`<devtools-button
              title=${i18nString(UIStrings.deleteChat)}
              aria-label=${i18nString(UIStrings.deleteChat)}
              .iconName=${'bin'}
              .jslogContext=${'freestyler.delete'}
              .variant=${Buttons.Button.Variant.TOOLBAR}
              @click=${input.onDeleteClick}></devtools-button>`
          : Lit.nothing}
      </devtools-toolbar>
      <devtools-toolbar class="freestyler-right-toolbar" role="presentation">
        <x-link
          class="toolbar-feedback-link devtools-link"
          title=${UIStrings.sendFeedback}
          href=${AI_ASSISTANCE_SEND_FEEDBACK}
          jslog=${VisualLogging.link().track({click: true, keydown:'Enter|Space'}).context('freestyler.send-feedback')}
        >${UIStrings.sendFeedback}</x-link>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${i18nString(UIStrings.help)}
          aria-label=${i18nString(UIStrings.help)}
          .iconName=${'help'}
          .jslogContext=${'freestyler.help'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onHelpClick}></devtools-button>
        <devtools-button
          title=${i18nString(UIStrings.settings)}
          aria-label=${i18nString(UIStrings.settings)}
          .iconName=${'gear'}
          .jslogContext=${'freestyler.settings'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onSettingsClick}></devtools-button>
      </devtools-toolbar>
    </div>
  `;
  // clang-format on
}

function defaultView(input: ViewInput, output: PanelViewOutput, target: HTMLElement): void {
  // clang-format off
  Lit.render(html`
    ${toolbarView(input)}
    <div class="chat-container">
      <devtools-ai-chat-view .props=${input} ${Lit.Directives.ref((el: Element|undefined) => {
        if (!el || !(el instanceof ChatView)) {
          return;
        }

        output.chatView = el;
      })}></devtools-ai-chat-view>
    </div>
  `, target, {host: input});
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
function createPerfInsightContext(insight: TimelineUtils.InsightAIContext.ActiveInsight|null): InsightContext|null {
  if (!insight) {
    return null;
  }
  return new InsightContext(insight);
}

function agentTypeToConversationType(type: AgentType): ConversationType {
  switch (type) {
    case AgentType.STYLING:
      return ConversationType.STYLING;
    case AgentType.NETWORK:
      return ConversationType.NETWORK;
    case AgentType.FILE:
      return ConversationType.FILE;
    case AgentType.PERFORMANCE:
      return ConversationType.PERFORMANCE;
    case AgentType.PERFORMANCE_INSIGHT:
      return ConversationType.PERFORMANCE_INSIGHT;
    case AgentType.PATCH:
      throw new Error('PATCH AgentType does not have a corresponding ConversationType.');
  }
}

let panelInstance: AiAssistancePanel;
export class AiAssistancePanel extends UI.Panel.Panel {
  static panelName = 'freestyler';

  #toggleSearchElementAction: UI.ActionRegistration.Action;
  #aidaClient: Host.AidaClient.AidaClient;
  #viewOutput: PanelViewOutput = {};
  #serverSideLoggingEnabled = isAiAssistanceServerSideLoggingEnabled();
  #aiAssistanceEnabledSetting: Common.Settings.Setting<boolean>|undefined;
  #changeManager = new ChangeManager();
  #mutex = new Common.Mutex.Mutex();

  #conversationAgent?: AiAgent<unknown>;
  #conversation?: Conversation;
  #historicalConversations: Conversation[] = [];

  #selectedFile: FileContext|null = null;
  #selectedElement: NodeContext|null = null;
  #selectedCallTree: CallTreeContext|null = null;
  #selectedPerformanceInsight: InsightContext|null = null;
  #selectedRequest: RequestContext|null = null;

  // Messages displayed in the `ChatView` component.
  #messages: ChatMessage[] = [];
  // Indicates whether the new conversation context is blocked due to cross-origin restrictions.
  // This happens when the conversation's context has a different
  // origin than the selected context.
  #blockedByCrossOrigin = false;
  // Whether the UI should show loading or not.
  #isLoading = false;
  // Selected conversation context. The reason we keep this as a
  // state field rather than using `#getConversationContext` is that,
  // there is a case where the context differs from the selectedElement (or other selected context type).
  // Specifically, it allows restoring the previous context when a new selection is cross-origin.
  // See `#onContextSelectionChanged` for details.
  #selectedContext: ConversationContext<unknown>|null = null;
  // Stores the availability status of the `AidaClient` and the reason for unavailability, if any.
  #aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  // Info of the currently logged in user.
  #userInfo: {
    accountImage?: string,
    accountFullName?: string,
  };
  #imageInput?: ImageInputData;
  // Used to disable send button when there is not text input.
  #isTextInputEmpty = true;

  constructor(private view: View = defaultView, {aidaClient, aidaAvailability, syncInfo}: {
    aidaClient: Host.AidaClient.AidaClient,
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation,
  }) {
    super(AiAssistancePanel.panelName);
    this.registerRequiredCSS(aiAssistancePanelStyles);
    this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();

    this.#toggleSearchElementAction =
        UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    this.#aidaClient = aidaClient;
    this.#aidaAvailability = aidaAvailability;
    this.#userInfo = {
      accountImage: syncInfo.accountImage,
      accountFullName: syncInfo.accountFullName,
    };

    this.#historicalConversations = AiHistoryStorage.instance().getHistory().map(item => {
      return new Conversation(item.type, item.history, item.id, true);
    });
  }

  #getChatUiState(): ChatViewState {
    const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    return (this.#aiAssistanceEnabledSetting?.getIfNotDisabled() && !blockedByAge) ? ChatViewState.CHAT_VIEW :
                                                                                     ChatViewState.CONSENT_VIEW;
  }

  #getAiAssistanceEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('ai-assistance-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  #createAgent(conversationType: ConversationType): AiAgent<unknown> {
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
    };
    let agent: AiAgent<unknown>;
    switch (conversationType) {
      case ConversationType.STYLING: {
        agent = new StylingAgent({
          ...options,
          changeManager: this.#changeManager,
        });
        if (isAiAssistanceStylingWithFunctionCallingEnabled()) {
          agent = new StylingAgentWithFunctionCalling({
            ...options,
            changeManager: this.#changeManager,
          });
        }

        break;
      }
      case ConversationType.NETWORK: {
        agent = new NetworkAgent(options);
        break;
      }
      case ConversationType.FILE: {
        agent = new FileAgent(options);
        break;
      }
      case ConversationType.PERFORMANCE: {
        agent = new PerformanceAgent(options);
        break;
      }
      case ConversationType.PERFORMANCE_INSIGHT: {
        agent = new PerformanceInsightsAgent(options);
        break;
      }
    }
    return agent;
  }

  static async instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): Promise<AiAssistancePanel> {
    const {forceNew} = opts;
    if (!panelInstance || forceNew) {
      const aidaClient = new Host.AidaClient.AidaClient();
      const syncInfoPromise = new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
      const [aidaAvailability, syncInfo] =
          await Promise.all([Host.AidaClient.AidaClient.checkAccessPreconditions(), syncInfoPromise]);
      panelInstance = new AiAssistancePanel(defaultView, {aidaClient, aidaAvailability, syncInfo});
    }

    return panelInstance;
  }

  // We select the default agent based on the open panels if
  // there isn't any active conversation.
  #selectDefaultAgentIfNeeded(): void {
    // If there already is an agent and if it is not empty,
    // we don't automatically change the agent. In addition to this,
    // we don't change the current agent when there is a message in flight.
    if ((this.#conversationAgent && this.#conversation && !this.#conversation.isEmpty) || this.#isLoading) {
      return;
    }

    const {hostConfig} = Root.Runtime;
    const isElementsPanelVisible =
        Boolean(UI.Context.Context.instance().flavor(ElementsPanel.ElementsPanel.ElementsPanel));
    const isNetworkPanelVisible = Boolean(UI.Context.Context.instance().flavor(NetworkPanel.NetworkPanel.NetworkPanel));
    const isSourcesPanelVisible = Boolean(UI.Context.Context.instance().flavor(SourcesPanel.SourcesPanel.SourcesPanel));
    const isPerformancePanelVisible =
        Boolean(UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel));

    // Check if the user has an insight expanded in the performance panel sidebar.
    // If they have, we default to the Insights agent; otherwise we fallback to
    // the regular Performance agent.
    // Note that we do not listen to this flavor changing; this code is here to
    // ensure that by default we do not pick the Insights agent if the user has
    // just imported a trace and not done anything else. It doesn't make sense
    // to select the Insights AI agent in that case.
    const userHasExpandedPerfInsight =
        Boolean(UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.SelectedInsight));
    let targetConversationType: ConversationType|undefined = undefined;
    if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
      targetConversationType = ConversationType.STYLING;
    } else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetConversationType = ConversationType.NETWORK;
    } else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      targetConversationType = ConversationType.FILE;
    } else if (
        isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled &&
        hostConfig.devToolsAiAssistancePerformanceAgent?.insightsEnabled && userHasExpandedPerfInsight) {
      targetConversationType = ConversationType.PERFORMANCE_INSIGHT;
    } else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetConversationType = ConversationType.PERFORMANCE;
    }

    if (this.#conversationAgent?.type === targetConversationType) {
      // The above if makes sure even if we have an active agent it's empty
      // So we can just reuse it
      return;
    }

    const agent = targetConversationType ? this.#createAgent(targetConversationType) : undefined;
    this.#updateConversationState(agent);
  }

  #updateConversationState(input?: AiAgent<unknown>|Conversation): void {
    const agent = input instanceof AiAgent ? input : undefined;
    const conversation = input instanceof Conversation ? input : undefined;

    if (this.#conversationAgent !== agent) {
      // Cancel any previous conversation
      this.#cancel();
      this.#messages = [];
      this.#isLoading = false;
      this.#conversation?.archiveConversation();
      this.#conversationAgent = agent;

      // If we get a new agent we need to
      // create a new conversation along side it
      if (agent) {
        this.#conversation = new Conversation(
            agentTypeToConversationType(agent.type),
            [],
            agent.id,
            false,
        );
        this.#historicalConversations.push(this.#conversation);
      }
    }

    if (!agent) {
      this.#conversation = undefined;
      // We need to run doConversation separately
      this.#messages = [];
      // If a no new agent is provided
      // but conversation is
      // update with history conversation
      if (conversation) {
        this.#conversation = conversation;
      }
    }

    if (!this.#conversationAgent && !this.#conversation) {
      this.#selectDefaultAgentIfNeeded();
    }

    this.#onContextSelectionChanged();
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#viewOutput.chatView?.restoreScrollPosition();
    this.#viewOutput.chatView?.focusTextInput();
    void this.#handleAidaAvailabilityChange();
    this.#selectedElement =
        createNodeContext(selectedElementFilter(UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode)));
    this.#selectedRequest =
        createRequestContext(UI.Context.Context.instance().flavor(SDK.NetworkRequest.NetworkRequest));
    this.#selectedCallTree =
        createCallTreeContext(UI.Context.Context.instance().flavor(TimelineUtils.AICallTree.AICallTree));
    this.#selectedPerformanceInsight =
        createPerfInsightContext(UI.Context.Context.instance().flavor(TimelineUtils.InsightAIContext.ActiveInsight));
    this.#selectedFile = createFileContext(UI.Context.Context.instance().flavor(Workspace.UISourceCode.UISourceCode));
    this.#updateConversationState(this.#conversationAgent);

    this.#aiAssistanceEnabledSetting?.addChangeListener(this.requestUpdate, this);
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction.addEventListener(UI.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelineUtils.AICallTree.AICallTree, this.#handleTraceEntryNodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelineUtils.InsightAIContext.ActiveInsight, this.#handlePerfInsightFlavorChange);

    UI.Context.Context.instance().addFlavorChangeListener(
        ElementsPanel.ElementsPanel.ElementsPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        NetworkPanel.NetworkPanel.NetworkPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        SourcesPanel.SourcesPanel.SourcesPanel, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelinePanel.TimelinePanel.TimelinePanel, this.#selectDefaultAgentIfNeeded, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistancePanelOpened);
  }

  override willHide(): void {
    this.#aiAssistanceEnabledSetting?.removeChangeListener(this.requestUpdate, this);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction.removeEventListener(UI.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        TimelineUtils.AICallTree.AICallTree, this.#handleTraceEntryNodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        TimelineUtils.InsightAIContext.ActiveInsight, this.#handlePerfInsightFlavorChange);
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
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel,
        SDK.DOMModel.Events.AttrModified,
        this.#handleDOMNodeAttrChange,
        this,
    );
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel,
        SDK.DOMModel.Events.AttrRemoved,
        this.#handleDOMNodeAttrChange,
        this,
    );
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);
  }

  #handleAidaAvailabilityChange = async(): Promise<void> => {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const syncInfo = await new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
      this.#userInfo = {
        accountImage: syncInfo.accountImage,
        accountFullName: syncInfo.accountFullName,
      };
      this.requestUpdate();
    }
  };

  #handleDOMNodeFlavorChange = (ev: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void => {
    if (this.#selectedElement?.getItem() === ev.data) {
      return;
    }

    this.#selectedElement = createNodeContext(selectedElementFilter(ev.data));
    this.#updateConversationState(this.#conversationAgent);
  };

  #handleDOMNodeAttrChange =
      (ev: Common.EventTarget.EventTargetEvent<{node: SDK.DOMModel.DOMNode, name: string}>): void => {
        if (this.#selectedElement?.getItem() === ev.data.node) {
          if (ev.data.name === 'class' || ev.data.name === 'id') {
            this.requestUpdate();
          }
        }
      };

  #handleNetworkRequestFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void => {
        if (this.#selectedRequest?.getItem() === ev.data) {
          return;
        }

        this.#selectedRequest = Boolean(ev.data) ? new RequestContext(ev.data) : null;
        this.#updateConversationState(this.#conversationAgent);
      };

  #handleTraceEntryNodeFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<TimelineUtils.AICallTree.AICallTree>): void => {
        if (this.#selectedCallTree?.getItem() === ev.data) {
          return;
        }

        this.#selectedCallTree = Boolean(ev.data) ? new CallTreeContext(ev.data) : null;
        this.#updateConversationState(this.#conversationAgent);
      };

  #handlePerfInsightFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<TimelineUtils.InsightAIContext.ActiveInsight>): void => {
        if (this.#selectedPerformanceInsight?.getItem() === ev.data) {
          return;
        }

        this.#selectedPerformanceInsight = Boolean(ev.data) ? new InsightContext(ev.data) : null;
        this.#updateConversationState(this.#conversationAgent);
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
        this.#updateConversationState(this.#conversationAgent);
      };

  #onPrimaryPageChanged(): void {
    if (!this.#imageInput) {
      return;
    }

    this.#imageInput = undefined;
    this.requestUpdate();
  }

  #getChangeSummary(): string|undefined {
    return (isAiAssistancePatchingEnabled() && this.#conversationAgent && !this.#conversation?.isReadOnly) ?
        this.#changeManager.formatChanges(this.#conversationAgent.id, /* includeSourceLocation= */ true) :
        undefined;
  }

  override async performUpdate(): Promise<void> {
    this.view(
        {
          state: this.#getChatUiState(),
          blockedByCrossOrigin: this.#blockedByCrossOrigin,
          aidaAvailability: this.#aidaAvailability,
          isLoading: this.#isLoading,
          messages: this.#messages,
          selectedContext: this.#selectedContext,
          conversationType: this.#conversation?.type,
          isReadOnly: this.#conversation?.isReadOnly ?? false,
          changeSummary: this.#getChangeSummary(),
          inspectElementToggled: this.#toggleSearchElementAction.toggled(),
          userInfo: this.#userInfo,
          canShowFeedbackForm: this.#serverSideLoggingEnabled,
          multimodalInputEnabled:
              isAiAssistanceMultimodalInputEnabled() && this.#conversation?.type === ConversationType.STYLING,
          imageInput: this.#imageInput,
          isDeleteHistoryButtonVisible: Boolean(this.#conversation && !this.#conversation.isEmpty),
          isTextInputDisabled: this.#isTextInputDisabled(),
          emptyStateSuggestions: this.#conversation ? getEmptyStateSuggestions(this.#conversation.type) : [],
          inputPlaceholder: this.#getChatInputPlaceholder(),
          disclaimerText: this.#getDisclaimerText(),
          isTextInputEmpty: this.#isTextInputEmpty,
          onNewChatClick: this.#handleNewChatRequest.bind(this),
          onHistoryClick: this.#onHistoryClicked.bind(this),
          onDeleteClick: this.#onDeleteClicked.bind(this),
          onHelpClick: () => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(AI_ASSISTANCE_HELP);
          },
          onSettingsClick: () => {
            void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
          },
          onTextSubmit: async (text: string, imageInput?: Host.AidaClient.Part) => {
            this.#imageInput = undefined;
            this.#isTextInputEmpty = true;
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceQuerySubmitted);
            await this.#startConversation(text, imageInput);
          },
          onInspectElementClick: this.#handleSelectElementClick.bind(this),
          onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
          onCancelClick: this.#cancel.bind(this),
          onContextClick: this.#handleContextClick.bind(this),
          onNewConversation: this.#handleNewChatRequest.bind(this),
          onTakeScreenshot: isAiAssistanceMultimodalInputEnabled() ? this.#handleTakeScreenshot.bind(this) : undefined,
          onRemoveImageInput: isAiAssistanceMultimodalInputEnabled() ? this.#handleRemoveImageInput.bind(this) :
                                                                       undefined,
          onTextInputChange: this.#handleTextInputChange.bind(this),
        },
        this.#viewOutput, this.contentElement);
  }

  #handleSelectElementClick(): void {
    void this.#toggleSearchElementAction.execute();
  }

  #isTextInputDisabled(): boolean {
    // If the `aiAssistanceSetting` is not enabled
    // or if the user is blocked by age, the text input is disabled.
    const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
    const isBlockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (!aiAssistanceSetting || isBlockedByAge) {
      return true;
    }

    // If the Aida is not available, the text input is disabled.
    const isAidaAvailable = this.#aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE;
    if (!isAidaAvailable) {
      return true;
    }

    // If sending a new message is blocked by cross origin context
    // the text input is disabled.
    if (this.#blockedByCrossOrigin) {
      return true;
    }

    // If there is no current agent if there is no selected context
    // the text input is disabled.
    if (!this.#conversation || !this.#selectedContext) {
      return true;
    }

    return false;
  }

  #getChatInputPlaceholder(): Platform.UIString.LocalizedString {
    const state = this.#getChatUiState();
    if (state === ChatViewState.CONSENT_VIEW || !this.#conversation) {
      return i18nString(UIStrings.followTheSteps);
    }

    if (this.#blockedByCrossOrigin) {
      return lockedString(UIStringsNotTranslate.crossOriginError);
    }

    switch (this.#conversation.type) {
      case ConversationType.STYLING:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForStyling) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForStylingNoContext);
      case ConversationType.FILE:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForFile) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForFileNoContext);
      case ConversationType.NETWORK:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForNetwork) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForNetworkNoContext);
      case ConversationType.PERFORMANCE:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForPerformance) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceNoContext);
      case ConversationType.PERFORMANCE_INSIGHT:
        return this.#selectedContext ?
            lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceInsights) :
            lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceInsightsNoContext);
    }
  }

  #getDisclaimerText(): Platform.UIString.LocalizedString {
    const state = this.#getChatUiState();
    if (state === ChatViewState.CONSENT_VIEW || !this.#conversation || this.#conversation.isReadOnly) {
      return i18nString(UIStrings.inputDisclaimerForEmptyState);
    }

    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    switch (this.#conversation.type) {
      case ConversationType.STYLING:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForStylingEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForStyling);
      case ConversationType.FILE:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForFileEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForFile);
      case ConversationType.NETWORK:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForNetworkEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForNetwork);
      case ConversationType.PERFORMANCE:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForPerformanceEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForPerformance);
      case ConversationType.PERFORMANCE_INSIGHT:
        // TODO(b/393061683): Define these rather than reuse the existing performance agent.
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForPerformanceEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForPerformance);
    }
  }

  #handleFeedbackSubmit(rpcId: Host.AidaClient.RpcGlobalId, rating: Host.AidaClient.Rating, feedback?: string): void {
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
    const context = this.#selectedContext;
    if (context instanceof RequestContext) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          context.getItem(), NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
      return Common.Revealer.reveal(requestLocation);
    }
    if (context instanceof FileContext) {
      return Common.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof CallTreeContext) {
      const item = context.getItem();
      const event = item.selectedNode?.event ?? item.rootNode.event;
      const trace = new SDK.TraceObject.RevealableEvent(event);
      return Common.Revealer.reveal(trace);
    }
    // Node picker is using linkifier.
  }

  handleAction(actionId: string): void {
    if (this.#isLoading) {
      // If running some queries already, focus the input with the abort
      // button and do nothing.
      this.#viewOutput.chatView?.focusTextInput();
      return;
    }

    let targetConversationType: ConversationType|undefined;
    switch (actionId) {
      case 'freestyler.elements-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
        targetConversationType = ConversationType.STYLING;
        break;
      }
      case 'freestyler.element-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
        targetConversationType = ConversationType.STYLING;
        break;
      }
      case 'drjones.network-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
        targetConversationType = ConversationType.NETWORK;
        break;
      }
      case 'drjones.network-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
        targetConversationType = ConversationType.NETWORK;
        break;
      }
      case 'drjones.performance-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanel);
        targetConversationType = ConversationType.PERFORMANCE;
        break;
      }
      case 'drjones.performance-insight-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformanceInsight);
        targetConversationType = ConversationType.PERFORMANCE_INSIGHT;
        break;
      }
      case 'drjones.sources-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
        targetConversationType = ConversationType.FILE;
        break;
      }
      case 'drjones.sources-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
        targetConversationType = ConversationType.FILE;
        break;
      }
    }

    if (!targetConversationType) {
      return;
    }

    let agent = this.#conversationAgent;
    if (!this.#conversation || !this.#conversationAgent || this.#conversation.type !== targetConversationType ||
        this.#conversation?.isEmpty || targetConversationType === ConversationType.PERFORMANCE) {
      agent = this.#createAgent(targetConversationType);
    }
    this.#updateConversationState(agent);
    this.#viewOutput.chatView?.focusTextInput();
  }

  #onHistoryClicked(event: Event): void {
    const target = event.target as Element | undefined;
    const clientRect = target?.getBoundingClientRect();
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {
      useSoftMenu: true,
      x: clientRect?.left,
      y: clientRect?.bottom,
    });

    for (const conversation of [...this.#historicalConversations].reverse()) {
      if (conversation.isEmpty) {
        continue;
      }
      const title = conversation.title;
      if (!title) {
        continue;
      }

      contextMenu.defaultSection().appendCheckboxItem(title, () => {
        void this.#openConversation(conversation);
      }, {checked: (this.#conversation === conversation)});
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
    this.#historicalConversations = [];
    void AiHistoryStorage.instance().deleteAll();
    this.#updateConversationState();
  }

  #onDeleteClicked(): void {
    if (!this.#conversation) {
      return;
    }

    this.#historicalConversations =
        this.#historicalConversations.filter(conversation => conversation !== this.#conversation);
    void AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
    this.#updateConversationState();
    UI.ARIAUtils.alert(i18nString(UIStrings.chatDeleted));
  }

  async #openConversation(conversation: Conversation): Promise<void> {
    if (this.#conversation === conversation) {
      return;
    }

    this.#updateConversationState(conversation);
    await this.#doConversation(conversation.history);
  }

  #handleNewChatRequest(): void {
    this.#updateConversationState();
    UI.ARIAUtils.alert(i18nString(UIStrings.newChatCreated));
  }

  async #handleTakeScreenshot(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      throw new Error('Could not find main target');
    }
    const model = mainTarget.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    if (!model) {
      throw new Error('Could not find model');
    }
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = {isLoading: true};
      this.requestUpdate();
    }, SHOW_LOADING_STATE_TIMEOUT);
    const bytes = await model.captureScreenshot(
        Protocol.Page.CaptureScreenshotRequestFormat.Jpeg,
        SCREENSHOT_QUALITY,
        SDK.ScreenCaptureModel.ScreenshotMode.FROM_VIEWPORT,
    );
    clearTimeout(showLoadingTimeout);
    if (bytes) {
      this.#imageInput = {isLoading: false, data: bytes};
      this.requestUpdate();
      void this.updateComplete.then(() => {
        this.#viewOutput.chatView?.focusTextInput();
      });
    }
  }

  #handleRemoveImageInput(): void {
    this.#imageInput = undefined;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.chatView?.focusTextInput();
    });
  }

  #handleTextInputChange(value: string): void {
    const disableSubmit = !value;
    if (disableSubmit !== this.#isTextInputEmpty) {
      this.#isTextInputEmpty = disableSubmit;
      void this.requestUpdate();
    }
  }

  #runAbortController = new AbortController();
  #cancel(): void {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
  }

  #onContextSelectionChanged(contextToRestore?: ConversationContext<unknown>): void {
    if (!this.#conversationAgent) {
      this.#blockedByCrossOrigin = false;
      return;
    }
    const currentContext = contextToRestore ?? this.#getConversationContext();
    this.#selectedContext = currentContext;
    if (!currentContext) {
      this.#blockedByCrossOrigin = false;
      return;
    }
    this.#blockedByCrossOrigin = !currentContext.isOriginAllowed(this.#conversationAgent.origin);
  }

  #getConversationContext(): ConversationContext<unknown>|null {
    if (!this.#conversation) {
      return null;
    }
    let context: ConversationContext<unknown>|null;
    switch (this.#conversation.type) {
      case ConversationType.STYLING:
        context = this.#selectedElement;
        break;
      case ConversationType.FILE:
        context = this.#selectedFile;
        break;
      case ConversationType.NETWORK:
        context = this.#selectedRequest;
        break;
      case ConversationType.PERFORMANCE:
        context = this.#selectedCallTree;
        break;
      case ConversationType.PERFORMANCE_INSIGHT:
        context = this.#selectedPerformanceInsight;
        break;
    }
    return context;
  }

  async #startConversation(text: string, imageInput?: Host.AidaClient.Part): Promise<void> {
    if (!this.#conversationAgent) {
      return;
    }
    // Cancel any previous in-flight conversation.
    this.#cancel();
    const signal = this.#runAbortController.signal;
    const context = this.#getConversationContext();
    // If a different context is provided, it must be from the same origin.
    if (context && !context.isOriginAllowed(this.#conversationAgent.origin)) {
      // This error should not be reached. If it happens, some
      // invariants do not hold anymore.
      throw new Error('cross-origin context data should not be included');
    }

    const image = isAiAssistanceMultimodalInputEnabled() ? imageInput : undefined;
    const imageId = image ? crypto.randomUUID() : undefined;
    const runner = this.#conversationAgent.run(
        text, {
          signal,
          selected: context,
        },
        image, imageId);
    UI.ARIAUtils.alert(lockedString(UIStringsNotTranslate.answerLoading));
    await this.#doConversation(this.#saveResponsesToCurrentConversation(runner));
    UI.ARIAUtils.alert(lockedString(UIStringsNotTranslate.answerReady));
  }

  async *
      #saveResponsesToCurrentConversation(items: AsyncIterable<ResponseData, void, void>):
          AsyncGenerator<ResponseData, void, void> {
    const currentConversation = this.#conversation;

    for await (const data of items) {
      // We don't want to save partial responses to the conversation history.
      if (data.type !== ResponseType.ANSWER || data.complete) {
        void currentConversation?.addHistoryItem(data);
      }
      yield data;
    }
  }

  async #doConversation(items: Iterable<ResponseData, void, void>|AsyncIterable<ResponseData, void, void>):
      Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      let systemMessage: ModelChatMessage = {
        entity: ChatMessageEntity.MODEL,
        steps: [],
      };
      let step: Step = {isLoading: true};

      /**
       * Commits the step to props only if necessary.
       */
      function commitStep(): void {
        if (systemMessage.steps.at(-1) !== step) {
          systemMessage.steps.push(step);
        }
      }

      this.#isLoading = true;
      for await (const data of items) {
        step.sideEffect = undefined;
        switch (data.type) {
          case ResponseType.USER_QUERY: {
            this.#messages.push({
              entity: ChatMessageEntity.USER,
              text: data.query,
              imageInput: data.imageInput,
            });
            systemMessage = {
              entity: ChatMessageEntity.MODEL,
              steps: [],
            };
            this.#messages.push(systemMessage);
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
            commitStep();
            break;
          }
          case ResponseType.TITLE: {
            step.title = data.title;
            commitStep();
            break;
          }
          case ResponseType.THOUGHT: {
            step.isLoading = false;
            step.thought = data.thought;
            commitStep();
            break;
          }
          case ResponseType.SUGGESTIONS: {
            systemMessage.suggestions = data.suggestions;
            break;
          }
          case ResponseType.SIDE_EFFECT: {
            step.isLoading = false;
            step.code ??= data.code;
            step.sideEffect = {
              onAnswer: (result: boolean) => {
                data.confirm(result);
                step.sideEffect = undefined;
                this.requestUpdate();
              },
            };
            commitStep();
            break;
          }
          case ResponseType.ACTION: {
            step.isLoading = false;
            step.code ??= data.code;
            step.output ??= data.output;
            step.canceled = data.canceled;
            commitStep();
            break;
          }
          case ResponseType.ANSWER: {
            systemMessage.suggestions ??= data.suggestions;
            systemMessage.answer = data.text;
            systemMessage.rpcId = data.rpcId;
            // When there is an answer without any thinking steps, we don't want to show the thinking step.
            if (systemMessage.steps.length === 1 && systemMessage.steps[0].isLoading) {
              systemMessage.steps.pop();
            }
            step.isLoading = false;
            break;
          }
          case ResponseType.ERROR: {
            systemMessage.error = data.error;
            systemMessage.rpcId = undefined;
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
            if (data.error === ErrorType.BLOCK) {
              systemMessage.answer = undefined;
            }
          }
        }

        // Commit update intermediated step when not
        // in read only mode.
        if (!this.#conversation?.isReadOnly) {
          this.requestUpdate();

          // This handles scrolling to the bottom for live conversations when:
          // * User submits the query & the context step is shown.
          // * There is a side effect dialog  shown.
          if (data.type === ResponseType.CONTEXT || data.type === ResponseType.SIDE_EFFECT) {
            this.#viewOutput.chatView?.scrollToBottom();
          }
        }
      }

      this.#isLoading = false;
      this.requestUpdate();
    } finally {
      release();
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
      case 'drjones.performance-insight-context':
      case 'drjones.sources-floating-button':
      case 'drjones.sources-panel-context': {
        void (async () => {
          const view = UI.ViewManager.ViewManager.instance().view(
              AiAssistancePanel.panelName,
          );

          if (view) {
            await UI.ViewManager.ViewManager.instance().showView(
                AiAssistancePanel.panelName,
            );
            const widget = (await view.widget()) as AiAssistancePanel;
            widget.handleAction(actionId);
          }
        })();
        return true;
      }
    }

    return false;
  }
}

function isAiAssistanceMultimodalInputEnabled(): boolean {
  const {hostConfig} = Root.Runtime;
  return Boolean(hostConfig.devToolsFreestyler?.multimodal);
}

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  const {hostConfig} = Root.Runtime;
  return !hostConfig.aidaAvailability?.disallowLogging;
}

function isAiAssistanceStylingWithFunctionCallingEnabled(): boolean {
  const {hostConfig} = Root.Runtime;
  return Boolean(hostConfig.devToolsFreestyler?.functionCalling);
}
