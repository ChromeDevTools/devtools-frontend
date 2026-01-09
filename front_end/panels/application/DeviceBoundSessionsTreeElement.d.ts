import type * as Platform from '../../core/platform/platform.js';
import { ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { type DeviceBoundSessionsModel } from './DeviceBoundSessionsModel.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
export declare class RootTreeElement extends ExpandableApplicationPanelTreeElement {
    #private;
    constructor(storagePanel: ResourcesPanel, model: DeviceBoundSessionsModel);
    get itemURL(): Platform.DevToolsPath.UrlString;
    onbind(): void;
    onunbind(): void;
}
