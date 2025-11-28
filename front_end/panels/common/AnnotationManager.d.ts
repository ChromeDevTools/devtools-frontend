import type * as SDK from '../../core/sdk/sdk.js';
import * as Annotations from '../../ui/components/annotations/annotations.js';
export declare class AnnotationManager {
    #private;
    constructor();
    static instance(): AnnotationManager;
    initializePlacementForAnnotationType(type: Annotations.AnnotationType, resolveRelativePosition: (parentElement: Element, revealNode: boolean, lookupId: string, node?: SDK.DOMModel.DOMNode) => Promise<{
        x: number;
        y: number;
    } | null>, parentElement: Element, insertBefore?: Node | null): void;
}
