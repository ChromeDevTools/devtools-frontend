import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ElementsTreeElement, ElementsTreeWidget, type InitialEditState } from './ElementsTreeElement.js';
import elementsTreeOutlineStyles from './elementsTreeOutline.css.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import { TopLayerContainer } from './TopLayerContainer.js';
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export { elementsTreeOutlineStyles };
interface ViewInput {
    domTreeWidget?: DOMTreeWidget;
    rootDOMNode: SDK.DOMModel.DOMNode | null;
    omitRootDOMNode: boolean;
    selectEnabled: boolean;
    hideGutter: boolean;
    maxTreeDepth?: number;
    enableContextMenu?: boolean;
    showComments?: boolean;
    showAIButton?: boolean;
    disableEdits?: boolean;
    expandRoot?: boolean;
    visibleWidth?: number;
    visible?: boolean;
    maxRowsShown?: number;
    wrap: boolean;
    showSelectionOnKeyboardFocus: boolean;
    preventTabOrder: boolean;
    deindentSingleNode: boolean;
    currentHighlightedNode: SDK.DOMModel.DOMNode | null;
    hoveredNode?: SDK.DOMModel.DOMNode | null;
    searchMatchNode?: SDK.DOMModel.DOMNode | null;
    searchMatchQuery?: string | null;
    selectedNode: SDK.DOMModel.DOMNode | null;
    onSelectedNodeChanged: (event: Common.EventTarget.EventTargetEvent<{
        node: SDK.DOMModel.DOMNode | null;
        focus: boolean;
    }>) => void;
    onElementsTreeUpdated: (event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode[]>) => void;
    onElementCollapsed: () => void;
    onElementExpanded: () => void;
    onSelect?: (node: SDK.DOMModel.DOMNode, selectedByUser?: boolean) => void;
    onExpand?: (node: SDK.DOMModel.DOMNode, expanded: boolean) => void;
    onContextMenu?: (node: SDK.DOMModel.DOMNode, event: MouseEvent, widget?: ElementsTreeWidget) => void;
    onHoverNode?: (node: SDK.DOMModel.DOMNode, showInfo?: boolean) => void;
    onLeave?: () => void;
    onToggleHideElement?: (node: SDK.DOMModel.DOMNode) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    isToggledToHidden?: (node: SDK.DOMModel.DOMNode) => boolean;
    onDuplicateNode?: (node: SDK.DOMModel.DOMNode) => void;
    isNodeExpanded?: (node: SDK.DOMModel.DOMNode) => boolean;
    isNodeInClipboard?: (node: SDK.DOMModel.DOMNode) => boolean;
    onCopyOrCut?: (isCut: boolean, event: Event) => void;
    onPaste?: (event: Event) => void;
    onSelectNodeAfterEdit?: (wasExpanded: boolean, error: string | null, newNode: SDK.DOMModel.DOMNode | null, moveDirection?: string) => void;
    nodeToEdit?: ({
        node: SDK.DOMModel.DOMNode;
    } & InitialEditState) | null;
    onInitialEditCompleted?: () => void;
    dragOverNode?: {
        node: SDK.DOMModel.DOMNode;
        isClosingTag: boolean;
    } | null;
    isValidDragSource?: (node: SDK.DOMModel.DOMNode) => boolean;
    onDragStart?: (node: SDK.DOMModel.DOMNode, event: DragEvent, textContent?: string) => boolean;
    onDragOver?: (node: SDK.DOMModel.DOMNode, isClosingTag: boolean, event: DragEvent) => boolean;
    onDragLeave?: (event: DragEvent) => void;
    onDrop?: (node: SDK.DOMModel.DOMNode, isClosingTag: boolean, event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
    getTopLayerShortcuts?: (doc: SDK.DOMModel.DOMDocument) => SDK.DOMModel.DOMNodeShortcut[];
    isTopLayerExpanded?: (doc: SDK.DOMModel.DOMDocument) => boolean;
    onToggleTopLayerExpanded?: (doc: SDK.DOMModel.DOMDocument, expanded: boolean) => void;
    onSelectTopLayerContainer?: (doc: SDK.DOMModel.DOMDocument) => void;
    isTopLayerShortcutExpanded?: (shortcut: SDK.DOMModel.DOMNodeShortcut) => boolean;
    onToggleTopLayerShortcutExpanded?: (shortcut: SDK.DOMModel.DOMNodeShortcut, expanded: boolean) => void;
    selectedTopLayerShortcut?: SDK.DOMModel.DOMNodeShortcut | null;
    onSelectTopLayerShortcut?: (shortcut: SDK.DOMModel.DOMNodeShortcut) => void;
    onRevealTopLayerShortcut?: (shortcut: SDK.DOMModel.DOMNodeShortcut) => void;
    isAdoptedStyleSheetsExpanded?: (node: SDK.DOMModel.DOMNode) => boolean;
    onToggleAdoptedStyleSheetsExpanded?: (node: SDK.DOMModel.DOMNode, expanded: boolean) => void;
    onSelectAdoptedStyleSheets?: (node: SDK.DOMModel.DOMNode) => void;
    isAdoptedStyleSheetExpanded?: (sheet: SDK.DOMModel.AdoptedStyleSheet) => boolean;
    onToggleAdoptedStyleSheetExpanded?: (sheet: SDK.DOMModel.AdoptedStyleSheet, expanded: boolean) => void;
    selectedAdoptedStyleSheet?: SDK.DOMModel.AdoptedStyleSheet | null;
    onSelectAdoptedStyleSheet?: (sheet: SDK.DOMModel.AdoptedStyleSheet) => void;
}
interface ViewOutput {
    elementsTreeOutline?: ElementsTreeOutline;
    imagePreviewPopover?: ImagePreviewPopover;
    highlightedTreeElement: ElementsTreeElement | null;
    searchMatchTreeElement?: ElementsTreeElement | null;
    searchMatchQuery?: string;
    isUpdatingHighlights: boolean;
    alreadyExpandedParentTreeElement: ElementsTreeElement | null;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DECLARATIVE_VIEW: View;
/**
 * The main goal of this presenter is to wrap ElementsTreeOutline until
 * ElementsTreeOutline can be fully integrated into DOMTreeWidget.
 *
 * FIXME: once TreeOutline is declarative, this file needs to be renamed
 * to DOMTreeWidget.ts.
 */
export declare class DOMTreeWidget extends UI.Widget.Widget {
    #private;
    omitRootDOMNode: boolean;
    selectEnabled: boolean;
    hideGutter: boolean;
    showSelectionOnKeyboardFocus: boolean;
    preventTabOrder: boolean;
    deindentSingleNode: boolean;
    onSelectedNodeChanged: (event: Common.EventTarget.EventTargetEvent<{
        node: SDK.DOMModel.DOMNode | null;
        focus: boolean;
    }>) => void;
    onElementsTreeUpdated: (event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode[]>) => void;
    onElementCollapsed: () => void;
    onElementExpanded: () => void;
    onDocumentUpdated: (domModel: SDK.DOMModel.DOMModel) => void;
    set maxRows(maxRows: number | undefined);
    get maxRows(): number | undefined;
    get visibleWidth(): number;
    set visibleWidth(width: number);
    set rootDOMNode(node: SDK.DOMModel.DOMNode | null);
    get rootDOMNode(): SDK.DOMModel.DOMNode | null;
    get maxTreeDepth(): number | undefined;
    set maxTreeDepth(maxTreeDepth: number | undefined);
    get enableContextMenu(): boolean;
    set enableContextMenu(enableContextMenu: boolean);
    get showComments(): boolean;
    set showComments(showComments: boolean);
    get showAIButton(): boolean;
    set showAIButton(showAIButton: boolean);
    get disableEdits(): boolean;
    set disableEdits(disableEdits: boolean);
    get expandRoot(): boolean;
    set expandRoot(expandRoot: boolean);
    constructor(element?: HTMLElement, view?: View);
    selectDOMNode(node: SDK.DOMModel.DOMNode | SDK.DOMModel.AdoptedStyleSheet | null, focus?: boolean): void;
    highlightNodeAttribute(node: SDK.DOMModel.DOMNode, attribute: string): void;
    get wrap(): boolean;
    set wrap(wrap: boolean);
    setWordWrap(wrap: boolean): void;
    selectedDOMNode(): SDK.DOMModel.DOMNode | null;
    setNodeExpanded(node: SDK.DOMModel.DOMNode, expanded: boolean): void;
    isNodeExpanded(node: SDK.DOMModel.DOMNode): boolean;
    expandRecursively(node: SDK.DOMModel.DOMNode, maxDepth?: number): Promise<void>;
    collapseChildren(node: SDK.DOMModel.DOMNode): void;
    showContextMenu(node: SDK.DOMModel.DOMNode, event: MouseEvent, widget?: ElementsTreeWidget): Promise<UI.ContextMenu.ContextMenu | undefined>;
    /**
     * FIXME: this is called to re-render everything from scratch, for
     * example, if global settings changed. Instead, the setting values
     * should be the input for the view function.
     */
    reload(): void;
    /**
     * Used by layout tests.
     */
    getTreeOutlineForTesting(): ElementsTreeOutline | undefined;
    treeElementForNode(node: SDK.DOMModel.DOMNode): ElementsTreeElement | null;
    hoveredDOMNode(): SDK.DOMModel.DOMNode | null;
    searchMatchNode(): SDK.DOMModel.DOMNode | null;
    searchMatchQuery(): string | null;
    setHoveredNode(node: SDK.DOMModel.DOMNode | null, showInfo?: boolean): void;
    performUpdate(): void;
    modelAdded(domModel: SDK.DOMModel.DOMModel): void;
    modelRemoved(domModel: SDK.DOMModel.DOMModel): void;
    /**
     * FIXME: which node is expanded should be part of the view input.
     */
    expand(): void;
    /**
     * FIXME: which node is selected should be part of the view input.
     */
    selectDOMNodeWithoutReveal(node: SDK.DOMModel.DOMNode): void;
    /**
     * FIXME: adorners should be part of the view input.
     */
    updateNodeAdorners(node: SDK.DOMModel.DOMNode): void;
    highlightMatch(node: SDK.DOMModel.DOMNode, query?: string): void;
    hideMatchHighlights(node: SDK.DOMModel.DOMNode): void;
    toggleHideElement(node: SDK.DOMModel.DOMNode): void;
    removeNode(node: SDK.DOMModel.DOMNode): Promise<void>;
    isToggledToHidden(node: SDK.DOMModel.DOMNode): boolean;
    setMultilineEditing(multilineEditing: MultilineEditorController | null): void;
    multilineEditing(): MultilineEditorController | null;
    runPendingUpdates(): void;
    onResize(): void;
    willHide(): void;
    toggleEditAsHTML(node: SDK.DOMModel.DOMNode, startEditing?: boolean, callback?: (() => void)): void;
    duplicateNode(node: SDK.DOMModel.DOMNode): void;
    nodeBeingDragged(): SDK.DOMModel.DOMNode | null;
    dragOverNode(): {
        node: SDK.DOMModel.DOMNode;
        isClosingTag: boolean;
    } | null;
    isValidDragSource(node: SDK.DOMModel.DOMNode): boolean;
    isValidDragTarget(targetNode: SDK.DOMModel.DOMNode): boolean;
    onDragStart(node: SDK.DOMModel.DOMNode, event: DragEvent, textContent?: string): boolean;
    onDragOver(node: SDK.DOMModel.DOMNode, isClosingTag: boolean, event: DragEvent): boolean;
    onDragLeave(event: DragEvent): void;
    onDrop(node: SDK.DOMModel.DOMNode, isClosingTag: boolean, event: DragEvent): void;
    onDragEnd(event: DragEvent): void;
    moveNode(draggedNode: SDK.DOMModel.DOMNode, targetNode: SDK.DOMModel.DOMNode, isClosingTag: boolean): void;
    selectNodeAfterEdit(wasExpanded: boolean, error: string | null, newNode: SDK.DOMModel.DOMNode | null, moveDirection?: string): void;
    topLayerShortcuts(document: SDK.DOMModel.DOMDocument): SDK.DOMModel.DOMNodeShortcut[];
    isTopLayerExpanded(document: SDK.DOMModel.DOMDocument): boolean;
    setTopLayerExpanded(document: SDK.DOMModel.DOMDocument, expanded: boolean): void;
    isTopLayerShortcutExpanded(shortcut: SDK.DOMModel.DOMNodeShortcut): boolean;
    setTopLayerShortcutExpanded(shortcut: SDK.DOMModel.DOMNodeShortcut, expanded: boolean): void;
    revealInTopLayer(node: SDK.DOMModel.DOMNode): void;
    isAdoptedStyleSheetsExpanded(node: SDK.DOMModel.DOMNode): boolean;
    setAdoptedStyleSheetsExpanded(node: SDK.DOMModel.DOMNode, expanded: boolean): void;
    isAdoptedStyleSheetExpanded(sheet: SDK.DOMModel.AdoptedStyleSheet): boolean;
    setAdoptedStyleSheetExpanded(sheet: SDK.DOMModel.AdoptedStyleSheet, expanded: boolean): void;
    highlightAdoptedStyleSheet(adoptedStyleSheet: SDK.DOMModel.AdoptedStyleSheet): void;
    startEditing(node: SDK.DOMModel.DOMNode): void;
    onKeyDown(event: KeyboardEvent): boolean;
    clipboardData(): ClipboardData | null;
    setClipboardData(data: ClipboardData | null): void;
    resetClipboardIfNeeded(removedNode: SDK.DOMModel.DOMNode): void;
    isNodeInClipboard(node: SDK.DOMModel.DOMNode): boolean;
    copyOuterHTML(node: SDK.DOMModel.DOMNode, includeShadowRoots?: boolean): Promise<void>;
    copyCSSPath(node: SDK.DOMModel.DOMNode): void;
    copyJSPath(node: SDK.DOMModel.DOMNode): void;
    copyXPath(node: SDK.DOMModel.DOMNode, optimized?: boolean): void;
    copyFullXPath(node: SDK.DOMModel.DOMNode): void;
    copyStyles(node: SDK.DOMModel.DOMNode): Promise<void>;
    performCopyOrCut(isCut: boolean, node: SDK.DOMModel.DOMNode | null, includeShadowRoots?: boolean): void;
    canPaste(targetNode: SDK.DOMModel.DOMNode): boolean;
    pasteNode(targetNode: SDK.DOMModel.DOMNode): void;
    onCopyOrCut(isCut: boolean, event: Event): void;
    onPaste(event: Event): void;
    /**
     * FIXME: used to determine focus state, probably we can have a better
     * way to do it.
     */
    empty(): boolean;
    focus(): void;
    wasShown(): void;
    wasHidden(): void;
    detach(overrideHideOnDetach?: boolean): void;
    show(parentElement: Element, insertBefore?: Node | null, suppressOrphanWidgetError?: boolean): void;
}
declare const ElementsTreeOutline_base: import("../../core/platform/Constructor.js").Constructor<Common.EventTarget.EventTarget<ElementsTreeOutline.EventTypes>, any[]> & typeof UI.TreeOutline.TreeOutline;
export declare class ElementsTreeOutline extends ElementsTreeOutline_base {
    #private;
    treeElementByNode: WeakMap<SDK.DOMModel.DOMNode, ElementsTreeElement>;
    private readonly shadowRoot;
    readonly elementInternal: HTMLElement;
    private includeRootDOMNode;
    private selectEnabled;
    private rootDOMNodeInternal;
    selectedDOMNodeInternal: SDK.DOMModel.DOMNode | null;
    private visible;
    private updateRecords;
    private treeElementsBeingUpdated;
    private visibleWidthInternal?;
    private isXMLMimeTypeInternal?;
    suppressRevealAndSelect: boolean;
    private previousHoveredElement?;
    private dragOverTreeElement?;
    private updateModifiedNodesTimeout?;
    maxTreeDepth?: number;
    enableContextMenu: boolean;
    showComments: boolean;
    showAIButton: boolean;
    disableEdits: boolean;
    expandRoot: boolean;
    domTreeWidget: DOMTreeWidget | null;
    get hoveredTreeElement(): UI.TreeOutline.TreeElement | null;
    constructor(omitRootDOMNode?: boolean, selectEnabled?: boolean, hideGutter?: boolean, maxTreeDepth?: number, enableContextMenu?: boolean, showComments?: boolean, showAIButton?: boolean, disableEdits?: boolean, expandRoot?: boolean, domTreeWidget?: DOMTreeWidget | null);
    static forDOMModel(domModel: SDK.DOMModel.DOMModel): ElementsTreeOutline | null;
    deindentSingleNode(): void;
    setWordWrap(wrap: boolean): void;
    setMultilineEditing(multilineEditing: MultilineEditorController | null): void;
    visibleWidth(): number;
    setVisibleWidth(width: number): void;
    setClipboardData(data: ClipboardData | null): void;
    resetClipboardIfNeeded(removedNode: SDK.DOMModel.DOMNode): void;
    performCopyOrCut(isCut: boolean, node: SDK.DOMModel.DOMNode | null, includeShadowRoots?: boolean): void;
    canPaste(targetNode: SDK.DOMModel.DOMNode): boolean;
    pasteNode(targetNode: SDK.DOMModel.DOMNode): void;
    duplicateNode(targetNode: SDK.DOMModel.DOMNode): void;
    setVisible(visible: boolean): void;
    get rootDOMNode(): SDK.DOMModel.DOMNode | null;
    set rootDOMNode(x: SDK.DOMModel.DOMNode | null);
    get isXMLMimeType(): boolean;
    selectedDOMNode(): SDK.DOMModel.DOMNode | null;
    selectDOMNode(node: SDK.DOMModel.DOMNode | null, focus?: boolean): void;
    set maxRowsShown(maxRows: number | undefined);
    highlightAdoptedStyleSheet(adoptedStyleSheet: SDK.DOMModel.AdoptedStyleSheet): void;
    editing(): boolean;
    update(): void;
    selectedNodeChanged(focus: boolean): void;
    private fireElementsTreeUpdated;
    findTreeElement(node: SDK.DOMModel.DOMNode | SDK.DOMModel.AdoptedStyleSheet[]): ElementsTreeElement | null;
    private lookUpTreeElement;
    createTreeElementFor(node: SDK.DOMModel.DOMNode): ElementsTreeElement | null;
    private revealAndSelectNode;
    highlightNodeAttribute(node: SDK.DOMModel.DOMNode, attribute: string): void;
    treeElementFromEventInternal(event: MouseEvent): UI.TreeOutline.TreeElement | null;
    private onfocusout;
    private onmousedown;
    setHoverEffect(treeElement: UI.TreeOutline.TreeElement | null): void;
    private onmousemove;
    private highlightTreeElement;
    private onmouseleave;
    private ondragstart;
    private ondragover;
    private ondragleave;
    private ondrop;
    private ondragend;
    private clearDragOverTreeElementMarker;
    showContextMenu: (treeElement: ElementsTreeElement, event: Event) => void;
    runPendingUpdates(): void;
    toggleEditAsHTML(node: SDK.DOMModel.DOMNode, startEditing?: boolean, callback?: (() => void)): void;
    selectNodeAfterEdit(wasExpanded: boolean, error: string | null, newNode: SDK.DOMModel.DOMNode | null): ElementsTreeElement | null;
    toggleHideElement(node: SDK.DOMModel.DOMNode): Promise<void>;
    isToggledToHidden(node: SDK.DOMModel.DOMNode): boolean;
    private reset;
    wireToDOMModel(domModel: SDK.DOMModel.DOMModel): void;
    unwireFromDOMModel(domModel: SDK.DOMModel.DOMModel): void;
    private addUpdateRecord;
    private updateRecordForHighlight;
    private documentUpdated;
    private attributeModified;
    private attributeRemoved;
    private characterDataModified;
    private documentURLChanged;
    private nodeInserted;
    private nodeRemoved;
    private childNodeCountUpdated;
    private distributedNodesChanged;
    private adoptedStyleSheetsModified;
    private updateModifiedNodesSoon;
    /**
     * TODO: this is made public for unit tests until the ElementsTreeOutline is
     * migrated into DOMTreeWidget and highlights are declarative.
     */
    updateModifiedNodes(): void;
    private updateModifiedNode;
    private updateModifiedParentNode;
    populateTreeElement(treeElement: ElementsTreeElement): Promise<void>;
    createTopLayerContainer(parent: UI.TreeOutline.TreeElement, document: SDK.DOMModel.DOMDocument): void;
    revealInTopLayer(node: SDK.DOMModel.DOMNode): void;
    private isMaxDepthReached;
    private createElementTreeElement;
    private showChild;
    private visibleChildren;
    private hasVisibleChildren;
    private createExpandAllButtonTreeElement;
    setExpandedChildrenLimit(treeElement: ElementsTreeElement, expandedChildrenLimit: number): void;
    private updateChildren;
    insertChildElement(treeElement: ElementsTreeElement | TopLayerContainer, child: SDK.DOMModel.DOMNode | SDK.DOMModel.AdoptedStyleSheet[], index: number, isClosingTag?: boolean): UI.TreeOutline.TreeElement;
    private moveChild;
    private markersChanged;
    private affectedByStartingStylesFlagUpdated;
}
export declare namespace ElementsTreeOutline {
    enum Events {
        SelectedNodeChanged = "SelectedNodeChanged",
        ElementsTreeUpdated = "ElementsTreeUpdated",
        ShowAllRows = "ShowAllRows"
    }
    interface EventTypes {
        [Events.SelectedNodeChanged]: {
            node: SDK.DOMModel.DOMNode | null;
            focus: boolean;
        };
        [Events.ElementsTreeUpdated]: SDK.DOMModel.DOMNode[];
        [Events.ShowAllRows]: void;
    }
}
export declare const MappedCharToEntity: Map<string, string>;
export interface MultilineEditorController {
    cancel: () => void;
    commit: () => void;
    resize: () => void;
}
export interface ClipboardData {
    node: SDK.DOMModel.DOMNode;
    isCut: boolean;
}
