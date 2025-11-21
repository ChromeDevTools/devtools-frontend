import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ElementsTreeElement } from './ElementsTreeElement.js';
import type { MarkerDecoratorRegistration } from './MarkerDecorator.js';
import { TopLayerContainer } from './TopLayerContainer.js';
export type View = typeof DEFAULT_VIEW;
interface ViewInput {
    omitRootDOMNode: boolean;
    selectEnabled: boolean;
    hideGutter: boolean;
    visibleWidth?: number;
    visible?: boolean;
    wrap: boolean;
    showSelectionOnKeyboardFocus: boolean;
    preventTabOrder: boolean;
    deindentSingleNode: boolean;
    currentHighlightedNode: SDK.DOMModel.DOMNode | null;
    onSelectedNodeChanged: (event: Common.EventTarget.EventTargetEvent<{
        node: SDK.DOMModel.DOMNode | null;
        focus: boolean;
    }>) => void;
    onElementsTreeUpdated: (event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode[]>) => void;
    onElementCollapsed: () => void;
    onElementExpanded: () => void;
}
interface ViewOutput {
    elementsTreeOutline?: ElementsTreeOutline;
    highlightedTreeElement: ElementsTreeElement | null;
    isUpdatingHighlights: boolean;
    alreadyExpandedParentTreeElement: ElementsTreeElement | null;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
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
    onDocumentUpdated: (domModel: SDK.DOMModel.DOMModel) => void;
    set visibleWidth(width: number);
    set rootDOMNode(node: SDK.DOMModel.DOMNode | null);
    get rootDOMNode(): SDK.DOMModel.DOMNode | null;
    constructor(element?: HTMLElement, view?: View);
    selectDOMNode(node: SDK.DOMModel.DOMNode | null, focus?: boolean): void;
    highlightNodeAttribute(node: SDK.DOMModel.DOMNode, attribute: string): void;
    setWordWrap(wrap: boolean): void;
    selectedDOMNode(): SDK.DOMModel.DOMNode | null;
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
    toggleEditAsHTML(node: SDK.DOMModel.DOMNode): void;
    duplicateNode(node: SDK.DOMModel.DOMNode): void;
    copyStyles(node: SDK.DOMModel.DOMNode): void;
    /**
     * FIXME: used to determine focus state, probably we can have a better
     * way to do it.
     */
    empty(): boolean;
    focus(): void;
    wasShown(): void;
    detach(overrideHideOnDetach?: boolean): void;
    show(parentElement: Element, insertBefore?: Node | null, suppressOrphanWidgetError?: boolean): void;
}
declare const ElementsTreeOutline_base: (new (...args: any[]) => {
    addEventListener<T extends keyof ElementsTreeOutline.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<ElementsTreeOutline.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<ElementsTreeOutline.EventTypes, T>;
    once<T extends keyof ElementsTreeOutline.EventTypes>(eventType: T): Promise<ElementsTreeOutline.EventTypes[T]>;
    removeEventListener<T extends keyof ElementsTreeOutline.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<ElementsTreeOutline.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof ElementsTreeOutline.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof ElementsTreeOutline.EventTypes>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<ElementsTreeOutline.EventTypes, T>): void;
}) & typeof UI.TreeOutline.TreeOutline;
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
    private readonly imagePreviewPopover;
    private updateRecords;
    private treeElementsBeingUpdated;
    decoratorExtensions: MarkerDecoratorRegistration[] | null;
    private showHTMLCommentsSetting;
    private multilineEditing?;
    private visibleWidthInternal?;
    private clipboardNodeData?;
    private isXMLMimeTypeInternal?;
    suppressRevealAndSelect: boolean;
    private previousHoveredElement?;
    private treeElementBeingDragged?;
    private dragOverTreeElement?;
    private updateModifiedNodesTimeout?;
    constructor(omitRootDOMNode?: boolean, selectEnabled?: boolean, hideGutter?: boolean);
    static forDOMModel(domModel: SDK.DOMModel.DOMModel): ElementsTreeOutline | null;
    deindentSingleNode(): void;
    updateNodeElementToIssue(element: Element, issues: IssuesManager.Issue.Issue[]): void;
    private onShowHTMLCommentsChange;
    setWordWrap(wrap: boolean): void;
    setMultilineEditing(multilineEditing: MultilineEditorController | null): void;
    visibleWidth(): number;
    setVisibleWidth(width: number): void;
    private setClipboardData;
    resetClipboardIfNeeded(removedNode: SDK.DOMModel.DOMNode): void;
    private onBeforeCopy;
    private onCopyOrCut;
    performCopyOrCut(isCut: boolean, node: SDK.DOMModel.DOMNode | null, includeShadowRoots?: boolean): void;
    canPaste(targetNode: SDK.DOMModel.DOMNode): boolean;
    pasteNode(targetNode: SDK.DOMModel.DOMNode): void;
    duplicateNode(targetNode: SDK.DOMModel.DOMNode): void;
    private onPaste;
    private performPaste;
    private performDuplicate;
    setVisible(visible: boolean): void;
    get rootDOMNode(): SDK.DOMModel.DOMNode | null;
    set rootDOMNode(x: SDK.DOMModel.DOMNode | null);
    get isXMLMimeType(): boolean;
    selectedDOMNode(): SDK.DOMModel.DOMNode | null;
    selectDOMNode(node: SDK.DOMModel.DOMNode | null, focus?: boolean): void;
    editing(): boolean;
    update(): void;
    selectedNodeChanged(focus: boolean): void;
    private fireElementsTreeUpdated;
    findTreeElement(node: SDK.DOMModel.DOMNode): ElementsTreeElement | null;
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
    private validDragSourceOrTarget;
    private ondrop;
    private doMove;
    private ondragend;
    private clearDragOverTreeElementMarker;
    private contextMenuEventFired;
    showContextMenu(treeElement: ElementsTreeElement, event: Event): Promise<void>;
    private saveNodeToTempVariable;
    runPendingUpdates(): void;
    private onKeyDown;
    toggleEditAsHTML(node: SDK.DOMModel.DOMNode, startEditing?: boolean, callback?: (() => void)): void;
    selectNodeAfterEdit(wasExpanded: boolean, error: string | null, newNode: SDK.DOMModel.DOMNode | null): ElementsTreeElement | null;
    /**
     * Runs a script on the node's remote object that toggles a class name on
     * the node and injects a stylesheet into the head of the node's document
     * containing a rule to set "visibility: hidden" on the class and all it's
     * ancestors.
     */
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
    private nodeInserted;
    private nodeRemoved;
    private childNodeCountUpdated;
    private distributedNodesChanged;
    private updateModifiedNodesSoon;
    /**
     * TODO: this is made public for unit tests until the ElementsTreeOutline is
     * migrated into DOMTreeWidget and highlights are declarative.
     */
    updateModifiedNodes(): void;
    private updateModifiedNode;
    private updateModifiedParentNode;
    populateTreeElement(treeElement: ElementsTreeElement): Promise<void>;
    createTopLayerContainer(parent: UI.TreeOutline.TreeElement, document: SDK.DOMModel.DOMDocument): Promise<void>;
    private createElementTreeElement;
    private showChild;
    private visibleChildren;
    private hasVisibleChildren;
    private createExpandAllButtonTreeElement;
    setExpandedChildrenLimit(treeElement: ElementsTreeElement, expandedChildrenLimit: number): void;
    private updateChildren;
    insertChildElement(treeElement: ElementsTreeElement | TopLayerContainer, child: SDK.DOMModel.DOMNode, index: number, isClosingTag?: boolean): ElementsTreeElement;
    private moveChild;
    private markersChanged;
    private topLayerElementsChanged;
    private scrollableFlagUpdated;
    private affectedByStartingStylesFlagUpdated;
}
export declare namespace ElementsTreeOutline {
    enum Events {
        SelectedNodeChanged = "SelectedNodeChanged",
        ElementsTreeUpdated = "ElementsTreeUpdated"
    }
    interface EventTypes {
        [Events.SelectedNodeChanged]: {
            node: SDK.DOMModel.DOMNode | null;
            focus: boolean;
        };
        [Events.ElementsTreeUpdated]: SDK.DOMModel.DOMNode[];
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
export {};
