import type * as Platform from '../../core/platform/platform.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
import { SharedStorageItemsView } from './SharedStorageItemsView.js';
import type { SharedStorageForOrigin } from './SharedStorageModel.js';
export declare class SharedStorageTreeElement extends ApplicationPanelTreeElement {
    view: SharedStorageItemsView;
    constructor(resourcesPanel: ResourcesPanel, sharedStorage: SharedStorageForOrigin);
    static createElement(resourcesPanel: ResourcesPanel, sharedStorage: SharedStorageForOrigin): Promise<SharedStorageTreeElement>;
    get itemURL(): Platform.DevToolsPath.UrlString;
    onselect(selectedByUser: boolean | undefined): boolean;
}
