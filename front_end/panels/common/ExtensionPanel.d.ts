import * as Platform from '../../core/platform/platform.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ExtensionServer } from './ExtensionServer.js';
export interface ToolbarButtonData {
    id: string;
    iconURL: string;
    tooltip: string;
    disabled: boolean;
    onClick: () => void;
}
export interface ViewInput {
    server: ExtensionServer;
    id: string;
    pageURL: string;
    searchProvider: UI.SearchableView.Searchable;
    toolbarItems: ToolbarButtonData[];
}
export interface ViewOutput {
    searchableView?: UI.SearchableView.SearchableView;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ExtensionPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable {
    #private;
    constructor(server: ExtensionServer, panelName: string, id: string, pageURL: string, view?: View);
    performUpdate(): void;
    addToolbarItem(item: ExtensionButton): void;
    onSearchCanceled(): void;
    searchableView(): UI.SearchableView.SearchableView | null;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, _jumpBackwards?: boolean): void;
    supportsMatchCounts(): boolean;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
}
export declare class ExtensionButton {
    #private;
    constructor(server: ExtensionServer, id: string, iconURL: string, tooltip?: string, disabled?: boolean);
    setOnUpdate(onUpdate: () => void): void;
    update(iconURL?: string, tooltip?: string, disabled?: boolean): void;
    data(): ToolbarButtonData;
    toolbarButton(): ExtensionButton;
}
export interface SidebarPaneViewInput {
    server: ExtensionServer;
    id: string;
    pageURL?: Platform.DevToolsPath.UrlString;
    height?: string;
    showObjectProperties: boolean;
    objectTree?: ObjectUI.ObjectPropertiesSection.ObjectTree;
    objectTitle?: string;
}
export type SidebarPaneView = (input: SidebarPaneViewInput, output: undefined, target: HTMLElement) => void;
export declare const SIDEBAR_PANE_DEFAULT_VIEW: SidebarPaneView;
export declare class ExtensionSidebarPane extends UI.View.SimpleView {
    #private;
    constructor(server: ExtensionServer, panelName: string, title: Platform.UIString.LocalizedString, id: string, extensionId?: string, view?: SidebarPaneView);
    performUpdate(): void;
    id(): string;
    panelName(): string;
    setObject(object: Object, title: string | undefined, callback: (arg0?: (string | null) | undefined) => void): void;
    setExpression(expression: string, title: string | undefined, evaluateOptions: Object | undefined, securityOrigin: string, callback: (arg0?: (string | null) | undefined) => void): void;
    setPage(url: Platform.DevToolsPath.UrlString): void;
    setHeight(height: string): void;
}
