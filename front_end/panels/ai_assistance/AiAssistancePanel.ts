// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../network/forward/forward.js';
import * as TimelinePanel from '../timeline/timeline.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import aiAssistancePanelStyles from './aiAssistancePanel.css.js';
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
import {ExploreWidget} from './components/ExploreWidget.js';
import {isAiAssistancePatchingEnabled} from './PatchWidget.js';

const {html} = Lit;

const AI_ASSISTANCE_SEND_FEEDBACK = 'https://crbug.com/364805393' as Platform.DevToolsPath.UrlString;
const AI_ASSISTANCE_HELP = 'https://developer.chrome.com/docs/devtools/ai-assistance';
const SCREENSHOT_QUALITY = 100;
const SHOW_LOADING_STATE_TIMEOUT = 100;
const JPEG_MIME_TYPE = 'image/jpeg';

const UIStrings = {
  /**
   * @description AI assistance UI text creating a new chat.
   */
  newChat: 'New chat',
  /**
   * @description AI assistance UI tooltip text for the help button.
   */
  help: 'Help',
  /**
   * @description AI assistant UI tooltip text for the settings button (gear icon).
   */
  settings: 'Settings',
  /**
   * @description AI assistant UI tooltip sending feedback.
   */
  sendFeedback: 'Send feedback',
  /**
   * @description Announcement text for screen readers when a new chat is created.
   */
  newChatCreated: 'New chat created',
  /**
   * @description Announcement text for screen readers when the chat is deleted.
   */
  chatDeleted: 'Chat deleted',
  /**
   * @description AI assistance UI text creating selecting a history entry.
   */
  history: 'History',
  /**
   * @description AI assistance UI text deleting the current chat session from local history.
   */
  deleteChat: 'Delete local chat',
  /**
   * @description AI assistance UI text that deletes all local history entries.
   */
  clearChatHistory: 'Clear local chats',
  /**
   *@description AI assistance UI text for the export conversation button.
   */
  exportConversation: 'Export conversation',
  /**
   * @description AI assistance UI text explains that he user had no pas conversations.
   */
  noPastConversations: 'No past conversations',
  /**
   * @description Placeholder text for an inactive text field. When active, it's used for the user's input to the GenAI assistance.
   */
  followTheSteps: 'Follow the steps above to ask a question',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForEmptyState: 'This is an experimental AI feature and won\'t always get it right.',
  /**
   * @description The message shown in a toast when the response is copied to the clipboard.
   */
  responseCopiedToClipboard: 'Response copied to clipboard',
} as const;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   * @description Announcement text for screen readers when the conversation starts.
   */
  answerLoading: 'Answer loading',
  /**
   * @description Announcement text for screen readers when the answer comes.
   */
  answerReady: 'Answer ready',
  /**
   * @description Placeholder text for the input shown when the conversation is blocked because a cross-origin context was selected.
   */
  crossOriginError: 'To talk about data from another origin, start a new chat',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForStyling: 'Ask a question about the selected element',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForNetwork: 'Ask a question about the selected network request',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForFile: 'Ask a question about the selected file',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformance: 'Ask a question about the selected item and its call tree',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceWithNoRecording: 'Record a performance trace and select an item to ask a question',
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForStylingNoContext: 'Select an element to ask a question',
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForNetworkNoContext: 'Select a network request to ask a question',
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForFileNoContext: 'Select a file to ask a question',
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForPerformanceNoContext: 'Select an item to ask a question',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceInsights: 'Ask a question about the selected performance insight',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceInsightsNoContext: 'Select a performance insight to ask a question',
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceTrace: 'Ask a question about the selected performance trace',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceTraceNoContext: 'Select a performance trace to ask a question',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForStyling:
      'Chat messages and any data the inspected page can access via Web APIs are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForStylingEnterpriseNoLogging:
      'Chat messages and any data the inspected page can access via Web APIs are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNetwork:
      'Chat messages and the selected network request are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNetworkEnterpriseNoLogging:
      'Chat messages and the selected network request are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFile:
      'Chat messages and the selected file are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFileEnterpriseNoLogging:
      'Chat messages and the selected file are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForPerformance:
      'Chat messages and trace data from your performance trace are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForPerformanceEnterpriseNoLogging:
      'Chat messages and data from your performance trace are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Message displayed in toast in case of any failures while taking a screenshot of the page.
   */
  screenshotFailureMessage: 'Failed to take a screenshot. Please try again.',
  /**
   * @description Message displayed in toast in case of any failures while uploading an image file as input.
   */
  uploadImageFailureMessage: 'Failed to upload image. Please try again.',
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

