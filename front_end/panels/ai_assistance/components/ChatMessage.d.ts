import '../../../ui/components/markdown_view/markdown_view.js';
import '../../../ui/kit/kit.js';
import * as Host from '../../../core/host/host.js';
import type { AiWidget } from '../../../models/ai_assistance/agents/AiAgent.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface Step {
    isLoading: boolean;
    thought?: string;
    title?: string;
    code?: string;
    output?: string;
    widgets?: AiWidget[];
    canceled?: boolean;
    requestApproval?: ConfirmSideEffectDialog;
    contextDetails?: [AiAssistanceModel.AiAgent.ContextDetail, ...AiAssistanceModel.AiAgent.ContextDetail[]];
}
export interface ConfirmSideEffectDialog {
    description: string | null;
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
/**
 * Represents a part of the message that consists of one or more widgets.
 * The agent can yield widgets directly as part of its response, separate
 * from those returned by a specific tool call (which are encapsulated
 * within a StepPart).
 */
export interface WidgetPart {
    type: 'widget';
    widgets: AiWidget[];
}
export type ModelMessagePart = AnswerPart | StepPart | WidgetPart;
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
    onExportClick?: () => void;
    showActions: boolean;
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
    isFirstMessage: boolean;
    prompt: string;
    shouldShowCSSChangeSummary: boolean;
    canShowFeedbackForm: boolean;
    markdownRenderer: MarkdownLitRenderer;
    onSuggestionClick: (suggestion: string) => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    onExportClick?: () => void;
    changeSummary?: string;
    walkthrough: {
        onOpen: (message: ModelChatMessage) => void;
        isExpanded: boolean;
        onToggle: (isOpen: boolean, message: ModelChatMessage) => void;
        isInlined: boolean;
        activeSidebarMessage: ModelChatMessage | null;
        inlineExpandedMessages: ModelChatMessage[];
    };
}
export declare const DEFAULT_VIEW: (input: ChatMessageViewInput, output: ViewOutput, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare function titleForStep(step: Step): string;
export declare function renderStep({ step, isLoading, markdownRenderer, isLast }: {
    step: Step;
    isLoading: boolean;
    markdownRenderer: MarkdownLitRenderer;
    isLast: boolean;
}): Lit.LitTemplate;
/**
 * Renders AI-defined UI widgets.
 * When a ModelChatMessage contains a WidgetPart, or a Step has widgets,
 * the ChatMessage component iterates through the \`widgets\` array.
 * For each widget, it determines the appropriate rendering logic based on
 * the \`widgetData.name\`.
 *
 * Currently, 'COMPUTED_STYLES', 'CORE_VITALS' and 'STYLE_PROPERTIES' widgets are supported.
 * For these, the corresponding \`make...Widget\` functions are called to construct the necessary
 * data and configuration for the UI components. The widget is then rendered using the
 * \`<devtools-widget>\` custom element, which dynamically instantiates and displays the
 * specified UI.Widget subclass with the provided configuration.
 *
 * This allows for a flexible and extensible system where new widget types
 * can be added to the AI responses and rendered in DevTools by adding
 * corresponding `make...Widget` functions and handling them here.
 */
/**
 * Generates a deterministic unique identifier for a given AiWidget based on
 * its name and identifying data. This signature is used for widget deduplication.
 */
export declare function getWidgetSignature(widget: AiWidget): string;
/**
 * Returns a new ModelChatMessage where widgets have been deduplicated
 * across all parts and steps of the message. The first occurrence of each
 * unique widget (determined by its signature) is preserved.
 */
export declare function getDeduplicatedWidgetsMessage(message: ModelChatMessage): ModelChatMessage;
export declare class ChatMessage extends UI.Widget.Widget {
    #private;
    message: Message;
    isLoading: boolean;
    isReadOnly: boolean;
    prompt: string;
    canShowFeedbackForm: boolean;
    isLastMessage: boolean;
    isFirstMessage: boolean;
    shouldShowCSSChangeSummary: boolean;
    markdownRenderer: MarkdownLitRenderer;
    onSuggestionClick: (suggestion: string) => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    onExportClick: () => void;
    changeSummary?: string;
    walkthrough: MessageInput['walkthrough'];
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    performUpdate(): Promise<void> | void;
    willHide(): void;
}
