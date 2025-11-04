import '../../ui/legacy/legacy.js';
import '../../ui/components/markdown_view/markdown_view.js';
import '../../ui/components/spinners/spinners.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives } from '../../ui/lit/lit.js';
export declare enum PatchSuggestionState {
    /**
     * The user did not attempt patching yet
     */
    INITIAL = "initial",
    /**
     * Applying to page tree is in progress
     */
    LOADING = "loading",
    /**
     * Applying to page tree succeeded
     */
    SUCCESS = "success",
    /**
     * Applying to page tree failed
     */
    ERROR = "error"
}
declare enum SelectedProjectType {
    /**
     * No project selected
     */
    NONE = "none",
    /**
     * The selected project is not an automatic workspace project
     */
    REGULAR = "regular",
    /**
     * The selected project is a disconnected automatic workspace project
     */
    AUTOMATIC_DISCONNECTED = "automaticDisconnected",
    /**
     * The selected project is a connected automatic workspace project
     */
    AUTOMATIC_CONNECTED = "automaticConnected"
}
export interface ViewInput {
    workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
    patchSuggestionState: PatchSuggestionState;
    changeSummary?: string;
    sources?: string;
    projectName: string;
    projectPath: Platform.DevToolsPath.RawPathString;
    projectType: SelectedProjectType;
    savedToDisk?: boolean;
    applyToWorkspaceTooltipText: Platform.UIString.LocalizedString;
    onLearnMoreTooltipClick: () => void;
    onApplyToWorkspace: () => void;
    onCancel: () => void;
    onDiscard: () => void;
    onSaveAll: () => void;
    onChangeWorkspaceClick?: () => void;
}
export interface ViewOutput {
    changeRef?: Directives.Ref<HTMLElement>;
    summaryRef?: Directives.Ref<HTMLElement>;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class PatchWidget extends UI.Widget.Widget {
    #private;
    changeSummary: string;
    changeManager: AiAssistanceModel.ChangeManager.ChangeManager | undefined;
    constructor(element?: HTMLElement, view?: View, opts?: {
        aidaClient: Host.AidaClient.AidaClient;
    });
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
export declare function isAiAssistancePatchingEnabled(): boolean;
export {};
