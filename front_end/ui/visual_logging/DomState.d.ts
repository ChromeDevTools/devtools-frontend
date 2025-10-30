interface ElementWithParent {
    element: Element;
    parent?: Element;
    slot?: Element;
}
export declare function getDomState(documents: Document[]): {
    loggables: ElementWithParent[];
    shadowRoots: ShadowRoot[];
};
export declare function visibleOverlap(element: Element, viewportRect: DOMRect): DOMRect | null;
export {};
