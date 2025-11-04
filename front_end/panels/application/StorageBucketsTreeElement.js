// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as UI from '../../ui/legacy/legacy.js';
import { IndexedDBTreeElement } from './ApplicationPanelSidebar.js';
import { ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { StorageMetadataView } from './components/components.js';
import { ServiceWorkerCacheTreeElement } from './ServiceWorkerCacheTreeElement.js';
const UIStrings = {
    /**
     * @description Label for an item in the Application Panel Sidebar of the Application panel
     * Storage Buckets allow developers to separate site data into buckets so that they can be
     * deleted independently.
     */
    storageBuckets: 'Storage buckets',
    /**
     * @description Text for an item in the Application Panel
     * if no storage buckets are available to show. Storage Buckets allow developers to separate
     * site data into buckets so that they can be
     * deleted independently. https://developer.chrome.com/docs/web-platform/storage-buckets.
     */
    noStorageBuckets: 'No storage buckets detected',
    /**
     * @description Description text in the Application Panel describing the storage buckets tab.
     * Storage Buckets allow developers to separate site data into buckets so that they can be
     * deleted independently. https://developer.chrome.com/docs/web-platform/storage-buckets.
     */
    storageBucketsDescription: 'On this page you can view and delete storage buckets, and their associated `Storage APIs`.'
};
const str_ = i18n.i18n.registerUIStrings('panels/application/StorageBucketsTreeElement.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class StorageBucketsTreeParentElement extends ExpandableApplicationPanelTreeElement {
    bucketTreeElements = new Set();
    constructor(storagePanel) {
        super(storagePanel, i18nString(UIStrings.storageBuckets), i18nString(UIStrings.noStorageBuckets), i18nString(UIStrings.storageBucketsDescription), 'storage-buckets');
        const icon = IconButton.Icon.create('bucket');
        this.setLeadingIcons([icon]);
        this.setLink('https://github.com/WICG/storage-buckets/blob/gh-pages/explainer.md');
    }
    initialize() {
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.StorageBucketsModel.StorageBucketsModel, "BucketAdded" /* SDK.StorageBucketsModel.Events.BUCKET_ADDED */, this.bucketAdded, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.StorageBucketsModel.StorageBucketsModel, "BucketRemoved" /* SDK.StorageBucketsModel.Events.BUCKET_REMOVED */, this.bucketRemoved, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.StorageBucketsModel.StorageBucketsModel, "BucketChanged" /* SDK.StorageBucketsModel.Events.BUCKET_CHANGED */, this.bucketChanged, this);
        for (const bucketsModel of SDK.TargetManager.TargetManager.instance().models(SDK.StorageBucketsModel.StorageBucketsModel)) {
            const buckets = bucketsModel.getBuckets();
            for (const bucket of buckets) {
                this.addBucketTreeElement(bucketsModel, bucket);
            }
        }
    }
    removeBucketsForModel(model) {
        for (const bucketTreeElement of this.bucketTreeElements) {
            if (bucketTreeElement.model === model) {
                this.removeBucketTreeElement(bucketTreeElement);
            }
        }
    }
    bucketAdded({ data: { model, bucketInfo } }) {
        this.addBucketTreeElement(model, bucketInfo);
    }
    bucketRemoved({ data: { model, bucketInfo } }) {
        const idbDatabaseTreeElement = this.getBucketTreeElement(model, bucketInfo);
        if (!idbDatabaseTreeElement) {
            return;
        }
        this.removeBucketTreeElement(idbDatabaseTreeElement);
    }
    bucketChanged({ data: { model, bucketInfo } }) {
        const idbDatabaseTreeElement = this.getBucketTreeElement(model, bucketInfo);
        if (!idbDatabaseTreeElement) {
            return;
        }
        idbDatabaseTreeElement.bucketInfo = bucketInfo;
    }
    addBucketTreeElement(model, bucketInfo) {
        if (bucketInfo.bucket.name === undefined) {
            return;
        }
        const singleBucketTreeElement = new StorageBucketsTreeElement(this.resourcesPanel, model, bucketInfo);
        this.bucketTreeElements.add(singleBucketTreeElement);
        this.appendChild(singleBucketTreeElement);
        singleBucketTreeElement.initialize();
    }
    removeBucketTreeElement(bucketTreeElement) {
        this.removeChild(bucketTreeElement);
        this.bucketTreeElements.delete(bucketTreeElement);
        this.setExpandable(this.bucketTreeElements.size > 0);
    }
    get itemURL() {
        return 'storage-buckets-group://';
    }
    getBucketTreeElement(model, { bucket: { storageKey, name }, }) {
        for (const bucketTreeElement of this.bucketTreeElements) {
            if (bucketTreeElement.model === model && bucketTreeElement.bucketInfo.bucket.storageKey === storageKey &&
                bucketTreeElement.bucketInfo.bucket.name === name) {
                return bucketTreeElement;
            }
        }
        return null;
    }
}
export class StorageBucketsTreeElement extends ExpandableApplicationPanelTreeElement {
    storageBucketInfo;
    bucketModel;
    view;
    constructor(resourcesPanel, model, bucketInfo) {
        const { bucket } = bucketInfo;
        const { origin } = SDK.StorageKeyManager.parseStorageKey(bucketInfo.bucket.storageKey);
        super(resourcesPanel, `${bucket.name} - ${origin}`, '', '', 'storage-bucket');
        this.bucketModel = model;
        this.storageBucketInfo = bucketInfo;
        const icon = IconButton.Icon.create('database');
        this.setLeadingIcons([icon]);
    }
    initialize() {
        const { bucket } = this.bucketInfo;
        const indexedDBTreeElement = new IndexedDBTreeElement(this.resourcesPanel, bucket);
        this.appendChild(indexedDBTreeElement);
        const serviceWorkerCacheTreeElement = new ServiceWorkerCacheTreeElement(this.resourcesPanel, bucket);
        this.appendChild(serviceWorkerCacheTreeElement);
        serviceWorkerCacheTreeElement.initialize();
    }
    get itemURL() {
        const { bucket } = this.bucketInfo;
        return `storage-buckets-group://${bucket.name}/${bucket.storageKey}`;
    }
    get model() {
        return this.bucketModel;
    }
    get bucketInfo() {
        return this.storageBucketInfo;
    }
    set bucketInfo(bucketInfo) {
        this.storageBucketInfo = bucketInfo;
        if (this.view) {
            this.view.getComponent().setStorageBucket(this.storageBucketInfo);
        }
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        if (!this.view) {
            this.view =
                LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.Widget, new StorageMetadataView.StorageMetadataView());
            this.view.getComponent().enableStorageBucketControls(this.model);
            this.view.getComponent().setStorageBucket(this.storageBucketInfo);
        }
        this.showView(this.view);
        return false;
    }
}
//# sourceMappingURL=StorageBucketsTreeElement.js.map