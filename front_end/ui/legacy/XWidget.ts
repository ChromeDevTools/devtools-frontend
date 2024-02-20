// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {XElement} from './XElement.js';

let observer: ResizeObserver|null = null;

const storedScrollPositions = new WeakMap<Element, {
  scrollLeft: number,
  scrollTop: number,
}>();

export class XWidget extends XElement {
  private visible: boolean;
  private readonly shadowRootInternal!: DocumentFragment|null;
  private defaultFocusedElement: Element|null;
  private elementsToRestoreScrollPositionsFor: Element[];
  private onShownCallback!: (() => void)|null;
  private onHiddenCallback!: (() => void)|null;
  private onResizedCallback!: (() => void)|null;

  constructor() {
    super();
    this.style.setProperty('display', 'flex');
    this.style.setProperty('flex-direction', 'column');
    this.style.setProperty('align-items', 'stretch');
    this.style.setProperty('justify-content', 'flex-start');
    this.style.setProperty('contain', 'layout style');

    this.visible = false;
    this.defaultFocusedElement = null;
    this.elementsToRestoreScrollPositionsFor = [];

    if (!observer) {
      observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const widget = (entry.target as XWidget);
          if (widget.visible && widget.onResizedCallback) {
            widget.onResizedCallback.call(null);
          }
        }
      });
    }

    observer.observe(this);

    this.setElementsToRestoreScrollPositionsFor([this]);
  }

  isShowing(): boolean {
    return this.visible;
  }

  setOnShown(callback: (() => void)|null): void {
    this.onShownCallback = callback;
  }

  setOnHidden(callback: (() => void)|null): void {
    this.onHiddenCallback = callback;
  }

  setOnResized(callback: (() => void)|null): void {
    this.onResizedCallback = callback;
  }

  setElementsToRestoreScrollPositionsFor(elements: Element[]): void {
    for (const element of this.elementsToRestoreScrollPositionsFor) {
      element.removeEventListener('scroll', XWidget.storeScrollPosition, {capture: false});
    }
    this.elementsToRestoreScrollPositionsFor = elements;
    for (const element of this.elementsToRestoreScrollPositionsFor) {
      element.addEventListener('scroll', XWidget.storeScrollPosition, {passive: true, capture: false});
    }
  }

  restoreScrollPositions(): void {
    for (const element of this.elementsToRestoreScrollPositionsFor) {
      const storedPositions = storedScrollPositions.get(element);
      if (storedPositions) {
        element.scrollTop = storedPositions.scrollTop;
        element.scrollLeft = storedPositions.scrollLeft;
      }
    }
  }

  private static storeScrollPosition(event: Event): void {
    const element = (event.currentTarget as Element);
    storedScrollPositions.set(element, {scrollLeft: element.scrollLeft, scrollTop: element.scrollTop});
  }

  setDefaultFocusedElement(element: Element|null): void {
    if (element && !this.isSelfOrAncestor(element)) {
      throw new Error('Default focus must be descendant');
    }
    this.defaultFocusedElement = element;
  }

  override focus(): void {
    if (!this.visible) {
      return;
    }

    let element;
    if (this.defaultFocusedElement && this.isSelfOrAncestor(this.defaultFocusedElement)) {
      element = this.defaultFocusedElement;
    } else if (this.tabIndex !== -1) {
      element = this;
    } else {
      let child = this.traverseNextNode(this);
      while (child) {
        if ((child instanceof XWidget) && child.visible) {
          element = child;
          break;
        }
        child = child.traverseNextNode(this);
      }
    }

    if (!element || element.hasFocus()) {
      return;
    }
    if (element === this) {
      HTMLElement.prototype.focus.call(this);
    } else {
      (element as HTMLElement).focus();
    }
  }

  connectedCallback(): void {
    this.visible = true;
    this.restoreScrollPositions();
    if (this.onShownCallback) {
      this.onShownCallback.call(null);
    }
  }

  disconnectedCallback(): void {
    this.visible = false;
    if (this.onHiddenCallback) {
      this.onHiddenCallback.call(null);
    }
  }
}

customElements.define('x-widget', XWidget);
