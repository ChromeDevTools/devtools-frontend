// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
const resourceTypeToAsAttribute = new Map([
    [Common.ResourceType.resourceTypes.Document, 'document'],
    [Common.ResourceType.resourceTypes.Stylesheet, 'style'],
    [Common.ResourceType.resourceTypes.Image, 'image'],
    [Common.ResourceType.resourceTypes.Font, 'font'],
    [Common.ResourceType.resourceTypes.Script, 'script'],
    [Common.ResourceType.resourceTypes.TextTrack, 'track'],
    [Common.ResourceType.resourceTypes.Manifest, 'manifest'],
    [Common.ResourceType.resourceTypes.Fetch, 'fetch'],
    [Common.ResourceType.resourceTypes.XHR, 'fetch'],
    [Common.ResourceType.resourceTypes.Wasm, 'fetch'],
]);
/**
 * Escapes HTML special characters.
 * Crucial for URLs in href attributes to prevent characters like '&' from being
 * interpreted as HTML entities (e.g., '&copy' becoming '©').
 */
function escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function parsePreloadLinkOrigins(request) {
    const requestOrigin = request.parsedURL.securityOrigin();
    const documentURL = request.documentURL;
    const documentOrigin = documentURL ? (Common.ParsedURL.ParsedURL.fromString(documentURL)?.securityOrigin() ?? null) : null;
    return { requestOrigin, documentOrigin };
}
function determinePreloadLinkHref(request, isSameOrigin) {
    // For same-origin resources, use root-relative URL for environment portability.
    if (isSameOrigin && request.parsedURL.isValid) {
        return request.parsedURL.path + (request.parsedURL.queryParams ? '?' + request.parsedURL.queryParams : '');
    }
    return request.url();
}
function determinePreloadLinkCrossOrigin(request, isCrossOrigin) {
    const resourceType = request.resourceType();
    const asValue = resourceTypeToAsAttribute.get(resourceType);
    const isFont = resourceType === Common.ResourceType.resourceTypes.Font;
    const isFetch = asValue === 'fetch';
    const secFetchMode = request.requestHeaderValue('sec-fetch-mode')?.toLowerCase();
    const needsCrossOrigin = isFont || isFetch || secFetchMode === 'cors';
    if (!needsCrossOrigin) {
        return '';
    }
    const hasCredentials = request.includedRequestCookies().length > 0 ||
        Boolean(request.requestHeaderValue('cookie') || request.requestHeaderValue('authorization'));
    // Only use credentials mode if it is cross-origin AND has credentials.
    // Same-origin CORS (anonymous) automatically sends credentials.
    const useCredentials = isCrossOrigin && hasCredentials;
    return useCredentials ? ' crossorigin="use-credentials"' : ' crossorigin';
}
/**
 * Determines whether a network request can be preloaded.
 */
export function canPreloadRequest(request) {
    return resourceTypeToAsAttribute.has(request.resourceType());
}
/**
 * Generates an HTML `<link rel="preload">` element string for a given network request.
 */
export function generatePreloadLink(request) {
    const { requestOrigin, documentOrigin } = parsePreloadLinkOrigins(request);
    const isSameOrigin = Boolean(requestOrigin && documentOrigin && requestOrigin === documentOrigin);
    const isCrossOrigin = Boolean(requestOrigin && documentOrigin && requestOrigin !== documentOrigin);
    const url = determinePreloadLinkHref(request, isSameOrigin);
    const escapedUrl = escapeHTML(url);
    const resourceType = request.resourceType();
    const escapedMimeType = request.mimeType ? escapeHTML(request.mimeType) : '';
    const asValue = resourceTypeToAsAttribute.get(resourceType);
    const asAttr = `as="${asValue ?? 'fetch'}"`;
    const crossoriginAttr = determinePreloadLinkCrossOrigin(request, isCrossOrigin);
    const typeAttr = escapedMimeType ? ` type="${escapedMimeType}"` : '';
    return `<link rel="preload" href="${escapedUrl}" ${asAttr}${typeAttr}${crossoriginAttr}>`;
}
//# sourceMappingURL=LinkPreloadGenerator.js.map