// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import { AnnotationType } from './AnnotationType.js';
export class AnnotationRepository {
    static #instance = null;
    static #hasRepliedGreenDevDisabled = false;
    static #hasShownFlagWarning = false;
    #events = new Common.ObjectWrapper.ObjectWrapper();
    #annotationData = [];
    #nextId = 0;
    static instance() {
        if (!AnnotationRepository.#instance) {
            AnnotationRepository.#instance = new AnnotationRepository();
        }
        return AnnotationRepository.#instance;
    }
    static annotationsEnabled() {
        const enabled = Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
        // TODO(finnur): Fix race when Repository is created before feature flags have been set properly.
        if (!enabled) {
            this.#hasRepliedGreenDevDisabled = true;
        }
        else if (this.#hasRepliedGreenDevDisabled && !this.#hasShownFlagWarning) {
            console.warn('Flag controlling GreenDev has flipped from false to true. ' +
                'Only some callers will expect GreenDev to be enabled, which can lead to unexpected results.');
            this.#hasShownFlagWarning = true;
        }
        return Boolean(enabled);
    }
    addEventListener(eventType, listener, thisObject) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received request to add event listener with annotations disabled');
        }
        return this.#events.addEventListener(eventType, listener, thisObject);
    }
    getAnnotationDataByType(type) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received query for annotation types with annotations disabled');
            return [];
        }
        const annotations = this.#annotationData.filter(annotation => annotation.type === type);
        return annotations;
    }
    getAnnotationDataById(id) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received query for annotation type with annotations disabled');
            return undefined;
        }
        return this.#annotationData.find(annotation => annotation.id === id);
    }
    addElementsAnnotation(label, anchor, anchorToString) {
        if (!AnnotationRepository.annotationsEnabled()) {
            console.warn('Received annotation registration with annotations disabled');
            return;
        }
        const annotationData = {
            id: this.#nextId++,
            type: AnnotationType.ELEMENT_NODE,
            message: label,
            lookupId: typeof anchor === 'string' ? anchor : '',
            anchor: typeof anchor !== 'string' ? anchor : undefined,
            anchorToString
        };
        this.#annotationData.push(annotationData);
        // eslint-disable-next-line no-console
        console.log('[AnnotationRepository] Added annotation:', label, {
            annotationData,
            annotations: this.#annotationData.length,
        });
        this.#events.dispatchEventToListeners("AnnotationAdded" /* Events.ANNOTATION_ADDED */, annotationData);
    }
}
//# sourceMappingURL=AnnotationRepository.js.map