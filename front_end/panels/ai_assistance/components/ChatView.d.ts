import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type Message, type ModelChatMessage } from './ChatMessage.js';
export { ChatInput, type ImageInputData } from './ChatInput.js';
export interface Props {
    onTextSubmit: (text: string, imageInput?: Host.AidaClient.Part, multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => void;
    onInspectElementClick: () => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCancelClick: () => void;
    onContextClick: () => void;
    onNewConversation: () => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    changeManager: AiAssistanceModel.ChangeManager.ChangeManager;
    inspectElementToggled: boolean;
    messages: Message[];
    selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown> | null;
    isLoading: boolean;
    canShowFeedbackForm: boolean;
    userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage' | 'accountFullName'>;
    conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
    isReadOnly: boolean;
    blockedByCrossOrigin: boolean;
    changeSummary?: string;
    multimodalInputEnabled?: boolean;
    isTextInputDisabled: boolean;
    emptyStateSuggestions: AiAssistanceModel.AiAgent.ConversationSuggestion[];
    inputPlaceholder: Platform.UIString.LocalizedString;
    disclaimerText: Platform.UIString.LocalizedString;
    isArtifactsSidebarOpen: boolean;
    uploadImageInputEnabled?: boolean;
    markdownRenderer: MarkdownLitRenderer;
    additionalFloatyContext: UI.Floaty.FloatyContextSelection[];
}
export declare class ChatView extends HTMLElement {
    #private;
    constructor(props: Props);
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
