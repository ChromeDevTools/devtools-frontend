// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as ComponentHelpers from '../components/helpers/helpers.js';
import {appendStyle} from './utils/append-style.js';
import {XElement} from './XElement.js';

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _observer: ResizeObserver|null = null;

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _storedScrollPositions = new WeakMap<Element, {
  scrollLeft: number,
  scrollTop: number,
}>();

export class XWidget extends XElement {
  _visible: boolean;
  _shadowRoot!: DocumentFragment|null;
  _defaultFocusedElement: Element|null;
  _elementsToRestoreScrollPositionsFor: Element[];
  _onShownCallback!: (() => void)|null;
  _onHiddenCallback!: (() => void)|null;
  _onResizedCallback!: (() => void)|null;

  constructor() {
    super();
    this.style.setProperty('display', 'flex');
    this.style.setProperty('flex-direction', 'column');
    this.style.setProperty('align-items', 'stretch');
    this.style.setProperty('justify-content', 'flex-start');
    this.style.setProperty('contain', 'layout style');

    this._visible = false;
    this._defaultFocusedElement = null;
    this._elementsToRestoreScrollPositionsFor = [];

    if (!_observer) {
      _observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const widget = (entry.target as XWidget);
          if (widget._visible && widget._onResizedCallback) {
            widget._onResizedCallback.call(null);
          }
        }
      });
    }

    _observer.observe(this);

    this.setElementsToRestoreScrollPositionsFor([this]);
  }

  isShowing(): boolean {
    return this._visible;
  }

  registerRequiredCSS(cssFile: string): void {
    appendStyle(this._shadowRoot || this, cssFile);
  }

  setOnShown(callback: (() => void)|null): void {
    this._onShownCallback = callback;
  }

  setOnHidden(callback: (() => void)|null): void {
    this._onHiddenCallback = callback;
  }

  setOnResized(callback: (() => void)|null): void {
    this._onResizedCallback = callback;
  }

  setElementsToRestoreScrollPositionsFor(elements: Element[]): void {
    for (const element of this._elementsToRestoreScrollPositionsFor) {
      element.removeEventListener('scroll', XWidget._storeScrollPosition, {capture: false});
    }
    this._elementsToRestoreScrollPositionsFor = elements;
    for (const element of this._elementsToRestoreScrollPositionsFor) {
      element.addEventListener('scroll', XWidget._storeScrollPosition, {passive: true, capture: false});
    }
  }

  restoreScrollPositions(): void {
    for (const element of this._elementsToRestoreScrollPositionsFor) {
      const storedPositions = _storedScrollPositions.get(element);
      if (storedPositions) {
        element.scrollTop = storedPositions.scrollTop;
        element.scrollLeft = storedPositions.scrollLeft;
      }
    }
  }

  static _storeScrollPosition(event: Event): void {
    const element = (event.currentTarget as Element);
    _storedScrollPositions.set(element, {scrollLeft: element.scrollLeft, scrollTop: element.scrollTop});
  }

  setDefaultFocusedElement(element: Element|null): void {
    if (element && !this.isSelfOrAncestor(element)) {
      throw new Error('Default focus must be descendant');
    }
    this._defaultFocusedElement = element;
  }

  focus(): void {
    if (!this._visible) {
      return;
    }

    let element;
    if (this._defaultFocusedElement && this.isSelfOrAncestor(this._defaultFocusedElement)) {
      element = this._defaultFocusedElement;
    } else if (this.tabIndex !== -1) {
      element = this;
    } else {
      let child = this.traverseNextNode(this);
      while (child) {
        if ((child instanceof XWidget) && child._visible) {
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
    this._visible = true;
    this.restoreScrollPositions();
    if (this._onShownCallback) {
      this._onShownCallback.call(null);
    }
  }

  disconnectedCallback(): void {
    this._visible = false;
    if (this._onHiddenCallback) {
      this._onHiddenCallback.call(null);
    }
  }
}

ComponentHelpers.CustomElements.defineComponent('x-widget', XWidget);
