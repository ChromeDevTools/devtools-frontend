// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import type * as SDK from '../../../core/sdk/sdk.js';

import {AnnotationType} from './AnnotationType.js';

export interface BaseAnnotationData {
  id: number;
  type: AnnotationType;
  message: string;
  // Sometimes the anchor for an annotation is not known, but is provided using a
  // string id instead (which can be converted to a proper `anchor`).
  lookupId: string;
  // Sometimes we want annotations to anchor to a particular string on the page.
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

export const enum Events {
  ANNOTATION_ADDED = 'AnnotationAdded',
  ANNOTATION_DELETED = 'AnnotationDeleted',
  ALL_ANNOTATIONS_DELETED = 'AllAnnotationsDeleted',
}

export interface EventTypes {
  [Events.ANNOTATION_ADDED]: BaseAnnotationData;
  [Events.ANNOTATION_DELETED]: {id: number};
  [Events.ALL_ANNOTATIONS_DELETED]: void;
}

export class AnnotationRepository {
  static #instance: AnnotationRepository|null = null;
  static #hasRepliedGreenDevDisabled = false;
  static #hasShownFlagWarning = false;

  #events = new Common.ObjectWrapper.ObjectWrapper<EventTypes>();
  #annotationData: BaseAnnotationData[] = [];
  #nextId = 0;

  static instance(): AnnotationRepository {
    if (!AnnotationRepository.#instance) {
      AnnotationRepository.#instance = new AnnotationRepository();
    }
    return AnnotationRepository.#instance;
  }

  static annotationsEnabled(): boolean {
    const enabled = Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
    // TODO(finnur): Fix race when Repository is created before feature flags have been set properly.
    if (!enabled) {
      this.#hasRepliedGreenDevDisabled = true;
    } else if (this.#hasRepliedGreenDevDisabled && !this.#hasShownFlagWarning) {
      console.warn(
          'Flag controlling GreenDev has flipped from false to true. ' +
          'Only some callers will expect GreenDev to be enabled, which can lead to unexpected results.');
      this.#hasShownFlagWarning = true;
    }
    return Boolean(enabled);
  }

  addEventListener<T extends keyof EventTypes>(
      eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T]>) => void,
      thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T> {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received request to add event listener with annotations disabled');
    }
    return this.#events.addEventListener(eventType, listener, thisObject);
  }

  getAnnotationDataByType(type: AnnotationType): BaseAnnotationData[] {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received query for annotation types with annotations disabled');
      return [];
    }

    const annotations = this.#annotationData.filter(annotation => annotation.type === type);
    return annotations;
  }

  getAnnotationDataById(id: number): BaseAnnotationData|undefined {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received query for annotation type with annotations disabled');
      return undefined;
    }

    return this.#annotationData.find(annotation => annotation.id === id);
  }

  #getExistingAnnotation(type: AnnotationType, anchor?: SDK.DOMModel.DOMNode|SDK.NetworkRequest.NetworkRequest|string):
      BaseAnnotationData|undefined {
    const annotations = this.getAnnotationDataByType(type);
    const annotation = annotations.find(annotation => {
      if (typeof anchor === 'string') {
        return annotation.lookupId === anchor;
      }
      switch (type) {
        case AnnotationType.ELEMENT_NODE: {
          const elementAnnotation = annotation as ElementsAnnotationData;
          return elementAnnotation.anchor === anchor;
        }
        case AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS: {
          const networkRequestDetailsAnnotation = annotation as NetworkRequestDetailsAnnotationData;
          return networkRequestDetailsAnnotation.anchor === anchor;
        }
        default:
          console.warn('[AnnotationRepository] Unknown AnnotationType', type);
          return false;
      }
    });
    return annotation;
  }

  #updateExistingAnnotationLabel(
      label: string, type: AnnotationType,
      anchor?: SDK.DOMModel.DOMNode|SDK.NetworkRequest.NetworkRequest|string): boolean {
    const annotation = this.#getExistingAnnotation(type, anchor);
    if (annotation) {
      // TODO(finnur): This should work for annotations that have not been displayed yet,
      // but we need to also notify the AnnotationManager for those that have been shown.
      annotation.message = label;
      return true;
    }
    return false;
  }

  addElementsAnnotation(
      label: string,
      anchor?: SDK.DOMModel.DOMNode|string,
      anchorToString?: string,
      ): void {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received annotation registration with annotations disabled');
      return;
    }

    if (this.#updateExistingAnnotationLabel(label, AnnotationType.ELEMENT_NODE, anchor)) {
      return;
    }

    const annotationData: ElementsAnnotationData = {
      id: this.#nextId++,
      type: AnnotationType.ELEMENT_NODE,
      message: label,
      lookupId: typeof anchor === 'string' ? anchor : '',
      anchor: typeof anchor !== 'string' ? anchor : undefined,
      anchorToString,
    };
    this.#annotationData.push(annotationData);
    // eslint-disable-next-line no-console
    console.log('[AnnotationRepository] Added element annotation:', label, {
      annotationData,
      annotations: this.#annotationData.length,
    });
    this.#events.dispatchEventToListeners(Events.ANNOTATION_ADDED, annotationData);
  }

  addNetworkRequestAnnotation(
      label: string,
      anchor?: SDK.NetworkRequest.NetworkRequest|string,
      anchorToString?: string,
      ): void {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received annotation registration with annotations disabled');
      return;
    }

    // We only need to update the NETWORK_REQUEST_SUBPANEL_HEADERS because the
    // NETWORK_REQUEST Annotation has no meaningful label.
    if (this.#updateExistingAnnotationLabel(label, AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS, anchor)) {
      return;
    }

    const annotationData: NetworkRequestAnnotationData = {
      id: this.#nextId++,
      type: AnnotationType.NETWORK_REQUEST,
      message: '',
      lookupId: typeof anchor === 'string' ? anchor : '',
      anchor: typeof anchor !== 'string' ? anchor : undefined,
      anchorToString,
    };
    this.#annotationData.push(annotationData);
    // eslint-disable-next-line no-console
    console.log('[AnnotationRepository] Added annotation:', label, {
      annotationData,
      annotations: this.#annotationData.length,
    });
    this.#events.dispatchEventToListeners(Events.ANNOTATION_ADDED, annotationData);

    const annotationDetailsData: NetworkRequestDetailsAnnotationData = {
      id: this.#nextId++,
      type: AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS,
      message: label,
      lookupId: typeof anchor === 'string' ? anchor : '',
      anchor: typeof anchor !== 'string' ? anchor : undefined,
      anchorToString,
    };

    this.#annotationData.push(annotationDetailsData);
    this.#events.dispatchEventToListeners(Events.ANNOTATION_ADDED, annotationDetailsData);
  }

  deleteAllAnnotations(): void {
    this.#annotationData = [];
    this.#events.dispatchEventToListeners(Events.ALL_ANNOTATIONS_DELETED);
    // eslint-disable-next-line no-console
    console.log('[AnnotationRepository] Deleting all annotations');
  }

  deleteAnnotation(id: number): void {
    const index = this.#annotationData.findIndex(annotation => annotation.id === id);
    if (index === -1) {
      console.warn(`[AnnotationRepository] Could not find annotation with id ${id}`);
      return;
    }
    this.#annotationData.splice(index, 1);
    this.#events.dispatchEventToListeners(Events.ANNOTATION_DELETED, {id});
    // eslint-disable-next-line no-console
    console.log(`[AnnotationRepository] Deleted annotation with id ${id}`);
  }
}
