import '../../ui/kit/kit.js';
import * as Host from '../../core/host/host.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type ModelChatMessage } from './components/ChatMessage.js';
import { ChatView, type Props as ChatViewProps } from './components/ChatView.js';
interface ToolbarViewInput {
    onNewChatClick: () => void;
    populateHistoryMenu: (contextMenu: UI.ContextMenu.ContextMenu) => void;
    onDeleteClick: () => void;
    onExportConversationClick: () => void;
    onHelpClick: () => void;
    onSettingsClick: () => void;
    showChatActions: boolean;
    showActiveConversationActions: boolean;
    isLoading: boolean;
}
export declare const enum ViewState {
    DISABLED_VIEW = "disabled-view",
    CHAT_VIEW = "chat-view",
    EXPLORE_VIEW = "explore-view"
}
type PanelViewInput = {
    state: ViewState.CHAT_VIEW;
    props: ChatViewProps;
} | {
    state: ViewState.DISABLED_VIEW;
    props: {
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
    };
} | {
    state: ViewState.EXPLORE_VIEW;
};
export type ViewInput = ToolbarViewInput & PanelViewInput;
export interface PanelViewOutput {
    chatView?: ChatView;
}
type View = (input: ViewInput, output: PanelViewOutput, target: HTMLElement) => void;
export declare class AiAssistancePanel extends UI.Panel.Panel {
    #private;
    static panelName: string;
    private view;
    constructor(view: View | undefined, { aidaClient, aidaAvailability }: {
        aidaClient: Host.AidaClient.AidaClient;
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
    });
    onResize(): void;
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): Promise<AiAssistancePanel>;
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
    handleAction(actionId: string, opts?: Record<string, unknown>): Promise<void>;
}
export declare function getResponseMarkdown(message: ModelChatMessage): string;
/**
 * Visual logging context identifiers used to track conversation context lifecycle events.
 *
 * Context change telemetry tracks four transitions:
 * - User removal: ContextA -> null ('ai-v2-context-user-removal').
 * - User addition: null -> ContextB ('ai-v2-context-user-add').
 * - User selection change: ContextA -> ContextB ('ai-v2-context-user-change').
 * - Agent auto-selection: * -> ContextB ('ai-v2-context-agent-change').
 *
 * Telemetry only logs when context selection is enabled and the conversation is active.
 */
export type ConversationContextTypeString = 'ai-context-none' | AiAssistanceModel.AiAgent.ConversationContextJslog | 'ai-context-unknown';
/**
 * Resolves the visual logging context identifier for a given conversation context.
 */
export declare function getContextTypeString(context: AiAssistanceModel.AiAgent.ConversationContext<unknown> | null | undefined): ConversationContextTypeString;
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string, opts?: Record<string, unknown>): boolean;
}
export {};
