import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
/**
 * Preconditions determined entirely on the DevTools frontend side (e.g. Incognito
 * mode or age restrictions) that prevent AI assistance features from running.
 * These are evaluated independently of AIDA service-level availability.
 */
export declare const enum FrontendAccessPrecondition {
    IS_OFF_THE_RECORD = "is-off-the-record",
    AGE_RESTRICTED = "age-restricted"
}
/**
 * The unified set of preconditions that can disable AI assistance.
 * This is a union of low-level AIDA service availability preconditions
 * and DevTools frontend-specific preconditions.
 */
export type AccessPrecondition = Exclude<Host.AidaClient.AidaAccessPreconditions, Host.AidaClient.AidaAccessPreconditions.AVAILABLE> | FrontendAccessPrecondition;
/**
 * Returns the list of active preconditions currently preventing AI assistance from being enabled.
 * Checks local frontend constraints (e.g. incognito, age check) and combines them with the
 * provided AIDA service availability status.
 */
export declare function getDisabledReasons(aidaAvailability: Host.AidaClient.AidaAccessPreconditions): AccessPrecondition[];
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
