export interface CopyResult {
    plainText?: string;
}
export type SelectionEndpoint = {
    node: Node;
    offset: number;
} | {
    gap: Gap;
    atEnd: boolean;
};
export interface ViewInput {
    topGapHeight: number;
    bottomGapHeight: number;
    expandContent: boolean;
    contentTabIndex: number;
    items: readonly ConsoleViewportElement[];
    onScroll: () => void;
    onCopy: () => CopyResult | null;
    onDragStart: () => string | null;
    onFocusIn: (targetItemIndex: number, isContainerTarget: boolean, relatedTargetOutside: boolean) => void;
    onFocusOut: (relatedTargetOutside: boolean) => void;
    onKeyDown: (key: string, shiftKey: boolean) => boolean;
}
export type Gap = 'top' | 'bottom';
export interface ViewOutput {
    observeContent?: (observer: MutationObserver, options: MutationObserverInit) => void;
    focusContent?: () => void;
    hasContentFocus?: () => boolean;
    isContentActiveElement?: () => boolean;
    rangeIntersectsGap?: (range: Range, gap: Gap) => boolean;
    setSelectionBaseAndExtent?: (selection: Selection, anchor: SelectionEndpoint, head: SelectionEndpoint) => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ConsoleViewport {
    #private;
    element: HTMLElement;
    private topGapElementActive;
    private bottomGapElementActive;
    private provider;
    private virtualSelectedIndex;
    private firstActiveIndex;
    private lastActiveIndex;
    private renderedItems;
    private anchorSelection;
    private headSelection;
    private itemCount;
    private cumulativeHeights;
    private muteCopyHandler;
    private readonly observer;
    private readonly observerConfig;
    private selectionIsBackward;
    private lastSelectedElement?;
    private cachedProviderElements?;
    constructor(provider: ConsoleViewportProvider, view?: View);
    stickToBottom(): boolean;
    setStickToBottom(value: boolean): void;
    hasVirtualSelection(): boolean;
    copyWithStyles(): void;
    private onCopy;
    private onFocusIn;
    private onFocusOut;
    private onDragStart;
    private onKeyDown;
    private updateFocusedItem;
    contentElement(): Element;
    invalidate(): void;
    private providerElement;
    private rebuildCumulativeHeights;
    private rebuildCumulativeHeightsIfNeeded;
    private cachedItemHeight;
    private isSelectionBackwards;
    private createSelectionModel;
    private updateSelectionModel;
    private restoreSelection;
    private selectionContainsTable;
    refresh(): void;
    private partialViewportUpdate;
    private selectedText;
    private isNodeVisible;
    private visibleChildTextNodes;
    private textOffsetInNode;
    private onScroll;
    firstVisibleIndex(): number;
    lastVisibleIndex(): number;
    renderedElementAt(index: number): HTMLElement | null;
    scrollItemIntoView(index: number, makeLast?: boolean): void;
    forceScrollItemToBeFirst(index: number): void;
    forceScrollItemToBeLast(index: number): void;
    private visibleHeight;
}
export interface ConsoleViewportProvider {
    fastHeight(index: number): number;
    itemCount(): number;
    minimumRowHeight(): number;
    itemElement(index: number): ConsoleViewportElement | null;
}
export interface ConsoleViewportElement {
    willHide(): void;
    wasShown(): void;
    element(): HTMLElement;
    focusLastChildOrSelf(): void;
}
