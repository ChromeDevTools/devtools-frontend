// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Badges from '../../models/badges/badges.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../network/forward/forward.js';
import * as NetworkPanel from '../network/network.js';
import * as TimelinePanel from '../timeline/timeline.js';

import aiAssistancePanelStyles from './aiAssistancePanel.css.js';
import {
  type AnswerPart,
  type ChatMessage,
  ChatMessageEntity,
  ChatView,
  type ImageInputData,
  type ModelChatMessage,
  type Props as ChatViewProps,
  type Step
} from './components/ChatView.js';
import {DisabledWidget} from './components/DisabledWidget.js';
import {ExploreWidget} from './components/ExploreWidget.js';
import {MarkdownRendererWithCodeBlock} from './components/MarkdownRendererWithCodeBlock.js';
import {PerformanceAgentMarkdownRenderer} from './components/PerformanceAgentMarkdownRenderer.js';
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
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceTrace: 'Ask a question about the selected performance trace',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceTraceNoContext: 'Record or select a performance trace to ask a question',
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
    context: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null,
    conversation?: AiAssistanceModel.AiConversation.AiConversation):
    Promise<AiAssistanceModel.AiAgent.ConversationSuggestion[]> {
  if (context) {
    const specialSuggestions = await context.getSuggestions();

    if (specialSuggestions) {
      return specialSuggestions;
    }
  }

  if (!conversation?.type || conversation.isReadOnly) {
    return [];
  }

  switch (conversation.type) {
    case AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING:
      return [
        {title: 'What can you help me with?', jslogContext: 'styling-default'},
        {title: 'Why isn’t this element visible?', jslogContext: 'styling-default'},
        {title: 'How do I center this element?', jslogContext: 'styling-default'},
      ];
    case AiAssistanceModel.AiHistoryStorage.ConversationType.FILE:
      return [
        {title: 'What does this script do?', jslogContext: 'file-default'},
        {title: 'Is the script optimized for performance?', jslogContext: 'file-default'},
        {title: 'Does the script handle user input safely?', jslogContext: 'file-default'},
      ];
    case AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK:
      return [
        {title: 'Why is this network request taking so long?', jslogContext: 'network-default'},
        {title: 'Are there any security headers present?', jslogContext: 'network-default'},
        {title: 'Why is the request failing?', jslogContext: 'network-default'},
      ];
    case AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE: {
      return [
        {title: 'What performance issues exist with my page?', jslogContext: 'performance-default'},
      ];
    }

    default:
      Platform.assertNever(conversation.type, 'Unknown conversation type');
  }
}

function getMarkdownRenderer(
    context: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null,
    conversation?: AiAssistanceModel.AiConversation.AiConversation): MarkdownRendererWithCodeBlock {
  if (context instanceof AiAssistanceModel.PerformanceAgent.PerformanceTraceContext) {
    if (!context.external) {
      const focus = context.getItem();
      return new PerformanceAgentMarkdownRenderer(
          focus.parsedTrace.data.Meta.mainFrameId, focus.lookupEvent.bind(focus), focus.parsedTrace);
    }
  } else if (conversation?.type === AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE) {
    // Handle historical conversations (can't linkify anything).
    return new PerformanceAgentMarkdownRenderer();
  }

  return new MarkdownRendererWithCodeBlock();
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

export const enum ViewState {
  DISABLED_VIEW = 'disabled-view',
  CHAT_VIEW = 'chat-view',
  EXPLORE_VIEW = 'explore-view'
}

type PanelViewInput = {
  state: ViewState.CHAT_VIEW,
  props: ChatViewProps,
}|{
  state: ViewState.DISABLED_VIEW,
  props: {aidaAvailability: Host.AidaClient.AidaAccessPreconditions},
}|{
  state: ViewState.EXPLORE_VIEW,
};

export type ViewInput = ToolbarViewInput&PanelViewInput;
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
        <devtools-link
          class="toolbar-feedback-link"
          title=${i18nString(UIStrings.sendFeedback)}
          href=${AI_ASSISTANCE_SEND_FEEDBACK}
          jslogcontext=${'freestyler.send-feedback'}
        >${i18nString(UIStrings.sendFeedback)}</devtools-link>
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
  function renderState(): Lit.TemplateResult {
    switch (input.state) {
      case ViewState.CHAT_VIEW:
        return html`<devtools-ai-chat-view
          .props=${input.props}
          ${Lit.Directives.ref((el: Element | undefined) => {
            if (!el || !(el instanceof ChatView)) {
              return;
            }

            output.chatView = el;
          })}
        ></devtools-ai-chat-view>`;
      case ViewState.EXPLORE_VIEW:
        return html`<devtools-widget
          class="fill-panel"
          .widgetConfig=${UI.Widget.widgetConfig(ExploreWidget)}
        ></devtools-widget>`;

      case ViewState.DISABLED_VIEW:
        return html`<devtools-widget
          class="fill-panel"
          .widgetConfig=${UI.Widget.widgetConfig(DisabledWidget, input.props)}
        ></devtools-widget>`;
    }
  }

  Lit.render(
    html`
      ${toolbarView(input)}
      <div class="ai-assistance-view-container">${renderState()}</div>
    `,
    target
  );
  // clang-format on
}

