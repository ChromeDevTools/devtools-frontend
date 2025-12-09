import '../../ui/kit/kit.js';
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ChatView, type ModelChatMessage, type Props as ChatViewProps } from './components/ChatView.js';
interface ToolbarViewInput {
    onNewChatClick: () => void;
    populateHistoryMenu: (contextMenu: UI.ContextMenu.ContextMenu) => void;
    onDeleteClick: () => void;
    onExportConversationClick: () => void;
    onHelpClick: () => void;
    onSettingsClick: () => void;
    onArtifactsSidebarToggle: () => void;
    artifactsSidebarVisible: boolean;
    isLoading: boolean;
    showChatActions: boolean;
    showActiveConversationActions: boolean;
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
    private view;
    static panelName: string;
    constructor(view: View | undefined, { aidaClient, aidaAvailability, syncInfo }: {
        aidaClient: Host.AidaClient.AidaClient;
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
        syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
    });
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): Promise<AiAssistancePanel>;
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
    handleAction(actionId: string, opts?: Record<string, unknown>): Promise<void>;
}
export declare function getResponseMarkdown(message: ModelChatMessage): string;
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string, opts?: Record<string, unknown>): boolean;
}
export {};
