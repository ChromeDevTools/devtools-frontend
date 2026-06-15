import type * as SDK from '../../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import { type ContextDetail, ConversationContext } from '../agents/AiAgent.js';
/**
 * Returns the origin for a network request in the AI context.
 *
 * To prevent cross-origin prompt injection attacks, HAR-imported requests
 * are isolated from live pages. We assign them a virtual origin
 * (`imported-har://${domain}`) so they do not share the origin of live pages
 * (e.g., `https://${domain}`). This forces a conversation reset when transitioning
 * between imported HAR data and live pages.
 */
export declare function getRequestContextOrigin(request: SDK.NetworkRequest.NetworkRequest): string;
export declare class RequestContext extends ConversationContext<SDK.NetworkRequest.NetworkRequest> {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator);
    /**
     * Note: this is not the literal origin of the network request. This URL
     * is used to determine when we should force the user to start a new AI
     * conversation when the context changes. We allow a single AI conversation to
     * inspect all network requests that were made for that given target URL.
     */
    getURL(): string;
    getOrigin(): string;
    getItem(): SDK.NetworkRequest.NetworkRequest;
    getTitle(): string;
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
}
