import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';
import { type ContextDetail, ConversationContext } from '../agents/AiAgent.js';
export declare class FileContext extends ConversationContext<Workspace.UISourceCode.UISourceCode> {
    #private;
    readonly jslogContext: 'ai-context-file';
    constructor(file: Workspace.UISourceCode.UISourceCode, debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    /**
     * Returns the security origin of the workspace file.
     */
    getOrigin(): SDK.SecurityOrigin.SecurityOrigin;
    getItem(): Workspace.UISourceCode.UISourceCode;
    getTitle(): string;
    /**
     * Registers the selected file and includes its `File ID` so the model can page
     * truncated content with `getSourceContent` and match `listSources` rows without
     * an extra `listSources` call.
     */
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
    refresh(): Promise<void>;
}
