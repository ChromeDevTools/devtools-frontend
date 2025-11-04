// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
export class InterestGroupStorageModel extends SDK.SDKModel.SDKModel {
    storageAgent;
    enabled;
    constructor(target) {
        super(target);
        target.registerStorageDispatcher(this);
        this.storageAgent = target.storageAgent();
        this.enabled = false;
    }
    enable() {
        if (this.enabled) {
            return;
        }
        void this.storageAgent.invoke_setInterestGroupTracking({ enable: true });
    }
    disable() {
        if (!this.enabled) {
            return;
        }
        void this.storageAgent.invoke_setInterestGroupTracking({ enable: false });
    }
    interestGroupAccessed(event) {
        this.dispatchEventToListeners("InterestGroupAccess" /* Events.INTEREST_GROUP_ACCESS */, event);
    }
    attributionReportingTriggerRegistered(_event) {
    }
    indexedDBListUpdated(_event) {
    }
    indexedDBContentUpdated(_event) {
    }
    interestGroupAuctionEventOccurred(_event) {
    }
    interestGroupAuctionNetworkRequestCreated(_event) {
    }
    cacheStorageListUpdated(_event) {
    }
    cacheStorageContentUpdated(_event) {
    }
    sharedStorageAccessed(_event) {
    }
    sharedStorageWorkletOperationExecutionFinished(_event) {
    }
    storageBucketCreatedOrUpdated(_event) {
    }
    storageBucketDeleted(_event) {
    }
    attributionReportingSourceRegistered(_event) {
    }
    attributionReportingReportSent(_event) {
    }
    attributionReportingVerboseDebugReportSent(_event) {
    }
}
SDK.SDKModel.SDKModel.register(InterestGroupStorageModel, { capabilities: 8192 /* SDK.Target.Capability.STORAGE */, autostart: false });
//# sourceMappingURL=InterestGroupStorageModel.js.map