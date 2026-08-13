import type * as Platform from '../../core/platform/platform.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { type DeviceBoundSessionsModel } from './DeviceBoundSessionsModel.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
export declare class RootTreeElement extends ApplicationPanelTreeElement {
    #private;
    constructor(storagePanel: ResourcesPanel, model: DeviceBoundSessionsModel);
    get itemURL(): Platform.DevToolsPath.UrlString;
    onselect(selectedByUser?: boolean): boolean;
    onbind(): void;
    onunbind(): void;
}
