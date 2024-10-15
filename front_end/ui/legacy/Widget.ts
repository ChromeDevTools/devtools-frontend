// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import '../../core/dom_extension/dom_extension.js';

import * as Platform from '../../core/platform/platform.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as Helpers from '../components/helpers/helpers.js';

import {Constraints, Size} from './Geometry.js';
import * as ThemeSupport from './theme_support/theme_support.js';
import {createShadowRootWithCoreStyles} from './UIUtils.js';
import {XWidget} from './XWidget.js';

// Remember the original DOM mutation methods here, since we
// will override them below to sanity check the Widget system.
const originalAppendChild = Element.prototype.appendChild;
const originalInsertBefore = Element.prototype.insertBefore;
const originalRemoveChild = Element.prototype.removeChild;
const originalRemoveChildren = Element.prototype.removeChildren;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export class WidgetElement<WidgetT extends Widget> extends HTMLElement {
  widgetClass?: new(...args: any[]) => WidgetT;
  widgetParams: unknown[] = [];

  createWidget(): WidgetT {
    if (!this.widgetClass) {
      throw new Error('No widgetClass defined');
    }

    return new this.widgetClass(...this.widgetParams, this);
  }

  connectedCallback(): void {
    Widget.getOrCreateWidget(this).show(this.parentElement as HTMLElement);
  }
}

customElements.define('devtools-widget', WidgetElement);

type Constructor<T, Args extends unknown[]> = {
  new (...args: Args): T,
};

export function widgetRef<T extends Widget, Args extends unknown[]>(
    type: Constructor<T, Args>, callback: (_: T) => void): ReturnType<typeof LitHtml.Directives.ref> {
  return LitHtml.Directives.ref((e?: Element) => {
    if (!(e instanceof HTMLElement)) {
      return;
    }
    const widget = Widget.getOrCreateWidget(e);
    if (!(widget instanceof type)) {
      throw new Error(`Expected an element with a widget of type ${type.name} but got ${e?.constructor?.name}`);
    }
    callback(widget);
  });
}

const widgetCounterMap = new WeakMap<Node, number>();
const widgetMap = new WeakMap<Node, Widget>();

function incrementWidgetCounter(parentElement: Element, childElement: Element): void {
  const count = (widgetCounterMap.get(childElement) || 0) + (widgetMap.get(childElement) ? 1 : 0);
  for (let el: Element|null = parentElement; el; el = el.parentElementOrShadowHost()) {
    widgetCounterMap.set(el, (widgetCounterMap.get(el) || 0) + count);
  }
}

function decrementWidgetCounter(parentElement: Element, childElement: Element): void {
  const count = (widgetCounterMap.get(childElement) || 0) + (widgetMap.get(childElement) ? 1 : 0);
  for (let el: Element|null = parentElement; el; el = el.parentElementOrShadowHost()) {
    const elCounter = widgetCounterMap.get(el);
    if (elCounter) {
      widgetCounterMap.set(el, elCounter - count);
    }
  }
}

export class Widget {
  readonly element: HTMLElement;
  contentElement: HTMLElement;
  private shadowRoot: ShadowRoot|undefined;
  protected visibleInternal: boolean;
  private isRoot: boolean;
  private isShowingInternal: boolean;
  private readonly childrenInternal: Widget[];
  private hideOnDetach: boolean;
  private notificationDepth: number;
  private invalidationsSuspended: number;
  defaultFocusedChild: Widget|null;
  private parentWidgetInternal: Widget|null;
  private defaultFocusedElement?: Element|null;
  private cachedConstraints?: Constraints;
  private constraintsInternal?: Constraints;
  private invalidationsRequested?: boolean;
  private externallyManaged?: boolean;
  constructor(useShadowDom?: boolean, delegatesFocus?: boolean, element?: HTMLElement) {
    this.element = element || document.createElement('div');
    this.shadowRoot = this.element.shadowRoot || undefined;
    if (useShadowDom && !this.shadowRoot) {
      this.element.classList.add('vbox');
      this.element.classList.add('flex-auto');
      this.shadowRoot = createShadowRootWithCoreStyles(this.element, {
        cssFile: undefined,
        delegatesFocus,
      });
      this.contentElement = document.createElement('div');
      this.shadowRoot.appendChild(this.contentElement);
    } else {
      this.contentElement = this.element;
    }
    this.contentElement.classList.add('widget');
    widgetMap.set(this.element, this);
    this.visibleInternal = false;
    this.isRoot = false;
    this.isShowingInternal = false;
    this.childrenInternal = [];
    this.hideOnDetach = false;
    this.notificationDepth = 0;
    this.invalidationsSuspended = 0;
    this.defaultFocusedChild = null;
    this.parentWidgetInternal = null;
  }

