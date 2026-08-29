// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { areOriginsEquivalent, extractContextOrigin, isOpaqueOrigin } from '../AiOrigins.js';
import { MAX_TARGET_ORIGINS } from './DOMStorageUtils.js';
/**
 * Resolves and validates target origins against origin-lock constraints and primary page target.
 * If `requestedOrigins` is omitted or empty, defaults to the established context origin.
 */
export function resolveAllowedTargetOrigins(requestedOrigins, context, targetManager) {
    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin) || isOpaqueOrigin(extractContextOrigin(allowedOrigin))) {
        return { error: 'No origin available or not allowed.' };
    }
    const primaryPageTarget = targetManager.primaryPageTarget();
    if (!primaryPageTarget) {
        return { error: 'Primary page target not found.' };
    }
    const pageOrigin = Common.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL());
    if (!pageOrigin || !areOriginsEquivalent(pageOrigin, allowedOrigin)) {
        return { error: 'Page origin does not match allowed origin.' };
    }
    const rawOrigins = (Array.isArray(requestedOrigins) && requestedOrigins.length > 0) ? requestedOrigins : [allowedOrigin];
    const validOrigins = rawOrigins.map(origin => extractContextOrigin(origin))
        .filter(origin => areOriginsEquivalent(origin, allowedOrigin));
    const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
    if (targetOrigins.length === 0) {
        return { error: 'No valid origins found.' };
    }
    return { targetOrigins, primaryPageTarget };
}
/**
 * Finds the resource tree frame matching the target origin within the primary page's outermost target tree.
 */
export function findFrameForOrigin(origin, targetManager, primaryPageTarget) {
    const targetOrigin = extractContextOrigin(origin);
    for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
        if (frame.resourceTreeModel().target().outermostTarget() !== primaryPageTarget) {
            continue;
        }
        if (frame.securityOrigin && areOriginsEquivalent(frame.securityOrigin, targetOrigin)) {
            return frame;
        }
    }
    return null;
}
/**
 * Retrieves all cookies accessible to the target origin, strictly excluding HttpOnly cookies.
 * Locates the matching frame within the primary page target tree, queries its CookieModel,
 * and filters cookies by security origin.
 */
export async function getCookiesForOrigin(origin, targetManager, primaryPageTarget) {
    const frame = findFrameForOrigin(origin, targetManager, primaryPageTarget);
    if (!frame) {
        return { error: `Frame not found or origin disallowed for ${origin}` };
    }
    const target = frame.resourceTreeModel().target();
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    if (!cookieModel) {
        return { error: `Cookie model not found for ${origin}` };
    }
    const allCookies = await cookieModel.getCookiesForDomain(origin, true).catch(() => null);
    if (!allCookies) {
        return { error: `Failed to fetch cookies for ${origin}` };
    }
    return { cookies: allCookies.filter(cookie => !cookie.httpOnly() && cookie.matchesSecurityOrigin(origin)) };
}
//# sourceMappingURL=CookieUtils.js.map