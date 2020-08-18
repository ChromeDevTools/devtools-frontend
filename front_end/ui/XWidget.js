// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {appendStyle} from './utils/append-style.js';
import {XElement} from './XElement.js';

/** @type {?ResizeObserver} */
let _observer = null;

/** @type {!WeakMap<!Element, !{scrollLeft: number, scrollTop: number}>} */
const _storedScrollPositions = new WeakMap();

/**
 * @extends {XElement}
 */
export class XWidget extends XElement {
  constructor() {
    super();
    this.style.setProperty('display', 'flex');
    this.style.setProperty('flex-direction', 'column');
    this.style.setProperty('align-items', 'stretch');
    this.style.setProperty('justify-content', 'flex-start');
    this.style.setProperty('contain', 'layout style');

    this._visible = false;
    /** @type {?DocumentFragment} */
    this._shadowRoot;
    /** @type {?Element} */
    this._defaultFocusedElement = null;
    /** @type {!Array<!Element>} */
    this._elementsToRestoreScrollPositionsFor = [];
    /** @type {?function():void} */
    this._onShownCallback;
    /** @type {?function():void} */
    this._onHiddenCallback;
    /** @type {?function():void} */
    this._onResizedCallback;

    if (!_observer) {
      _observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const widget = /** @type {!XWidget} */ (entry.target);
          if (widget._visible && widget._onResizedCallback) {
            widget._onResizedCallback.call(null);
          }
        }
      });
    }
    // TODO(crbug.com/1011811): Remove if. Closure doesn't know about the 'observe property'.
    //   Wrapping the call in an if fixes the Closure error.
    if (_observer.observe) {
      _observer.observe(this);
    }

    this.setElementsToRestoreScrollPositionsFor([this]);
  }

  /**
   * @return {boolean}
   */
  isShowing() {
    return this._visible;
  }

  /**
   * @param {string} cssFile
   */
  registerRequiredCSS(cssFile) {
    appendStyle(this._shadowRoot || this, cssFile);
  }

  /**
   * @param {?function():void} callback
   */
  setOnShown(callback) {
    this._onShownCallback = callback;
  }

  /**
   * @param {?function():void} callback
   */
  setOnHidden(callback) {
    this._onHiddenCallback = callback;
  }

  /**
   * @param {?function():void} callback
   */
  setOnResized(callback) {
    this._onResizedCallback = callback;
  }

  /**
   * @param {!Array<!Element>} elements
   */
  setElementsToRestoreScrollPositionsFor(elements) {
    for (const element of this._elementsToRestoreScrollPositionsFor) {
      element.removeEventListener('scroll', XWidget._storeScrollPosition, {capture: false});
    }
    this._elementsToRestoreScrollPositionsFor = elements;
    for (const element of this._elementsToRestoreScrollPositionsFor) {
      element.addEventListener('scroll', XWidget._storeScrollPosition, {passive: true, capture: false});
    }
  }

  restoreScrollPositions() {
    for (const element of this._elementsToRestoreScrollPositionsFor) {
      const storedPositions = _storedScrollPositions.get(element);
      if (storedPositions) {
        element.scrollTop = storedPositions.scrollTop;
        element.scrollLeft = storedPositions.scrollLeft;
      }
    }
  }

  /**
   * @param {!Event} event
   */
  static _storeScrollPosition(event) {
    const element = /** @type {!Element} */ (event.currentTarget);
    _storedScrollPositions.set(element, {scrollLeft: element.scrollLeft, scrollTop: element.scrollTop});
  }

  /**
   * @param {?Element} element
   */
  setDefaultFocusedElement(element) {
    if (element && !this.isSelfOrAncestor(element)) {
      throw new Error('Default focus must be descendant');
    }
    this._defaultFocusedElement = element;
  }

  /**
   * @override
   */
  focus() {
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
      /** @type {!HTMLElement} */ (element).focus();
    }
  }

  /**
   * @override
   */
  connectedCallback() {
    this._visible = true;
    this.restoreScrollPositions();
    if (this._onShownCallback) {
      this._onShownCallback.call(null);
    }
  }

  /**
   * @override
   */
  disconnectedCallback() {
    this._visible = false;
    if (this._onHiddenCallback) {
      this._onHiddenCallback.call(null);
    }
  }
}

self.customElements.define('x-widget', XWidget);