  /**
   * Returns the {@link Widget} whose element is the given `node`, or `undefined`
   * if the `node` is not an element for a widget.
   *
   * @param node a DOM node.
   * @returns the {@link Widget} that is attached to the `node` or `undefined`.
   */
  static get(node: Node): Widget|undefined {
    return widgetMap.get(node);
  }

  static getOrCreateWidget(element: HTMLElement): Widget {
    const widget = Widget.get(element);
    if (widget) {
      return widget;
    }
    if (element instanceof WidgetElement) {
      return element.createWidget();
    }
    return new Widget(undefined, undefined, element);
  }

  markAsRoot(): void {
    assert(!this.element.parentElement, 'Attempt to mark as root attached node');
    this.isRoot = true;
  }

  parentWidget(): Widget|null {
    return this.parentWidgetInternal;
  }

  children(): Widget[] {
    return this.childrenInternal;
  }

  childWasDetached(_widget: Widget): void {
  }

  isShowing(): boolean {
    return this.isShowingInternal;
  }

  shouldHideOnDetach(): boolean {
    if (!this.element.parentElement) {
      return false;
    }
    if (this.hideOnDetach) {
      return true;
    }
    for (const child of this.childrenInternal) {
      if (child.shouldHideOnDetach()) {
        return true;
      }
    }
    return false;
  }

  setHideOnDetach(): void {
    this.hideOnDetach = true;
  }

  private inNotification(): boolean {
    return Boolean(this.notificationDepth) ||
        Boolean(this.parentWidgetInternal && this.parentWidgetInternal.inNotification());
  }

  private parentIsShowing(): boolean {
    if (this.isRoot) {
      return true;
    }
    return this.parentWidgetInternal !== null && this.parentWidgetInternal.isShowing();
  }

  protected callOnVisibleChildren(method: (this: Widget) => void): void {
    const copy = this.childrenInternal.slice();
    for (let i = 0; i < copy.length; ++i) {
      if (copy[i].parentWidgetInternal === this && copy[i].visibleInternal) {
        method.call(copy[i]);
      }
    }
  }

  private processWillShow(): void {
    this.callOnVisibleChildren(this.processWillShow);
    this.isShowingInternal = true;
  }

  private processWasShown(): void {
    if (this.inNotification()) {
      return;
    }
    this.restoreScrollPositions();
    this.notify(this.wasShown);
    this.callOnVisibleChildren(this.processWasShown);
  }

  private processWillHide(): void {
    if (this.inNotification()) {
      return;
    }
    this.storeScrollPositions();

    this.callOnVisibleChildren(this.processWillHide);
    this.notify(this.willHide);
    this.isShowingInternal = false;
  }

  private processWasHidden(): void {
    this.callOnVisibleChildren(this.processWasHidden);
  }

  private processOnResize(): void {
    if (this.inNotification()) {
      return;
    }
    if (!this.isShowing()) {
      return;
    }
    this.notify(this.onResize);
    this.callOnVisibleChildren(this.processOnResize);
  }

  private notify(notification: (this: Widget) => void): void {
    ++this.notificationDepth;
    try {
      notification.call(this);
    } finally {
      --this.notificationDepth;
    }
  }

  wasShown(): void {
  }

  willHide(): void {
  }

  onResize(): void {
  }

  onLayout(): void {
  }

  onDetach(): void {
  }

  async ownerViewDisposed(): Promise<void> {
  }

  show(parentElement: Element, insertBefore?: Node|null): void {
    assert(parentElement, 'Attempt to attach widget with no parent element');

    if (!this.isRoot) {
      // Update widget hierarchy.
      let currentParent: Element|null = parentElement;
      let currentWidget = undefined;
      while (!currentWidget) {
        if (!currentParent) {
          throw new Error('Attempt to attach widget to orphan node');
        }
        currentWidget = widgetMap.get(currentParent);
        currentParent = currentParent.parentElementOrShadowHost();
      }
      this.attach(currentWidget);
    }
    this.showWidgetInternal(parentElement, insertBefore);
  }

