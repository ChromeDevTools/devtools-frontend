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
 * Resolves and validates target origins against the established context origin and primary page target.
 *
 * When `requestedOrigins` is empty or omitted, defaults to the established context origin.
 * Rejects opaque origins, mismatches with the primary page origin, and cross-origin targets.
 * Limits results to at most `MAX_TARGET_ORIGINS` unique origins.
 *
 * @param requestedOrigins Optional list of origin URLs to validate.
 * @param context The origin lock capability containing the established origin.
 * @param targetManager The target manager used to resolve the primary page target.
 * @returns An object with validated target origins and the primary page target, or an error object.
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
 * Retrieves all cookies accessible to the target origin, excluding HttpOnly cookies.
 * Locates the matching frame within the primary page target tree, queries its CookieModel,
 * and filters cookies by security origin.
 */
export declare function getCookiesForOrigin(origin: string, primaryPageTarget: SDK.Target.Target): Promise<GetCookiesForOriginResult>;
