// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
const { urlString } = Platform.DevToolsPath;
export const LOADER_ID = 'LOADER_ID';
export const MAIN_FRAME_ID = 'main';
export const DOMAIN = 'example.com';
export const SECURITY_ORIGIN = `https://${DOMAIN}`;
export const FRAME_URL = urlString `${`${SECURITY_ORIGIN}/`}`;
export const FRAME = {
    url: FRAME_URL,
    loaderId: LOADER_ID,
    domainAndRegistry: DOMAIN,
    securityOrigin: SECURITY_ORIGIN,
    mimeType: 'text/html',
    secureContextType: "Secure" /* Protocol.Page.SecureContextType.Secure */,
    crossOriginIsolatedContextType: "Isolated" /* Protocol.Page.CrossOriginIsolatedContextType.Isolated */,
    gatedAPIFeatures: [],
};
export function getEffectivePayload(id, base, framePayload) {
    const effectivePayload = { ...base, id };
    if (framePayload) {
        if (framePayload.url) {
            const url = new URL(framePayload.url);
            framePayload.domainAndRegistry ??= url.hostname;
            framePayload.securityOrigin ??= url.origin;
        }
        Object.assign(effectivePayload, framePayload);
    }
    return effectivePayload;
}
export function getMainFrame(target, framePayload) {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel.mainFrame) {
        return resourceTreeModel.mainFrame;
    }
    resourceTreeModel.frameAttached(MAIN_FRAME_ID, null);
    const mainFrame = resourceTreeModel.mainFrame;
    mainFrame.navigate(getEffectivePayload(MAIN_FRAME_ID, FRAME, framePayload));
    return mainFrame;
}
export function createResource(frame, networkScriptUrl, mimeType, content) {
    const resource = new SDK.Resource.Resource(frame.resourceTreeModel(), null, networkScriptUrl, networkScriptUrl, MAIN_FRAME_ID, null, Common.ResourceType.ResourceType.fromMimeType(mimeType), mimeType, null, content.length);
    frame.addResource(resource);
    return resource;
}
//# sourceMappingURL=ResourceHelpers.js.map