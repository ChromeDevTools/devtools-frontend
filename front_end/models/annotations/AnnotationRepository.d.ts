import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import { AnnotationType } from './AnnotationType.js';
export interface BaseAnnotationData {
    id: number;
    type: AnnotationType;
    message: string;
    lookupId: string;
    anchorToString?: string;
}
export interface ElementsAnnotationData extends BaseAnnotationData {
    type: AnnotationType.ELEMENT_NODE;
    anchor?: SDK.DOMModel.DOMNode;
}
export interface NetworkRequestAnnotationData extends BaseAnnotationData {
    type: AnnotationType.NETWORK_REQUEST;
    anchor?: SDK.NetworkRequest.NetworkRequest;
}
export interface NetworkRequestDetailsAnnotationData extends BaseAnnotationData {
    type: AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS;
    anchor?: SDK.NetworkRequest.NetworkRequest;
}
export declare const enum Events {
    ANNOTATION_ADDED = "AnnotationAdded",
    ANNOTATION_DELETED = "AnnotationDeleted",
    ALL_ANNOTATIONS_DELETED = "AllAnnotationsDeleted"
}
export interface EventTypes {
    [Events.ANNOTATION_ADDED]: BaseAnnotationData;
    [Events.ANNOTATION_DELETED]: {
        id: number;
    };
    [Events.ALL_ANNOTATIONS_DELETED]: void;
}
export declare class AnnotationRepository {
    #private;
    static instance(): AnnotationRepository;
    static annotationsEnabled(): boolean;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T]>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    getAnnotationDataByType(type: AnnotationType): BaseAnnotationData[];
    getAnnotationDataById(id: number): BaseAnnotationData | undefined;
    addElementsAnnotation(label: string, anchor?: SDK.DOMModel.DOMNode | string, anchorToString?: string): void;
    addNetworkRequestAnnotation(label: string, anchor?: SDK.NetworkRequest.NetworkRequest | string, anchorToString?: string): void;
    deleteAllAnnotations(): void;
    deleteAnnotation(id: number): void;
}
