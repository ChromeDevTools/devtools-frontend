// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import {areOriginsEquivalent, extractContextOrigin} from '../AiOrigins.js';

/**
 * Finds the resource tree frame matching the target origin within the primary page's outermost target tree.
 */
export function findFrameForOrigin(
    origin: string,
    targetManager: SDK.TargetManager.TargetManager,
    primaryPageTarget: SDK.Target.Target,
    ): SDK.ResourceTreeModel.ResourceTreeFrame|null {
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
 */
export async function getCookiesForOrigin(
    target: SDK.Target.Target,
    origin: string,
    ): Promise<SDK.Cookie.Cookie[]|null> {
  const cookieModel = target.model(SDK.CookieModel.CookieModel);
  if (!cookieModel) {
    return null;
  }

  const allCookies = await cookieModel.getCookiesForDomain(origin, true).catch(() => null);
  if (!allCookies) {
    return null;
  }
  return allCookies.filter(cookie => !cookie.httpOnly() && cookie.matchesSecurityOrigin(origin));
}
