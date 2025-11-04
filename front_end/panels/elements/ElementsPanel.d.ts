import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Adorners from '../../ui/components/adorners/adorners.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ComputedStyleWidget } from './ComputedStyleWidget.js';
import { type ElementsTreeOutline } from './ElementsTreeOutline.js';
import type { MarkerDecorator } from './MarkerDecorator.js';
import { StylesSidebarPane } from './StylesSidebarPane.js';
/**
 * These strings need to match the `SidebarPaneCodes` in UserMetrics.ts. DevTools
 * collects usage metrics for the different sidebar tabs.
 */
export declare const enum SidebarPaneTabId {
    COMPUTED = "computed",
    STYLES = "styles"
}
type RevealAndSelectNodeOptsSelectionAndFocus = {
    showPanel?: false;
    focusNode?: never;
} | {
    showPanel: true;
    focusNode?: boolean;
};
type RevealAndSelectNodeOpts = RevealAndSelectNodeOptsSelectionAndFocus & {
    highlightInOverlay?: boolean;
};
export declare class ElementsPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable, SDK.TargetManager.SDKModelObserver<SDK.DOMModel.DOMModel>, UI.View.ViewLocationResolver {
    #private;
    private splitWidget;
    private mainContainer;
    private domTreeContainer;
    private splitMode;
    private readonly accessibilityTreeView;
    private breadcrumbs;
    stylesWidget: StylesSidebarPane;
    private readonly computedStyleWidget;
    private readonly metricsWidget;
    private searchResults;
    private currentSearchResultIndex;
    pendingNodeReveal: boolean;
    private readonly adornerManager;
    private readonly adornersByName;
    accessibilityTreeButton?: HTMLElement;
    domTreeButton?: HTMLElement;
    private selectedNodeOnReset?;
    private hasNonDefaultSelectedNode?;
    private searchConfig?;
    private omitDefaultSelection?;
    private notFirstInspectElement?;
    sidebarPaneView?: UI.View.TabbedViewLocation;
    private stylesViewToReveal?;
    private nodeInsertedTaskRunner;
    private cssStyleTrackerByCSSModel;
    getTreeOutlineForTesting(): ElementsTreeOutline | undefined;
    constructor();
    private initializeFullAccessibilityTreeView;
    private showAccessibilityTree;
    private showDOMTree;
    toggleAccessibilityTree(): void;
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): ElementsPanel;
    revealProperty(cssProperty: SDK.CSSProperty.CSSProperty): Promise<void>;
    resolveLocation(_locationName: string): UI.View.ViewLocation | null;
    showToolbarPane(widget: UI.Widget.Widget | null, toggle: UI.Toolbar.ToolbarToggle | null): void;
    modelAdded(domModel: SDK.DOMModel.DOMModel): void;
    modelRemoved(domModel: SDK.DOMModel.DOMModel): void;
    private handleNodeInserted;
    private targetNameChanged;
    private updateTreeOutlineVisibleWidth;
    focus(): void;
    searchableView(): UI.SearchableView.SearchableView;
    wasShown(): void;
    willHide(): void;
    onResize(): void;
    private selectedNodeChanged;
    private documentUpdatedEvent;
    private documentUpdated;
    private lastSelectedNodeSelectedForTest;
    private setDefaultSelectedNode;
    onSearchClosed(): void;
    onSearchCanceled(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
    private domWordWrapSettingChanged;
    private jumpToSearchResult;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
    private highlightCurrentSearchResult;
    private hideSearchHighlights;
    selectedDOMNode(): SDK.DOMModel.DOMNode | null;
    selectDOMNode(node: SDK.DOMModel.DOMNode, focus?: boolean): void;
    highlightNodeAttribute(node: SDK.DOMModel.DOMNode, attribute: string): void;
    selectAndShowSidebarTab(tabId: SidebarPaneTabId): void;
    private updateBreadcrumbIfNeeded;
    private crumbNodeSelected;
    private leaveUserAgentShadowDOM;
    revealAndSelectNode(nodeToReveal: SDK.DOMModel.DOMNode, opts?: RevealAndSelectNodeOpts): Promise<void>;
    private showUAShadowDOMChanged;
    private setupTextSelectionHack;
    private initializeSidebarPanes;
    private updateSidebarPosition;
    private extensionSidebarPaneAdded;
    private addExtensionSidebarPane;
    getComputedStyleWidget(): ComputedStyleWidget;
    private setupStyleTracking;
    private removeStyleTracking;
    private trackedCSSPropertiesUpdated;
    populateAdornerSettingsContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void;
    isAdornerEnabled(adornerText: string): boolean;
    registerAdorner(adorner: Adorners.Adorner.Adorner): void;
    deregisterAdorner(adorner: Adorners.Adorner.Adorner): void;
    toggleHideElement(node: SDK.DOMModel.DOMNode): void;
    toggleEditAsHTML(node: SDK.DOMModel.DOMNode): void;
    duplicateNode(node: SDK.DOMModel.DOMNode): void;
    copyStyles(node: SDK.DOMModel.DOMNode): void;
    protected static firstInspectElementCompletedForTest: () => void;
    protected static firstInspectElementNodeNameForTest: string;
}
export declare class ContextMenuProvider implements UI.ContextMenu.Provider<SDK.RemoteObject.RemoteObject | SDK.DOMModel.DOMNode | SDK.DOMModel.DeferredDOMNode> {
    appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, object: SDK.RemoteObject.RemoteObject | SDK.DOMModel.DOMNode | SDK.DOMModel.DeferredDOMNode): void;
}
export declare class DOMNodeRevealer implements Common.Revealer.Revealer<SDK.DOMModel.DOMNode | SDK.DOMModel.DeferredDOMNode | SDK.RemoteObject.RemoteObject> {
    reveal(node: SDK.DOMModel.DOMNode | SDK.DOMModel.DeferredDOMNode | SDK.RemoteObject.RemoteObject, omitFocus?: boolean): Promise<void>;
}
export declare class CSSPropertyRevealer implements Common.Revealer.Revealer<SDK.CSSProperty.CSSProperty> {
    reveal(property: SDK.CSSProperty.CSSProperty): Promise<void>;
}
export declare class ElementsActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export declare class PseudoStateMarkerDecorator implements MarkerDecorator {
    static instance(opts?: {
        forceNew: boolean | null;
    }): PseudoStateMarkerDecorator;
    decorate(node: SDK.DOMModel.DOMNode): {
        title: string;
        color: string;
    } | null;
}
export {};
