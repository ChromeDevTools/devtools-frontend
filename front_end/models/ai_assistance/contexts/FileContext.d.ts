import type * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';
import { type ContextDetail, ConversationContext } from '../agents/AiAgent.js';
export declare class FileContext extends ConversationContext<Workspace.UISourceCode.UISourceCode> {
    #private;
    constructor(file: Workspace.UISourceCode.UISourceCode, debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    getURL(): string;
    getItem(): Workspace.UISourceCode.UISourceCode;
    getTitle(): string;
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
    refresh(): Promise<void>;
}
