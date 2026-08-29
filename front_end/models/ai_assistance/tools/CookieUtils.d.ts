import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type { OriginLockCapability } from './Tool.js';
export interface CookieDetails {
    name: string;
    value: string;
    domain: string;
    path: string;
    /** Expiration time in milliseconds since UNIX epoch, or undefined for session cookies. */
    expires?: number;
    size: number;
    secure: boolean;
    sameSite?: Protocol.Network.CookieSameSite;
    partitioned: boolean;
    priority?: Protocol.Network.CookiePriority;
    sourcePort?: number;
    sourceScheme?: Protocol.Network.CookieSourceScheme;
}
/**
 * Resolves and validates target origins against origin-lock constraints and primary page target.
 * If `requestedOrigins` is omitted or empty, defaults to the established context origin.
 */
export declare function resolveAllowedTargetOrigins(requestedOrigins: string[] | undefined, context: OriginLockCapability, targetManager: SDK.TargetManager.TargetManager): {
    targetOrigins: string[];
    primaryPageTarget: SDK.Target.Target;
} | {
    error: string;
};
export type GetCookiesForOriginResult = {
    cookies: SDK.Cookie.Cookie[];
} | {
    error: string;
};
/**
 * Finds the resource tree frame matching the target origin within the primary page's outermost target tree.
 */
export declare function findFrameForOrigin(origin: string, targetManager: SDK.TargetManager.TargetManager, primaryPageTarget: SDK.Target.Target): SDK.ResourceTreeModel.ResourceTreeFrame | null;
/**
 * Retrieves all cookies accessible to the target origin, strictly excluding HttpOnly cookies.
 * Locates the matching frame within the primary page target tree, queries its CookieModel,
 * and filters cookies by security origin.
 */
export declare function getCookiesForOrigin(origin: string, targetManager: SDK.TargetManager.TargetManager, primaryPageTarget: SDK.Target.Target): Promise<GetCookiesForOriginResult>;