  private attach(parentWidget: Widget): void {
    if (parentWidget === this.parentWidgetInternal) {
      return;
    }
    if (this.parentWidgetInternal) {
      this.detach();
    }
    this.parentWidgetInternal = parentWidget;
    this.parentWidgetInternal.childrenInternal.push(this);
    this.isRoot = false;
  }

  showWidget(): void {
    if (this.visibleInternal) {
      return;
    }
    if (!this.element.parentElement) {
      throw new Error('Attempt to show widget that is not hidden using hideWidget().');
    }
    this.showWidgetInternal(this.element.parentElement, this.element.nextSibling);
  }

  private showWidgetInternal(parentElement: Element, insertBefore?: Node|null): void {
    let currentParent: Element|null = parentElement;
    while (currentParent && !widgetMap.get(currentParent)) {
      currentParent = currentParent.parentElementOrShadowHost();
    }

    if (this.isRoot) {
      assert(!currentParent, 'Attempt to show root widget under another widget');
    } else {
      assert(
          currentParent && widgetMap.get(currentParent) === this.parentWidgetInternal,
          'Attempt to show under node belonging to alien widget');
    }

    const wasVisible = this.visibleInternal;
    if (wasVisible && this.element.parentElement === parentElement) {
      return;
    }

    this.visibleInternal = true;

    if (!wasVisible && this.parentIsShowing()) {
      this.processWillShow();
    }

    this.element.classList.remove('hidden');

    // Reparent
    if (this.element.parentElement !== parentElement) {
      if (!this.externallyManaged) {
        incrementWidgetCounter(parentElement, this.element);
      }
      if (insertBefore) {
        originalInsertBefore.call(parentElement, this.element, insertBefore);
      } else {
        originalAppendChild.call(parentElement, this.element);
      }
    }

    if (!wasVisible && this.parentIsShowing()) {
      this.processWasShown();
    }

    if (this.parentWidgetInternal && this.hasNonZeroConstraints()) {
      this.parentWidgetInternal.invalidateConstraints();
    } else {
      this.processOnResize();
    }
  }

  hideWidget(): void {
    if (!this.visibleInternal) {
      return;
    }
    this.hideWidgetInternal(false);
  }

  private hideWidgetInternal(removeFromDOM: boolean): void {
    this.visibleInternal = false;
    const {parentElement} = this.element;

    if (this.parentIsShowing()) {
      this.processWillHide();
    }

    if (removeFromDOM) {
      if (parentElement) {
        // Force legal removal
        decrementWidgetCounter(parentElement, this.element);
        originalRemoveChild.call(parentElement, this.element);
      }
      this.onDetach();
    } else {
      this.element.classList.add('hidden');
    }

    if (this.parentIsShowing()) {
      this.processWasHidden();
    }
    if (this.parentWidgetInternal && this.hasNonZeroConstraints()) {
      this.parentWidgetInternal.invalidateConstraints();
    }
  }

  detach(overrideHideOnDetach?: boolean): void {
    if (!this.parentWidgetInternal && !this.isRoot) {
      return;
    }

    // hideOnDetach means that we should never remove element from dom - content
    // has iframes and detaching it will hurt.
    //
    // overrideHideOnDetach will override hideOnDetach and the client takes
    // responsibility for the consequences.
    const removeFromDOM = overrideHideOnDetach || !this.shouldHideOnDetach();
    if (this.visibleInternal) {
      this.hideWidgetInternal(removeFromDOM);
    } else if (removeFromDOM) {
      const {parentElement} = this.element;
      if (parentElement) {
        // Force kick out from DOM.
        decrementWidgetCounter(parentElement, this.element);
        originalRemoveChild.call(parentElement, this.element);
      }
    }

    // Update widget hierarchy.
    if (this.parentWidgetInternal) {
      const childIndex = this.parentWidgetInternal.childrenInternal.indexOf(this);
      assert(childIndex >= 0, 'Attempt to remove non-child widget');
      this.parentWidgetInternal.childrenInternal.splice(childIndex, 1);
      if (this.parentWidgetInternal.defaultFocusedChild === this) {
        this.parentWidgetInternal.defaultFocusedChild = null;
      }
      this.parentWidgetInternal.childWasDetached(this);
      this.parentWidgetInternal = null;
    } else {
      assert(this.isRoot, 'Removing non-root widget from DOM');
    }
  }

