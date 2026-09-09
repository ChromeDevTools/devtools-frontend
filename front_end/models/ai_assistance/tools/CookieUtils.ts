// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';

import {MAX_TARGET_ORIGINS} from './DOMStorageUtils.js';
import type {OriginLockCapability} from './Tool.js';

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
export function resolveAllowedTargetOrigins(
    requestedOrigins: string[]|undefined,
    context: OriginLockCapability,
    targetManager: SDK.TargetManager.TargetManager,
    ): {targetOrigins: string[], primaryPageTarget: SDK.Target.Target}|{
  error: string,
}
{
  const establishedOrigin = context.getEstablishedOrigin();
  if (!establishedOrigin || establishedOrigin.isOpaque()) {
    return {error: 'No origin available or not allowed.'};
  }

  const primaryPageTarget = targetManager.primaryPageTarget();
  if (!primaryPageTarget) {
    return {error: 'Primary page target not found.'};
  }

  const pageOrigin = SDK.SecurityOrigin.SecurityOrigin.create(primaryPageTarget.inspectedURL());
  if (!pageOrigin || !pageOrigin.isSameOriginWith(establishedOrigin)) {
    return {error: 'Page origin does not match allowed origin.'};
  }

  const candidateOrigins: SDK.SecurityOrigin.SecurityOrigin[] =
      (Array.isArray(requestedOrigins) && requestedOrigins.length > 0) ?
      requestedOrigins.map(origin => SDK.SecurityOrigin.SecurityOrigin.create(origin)) :
      [establishedOrigin];

  const validOrigins =
      candidateOrigins.filter(origin => origin.isSameOriginWith(establishedOrigin)).map(origin => origin.siteId());

  const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
  if (targetOrigins.length === 0) {
    return {error: 'No valid origins found.'};
  }

  return {targetOrigins, primaryPageTarget};
}

export type GetCookiesForOriginResult = {
  cookies: SDK.Cookie.Cookie[],
}|{
  error: string,
};

/**
 * Finds a frame in the primary page target tree that matches the specified origin.
 *
 * Returns `null` if the origin is opaque or if no matching frame exists.
 *
 * @param origin The target origin URL to match.
 * @param targetManager The target manager to query for active frames.
 * @param primaryPageTarget The primary page target containing the frame tree.
 * @returns The matching frame, or `null` if not found.
 */
export function findFrameForOrigin(
    origin: string,
    targetManager: SDK.TargetManager.TargetManager,
    primaryPageTarget: SDK.Target.Target,
    ): SDK.ResourceTreeModel.ResourceTreeFrame|null {
  const targetOrigin = SDK.SecurityOrigin.SecurityOrigin.create(origin);
  if (targetOrigin.isOpaque()) {
    return null;
  }
  for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
    if (frame.resourceTreeModel().target().outermostTarget() !== primaryPageTarget) {
      continue;
    }
    if (!frame.securityOrigin) {
      continue;
    }
    const frameOrigin = SDK.SecurityOrigin.SecurityOrigin.create(frame.securityOrigin);
    if (frameOrigin.isSameOriginWith(targetOrigin)) {
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
export async function getCookiesForOrigin(
    origin: string,
    targetManager: SDK.TargetManager.TargetManager,
    primaryPageTarget: SDK.Target.Target,
    ): Promise<GetCookiesForOriginResult> {
  const frame = findFrameForOrigin(origin, targetManager, primaryPageTarget);
  if (!frame) {
    return {error: `Frame not found or origin disallowed for ${origin}`};
  }

  const target = frame.resourceTreeModel().target();
  const cookieModel = target.model(SDK.CookieModel.CookieModel);
  if (!cookieModel) {
    return {error: `Cookie model not found for ${origin}`};
  }

  const allCookies = await cookieModel.getCookiesForDomain(origin, true).catch(() => null);
  if (!allCookies) {
    return {error: `Failed to fetch cookies for ${origin}`};
  }
  return {cookies: allCookies.filter(cookie => !cookie.httpOnly() && cookie.matchesSecurityOrigin(origin))};
}