async function getEmptyStateSuggestions(
    context: AiAssistanceModel.ConversationContext<unknown>|null,
    conversationType?: AiAssistanceModel.ConversationType): Promise<AiAssistanceModel.ConversationSuggestion[]> {
  if (context) {
    const specialSuggestions = await context.getSuggestions();

    if (specialSuggestions) {
      return specialSuggestions;
    }
  }

  if (!conversationType) {
    return [];
  }

  switch (conversationType) {
    case AiAssistanceModel.ConversationType.STYLING:
      return [
        {title: 'What can you help me with?', jslogContext: 'styling-default'},
        {title: 'Why isn’t this element visible?', jslogContext: 'styling-default'},
        {title: 'How do I center this element?', jslogContext: 'styling-default'},
      ];
    case AiAssistanceModel.ConversationType.FILE:
      return [
        {title: 'What does this script do?', jslogContext: 'file-default'},
        {title: 'Is the script optimized for performance?', jslogContext: 'file-default'},
        {title: 'Does the script handle user input safely?', jslogContext: 'file-default'},
      ];
    case AiAssistanceModel.ConversationType.NETWORK:
      return [
        {title: 'Why is this network request taking so long?', jslogContext: 'network-default'},
        {title: 'Are there any security headers present?', jslogContext: 'network-default'},
        {title: 'Why is the request failing?', jslogContext: 'network-default'},
      ];
    case AiAssistanceModel.ConversationType.PERFORMANCE_FULL:
      return [
        {title: 'What performance issues exist with my page?', jslogContext: 'performance-default'},
      ];
    case AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT:
    case AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE: {
      const focus = context?.getItem() as TimelineUtils.AIContext.AgentFocus | null;
      if (focus?.data.type === 'call-tree') {
        return [
          {title: 'What\'s the purpose of this work?', jslogContext: 'performance-default'},
          {title: 'Where is time being spent?', jslogContext: 'performance-default'},
          {title: 'How can I optimize this?', jslogContext: 'performance-default'},
        ];
      }

      return [
        {title: 'Help me optimize my page load performance', jslogContext: 'performance-insights-default'},
      ];
    }

    default:
      Platform.assertNever(conversationType, 'Unknown conversation type');
  }
}

interface ToolbarViewInput {
  onNewChatClick: () => void;
  populateHistoryMenu: (contextMenu: UI.ContextMenu.ContextMenu) => void;
  onDeleteClick: () => void;
  onExportConversationClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  isLoading: boolean;
  showChatActions: boolean;
  showActiveConversationActions: boolean;
}

export type ViewInput = ChatViewProps&ToolbarViewInput;
export interface PanelViewOutput {
  chatView?: ChatView;
}

type View = (input: ViewInput, output: PanelViewOutput, target: HTMLElement) => void;

