// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import { SDKModel } from './SDKModel.js';
export class Target extends ProtocolClient.InspectorBackend.TargetBase {
    #targetManager;
    #name;
    #inspectedURL = Platform.DevToolsPath.EmptyUrlString;
    #inspectedURLName = '';
    #capabilitiesMask;
    #type;
    #parentTarget;
    #id;
    #modelByConstructor = new Map();
    #isSuspended;
    /**
     * Generally when a target crashes we don't need to know, with one exception.
     * If a target crashes during the recording of a performance trace, after the
     * trace when we try to resume() it, it will fail because it has crashed. This
     * causes the performance panel to freeze (see crbug.com/333989070). So we
     * mark the target as crashed so we can exit without trying to resume it. In
     * `ChildTargetManager` we will mark a target as "un-crashed" when we get the
     * `targetInfoChanged` event. This helps ensure we can deal with cases where
     * the page crashes, but a reload fixes it and the targets get restored (see
     * crbug.com/387258086).
     */
    #hasCrashed = false;
    #targetInfo;
    #creatingModels;
    constructor(targetManager, id, name, type, parentTarget, sessionId, suspended, connection, targetInfo) {
        const needsNodeJSPatching = type === Type.NODE;
        super(needsNodeJSPatching, parentTarget, sessionId, connection);
        this.#targetManager = targetManager;
        this.#name = name;
        this.#capabilitiesMask = 0;
        switch (type) {
            case Type.FRAME:
                this.#capabilitiesMask = 1 /* Capability.BROWSER */ | 8192 /* Capability.STORAGE */ | 2 /* Capability.DOM */ | 4 /* Capability.JS */ |
                    8 /* Capability.LOG */ | 16 /* Capability.NETWORK */ | 32 /* Capability.TARGET */ | 128 /* Capability.TRACING */ | 256 /* Capability.EMULATION */ |
                    1024 /* Capability.INPUT */ | 2048 /* Capability.INSPECTOR */ | 32768 /* Capability.AUDITS */ | 65536 /* Capability.WEB_AUTHN */ | 131072 /* Capability.IO */ |
                    262144 /* Capability.MEDIA */ | 524288 /* Capability.EVENT_BREAKPOINTS */;
                if (parentTarget?.type() !== Type.FRAME) {
                    // This matches backend exposing certain capabilities only for the main frame.
                    this.#capabilitiesMask |=
                        4096 /* Capability.DEVICE_EMULATION */ | 64 /* Capability.SCREEN_CAPTURE */ | 512 /* Capability.SECURITY */ | 16384 /* Capability.SERVICE_WORKER */;
                    if (Common.ParsedURL.schemeIs(targetInfo?.url, 'chrome-extension:')) {
                        this.#capabilitiesMask &= ~512 /* Capability.SECURITY */;
                    }
                    // TODO(dgozman): we report service workers for the whole frame tree on the main frame,
                    // while we should be able to only cover the subtree corresponding to the target.
                }
                break;
            case Type.ServiceWorker:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 8 /* Capability.LOG */ | 16 /* Capability.NETWORK */ | 32 /* Capability.TARGET */ |
                    2048 /* Capability.INSPECTOR */ | 131072 /* Capability.IO */ | 524288 /* Capability.EVENT_BREAKPOINTS */;
                if (parentTarget?.type() !== Type.FRAME) {
                    this.#capabilitiesMask |= 1 /* Capability.BROWSER */ | 8192 /* Capability.STORAGE */;
                }
                break;
            case Type.SHARED_WORKER:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 8 /* Capability.LOG */ | 16 /* Capability.NETWORK */ | 32 /* Capability.TARGET */ |
                    131072 /* Capability.IO */ | 262144 /* Capability.MEDIA */ | 2048 /* Capability.INSPECTOR */ | 524288 /* Capability.EVENT_BREAKPOINTS */;
                if (parentTarget?.type() !== Type.FRAME) {
                    this.#capabilitiesMask |= 8192 /* Capability.STORAGE */;
                }
                break;
            case Type.SHARED_STORAGE_WORKLET:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 8 /* Capability.LOG */ | 2048 /* Capability.INSPECTOR */ | 524288 /* Capability.EVENT_BREAKPOINTS */;
                break;
            case Type.Worker:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 8 /* Capability.LOG */ | 16 /* Capability.NETWORK */ | 32 /* Capability.TARGET */ |
                    131072 /* Capability.IO */ | 262144 /* Capability.MEDIA */ | 256 /* Capability.EMULATION */ | 524288 /* Capability.EVENT_BREAKPOINTS */;
                if (parentTarget?.type() !== Type.FRAME) {
                    this.#capabilitiesMask |= 8192 /* Capability.STORAGE */;
                }
                break;
            case Type.WORKLET:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 8 /* Capability.LOG */ | 524288 /* Capability.EVENT_BREAKPOINTS */ | 16 /* Capability.NETWORK */;
                break;
            case Type.NODE:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 16 /* Capability.NETWORK */ | 32 /* Capability.TARGET */ | 131072 /* Capability.IO */;
                break;
            case Type.AUCTION_WORKLET:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 524288 /* Capability.EVENT_BREAKPOINTS */;
                break;
            case Type.BROWSER:
                this.#capabilitiesMask = 32 /* Capability.TARGET */ | 131072 /* Capability.IO */;
                break;
            case Type.TAB:
                this.#capabilitiesMask = 32 /* Capability.TARGET */ | 128 /* Capability.TRACING */;
                break;
            case Type.NODE_WORKER:
                this.#capabilitiesMask = 4 /* Capability.JS */ | 16 /* Capability.NETWORK */ | 32 /* Capability.TARGET */ | 131072 /* Capability.IO */;
        }
        this.#type = type;
        this.#parentTarget = parentTarget;
        this.#id = id;
        this.#isSuspended = suspended;
        this.#targetInfo = targetInfo;
    }
    createModels(required) {
        this.#creatingModels = true;
        const registeredModels = Array.from(SDKModel.registeredModels.entries());
        // Create early models.
        for (const [modelClass, info] of registeredModels) {
            if (info.early) {
                this.model(modelClass);
            }
        }
        // Create autostart and required models.
        for (const [modelClass, info] of registeredModels) {
            if (info.autostart || required.has(modelClass)) {
                this.model(modelClass);
            }
        }
        this.#creatingModels = false;
    }
    id() {
        return this.#id;
    }
    name() {
        return this.#name || this.#inspectedURLName;
    }
    setName(name) {
        if (this.#name === name) {
            return;
        }
        this.#name = name;
        this.#targetManager.onNameChange(this);
    }
    type() {
        return this.#type;
    }
    markAsNodeJSForTest() {
        super.markAsNodeJSForTest();
        this.#type = Type.NODE;
    }
    targetManager() {
        return this.#targetManager;
    }
    hasAllCapabilities(capabilitiesMask) {
        // TODO(dgozman): get rid of this method, once we never observe targets with
        // capability mask.
        return (this.#capabilitiesMask & capabilitiesMask) === capabilitiesMask;
    }
    decorateLabel(label) {
        return (this.#type === Type.Worker || this.#type === Type.ServiceWorker) ? '\u2699 ' + label : label;
    }
    parentTarget() {
        return this.#parentTarget;
    }
    outermostTarget() {
        let lastTarget = null;
        let currentTarget = this;
        do {
            if (currentTarget.type() !== Type.TAB && currentTarget.type() !== Type.BROWSER) {
                lastTarget = currentTarget;
            }
            currentTarget = currentTarget.parentTarget();
        } while (currentTarget);
        return lastTarget;
    }
    dispose(reason) {
        super.dispose(reason);
        this.#targetManager.removeTarget(this);
        for (const model of this.#modelByConstructor.values()) {
            model.dispose();
        }
    }
    model(modelClass) {
        if (!this.#modelByConstructor.get(modelClass)) {
            const info = SDKModel.registeredModels.get(modelClass);
            if (info === undefined) {
                throw new Error('Model class is not registered');
            }
            if ((this.#capabilitiesMask & info.capabilities) === info.capabilities) {
                const model = new modelClass(this);
                this.#modelByConstructor.set(modelClass, model);
                if (!this.#creatingModels) {
                    this.#targetManager.modelAdded(modelClass, model, this.#targetManager.isInScope(this));
                }
            }
        }
        return this.#modelByConstructor.get(modelClass) || null;
    }
    models() {
        return this.#modelByConstructor;
    }
    inspectedURL() {
        return this.#inspectedURL;
    }
    setInspectedURL(inspectedURL) {
        this.#inspectedURL = inspectedURL;
        const parsedURL = Common.ParsedURL.ParsedURL.fromString(inspectedURL);
        this.#inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + this.#id;
        this.#targetManager.onInspectedURLChange(this);
        if (!this.#name) {
            this.#targetManager.onNameChange(this);
        }
    }
    hasCrashed() {
        return this.#hasCrashed;
    }
    setHasCrashed(isCrashed) {
        const wasCrashed = this.#hasCrashed;
        this.#hasCrashed = isCrashed;
        // If the target has now been restored, check to see if it needs resuming.
        // This ensures that if a target crashes whilst suspended, it is resumed
        // when it is recovered.
        // If the target is not suspended, resume() is a no-op, so it's safe to call.
        if (wasCrashed && !isCrashed) {
            void this.resume();
        }
    }
    async suspend(reason) {
        if (this.#isSuspended) {
            return;
        }
        this.#isSuspended = true;
        // If the target has crashed, we will not attempt to suspend all the
        // models, but we still mark it as suspended so we correctly track the
        // state.
        if (this.#hasCrashed) {
            return;
        }
        await Promise.all(Array.from(this.models().values(), m => m.preSuspendModel(reason)));
        await Promise.all(Array.from(this.models().values(), m => m.suspendModel(reason)));
    }
    async resume() {
        if (!this.#isSuspended) {
            return;
        }
        this.#isSuspended = false;
        if (this.#hasCrashed) {
            return;
        }
        await Promise.all(Array.from(this.models().values(), m => m.resumeModel()));
        await Promise.all(Array.from(this.models().values(), m => m.postResumeModel()));
    }
    suspended() {
        return this.#isSuspended;
    }
    updateTargetInfo(targetInfo) {
        this.#targetInfo = targetInfo;
    }
    targetInfo() {
        return this.#targetInfo;
    }
}
export var Type;
(function (Type) {
    Type["FRAME"] = "frame";
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
    Type["ServiceWorker"] = "service-worker";
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
    Type["Worker"] = "worker";
    Type["SHARED_WORKER"] = "shared-worker";
    Type["SHARED_STORAGE_WORKLET"] = "shared-storage-worklet";
    Type["NODE"] = "node";
    Type["BROWSER"] = "browser";
    Type["AUCTION_WORKLET"] = "auction-worklet";
    Type["WORKLET"] = "worklet";
    Type["TAB"] = "tab";
    Type["NODE_WORKER"] = "node-worker";
})(Type || (Type = {}));
//# sourceMappingURL=Target.js.map