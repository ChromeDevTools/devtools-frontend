// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import { AnnotationType } from './AnnotationType.js';
export class AnnotationRepository {
    static #instance = null;
    #events = new Common.ObjectWrapper.ObjectWrapper();
    #annotations = [];
    #nextId = 0;
    static instance() {
        if (!AnnotationRepository.#instance) {
            AnnotationRepository.#instance = new AnnotationRepository();
        }
        return AnnotationRepository.#instance;
    }
    static annotationsEnabled() {
        return Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
    }
    addEventListener(eventType, listener, thisObject) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received request to add event listener with annotations disabled');
        }
        return this.#events.addEventListener(eventType, listener, thisObject);
    }
    getAnnotationsByType(type) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received query for annotation types with annotations disabled');
            return [];
        }
        const annotations = this.#annotations.filter(annotation => annotation.type === type);
        return annotations;
    }
    addElementsAnnotation(label, lookupId, anchor, anchorToString) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received annotation registration with annotations disabled');
            return;
        }
        const annotationData = {
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
        this.#events.dispatchEventToListeners("AnnotationAdded" /* Events.ANNOTATION_ADDED */, annotationData);
    }
}
//# sourceMappingURL=AnnotationRepository.js.map