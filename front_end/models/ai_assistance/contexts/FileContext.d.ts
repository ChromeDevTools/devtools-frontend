import * as SDK from '../../../core/sdk/sdk.js';
import type * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';
import { type ContextDetail, ConversationContext } from '../agents/AiAgent.js';
export declare class FileContext extends ConversationContext<Workspace.UISourceCode.UISourceCode> {
    #private;
    readonly jslogContext: 'ai-context-file';
    constructor(file: Workspace.UISourceCode.UISourceCode, debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    /**
     * Resolves the security origin of a given UISourceCode.
     * Prefers the project security origin, falling back to the origin of the file URL.
     */
    static originForUISourceCode(file: Workspace.UISourceCode.UISourceCode): SDK.SecurityOrigin.SecurityOrigin;
    /**
     * Returns the security origin of the project containing the file, falling
     * back to the origin derived from the file URL.
     */
    getOrigin(): SDK.SecurityOrigin.SecurityOrigin;
    getItem(): Workspace.UISourceCode.UISourceCode;
    getTitle(): string;
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
    refresh(): Promise<void>;
}
