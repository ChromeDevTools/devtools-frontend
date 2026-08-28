import * as Host from '../../../core/host/host.js';
import type * as Workspace from '../../workspace/workspace.js';
import { AiAgent, type ContextResponse, type ConversationContext, type RequestOptions } from './AiAgent.js';
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class FileAgent extends AiAgent<Workspace.UISourceCode.UISourceCode> {
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(selectedFile: ConversationContext<Workspace.UISourceCode.UISourceCode> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, selectedFile: ConversationContext<Workspace.UISourceCode.UISourceCode> | null): Promise<string>;
}
