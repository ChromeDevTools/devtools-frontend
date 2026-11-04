import * as Common from '../common/common.js';
import { AidaAccessPreconditions, type AidaRegisterClientEvent, ClientFeature, type CompletionRequest, type CompletionResponse, type DoConversationRequest, type DoConversationResponse, type GenerateCodeRequest, type GenerateCodeResponse, UserTier } from './AidaClientTypes.js';
import type { AidaClientResult } from './InspectorFrontendHostAPI.js';
export * from './AidaClientTypes.js';
export declare const CLIENT_NAME = "CHROME_DEVTOOLS";
export declare const SERVICE_NAME = "aidaService";
export declare abstract class AidaClientError extends Error {
    name: string;
}
export declare class AidaUnknownError extends AidaClientError {
    name: string;
}
export declare class AidaAbortError extends AidaClientError {
    name: string;
}
export declare class AidaBlockError extends AidaClientError {
    name: string;
}
export declare class AidaQuotaError extends AidaClientError {
    name: string;
}
export declare class AidaPayloadTooLargeError extends AidaClientError {
    name: string;
}
export declare class AidaPermissionDeniedError extends AidaClientError {
    name: string;
}
export declare class AidaTimeoutError extends AidaClientError {
    name: string;
}
export declare class AidaInvalidJsonResponseError extends AidaClientError {
    name: string;
}
export declare class AidaClient {
    #private;
    static buildConsoleInsightsRequest(input: string): DoConversationRequest;
    static checkAccessPreconditions(): Promise<AidaAccessPreconditions>;
    doConversation(request: DoConversationRequest, options?: {
        signal?: AbortSignal;
    }): AsyncGenerator<DoConversationResponse, void, void>;
    registerClientEvent(clientEvent: AidaRegisterClientEvent): Promise<AidaClientResult>;
    completeCode(request: CompletionRequest): Promise<CompletionResponse | null>;
    generateCode(request: GenerateCodeRequest, options?: {
        signal?: AbortSignal;
    }): Promise<GenerateCodeResponse>;
}
export declare function convertToUserTierEnum(userTier: string | undefined): UserTier;
export declare function getClientFeatureName(feature: ClientFeature): string;
export declare class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    get aidaAvailability(): AidaAccessPreconditions | undefined;
    static instance({ forceNew }?: {
        forceNew: boolean;
    }): HostConfigTracker;
    dispose(): void;
    static removeInstance(): void;
    addEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>): Common.EventTarget.EventDescriptor<EventTypes>;
    removeEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>): void;
    pollAidaAvailability(): Promise<void>;
}
export declare const enum Events {
    AIDA_AVAILABILITY_CHANGED = "aidaAvailabilityChanged"
}
export interface EventTypes {
    [Events.AIDA_AVAILABILITY_CHANGED]: AidaAccessPreconditions;
}
/**
 * Checks whether any of the provided error strings indicate a quota or rate-limit failure.
 *
 * AIDA and GCA surface quota errors across different fields (status codes, human-readable
 * messages, and serialized `google.rpc.ErrorInfo` details), so we check three substrings:
 * - `'quota'`: direct AIDA error messages or details (for example,
 *   `"Quota exceeded for quota metric 'AiCodeCompleteService'"` or `"USER_QUOTA_EXCEEDED"`).
 * - `'resource_exhausted'`: the standard `google.rpc.Code` status string (for example,
 *   `status: "RESOURCE_EXHAUSTED"` or `"RESOURCE_EXHAUSTED: quota exceeded"`).
 * - `'rate_limit_exceeded'`: the `reason` field inside `google.rpc.ErrorInfo` details when
 *   the message itself does not mention `'quota'` (for example, GCA returning
 *   `message: "You have exhausted your capacity on this model."` with
 *   `details: [{"reason": "RATE_LIMIT_EXCEEDED", "domain": "cloudcode-pa.googleapis.com"}]`).
 */
export declare function isQuotaError(...inputs: Array<string | undefined>): boolean;
export declare function isPayloadTooLargeError(...inputs: Array<string | undefined>): boolean;
/**
 * Maps AIDA-specific errors, DispatchHttpRequestErrors, strings, structured
 * error objects, and generic Errors to dedicated AidaClientError subclasses.
 */
export declare function mapError(err: unknown, detail?: string): AidaClientError;
