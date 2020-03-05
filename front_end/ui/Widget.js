/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import {Constraints, Size} from './Geometry.js';
import {appendStyle} from './utils/append-style.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';
import {XWidget} from './XWidget.js';

/**
 * @unrestricted
 */
export class Widget extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {boolean=} isWebComponent
   * @param {boolean=} delegatesFocus
   */
  constructor(isWebComponent, delegatesFocus) {
    super();
    this.contentElement = createElementWithClass('div', 'widget');
    if (isWebComponent) {
      this.element = createElementWithClass('div', 'vbox flex-auto');
      this._shadowRoot = createShadowRootWithCoreStyles(this.element, undefined, delegatesFocus);
      this._shadowRoot.appendChild(this.contentElement);
    } else {
      this.element = this.contentElement;
    }
    this._isWebComponent = isWebComponent;
    this.element.__widget = this;
    this._visible = false;
    this._isRoot = false;
    this._isShowing = false;
    this._children = [];
    this._hideOnDetach = false;
    this._notificationDepth = 0;
    this._invalidationsSuspended = 0;
    this._defaultFocusedChild = null;
  }

  static _incrementWidgetCounter(parentElement, childElement) {
    const count = (childElement.__widgetCounter || 0) + (childElement.__widget ? 1 : 0);
    if (!count) {
      return;
    }

    while (parentElement) {
      parentElement.__widgetCounter = (parentElement.__widgetCounter || 0) + count;
      parentElement = parentElement.parentElementOrShadowHost();
    }
  }

  static _decrementWidgetCounter(parentElement, childElement) {
    const count = (childElement.__widgetCounter || 0) + (childElement.__widget ? 1 : 0);
    if (!count) {
      return;
    }

    while (parentElement) {
      parentElement.__widgetCounter -= count;
      parentElement = parentElement.parentElementOrShadowHost();
    }
  }

  static __assert(condition, message) {
    if (!condition) {
      /**************** POWWOW REMOVED ****************/
      // throw new Error(message);
      /**************** POWWOW REMOVED ****************/
      /**************** POWWOW ADDED ****************/
      console.error(message);
      /**************** POWWOW ADDED ****************/
    }
  }

  /**
   * @param {?Node} node
   */
  static focusWidgetForNode(node) {
    while (node) {
      if (node.__widget) {
        break;
      }
      node = node.parentNodeOrShadowHost();
    }
    if (!node) {
      return;
    }

    let widget = node.__widget;
    while (widget._parentWidget) {
      widget._parentWidget._defaultFocusedChild = widget;
      widget = widget._parentWidget;
    }
  }

  markAsRoot() {
    Widget.__assert(!this.element.parentElement, 'Attempt to mark as root attached node');
    this._isRoot = true;
  }

  /**
   * @return {?Widget}
   */
  parentWidget() {
    return this._parentWidget;
  }

  /**
   * @return {!Array.<!Widget>}
   */
  children() {
    return this._children;
  }

  /**
   * @param {!Widget} widget
   * @protected
   */
  childWasDetached(widget) {
  }

  /**
   * @return {boolean}
   */
  isShowing() {
    return this._isShowing;
  }

  /**
   * @return {boolean}
   */
  shouldHideOnDetach() {
    if (!this.element.parentElement) {
      return false;
    }
    if (this._hideOnDetach) {
      return true;
    }
    for (const child of this._children) {
      if (child.shouldHideOnDetach()) {
        return true;
      }
    }
    return false;
  }

  setHideOnDetach() {
    this._hideOnDetach = true;
  }

  /**
   * @return {boolean}
   */
  _inNotification() {
    return !!this._notificationDepth || (this._parentWidget && this._parentWidget._inNotification());
  }

  _parentIsShowing() {
    if (this._isRoot) {
      return true;
    }
    return !!this._parentWidget && this._parentWidget.isShowing();
  }

  /**
   * @param {function(this:Widget)} method
   */
  _callOnVisibleChildren(method) {
    const copy = this._children.slice();
    for (let i = 0; i < copy.length; ++i) {
      if (copy[i]._parentWidget === this && copy[i]._visible) {
        method.call(copy[i]);
      }
    }
  }

  _processWillShow() {
    this._callOnVisibleChildren(this._processWillShow);
    this._isShowing = true;
  }

  _processWasShown() {
    if (this._inNotification()) {
      return;
    }
    this.restoreScrollPositions();
    this._notify(this.wasShown);
    this._callOnVisibleChildren(this._processWasShown);
  }

  _processWillHide() {
    if (this._inNotification()) {
      return;
    }
    this.storeScrollPositions();

    this._callOnVisibleChildren(this._processWillHide);
    this._notify(this.willHide);
    this._isShowing = false;
  }

  _processWasHidden() {
    this._callOnVisibleChildren(this._processWasHidden);
  }

  _processOnResize() {
    if (this._inNotification()) {
      return;
    }
    if (!this.isShowing()) {
      return;
    }
    this._notify(this.onResize);
    this._callOnVisibleChildren(this._processOnResize);
  }

  /**
   * @param {function(this:Widget)} notification
   */
  _notify(notification) {
    ++this._notificationDepth;
    try {
      notification.call(this);
    } finally {
      --this._notificationDepth;
    }
  }

  wasShown() {
  }

  willHide() {
  }

  onResize() {
  }

  onLayout() {
  }

  ownerViewDisposed() {
  }

  /**
   * @param {!Element} parentElement
   * @param {?Node=} insertBefore
   */
  show(parentElement, insertBefore) {
    Widget.__assert(parentElement, 'Attempt to attach widget with no parent element');

    if (!this._isRoot) {
      // Update widget hierarchy.
      let currentParent = parentElement;
      while (currentParent && !currentParent.__widget) {
        currentParent = currentParent.parentElementOrShadowHost();
      }
      Widget.__assert(currentParent, 'Attempt to attach widget to orphan node');
      this._attach(currentParent.__widget);
    }

    this._showWidget(parentElement, insertBefore);
  }

  /**
   * @param {!Widget} parentWidget
   */
  _attach(parentWidget) {
    if (parentWidget === this._parentWidget) {
      return;
    }
    if (this._parentWidget) {
      this.detach();
    }
    this._parentWidget = parentWidget;
    this._parentWidget._children.push(this);
    this._isRoot = false;
  }

  showWidget() {
    if (this._visible) {
      return;
    }
    Widget.__assert(this.element.parentElement, 'Attempt to show widget that is not hidden using hideWidget().');
    this._showWidget(/** @type {!Element} */ (this.element.parentElement), this.element.nextSibling);
  }

  /**
   * @param {!Element} parentElement
   * @param {?Node=} insertBefore
   */
  _showWidget(parentElement, insertBefore) {
    let currentParent = parentElement;
    while (currentParent && !currentParent.__widget) {
      currentParent = currentParent.parentElementOrShadowHost();
    }

    if (this._isRoot) {
      Widget.__assert(!currentParent, 'Attempt to show root widget under another widget');
    } else {
      Widget.__assert(
          currentParent && currentParent.__widget === this._parentWidget,
          'Attempt to show under node belonging to alien widget');
    }

    const wasVisible = this._visible;
    if (wasVisible && this.element.parentElement === parentElement) {
      return;
    }

    this._visible = true;

    if (!wasVisible && this._parentIsShowing()) {
      this._processWillShow();
    }

    this.element.classList.remove('hidden');

    // Reparent
    if (this.element.parentElement !== parentElement) {
      if (!this._externallyManaged) {
        Widget._incrementWidgetCounter(parentElement, this.element);
      }
      if (insertBefore) {
        Widget._originalInsertBefore.call(parentElement, this.element, insertBefore);
      } else {
        Widget._originalAppendChild.call(parentElement, this.element);
      }
    }

    if (!wasVisible && this._parentIsShowing()) {
      this._processWasShown();
    }

    if (this._parentWidget && this._hasNonZeroConstraints()) {
      this._parentWidget.invalidateConstraints();
    } else {
      this._processOnResize();
    }
  }

  hideWidget() {
    if (!this._visible) {
      return;
    }
    this._hideWidget(false);
  }

  /**
   * @param {boolean} removeFromDOM
   */
  _hideWidget(removeFromDOM) {
    this._visible = false;
    const parentElement = this.element.parentElement;

    if (this._parentIsShowing()) {
      this._processWillHide();
    }

    if (removeFromDOM) {
      // Force legal removal
      Widget._decrementWidgetCounter(parentElement, this.element);
      Widget._originalRemoveChild.call(parentElement, this.element);
    } else {
      this.element.classList.add('hidden');
    }

    if (this._parentIsShowing()) {
      this._processWasHidden();
    }
    if (this._parentWidget && this._hasNonZeroConstraints()) {
      this._parentWidget.invalidateConstraints();
    }
  }

  /**
   * @param {boolean=} overrideHideOnDetach
   */
  detach(overrideHideOnDetach) {
    if (!this._parentWidget && !this._isRoot) {
      return;
    }

    // hideOnDetach means that we should never remove element from dom - content
    // has iframes and detaching it will hurt.
    //
    // overrideHideOnDetach will override hideOnDetach and the client takes
    // responsibility for the consequences.
    const removeFromDOM = overrideHideOnDetach || !this.shouldHideOnDetach();
    if (this._visible) {
      this._hideWidget(removeFromDOM);
    } else if (removeFromDOM && this.element.parentElement) {
      const parentElement = this.element.parentElement;
      // Force kick out from DOM.
      Widget._decrementWidgetCounter(parentElement, this.element);
      Widget._originalRemoveChild.call(parentElement, this.element);
    }

    // Update widget hierarchy.
    if (this._parentWidget) {
      const childIndex = this._parentWidget._children.indexOf(this);
      Widget.__assert(childIndex >= 0, 'Attempt to remove non-child widget');
      this._parentWidget._children.splice(childIndex, 1);
      if (this._parentWidget._defaultFocusedChild === this) {
        this._parentWidget._defaultFocusedChild = null;
      }
      this._parentWidget.childWasDetached(this);
      this._parentWidget = null;
    } else {
      Widget.__assert(this._isRoot, 'Removing non-root widget from DOM');
    }
  }

  detachChildWidgets() {
    const children = this._children.slice();
    for (let i = 0; i < children.length; ++i) {
      children[i].detach();
    }
  }

  /**
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [this.element];
  }

  storeScrollPositions() {
    const elements = this.elementsToRestoreScrollPositionsFor();
    for (let i = 0; i < elements.length; ++i) {
      const container = elements[i];
      container._scrollTop = container.scrollTop;
      container._scrollLeft = container.scrollLeft;
    }
  }

  restoreScrollPositions() {
    const elements = this.elementsToRestoreScrollPositionsFor();
    for (let i = 0; i < elements.length; ++i) {
      const container = elements[i];
      if (container._scrollTop) {
        container.scrollTop = container._scrollTop;
      }
      if (container._scrollLeft) {
        container.scrollLeft = container._scrollLeft;
      }
    }
  }

  doResize() {
    if (!this.isShowing()) {
      return;
    }
    // No matter what notification we are in, dispatching onResize is not needed.
    if (!this._inNotification()) {
      this._callOnVisibleChildren(this._processOnResize);
    }
  }

  doLayout() {
    if (!this.isShowing()) {
      return;
    }
    this._notify(this.onLayout);
    this.doResize();
  }

  /**
   * @param {string} cssFile
   */
  registerRequiredCSS(cssFile) {
    appendStyle(this._isWebComponent ? this._shadowRoot : this.element, cssFile);
  }

  printWidgetHierarchy() {
    const lines = [];
    this._collectWidgetHierarchy('', lines);
    console.log(lines.join('\n'));  // eslint-disable-line no-console
  }

  _collectWidgetHierarchy(prefix, lines) {
    lines.push(prefix + '[' + this.element.className + ']' + (this._children.length ? ' {' : ''));

    for (let i = 0; i < this._children.length; ++i) {
      this._children[i]._collectWidgetHierarchy(prefix + '    ', lines);
    }

    if (this._children.length) {
      lines.push(prefix + '}');
    }
  }

  /**
   * @param {?Element} element
   */
  setDefaultFocusedElement(element) {
    this._defaultFocusedElement = element;
  }

  /**
   * @param {!Widget} child
   */
  setDefaultFocusedChild(child) {
    Widget.__assert(child._parentWidget === this, 'Attempt to set non-child widget as default focused.');
    this._defaultFocusedChild = child;
  }

  focus() {
    if (!this.isShowing()) {
      return;
    }

    const element = this._defaultFocusedElement;
    if (element) {
      if (!element.hasFocus()) {
        element.focus();
      }
      return;
    }

    if (this._defaultFocusedChild && this._defaultFocusedChild._visible) {
      this._defaultFocusedChild.focus();
    } else {
      for (const child of this._children) {
        if (child._visible) {
          child.focus();
          return;
        }
      }
      let child = this.contentElement.traverseNextNode(this.contentElement);
      while (child) {
        if (child instanceof XWidget) {
          child.focus();
          return;
        }
        child = child.traverseNextNode(this.contentElement);
      }
    }
  }

  /**
   * @return {boolean}
   */
  hasFocus() {
    return this.element.hasFocus();
  }

  /**
   * @return {!Constraints}
   */
  calculateConstraints() {
    return new Constraints();
  }

  /**
   * @return {!Constraints}
   */
  constraints() {
    if (typeof this._constraints !== 'undefined') {
      return this._constraints;
    }
    if (typeof this._cachedConstraints === 'undefined') {
      this._cachedConstraints = this.calculateConstraints();
    }
    return this._cachedConstraints;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @param {number} preferredWidth
   * @param {number} preferredHeight
   */
  setMinimumAndPreferredSizes(width, height, preferredWidth, preferredHeight) {
    this._constraints = new Constraints(new Size(width, height), new Size(preferredWidth, preferredHeight));
    this.invalidateConstraints();
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  setMinimumSize(width, height) {
    this._constraints = new Constraints(new Size(width, height));
    this.invalidateConstraints();
  }

  /**
   * @return {boolean}
   */
  _hasNonZeroConstraints() {
    const constraints = this.constraints();
    return !!(
        constraints.minimum.width || constraints.minimum.height || constraints.preferred.width ||
        constraints.preferred.height);
  }

  suspendInvalidations() {
    ++this._invalidationsSuspended;
  }

  resumeInvalidations() {
    --this._invalidationsSuspended;
    if (!this._invalidationsSuspended && this._invalidationsRequested) {
      this.invalidateConstraints();
    }
  }

  invalidateConstraints() {
    if (this._invalidationsSuspended) {
      this._invalidationsRequested = true;
      return;
    }
    this._invalidationsRequested = false;
    const cached = this._cachedConstraints;
    delete this._cachedConstraints;
    const actual = this.constraints();
    if (!actual.isEqual(cached) && this._parentWidget) {
      this._parentWidget.invalidateConstraints();
    } else {
      this.doLayout();
    }
  }

  // Excludes the widget from being tracked by its parents/ancestors via
  // __widgetCounter because the widget is being handled by external code.
  // Widgets marked as being externally managed are responsible for
  // finishing out their own lifecycle (i.e. calling detach() before being
  // removed from the DOM). This is e.g. used for CodeMirror.
  //
  // Also note that this must be called before the widget is shown so that
  // so that its ancestor's __widgetCounter is not incremented.
  markAsExternallyManaged() {
    Widget.__assert(!this._parentWidget, 'Attempt to mark widget as externally managed after insertion to the DOM');
    this._externallyManaged = true;
  }
}

export const _originalAppendChild = Element.prototype.appendChild;
export const _originalInsertBefore = Element.prototype.insertBefore;
export const _originalRemoveChild = Element.prototype.removeChild;
export const _originalRemoveChildren = Element.prototype.removeChildren;


/**
 * @unrestricted
 */
export class VBox extends Widget {
  /**
   * @param {boolean=} isWebComponent
   * @param {boolean=} delegatesFocus
   */
  constructor(isWebComponent, delegatesFocus) {
    super(isWebComponent, delegatesFocus);
    this.contentElement.classList.add('vbox');
  }

  /**
   * @override
   * @return {!Constraints}
   */
  calculateConstraints() {
    let constraints = new Constraints();

    /**
     * @this {!Widget}
     * @suppressReceiverCheck
     */
    function updateForChild() {
      const child = this.constraints();
      constraints = constraints.widthToMax(child);
      constraints = constraints.addHeight(child);
    }

    this._callOnVisibleChildren(updateForChild);
    return constraints;
  }
}

/**
 * @unrestricted
 */
export class HBox extends Widget {
  /**
   * @param {boolean=} isWebComponent
   */
  constructor(isWebComponent) {
    super(isWebComponent);
    this.contentElement.classList.add('hbox');
  }

  /**
   * @override
   * @return {!Constraints}
   */
  calculateConstraints() {
    let constraints = new Constraints();

    /**
     * @this {!Widget}
     * @suppressReceiverCheck
     */
    function updateForChild() {
      const child = this.constraints();
      constraints = constraints.addWidth(child);
      constraints = constraints.heightToMax(child);
    }

    this._callOnVisibleChildren(updateForChild);
    return constraints;
  }
}

/**
 * @unrestricted
 */
export class VBoxWithResizeCallback extends VBox {
  /**
   * @param {function()} resizeCallback
   */
  constructor(resizeCallback) {
    super();
    this._resizeCallback = resizeCallback;
  }

  /**
   * @override
   */
  onResize() {
    this._resizeCallback();
  }
}

/**
 * @unrestricted
 */
export class WidgetFocusRestorer {
  /**
   * @param {!Widget} widget
   */
  constructor(widget) {
    this._widget = widget;
    this._previous = widget.element.ownerDocument.deepActiveElement();
    widget.focus();
  }

  restore() {
    if (!this._widget) {
      return;
    }
    if (this._widget.hasFocus() && this._previous) {
      this._previous.focus();
    }
    this._previous = null;
    this._widget = null;
  }
}

/**
 * @override
 * @param {?Node} child
 * @return {!Node}
 * @suppress {duplicate}
 */
Element.prototype.appendChild = function(child) {
  Widget.__assert(!child.__widget || child.parentElement === this, 'Attempt to add widget via regular DOM operation.');
  return Widget._originalAppendChild.call(this, child);
};

/**
 * @override
 * @param {?Node} child
 * @param {?Node} anchor
 * @return {!Node}
 * @suppress {duplicate}
 */
Element.prototype.insertBefore = function(child, anchor) {
  Widget.__assert(!child.__widget || child.parentElement === this, 'Attempt to add widget via regular DOM operation.');
  return Widget._originalInsertBefore.call(this, child, anchor);
};

/**
 * @override
 * @param {?Node} child
 * @return {!Node}
 * @suppress {duplicate}
 */
Element.prototype.removeChild = function(child) {
  Widget.__assert(
      !child.__widgetCounter && !child.__widget,
      'Attempt to remove element containing widget via regular DOM operation');
  return Widget._originalRemoveChild.call(this, child);
};

Element.prototype.removeChildren = function() {
  Widget.__assert(!this.__widgetCounter, 'Attempt to remove element containing widget via regular DOM operation');
  Widget._originalRemoveChildren.call(this);
};

Widget._originalAppendChild = _originalAppendChild;
Widget._originalInsertBefore = _originalInsertBefore;
Widget._originalRemoveChild = _originalRemoveChild;
Widget._originalRemoveChildren = _originalRemoveChildren;
