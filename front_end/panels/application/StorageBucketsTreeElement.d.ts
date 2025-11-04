import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import { ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
export declare const i18nString: (id: string, values?: import("../../core/i18n/i18nTypes.js").Values | undefined) => Common.UIString.LocalizedString;
export declare class StorageBucketsTreeParentElement extends ExpandableApplicationPanelTreeElement {
    private bucketTreeElements;
    constructor(storagePanel: ResourcesPanel);
    initialize(): void;
    removeBucketsForModel(model: SDK.StorageBucketsModel.StorageBucketsModel): void;
    private bucketAdded;
    private bucketRemoved;
    private bucketChanged;
    private addBucketTreeElement;
    private removeBucketTreeElement;
    get itemURL(): Platform.DevToolsPath.UrlString;
    getBucketTreeElement(model: SDK.StorageBucketsModel.StorageBucketsModel, { bucket: { storageKey, name }, }: Protocol.Storage.StorageBucketInfo): StorageBucketsTreeElement | null;
}
export declare class StorageBucketsTreeElement extends ExpandableApplicationPanelTreeElement {
    private storageBucketInfo;
    private bucketModel;
    private view?;
    constructor(resourcesPanel: ResourcesPanel, model: SDK.StorageBucketsModel.StorageBucketsModel, bucketInfo: Protocol.Storage.StorageBucketInfo);
    initialize(): void;
    get itemURL(): Platform.DevToolsPath.UrlString;
    get model(): SDK.StorageBucketsModel.StorageBucketsModel;
    get bucketInfo(): Protocol.Storage.StorageBucketInfo;
    set bucketInfo(bucketInfo: Protocol.Storage.StorageBucketInfo);
    onselect(selectedByUser?: boolean): boolean;
}
