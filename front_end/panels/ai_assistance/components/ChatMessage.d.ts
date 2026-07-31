import '../../../ui/components/markdown_view/markdown_view.js';
import '../../../ui/kit/kit.js';
import * as Host from '../../../core/host/host.js';
import type { AiWidget } from '../../../models/ai_assistance/agents/AiAgent.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
/**
 * Payload and confirmation handler for side-effect operations requiring user approval.
 */
export interface ConfirmSideEffectDialog {
    /**
     * Human-readable description explaining the pending side-effect action, or null if omitted.
     */
    description: string | null;
    /**
     * Callback invoked when the user resolves the dialog (true to confirm, false to decline).
     */
    onAnswer: (result: boolean) => void;
}
/**
 * Represents the execution state of an individual agent action step:
 * - `in_progress`: The step is actively querying context or parsing stream content.
 * - `needs_approval`: The step is awaiting user confirmation for a side-effecting operation.
 * - `canceled`: The step was canceled before execution.
 * - `completed`: The step completed execution successfully.
 */
export type StepState = {
    type: 'in_progress';
} | {
    type: 'needs_approval';
    sideEffectDialog: ConfirmSideEffectDialog;
} | {
    type: 'canceled';
} | {
    type: 'completed';
};
/**
 * Represents an individual execution step within an agent response.
 */
export interface Step {
    /**
     * The current lifecycle state of this step.
     */
    state: StepState;
    /**
     * The agent's intermediate thought or rationale for taking this step.
     */
    thought?: string;
    /**
     * The human-readable title describing the step action.
     */
    title?: string;
    /**
     * Executable JavaScript code generated or executed in this step.
     */
    code?: string;
    /**
     * Raw string output or data returned by code execution.
     */
    output?: string;
    /**
     * Visual widgets rendered alongside this step (e.g. core web vitals, network traces).
     */
    widgets?: AiWidget[];
    /**
     * Context item details gathered or inspected during this step.
     */
    contextDetails?: [AiAssistanceModel.AiAgent.ContextDetail, ...AiAssistanceModel.AiAgent.ContextDetail[]];
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
    id: string;
}
export interface ModelChatMessage {
    entity: ChatMessageEntity.MODEL;
    parts: ModelMessagePart[];
    error?: AiAssistanceModel.AiAgent.ErrorType;
    rpcId?: Host.AidaClient.RpcGlobalId;
    id: string;
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
    canShowFeedbackForm: boolean;
    markdownRenderer: MarkdownLitRenderer;
    onSuggestionClick: (suggestion: string) => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    onExportClick?: () => void;
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
export declare function renderStep({ step, markdownRenderer, isLast }: {
    step: Step;
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
    markdownRenderer: MarkdownLitRenderer;
    onSuggestionClick: (suggestion: string) => void;
    onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
    onCopyResponseClick: (message: ModelChatMessage) => void;
    onExportClick: () => void;
    walkthrough: MessageInput['walkthrough'];
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    performUpdate(): Promise<void> | void;
    willHide(): void;
}
