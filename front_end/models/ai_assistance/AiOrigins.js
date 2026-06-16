// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
/**
 * Returns true if the origin is considered opaque and should be blocked from
 * AI assistance to prevent potential data leakage.
 *
 * @param origin The origin string to check.
 * @returns True if the origin is opaque and blocked.
 * @see https://crbug.com/513732588
 */
export function isOpaqueOrigin(origin) {
    /**
     * Origins starting with 'about' (like about:blank or about:srcdoc) are
     * considered opaque. 'about://' is the sentinel used by DevTools
     * ParsedURL.securityOrigin() for these.
     *
     * We also treat empty origins, 'undefined', and 'null' as opaque to prevent
     * bypasses when URL parsing fails or variables are uninitialized.
     */
    const lower = origin.toLowerCase();
    return lower === '' || lower === 'null' || lower === 'data:' || lower.startsWith('about') ||
        lower.startsWith('detached') || lower.startsWith('undefined');
}
/**
 * Extracts the origin from a context URL or identifier.
 * Handles special cases like "detached" nodes, trace identifiers,
 * opaque blob URLs, and isolates local file paths.
 *
 * @param contextURL The context URL or trace/node identifier.
 * @returns The extracted origin string.
 */
export function extractContextOrigin(contextURL) {
    if (isOpaqueOrigin(contextURL)) {
        return contextURL;
    }
    if (contextURL.startsWith('trace-')) {
        return contextURL;
    }
    // If a blob URL has an opaque inner origin (e.g. blob:null/uuid, blob:about:blank),
    // it won't contain "://". We classify these as opaque ('null') to prevent cross-origin leaks.
    if (/^blob:/i.test(contextURL)) {
        const innerURL = contextURL.substring(5);
        if (!innerURL.includes('://')) {
            return 'null';
        }
    }
    // Local files collapse to a generic "file://" origin by default. We isolate them
    // by appending the normalized path, ensuring distinct files are treated as different origins.
    if (/^file:\/\//i.test(contextURL)) {
        const parsed = Common.ParsedURL.ParsedURL.fromString(contextURL);
        if (parsed) {
            // Include host and port (authority) to preserve server names in Windows UNC paths
            // (e.g. file://server/path) so different network shares are isolated.
            const authority = parsed.host + (parsed.port ? ':' + parsed.port : '');
            return 'file://' + authority + parsed.path;
        }
        // Fallback to 'null' (opaque) if parsing fails. This prevents malformed file URLs
        // from bypassing isolation by collapsing to the same 'file://' string.
        return 'null';
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
/**
 * Validates if the source code contents of a file (identified by targetURL) can be retrieved
 * and shared with the AI, based on the origin of the active trace context.
 *
 * This function handles the following branches:
 * 1. **Opaque origins**: If either the trace origin or target file origin is opaque
 *    (e.g., data URLs, about:blank, sandboxed frames), access is blocked.
 * 2. **Fresh Recordings**: For live page recordings, a strict same-origin comparison
 *    (scheme, host, and port matching) is enforced.
 *
 * @param targetURL The URL of the file to be read.
 * @param traceOrigin The allowed origin of the trace context.
 * @returns true if reading the file is permitted; false otherwise.
 */
export function canResourceContentsBeReadForTrace(targetURL, traceOrigin) {
    // We explicitly block all file:// URLs. While we want to allow users to debug
    // traces on local sites, allowing file:// access poses security risks (e.g.,
    // reading local files like /etc/passwd via prompt injection) because file://
    // origins are not sufficiently isolated from each other in DevTools' origin model.
    if (traceOrigin.startsWith('file://') || targetURL.startsWith('file://')) {
        return false;
    }
    const targetOrigin = extractContextOrigin(targetURL);
    return areOriginsEquivalent(targetOrigin, traceOrigin);
}
//# sourceMappingURL=AiOrigins.js.map