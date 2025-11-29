// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Annotations from '../../ui/components/annotations/annotations.js';
import { Annotation } from './Annotation.js';
// This class handles general management of Annotations, the data needed to display them and any panel-specific things
// that the AnnotationRepository must be free from. It is created on-demand the first time a panel, that wants to show
// an Annotation, appears.
//
// NOTE: For now this class is not for general use and is inactive (unless a specific flag is supplied).
export class AnnotationManager {
    static #instance = null;
    #annotationPlacements = null;
    #annotations = new Map();
    #synced = false;
    constructor() {
        if (!Annotations.AnnotationRepository.annotationsEnabled()) {
            console.warn('AnnotationManager created with annotations disabled');
            return;
        }
        Annotations.AnnotationRepository.instance().addEventListener("AnnotationAdded" /* Annotations.Events.ANNOTATION_ADDED */, this.#onAnnotationAdded, this);
    }
    static instance() {
        if (!AnnotationManager.#instance) {
            AnnotationManager.#instance = new AnnotationManager();
        }
        return AnnotationManager.#instance;
    }
    initializePlacementForAnnotationType(type, resolveRelativePosition, parentElement, insertBefore = null) {
        if (!Annotations.AnnotationRepository.annotationsEnabled()) {
            return;
        }
        if (!this.#annotationPlacements) {
            this.#annotationPlacements = new Map();
        }
        this.#annotationPlacements.set(type, { parentElement, insertBefore, resolveRelativePosition });
        // eslint-disable-next-line no-console
        console.log(`[AnnotationManager] initializing placement for ${Annotations.AnnotationType[type]}`, { parentElement }, 'placement count:', this.#annotationPlacements);
        this.#syncAnnotations();
    }
    #syncAnnotations() {
        if (this.#synced) {
            return;
        }
        // eslint-disable-next-line no-console
        console.log('[AnnotationManager] **** SYNC STARTED ***');
        const repository = Annotations.AnnotationRepository.instance();
        for (const type of Object.values(Annotations.AnnotationType)) {
            for (const annotation of repository.getAnnotationDataByType(type)) {
                // eslint-disable-next-line no-console
                console.log('[AnnotationManager] Available annotation:', annotation, 'need sync:', !this.#annotations.has(annotation.id));
                if (!this.#annotations.has(annotation.id)) {
                    this.#addAnnotation(annotation);
                }
            }
        }
        this.#synced = true;
    }
    #onAnnotationAdded(event) {
        const annotationData = event.data;
        // eslint-disable-next-line no-console
        console.log('[AnnotationManager] handleAddAnnotation', annotationData);
        this.#addAnnotation(annotationData);
    }
    #addAnnotation(annotationData) {
        const annotation = new Annotation(annotationData.message, annotationData.type);
        this.#annotations.set(annotationData.id, { type: annotationData.type, annotation });
        // eslint-disable-next-line no-console
        console.log('[AnnotationManager] addAnnotation called. Annotations now', this.#annotations);
        requestAnimationFrame(async () => {
            await this.#resolveAnnotationWithId(annotationData.id);
        });
    }
    async #resolveAnnotationWithId(id) {
        const annotation = this.#annotations.get(id);
        if (!annotation) {
            console.warn('Unable to find annotation with id', id, ' in annotations map', this.#annotations);
            return;
        }
        const placement = this.#annotationPlacements?.get(annotation.type);
        if (!placement) {
            console.warn('Unable to find placement for annotation with id', id);
            return;
        }
        let position = undefined;
        const annotationRegistration = Annotations.AnnotationRepository.instance().getAnnotationDataById(id);
        if (annotationRegistration?.type === Annotations.AnnotationType.ELEMENT_NODE) {
            const elementData = annotationRegistration;
            position = await placement.resolveRelativePosition(placement.parentElement, /* revealNode */ true, elementData.lookupId, elementData.anchor);
        }
        else {
            console.warn('[AnnotationManager] Unknown AnnotationType', annotationRegistration?.type);
        }
        if (!position) {
            // eslint-disable-next-line no-console
            console.log(`Unable to calculate position for annotation with id ${annotationRegistration?.id}`);
            return;
        }
        // eslint-disable-next-line no-console
        console.log(`Annotation placed at relative positions ${position.x}, ${position.y}` +
            `${annotation.annotation.isShowing() ? ' (already showing)' : ' (and showing)'}`);
        annotation.annotation.setCoordinates(position.x, position.y);
        if (!annotation.annotation.isShowing()) {
            // eslint-disable-next-line no-console
            console.log('Annotation was not showing, showing now');
            annotation.annotation.show(placement.parentElement, placement.insertBefore);
        }
    }
}
//# sourceMappingURL=AnnotationManager.js.map