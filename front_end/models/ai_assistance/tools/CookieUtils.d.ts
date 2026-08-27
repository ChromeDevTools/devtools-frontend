import * as SDK from '../../../core/sdk/sdk.js';
/**
 * Finds the resource tree frame matching the target origin within the primary page's outermost target tree.
 */
export declare function findFrameForOrigin(origin: string, targetManager: SDK.TargetManager.TargetManager, primaryPageTarget: SDK.Target.Target): SDK.ResourceTreeModel.ResourceTreeFrame | null;
/**
 * Retrieves all cookies accessible to the target origin, strictly excluding HttpOnly cookies.
 */
export declare function getCookiesForOrigin(target: SDK.Target.Target, origin: string): Promise<SDK.Cookie.Cookie[] | null>;
