import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
import { SharedStorageEventsView } from './SharedStorageEventsView.js';
export declare class SharedStorageListTreeElement extends ApplicationPanelTreeElement {
    #private;
    readonly view: SharedStorageEventsView;
    constructor(resourcesPanel: ResourcesPanel, expandedSettingsDefault?: boolean);
    get itemURL(): Platform.DevToolsPath.UrlString;
    onselect(selectedByUser: boolean | undefined): boolean;
    onattach(): void;
    onexpand(): void;
    oncollapse(): void;
    addEvent(event: Protocol.Storage.SharedStorageAccessedEvent): void;
}