function toolbarView(input: ToolbarViewInput): Lit.LitTemplate {
  // clang-format off
  return html`
    <div class="toolbar-container" role="toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
      ${input.showChatActions
        ? html`<devtools-button
          title=${i18nString(UIStrings.newChat)}
          aria-label=${i18nString(UIStrings.newChat)}
          .iconName=${'plus'}
          .jslogContext=${'freestyler.new-chat'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onNewChatClick}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-menu-button
          title=${i18nString(UIStrings.history)}
          aria-label=${i18nString(UIStrings.history)}
          .iconName=${'history'}
          .jslogContext=${'freestyler.history'}
          .populateMenuCall=${input.populateHistoryMenu}
        ></devtools-menu-button>`
          : Lit.nothing}
        ${input.showActiveConversationActions ? html`
          <devtools-button
              title=${i18nString(UIStrings.deleteChat)}
              aria-label=${i18nString(UIStrings.deleteChat)}
              .iconName=${'bin'}
              .jslogContext=${'freestyler.delete'}
              .variant=${Buttons.Button.Variant.TOOLBAR}
              @click=${input.onDeleteClick}>
          </devtools-button>
          <devtools-button
            title=${i18nString(UIStrings.exportConversation)}
            aria-label=${i18nString(UIStrings.exportConversation)}
            .iconName=${'download'}
            .disabled=${input.isLoading}
            .jslogContext=${'export-ai-conversation'}
            .variant=${Buttons.Button.Variant.TOOLBAR}
            @click=${input.onExportConversationClick}>
          </devtools-button>`
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
  Lit.render(
    html`
      ${toolbarView(input)}
      <div class="ai-assistance-view-container">
        ${input.state !== ChatViewState.EXPLORE_VIEW
          ? html` <devtools-ai-chat-view
              .props=${input}
              ${Lit.Directives.ref((el: Element | undefined) => {
                if (!el || !(el instanceof ChatView)) {
                  return;
                }

                output.chatView = el;
              })}
            ></devtools-ai-chat-view>`
          : html`<devtools-widget
              class="explore"
              .widgetConfig=${UI.Widget.widgetConfig(ExploreWidget)}
            ></devtools-widget>`}
      </div>
    `,
    target,
  );
  // clang-format on
}

function createNodeContext(node: SDK.DOMModel.DOMNode|null): AiAssistanceModel.NodeContext|null {
  if (!node) {
    return null;
  }
  return new AiAssistanceModel.NodeContext(node);
}

function createFileContext(file: Workspace.UISourceCode.UISourceCode|null): AiAssistanceModel.FileContext|null {
  if (!file) {
    return null;
  }
  return new AiAssistanceModel.FileContext(file);
}

function createRequestContext(request: SDK.NetworkRequest.NetworkRequest|null): AiAssistanceModel.RequestContext|null {
  if (!request) {
    return null;
  }
  return new AiAssistanceModel.RequestContext(request);
}

function createPerformanceTraceContext(focus: TimelineUtils.AIContext.AgentFocus|null):
    AiAssistanceModel.PerformanceTraceContext|null {
  if (!focus) {
    return null;
  }
  return new AiAssistanceModel.PerformanceTraceContext(focus);
}

function agentToConversationType(agent: AiAssistanceModel.AiAgent<unknown>): AiAssistanceModel.ConversationType {
  if (agent instanceof AiAssistanceModel.StylingAgent) {
    return AiAssistanceModel.ConversationType.STYLING;
  }

  if (agent instanceof AiAssistanceModel.NetworkAgent) {
    return AiAssistanceModel.ConversationType.NETWORK;
  }
  if (agent instanceof AiAssistanceModel.FileAgent) {
    return AiAssistanceModel.ConversationType.FILE;
  }

  if (agent instanceof AiAssistanceModel.PerformanceAgent) {
    return agent.getConversationType();
  }

  throw new Error('Provided agent does not have a corresponding conversation type');
}

let panelInstance: AiAssistancePanel;
export class AiAssistancePanel extends UI.Panel.Panel {
  static panelName = 'freestyler';

  // NodeJS debugging does not have Elements panel, thus this action might not exist.
  #toggleSearchElementAction?: UI.ActionRegistration.Action;
  #aidaClient: Host.AidaClient.AidaClient;
  #viewOutput: PanelViewOutput = {};
  #serverSideLoggingEnabled = isAiAssistanceServerSideLoggingEnabled();
  #aiAssistanceEnabledSetting: Common.Settings.Setting<boolean>|undefined;
  #changeManager = new AiAssistanceModel.ChangeManager();
  #mutex = new Common.Mutex.Mutex();

  #conversationAgent?: AiAssistanceModel.AiAgent<unknown>;
  #conversation?: AiAssistanceModel.Conversation;

  #selectedFile: AiAssistanceModel.FileContext|null = null;
  #selectedElement: AiAssistanceModel.NodeContext|null = null;
  #selectedPerformanceTrace: AiAssistanceModel.PerformanceTraceContext|null = null;
  #selectedRequest: AiAssistanceModel.RequestContext|null = null;

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
  #selectedContext: AiAssistanceModel.ConversationContext<unknown>|null = null;
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
  #timelinePanelInstance: TimelinePanel.TimelinePanel.TimelinePanel|null = null;
  #conversationHandler: AiAssistanceModel.ConversationHandler;
  #runAbortController = new AbortController();

  constructor(private view: View = defaultView, {aidaClient, aidaAvailability, syncInfo}: {
    aidaClient: Host.AidaClient.AidaClient,
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation,
  }) {
    super(AiAssistancePanel.panelName);
    this.registerRequiredCSS(aiAssistancePanelStyles);
    this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();

    this.#aidaClient = aidaClient;
    this.#aidaAvailability = aidaAvailability;
    this.#userInfo = {
      accountImage: syncInfo.accountImage,
      accountFullName: syncInfo.accountFullName,
    };
    this.#conversationHandler =
        AiAssistanceModel.ConversationHandler.instance({aidaClient: this.#aidaClient, aidaAvailability});

    if (UI.ActionRegistry.ActionRegistry.instance().hasAction('elements.toggle-element-search')) {
      this.#toggleSearchElementAction =
          UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    }
    AiAssistanceModel.AiHistoryStorage.instance().addEventListener(
        AiAssistanceModel.Events.HISTORY_DELETED, this.#onHistoryDeleted, this);
  }

  #getChatUiState(): ChatViewState {
    const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;

    // Special case due to the way its handled downstream quirks
    if (this.#aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
      return ChatViewState.CHAT_VIEW;
    }

    if (!this.#aiAssistanceEnabledSetting?.getIfNotDisabled() || blockedByAge) {
      return ChatViewState.CONSENT_VIEW;
    }

    if (this.#conversation?.type) {
      return ChatViewState.CHAT_VIEW;
    }

    return ChatViewState.EXPLORE_VIEW;
  }

  #getAiAssistanceEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('ai-assistance-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
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

  /**
   * Called when the TimelinePanel instance changes. We use this to listen to
   * the status of if the user is viewing a trace or not, and update the
   * placeholder text in the panel accordingly. We do this because if the user
   * has an active trace, we show different text than if they are viewing
   * the performance panel but have no trace imported.
   */
  #bindTimelineTraceListener(): void {
    const timelinePanel = UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel);

    // Avoid binding multiple times.
    if (timelinePanel === this.#timelinePanelInstance) {
      return;
    }

    // Ensure we clear up any listener from the old TimelinePanel instance.
    this.#timelinePanelInstance?.removeEventListener(
        TimelinePanel.TimelinePanel.Events.IS_VIEWING_TRACE, this.requestUpdate, this);
    this.#timelinePanelInstance = timelinePanel;

    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.addEventListener(
          TimelinePanel.TimelinePanel.Events.IS_VIEWING_TRACE, this.requestUpdate, this);
    }
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
    const viewManager = UI.ViewManager.ViewManager.instance();
    const isElementsPanelVisible = viewManager.isViewVisible('elements');
    const isNetworkPanelVisible = viewManager.isViewVisible('network');
    const isSourcesPanelVisible = viewManager.isViewVisible('sources');
    const isPerformancePanelVisible = viewManager.isViewVisible('timeline');

    // Check if the user has an insight expanded in the performance panel sidebar.
    // If they have, we default to the Insights agent; otherwise we fallback to
    // the regular Performance agent.
    // Note that we do not listen to this flavor changing; this code is here to
    // ensure that by default we do not pick the Insights agent if the user has
    // just imported a trace and not done anything else. It doesn't make sense
    // to select the Insights AI agent in that case.
    const userHasExpandedPerfInsight =
        Boolean(UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.SelectedInsight));
    let targetConversationType: AiAssistanceModel.ConversationType|undefined = undefined;
    if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
      targetConversationType = AiAssistanceModel.ConversationType.STYLING;
    } else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetConversationType = AiAssistanceModel.ConversationType.NETWORK;
    } else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      targetConversationType = AiAssistanceModel.ConversationType.FILE;
    } else if (
        isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled &&
        hostConfig.devToolsAiAssistancePerformanceAgent?.insightsEnabled && userHasExpandedPerfInsight) {
      targetConversationType = AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT;
    } else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetConversationType = AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE;
    }

    if (this.#conversation?.type === targetConversationType) {
      // The above if makes sure even if we have an active agent it's empty
      // So we can just reuse it
      return;
    }

    const agent = targetConversationType ?
        this.#conversationHandler.createAgent(targetConversationType, this.#changeManager) :
        undefined;
    this.#updateConversationState({agent});
  }

  #updateConversationState(opts?: {
    agent?: AiAssistanceModel.AiAgent<unknown>,
    conversation?: AiAssistanceModel.Conversation,
  }): void {
    if (this.#conversationAgent !== opts?.agent) {
      // Cancel any previous conversation
      this.#cancel();
      this.#messages = [];
      this.#isLoading = false;
      this.#conversation?.archiveConversation();
      this.#conversationAgent = opts?.agent;

      // If we get a new agent we need to
      // create a new conversation along side it
      if (opts?.agent) {
        this.#conversation = new AiAssistanceModel.Conversation(
            agentToConversationType(opts?.agent),
            [],
            opts?.agent.id,
            false,
        );
      }
    }

    if (!opts?.agent) {
      this.#conversation = undefined;
      // We need to run doConversation separately
      this.#messages = [];
      // If a no new agent is provided
      // but conversation is
      // update with history conversation
      if (opts?.conversation) {
        this.#conversation = opts?.conversation;
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
    this.#selectedPerformanceTrace =
        createPerformanceTraceContext(UI.Context.Context.instance().flavor(TimelineUtils.AIContext.AgentFocus));
    this.#selectedFile = createFileContext(UI.Context.Context.instance().flavor(Workspace.UISourceCode.UISourceCode));
    this.#updateConversationState({agent: this.#conversationAgent});

    this.#aiAssistanceEnabledSetting?.addChangeListener(this.requestUpdate, this);
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.addEventListener(UI.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelineUtils.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);

    UI.ViewManager.ViewManager.instance().addEventListener(
        UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, this.#selectDefaultAgentIfNeeded, this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);

    // Listen to changes in the Timeline Panel state. We also call the
    // function immediately in case the Performance panel is already shown
    // when AI Assistance is loaded.
    UI.Context.Context.instance().addFlavorChangeListener(
        TimelinePanel.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
    this.#bindTimelineTraceListener();
    this.#selectDefaultAgentIfNeeded();

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistancePanelOpened);
  }

  override willHide(): void {
    this.#aiAssistanceEnabledSetting?.removeChangeListener(this.requestUpdate, this);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.removeEventListener(
        UI.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        TimelineUtils.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI.ViewManager.ViewManager.instance().removeEventListener(
        UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, this.#selectDefaultAgentIfNeeded, this);
    UI.Context.Context.instance().removeFlavorChangeListener(
        TimelinePanel.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
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

    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.removeEventListener(
          TimelinePanel.TimelinePanel.Events.IS_VIEWING_TRACE, this.requestUpdate, this);
      this.#timelinePanelInstance = null;
    }
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
    this.#updateConversationState({agent: this.#conversationAgent});
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

        this.#selectedRequest = Boolean(ev.data) ? new AiAssistanceModel.RequestContext(ev.data) : null;
        this.#updateConversationState({agent: this.#conversationAgent});
      };

  #handlePerformanceTraceFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<TimelineUtils.AIContext.AgentFocus>): void => {
        if (this.#selectedPerformanceTrace?.getItem() === ev.data) {
          return;
        }

        this.#selectedPerformanceTrace =
            Boolean(ev.data) ? new AiAssistanceModel.PerformanceTraceContext(ev.data) : null;

        let conversationType: AiAssistanceModel.ConversationType|undefined;
        if (ev.data) {
          if (ev.data.data.type === 'full') {
            conversationType = AiAssistanceModel.ConversationType.PERFORMANCE_FULL;
          } else if (ev.data.data.type === 'insight') {
            conversationType = AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT;
          } else if (ev.data.data.type === 'call-tree') {
            conversationType = AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE;
          } else {
            Platform.assertNever(ev.data.data, 'Unknown agent focus');
          }
        }

        let agent = this.#conversationAgent;
        if (conversationType && agent instanceof AiAssistanceModel.PerformanceAgent &&
            agent.getConversationType() !== conversationType) {
          agent = this.#conversationHandler.createAgent(conversationType);
        }

        this.#updateConversationState({agent: this.#conversationAgent});
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
        this.#selectedFile = new AiAssistanceModel.FileContext(ev.data);
        this.#updateConversationState({agent: this.#conversationAgent});
      };

  #onPrimaryPageChanged(): void {
    if (!this.#imageInput) {
      return;
    }

    this.#imageInput = undefined;
    this.requestUpdate();
  }

  #getChangeSummary(): string|undefined {
    if (!isAiAssistancePatchingEnabled() || !this.#conversationAgent || this.#conversation?.isReadOnly) {
      return;
    }

    return this.#changeManager.formatChangesForPatching(this.#conversationAgent.id, /* includeSourceLocation= */ true);
  }

  override async performUpdate(): Promise<void> {
    const emptyStateSuggestions = await getEmptyStateSuggestions(this.#selectedContext, this.#conversation?.type);

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
          inspectElementToggled: this.#toggleSearchElementAction?.toggled() ?? false,
          userInfo: this.#userInfo,
          canShowFeedbackForm: this.#serverSideLoggingEnabled,
          multimodalInputEnabled: isAiAssistanceMultimodalInputEnabled() &&
              this.#conversation?.type === AiAssistanceModel.ConversationType.STYLING,
          imageInput: this.#imageInput,
          showChatActions: this.#shouldShowChatActions(),
          showActiveConversationActions: Boolean(this.#conversation && !this.#conversation.isEmpty),
          isTextInputDisabled: this.#isTextInputDisabled(),
          emptyStateSuggestions,
          inputPlaceholder: this.#getChatInputPlaceholder(),
          disclaimerText: this.#getDisclaimerText(),
          isTextInputEmpty: this.#isTextInputEmpty,
          changeManager: this.#changeManager,
          uploadImageInputEnabled: isAiAssistanceMultimodalUploadInputEnabled() &&
              this.#conversation?.type === AiAssistanceModel.ConversationType.STYLING,
          onNewChatClick: this.#handleNewChatRequest.bind(this),
          populateHistoryMenu: this.#populateHistoryMenu.bind(this),
          onDeleteClick: this.#onDeleteClicked.bind(this),
          onExportConversationClick: this.#onExportConversationClick.bind(this),
          onHelpClick: () => {
            UI.UIUtils.openInNewTab(AI_ASSISTANCE_HELP);
          },
          onSettingsClick: () => {
            void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
          },
          onTextSubmit: async (
              text: string, imageInput?: Host.AidaClient.Part,
              multimodalInputType?: AiAssistanceModel.MultimodalInputType) => {
            this.#imageInput = undefined;
            this.#isTextInputEmpty = true;
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceQuerySubmitted);
            await this.#startConversation(text, imageInput, multimodalInputType);
          },
          onInspectElementClick: this.#handleSelectElementClick.bind(this),
          onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
          onCancelClick: this.#cancel.bind(this),
          onContextClick: this.#handleContextClick.bind(this),
          onNewConversation: this.#handleNewChatRequest.bind(this),
          onTakeScreenshot: isAiAssistanceMultimodalInputEnabled() ? this.#handleTakeScreenshot.bind(this) : undefined,
          onRemoveImageInput: isAiAssistanceMultimodalInputEnabled() ? this.#handleRemoveImageInput.bind(this) :
                                                                       undefined,
          onCopyResponseClick: this.#onCopyResponseClick.bind(this),
          onTextInputChange: this.#handleTextInputChange.bind(this),
          onLoadImage: isAiAssistanceMultimodalUploadInputEnabled() ? this.#handleLoadImage.bind(this) : undefined,
        },
        this.#viewOutput, this.contentElement);
  }

  #onCopyResponseClick(message: ModelChatMessage): void {
    const markdown = getResponseMarkdown(message);
    if (markdown) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(markdown);
      Snackbars.Snackbar.Snackbar.show({
        message: i18nString(UIStrings.responseCopiedToClipboard),
      });
    }
  }

  #handleSelectElementClick(): void {
    UI.Context.Context.instance().setFlavor(
        Common.ReturnToPanel.ReturnToPanelFlavor, new Common.ReturnToPanel.ReturnToPanelFlavor(this.panelName));
    void this.#toggleSearchElementAction?.execute();
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

  #shouldShowChatActions(): boolean {
    const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
    const isBlockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (!aiAssistanceSetting || isBlockedByAge) {
      return false;
    }
    if (this.#aidaAvailability === Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL ||
        this.#aidaAvailability === Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED) {
      return false;
    }
    return true;
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
      case AiAssistanceModel.ConversationType.STYLING:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForStyling) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForStylingNoContext);
      case AiAssistanceModel.ConversationType.FILE:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForFile) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForFileNoContext);
      case AiAssistanceModel.ConversationType.NETWORK:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForNetwork) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForNetworkNoContext);
      case AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE: {
        const perfPanel = UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel);
        if (perfPanel?.hasActiveTrace()) {
          return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForPerformance) :
                                         lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceNoContext);
        }
        return lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceWithNoRecording);
      }
      case AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT:
        return this.#selectedContext ?
            lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceInsights) :
            lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceInsightsNoContext);
      case AiAssistanceModel.ConversationType.PERFORMANCE_FULL:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceTrace) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceTraceNoContext);
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
      case AiAssistanceModel.ConversationType.STYLING:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForStylingEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForStyling);
      case AiAssistanceModel.ConversationType.FILE:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForFileEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForFile);
      case AiAssistanceModel.ConversationType.NETWORK:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForNetworkEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForNetwork);

      // It is deliberate that both Performance agents use the same disclaimer
      // text and this has been approved by Privacy.
      case AiAssistanceModel.ConversationType.PERFORMANCE_FULL:
      case AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE:
      case AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT:
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
    if (context instanceof AiAssistanceModel.RequestContext) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          context.getItem(), NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
      return Common.Revealer.reveal(requestLocation);
    }
    if (context instanceof AiAssistanceModel.FileContext) {
      return Common.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof AiAssistanceModel.PerformanceTraceContext) {
      const focus = context.getItem().data;
      if (focus.type === 'full') {
        return;
      }
      if (focus.type === 'call-tree') {
        const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
        const trace = new SDK.TraceObject.RevealableEvent(event);
        return Common.Revealer.reveal(trace);
      }
      if (focus.type === 'insight') {
        return Common.Revealer.reveal(focus.insight);
      }
      Platform.assertNever(focus, 'Unknown agent focus');
    }
    // Node picker is using linkifier.
  }

  handleAction(actionId: string, opts?: Record<string, unknown>): void {
    if (this.#isLoading && !opts?.['prompt']) {
      // If running some queries already, and this action doesn't contain a predefined prompt, focus the input with the abort
      // button and do nothing.
      this.#viewOutput.chatView?.focusTextInput();
      return;
    }

    let targetConversationType: AiAssistanceModel.ConversationType|undefined;
    switch (actionId) {
      case 'freestyler.elements-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
        targetConversationType = AiAssistanceModel.ConversationType.STYLING;
        break;
      }
      case 'freestyler.element-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
        targetConversationType = AiAssistanceModel.ConversationType.STYLING;
        break;
      }
      case 'drjones.network-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
        targetConversationType = AiAssistanceModel.ConversationType.NETWORK;
        break;
      }
      case 'drjones.network-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
        targetConversationType = AiAssistanceModel.ConversationType.NETWORK;
        break;
      }
      case 'drjones.performance-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree);
        targetConversationType = AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE;
        break;
      }
      case 'drjones.performance-insight-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformanceInsight);
        targetConversationType = AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT;
        break;
      }
      case 'drjones.performance-panel-full-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformanceFullButton);
        targetConversationType = AiAssistanceModel.ConversationType.PERFORMANCE_FULL;
        break;
      }
      case 'drjones.sources-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
        targetConversationType = AiAssistanceModel.ConversationType.FILE;
        break;
      }
      case 'drjones.sources-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
        targetConversationType = AiAssistanceModel.ConversationType.FILE;
        break;
      }
    }

    if (!targetConversationType) {
      return;
    }

    let agent = this.#conversationAgent;
    if (!this.#conversation || !this.#conversationAgent || this.#conversation.type !== targetConversationType ||
        this.#conversation?.isEmpty ||
        targetConversationType === AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE ||
        (agent instanceof AiAssistanceModel.PerformanceAgent &&
         agent.getConversationType() !== targetConversationType)) {
      agent = this.#conversationHandler.createAgent(targetConversationType, this.#changeManager);
    }
    this.#updateConversationState({agent});
    const predefinedPrompt = opts?.['prompt'];
    if (predefinedPrompt && typeof predefinedPrompt === 'string') {
      this.#imageInput = undefined;
      this.#isTextInputEmpty = true;
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceQuerySubmitted);
      if (this.#blockedByCrossOrigin) {
        this.#handleNewChatRequest();
      }
      void this.#startConversation(predefinedPrompt);
    } else {
      this.#viewOutput.chatView?.focusTextInput();
    }
  }

  #populateHistoryMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const historicalConversations = AiAssistanceModel.AiHistoryStorage.instance().getHistory().map(
        serializedConversation => AiAssistanceModel.Conversation.fromSerializedConversation(serializedConversation));
    for (const conversation of historicalConversations.reverse()) {
      if (conversation.isEmpty) {
        continue;
      }
      const title = conversation.title;
      if (!title) {
        continue;
      }

      contextMenu.defaultSection().appendCheckboxItem(title, () => {
        void this.#openHistoricConversation(conversation);
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
          void AiAssistanceModel.AiHistoryStorage.instance().deleteAll();
        },
        {
          disabled: historyEmpty,
        },
    );
  }

  #onHistoryDeleted(): void {
    this.#updateConversationState();
  }

  #onDeleteClicked(): void {
    if (!this.#conversation) {
      return;
    }

    void AiAssistanceModel.AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
    this.#updateConversationState();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.chatDeleted));
  }

  async #onExportConversationClick(): Promise<void> {
    if (!this.#conversation) {
      return;
    }
    const markdownContent = this.#conversation.getConversationMarkdown();
    const titleFormatted = Platform.StringUtilities.toSnakeCase(this.#conversation.title || '');
    const contentData = new TextUtils.ContentData.ContentData(markdownContent, false, 'text/markdown');
    const filename = `devtools_${titleFormatted || 'conversation'}.md` as Platform.DevToolsPath.RawPathString;
    await Workspace.FileManager.FileManager.instance().save(filename, contentData, true);
    Workspace.FileManager.FileManager.instance().close(filename);
  }

  async #openHistoricConversation(conversation: AiAssistanceModel.Conversation): Promise<void> {
    if (this.#conversation === conversation) {
      return;
    }

    this.#updateConversationState({conversation});
    await this.#doConversation(conversation.history);
  }

  #handleNewChatRequest(): void {
    this.#updateConversationState();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.newChatCreated));
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
      this.#imageInput = {
        isLoading: false,
        data: bytes,
        mimeType: JPEG_MIME_TYPE,
        inputType: AiAssistanceModel.MultimodalInputType.SCREENSHOT
      };
      this.requestUpdate();
      void this.updateComplete.then(() => {
        this.#viewOutput.chatView?.focusTextInput();
      });
    } else {
      this.#imageInput = undefined;
      this.requestUpdate();
      Snackbars.Snackbar.Snackbar.show({
        message: lockedString(UIStringsNotTranslate.screenshotFailureMessage),
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

  async #handleLoadImage(file: File): Promise<void> {
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = {isLoading: true};
      this.requestUpdate();
    }, SHOW_LOADING_STATE_TIMEOUT);
    const reader = new FileReader();
    let dataUrl: string|undefined;
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader result was not a string.'));
          }
        };
        reader.readAsDataURL(file);
      });
    } catch {
      clearTimeout(showLoadingTimeout);
      this.#imageInput = undefined;
      this.requestUpdate();
      void this.updateComplete.then(() => {
        this.#viewOutput.chatView?.focusTextInput();
      });
      Snackbars.Snackbar.Snackbar.show({
        message: lockedString(UIStringsNotTranslate.uploadImageFailureMessage),
      });
      return;
    }

    clearTimeout(showLoadingTimeout);
    if (!dataUrl) {
      return;
    }
    const commaIndex = dataUrl.indexOf(',');
    const bytes = dataUrl.substring(commaIndex + 1);
    this.#imageInput = {
      isLoading: false,
      data: bytes,
      mimeType: file.type,
      inputType: AiAssistanceModel.MultimodalInputType.UPLOADED_IMAGE
    };
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.chatView?.focusTextInput();
    });
  }

  #cancel(): void {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
  }

  #onContextSelectionChanged(): void {
    if (!this.#conversationAgent) {
      this.#blockedByCrossOrigin = false;
      return;
    }
    this.#selectedContext = this.#getConversationContext(this.#conversation);
    if (!this.#selectedContext) {
      this.#blockedByCrossOrigin = false;

      // Clear out any text the user has entered into the input but never
      // submitted now they have no active context
      this.#viewOutput.chatView?.clearTextInput();
      return;
    }
    this.#blockedByCrossOrigin = !this.#selectedContext.isOriginAllowed(this.#conversationAgent.origin);
  }

  #getConversationContext(conversation?: AiAssistanceModel.Conversation):
      AiAssistanceModel.ConversationContext<unknown>|null {
    if (!conversation) {
      return null;
    }
    let context: AiAssistanceModel.ConversationContext<unknown>|null;
    switch (conversation.type) {
      case AiAssistanceModel.ConversationType.STYLING:
        context = this.#selectedElement;
        break;
      case AiAssistanceModel.ConversationType.FILE:
        context = this.#selectedFile;
        break;
      case AiAssistanceModel.ConversationType.NETWORK:
        context = this.#selectedRequest;
        break;
      case AiAssistanceModel.ConversationType.PERFORMANCE_FULL:
      case AiAssistanceModel.ConversationType.PERFORMANCE_CALL_TREE:
      case AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT:
        context = this.#selectedPerformanceTrace;
        break;
    }
    return context;
  }

  async #startConversation(
      text: string, imageInput?: Host.AidaClient.Part,
      multimodalInputType?: AiAssistanceModel.MultimodalInputType): Promise<void> {
    if (!this.#conversationAgent) {
      return;
    }
    // Cancel any previous in-flight conversation.
    this.#cancel();
    const signal = this.#runAbortController.signal;
    const context = this.#getConversationContext(this.#conversation);
    // If a different context is provided, it must be from the same origin.
    if (context && !context.isOriginAllowed(this.#conversationAgent.origin)) {
      // This error should not be reached. If it happens, some
      // invariants do not hold anymore.
      throw new Error('cross-origin context data should not be included');
    }

    const image = isAiAssistanceMultimodalInputEnabled() ? imageInput : undefined;
    const imageId = image ? crypto.randomUUID() : undefined;
    const multimodalInput = image && imageId && multimodalInputType ? {
      input: image,
      id: imageId,
      type: multimodalInputType,
    } :
                                                                      undefined;
    if (this.#conversation) {
      void VisualLogging.logFunctionCall(`start-conversation-${this.#conversation.type}`, 'ui');
    }
    const generator = this.#conversationAgent.run(
        text, {
          signal,
          selected: context,
        },
        multimodalInput);
    const generatorWithHistory = this.#conversationHandler.handleConversationWithHistory(generator, this.#conversation);
    await this.#doConversation(generatorWithHistory);
  }

  async #doConversation(
      items: Iterable<AiAssistanceModel.ResponseData, void, void>|
      AsyncIterable<AiAssistanceModel.ResponseData, void, void>): Promise<void> {
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
      let announcedAnswerLoading = false;
      let announcedAnswerReady = false;
      for await (const data of items) {
        step.sideEffect = undefined;
        switch (data.type) {
          case AiAssistanceModel.ResponseType.USER_QUERY: {
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
          case AiAssistanceModel.ResponseType.QUERYING: {
            step = {isLoading: true};
            if (!systemMessage.steps.length) {
              systemMessage.steps.push(step);
            }

            break;
          }
          case AiAssistanceModel.ResponseType.CONTEXT: {
            step.title = data.title;
            step.contextDetails = data.details;
            step.isLoading = false;
            commitStep();
            break;
          }
          case AiAssistanceModel.ResponseType.TITLE: {
            step.title = data.title;
            commitStep();
            break;
          }
          case AiAssistanceModel.ResponseType.THOUGHT: {
            step.isLoading = false;
            step.thought = data.thought;
            commitStep();
            break;
          }
          case AiAssistanceModel.ResponseType.SUGGESTIONS: {
            systemMessage.suggestions = data.suggestions;
            break;
          }
          case AiAssistanceModel.ResponseType.SIDE_EFFECT: {
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
          case AiAssistanceModel.ResponseType.ACTION: {
            step.isLoading = false;
            step.code ??= data.code;
            step.output ??= data.output;
            step.canceled = data.canceled;
            commitStep();
            break;
          }
          case AiAssistanceModel.ResponseType.ANSWER: {
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
          case AiAssistanceModel.ResponseType.ERROR: {
            systemMessage.error = data.error;
            systemMessage.rpcId = undefined;
            const lastStep = systemMessage.steps.at(-1);
            if (lastStep) {
              // Mark the last step as cancelled to make the UI feel better.
              if (data.error === AiAssistanceModel.ErrorType.ABORT) {
                lastStep.canceled = true;
                // If error happens while the step is still loading remove it.
              } else if (lastStep.isLoading) {
                systemMessage.steps.pop();
              }
            }
            if (data.error === AiAssistanceModel.ErrorType.BLOCK) {
              systemMessage.answer = undefined;
            }
          }
        }

        // Commit update intermediate step when not
        // in read only mode.
        if (!this.#conversation?.isReadOnly) {
          this.requestUpdate();

          // This handles scrolling to the bottom for live conversations when:
          // * User submits the query & the context step is shown.
          // * There is a side effect dialog  shown.
          if (data.type === AiAssistanceModel.ResponseType.CONTEXT ||
              data.type === AiAssistanceModel.ResponseType.SIDE_EFFECT) {
            this.#viewOutput.chatView?.scrollToBottom();
          }

          // Announce as status update to screen readers when:
          // * Context is received (e.g. Analyzing the prompt)
          // * Answer started streaming
          // * Answer finished streaming
          switch (data.type) {
            case AiAssistanceModel.ResponseType.CONTEXT:
              UI.ARIAUtils.LiveAnnouncer.status(data.title);
              break;
            case AiAssistanceModel.ResponseType.ANSWER: {
              if (!data.complete && !announcedAnswerLoading) {
                announcedAnswerLoading = true;
                UI.ARIAUtils.LiveAnnouncer.status(lockedString(UIStringsNotTranslate.answerLoading));
              } else if (data.complete && !announcedAnswerReady) {
                announcedAnswerReady = true;
                UI.ARIAUtils.LiveAnnouncer.status(lockedString(UIStringsNotTranslate.answerReady));
              }
            }
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

export function getResponseMarkdown(message: ModelChatMessage): string {
  const contentParts = ['## AI'];

  for (const step of message.steps) {
    if (step.title) {
      contentParts.push(`### ${step.title}`);
    }
    if (step.contextDetails) {
      contentParts.push(AiAssistanceModel.Conversation.generateContextDetailsMarkdown(step.contextDetails));
    }
    if (step.thought) {
      contentParts.push(step.thought);
    }
    if (step.code) {
      contentParts.push(`**Code executed:**\n\`\`\`\n${step.code.trim()}\n\`\`\``);
    }
    if (step.output) {
      contentParts.push(`**Data returned:**\n\`\`\`\n${step.output}\n\`\`\``);
    }
  }
  if (message.answer) {
    contentParts.push(`### Answer\n\n${message.answer}`);
  }
  return contentParts.join('\n\n');
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string, opts?: Record<string, unknown>): boolean {
    switch (actionId) {
      case 'freestyler.elements-floating-button':
      case 'freestyler.element-panel-context':
      case 'drjones.network-floating-button':
      case 'drjones.network-panel-context':
      case 'drjones.performance-panel-full-context':
      case 'drjones.performance-panel-context':
      case 'drjones.performance-insight-context':
      case 'drjones.sources-floating-button':
      case 'drjones.sources-panel-context': {
        void (async () => {
          const view = UI.ViewManager.ViewManager.instance().view(
              AiAssistancePanel.panelName,
          );

          if (!view) {
            return;
          }

          await UI.ViewManager.ViewManager.instance().showView(
              AiAssistancePanel.panelName,
          );

          const minDrawerSize = UI.InspectorView.InspectorView.instance().totalSize() / 4;
          if (UI.InspectorView.InspectorView.instance().drawerSize() < minDrawerSize) {
            // If the drawer is too small, resize it to the quarter of the total size.
            // This ensures the AI Assistance panel has enough space to be usable when opened via an action.
            UI.InspectorView.InspectorView.instance().setDrawerSize(minDrawerSize);
          }

          const widget = (await view.widget()) as AiAssistancePanel;
          widget.handleAction(actionId, opts);
        })();
        return true;
      }
    }

    return false;
  }
}

function isAiAssistanceMultimodalUploadInputEnabled(): boolean {
  return isAiAssistanceMultimodalInputEnabled() &&
      Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.multimodalUploadInput);
}

function isAiAssistanceMultimodalInputEnabled(): boolean {
  return Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.multimodal);
}

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
