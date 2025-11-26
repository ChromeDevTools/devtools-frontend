// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Annotations from '../../ui/components/annotations/annotations.js';

interface AnnotationPlacement {
  parentElement: Element;
  insertBefore?: Node|null;
  resolveRelativePosition:
      (parentElement: Element, revealNode: boolean, lookupId: string,
       node?: SDK.DOMModel.DOMNode) => Promise<{x: number, y: number}|null>;
}

// This class handles general management of Annotations, the data needed to display them and any panel-specific things
// that the AnnotationRepository must be free from. It is created on-demand the first time a panel, that wants to show
// an Annotation, appears.
//
// NOTE: For now this class is not for general use and is inactive (unless a specific flag is supplied).
export class AnnotationManager {
  static #instance: AnnotationManager|null = null;

  #annotationPlacements: Map<Annotations.AnnotationType, AnnotationPlacement>|null = null;

  constructor() {
    if (!Annotations.AnnotationRepository.annotationsEnabled()) {
      console.warn('AnnotationManager created with annotations disabled');
      return;
    }

    Annotations.AnnotationRepository.instance().addEventListener(
        Annotations.Events.ANNOTATION_ADDED, this.#onAnnotationAdded, this);
  }

  static instance(): AnnotationManager {
    if (!AnnotationManager.#instance) {
      AnnotationManager.#instance = new AnnotationManager();
    }
    return AnnotationManager.#instance;
  }

  initializePlacementForAnnotationType(
      type: Annotations.AnnotationType,
      resolveRelativePosition:
          (parentElement: Element, revealNode: boolean, lookupId: string,
           node?: SDK.DOMModel.DOMNode) => Promise<{x: number, y: number}|null>,
      parentElement: Element, insertBefore: Node|null = null): void {
    if (!Annotations.AnnotationRepository.annotationsEnabled()) {
      return;
    }

    if (!this.#annotationPlacements) {
      this.#annotationPlacements = new Map();
    }
    this.#annotationPlacements.set(type, {parentElement, insertBefore, resolveRelativePosition});

    // eslint-disable-next-line no-console
    console.log(
        `[AnnotationManager] initializing placement for ${Annotations.AnnotationType[type]}`, {parentElement},
        'placement count:', this.#annotationPlacements);
  }

  async #onAnnotationAdded(
      event: Common.EventTarget.EventTargetEvent<Annotations.EventTypes[Annotations.Events.ANNOTATION_ADDED]>):
      Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[AnnotationManager] received event onAnnotationAdded', event);
  }
}
