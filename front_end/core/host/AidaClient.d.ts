import * as Common from '../common/common.js';
import { AidaAccessPreconditions, type AidaRegisterClientEvent, type CompletionRequest, type CompletionResponse, type DoConversationRequest, type DoConversationResponse, type GenerateCodeRequest, type GenerateCodeResponse, UserTier } from './AidaClientTypes.js';
import type { AidaClientResult } from './InspectorFrontendHostAPI.js';
export * from './AidaClientTypes.js';
export declare const CLIENT_NAME = "CHROME_DEVTOOLS";
export declare const SERVICE_NAME = "aidaService";
export declare class AidaAbortError extends Error {
}
export declare class AidaBlockError extends Error {
}
export declare class AidaClient {
    static buildConsoleInsightsRequest(input: string): DoConversationRequest;
    static checkAccessPreconditions(): Promise<AidaAccessPreconditions>;
    doConversation(request: DoConversationRequest, options?: {
        signal?: AbortSignal;
    }): AsyncGenerator<DoConversationResponse, void, void>;
    registerClientEvent(clientEvent: AidaRegisterClientEvent): Promise<AidaClientResult>;
    completeCode(request: CompletionRequest): Promise<CompletionResponse | null>;
    generateCode(request: GenerateCodeRequest, options?: {
        signal?: AbortSignal;
    }): Promise<GenerateCodeResponse | null>;
}
export declare function convertToUserTierEnum(userTier: string | undefined): UserTier;
export declare class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private constructor();
    static instance(): HostConfigTracker;
    addEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>): Common.EventTarget.EventDescriptor<EventTypes>;
    removeEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>): void;
    pollAidaAvailability(): Promise<void>;
}
export declare const enum Events {
    AIDA_AVAILABILITY_CHANGED = "aidaAvailabilityChanged"
}
export interface EventTypes {
    [Events.AIDA_AVAILABILITY_CHANGED]: void;
}
