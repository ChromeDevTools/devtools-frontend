import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
export declare function getDisabledReasons(aidaAvailability: Host.AidaClient.AidaAccessPreconditions): Platform.UIString.LocalizedString[];
export declare function isGeminiBranding(): boolean;
export declare function getIconName(): string;
export declare function isSameOrigin(url1: Platform.DevToolsPath.UrlString, url2: Platform.DevToolsPath.UrlString): boolean;
export interface OneShotPromptRequest {
    aidaClient: Host.AidaClient.AidaClient;
    preamble: string;
    query: string;
    clientFeature: Host.AidaClient.ClientFeature;
    temperature?: number;
    modelId?: string;
    userTier?: string;
    serverSideLoggingEnabled?: boolean;
    signal?: AbortSignal;
}
export declare function runOneShotPrompt({ aidaClient, preamble, query, clientFeature, temperature, modelId, userTier, serverSideLoggingEnabled, signal, }: OneShotPromptRequest): Promise<string>;