function createNodeContext(node: SDK.DOMModel.DOMNode|null): AiAssistanceModel.StylingAgent.NodeContext|null {
  if (!node) {
    return null;
  }
  return new AiAssistanceModel.StylingAgent.NodeContext(node);
}

function createFileContext(file: Workspace.UISourceCode.UISourceCode|null): AiAssistanceModel.FileAgent.FileContext|
    null {
  if (!file) {
    return null;
  }
  return new AiAssistanceModel.FileAgent.FileContext(file);
}

function createRequestContext(request: SDK.NetworkRequest.NetworkRequest|null):
    AiAssistanceModel.NetworkAgent.RequestContext|null {
  if (!request) {
    return null;
  }
  const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
  return new AiAssistanceModel.NetworkAgent.RequestContext(request, calculator);
}

function createPerformanceTraceContext(focus: AiAssistanceModel.AIContext.AgentFocus|null):
    AiAssistanceModel.PerformanceAgent.PerformanceTraceContext|null {
  if (!focus) {
    return null;
  }
  return new AiAssistanceModel.PerformanceAgent.PerformanceTraceContext(focus);
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
  #changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
  #mutex = new Common.Mutex.Mutex();

  #conversation?: AiAssistanceModel.AiConversation.AiConversation;

  #selectedFile: AiAssistanceModel.FileAgent.FileContext|null = null;
  #selectedElement: AiAssistanceModel.StylingAgent.NodeContext|null = null;
  #selectedPerformanceTrace: AiAssistanceModel.PerformanceAgent.PerformanceTraceContext|null = null;
  #selectedRequest: AiAssistanceModel.NetworkAgent.RequestContext|null = null;

  // Messages displayed in the `ChatView` component.
  #messages: ChatMessage[] = [];

  // Whether the UI should show loading or not.
  #isLoading = false;
  // Selected conversation context. The reason we keep this as a
  // state field rather than using `#getConversationContext` is that,
  // there is a case where the context differs from the selectedElement (or other selected context type).
  // Specifically, it allows restoring the previous context when a new selection is cross-origin.
  // See `#onContextSelectionChanged` for details.
  #selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null = null;
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
  #runAbortController = new AbortController();
  #additionalContextItemsFromFloaty: UI.Floaty.FloatyContextSelection[] = [];

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

    if (UI.ActionRegistry.ActionRegistry.instance().hasAction('elements.toggle-element-search')) {
      this.#toggleSearchElementAction =
          UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    }
    AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().addEventListener(
        AiAssistanceModel.AiHistoryStorage.Events.HISTORY_DELETED, this.#onHistoryDeleted, this);
  }

  async #getPanelViewInput(): Promise<PanelViewInput> {
    const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;

    if (this.#aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE ||
        !this.#aiAssistanceEnabledSetting?.getIfNotDisabled() || blockedByAge) {
      return {
        state: ViewState.DISABLED_VIEW,
        props: {
          aidaAvailability: this.#aidaAvailability,
        },
      };
    }

    if (this.#conversation) {
      const emptyStateSuggestions = await getEmptyStateSuggestions(this.#selectedContext, this.#conversation);
      const markdownRenderer = getMarkdownRenderer(this.#selectedContext, this.#conversation);
      return {
        state: ViewState.CHAT_VIEW,
        props: {
          additionalFloatyContext: this.#additionalContextItemsFromFloaty,
          blockedByCrossOrigin: this.#blockedByCrossOrigin,
          isLoading: this.#isLoading,
          messages: this.#messages,
          selectedContext: this.#selectedContext,
          conversationType: this.#conversation.type,
          isReadOnly: this.#conversation.isReadOnly ?? false,
          changeSummary: this.#getChangeSummary(),
          inspectElementToggled: this.#toggleSearchElementAction?.toggled() ?? false,
          userInfo: this.#userInfo,
          canShowFeedbackForm: this.#serverSideLoggingEnabled,
          multimodalInputEnabled: isAiAssistanceMultimodalInputEnabled() &&
              this.#conversation.type === AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
          imageInput: this.#imageInput,
          isTextInputDisabled: this.#isTextInputDisabled(),
          emptyStateSuggestions,
          inputPlaceholder: this.#getChatInputPlaceholder(),
          disclaimerText: this.#getDisclaimerText(),
          isTextInputEmpty: this.#isTextInputEmpty,
          changeManager: this.#changeManager,
          uploadImageInputEnabled: isAiAssistanceMultimodalUploadInputEnabled() &&
              this.#conversation.type === AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
          markdownRenderer,
          onTextSubmit: async (
              text: string, imageInput?: Host.AidaClient.Part,
              multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => {
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
        }
      };
    }

    return {
      state: ViewState.EXPLORE_VIEW,
    };
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

  #bindFloatyListener(): void {
    const additionalContexts = UI.Context.Context.instance().flavor(UI.Floaty.FloatyFlavor);
    if (!additionalContexts) {
      return;
    }
    this.#additionalContextItemsFromFloaty = additionalContexts.selectedContexts;
    this.requestUpdate();
  }

  #getDefaultConversationType(): AiAssistanceModel.AiHistoryStorage.ConversationType|undefined {
    const {hostConfig} = Root.Runtime;
    const viewManager = UI.ViewManager.ViewManager.instance();
    const isElementsPanelVisible = viewManager.isViewVisible('elements');
    const isNetworkPanelVisible = viewManager.isViewVisible('network');
    const isSourcesPanelVisible = viewManager.isViewVisible('sources');
    const isPerformancePanelVisible = viewManager.isViewVisible('timeline');

    let targetConversationType: AiAssistanceModel.AiHistoryStorage.ConversationType|undefined;
    if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
      targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING;
    } else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK;
    } else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.FILE;
    } else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE;
    }

    return targetConversationType;
  }

  // We select the default agent based on the open panels if
  // there isn't any active conversation.
  #selectDefaultAgentIfNeeded(): void {
    // If there already is an agent and if it is not empty,
    // we don't automatically change the agent. In addition to this,
    // we don't change the current agent when there is a message in flight.
    if ((this.#conversation && !this.#conversation.isEmpty) || this.#isLoading) {
      return;
    }
    const targetConversationType = this.#getDefaultConversationType();
    if (this.#conversation?.type === targetConversationType) {
      // The above if makes sure even if we have an active agent it's empty
      // So we can just reuse it
      return;
    }
    const conversation = targetConversationType ?
        new AiAssistanceModel.AiConversation.AiConversation(
            targetConversationType, [], undefined, false, this.#aidaClient, this.#changeManager) :
        undefined;
    this.#updateConversationState(conversation);
  }

  #updateConversationState(
      conversation?: AiAssistanceModel.AiConversation.AiConversation,
      ): void {
    if (this.#conversation !== conversation) {
      // Cancel any previous conversation
      this.#cancel();
      this.#messages = [];
      this.#isLoading = false;
      this.#conversation?.archiveConversation();

      if (!conversation) {
        const conversationType = this.#getDefaultConversationType();
        if (conversationType) {
          conversation = new AiAssistanceModel.AiConversation.AiConversation(
              conversationType, [], undefined, false, this.#aidaClient, this.#changeManager);
        }
      }

      this.#conversation = conversation;
    }

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
        createPerformanceTraceContext(UI.Context.Context.instance().flavor(AiAssistanceModel.AIContext.AgentFocus));
    this.#selectedFile = createFileContext(UI.Context.Context.instance().flavor(Workspace.UISourceCode.UISourceCode));
    this.#updateConversationState(this.#conversation);

    this.#aiAssistanceEnabledSetting?.addChangeListener(this.requestUpdate, this);
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.addEventListener(UI.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().addFlavorChangeListener(
        AiAssistanceModel.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
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

    if (Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled) {
      UI.Context.Context.instance().addFlavorChangeListener(UI.Floaty.FloatyFlavor, this.#bindFloatyListener, this);
      this.#bindFloatyListener();
    }
  }

  override willHide(): void {
    super.willHide();
    this.#aiAssistanceEnabledSetting?.removeChangeListener(this.requestUpdate, this);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.removeEventListener(
        UI.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI.Context.Context.instance().removeFlavorChangeListener(
        AiAssistanceModel.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
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
    this.#updateConversationState(this.#conversation);
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

        if (Boolean(ev.data)) {
          const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
          this.#selectedRequest = new AiAssistanceModel.NetworkAgent.RequestContext(ev.data, calculator);
        } else {
          this.#selectedRequest = null;
        }
        this.#updateConversationState(this.#conversation);
      };

  #handlePerformanceTraceFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<AiAssistanceModel.AIContext.AgentFocus>): void => {
        if (this.#selectedPerformanceTrace?.getItem() === ev.data) {
          return;
        }

        this.#selectedPerformanceTrace =
            Boolean(ev.data) ? new AiAssistanceModel.PerformanceAgent.PerformanceTraceContext(ev.data) : null;

        this.#updateConversationState(this.#conversation);
      };

  #handleUISourceCodeFlavorChange =
      (ev: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void => {
        const newFile = ev.data;

        if (!newFile || this.#selectedFile?.getItem() === newFile) {
          return;
        }
        this.#selectedFile = new AiAssistanceModel.FileAgent.FileContext(ev.data);
        this.#updateConversationState(this.#conversation);
      };

  #onPrimaryPageChanged(): void {
    if (!this.#imageInput) {
      return;
    }

    this.#imageInput = undefined;
    this.requestUpdate();
  }

  #getChangeSummary(): string|undefined {
    if (!isAiAssistancePatchingEnabled() || !this.#conversation || this.#conversation?.isReadOnly) {
      return;
    }

    return this.#changeManager.formatChangesForPatching(this.#conversation.id, /* includeSourceLocation= */ true);
  }

  #getToolbarInput(): ToolbarViewInput {
    return {
      isLoading: this.#isLoading,
      showChatActions: this.#shouldShowChatActions(),
      showActiveConversationActions: Boolean(this.#conversation && !this.#conversation.isEmpty),
      onNewChatClick: this.#handleNewChatRequest.bind(this),
      populateHistoryMenu: this.#populateHistoryMenu.bind(this),
      onDeleteClick: this.#onDeleteClicked.bind(this),
      onExportConversationClick: this.#onExportConversationClick.bind(this),
      onHelpClick: () => {
        UIHelpers.openInNewTab(AI_ASSISTANCE_HELP);
      },
      onSettingsClick: () => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
      },
    };
  }

  override async performUpdate(): Promise<void> {
    this.view(
        {
          ...this.#getToolbarInput(),
          ...await this.#getPanelViewInput(),
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
    if (!this.#conversation) {
      return i18nString(UIStrings.followTheSteps);
    }

    if (this.#blockedByCrossOrigin) {
      return lockedString(UIStringsNotTranslate.crossOriginError);
    }

    switch (this.#conversation.type) {
      case AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForStyling) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForStylingNoContext);
      case AiAssistanceModel.AiHistoryStorage.ConversationType.FILE:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForFile) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForFileNoContext);
      case AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK:
        return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForNetwork) :
                                       lockedString(UIStringsNotTranslate.inputPlaceholderForNetworkNoContext);
      case AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE: {
        const perfPanel = UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel);
        if (perfPanel?.hasActiveTrace()) {
          return this.#selectedContext ?
              lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceTrace) :
              lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceTraceNoContext);
        }

        return lockedString(UIStringsNotTranslate.inputPlaceholderForPerformanceWithNoRecording);
      }
    }
  }

  #getDisclaimerText(): Platform.UIString.LocalizedString {
    if (!this.#conversation || this.#conversation.isReadOnly) {
      return i18nString(UIStrings.inputDisclaimerForEmptyState);
    }

    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    switch (this.#conversation.type) {
      case AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForStylingEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForStyling);
      case AiAssistanceModel.AiHistoryStorage.ConversationType.FILE:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForFileEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForFile);
      case AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK:
        if (noLogging) {
          return lockedString(UIStringsNotTranslate.inputDisclaimerForNetworkEnterpriseNoLogging);
        }
        return lockedString(UIStringsNotTranslate.inputDisclaimerForNetwork);

      // It is deliberate that both Performance agents use the same disclaimer
      // text and this has been approved by Privacy.
      case AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE:
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
    if (context instanceof AiAssistanceModel.NetworkAgent.RequestContext) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          context.getItem(), NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
      return Common.Revealer.reveal(requestLocation);
    }
    if (context instanceof AiAssistanceModel.FileAgent.FileContext) {
      return Common.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof AiAssistanceModel.PerformanceAgent.PerformanceTraceContext) {
      const focus = context.getItem();
      if (focus.callTree) {
        const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
        const revealable = new SDK.TraceObject.RevealableEvent(event);
        return Common.Revealer.reveal(revealable);
      }
      if (focus.insight) {
        return Common.Revealer.reveal(focus.insight);
      }
    }
    // Node picker is using linkifier.
  }

  #canExecuteQuery(): boolean {
    const isBrandedBuild = Boolean(Root.Runtime.hostConfig.aidaAvailability?.enabled);
    const isBlockedByAge = Boolean(Root.Runtime.hostConfig.aidaAvailability?.blockedByAge);
    const isAidaAvailable = Boolean(this.#aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    const isUserOptedIn = Boolean(this.#aiAssistanceEnabledSetting?.getIfNotDisabled());

    return isBrandedBuild && isAidaAvailable && isUserOptedIn && !isBlockedByAge;
  }

  async handleAction(actionId: string, opts?: Record<string, unknown>): Promise<void> {
    if (this.#isLoading && !opts?.['prompt']) {
      // If running some queries already, and this action doesn't contain a predefined prompt, focus the input with the abort
      // button and do nothing.
      this.#viewOutput.chatView?.focusTextInput();
      return;
    }

    let targetConversationType: AiAssistanceModel.AiHistoryStorage.ConversationType|undefined;
    switch (actionId) {
      case 'freestyler.elements-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING;
        break;
      }
      case 'freestyler.element-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING;
        break;
      }
      case 'drjones.network-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK;
        break;
      }
      case 'drjones.network-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK;
        break;
      }
      case 'drjones.performance-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE;
        break;
      }
      case 'drjones.sources-floating-button': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.FILE;
        break;
      }
      case 'drjones.sources-panel-context': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
        targetConversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.FILE;
        break;
      }
    }

    if (!targetConversationType) {
      return;
    }

    let conversation = this.#conversation;
    if (!this.#conversation || this.#conversation.type !== targetConversationType || this.#conversation.isEmpty) {
      conversation = new AiAssistanceModel.AiConversation.AiConversation(
          targetConversationType, [], undefined, false, this.#aidaClient, this.#changeManager);
    }
    this.#updateConversationState(conversation);
    const predefinedPrompt = opts?.['prompt'];
    if (predefinedPrompt && typeof predefinedPrompt === 'string') {
      if (!this.#canExecuteQuery()) {
        return;
      }

      this.#imageInput = undefined;
      this.#isTextInputEmpty = true;
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceQuerySubmitted);
      if (this.#blockedByCrossOrigin) {
        this.#handleNewChatRequest();
      }
      await this.#startConversation(predefinedPrompt);
    } else {
      this.#viewOutput.chatView?.focusTextInput();
    }
  }

  #populateHistoryMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const historicalConversations = AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().getHistory().map(
        serializedConversation =>
            AiAssistanceModel.AiConversation.AiConversation.fromSerializedConversation(serializedConversation));
    for (const conversation of historicalConversations.reverse()) {
      if (conversation.isEmpty || !conversation.title) {
        continue;
      }

      contextMenu.defaultSection().appendCheckboxItem(conversation.title, () => {
        void this.#openHistoricConversation(conversation);
      }, {checked: (this.#conversation?.id === conversation.id), jslogContext: 'freestyler.history-item'});
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
          void AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
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

    void AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
    this.#updateConversationState();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.chatDeleted));
  }

  async #onExportConversationClick(): Promise<void> {
    if (!this.#conversation) {
      return;
    }

    const markdownContent = this.#conversation.getConversationMarkdown();
    const contentData = new TextUtils.ContentData.ContentData(markdownContent, false, 'text/markdown');

    const titleFormatted = Platform.StringUtilities.toSnakeCase(this.#conversation.title || '');
    const prefix = 'devtools_';
    const suffix = '.md';
    const maxTitleLength = 64 - prefix.length - suffix.length;
    let finalTitle = titleFormatted || 'conversation';
    if (finalTitle.length > maxTitleLength) {
      finalTitle = finalTitle.substring(0, maxTitleLength);
    }
    const filename = `${prefix}${finalTitle}${suffix}` as Platform.DevToolsPath.RawPathString;

    await Workspace.FileManager.FileManager.instance().save(filename, contentData, true);
    Workspace.FileManager.FileManager.instance().close(filename);
  }

  async #openHistoricConversation(conversation: AiAssistanceModel.AiConversation.AiConversation): Promise<void> {
    if (this.#conversation?.id === conversation.id) {
      return;
    }

    this.#updateConversationState(conversation);
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
        inputType: AiAssistanceModel.AiAgent.MultimodalInputType.SCREENSHOT
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
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader result was not a string.'));
          }
        };
        reader.readAsDataURL(file);
      });
      const commaIndex = dataUrl.indexOf(',');
      const bytes = dataUrl.substring(commaIndex + 1);
      this.#imageInput = {
        isLoading: false,
        data: bytes,
        mimeType: file.type,
        inputType: AiAssistanceModel.AiAgent.MultimodalInputType.UPLOADED_IMAGE
      };
    } catch {
      this.#imageInput = undefined;
      Snackbars.Snackbar.Snackbar.show({
        message: lockedString(UIStringsNotTranslate.uploadImageFailureMessage),
      });
    }

    clearTimeout(showLoadingTimeout);
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.chatView?.focusTextInput();
    });
  }

  #cancel(): void {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
  }

  // Indicates whether the new conversation context is blocked due to cross-origin restrictions.
  // This happens when the conversation's context has a different
  // origin than the selected context.
  get #blockedByCrossOrigin(): boolean {
    if (!this.#conversation) {
      return false;
    }
    this.#selectedContext = this.#getConversationContext(this.#conversation);
    if (!this.#selectedContext) {
      return false;
    }
    return !this.#selectedContext.isOriginAllowed(this.#conversation.origin);
  }

  #getConversationContext(conversation?: AiAssistanceModel.AiConversation.AiConversation):
      AiAssistanceModel.AiAgent.ConversationContext<unknown>|null {
    if (!conversation) {
      return null;
    }
    let context: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null;
    switch (conversation.type) {
      case AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING:
        context = this.#selectedElement;
        break;
      case AiAssistanceModel.AiHistoryStorage.ConversationType.FILE:
        context = this.#selectedFile;
        break;
      case AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK:
        context = this.#selectedRequest;
        break;
      case AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE:
        context = this.#selectedPerformanceTrace;
        break;
    }
    return context;
  }

  async #startConversation(
      text: string,
      imageInput?: Host.AidaClient.Part,
      multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType,
      ): Promise<void> {
    if (!this.#conversation) {
      return;
    }
    // Cancel any previous in-flight conversation.
    this.#cancel();
    const signal = this.#runAbortController.signal;
    const context = this.#getConversationContext(this.#conversation);
    // If a different context is provided, it must be from the same origin.
    if (context && !context.isOriginAllowed(this.#conversation.origin)) {
      // This error should not be reached. If it happens, some
      // invariants do not hold anymore.
      throw new Error('cross-origin context data should not be included');
    }
    if (this.#conversation.isEmpty) {
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.STARTED_AI_CONVERSATION);
    }
    const multimodalInput = isAiAssistanceMultimodalInputEnabled() && imageInput && multimodalInputType ? {
      input: imageInput,
      id: crypto.randomUUID(),
      type: multimodalInputType,
    } :
                                                                                                          undefined;

    void VisualLogging.logFunctionCall(`start-conversation-${this.#conversation.type}`, 'ui');

    await this.#doConversation(
        this.#conversation.run(
            text, {
              signal,
              selected: context,
              extraContext: this.#additionalContextItemsFromFloaty,
            },
            multimodalInput),
    );
  }

  async #doConversation(
      items: Iterable<AiAssistanceModel.AiAgent.ResponseData, void, void>|
      AsyncIterable<AiAssistanceModel.AiAgent.ResponseData, void, void>): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      let systemMessage: ModelChatMessage = {
        entity: ChatMessageEntity.MODEL,
        parts: [],
      };
      let step: Step = {isLoading: true};

      /**
       * Commits the step to props only if necessary.
       */
      function commitStep(): void {
        const lastPart = systemMessage.parts.at(-1);
        if (lastPart?.type === 'step' && lastPart.step === step) {
          return;
        }
        systemMessage.parts.push({
          type: 'step',
          step,
        });
      }

      this.#isLoading = true;
      let announcedAnswerLoading = false;
      let announcedAnswerReady = false;
      for await (const data of items) {
        step.sideEffect = undefined;
        switch (data.type) {
          case AiAssistanceModel.AiAgent.ResponseType.USER_QUERY: {
            this.#messages.push({
              entity: ChatMessageEntity.USER,
              text: data.query,
              imageInput: data.imageInput,
            });
            systemMessage = {
              entity: ChatMessageEntity.MODEL,
              parts: [],
            };
            this.#messages.push(systemMessage);
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.QUERYING: {
            step = {isLoading: true};
            if (!systemMessage.parts.length) {
              commitStep();
            }

            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.CONTEXT: {
            step.title = data.title;
            step.contextDetails = data.details;
            step.isLoading = false;
            commitStep();
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.TITLE: {
            step.title = data.title;
            commitStep();
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.THOUGHT: {
            step.isLoading = false;
            step.thought = data.thought;
            commitStep();
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.SUGGESTIONS: {
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === 'answer') {
              lastPart.suggestions = data.suggestions;
            } else {
              systemMessage.parts.push({
                type: 'answer',
                text: '',
                suggestions: data.suggestions,
              });
            }
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.SIDE_EFFECT: {
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
          case AiAssistanceModel.AiAgent.ResponseType.ACTION: {
            step.isLoading = false;
            step.code ??= data.code;
            step.output ??= data.output;
            step.canceled = data.canceled;
            commitStep();
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.ANSWER: {
            systemMessage.rpcId = data.rpcId;
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === 'answer') {
              lastPart.text = data.text;
              if (data.suggestions) {
                lastPart.suggestions = data.suggestions;
              }
            } else {
              const newPart: AnswerPart = {
                type: 'answer',
                text: data.text,
              };
              if (data.suggestions) {
                newPart.suggestions = data.suggestions;
              }
              systemMessage.parts.push(newPart);
            }

            // When there is an answer without any thinking steps, we don't want to show the thinking step.
            // TODO(crbug.com/463323934): Remove specially handling this case.
            if (systemMessage.parts.length > 1) {
              const firstPart = systemMessage.parts[0];
              if (firstPart.type === 'step' && firstPart.step.isLoading && !firstPart.step.thought &&
                  !firstPart.step.code && !firstPart.step.contextDetails) {
                systemMessage.parts.shift();
              }
            }
            step.isLoading = false;
            break;
          }
          case AiAssistanceModel.AiAgent.ResponseType.ERROR: {
            systemMessage.error = data.error;
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === 'step') {
              const lastStep = lastPart.step;
              // Mark the last step as cancelled to make the UI feel better.
              if (data.error === AiAssistanceModel.AiAgent.ErrorType.ABORT) {
                lastStep.canceled = true;
                // If error happens while the step is still loading remove it.
              } else if (lastStep.isLoading) {
                systemMessage.parts.pop();
              }
            }

            if (data.error === AiAssistanceModel.AiAgent.ErrorType.BLOCK) {
              const lastPart = systemMessage.parts.at(-1);
              if (lastPart?.type === 'answer') {
                systemMessage.parts.pop();
              }
            }
            break;
          }
        }

        // Commit update intermediate step when not
        // in read only mode.
        if (!this.#conversation?.isReadOnly) {
          this.requestUpdate();

          // This handles scrolling to the bottom for live conversations when:
          // * User submits the query & the context step is shown.
          // * There is a side effect dialog  shown.
          if (data.type === AiAssistanceModel.AiAgent.ResponseType.CONTEXT ||
              data.type === AiAssistanceModel.AiAgent.ResponseType.SIDE_EFFECT) {
            this.#viewOutput.chatView?.scrollToBottom();
          }

          // Announce as status update to screen readers when:
          // * Context is received (e.g. Analyzing the prompt)
          // * Answer started streaming
          // * Answer finished streaming
          switch (data.type) {
            case AiAssistanceModel.AiAgent.ResponseType.CONTEXT:
              UI.ARIAUtils.LiveAnnouncer.status(data.title);
              break;
            case AiAssistanceModel.AiAgent.ResponseType.ANSWER: {
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

  for (const part of message.parts) {
    if (part.type === 'answer') {
      contentParts.push(`### Answer\n\n${part.text}`);
    } else {
      const step = part.step;
      if (step.title) {
        contentParts.push(`### ${step.title}`);
      }
      if (step.contextDetails) {
        contentParts.push(AiAssistanceModel.AiConversation.generateContextDetailsMarkdown(step.contextDetails));
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
  }
  return contentParts.join('\n\n');
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string, opts?: Record<string, unknown>): boolean {
    switch (actionId) {
      case 'freestyler.elements-floating-button':
      case 'freestyler.element-panel-context':
      case 'freestyler.main-menu':
      case 'drjones.network-floating-button':
      case 'drjones.network-panel-context':
      case 'drjones.performance-panel-context':
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
          void widget.handleAction(actionId, opts);
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
