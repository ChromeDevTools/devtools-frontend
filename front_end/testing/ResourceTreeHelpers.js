// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import { clearMockConnectionResponseHandler, setMockConnectionResponseHandler, } from './MockConnection.js';
const { urlString } = Platform.DevToolsPath;
export const LOADER_ID = 'LOADER_ID';
export const MAIN_FRAME_ID = 'main';
export const DOMAIN = 'example.com';
export const SECURITY_ORIGIN = `https://${DOMAIN}`;
export const FRAME_URL = urlString `${`${SECURITY_ORIGIN}/`}`;
let childFrameId = 0;
const FRAME = {
    url: FRAME_URL,
    loaderId: LOADER_ID,
    domainAndRegistry: DOMAIN,
    securityOrigin: SECURITY_ORIGIN,
    mimeType: 'text/html',
    secureContextType: "Secure" /* Protocol.Page.SecureContextType.Secure */,
    crossOriginIsolatedContextType: "Isolated" /* Protocol.Page.CrossOriginIsolatedContextType.Isolated */,
    gatedAPIFeatures: [],
};
const MAIN_FRAME = {
    ...FRAME,
    id: MAIN_FRAME_ID,
};
export function setMockResourceTree(shouldMock) {
    if (shouldMock) {
        setMockConnectionResponseHandler('Page.getResourceTree', () => ({
            frameTree: {
                frame: MAIN_FRAME,
                resources: [],
            },
        }));
    }
    else {
        clearMockConnectionResponseHandler('Page.getResourceTree');
    }
}
export async function getInitializedResourceTreeModel(target) {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel.cachedResourcesLoaded() ?
        resourceTreeModel :
        await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
}
function getEffectivePayload(id, base, framePayload) {
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
export async function addChildFrame(target, framePayload) {
    const resourceTreeModel = await getInitializedResourceTreeModel(target);
    getMainFrame(target);
    const childFrame = resourceTreeModel.frameAttached(`CHILD_FRAME_${++childFrameId}`, MAIN_FRAME_ID);
    assert.exists(childFrame);
    if (framePayload) {
        navigate(childFrame, { ...FRAME, ...framePayload });
    }
    return childFrame;
}
export function createResource(frame, networkScriptUrl, mimeType, content) {
    const resource = new SDK.Resource.Resource(frame.resourceTreeModel(), null, networkScriptUrl, networkScriptUrl, MAIN_FRAME_ID, null, Common.ResourceType.ResourceType.fromMimeType(mimeType), mimeType, null, content.length);
    frame.addResource(resource);
    return resource;
}
export function navigate(frame, framePayload, type = "Navigation" /* Protocol.Page.NavigationType.Navigation */) {
    const effectivePayload = getEffectivePayload(frame.id, FRAME, framePayload);
    frame.resourceTreeModel().frameNavigated(effectivePayload, type);
}
export function activate(target) {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame = getMainFrame(target);
    sinon.stub(frame, 'isPrimaryFrame').returns(true);
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, { frame, type: "Activation" /* SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION */ });
}
//# sourceMappingURL=ResourceTreeHelpers.js.map