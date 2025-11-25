// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import type * as SDK from '../../../core/sdk/sdk.js';

import type {AnnotationType} from './AnnotationType.js';

interface AnnotationData {
  id: number;
  type: AnnotationType;
  message: string;
  // Sometimes the anchor for an annotation is not known, but is provided using a
  // string id instead (which can be converted to an `anchor` later).
  lookupId: string;
  // What to anchor the annotation to.
  anchor?: SDK.DOMModel.DOMNode|SDK.NetworkRequest.NetworkRequest|null;
  // Sometimes we want annotations to anchor to a particular string on the page.
  anchorToString?: string;
}

export const enum Events {
  ANNOTATION_ADDED = 'AnnotationAdded',
}

export interface EventTypes {
  [Events.ANNOTATION_ADDED]: AnnotationData;
}

export class AnnotationRepository {
  static #instance: AnnotationRepository|null = null;
  #events = new Common.ObjectWrapper.ObjectWrapper<EventTypes>();
  #annotations: AnnotationData[] = [];
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

  getAnnotationsByType(type: AnnotationType): AnnotationData[] {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received query for annotation types with annotations disabled');
      return [];
    }

    const annotations = this.#annotations.filter(annotation => annotation.type === type);
    return annotations;
  }

  addAnnotationWithAnchor(
      label: string,
      anchor: SDK.DOMModel.DOMNode|SDK.NetworkRequest.NetworkRequest|string|null,
      type: AnnotationType,
      anchorToString = '',
      ): void {
    if (!AnnotationRepository.annotationsEnabled()) {
      console.warn('Received annotation registration with annotations disabled');
      return;
    }

    const annotationData = {
      id: this.#nextId++,
      type,
      message: label,
      lookupId: typeof anchor === 'string' ? anchor : 'None',
      anchor: typeof anchor === 'string' ? null : anchor,
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
