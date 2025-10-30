import type * as Platform from '../../core/platform/platform.js';
export declare class SoftContextMenu {
    private items;
    private itemSelectedCallback;
    private parentMenu;
    private highlightedMenuItemElement;
    detailsForElementMap: WeakMap<HTMLElement, ElementMenuDetails>;
    private document?;
    private glassPane?;
    private contextMenuElement?;
    private focusRestorer?;
    private hideOnUserMouseDownUnlessInMenu?;
    private activeSubMenuElement?;
    private subMenu?;
    private onMenuClosed?;
    private focusOnTheFirstItem;
    private keepOpen;
    private loggableParent;
    constructor(items: SoftContextMenuDescriptor[], itemSelectedCallback: (arg0: number) => void, keepOpen: boolean, parentMenu?: SoftContextMenu, onMenuClosed?: () => void, loggableParent?: Element | null);
    getItems(): SoftContextMenuDescriptor[];
    show(document: Document, anchorBox: AnchorBox): void;
    setContextMenuElementLabel(label: string): void;
    discard(): void;
    private createMenuItem;
    private createSubMenu;
    private createSeparator;
    private menuItemMouseDown;
    private menuItemMouseUp;
    private root;
    setChecked(item: SoftContextMenuDescriptor, checked: boolean): void;
    private triggerAction;
    private showSubMenu;
    private menuItemMouseOver;
    private menuItemMouseLeave;
    private highlightMenuItem;
    private highlightPrevious;
    private highlightNext;
    private menuKeyDown;
    markAsMenuItemCheckBox(): void;
    setFocusOnTheFirstItem(focusOnTheFirstItem: boolean): void;
}
export interface SoftContextMenuDescriptor {
    type: 'checkbox' | 'item' | 'separator' | 'subMenu';
    id?: number;
    label?: string;
    accelerator?: {
        keyCode: number;
        modifiers: number;
    };
    isExperimentalFeature?: boolean;
    enabled?: boolean;
    checked?: boolean;
    isDevToolsPerformanceMenuItem?: boolean;
    subItems?: SoftContextMenuDescriptor[];
    element?: Element;
    shortcut?: string;
    tooltip?: Platform.UIString.LocalizedString;
    jslogContext?: string;
    /** A no-op. For native context menus, feature name will request showing a new badge. */
    featureName?: string;
}
interface ElementMenuDetails {
    customElement?: HTMLElement;
    isSeparator?: boolean;
    subMenuTimer?: number;
    subItems?: SoftContextMenuDescriptor[];
    actionId?: number;
}
export {};