  detachChildWidgets(): void {
    const children = this.childrenInternal.slice();
    for (let i = 0; i < children.length; ++i) {
      children[i].detach();
    }
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    return [this.element];
  }

  storeScrollPositions(): void {
    const elements = this.elementsToRestoreScrollPositionsFor();
    for (const container of elements) {
      storedScrollPositions.set(container, {scrollLeft: container.scrollLeft, scrollTop: container.scrollTop});
    }
  }

  restoreScrollPositions(): void {
    const elements = this.elementsToRestoreScrollPositionsFor();
    for (const container of elements) {
      const storedPositions = storedScrollPositions.get(container);
      if (storedPositions) {
        container.scrollLeft = storedPositions.scrollLeft;
        container.scrollTop = storedPositions.scrollTop;
      }
    }
  }

  doResize(): void {
    if (!this.isShowing()) {
      return;
    }
    // No matter what notification we are in, dispatching onResize is not needed.
    if (!this.inNotification()) {
      this.callOnVisibleChildren(this.processOnResize);
    }
  }

  doLayout(): void {
    if (!this.isShowing()) {
      return;
    }
    this.notify(this.onLayout);
    this.doResize();
  }

  registerRequiredCSS(cssFile: {cssContent: string}): void {
    if (this.shadowRoot) {
      ThemeSupport.ThemeSupport.instance().appendStyle((this.shadowRoot as DocumentFragment), cssFile);
    } else {
      ThemeSupport.ThemeSupport.instance().appendStyle(this.element, cssFile);
    }
  }

  registerCSSFiles(cssFiles: CSSStyleSheet[]): void {
    let root: ShadowRoot|Document;
    if (this.shadowRoot) {
      root = this.shadowRoot;
    } else {
      root = Helpers.GetRootNode.getRootNode(this.contentElement);
    }
    root.adoptedStyleSheets = root.adoptedStyleSheets.concat(cssFiles);
  }

  printWidgetHierarchy(): void {
    const lines: string[] = [];
    this.collectWidgetHierarchy('', lines);
    console.log(lines.join('\n'));  // eslint-disable-line no-console
  }

  private collectWidgetHierarchy(prefix: string, lines: string[]): void {
    lines.push(prefix + '[' + this.element.className + ']' + (this.childrenInternal.length ? ' {' : ''));

    for (let i = 0; i < this.childrenInternal.length; ++i) {
      this.childrenInternal[i].collectWidgetHierarchy(prefix + '    ', lines);
    }

    if (this.childrenInternal.length) {
      lines.push(prefix + '}');
    }
  }

  setDefaultFocusedElement(element: Element|null): void {
    this.defaultFocusedElement = element;
  }

  setDefaultFocusedChild(child: Widget): void {
    assert(child.parentWidgetInternal === this, 'Attempt to set non-child widget as default focused.');
    this.defaultFocusedChild = child;
  }

