import * as Host from '../../../core/host/host.js';
import type { AICallTree } from '../performance/AICallTree.js';
import type { AgentFocus } from '../performance/AIContext.js';
import { AiAgent, type ContextResponse, type ConversationContext, type RequestOptions } from './AiAgent.js';
export declare class PerformanceAnnotationsAgent extends AiAgent<AgentFocus> {
    preamble: string;
    get clientFeature(): Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(context: ConversationContext<AgentFocus> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, context: ConversationContext<AgentFocus> | null): Promise<string>;
    /**
     * Used in the Performance panel to automatically generate a label for a selected entry.
     */
    generateAIEntryLabel(callTree: AICallTree): Promise<string>;
}
