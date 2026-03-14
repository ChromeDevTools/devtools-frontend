import * as Host from '../../../core/host/host.js';
import { AiAgent, type ContextResponse, ConversationContext, type RequestOptions } from './AiAgent.js';
export declare class ConversationSummaryContext extends ConversationContext<string> {
    #private;
    constructor(conversation: string);
    getOrigin(): string;
    getItem(): string;
    getTitle(): string;
}
/**
 * An agent that takes a full conversation between a user and an agent in markdown
 * format and produces a succinct summary of the conversation.
 *
 * This summary is designed to be read by a local agent in the user's IDE and it
 * will be used to help apply fixes to the user's local codebase based on the
 * debugging information the devtools agent found.
 *
 * This agent is not intended to be used directly by users in the AI Assistance
 * panel when chatting with DevTools AI.
 */
export declare class ConversationSummaryAgent extends AiAgent<string> {
    preamble: string;
    get clientFeature(): Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(context: ConversationContext<string> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, context: ConversationContext<string> | null): Promise<string>;
    summarizeConversation(conversation: string): Promise<string>;
}