  focus(): void {
    if (!this.isShowing()) {
      return;
    }

    const element = (this.defaultFocusedElement as HTMLElement | null);
    if (element) {
      if (!element.hasFocus()) {
        element.focus();
      }
      return;
    }

    if (this.defaultFocusedChild && this.defaultFocusedChild.visibleInternal) {
      this.defaultFocusedChild.focus();
    } else {
      for (const child of this.childrenInternal) {
        if (child.visibleInternal) {
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

  hasFocus(): boolean {
    return this.element.hasFocus();
  }

  calculateConstraints(): Constraints {
    return new Constraints();
  }

  constraints(): Constraints {
    if (typeof this.constraintsInternal !== 'undefined') {
      return this.constraintsInternal;
    }
    if (typeof this.cachedConstraints === 'undefined') {
      this.cachedConstraints = this.calculateConstraints();
    }
    return this.cachedConstraints;
  }

  setMinimumAndPreferredSizes(width: number, height: number, preferredWidth: number, preferredHeight: number): void {
    this.constraintsInternal = new Constraints(new Size(width, height), new Size(preferredWidth, preferredHeight));
    this.invalidateConstraints();
  }

  setMinimumSize(width: number, height: number): void {
    this.constraintsInternal = new Constraints(new Size(width, height));
    this.invalidateConstraints();
  }

  private hasNonZeroConstraints(): boolean {
    const constraints = this.constraints();
    return Boolean(
        constraints.minimum.width || constraints.minimum.height || constraints.preferred.width ||
        constraints.preferred.height);
  }

  suspendInvalidations(): void {
    ++this.invalidationsSuspended;
  }

  resumeInvalidations(): void {
    --this.invalidationsSuspended;
    if (!this.invalidationsSuspended && this.invalidationsRequested) {
      this.invalidateConstraints();
    }
  }

  invalidateConstraints(): void {
    if (this.invalidationsSuspended) {
      this.invalidationsRequested = true;
      return;
    }
    this.invalidationsRequested = false;
    const cached = this.cachedConstraints;
    delete this.cachedConstraints;
    const actual = this.constraints();
    if (!actual.isEqual(cached || null) && this.parentWidgetInternal) {
      this.parentWidgetInternal.invalidateConstraints();
    } else {
      this.doLayout();
    }
  }

  // Excludes the widget from being tracked by its parents/ancestors via
  // widgetCounter because the widget is being handled by external code.
  // Widgets marked as being externally managed are responsible for
  // finishing out their own lifecycle (i.e. calling detach() before being
  // removed from the DOM). This is e.g. used for CodeMirror.
  //
  // Also note that this must be called before the widget is shown so that
  // so that its ancestor's widgetCounter is not incremented.
  markAsExternallyManaged(): void {
    assert(!this.parentWidgetInternal, 'Attempt to mark widget as externally managed after insertion to the DOM');
    this.externallyManaged = true;
  }
}

const storedScrollPositions = new WeakMap<Element, {
  scrollLeft: number,
  scrollTop: number,
}>();

export class VBox extends Widget {
  constructor(useShadowDom?: boolean, delegatesFocus?: boolean, element?: HTMLElement) {
    super(useShadowDom, delegatesFocus, element);
    this.contentElement.classList.add('vbox');
  }

  override calculateConstraints(): Constraints {
    let constraints: Constraints = new Constraints();

    function updateForChild(this: Widget): void {
      const child = this.constraints();
      constraints = constraints.widthToMax(child);
      constraints = constraints.addHeight(child);
    }

    this.callOnVisibleChildren(updateForChild);
    return constraints;
  }
}

export class HBox extends Widget {
  constructor(useShadowDom?: boolean) {
    super(useShadowDom);
    this.contentElement.classList.add('hbox');
  }

  override calculateConstraints(): Constraints {
    let constraints: Constraints = new Constraints();

    function updateForChild(this: Widget): void {
      const child = this.constraints();
      constraints = constraints.addWidth(child);
      constraints = constraints.heightToMax(child);
    }

    this.callOnVisibleChildren(updateForChild);
    return constraints;
  }
}

export class VBoxWithResizeCallback extends VBox {
  private readonly resizeCallback: () => void;
  constructor(resizeCallback: () => void) {
    super();
    this.resizeCallback = resizeCallback;
  }

  override onResize(): void {
    this.resizeCallback();
  }
}

export class WidgetFocusRestorer {
  private widget: Widget|null;
  private previous: HTMLElement|null;
  constructor(widget: Widget) {
    this.widget = widget;
    this.previous = (Platform.DOMUtilities.deepActiveElement(widget.element.ownerDocument) as HTMLElement | null);
    widget.focus();
  }

  restore(): void {
    if (!this.widget) {
      return;
    }
    if (this.widget.hasFocus() && this.previous) {
      this.previous.focus();
    }
    this.previous = null;
    this.widget = null;
  }
}

Element.prototype.appendChild = function<T extends Node>(node: T): T {
  if (widgetMap.get(node) && node.parentElement !== this) {
    throw new Error('Attempt to add widget via regular DOM operation.');
  }
  return originalAppendChild.call(this, node) as T;
};

Element.prototype.insertBefore = function<T extends Node>(node: T, child: Node|null): T {
  if (widgetMap.get(node) && node.parentElement !== this) {
    throw new Error('Attempt to add widget via regular DOM operation.');
  }
  return originalInsertBefore.call(this, node, child) as T;
};

Element.prototype.removeChild = function<T extends Node>(child: T): T {
  if (widgetCounterMap.get(child) || widgetMap.get(child)) {
    throw new Error('Attempt to remove element containing widget via regular DOM operation');
  }
  return originalRemoveChild.call(this, child) as T;
};

Element.prototype.removeChildren = function(): void {
  if (widgetCounterMap.get(this)) {
    throw new Error('Attempt to remove element containing widget via regular DOM operation');
  }
  return originalRemoveChildren.call(this);
};
