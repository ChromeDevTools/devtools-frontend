// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import type * as SDK from '../../../core/sdk/sdk.js';

import {AnnotationType} from './AnnotationType.js';

interface BaseAnnotationData {
  id: number;
  type: AnnotationType;
  message: string;
  // Sometimes the anchor for an annotation is not known, but is provided using a
  // string id instead (which can be converted to an `anchor` later).
  lookupId: string;
  // Sometimes we want annotations to anchor to a particular string on the page.
  anchorToString?: string;
}

export interface ElementsAnnotationData extends BaseAnnotationData {
  type: AnnotationType.ELEMENT_NODE;
  anchor?: SDK.DOMModel.DOMNode;
}

export const enum Events {
  ANNOTATION_ADDED = 'AnnotationAdded',
}

export interface EventTypes {
  [Events.ANNOTATION_ADDED]: BaseAnnotationData;
}

export class AnnotationRepository {
  static #instance: AnnotationRepository|null = null;
  #events = new Common.ObjectWrapper.ObjectWrapper<EventTypes>();
  #annotations: BaseAnnotationData[] = [];
  #nextId = 0;

  static instance(): AnnotationRepository {
    if (!AnnotationRepository.#instance) {
      AnnotationRepository.#instance = new AnnotationRepository();
    }
    return AnnotationRepository.#instance;
  }

  static annotationsEnabled(): boolean {
    return Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
  }

  addEventListener<T extends keyof EventTypes>(
      eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T]>) => void,
      thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T> {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received request to add event listener with annotations disabled');
    }
    return this.#events.addEventListener(eventType, listener, thisObject);
  }

  getAnnotationsByType(type: AnnotationType): BaseAnnotationData[] {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received query for annotation types with annotations disabled');
      return [];
    }

    const annotations = this.#annotations.filter(annotation => annotation.type === type);
    return annotations;
  }

  addElementsAnnotation(
      label: string,
      lookupId?: string,
      anchor?: SDK.DOMModel.DOMNode,
      anchorToString?: string,
      ): void {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received annotation registration with annotations disabled');
      return;
    }

    const annotationData: ElementsAnnotationData = {
      id: this.#nextId++,
      type: AnnotationType.ELEMENT_NODE,
      message: label,
      lookupId: lookupId || '',
      anchor,
      anchorToString
    };
    this.#annotations.push(annotationData);
    // eslint-disable-next-line no-console
    console.log('[AnnotationRepository] Added annotation:', label, {
      annotationData,
      annotations: this.#annotations.length,
    });
    this.#events.dispatchEventToListeners(Events.ANNOTATION_ADDED, annotationData);
  }
}
