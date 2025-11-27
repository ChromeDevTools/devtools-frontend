import * as Common from '../../../core/common/common.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import { AnnotationType } from './AnnotationType.js';
interface BaseAnnotationData {
    id: number;
    type: AnnotationType;
    message: string;
    lookupId: string;
    anchorToString?: string;
}
export declare const enum Events {
    ANNOTATION_ADDED = "AnnotationAdded"
}
export interface EventTypes {
    [Events.ANNOTATION_ADDED]: BaseAnnotationData;
}
export declare class AnnotationRepository {
    #private;
    static instance(): AnnotationRepository;
    static annotationsEnabled(): boolean;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T]>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    getAnnotationsByType(type: AnnotationType): BaseAnnotationData[];
    addElementsAnnotation(label: string, lookupId?: string, anchor?: SDK.DOMModel.DOMNode, anchorToString?: string): void;
}
export {};
