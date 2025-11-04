import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import { ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
export declare class ServiceWorkerCacheTreeElement extends ExpandableApplicationPanelTreeElement {
    private swCacheModels;
    private swCacheTreeElements;
    private storageBucket?;
    constructor(resourcesPanel: ResourcesPanel, storageBucket?: Protocol.Storage.StorageBucket);
    initialize(): void;
    onattach(): void;
    private handleContextMenuEvent;
    private refreshCaches;
    private serviceWorkerCacheModelAdded;
    private serviceWorkerCacheModelRemoved;
    private cacheAdded;
    private cacheInTree;
    private addCache;
    private cacheRemoved;
    private removeCache;
    private cacheTreeElement;
}
export declare class SWCacheTreeElement extends ApplicationPanelTreeElement {
    private readonly model;
    private cache;
    private view;
    constructor(resourcesPanel: ResourcesPanel, model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache, appendStorageKey: boolean);
    get itemURL(): Platform.DevToolsPath.UrlString;
    onattach(): void;
    private handleContextMenuEvent;
    private clearCache;
    update(cache: SDK.ServiceWorkerCacheModel.Cache): void;
    onselect(selectedByUser: boolean | undefined): boolean;
    hasModelAndCache(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache): boolean;
}
