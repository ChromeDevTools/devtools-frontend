// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Protocol from '../../generated/protocol.js';

import {ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import {StorageMetadataView} from './components/components.js';
import {IndexedDBTreeElement} from './ApplicationPanelSidebar.js';
import {ServiceWorkerCacheTreeElement} from './ServiceWorkerCacheTreeElement.js';

const UIStrings = {
  /**
   *@description Label for an item in the Application Panel Sidebar of the Application panel
   * Storage Buckets allow developers to seperate site data into buckets so that they can be
   * deleted independently.
   */
  storageBuckets: 'Storage buckets',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/StorageBucketsTreeElement.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class StorageBucketsTreeParentElement extends ExpandableApplicationPanelTreeElement {
  private bucketTreeElements: Set<StorageBucketsTreeElement> = new Set();

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.storageBuckets), 'StorageBuckets');
    const icon = UI.Icon.Icon.create('database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this.setLink(
        'https://github.com/WICG/storage-buckets/blob/gh-pages/explainer.md' as Platform.DevToolsPath.UrlString);
  }

  initialize(): void {
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.StorageBucketsModel.StorageBucketsModel, SDK.StorageBucketsModel.Events.BucketAdded, this.bucketAdded,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.StorageBucketsModel.StorageBucketsModel, SDK.StorageBucketsModel.Events.BucketRemoved, this.bucketRemoved,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.StorageBucketsModel.StorageBucketsModel, SDK.StorageBucketsModel.Events.BucketChanged, this.bucketChanged,
        this);

    for (const bucketsModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.StorageBucketsModel.StorageBucketsModel)) {
      const buckets = bucketsModel.getBuckets();
      for (const bucket of buckets) {
        this.addBucketTreeElement(bucketsModel, bucket);
      }
    }
  }

  removeBucketsForModel(model: SDK.StorageBucketsModel.StorageBucketsModel): void {
    for (const bucketTreeElement of this.bucketTreeElements) {
      if (bucketTreeElement.model === model) {
        this.removeBucketTreeElement(bucketTreeElement);
      }
    }
  }

  private bucketAdded({data: {model, bucketInfo}}:
                          Common.EventTarget.EventTargetEvent<SDK.StorageBucketsModel.BucketEvent>): void {
    this.addBucketTreeElement(model, bucketInfo);
  }

  private bucketRemoved({data: {model, bucketInfo}}:
                            Common.EventTarget.EventTargetEvent<SDK.StorageBucketsModel.BucketEvent>): void {
    const idbDatabaseTreeElement = this.getBucketTreeElement(model, bucketInfo);
    if (!idbDatabaseTreeElement) {
      return;
    }
    this.removeBucketTreeElement(idbDatabaseTreeElement);
  }

  private bucketChanged({data: {model, bucketInfo}}:
                            Common.EventTarget.EventTargetEvent<SDK.StorageBucketsModel.BucketEvent>): void {
    const idbDatabaseTreeElement = this.getBucketTreeElement(model, bucketInfo);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.bucketInfo = bucketInfo;
  }

  private addBucketTreeElement(
      model: SDK.StorageBucketsModel.StorageBucketsModel, bucketInfo: Protocol.Storage.StorageBucketInfo): void {
    if (bucketInfo.bucket.name === undefined) {
      return;
    }
    const singleBucketTreeElement = new StorageBucketsTreeElement(this.resourcesPanel, model, bucketInfo);
    this.bucketTreeElements.add(singleBucketTreeElement);
    this.appendChild(singleBucketTreeElement);
    singleBucketTreeElement.initialize();
  }

  private removeBucketTreeElement(bucketTreeElement: StorageBucketsTreeElement): void {
    this.removeChild(bucketTreeElement);
    this.bucketTreeElements.delete(bucketTreeElement);
    this.setExpandable(this.bucketTreeElements.size > 0);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'storage-buckets-group://' as Platform.DevToolsPath.UrlString;
  }

  getBucketTreeElement(model: SDK.StorageBucketsModel.StorageBucketsModel, {
    bucket: {storageKey, name},
  }: Protocol.Storage.StorageBucketInfo): StorageBucketsTreeElement|null {
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
  private storageBucketInfo: Protocol.Storage.StorageBucketInfo;
  private bucketModel: SDK.StorageBucketsModel.StorageBucketsModel;
  private view?: LegacyWrapper.LegacyWrapper.LegacyWrapper<UI.Widget.Widget, StorageMetadataView.StorageMetadataView>;

  constructor(
      resourcesPanel: ResourcesPanel, model: SDK.StorageBucketsModel.StorageBucketsModel,
      bucketInfo: Protocol.Storage.StorageBucketInfo) {
    const {bucket} = bucketInfo;
    const {origin} = SDK.StorageKeyManager.parseStorageKey(bucketInfo.bucket.storageKey);
    super(resourcesPanel, `${bucket.name} - ${origin}`, `StorageBucket_${bucket.name}_${bucket.storageKey}`);
    this.bucketModel = model;
    this.storageBucketInfo = bucketInfo;
    const icon = UI.Icon.Icon.create('database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  initialize(): void {
    const {bucket} = this.bucketInfo;
    const indexedDBTreeElement = new IndexedDBTreeElement(this.resourcesPanel, bucket);
    this.appendChild(indexedDBTreeElement);
    const serviceWorkerCacheTreeElement = new ServiceWorkerCacheTreeElement(this.resourcesPanel, bucket);
    this.appendChild(serviceWorkerCacheTreeElement);
    serviceWorkerCacheTreeElement.initialize();
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    const {bucket} = this.bucketInfo;
    return `storage-buckets-group://${bucket.name}/${bucket.storageKey}` as Platform.DevToolsPath.UrlString;
  }

  get model(): SDK.StorageBucketsModel.StorageBucketsModel {
    return this.bucketModel;
  }

  get bucketInfo(): Protocol.Storage.StorageBucketInfo {
    return this.storageBucketInfo;
  }

  set bucketInfo(bucketInfo: Protocol.Storage.StorageBucketInfo) {
    this.storageBucketInfo = bucketInfo;
    if (this.view) {
      this.view.getComponent().setStorageBucket(this.storageBucketInfo);
    }
  }

  override onselect(selectedByUser?: boolean): boolean {
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
