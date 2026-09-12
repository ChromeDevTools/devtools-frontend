import type * as SDK from '../../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import { type ContextDetail, ConversationContext } from '../agents/AiAgent.js';
export declare class RequestContext extends ConversationContext<SDK.NetworkRequest.NetworkRequest> {
    #private;
    readonly jslogContext: 'ai-context-network-request';
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator);
    /**
     * Returns the security origin of the document that initiated the request.
     *
     * Network requests to third-party endpoints share the origin of the page
     * that initiated them. This permits the AI to inspect third-party subresources
     * without triggering a cross-origin conversation reset.
     */
    getOrigin(): SDK.SecurityOrigin.SecurityOrigin;
    getItem(): SDK.NetworkRequest.NetworkRequest;
    getTitle(): string;
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
}
