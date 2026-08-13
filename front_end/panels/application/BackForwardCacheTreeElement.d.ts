import type * as Platform from '../../core/platform/platform.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
export declare class BackForwardCacheTreeElement extends ApplicationPanelTreeElement {
    private view?;
    constructor(resourcesPanel: ResourcesPanel);
    get itemURL(): Platform.DevToolsPath.UrlString;
    onselect(selectedByUser?: boolean): boolean;
}
