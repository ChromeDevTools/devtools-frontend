import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type { RequestContext } from '../contexts/RequestContext.js';
import { AiAgent, type ContextResponse, type RequestOptions } from './AiAgent.js';
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class NetworkAgent extends AiAgent<SDK.NetworkRequest.NetworkRequest> {
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(selectedNetworkRequest: RequestContext | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, selectedNetworkRequest: RequestContext | null): Promise<string>;
}
