import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as AiAssistancePanel from '../panels/ai_assistance/ai_assistance.js';
import * as UI from '../ui/legacy/legacy.js';
export declare const MockAidaAbortError: {
    readonly abortError: true;
};
export declare const MockAidaFetchError: {
    readonly fetchError: true;
};
export type MockAidaResponse = Omit<Host.AidaClient.DoConversationResponse, 'completed' | 'metadata'> & {
    metadata?: Host.AidaClient.ResponseMetadata;
} | typeof MockAidaAbortError | typeof MockAidaFetchError;
/**
 * Creates a mock AIDA client that responds using `data`.
 *
 * Each first-level item of `data` is a single response.
 * Each second-level item of `data` is a chunk of a response.
 * The last chunk sets completed flag to true;
 */
export declare function mockAidaClient(data?: Array<[MockAidaResponse, ...MockAidaResponse[]]>): sinon.SinonStubbedInstance<Host.AidaClient.AidaClient>;
export declare function createUISourceCode(options?: {
    content?: string;
    mimeType?: string;
    url?: Platform.DevToolsPath.UrlString;
    resourceType?: Common.ResourceType.ResourceType;
    requestContentData?: boolean;
}): Promise<Workspace.UISourceCode.UISourceCode>;
export declare function createNetworkRequest(opts?: {
    url?: Platform.DevToolsPath.UrlString;
    includeInitiators?: boolean;
}): SDK.NetworkRequest.NetworkRequest;
/**
 * Creates and shows an AiAssistancePanel instance returning the view
 * stubs and the initial view input caused by Widget.show().
 */
export declare function createAiAssistancePanel(options?: {
    aidaClient?: Host.AidaClient.AidaClient;
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
    syncInfo?: Host.InspectorFrontendHostAPI.SyncInformation;
    chatView?: AiAssistancePanel.ChatView;
}): Promise<{
    panel: AiAssistancePanel.AiAssistancePanel;
    view: import("./ViewFunctionHelpers.js").ViewFunctionStub<typeof AiAssistancePanel.AiAssistancePanel>;
    aidaClient: Host.AidaClient.AidaClient;
    stubAidaCheckAccessPreconditions: (aidaAvailability: Host.AidaClient.AidaAccessPreconditions) => import("sinon").SinonStub<[], Promise<Host.AidaClient.AidaAccessPreconditions>>;
}>;
export declare const setupAutomaticFileSystem: (options?: {
    hasFileSystem: boolean;
}) => void;
/**
 * Creates and shows an AiAssistancePanel instance returning the view
 * stubs and the initial view input caused by Widget.show().
 */
export declare function createPatchWidget(options?: {
    aidaClient?: Host.AidaClient.AidaClient;
}): Promise<{
    widget: AiAssistancePanel.PatchWidget.PatchWidget;
    view: import("./ViewFunctionHelpers.js").ViewFunctionStub<typeof AiAssistancePanel.PatchWidget.PatchWidget>;
    aidaClient: Host.AidaClient.AidaClient;
}>;
export declare function createPatchWidgetWithDiffView(options?: {
    aidaClient?: Host.AidaClient.AidaClient;
}): Promise<{
    widget: AiAssistancePanel.PatchWidget.PatchWidget;
    view: import("./ViewFunctionHelpers.js").ViewFunctionStub<typeof AiAssistancePanel.PatchWidget.PatchWidget>;
    aidaClient: Host.AidaClient.AidaClient;
}>;
export declare function initializePersistenceImplForTests(): void;
export declare function cleanup(): void;
export declare function openHistoryContextMenu(lastUpdate: AiAssistancePanel.ViewInput, item: string): {
    contextMenu: UI.ContextMenu.ContextMenu;
    id: number | undefined;
    entry: UI.ContextMenu.Item | undefined;
};
export declare function createTestFilesystem(fileSystemPath: string, files?: Array<{
    path: string;
    content: string;
}>): {
    project: Persistence.FileSystemWorkspaceBinding.FileSystem;
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
};
