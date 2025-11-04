// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
const uiSourceCodeToAttributionMap = new WeakMap();
const projectToTargetMap = new WeakMap();
let networkProjectManagerInstance;
export class NetworkProjectManager extends Common.ObjectWrapper.ObjectWrapper {
    constructor() {
        super();
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!networkProjectManagerInstance || forceNew) {
            networkProjectManagerInstance = new NetworkProjectManager();
        }
        return networkProjectManagerInstance;
    }
}
export class NetworkProject {
    static resolveFrame(uiSourceCode, frameId) {
        const target = NetworkProject.targetForUISourceCode(uiSourceCode);
        const resourceTreeModel = target?.model(SDK.ResourceTreeModel.ResourceTreeModel);
        return resourceTreeModel ? resourceTreeModel.frameForId(frameId) : null;
    }
    static setInitialFrameAttribution(uiSourceCode, frameId) {
        if (!frameId) {
            return;
        }
        const frame = NetworkProject.resolveFrame(uiSourceCode, frameId);
        if (!frame) {
            return;
        }
        const attribution = new Map();
        attribution.set(frameId, { frame, count: 1 });
        uiSourceCodeToAttributionMap.set(uiSourceCode, attribution);
    }
    static cloneInitialFrameAttribution(fromUISourceCode, toUISourceCode) {
        const fromAttribution = uiSourceCodeToAttributionMap.get(fromUISourceCode);
        if (!fromAttribution) {
            return;
        }
        const toAttribution = new Map();
        for (const frameId of fromAttribution.keys()) {
            const value = fromAttribution.get(frameId);
            if (typeof value !== 'undefined') {
                toAttribution.set(frameId, { frame: value.frame, count: value.count });
            }
        }
        uiSourceCodeToAttributionMap.set(toUISourceCode, toAttribution);
    }
    static addFrameAttribution(uiSourceCode, frameId) {
        const frame = NetworkProject.resolveFrame(uiSourceCode, frameId);
        if (!frame) {
            return;
        }
        const frameAttribution = uiSourceCodeToAttributionMap.get(uiSourceCode);
        if (!frameAttribution) {
            return;
        }
        const attributionInfo = frameAttribution.get(frameId) || { frame, count: 0 };
        attributionInfo.count += 1;
        frameAttribution.set(frameId, attributionInfo);
        if (attributionInfo.count !== 1) {
            return;
        }
        const data = { uiSourceCode, frame };
        NetworkProjectManager.instance().dispatchEventToListeners("FrameAttributionAdded" /* Events.FRAME_ATTRIBUTION_ADDED */, data);
    }
    static removeFrameAttribution(uiSourceCode, frameId) {
        const frameAttribution = uiSourceCodeToAttributionMap.get(uiSourceCode);
        if (!frameAttribution) {
            return;
        }
        const attributionInfo = frameAttribution.get(frameId);
        console.assert(Boolean(attributionInfo), 'Failed to remove frame attribution for url: ' + uiSourceCode.url());
        if (!attributionInfo) {
            return;
        }
        attributionInfo.count -= 1;
        if (attributionInfo.count > 0) {
            return;
        }
        frameAttribution.delete(frameId);
        const data = { uiSourceCode, frame: attributionInfo.frame };
        NetworkProjectManager.instance().dispatchEventToListeners("FrameAttributionRemoved" /* Events.FRAME_ATTRIBUTION_REMOVED */, data);
    }
    static targetForUISourceCode(uiSourceCode) {
        return projectToTargetMap.get(uiSourceCode.project()) || null;
    }
    static setTargetForProject(project, target) {
        projectToTargetMap.set(project, target);
    }
    static getTargetForProject(project) {
        return projectToTargetMap.get(project) || null;
    }
    static framesForUISourceCode(uiSourceCode) {
        const target = NetworkProject.targetForUISourceCode(uiSourceCode);
        const resourceTreeModel = target?.model(SDK.ResourceTreeModel.ResourceTreeModel);
        const attribution = uiSourceCodeToAttributionMap.get(uiSourceCode);
        if (!resourceTreeModel || !attribution) {
            return [];
        }
        const frames = Array.from(attribution.keys()).map(frameId => resourceTreeModel.frameForId(frameId));
        return frames.filter(frame => !!frame);
    }
}
//# sourceMappingURL=NetworkProject.js.map