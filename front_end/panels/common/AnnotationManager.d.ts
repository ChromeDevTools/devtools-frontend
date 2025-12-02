import type * as SDK from '../../core/sdk/sdk.js';
import * as Annotations from '../../ui/components/annotations/annotations.js';
export declare class AnnotationManager {
    #private;
    constructor();
    static instance(): AnnotationManager;
    initializePlacementForAnnotationType(type: Annotations.AnnotationType, resolveInitialState: (parentElement: Element, reveal: boolean, lookupId: string, anchor?: SDK.DOMModel.DOMNode | SDK.NetworkRequest.NetworkRequest) => Promise<{
        x: number;
        y: number;
    } | null>, parentElement: Element, insertBefore?: Node | null): void;
    resolveAnnotationsOfType(type: Annotations.AnnotationType): Promise<void>;
}
