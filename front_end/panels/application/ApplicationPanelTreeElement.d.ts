import '../../ui/components/buttons/buttons.js';
import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
export declare class ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
    protected readonly resourcesPanel: ResourcesPanel;
    private customItemURL?;
    protected aiButtonContainer?: HTMLElement;
    constructor(resourcesPanel: ResourcesPanel, title: string, expandable: boolean, jslogContext: string);
    deselect(): void;
    get itemURL(): Platform.DevToolsPath.UrlString;
    set itemURL(value: Platform.DevToolsPath.UrlString);
    onselect(selectedByUser: boolean | undefined): boolean;
    showView(view: UI.Widget.AnyWidget | null): void;
    /**
     * Creates the Ask-AI floating button on this tree element.
     * @param storageItemProvider A provider function returning the StorageItem context.
     * Using a function provider allows dynamic context resolution at click time
     * (e.g. for category headers that aren't recreated (e.g. Local Storage) whose target origin may change), while supporting
     * static contexts for individual leaf items under these general category headers.
     */
    protected createAiButton(storageItemProvider: () => AiAssistance.StorageItem.StorageItem | null): void;
}
export declare class ExpandableApplicationPanelTreeElement extends ApplicationPanelTreeElement {
    protected readonly expandedSetting: Common.Settings.Setting<boolean>;
    protected readonly categoryName: string;
    protected categoryLink: Platform.DevToolsPath.UrlString | null;
    protected emptyCategoryHeadline: string;
    protected categoryDescription: string;
    protected readonly settingsKey: string;
    constructor(resourcesPanel: ResourcesPanel, categoryName: string, emptyCategoryHeadline: string, categoryDescription: string, settingsKey: string, settingsDefault?: boolean);
    createGenericStorageAiContext(): AiAssistance.StorageItem.StorageItem | null;
    get itemURL(): Platform.DevToolsPath.UrlString;
    set itemURL(value: Platform.DevToolsPath.UrlString);
    setLink(link: Platform.DevToolsPath.UrlString): void;
    onselect(selectedByUser: boolean | undefined): boolean;
    private updateCategoryView;
    appendChild(child: UI.TreeOutline.TreeElement, comparator?: ((arg0: UI.TreeOutline.TreeElement, arg1: UI.TreeOutline.TreeElement) => number) | undefined): void;
    removeChild(child: UI.TreeOutline.TreeElement): void;
    onattach(): void;
    onexpand(): void;
    oncollapse(): void;
}
