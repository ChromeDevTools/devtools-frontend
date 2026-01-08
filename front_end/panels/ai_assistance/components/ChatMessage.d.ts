import '../../../ui/components/markdown_view/markdown_view.js';
import * as Host from '../../../core/host/host.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
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
export interface ConfirmSideEffectDialog {
    onAnswer: (result: boolean) => void;
}
export declare const enum ChatMessageEntity {
    MODEL = "model",
    USER = "user"
}
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
export type Message = UserChatMessage | ModelChatMessage;
export interface RatingViewInput {
    currentRating?: Host.AidaClient.Rating;
    onRatingClick: (rating: Host.AidaClient.Rating) => void;
    showRateButtons: boolean;
}
export interface ActionViewInput {
    onReportClick: () => void;
    onCopyResponseClick: () => void;
}
export interface SuggestionViewInput {
    suggestions?: [string, ...string[]];
    scrollSuggestionsScrollContainer: (direction: 'left' | 'right') => void;
    onSuggestionsScrollOrResize: () => void;
    onSuggestionClick: (suggestion: string) => void;
}
export interface FeedbackFormViewInput {
    isShowingFeedbackForm: boolean;
    onSubmit: (event: SubmitEvent) => void;
    onClose: () => void;
    onInputChange: (input: string) => void;
    isSubmitButtonDisabled: boolean;
}
export type ChatMessageViewInput = MessageInput & RatingViewInput & ActionViewInput & SuggestionViewInput & FeedbackFormViewInput;
export interface ViewOutput {
    suggestionsLeftScrollButtonContainer?: Element;
    suggestionsScrollContainer?: Element;
    suggestionsRightScrollButtonContainer?: Element;
}
export interface MessageInput {
    suggestions?: [string, ...string[]];
    message: Message;
    isLoading: boolean;
    isReadOnly: boolean;
    isLastMessage: boolean;
    canShowFeedbackForm: boolean;
    userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage' | 'accountFullName'>;
    markdownRenderer: MarkdownLitRenderer;
    onSuggestionClick: (suggestion: string) => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
}
export declare const DEFAULT_VIEW: (input: ChatMessageViewInput, output: ViewOutput, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class ChatMessage extends UI.Widget.Widget {
    #private;
    message: Message;
    isLoading: boolean;
    isReadOnly: boolean;
    canShowFeedbackForm: boolean;
    isLastMessage: boolean;
    userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage' | 'accountFullName'>;
    markdownRenderer: MarkdownLitRenderer;
    onSuggestionClick: (suggestion: string) => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    performUpdate(): Promise<void> | void;
    willHide(): void;
}
