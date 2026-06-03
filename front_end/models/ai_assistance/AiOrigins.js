// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
/**
 * Returns true if the origin is considered opaque and should be blocked from
 * AI assistance to prevent potential data leakage.
 *
 * @see https://crbug.com/513732588
 */
export function isOpaqueOrigin(origin) {
    /**
     * Origins starting with 'about' (like about:blank or about:srcdoc) are
     * considered opaque. 'about://' is the sentinel used by DevTools
     * ParsedURL.securityOrigin() for these.
     */
    return origin === 'null' || origin === 'data:' || origin.startsWith('about') || origin.startsWith('detached');
}
/**
 * Extracts the origin from a context URL or identifier.
 * Handles special cases like "detached" nodes and trace identifiers.
 */
export function extractContextOrigin(contextURL) {
    if (isOpaqueOrigin(contextURL)) {
        return contextURL;
    }
    if (contextURL.startsWith('trace-')) {
        return contextURL;
    }
    return Common.ParsedURL.ParsedURL.extractOrigin(contextURL);
}
/**
 * Determines if two origins are equivalent and safe to be used together.
 * Opaque origins are never equivalent to anything, not even themselves.
 */
export function areOriginsEquivalent(origin1, origin2) {
    if (isOpaqueOrigin(origin1) || isOpaqueOrigin(origin2)) {
        return false;
    }
    return origin1 === origin2;
}
//# sourceMappingURL=AiOrigins.js.map