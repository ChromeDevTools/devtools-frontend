// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Badges from '../../models/badges/badges.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../network/forward/forward.js';
import * as NetworkPanel from '../network/network.js';
import * as TimelinePanel from '../timeline/timeline.js';
import aiAssistancePanelStyles from './aiAssistancePanel.css.js';
import { ChatView } from './components/ChatView.js';
import { DisabledWidget } from './components/DisabledWidget.js';
import { ExploreWidget } from './components/ExploreWidget.js';
import { MarkdownRendererWithCodeBlock } from './components/MarkdownRendererWithCodeBlock.js';
import { PerformanceAgentMarkdownRenderer } from './components/PerformanceAgentMarkdownRenderer.js';
import { isAiAssistancePatchingEnabled } from './PatchWidget.js';
const { html } = Lit;
const AI_ASSISTANCE_SEND_FEEDBACK = 'https://crbug.com/364805393';
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
};
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
    inputDisclaimerForStyling: 'Chat messages and any data the inspected page can access via Web APIs are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForStylingEnterpriseNoLogging: 'Chat messages and any data the inspected page can access via Web APIs are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForNetwork: 'Chat messages and the selected network request are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForNetworkEnterpriseNoLogging: 'Chat messages and the selected network request are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForFile: 'Chat messages and the selected file are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForFileEnterpriseNoLogging: 'Chat messages and the selected file are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForPerformance: 'Chat messages and trace data from your performance trace are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
    /**
     * @description Disclaimer text right after the chat input.
     */
    inputDisclaimerForPerformanceEnterpriseNoLogging: 'Chat messages and data from your performance trace are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
    /**
     * @description Message displayed in toast in case of any failures while taking a screenshot of the page.
     */
    screenshotFailureMessage: 'Failed to take a screenshot. Please try again.',
    /**
     * @description Message displayed in toast in case of any failures while uploading an image file as input.
     */
    uploadImageFailureMessage: 'Failed to upload image. Please try again.',
};
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/AiAssistancePanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;
function selectedElementFilter(maybeNode) {
    if (maybeNode) {
        return maybeNode.nodeType() === Node.ELEMENT_NODE ? maybeNode : null;
    }
    return null;
}
async function getEmptyStateSuggestions(context, conversation) {
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
        case "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */:
            return [
                { title: 'What can you help me with?', jslogContext: 'styling-default' },
                { title: 'Why isn’t this element visible?', jslogContext: 'styling-default' },
                { title: 'How do I center this element?', jslogContext: 'styling-default' },
            ];
        case "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */:
            return [
                { title: 'What does this script do?', jslogContext: 'file-default' },
                { title: 'Is the script optimized for performance?', jslogContext: 'file-default' },
                { title: 'Does the script handle user input safely?', jslogContext: 'file-default' },
            ];
        case "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */:
            return [
                { title: 'Why is this network request taking so long?', jslogContext: 'network-default' },
                { title: 'Are there any security headers present?', jslogContext: 'network-default' },
                { title: 'Why is the request failing?', jslogContext: 'network-default' },
            ];
        case "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */: {
            return [
                { title: 'What performance issues exist with my page?', jslogContext: 'performance-default' },
            ];
        }
        default:
            Platform.assertNever(conversation.type, 'Unknown conversation type');
    }
}
function getMarkdownRenderer(context, conversation) {
    if (context instanceof AiAssistanceModel.PerformanceAgent.PerformanceTraceContext) {
        if (!context.external) {
            const focus = context.getItem();
            return new PerformanceAgentMarkdownRenderer(focus.parsedTrace.data.Meta.mainFrameId, focus.lookupEvent.bind(focus));
        }
    }
    else if (conversation?.type === "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */) {
        // Handle historical conversations (can't linkify anything).
        return new PerformanceAgentMarkdownRenderer();
    }
    return new MarkdownRendererWithCodeBlock();
}
function toolbarView(input) {
    // clang-format off
    return html `
    <div class="toolbar-container" role="toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
      ${input.showChatActions
        ? html `<devtools-button
          title=${i18nString(UIStrings.newChat)}
          aria-label=${i18nString(UIStrings.newChat)}
          .iconName=${'plus'}
          .jslogContext=${'freestyler.new-chat'}
          .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
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
        ${input.showActiveConversationActions ? html `
          <devtools-button
              title=${i18nString(UIStrings.deleteChat)}
              aria-label=${i18nString(UIStrings.deleteChat)}
              .iconName=${'bin'}
              .jslogContext=${'freestyler.delete'}
              .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
              @click=${input.onDeleteClick}>
          </devtools-button>
          <devtools-button
            title=${i18nString(UIStrings.exportConversation)}
            aria-label=${i18nString(UIStrings.exportConversation)}
            .iconName=${'download'}
            .disabled=${input.isLoading}
            .jslogContext=${'export-ai-conversation'}
            .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
            @click=${input.onExportConversationClick}>
          </devtools-button>`
        : Lit.nothing}
      </devtools-toolbar>
      <devtools-toolbar class="freestyler-right-toolbar" role="presentation">
        <x-link
          class="toolbar-feedback-link devtools-link"
          title=${UIStrings.sendFeedback}
          href=${AI_ASSISTANCE_SEND_FEEDBACK}
          jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context('freestyler.send-feedback')}
        >${UIStrings.sendFeedback}</x-link>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${i18nString(UIStrings.help)}
          aria-label=${i18nString(UIStrings.help)}
          .iconName=${'help'}
          .jslogContext=${'freestyler.help'}
          .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
          @click=${input.onHelpClick}></devtools-button>
        <devtools-button
          title=${i18nString(UIStrings.settings)}
          aria-label=${i18nString(UIStrings.settings)}
          .iconName=${'gear'}
          .jslogContext=${'freestyler.settings'}
          .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
          @click=${input.onSettingsClick}></devtools-button>
      </devtools-toolbar>
    </div>
  `;
    // clang-format on
}
function defaultView(input, output, target) {
    // clang-format off
    function renderState() {
        switch (input.state) {
            case "chat-view" /* ViewState.CHAT_VIEW */:
                return html `<devtools-ai-chat-view
          .props=${input.props}
          ${Lit.Directives.ref((el) => {
                    if (!el || !(el instanceof ChatView)) {
                        return;
                    }
                    output.chatView = el;
                })}
        ></devtools-ai-chat-view>`;
            case "explore-view" /* ViewState.EXPLORE_VIEW */:
                return html `<devtools-widget
          class="fill-panel"
          .widgetConfig=${UI.Widget.widgetConfig(ExploreWidget)}
        ></devtools-widget>`;
            case "disabled-view" /* ViewState.DISABLED_VIEW */:
                return html `<devtools-widget
          class="fill-panel"
          .widgetConfig=${UI.Widget.widgetConfig(DisabledWidget, input.props)}
        ></devtools-widget>`;
        }
    }
    Lit.render(html `
      ${toolbarView(input)}
      <div class="ai-assistance-view-container">${renderState()}</div>
    `, target);
    // clang-format on
}
function createNodeContext(node) {
    if (!node) {
        return null;
    }
    return new AiAssistanceModel.StylingAgent.NodeContext(node);
}
function createFileContext(file) {
    if (!file) {
        return null;
    }
    return new AiAssistanceModel.FileAgent.FileContext(file);
}
function createRequestContext(request) {
    if (!request) {
        return null;
    }
    const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
    return new AiAssistanceModel.NetworkAgent.RequestContext(request, calculator);
}
function createPerformanceTraceContext(focus) {
    if (!focus) {
        return null;
    }
    return new AiAssistanceModel.PerformanceAgent.PerformanceTraceContext(focus);
}
function agentToConversationType(agent) {
    if (agent instanceof AiAssistanceModel.StylingAgent.StylingAgent) {
        return "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */;
    }
    if (agent instanceof AiAssistanceModel.NetworkAgent.NetworkAgent) {
        return "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */;
    }
    if (agent instanceof AiAssistanceModel.FileAgent.FileAgent) {
        return "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */;
    }
    if (agent instanceof AiAssistanceModel.PerformanceAgent.PerformanceAgent) {
        return "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */;
    }
    throw new Error('Provided agent does not have a corresponding conversation type');
}
let panelInstance;
export class AiAssistancePanel extends UI.Panel.Panel {
    view;
    static panelName = 'freestyler';
    // NodeJS debugging does not have Elements panel, thus this action might not exist.
    #toggleSearchElementAction;
    #aidaClient;
    #viewOutput = {};
    #serverSideLoggingEnabled = isAiAssistanceServerSideLoggingEnabled();
    #aiAssistanceEnabledSetting;
    #changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
    #mutex = new Common.Mutex.Mutex();
    #conversationAgent;
    #conversation;
    #selectedFile = null;
    #selectedElement = null;
    #selectedPerformanceTrace = null;
    #selectedRequest = null;
    // Messages displayed in the `ChatView` component.
    #messages = [];
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
    #selectedContext = null;
    // Stores the availability status of the `AidaClient` and the reason for unavailability, if any.
    #aidaAvailability;
    // Info of the currently logged in user.
    #userInfo;
    #imageInput;
    // Used to disable send button when there is not text input.
    #isTextInputEmpty = true;
    #timelinePanelInstance = null;
    #conversationHandler;
    #runAbortController = new AbortController();
    constructor(view = defaultView, { aidaClient, aidaAvailability, syncInfo }) {
        super(AiAssistancePanel.panelName);
        this.view = view;
        this.registerRequiredCSS(aiAssistancePanelStyles);
        this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();
        this.#aidaClient = aidaClient;
        this.#aidaAvailability = aidaAvailability;
        this.#userInfo = {
            accountImage: syncInfo.accountImage,
            accountFullName: syncInfo.accountFullName,
        };
        this.#conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({ aidaClient: this.#aidaClient, aidaAvailability });
        if (UI.ActionRegistry.ActionRegistry.instance().hasAction('elements.toggle-element-search')) {
            this.#toggleSearchElementAction =
                UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
        }
        AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().addEventListener("AiHistoryDeleted" /* AiAssistanceModel.AiHistoryStorage.Events.HISTORY_DELETED */, this.#onHistoryDeleted, this);
    }
    async #getPanelViewInput() {
        const blockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
        if (this.#aidaAvailability !== "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */ ||
            !this.#aiAssistanceEnabledSetting?.getIfNotDisabled() || blockedByAge) {
            return {
                state: "disabled-view" /* ViewState.DISABLED_VIEW */,
                props: {
                    aidaAvailability: this.#aidaAvailability,
                },
            };
        }
        if (this.#conversation?.type) {
            const emptyStateSuggestions = await getEmptyStateSuggestions(this.#selectedContext, this.#conversation);
            const markdownRenderer = getMarkdownRenderer(this.#selectedContext, this.#conversation);
            return {
                state: "chat-view" /* ViewState.CHAT_VIEW */,
                props: {
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
                        this.#conversation.type === "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */,
                    imageInput: this.#imageInput,
                    isTextInputDisabled: this.#isTextInputDisabled(),
                    emptyStateSuggestions,
                    inputPlaceholder: this.#getChatInputPlaceholder(),
                    disclaimerText: this.#getDisclaimerText(),
                    isTextInputEmpty: this.#isTextInputEmpty,
                    changeManager: this.#changeManager,
                    uploadImageInputEnabled: isAiAssistanceMultimodalUploadInputEnabled() &&
                        this.#conversation.type === "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */,
                    markdownRenderer,
                    onTextSubmit: async (text, imageInput, multimodalInputType) => {
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
            state: "explore-view" /* ViewState.EXPLORE_VIEW */,
        };
    }
    #getAiAssistanceEnabledSetting() {
        try {
            return Common.Settings.moduleSetting('ai-assistance-enabled');
        }
        catch {
            return;
        }
    }
    static async instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!panelInstance || forceNew) {
            const aidaClient = new Host.AidaClient.AidaClient();
            const syncInfoPromise = new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
            const [aidaAvailability, syncInfo] = await Promise.all([Host.AidaClient.AidaClient.checkAccessPreconditions(), syncInfoPromise]);
            panelInstance = new AiAssistancePanel(defaultView, { aidaClient, aidaAvailability, syncInfo });
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
    #bindTimelineTraceListener() {
        const timelinePanel = UI.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel);
        // Avoid binding multiple times.
        if (timelinePanel === this.#timelinePanelInstance) {
            return;
        }
        // Ensure we clear up any listener from the old TimelinePanel instance.
        this.#timelinePanelInstance?.removeEventListener("IsViewingTrace" /* TimelinePanel.TimelinePanel.Events.IS_VIEWING_TRACE */, this.requestUpdate, this);
        this.#timelinePanelInstance = timelinePanel;
        if (this.#timelinePanelInstance) {
            this.#timelinePanelInstance.addEventListener("IsViewingTrace" /* TimelinePanel.TimelinePanel.Events.IS_VIEWING_TRACE */, this.requestUpdate, this);
        }
    }
    #getDefaultConversationType() {
        const { hostConfig } = Root.Runtime;
        const viewManager = UI.ViewManager.ViewManager.instance();
        const isElementsPanelVisible = viewManager.isViewVisible('elements');
        const isNetworkPanelVisible = viewManager.isViewVisible('network');
        const isSourcesPanelVisible = viewManager.isViewVisible('sources');
        const isPerformancePanelVisible = viewManager.isViewVisible('timeline');
        let targetConversationType = undefined;
        if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
            targetConversationType = "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */;
        }
        else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
            targetConversationType = "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */;
        }
        else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
            targetConversationType = "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */;
        }
        else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
            targetConversationType = "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */;
        }
        return targetConversationType;
    }
    // We select the default agent based on the open panels if
    // there isn't any active conversation.
    #selectDefaultAgentIfNeeded() {
        // If there already is an agent and if it is not empty,
        // we don't automatically change the agent. In addition to this,
        // we don't change the current agent when there is a message in flight.
        if ((this.#conversationAgent && this.#conversation && !this.#conversation.isEmpty) || this.#isLoading) {
            return;
        }
        const targetConversationType = this.#getDefaultConversationType();
        if (this.#conversation?.type === targetConversationType) {
            // The above if makes sure even if we have an active agent it's empty
            // So we can just reuse it
            return;
        }
        const agent = targetConversationType ?
            this.#conversationHandler.createAgent(targetConversationType, this.#changeManager) :
            undefined;
        this.#updateConversationState({ agent });
    }
    #updateConversationState(opts) {
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
                this.#conversation = new AiAssistanceModel.AiHistoryStorage.Conversation(agentToConversationType(opts.agent), [], opts.agent.id, false);
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
                this.#conversation = opts.conversation;
            }
        }
        if (!this.#conversationAgent && !this.#conversation) {
            const conversationType = this.#getDefaultConversationType();
            if (conversationType) {
                const agent = this.#conversationHandler.createAgent(conversationType, this.#changeManager);
                this.#updateConversationState({ agent });
                return;
            }
        }
        this.#onContextSelectionChanged();
        this.requestUpdate();
    }
    wasShown() {
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
        this.#updateConversationState({ agent: this.#conversationAgent });
        this.#aiAssistanceEnabledSetting?.addChangeListener(this.requestUpdate, this);
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#handleAidaAvailabilityChange);
        this.#toggleSearchElementAction?.addEventListener("Toggled" /* UI.ActionRegistration.Events.TOGGLED */, this.requestUpdate, this);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
        UI.Context.Context.instance().addFlavorChangeListener(AiAssistanceModel.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
        UI.Context.Context.instance().addFlavorChangeListener(Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
        UI.ViewManager.ViewManager.instance().addEventListener("ViewVisibilityChanged" /* UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED */, this.#selectDefaultAgentIfNeeded, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
        // Listen to changes in the Timeline Panel state. We also call the
        // function immediately in case the Performance panel is already shown
        // when AI Assistance is loaded.
        UI.Context.Context.instance().addFlavorChangeListener(TimelinePanel.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
        this.#bindTimelineTraceListener();
        this.#selectDefaultAgentIfNeeded();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistancePanelOpened);
    }
    willHide() {
        super.willHide();
        this.#aiAssistanceEnabledSetting?.removeChangeListener(this.requestUpdate, this);
        Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#handleAidaAvailabilityChange);
        this.#toggleSearchElementAction?.removeEventListener("Toggled" /* UI.ActionRegistration.Events.TOGGLED */, this.requestUpdate, this);
        UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
        UI.Context.Context.instance().removeFlavorChangeListener(SDK.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
        UI.Context.Context.instance().removeFlavorChangeListener(AiAssistanceModel.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
        UI.Context.Context.instance().removeFlavorChangeListener(Workspace.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
        UI.ViewManager.ViewManager.instance().removeEventListener("ViewVisibilityChanged" /* UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED */, this.#selectDefaultAgentIfNeeded, this);
        UI.Context.Context.instance().removeFlavorChangeListener(TimelinePanel.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
        if (this.#timelinePanelInstance) {
            this.#timelinePanelInstance.removeEventListener("IsViewingTrace" /* TimelinePanel.TimelinePanel.Events.IS_VIEWING_TRACE */, this.requestUpdate, this);
            this.#timelinePanelInstance = null;
        }
    }
    #handleAidaAvailabilityChange = async () => {
        const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== this.#aidaAvailability) {
            this.#aidaAvailability = currentAidaAvailability;
            const syncInfo = await new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
            this.#userInfo = {
                accountImage: syncInfo.accountImage,
                accountFullName: syncInfo.accountFullName,
            };
            this.requestUpdate();
        }
    };
    #handleDOMNodeFlavorChange = (ev) => {
        if (this.#selectedElement?.getItem() === ev.data) {
            return;
        }
        this.#selectedElement = createNodeContext(selectedElementFilter(ev.data));
        this.#updateConversationState({ agent: this.#conversationAgent });
    };
    #handleDOMNodeAttrChange = (ev) => {
        if (this.#selectedElement?.getItem() === ev.data.node) {
            if (ev.data.name === 'class' || ev.data.name === 'id') {
                this.requestUpdate();
            }
        }
    };
    #handleNetworkRequestFlavorChange = (ev) => {
        if (this.#selectedRequest?.getItem() === ev.data) {
            return;
        }
        if (Boolean(ev.data)) {
            const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
            this.#selectedRequest = new AiAssistanceModel.NetworkAgent.RequestContext(ev.data, calculator);
        }
        else {
            this.#selectedRequest = null;
        }
        this.#updateConversationState({ agent: this.#conversationAgent });
    };
    #handlePerformanceTraceFlavorChange = (ev) => {
        if (this.#selectedPerformanceTrace?.getItem() === ev.data) {
            return;
        }
        this.#selectedPerformanceTrace =
            Boolean(ev.data) ? new AiAssistanceModel.PerformanceAgent.PerformanceTraceContext(ev.data) : null;
        this.#updateConversationState({ agent: this.#conversationAgent });
    };
    #handleUISourceCodeFlavorChange = (ev) => {
        const newFile = ev.data;
        if (!newFile) {
            return;
        }
        if (this.#selectedFile?.getItem() === newFile) {
            return;
        }
        this.#selectedFile = new AiAssistanceModel.FileAgent.FileContext(ev.data);
        this.#updateConversationState({ agent: this.#conversationAgent });
    };
    #onPrimaryPageChanged() {
        if (!this.#imageInput) {
            return;
        }
        this.#imageInput = undefined;
        this.requestUpdate();
    }
    #getChangeSummary() {
        if (!isAiAssistancePatchingEnabled() || !this.#conversationAgent || this.#conversation?.isReadOnly) {
            return;
        }
        return this.#changeManager.formatChangesForPatching(this.#conversationAgent.id, /* includeSourceLocation= */ true);
    }
    #getToolbarInput() {
        return {
            isLoading: this.#isLoading,
            showChatActions: this.#shouldShowChatActions(),
            showActiveConversationActions: Boolean(this.#conversation && !this.#conversation.isEmpty),
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
        };
    }
    async performUpdate() {
        this.view({
            ...this.#getToolbarInput(),
            ...await this.#getPanelViewInput(),
        }, this.#viewOutput, this.contentElement);
    }
    #onCopyResponseClick(message) {
        const markdown = getResponseMarkdown(message);
        if (markdown) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(markdown);
            Snackbars.Snackbar.Snackbar.show({
                message: i18nString(UIStrings.responseCopiedToClipboard),
            });
        }
    }
    #handleSelectElementClick() {
        UI.Context.Context.instance().setFlavor(Common.ReturnToPanel.ReturnToPanelFlavor, new Common.ReturnToPanel.ReturnToPanelFlavor(this.panelName));
        void this.#toggleSearchElementAction?.execute();
    }
    #isTextInputDisabled() {
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
    #shouldShowChatActions() {
        const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
        const isBlockedByAge = Root.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
        if (!aiAssistanceSetting || isBlockedByAge) {
            return false;
        }
        if (this.#aidaAvailability === "no-account-email" /* Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL */ ||
            this.#aidaAvailability === "sync-is-paused" /* Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED */) {
            return false;
        }
        return true;
    }
    #getChatInputPlaceholder() {
        if (!this.#conversation) {
            return i18nString(UIStrings.followTheSteps);
        }
        if (this.#blockedByCrossOrigin) {
            return lockedString(UIStringsNotTranslate.crossOriginError);
        }
        switch (this.#conversation.type) {
            case "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */:
                return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForStyling) :
                    lockedString(UIStringsNotTranslate.inputPlaceholderForStylingNoContext);
            case "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */:
                return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForFile) :
                    lockedString(UIStringsNotTranslate.inputPlaceholderForFileNoContext);
            case "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */:
                return this.#selectedContext ? lockedString(UIStringsNotTranslate.inputPlaceholderForNetwork) :
                    lockedString(UIStringsNotTranslate.inputPlaceholderForNetworkNoContext);
            case "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */: {
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
    #getDisclaimerText() {
        if (!this.#conversation || this.#conversation.isReadOnly) {
            return i18nString(UIStrings.inputDisclaimerForEmptyState);
        }
        const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
            Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
        switch (this.#conversation.type) {
            case "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */:
                if (noLogging) {
                    return lockedString(UIStringsNotTranslate.inputDisclaimerForStylingEnterpriseNoLogging);
                }
                return lockedString(UIStringsNotTranslate.inputDisclaimerForStyling);
            case "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */:
                if (noLogging) {
                    return lockedString(UIStringsNotTranslate.inputDisclaimerForFileEnterpriseNoLogging);
                }
                return lockedString(UIStringsNotTranslate.inputDisclaimerForFile);
            case "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */:
                if (noLogging) {
                    return lockedString(UIStringsNotTranslate.inputDisclaimerForNetworkEnterpriseNoLogging);
                }
                return lockedString(UIStringsNotTranslate.inputDisclaimerForNetwork);
            // It is deliberate that both Performance agents use the same disclaimer
            // text and this has been approved by Privacy.
            case "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */:
                if (noLogging) {
                    return lockedString(UIStringsNotTranslate.inputDisclaimerForPerformanceEnterpriseNoLogging);
                }
                return lockedString(UIStringsNotTranslate.inputDisclaimerForPerformance);
        }
    }
    #handleFeedbackSubmit(rpcId, rating, feedback) {
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
    #handleContextClick() {
        const context = this.#selectedContext;
        if (context instanceof AiAssistanceModel.NetworkAgent.RequestContext) {
            const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(context.getItem(), "headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */);
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
    #canExecuteQuery() {
        const isBrandedBuild = Boolean(Root.Runtime.hostConfig.aidaAvailability?.enabled);
        const isBlockedByAge = Boolean(Root.Runtime.hostConfig.aidaAvailability?.blockedByAge);
        const isAidaAvailable = Boolean(this.#aidaAvailability === "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */);
        const isUserOptedIn = Boolean(this.#aiAssistanceEnabledSetting?.getIfNotDisabled());
        return isBrandedBuild && isAidaAvailable && isUserOptedIn && !isBlockedByAge;
    }
    async handleAction(actionId, opts) {
        if (this.#isLoading && !opts?.['prompt']) {
            // If running some queries already, and this action doesn't contain a predefined prompt, focus the input with the abort
            // button and do nothing.
            this.#viewOutput.chatView?.focusTextInput();
            return;
        }
        let targetConversationType;
        switch (actionId) {
            case 'freestyler.elements-floating-button': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
                targetConversationType = "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */;
                break;
            }
            case 'freestyler.element-panel-context': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
                targetConversationType = "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */;
                break;
            }
            case 'drjones.network-floating-button': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
                targetConversationType = "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */;
                break;
            }
            case 'drjones.network-panel-context': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
                targetConversationType = "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */;
                break;
            }
            case 'drjones.performance-panel-context': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree);
                targetConversationType = "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */;
                break;
            }
            case 'drjones.sources-floating-button': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
                targetConversationType = "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */;
                break;
            }
            case 'drjones.sources-panel-context': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
                targetConversationType = "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */;
                break;
            }
        }
        if (!targetConversationType) {
            return;
        }
        let agent = this.#conversationAgent;
        if (!this.#conversation || !this.#conversationAgent || this.#conversation.type !== targetConversationType ||
            this.#conversation?.isEmpty) {
            agent = this.#conversationHandler.createAgent(targetConversationType, this.#changeManager);
        }
        this.#updateConversationState({ agent });
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
        }
        else {
            this.#viewOutput.chatView?.focusTextInput();
        }
    }
    #populateHistoryMenu(contextMenu) {
        const historicalConversations = AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().getHistory().map(serializedConversation => AiAssistanceModel.AiHistoryStorage.Conversation.fromSerializedConversation(serializedConversation));
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
            }, { checked: (this.#conversation === conversation), jslogContext: 'freestyler.history-item' });
        }
        const historyEmpty = contextMenu.defaultSection().items.length === 0;
        if (historyEmpty) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.noPastConversations), () => { }, {
                disabled: true,
            });
        }
        contextMenu.footerSection().appendItem(i18nString(UIStrings.clearChatHistory), () => {
            void AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
        }, {
            disabled: historyEmpty,
        });
    }
    #onHistoryDeleted() {
        this.#updateConversationState();
    }
    #onDeleteClicked() {
        if (!this.#conversation) {
            return;
        }
        void AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
        this.#updateConversationState();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.chatDeleted));
    }
    async #onExportConversationClick() {
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
        const filename = `${prefix}${finalTitle}${suffix}`;
        await Workspace.FileManager.FileManager.instance().save(filename, contentData, true);
        Workspace.FileManager.FileManager.instance().close(filename);
    }
    async #openHistoricConversation(conversation) {
        if (this.#conversation === conversation) {
            return;
        }
        this.#updateConversationState({ conversation });
        await this.#doConversation(conversation.history);
    }
    #handleNewChatRequest() {
        this.#updateConversationState();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.newChatCreated));
    }
    async #handleTakeScreenshot() {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            throw new Error('Could not find main target');
        }
        const model = mainTarget.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
        if (!model) {
            throw new Error('Could not find model');
        }
        const showLoadingTimeout = setTimeout(() => {
            this.#imageInput = { isLoading: true };
            this.requestUpdate();
        }, SHOW_LOADING_STATE_TIMEOUT);
        const bytes = await model.captureScreenshot("jpeg" /* Protocol.Page.CaptureScreenshotRequestFormat.Jpeg */, SCREENSHOT_QUALITY, "fromViewport" /* SDK.ScreenCaptureModel.ScreenshotMode.FROM_VIEWPORT */);
        clearTimeout(showLoadingTimeout);
        if (bytes) {
            this.#imageInput = {
                isLoading: false,
                data: bytes,
                mimeType: JPEG_MIME_TYPE,
                inputType: "screenshot" /* AiAssistanceModel.AiAgent.MultimodalInputType.SCREENSHOT */
            };
            this.requestUpdate();
            void this.updateComplete.then(() => {
                this.#viewOutput.chatView?.focusTextInput();
            });
        }
        else {
            this.#imageInput = undefined;
            this.requestUpdate();
            Snackbars.Snackbar.Snackbar.show({
                message: lockedString(UIStringsNotTranslate.screenshotFailureMessage),
            });
        }
    }
    #handleRemoveImageInput() {
        this.#imageInput = undefined;
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.#viewOutput.chatView?.focusTextInput();
        });
    }
    #handleTextInputChange(value) {
        const disableSubmit = !value;
        if (disableSubmit !== this.#isTextInputEmpty) {
            this.#isTextInputEmpty = disableSubmit;
            void this.requestUpdate();
        }
    }
    async #handleLoadImage(file) {
        const showLoadingTimeout = setTimeout(() => {
            this.#imageInput = { isLoading: true };
            this.requestUpdate();
        }, SHOW_LOADING_STATE_TIMEOUT);
        const reader = new FileReader();
        let dataUrl;
        try {
            dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    }
                    else {
                        reject(new Error('FileReader result was not a string.'));
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        catch {
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
            inputType: "uploaded-image" /* AiAssistanceModel.AiAgent.MultimodalInputType.UPLOADED_IMAGE */
        };
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.#viewOutput.chatView?.focusTextInput();
        });
    }
    #cancel() {
        this.#runAbortController.abort();
        this.#runAbortController = new AbortController();
    }
    #onContextSelectionChanged() {
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
    #getConversationContext(conversation) {
        if (!conversation) {
            return null;
        }
        let context;
        switch (conversation.type) {
            case "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */:
                context = this.#selectedElement;
                break;
            case "drjones-file" /* AiAssistanceModel.AiHistoryStorage.ConversationType.FILE */:
                context = this.#selectedFile;
                break;
            case "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */:
                context = this.#selectedRequest;
                break;
            case "drjones-performance-full" /* AiAssistanceModel.AiHistoryStorage.ConversationType.PERFORMANCE */:
                context = this.#selectedPerformanceTrace;
                break;
        }
        return context;
    }
    async #startConversation(text, imageInput, multimodalInputType) {
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
        if (this.#conversation?.isEmpty) {
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.STARTED_AI_CONVERSATION);
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
        const generator = this.#conversationAgent.run(text, {
            signal,
            selected: context,
        }, multimodalInput);
        const generatorWithHistory = this.#conversationHandler.handleConversationWithHistory(generator, this.#conversation);
        await this.#doConversation(generatorWithHistory);
    }
    async #doConversation(items) {
        const release = await this.#mutex.acquire();
        try {
            let systemMessage = {
                entity: "model" /* ChatMessageEntity.MODEL */,
                steps: [],
            };
            let step = { isLoading: true };
            /**
             * Commits the step to props only if necessary.
             */
            function commitStep() {
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
                    case "user-query" /* AiAssistanceModel.AiAgent.ResponseType.USER_QUERY */: {
                        this.#messages.push({
                            entity: "user" /* ChatMessageEntity.USER */,
                            text: data.query,
                            imageInput: data.imageInput,
                        });
                        systemMessage = {
                            entity: "model" /* ChatMessageEntity.MODEL */,
                            steps: [],
                        };
                        this.#messages.push(systemMessage);
                        break;
                    }
                    case "querying" /* AiAssistanceModel.AiAgent.ResponseType.QUERYING */: {
                        step = { isLoading: true };
                        if (!systemMessage.steps.length) {
                            systemMessage.steps.push(step);
                        }
                        break;
                    }
                    case "context" /* AiAssistanceModel.AiAgent.ResponseType.CONTEXT */: {
                        step.title = data.title;
                        step.contextDetails = data.details;
                        step.isLoading = false;
                        commitStep();
                        break;
                    }
                    case "title" /* AiAssistanceModel.AiAgent.ResponseType.TITLE */: {
                        step.title = data.title;
                        commitStep();
                        break;
                    }
                    case "thought" /* AiAssistanceModel.AiAgent.ResponseType.THOUGHT */: {
                        step.isLoading = false;
                        step.thought = data.thought;
                        commitStep();
                        break;
                    }
                    case "suggestions" /* AiAssistanceModel.AiAgent.ResponseType.SUGGESTIONS */: {
                        systemMessage.suggestions = data.suggestions;
                        break;
                    }
                    case "side-effect" /* AiAssistanceModel.AiAgent.ResponseType.SIDE_EFFECT */: {
                        step.isLoading = false;
                        step.code ??= data.code;
                        step.sideEffect = {
                            onAnswer: (result) => {
                                data.confirm(result);
                                step.sideEffect = undefined;
                                this.requestUpdate();
                            },
                        };
                        commitStep();
                        break;
                    }
                    case "action" /* AiAssistanceModel.AiAgent.ResponseType.ACTION */: {
                        step.isLoading = false;
                        step.code ??= data.code;
                        step.output ??= data.output;
                        step.canceled = data.canceled;
                        commitStep();
                        break;
                    }
                    case "answer" /* AiAssistanceModel.AiAgent.ResponseType.ANSWER */: {
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
                    case "error" /* AiAssistanceModel.AiAgent.ResponseType.ERROR */: {
                        systemMessage.error = data.error;
                        systemMessage.rpcId = undefined;
                        const lastStep = systemMessage.steps.at(-1);
                        if (lastStep) {
                            // Mark the last step as cancelled to make the UI feel better.
                            if (data.error === "abort" /* AiAssistanceModel.AiAgent.ErrorType.ABORT */) {
                                lastStep.canceled = true;
                                // If error happens while the step is still loading remove it.
                            }
                            else if (lastStep.isLoading) {
                                systemMessage.steps.pop();
                            }
                        }
                        if (data.error === "block" /* AiAssistanceModel.AiAgent.ErrorType.BLOCK */) {
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
                    if (data.type === "context" /* AiAssistanceModel.AiAgent.ResponseType.CONTEXT */ ||
                        data.type === "side-effect" /* AiAssistanceModel.AiAgent.ResponseType.SIDE_EFFECT */) {
                        this.#viewOutput.chatView?.scrollToBottom();
                    }
                    // Announce as status update to screen readers when:
                    // * Context is received (e.g. Analyzing the prompt)
                    // * Answer started streaming
                    // * Answer finished streaming
                    switch (data.type) {
                        case "context" /* AiAssistanceModel.AiAgent.ResponseType.CONTEXT */:
                            UI.ARIAUtils.LiveAnnouncer.status(data.title);
                            break;
                        case "answer" /* AiAssistanceModel.AiAgent.ResponseType.ANSWER */: {
                            if (!data.complete && !announcedAnswerLoading) {
                                announcedAnswerLoading = true;
                                UI.ARIAUtils.LiveAnnouncer.status(lockedString(UIStringsNotTranslate.answerLoading));
                            }
                            else if (data.complete && !announcedAnswerReady) {
                                announcedAnswerReady = true;
                                UI.ARIAUtils.LiveAnnouncer.status(lockedString(UIStringsNotTranslate.answerReady));
                            }
                        }
                    }
                }
            }
            this.#isLoading = false;
            this.requestUpdate();
        }
        finally {
            release();
        }
    }
}
export function getResponseMarkdown(message) {
    const contentParts = ['## AI'];
    for (const step of message.steps) {
        if (step.title) {
            contentParts.push(`### ${step.title}`);
        }
        if (step.contextDetails) {
            contentParts.push(AiAssistanceModel.AiHistoryStorage.Conversation.generateContextDetailsMarkdown(step.contextDetails));
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
export class ActionDelegate {
    handleAction(_context, actionId, opts) {
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
                    const view = UI.ViewManager.ViewManager.instance().view(AiAssistancePanel.panelName);
                    if (!view) {
                        return;
                    }
                    await UI.ViewManager.ViewManager.instance().showView(AiAssistancePanel.panelName);
                    const minDrawerSize = UI.InspectorView.InspectorView.instance().totalSize() / 4;
                    if (UI.InspectorView.InspectorView.instance().drawerSize() < minDrawerSize) {
                        // If the drawer is too small, resize it to the quarter of the total size.
                        // This ensures the AI Assistance panel has enough space to be usable when opened via an action.
                        UI.InspectorView.InspectorView.instance().setDrawerSize(minDrawerSize);
                    }
                    const widget = (await view.widget());
                    void widget.handleAction(actionId, opts);
                })();
                return true;
            }
        }
        return false;
    }
}
function isAiAssistanceMultimodalUploadInputEnabled() {
    return isAiAssistanceMultimodalInputEnabled() &&
        Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.multimodalUploadInput);
}
function isAiAssistanceMultimodalInputEnabled() {
    return Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.multimodal);
}
function isAiAssistanceServerSideLoggingEnabled() {
    return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
//# sourceMappingURL=AiAssistancePanel.js.map