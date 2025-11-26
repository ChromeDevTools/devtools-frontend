import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
export interface Step {
    isLoading: boolean;
    thought?: string;
    title?: string;
    code?: string;
    output?: string;
    canceled?: boolean;
    sideEffect?: ConfirmSideEffectDialog;
    contextDetails?: [AiAssistanceModel.AiAgent.ContextDetail, ...AiAssistanceModel.AiAgent.ContextDetail[]];
}
interface ConfirmSideEffectDialog {
    onAnswer: (result: boolean) => void;
}
export declare const enum ChatMessageEntity {
    MODEL = "model",
    USER = "user"
}
export type ImageInputData = {
    isLoading: true;
} | {
    isLoading: false;
    data: string;
    mimeType: string;
    inputType: AiAssistanceModel.AiAgent.MultimodalInputType;
};
export interface AnswerPart {
    type: 'answer';
    text: string;
    suggestions?: [string, ...string[]];
}
export interface StepPart {
    type: 'step';
    step: Step;
}
export type ModelMessagePart = AnswerPart | StepPart;
export interface UserChatMessage {
    entity: ChatMessageEntity.USER;
    text: string;
    imageInput?: Host.AidaClient.Part;
}
export interface ModelChatMessage {
    entity: ChatMessageEntity.MODEL;
    parts: ModelMessagePart[];
    error?: AiAssistanceModel.AiAgent.ErrorType;
    rpcId?: Host.AidaClient.RpcGlobalId;
}
export type ChatMessage = UserChatMessage | ModelChatMessage;
export interface Props {
    onTextSubmit: (text: string, imageInput?: Host.AidaClient.Part, multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => void;
    onInspectElementClick: () => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCancelClick: () => void;
    onContextClick: () => void;
    onNewConversation: () => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    onTakeScreenshot?: () => void;
    onRemoveImageInput?: () => void;
    onTextInputChange: (input: string) => void;
    onLoadImage?: (file: File) => Promise<void>;
    changeManager: AiAssistanceModel.ChangeManager.ChangeManager;
    inspectElementToggled: boolean;
    messages: ChatMessage[];
    selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown> | null;
    isLoading: boolean;
    canShowFeedbackForm: boolean;
    userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage' | 'accountFullName'>;
    conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
    isReadOnly: boolean;
    blockedByCrossOrigin: boolean;
    changeSummary?: string;
    multimodalInputEnabled?: boolean;
    imageInput?: ImageInputData;
    isTextInputDisabled: boolean;
    emptyStateSuggestions: AiAssistanceModel.AiAgent.ConversationSuggestion[];
    inputPlaceholder: Platform.UIString.LocalizedString;
    disclaimerText: Platform.UIString.LocalizedString;
    isTextInputEmpty: boolean;
    uploadImageInputEnabled?: boolean;
    markdownRenderer: MarkdownLitRenderer;
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
export {};
