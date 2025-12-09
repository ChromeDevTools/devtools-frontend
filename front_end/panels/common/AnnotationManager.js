// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Annotations from '../../models/annotations/annotations.js';
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
        Annotations.AnnotationRepository.instance().addEventListener("AnnotationDeleted" /* Annotations.Events.ANNOTATION_DELETED */, this.#onAnnotationDeleted, this);
        Annotations.AnnotationRepository.instance().addEventListener("AllAnnotationsDeleted" /* Annotations.Events.ALL_ANNOTATIONS_DELETED */, this.#onAllAnnotationsDeleted, this);
    }
    static instance() {
        if (!AnnotationManager.#instance) {
            AnnotationManager.#instance = new AnnotationManager();
        }
        return AnnotationManager.#instance;
    }
    initializePlacementForAnnotationType(type, resolveInitialState, parentElement, insertBefore = null) {
        if (!Annotations.AnnotationRepository.annotationsEnabled()) {
            return;
        }
        if (!this.#annotationPlacements) {
            this.#annotationPlacements = new Map();
        }
        this.#annotationPlacements.set(type, { parentElement, insertBefore, resolveInitialState });
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
    #onAllAnnotationsDeleted() {
        for (const annotation of this.#annotations.values()) {
            annotation.annotation.hide();
        }
        this.#annotations = new Map();
        // eslint-disable-next-line no-console
        console.log('[AnnotationManager] deleted all annotations');
    }
    #onAnnotationDeleted(event) {
        const { id } = event.data;
        const annotation = this.#annotations.get(id);
        if (annotation) {
            annotation.annotation.hide();
            this.#annotations.delete(id);
        }
        // eslint-disable-next-line no-console
        console.log(`[AnnotationManager] Deleted annotation with id ${id}`);
    }
    #onAnnotationAdded(event) {
        const annotationData = event.data;
        // eslint-disable-next-line no-console
        console.log('[AnnotationManager] handleAddAnnotation', annotationData);
        this.#addAnnotation(annotationData);
    }
    #addAnnotation(annotationData) {
        const expandable = annotationData.type !== Annotations.AnnotationType.NETWORK_REQUEST;
        const showExpanded = annotationData.type !== Annotations.AnnotationType.NETWORK_REQUEST;
        const showAnchored = annotationData.type !== Annotations.AnnotationType.NETWORK_REQUEST;
        const showCloseButton = annotationData.type !== Annotations.AnnotationType.NETWORK_REQUEST;
        const annotation = new Annotation(annotationData.id, annotationData.message, showExpanded, showAnchored, expandable, showCloseButton);
        this.#annotations.set(annotationData.id, { id: annotationData.id, type: annotationData.type, annotation });
        // eslint-disable-next-line no-console
        console.log('[AnnotationManager] addAnnotation called. Annotations now', this.#annotations);
        requestAnimationFrame(async () => {
            await this.#resolveAnnotationWithId(annotationData.id);
        });
    }
    async resolveAnnotationsOfType(type) {
        for (const annotationData of this.#annotations.values()) {
            if (annotationData.type === type) {
                await this.#resolveAnnotationWithId(annotationData.id);
            }
        }
    }
    async #resolveAnnotationWithId(id) {
        const annotation = this.#annotations.get(id);
        if (!annotation) {
            console.warn('Unable to find annotation with id', id, ' in annotations map', this.#annotations);
            return;
        }
        const placement = this.#annotationPlacements?.get(annotation.type);
        if (!placement) {
            console.warn('Unable to find placement for annotation with id', id, '(note: this is expected if its panel hasn\'t been shown yet).');
            return;
        }
        let position = undefined;
        const annotationRegistration = Annotations.AnnotationRepository.instance().getAnnotationDataById(id);
        const reveal = !annotation.annotation.hasShown();
        switch (annotationRegistration?.type) {
            case Annotations.AnnotationType.ELEMENT_NODE: {
                const elementData = annotationRegistration;
                position = await placement.resolveInitialState(placement.parentElement, reveal, elementData.lookupId, elementData.anchor);
                break;
            }
            case Annotations.AnnotationType.NETWORK_REQUEST: {
                const networkRequestData = annotationRegistration;
                position = await placement.resolveInitialState(placement.parentElement, reveal, networkRequestData.lookupId, networkRequestData.anchor);
                break;
            }
            case Annotations.AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS: {
                const networkRequestDetailsData = annotationRegistration;
                position = await placement.resolveInitialState(placement.parentElement, reveal, networkRequestDetailsData.lookupId, networkRequestDetailsData.anchor);
                break;
            }
            default:
                console.warn('[AnnotationManager] Unknown AnnotationType', annotationRegistration?.type);
        }
        if (!position) {
            // eslint-disable-next-line no-console
            console.log(`Unable to calculate position for annotation with id ${annotationRegistration?.id}`);
            return;
        }
        annotation.annotation.setCoordinates(position.x, position.y);
        if (!annotation.annotation.isShowing()) {
            annotation.annotation.show(placement.parentElement, placement.insertBefore);
        }
    }
}
//# sourceMappingURL=AnnotationManager.js.map