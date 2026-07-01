import type * as SDK from '../../core/sdk/sdk.js';
/**
 * Determines whether a network request can be preloaded.
 */
export declare function canPreloadRequest(request: SDK.NetworkRequest.NetworkRequest): boolean;
/**
 * Generates an HTML `<link rel="preload">` element string for a given network request.
 */
export declare function generatePreloadLink(request: SDK.NetworkRequest.NetworkRequest): string;
