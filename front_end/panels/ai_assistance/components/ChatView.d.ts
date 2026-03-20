import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { ChatInput } from './ChatInput.js';
import { type Message, type ModelChatMessage } from './ChatMessage.js';
export { ChatInput, type ImageInputData } from './ChatInput.js';
interface ViewOutput {
    mainElement?: HTMLElement;
    input?: UI.Widget.WidgetElement<ChatInput>;
}
type View = (input: ChatWidgetInput, output: ViewOutput, target: HTMLElement | ShadowRoot) => void;
export interface Props {
    onTextSubmit: (text: string, imageInput?: Host.AidaClient.Part, multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => void;
    onInspectElementClick: () => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCancelClick: () => void;
    onContextClick: () => void;
    onNewConversation: () => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    onContextRemoved: (() => void) | null;
    onContextAdd: (() => void) | null;
    conversationMarkdown: string;
    onExportConversation: (() => void) | null;
    changeManager: AiAssistanceModel.ChangeManager.ChangeManager;
    inspectElementToggled: boolean;
    messages: Message[];
    context: AiAssistanceModel.AiAgent.ConversationContext<unknown> | null;
    isContextSelected: boolean;
    canShowFeedbackForm: boolean;
    isLoading: boolean;
    conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
    isReadOnly: boolean;
    blockedByCrossOrigin: boolean;
    changeSummary?: string;
    multimodalInputEnabled?: boolean;
    isTextInputDisabled: boolean;
    emptyStateSuggestions: AiAssistanceModel.AiAgent.ConversationSuggestion[];
    inputPlaceholder: Platform.UIString.LocalizedString;
    disclaimerText: Platform.UIString.LocalizedString;
    uploadImageInputEnabled?: boolean;
    markdownRenderer: MarkdownLitRenderer;
    generateConversationSummary: (markdown: string) => Promise<string>;
    walkthrough: {
        onOpen: (message: ModelChatMessage) => void;
        onToggle: (isOpen: boolean) => void;
        isExpanded: boolean;
        isInlined: boolean;
        activeMessage: ModelChatMessage | null;
    };
}
interface ChatWidgetInput extends Props {
    handleScroll: (ev: Event) => void;
    handleSuggestionClick: (title: string) => void;
    handleMessageContainerRef: (el: Element | undefined) => void;
    exportForAgentsClick: () => void;
}
/**
 * ChatView is a web component for historical reasons and generally should not
 * exist because it barely has any presenter logic and it is definitely not
 * re-usable as a custom element. Instead, the template from ChatView should be
 * embdedded into the AiAssistancePanel (the sole host of chat interfaces) and
 * the scroll handling logic should be implemented in view functions using refs
 * or re-usable custom elements. Currently, the ChatView just combines the
 * interfaces of ChatMessage and ChatInput presenters and passes most of the
 * properties down to those presenters as-is.
 *
 * @deprecated
 */
export declare class ChatView extends HTMLElement {
    #private;
    constructor(props: Props, view?: View);
    set props(props: Props);
    connectedCallback(): void;
    disconnectedCallback(): void;
    focusTextInput(): void;
    restoreScrollPosition(): void;
    scrollToBottom(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-ai-chat-view': ChatView;
    }
}
