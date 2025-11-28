import * as Common from '../../core/common/common.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Buttons from '../components/buttons/buttons.js';
import type { Icon } from '../kit/kit.js';
import * as Lit from '../lit/lit.js';
import { type Config } from './InplaceEditor.js';
import type { SearchableView } from './SearchableView.js';
import { HTMLElementWithLightDOMTemplate } from './UIUtils.js';
export declare enum Events {
    ElementAttached = "ElementAttached",
    ElementsDetached = "ElementsDetached",
    ElementExpanded = "ElementExpanded",
    ElementCollapsed = "ElementCollapsed",
    ElementSelected = "ElementSelected"
}
export interface EventTypes {
    [Events.ElementAttached]: TreeElement;
    [Events.ElementsDetached]: void;
    [Events.ElementExpanded]: TreeElement;
    [Events.ElementCollapsed]: TreeElement;
    [Events.ElementSelected]: TreeElement;
}
export declare class TreeOutline extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    readonly rootElementInternal: TreeElement;
    renderSelection: boolean;
    selectedTreeElement: TreeElement | null;
    expandTreeElementsWhenArrowing: boolean;
    comparator: ((arg0: TreeElement, arg1: TreeElement) => number) | null;
    contentElement: HTMLOListElement;
    preventTabOrder: boolean;
    showSelectionOnKeyboardFocus: boolean;
    private focusable;
    element: HTMLElement;
    private useLightSelectionColor;
    private treeElementToScrollIntoView;
    private centerUponScrollIntoView;
    constructor();
    setShowSelectionOnKeyboardFocus(show: boolean, preventTabOrder?: boolean): void;
    private createRootElement;
    rootElement(): TreeElement;
    firstChild(): TreeElement | null;
    private lastDescendent;
    appendChild(child: TreeElement, comparator?: ((arg0: TreeElement, arg1: TreeElement) => number)): void;
    insertChild(child: TreeElement, index: number): void;
    removeChild(child: TreeElement): void;
    removeChildren(): void;
    treeElementFromPoint(x: number, y: number): TreeElement | null;
    treeElementFromEvent(event: MouseEvent | null): TreeElement | null;
    setComparator(comparator: ((arg0: TreeElement, arg1: TreeElement) => number) | null): void;
    setFocusable(focusable: boolean): void;
    updateFocusable(): void;
    focus(): void;
    setUseLightSelectionColor(flag: boolean): void;
    getUseLightSelectionColor(): boolean;
    bindTreeElement(element: TreeElement): void;
    unbindTreeElement(element: TreeElement): void;
    selectPrevious(): boolean;
    selectNext(): boolean;
    forceSelect(omitFocus?: boolean | undefined, selectedByUser?: boolean | undefined): void;
    private selectFirst;
    private selectLast;
    private treeKeyDown;
    deferredScrollIntoView(treeElement: TreeElement, center: boolean): void;
    onStartedEditingTitle(_treeElement: TreeElement): void;
}
export declare const enum TreeVariant {
    NAVIGATION_TREE = "NavigationTree",
    OTHER = "Other"
}
export declare class TreeOutlineInShadow extends TreeOutline {
    element: HTMLElement;
    shadowRoot: ShadowRoot;
    private readonly disclosureElement;
    renderSelection: boolean;
    constructor(variant?: TreeVariant, element?: HTMLElement);
    setVariant(variant: TreeVariant): void;
    registerRequiredCSS(...cssFiles: Array<string & {
        _tag: 'CSS-in-JS';
    }>): void;
    setHideOverflow(hideOverflow: boolean): void;
    setDense(dense: boolean): void;
    onStartedEditingTitle(treeElement: TreeElement): void;
}
export declare const treeElementBylistItemNode: WeakMap<Node, TreeElement>;
export declare class TreeElement {
    #private;
    treeOutline: TreeOutline | null;
    parent: TreeElement | null;
    previousSibling: TreeElement | null;
    nextSibling: TreeElement | null;
    private readonly boundOnFocus;
    private readonly boundOnBlur;
    readonly listItemNode: HTMLLIElement;
    titleElement: Node;
    titleInternal: string | Node;
    private childrenInternal;
    childrenListNode: HTMLOListElement;
    private expandLoggable;
    private hiddenInternal;
    private selectableInternal;
    expanded: boolean;
    selected: boolean;
    private expandable;
    private collapsible;
    toggleOnClick: boolean;
    button: Buttons.Button.Button | null;
    root: boolean;
    private tooltipInternal;
    private leadingIconsElement;
    private trailingIconsElement;
    protected selectionElementInternal: HTMLElement | null;
    private disableSelectFocus;
    constructor(title?: string | Node, expandable?: boolean, jslogContext?: string | number);
    static getTreeElementBylistItemNode(node: Node): TreeElement | undefined;
    hasAncestor(ancestor: TreeElement | null): boolean;
    hasAncestorOrSelf(ancestor: TreeElement | null): boolean;
    isHidden(): boolean;
    children(): TreeElement[];
    childCount(): number;
    firstChild(): TreeElement | null;
    lastChild(): TreeElement | null;
    childAt(index: number): TreeElement | null;
    indexOfChild(child: TreeElement): number;
    appendChild(child: TreeElement, comparator?: ((arg0: TreeElement, arg1: TreeElement) => number)): void;
    insertChild(child: TreeElement, index: number): void;
    removeChildAtIndex(childIndex: number): void;
    removeChild(child: TreeElement): void;
    removeChildren(): void;
    get selectable(): boolean;
    set selectable(x: boolean);
    get listItemElement(): HTMLLIElement;
    get childrenListElement(): HTMLOListElement;
    get title(): string | Node;
    set title(x: string | Node);
    titleAsText(): string;
    startEditingTitle<T>(editingConfig: Config<T>): void;
    setLeadingIcons(icons: Icon[] | Lit.TemplateResult[]): void;
    get tooltip(): string;
    set tooltip(x: string);
    isExpandable(): boolean;
    setExpandable(expandable: boolean): void;
    isExpandRecursively(): boolean;
    setExpandRecursively(expandRecursively: boolean): void;
    isCollapsible(): boolean;
    setCollapsible(collapsible: boolean): void;
    get hidden(): boolean;
    set hidden(x: boolean);
    invalidateChildren(): void;
    private ensureSelection;
    private treeElementToggled;
    private handleMouseDown;
    private handleDoubleClick;
    private detach;
    collapse(): void;
    collapseRecursively(): void;
    collapseChildren(): void;
    expand(): void;
    expandRecursively(maxDepth?: number): Promise<void>;
    collapseOrAscend(altKey: boolean): boolean;
    descendOrExpand(altKey: boolean): boolean;
    reveal(center?: boolean): void;
    revealed(): boolean;
    selectOnMouseDown(event: MouseEvent): void;
    select(omitFocus?: boolean, selectedByUser?: boolean): boolean;
    setFocusable(focusable: boolean): void;
    private onFocus;
    private onBlur;
    revealAndSelect(omitFocus?: boolean): void;
    deselect(): void;
    private populateIfNeeded;
    onpopulate(): Promise<void>;
    onenter(): boolean;
    ondelete(): boolean;
    onspace(): boolean;
    onbind(): void;
    onunbind(): void;
    onattach(): void;
    onexpand(): void;
    oncollapse(): void;
    ondblclick(_e: Event): boolean;
    onselect(_selectedByUser?: boolean): boolean;
    traverseNextTreeElement(skipUnrevealed: boolean, stayWithin?: TreeElement | null, dontPopulate?: boolean, info?: {
        depthChange: number;
    }): TreeElement | null;
    traversePreviousTreeElement(skipUnrevealed: boolean, dontPopulate?: boolean): TreeElement | null;
    isEventWithinDisclosureTriangle(event: MouseEvent): boolean;
    setDisableSelectFocus(toggle: boolean): void;
}
interface TreeNode<NodeT> {
    children(): NodeT[];
}
export interface TreeSearchResult<NodeT> {
    node: NodeT;
    isPostOrderMatch: boolean;
    matchIndexInNode: number;
}
export declare class TreeSearch<NodeT extends TreeNode<NodeT>, SearchResultT extends TreeSearchResult<NodeT> = TreeSearchResult<NodeT>> {
    #private;
    reset(): void;
    currentMatch(): SearchResultT | undefined;
    getResults(node: NodeT): SearchResultT[];
    static highlight(ranges: TextUtils.TextRange.SourceRange[], selectedRange: TextUtils.TextRange.SourceRange | undefined): ReturnType<typeof Lit.Directives.ref>;
    updateSearchableView(view: SearchableView): void;
    next(): SearchResultT | undefined;
    prev(): SearchResultT | undefined;
    search(node: NodeT, jumpBackwards: boolean, match: (node: NodeT, isPostOrder: boolean) => SearchResultT[]): number;
}
/**
 * A tree element that can be used as progressive enhancement over a <ul> element. A `template` IDL attribute allows
 * additionally to insert the <ul> into a <template>, avoiding rendering anything into light DOM, which is recommended.
 * The <ul> itself will be cloned into shadow DOM and rendered there.
 *
 * ## Usage ##
 *
 * It can be used as
 * ```
 * <devtools-tree
 *   .template=${html`
 *     <ul role="tree">
 *        <li role="treeitem" @expand=${onExpand}>
 *          Tree Node Text
 *          <ul role="group">
 *            Node with subtree
 *            <li role="treeitem" jslog-context="context">
 *              <ul role="group" hidden>
 *                <li role="treeitem">Tree Node Text in collapsed subtree</li>
 *                <li role="treeitem">Tree Node Text in collapsed subtree</li>
 *              </ul>
 *           </li>
 *           <li selected role="treeitem">Tree Node Text in a selected-by-default node</li>
 *         </ul>
 *       </li>
 *     </ul>
 *   </template>`}
 * ></devtools-tree>
 *
 * ```
 * where a <li role="treeitem"> element defines a tree node and its contents (the <li> is the `config element` for this
 * tree node). If a tree node contains a <ul role="group">, that defines a subtree under that tree node. The `hidden`
 * attribute on the <ul> defines whether that subtree should render as collapsed. Note that node expanding/collapsing do
 * not reflect this state back to the attribute on the config element, those state changes are rather sent out as
 * `expand` events on the config element.
 *
 * Under the hood this uses TreeOutline.
 *
 * ## Config Element Attributes ##
 *
 * - `selected`: Whether the tree node should be rendered as selected.
 * - `jslog-context`: The jslog context for the tree element.
 * - `aria-*`: All aria attributes defined on the config element are cloned over.
 * - `hidden`: On the <ul>, declares whether the subtree should be rendererd as expanded or collapsed.
 *
 * ## Event Handling ##
 *
 * This section is only relevant if NOT using the `template`.
 *
 * Since config elements are cloned into the shadow DOM, it's not possible to directly attach event listeners to the
 * children of config elements. Instead, the `UI.UIUtils.InterceptBindingDirective` directive needs to be used as a
 * wrapper:
 * ```
 * const on = Lit.Directive.directive(UI.UIUtils.InterceptBindingDirective);
 *
 * html`<li role="treeitem">
 *   <button @click=${on(clickHandler)}>click me</button>
 * </li>`
 * ```
 *
 * @property template Define the tree contents
 * @event selected A node was selected
 * @attribute navigation-variant Turn this tree into the navigation variant
 * @attribute hide-overflow
 */
export declare class TreeViewElement extends HTMLElementWithLightDOMTemplate {
    #private;
    static readonly observedAttributes: string[];
    constructor();
    getInternalTreeOutlineForTest(): TreeOutlineInShadow;
    protected updateNode(node: Node, attributeName: string | null): void;
    protected addNodes(nodes: NodeList | Node[], nextSibling?: Node | null): void;
    protected removeNodes(nodes: NodeList): void;
    set hideOverflow(hide: boolean);
    get hideOverflow(): boolean;
    set navgiationVariant(navigationVariant: boolean);
    get navigationVariant(): boolean;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
}
export declare namespace TreeViewElement {
    class SelectEvent extends CustomEvent<HTMLLIElement> {
        constructor(detail: HTMLLIElement);
    }
    class ExpandEvent extends CustomEvent<{
        expanded: boolean;
    }> {
        constructor(detail: {
            expanded: boolean;
        });
    }
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-tree': TreeViewElement;
    }
}
export {};
