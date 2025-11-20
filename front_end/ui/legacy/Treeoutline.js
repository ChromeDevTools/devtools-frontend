// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Highlighting from '../components/highlighting/highlighting.js';
import * as Lit from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { appendStyle } from './DOMUtilities.js';
import { InplaceEditor } from './InplaceEditor.js';
import { Keys } from './KeyboardShortcut.js';
import { Tooltip } from './Tooltip.js';
import treeoutlineStyles from './treeoutline.css.js';
import { createShadowRootWithCoreStyles, deepElementFromPoint, enclosingNodeOrSelfWithNodeNameInArray, HTMLElementWithLightDOMTemplate, InterceptBindingDirective, isEditing, } from './UIUtils.js';
const nodeToParentTreeElementMap = new WeakMap();
const { render } = Lit;
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["ElementAttached"] = "ElementAttached";
    Events["ElementsDetached"] = "ElementsDetached";
    Events["ElementExpanded"] = "ElementExpanded";
    Events["ElementCollapsed"] = "ElementCollapsed";
    Events["ElementSelected"] = "ElementSelected";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
export class TreeOutline extends Common.ObjectWrapper.ObjectWrapper {
    rootElementInternal;
    renderSelection;
    selectedTreeElement;
    expandTreeElementsWhenArrowing;
    comparator;
    contentElement;
    preventTabOrder;
    showSelectionOnKeyboardFocus;
    focusable;
    element;
    useLightSelectionColor;
    treeElementToScrollIntoView;
    centerUponScrollIntoView;
    constructor() {
        super();
        this.rootElementInternal = this.createRootElement();
        this.renderSelection = false;
        this.selectedTreeElement = null;
        this.expandTreeElementsWhenArrowing = false;
        this.comparator = null;
        this.contentElement = this.rootElementInternal.childrenListNode;
        this.contentElement.addEventListener('keydown', this.treeKeyDown.bind(this), false);
        this.preventTabOrder = false;
        this.showSelectionOnKeyboardFocus = false;
        this.focusable = true;
        this.setFocusable(true);
        this.element = this.contentElement;
        this.element.setAttribute('jslog', `${VisualLogging.tree()}`);
        ARIAUtils.markAsTree(this.element);
        this.useLightSelectionColor = false;
        this.treeElementToScrollIntoView = null;
        this.centerUponScrollIntoView = false;
    }
    setShowSelectionOnKeyboardFocus(show, preventTabOrder) {
        this.contentElement.classList.toggle('hide-selection-when-blurred', show);
        this.preventTabOrder = Boolean(preventTabOrder);
        if (this.focusable) {
            this.contentElement.tabIndex = Boolean(preventTabOrder) ? -1 : 0;
        }
        this.showSelectionOnKeyboardFocus = show;
    }
    createRootElement() {
        const rootElement = new TreeElement();
        rootElement.treeOutline = this;
        rootElement.root = true;
        rootElement.selectable = false;
        rootElement.expanded = true;
        rootElement.childrenListNode.classList.remove('children');
        return rootElement;
    }
    rootElement() {
        return this.rootElementInternal;
    }
    firstChild() {
        return this.rootElementInternal.firstChild();
    }
    lastDescendent() {
        let last = this.rootElementInternal.lastChild();
        while (last && last.expanded && last.childCount()) {
            last = last.lastChild();
        }
        return last;
    }
    appendChild(child, comparator) {
        this.rootElementInternal.appendChild(child, comparator);
    }
    insertChild(child, index) {
        this.rootElementInternal.insertChild(child, index);
    }
    removeChild(child) {
        this.rootElementInternal.removeChild(child);
    }
    removeChildren() {
        this.rootElementInternal.removeChildren();
    }
    treeElementFromPoint(x, y) {
        const node = deepElementFromPoint(this.contentElement.ownerDocument, x, y);
        if (!node) {
            return null;
        }
        const listNode = enclosingNodeOrSelfWithNodeNameInArray(node, ['ol', 'li']);
        if (listNode) {
            return nodeToParentTreeElementMap.get(listNode) || treeElementBylistItemNode.get(listNode) || null;
        }
        return null;
    }
    treeElementFromEvent(event) {
        return event ? this.treeElementFromPoint(event.pageX, event.pageY) : null;
    }
    setComparator(comparator) {
        this.comparator = comparator;
    }
    setFocusable(focusable) {
        this.focusable = focusable;
        this.updateFocusable();
    }
    updateFocusable() {
        if (this.focusable) {
            this.contentElement.tabIndex = (this.preventTabOrder || Boolean(this.selectedTreeElement)) ? -1 : 0;
            if (this.selectedTreeElement) {
                this.selectedTreeElement.setFocusable(true);
            }
        }
        else {
            this.contentElement.removeAttribute('tabIndex');
            if (this.selectedTreeElement) {
                this.selectedTreeElement.setFocusable(false);
            }
        }
    }
    focus() {
        if (this.selectedTreeElement) {
            this.selectedTreeElement.listItemElement.focus();
        }
        else {
            this.contentElement.focus();
        }
    }
    setUseLightSelectionColor(flag) {
        this.useLightSelectionColor = flag;
    }
    getUseLightSelectionColor() {
        return this.useLightSelectionColor;
    }
    bindTreeElement(element) {
        if (element.treeOutline) {
            console.error('Binding element for the second time: ' + new Error().stack);
        }
        element.treeOutline = this;
        element.onbind();
    }
    unbindTreeElement(element) {
        if (!element.treeOutline) {
            console.error('Unbinding element that was not bound: ' + new Error().stack);
        }
        element.deselect();
        element.onunbind();
        element.treeOutline = null;
    }
    selectPrevious() {
        let nextSelectedElement = this.selectedTreeElement?.traversePreviousTreeElement(true) ?? null;
        while (nextSelectedElement && !nextSelectedElement.selectable) {
            nextSelectedElement = nextSelectedElement.traversePreviousTreeElement(!this.expandTreeElementsWhenArrowing);
        }
        if (!nextSelectedElement) {
            return false;
        }
        nextSelectedElement.select(false, true);
        return true;
    }
    selectNext() {
        let nextSelectedElement = this.selectedTreeElement?.traverseNextTreeElement(true) ?? null;
        while (nextSelectedElement && !nextSelectedElement.selectable) {
            nextSelectedElement = nextSelectedElement.traverseNextTreeElement(!this.expandTreeElementsWhenArrowing);
        }
        if (!nextSelectedElement) {
            return false;
        }
        nextSelectedElement.select(false, true);
        return true;
    }
    forceSelect(omitFocus = false, selectedByUser = true) {
        if (this.selectedTreeElement) {
            this.selectedTreeElement.deselect();
        }
        this.selectFirst(omitFocus, selectedByUser);
    }
    selectFirst(omitFocus = false, selectedByUser = true) {
        let first = this.firstChild();
        while (first && !first.selectable) {
            first = first.traverseNextTreeElement(true);
        }
        if (!first) {
            return false;
        }
        first.select(omitFocus, selectedByUser);
        return true;
    }
    selectLast() {
        let last = this.lastDescendent();
        while (last && !last.selectable) {
            last = last.traversePreviousTreeElement(true);
        }
        if (!last) {
            return false;
        }
        last.select(false, true);
        return true;
    }
    treeKeyDown(event) {
        if (event.shiftKey || event.metaKey || event.ctrlKey || isEditing()) {
            return;
        }
        let handled = false;
        if (!this.selectedTreeElement) {
            if (event.key === 'ArrowUp' && !event.altKey) {
                handled = this.selectLast();
            }
            else if (event.key === 'ArrowDown' && !event.altKey) {
                handled = this.selectFirst();
            }
        }
        else if (event.key === 'ArrowUp' && !event.altKey) {
            handled = this.selectPrevious();
        }
        else if (event.key === 'ArrowDown' && !event.altKey) {
            handled = this.selectNext();
        }
        else if (event.key === 'ArrowLeft') {
            handled = this.selectedTreeElement.collapseOrAscend(event.altKey);
        }
        else if (event.key === 'ArrowRight') {
            if (!this.selectedTreeElement.revealed()) {
                this.selectedTreeElement.reveal();
                handled = true;
            }
            else {
                handled = this.selectedTreeElement.descendOrExpand(event.altKey);
            }
        }
        else if (event.keyCode === 8 /* Backspace */ || event.keyCode === 46 /* Delete */) {
            handled = this.selectedTreeElement.ondelete();
        }
        else if (event.key === 'Enter') {
            handled = this.selectedTreeElement.onenter();
        }
        else if (event.keyCode === Keys.Space.code) {
            handled = this.selectedTreeElement.onspace();
        }
        else if (event.key === 'Home') {
            handled = this.selectFirst();
        }
        else if (event.key === 'End') {
            handled = this.selectLast();
        }
        if (handled) {
            event.consume(true);
        }
    }
    deferredScrollIntoView(treeElement, center) {
        const deferredScrollIntoView = () => {
            if (!this.treeElementToScrollIntoView) {
                return;
            }
            // This function doesn't use scrollIntoViewIfNeeded because it always
            // scrolls in both directions even if only one is necessary to bring the
            // item into view.
            const itemRect = this.treeElementToScrollIntoView.listItemElement.getBoundingClientRect();
            const treeRect = this.contentElement.getBoundingClientRect();
            // Usually, this.element is the tree container that scrolls. But sometimes
            // (i.e. in the Elements panel), its parent is.
            let scrollParentElement = this.element;
            while (getComputedStyle(scrollParentElement).overflow === 'visible' &&
                scrollParentElement.parentElementOrShadowHost()) {
                const parent = scrollParentElement.parentElementOrShadowHost();
                Platform.assertNotNullOrUndefined(parent);
                scrollParentElement = parent;
            }
            const viewRect = scrollParentElement.getBoundingClientRect();
            const currentScrollX = viewRect.left - treeRect.left;
            const currentScrollY = viewRect.top - treeRect.top + this.contentElement.offsetTop;
            // Only scroll into view on each axis if the item is not visible at all
            // but if we do scroll and centerUponScrollIntoView is true
            // then we center the top left corner of the item in view.
            let deltaLeft = itemRect.left - treeRect.left;
            if (deltaLeft > currentScrollX && deltaLeft < currentScrollX + viewRect.width) {
                deltaLeft = currentScrollX;
            }
            else if (this.centerUponScrollIntoView) {
                deltaLeft = deltaLeft - viewRect.width / 2;
            }
            let deltaTop = itemRect.top - treeRect.top;
            if (deltaTop > currentScrollY && deltaTop < currentScrollY + viewRect.height) {
                deltaTop = currentScrollY;
            }
            else if (this.centerUponScrollIntoView) {
                deltaTop = deltaTop - viewRect.height / 2;
            }
            scrollParentElement.scrollTo(deltaLeft, deltaTop);
            this.treeElementToScrollIntoView = null;
        };
        if (!this.treeElementToScrollIntoView) {
            this.element.window().requestAnimationFrame(deferredScrollIntoView);
        }
        this.treeElementToScrollIntoView = treeElement;
        this.centerUponScrollIntoView = center;
    }
    onStartedEditingTitle(_treeElement) {
    }
}
export class TreeOutlineInShadow extends TreeOutline {
    element;
    shadowRoot;
    disclosureElement;
    renderSelection;
    constructor(variant = "Other" /* TreeVariant.OTHER */, element) {
        super();
        this.contentElement.classList.add('tree-outline');
        this.element = element ?? document.createElement('div');
        this.shadowRoot = createShadowRootWithCoreStyles(this.element, { cssFile: treeoutlineStyles });
        this.disclosureElement = this.shadowRoot.createChild('div', 'tree-outline-disclosure');
        this.disclosureElement.appendChild(this.contentElement);
        this.renderSelection = true;
        if (variant === "NavigationTree" /* TreeVariant.NAVIGATION_TREE */) {
            this.contentElement.classList.add('tree-variant-navigation');
        }
    }
    setVariant(variant) {
        this.contentElement.classList.toggle('tree-variant-navigation', variant === "NavigationTree" /* TreeVariant.NAVIGATION_TREE */);
    }
    registerRequiredCSS(...cssFiles) {
        for (const cssFile of cssFiles) {
            appendStyle(this.shadowRoot, cssFile);
        }
    }
    setHideOverflow(hideOverflow) {
        this.disclosureElement.classList.toggle('tree-outline-disclosure-hide-overflow', hideOverflow);
    }
    setDense(dense) {
        this.contentElement.classList.toggle('tree-outline-dense', dense);
    }
    onStartedEditingTitle(treeElement) {
        const selection = this.shadowRoot.getSelection();
        if (selection) {
            selection.selectAllChildren(treeElement.titleElement);
        }
    }
}
export const treeElementBylistItemNode = new WeakMap();
export class TreeElement {
    treeOutline;
    parent;
    previousSibling;
    nextSibling;
    boundOnFocus;
    boundOnBlur;
    listItemNode;
    titleElement;
    titleInternal;
    childrenInternal;
    childrenListNode;
    expandLoggable = {};
    hiddenInternal;
    selectableInternal;
    expanded;
    selected;
    expandable;
    #expandRecursively = true;
    collapsible;
    toggleOnClick;
    button;
    root;
    tooltipInternal;
    leadingIconsElement;
    trailingIconsElement;
    selectionElementInternal;
    disableSelectFocus;
    constructor(title, expandable, jslogContext) {
        this.treeOutline = null;
        this.parent = null;
        this.previousSibling = null;
        this.nextSibling = null;
        this.boundOnFocus = this.onFocus.bind(this);
        this.boundOnBlur = this.onBlur.bind(this);
        this.listItemNode = document.createElement('li');
        this.titleElement = this.listItemNode.createChild('span', 'tree-element-title');
        treeElementBylistItemNode.set(this.listItemNode, this);
        this.titleInternal = '';
        if (title) {
            this.title = title;
        }
        this.listItemNode.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
        this.listItemNode.addEventListener('click', this.treeElementToggled.bind(this), false);
        this.listItemNode.addEventListener('dblclick', this.handleDoubleClick.bind(this), false);
        this.listItemNode.setAttribute('jslog', `${VisualLogging.treeItem().parent('parentTreeItem').context(jslogContext).track({
            click: true,
            keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End',
        })}`);
        ARIAUtils.markAsTreeitem(this.listItemNode);
        this.childrenInternal = null;
        this.childrenListNode = document.createElement('ol');
        nodeToParentTreeElementMap.set(this.childrenListNode, this);
        this.childrenListNode.classList.add('children');
        ARIAUtils.markAsGroup(this.childrenListNode);
        this.hiddenInternal = false;
        this.selectableInternal = true;
        this.expanded = false;
        this.selected = false;
        this.setExpandable(expandable || false);
        this.collapsible = true;
        this.toggleOnClick = false;
        this.button = null;
        this.root = false;
        this.tooltipInternal = '';
        this.leadingIconsElement = null;
        this.trailingIconsElement = null;
        this.selectionElementInternal = null;
        this.disableSelectFocus = false;
    }
    static getTreeElementBylistItemNode(node) {
        return treeElementBylistItemNode.get(node);
    }
    hasAncestor(ancestor) {
        if (!ancestor) {
            return false;
        }
        let currentNode = this.parent;
        while (currentNode) {
            if (ancestor === currentNode) {
                return true;
            }
            currentNode = currentNode.parent;
        }
        return false;
    }
    hasAncestorOrSelf(ancestor) {
        return this === ancestor || this.hasAncestor(ancestor);
    }
    isHidden() {
        if (this.hidden) {
            return true;
        }
        let currentNode = this.parent;
        while (currentNode) {
            if (currentNode.hidden) {
                return true;
            }
            currentNode = currentNode.parent;
        }
        return false;
    }
    children() {
        return this.childrenInternal || [];
    }
    childCount() {
        return this.childrenInternal ? this.childrenInternal.length : 0;
    }
    firstChild() {
        return this.childrenInternal ? this.childrenInternal[0] : null;
    }
    lastChild() {
        return this.childrenInternal ? this.childrenInternal[this.childrenInternal.length - 1] : null;
    }
    childAt(index) {
        return this.childrenInternal ? this.childrenInternal[index] : null;
    }
    indexOfChild(child) {
        return this.childrenInternal ? this.childrenInternal.indexOf(child) : -1;
    }
    appendChild(child, comparator) {
        if (!this.childrenInternal) {
            this.childrenInternal = [];
        }
        let insertionIndex;
        if (comparator) {
            insertionIndex = Platform.ArrayUtilities.lowerBound(this.childrenInternal, child, comparator);
        }
        else if (this.treeOutline?.comparator) {
            insertionIndex = Platform.ArrayUtilities.lowerBound(this.childrenInternal, child, this.treeOutline.comparator);
        }
        else {
            insertionIndex = this.childrenInternal.length;
        }
        this.insertChild(child, insertionIndex);
    }
    insertChild(child, index) {
        if (!this.childrenInternal) {
            this.childrenInternal = [];
        }
        if (!child) {
            throw new Error('child can\'t be undefined or null');
        }
        console.assert(!child.parent, 'Attempting to insert a child that is already in the tree, reparenting is not supported.');
        const previousChild = (index > 0 ? this.childrenInternal[index - 1] : null);
        if (previousChild) {
            previousChild.nextSibling = child;
            child.previousSibling = previousChild;
        }
        else {
            child.previousSibling = null;
        }
        const nextChild = this.childrenInternal[index];
        if (nextChild) {
            nextChild.previousSibling = child;
            child.nextSibling = nextChild;
        }
        else {
            child.nextSibling = null;
        }
        this.childrenInternal.splice(index, 0, child);
        this.setExpandable(true);
        child.parent = this;
        if (this.treeOutline) {
            this.treeOutline.bindTreeElement(child);
        }
        for (let current = child.firstChild(); this.treeOutline && current; current = current.traverseNextTreeElement(false, child, true)) {
            this.treeOutline.bindTreeElement(current);
        }
        child.onattach();
        child.ensureSelection();
        if (this.treeOutline) {
            this.treeOutline.dispatchEventToListeners(Events.ElementAttached, child);
        }
        const nextSibling = child.nextSibling ? child.nextSibling.listItemNode : null;
        this.childrenListNode.insertBefore(child.listItemNode, nextSibling);
        this.childrenListNode.insertBefore(child.childrenListNode, nextSibling);
        if (child.selected) {
            child.select();
        }
        if (child.expanded) {
            child.expand();
        }
    }
    removeChildAtIndex(childIndex) {
        if (!this.childrenInternal || childIndex < 0 || childIndex >= this.childrenInternal.length) {
            throw new Error('childIndex out of range');
        }
        const child = this.childrenInternal[childIndex];
        this.childrenInternal.splice(childIndex, 1);
        const parent = child.parent;
        if (this.treeOutline?.selectedTreeElement?.hasAncestorOrSelf(child)) {
            if (child.nextSibling) {
                child.nextSibling.select(true);
            }
            else if (child.previousSibling) {
                child.previousSibling.select(true);
            }
            else if (parent) {
                parent.select(true);
            }
        }
        if (child.previousSibling) {
            child.previousSibling.nextSibling = child.nextSibling;
        }
        if (child.nextSibling) {
            child.nextSibling.previousSibling = child.previousSibling;
        }
        child.parent = null;
        if (this.treeOutline) {
            this.treeOutline.unbindTreeElement(child);
        }
        for (let current = child.firstChild(); this.treeOutline && current; current = current.traverseNextTreeElement(false, child, true)) {
            this.treeOutline.unbindTreeElement(current);
        }
        child.detach();
        if (this.treeOutline) {
            this.treeOutline.dispatchEventToListeners(Events.ElementsDetached);
        }
    }
    removeChild(child) {
        if (!child) {
            throw new Error('child can\'t be undefined or null');
        }
        if (child.parent !== this) {
            return;
        }
        const childIndex = this.childrenInternal ? this.childrenInternal.indexOf(child) : -1;
        if (childIndex === -1) {
            throw new Error('child not found in this node\'s children');
        }
        this.removeChildAtIndex(childIndex);
    }
    removeChildren() {
        if (!this.root && this.treeOutline?.selectedTreeElement?.hasAncestorOrSelf(this)) {
            this.select(true);
        }
        if (this.childrenInternal) {
            for (const child of this.childrenInternal) {
                child.previousSibling = null;
                child.nextSibling = null;
                child.parent = null;
                if (this.treeOutline) {
                    this.treeOutline.unbindTreeElement(child);
                }
                for (let current = child.firstChild(); this.treeOutline && current; current = current.traverseNextTreeElement(false, child, true)) {
                    this.treeOutline.unbindTreeElement(current);
                }
                child.detach();
            }
        }
        this.childrenInternal = [];
        if (this.treeOutline) {
            this.treeOutline.dispatchEventToListeners(Events.ElementsDetached);
        }
    }
    get selectable() {
        if (this.isHidden()) {
            return false;
        }
        return this.selectableInternal;
    }
    set selectable(x) {
        this.selectableInternal = x;
    }
    get listItemElement() {
        return this.listItemNode;
    }
    get childrenListElement() {
        return this.childrenListNode;
    }
    get title() {
        return this.titleInternal;
    }
    set title(x) {
        if (this.titleInternal === x) {
            return;
        }
        this.titleInternal = x;
        if (typeof x === 'string') {
            this.titleElement.textContent = x;
            this.tooltip = x;
        }
        else {
            this.titleElement = x;
            this.tooltip = '';
        }
        this.listItemNode.removeChildren();
        if (this.leadingIconsElement) {
            this.listItemNode.appendChild(this.leadingIconsElement);
        }
        this.listItemNode.appendChild(this.titleElement);
        if (this.trailingIconsElement) {
            this.listItemNode.appendChild(this.trailingIconsElement);
        }
        this.ensureSelection();
    }
    titleAsText() {
        if (!this.titleInternal) {
            return '';
        }
        if (typeof this.titleInternal === 'string') {
            return this.titleInternal;
        }
        return this.titleInternal.textContent || '';
    }
    startEditingTitle(editingConfig) {
        InplaceEditor.startEditing(this.titleElement, editingConfig);
        if (this.treeOutline) {
            this.treeOutline.onStartedEditingTitle(this);
        }
    }
    setLeadingIcons(icons) {
        if (!this.leadingIconsElement && !icons.length) {
            return;
        }
        if (!this.leadingIconsElement) {
            this.leadingIconsElement = document.createElement('div');
            this.leadingIconsElement.classList.add('leading-icons');
            this.leadingIconsElement.classList.add('icons-container');
            this.listItemNode.insertBefore(this.leadingIconsElement, this.titleElement);
            this.ensureSelection();
        }
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        render(icons, this.leadingIconsElement);
    }
    get tooltip() {
        return this.tooltipInternal;
    }
    set tooltip(x) {
        if (this.tooltipInternal === x) {
            return;
        }
        this.tooltipInternal = x;
        Tooltip.install(this.listItemNode, x);
    }
    isExpandable() {
        return this.expandable;
    }
    setExpandable(expandable) {
        if (this.expandable === expandable) {
            return;
        }
        this.expandable = expandable;
        this.listItemNode.classList.toggle('parent', expandable);
        if (!expandable) {
            this.collapse();
            ARIAUtils.unsetExpandable(this.listItemNode);
        }
        else {
            VisualLogging.registerLoggable(this.expandLoggable, `${VisualLogging.expand()}`, this.listItemNode, new DOMRect(0, 0, 16, 16));
            ARIAUtils.setExpanded(this.listItemNode, false);
        }
    }
    isExpandRecursively() {
        return this.#expandRecursively;
    }
    setExpandRecursively(expandRecursively) {
        this.#expandRecursively = expandRecursively;
    }
    isCollapsible() {
        return this.collapsible;
    }
    setCollapsible(collapsible) {
        if (this.collapsible === collapsible) {
            return;
        }
        this.collapsible = collapsible;
        this.listItemNode.classList.toggle('always-parent', !collapsible);
        if (!collapsible) {
            this.expand();
        }
    }
    get hidden() {
        return this.hiddenInternal;
    }
    set hidden(x) {
        if (this.hiddenInternal === x) {
            return;
        }
        this.hiddenInternal = x;
        this.listItemNode.classList.toggle('hidden', x);
        this.childrenListNode.classList.toggle('hidden', x);
        if (x && this.treeOutline?.selectedTreeElement?.hasAncestorOrSelf(this)) {
            const hadFocus = this.treeOutline.selectedTreeElement.listItemElement.hasFocus();
            this.treeOutline.forceSelect(!hadFocus, /* selectedByUser */ false);
        }
    }
    invalidateChildren() {
        if (this.childrenInternal) {
            this.removeChildren();
            this.childrenInternal = null;
        }
    }
    ensureSelection() {
        if (!this.treeOutline?.renderSelection) {
            return;
        }
        if (!this.selectionElementInternal) {
            this.selectionElementInternal = document.createElement('div');
            this.selectionElementInternal.classList.add('selection');
            this.selectionElementInternal.classList.add('fill');
        }
        this.listItemNode.insertBefore(this.selectionElementInternal, this.listItemElement.firstChild);
    }
    treeElementToggled(event) {
        const element = event.currentTarget;
        if (!element || treeElementBylistItemNode.get(element) !== this || element.hasSelection()) {
            return;
        }
        console.assert(Boolean(this.treeOutline));
        const showSelectionOnKeyboardFocus = this.treeOutline ? this.treeOutline.showSelectionOnKeyboardFocus : false;
        const toggleOnClick = this.toggleOnClick && (showSelectionOnKeyboardFocus || !this.selectable);
        const isInTriangle = this.isEventWithinDisclosureTriangle(event);
        if (!toggleOnClick && !isInTriangle) {
            return;
        }
        if (this.expanded) {
            if (event.altKey) {
                this.collapseRecursively();
            }
            else {
                this.collapse();
            }
        }
        else if (event.altKey) {
            void this.expandRecursively();
        }
        else {
            this.expand();
        }
        void VisualLogging.logClick(this.expandLoggable, event);
        event.consume();
    }
    handleMouseDown(event) {
        const element = event.currentTarget;
        if (!element) {
            return;
        }
        if (!this.selectable) {
            return;
        }
        if (treeElementBylistItemNode.get(element) !== this) {
            return;
        }
        if (this.isEventWithinDisclosureTriangle(event)) {
            return;
        }
        this.selectOnMouseDown(event);
    }
    handleDoubleClick(event) {
        const element = event.currentTarget;
        if (!element || treeElementBylistItemNode.get(element) !== this) {
            return;
        }
        const handled = this.ondblclick(event);
        if (handled) {
            return;
        }
        if (this.expandable && !this.expanded) {
            this.expand();
        }
    }
    detach() {
        this.listItemNode.remove();
        this.childrenListNode.remove();
    }
    collapse() {
        if (!this.expanded || !this.collapsible) {
            return;
        }
        this.listItemNode.classList.remove('expanded');
        this.childrenListNode.classList.remove('expanded');
        ARIAUtils.setExpanded(this.listItemNode, false);
        this.expanded = false;
        this.oncollapse();
        if (this.treeOutline) {
            this.treeOutline.dispatchEventToListeners(Events.ElementCollapsed, this);
        }
        const selectedTreeElement = this.treeOutline?.selectedTreeElement;
        if (selectedTreeElement?.hasAncestor(this)) {
            this.select(/* omitFocus */ true, /* selectedByUser */ true);
        }
    }
    collapseRecursively() {
        let item = this;
        while (item) {
            if (item.expanded) {
                item.collapse();
            }
            item = item.traverseNextTreeElement(false, this, true);
        }
    }
    collapseChildren() {
        if (!this.childrenInternal) {
            return;
        }
        for (const child of this.childrenInternal) {
            child.collapseRecursively();
        }
    }
    expand() {
        if (!this.expandable || (this.expanded && this.childrenInternal)) {
            return;
        }
        // Set this before onpopulate. Since onpopulate can add elements, this makes
        // sure the expanded flag is true before calling those functions. This prevents the possibility
        // of an infinite loop if onpopulate were to call expand.
        this.expanded = true;
        void this.populateIfNeeded();
        this.listItemNode.classList.add('expanded');
        this.childrenListNode.classList.add('expanded');
        ARIAUtils.setExpanded(this.listItemNode, true);
        if (this.treeOutline) {
            this.onexpand();
            this.treeOutline.dispatchEventToListeners(Events.ElementExpanded, this);
        }
    }
    async expandRecursively(maxDepth) {
        let item = this;
        const info = { depthChange: 0 };
        let depth = 0;
        // The Inspector uses TreeOutlines to represents object properties, so recursive expansion
        // in some case can be infinite, since JavaScript objects can hold circular references.
        // So default to a recursion cap of 3 levels, since that gives fairly good results.
        if (maxDepth === undefined || isNaN(maxDepth)) {
            maxDepth = 3;
        }
        do {
            if (item.isExpandRecursively()) {
                await item.populateIfNeeded();
                if (depth < maxDepth) {
                    item.expand();
                }
            }
            item = item.traverseNextTreeElement(!item.isExpandRecursively(), this, true, info);
            depth += info.depthChange;
        } while (item !== null);
    }
    collapseOrAscend(altKey) {
        if (this.expanded && this.collapsible) {
            if (altKey) {
                this.collapseRecursively();
            }
            else {
                this.collapse();
            }
            return true;
        }
        if (!this.parent || this.parent.root) {
            return false;
        }
        if (!this.parent.selectable) {
            this.parent.collapse();
            return true;
        }
        let nextSelectedElement = this.parent;
        while (nextSelectedElement && !nextSelectedElement.selectable) {
            nextSelectedElement = nextSelectedElement.parent;
        }
        if (!nextSelectedElement) {
            return false;
        }
        nextSelectedElement.select(false, true);
        return true;
    }
    descendOrExpand(altKey) {
        if (!this.expandable) {
            return false;
        }
        if (!this.expanded) {
            if (altKey) {
                void this.expandRecursively();
            }
            else {
                this.expand();
            }
            return true;
        }
        let nextSelectedElement = this.firstChild();
        while (nextSelectedElement && !nextSelectedElement.selectable) {
            nextSelectedElement = nextSelectedElement.nextSibling;
        }
        if (!nextSelectedElement) {
            return false;
        }
        nextSelectedElement.select(false, true);
        return true;
    }
    reveal(center) {
        let currentAncestor = this.parent;
        while (currentAncestor && !currentAncestor.root) {
            if (!currentAncestor.expanded) {
                currentAncestor.expand();
            }
            currentAncestor = currentAncestor.parent;
        }
        if (this.treeOutline) {
            this.treeOutline.deferredScrollIntoView(this, Boolean(center));
        }
    }
    revealed() {
        let currentAncestor = this.parent;
        while (currentAncestor && !currentAncestor.root) {
            if (!currentAncestor.expanded) {
                return false;
            }
            currentAncestor = currentAncestor.parent;
        }
        return true;
    }
    selectOnMouseDown(event) {
        if (this.select(false, true)) {
            event.consume(true);
        }
        if (this.listItemNode.draggable && this.selectionElementInternal && this.treeOutline) {
            const marginLeft = this.treeOutline.element.getBoundingClientRect().left -
                this.listItemNode.getBoundingClientRect().left - this.treeOutline.element.scrollLeft;
            // By default the left margin extends far off screen. This is not a problem except when dragging an element.
            // Setting the margin once here should be fine, because we believe the left margin should never change.
            this.selectionElementInternal.style.setProperty('margin-left', marginLeft + 'px');
        }
    }
    select(omitFocus, selectedByUser) {
        omitFocus = omitFocus || this.disableSelectFocus;
        if (!this.treeOutline || !this.selectable || this.selected) {
            if (!omitFocus) {
                this.listItemElement.focus();
            }
            return false;
        }
        // Wait to deselect this element so that focus only changes once
        const lastSelected = this.treeOutline.selectedTreeElement;
        this.treeOutline.selectedTreeElement = null;
        if (this.treeOutline.rootElementInternal === this) {
            if (lastSelected) {
                lastSelected.deselect();
            }
            if (!omitFocus) {
                this.listItemElement.focus();
            }
            return false;
        }
        this.selected = true;
        this.treeOutline.selectedTreeElement = this;
        this.treeOutline.updateFocusable();
        if (!omitFocus || this.treeOutline.contentElement.hasFocus()) {
            this.listItemElement.focus();
        }
        this.listItemNode.classList.add('selected');
        ARIAUtils.setSelected(this.listItemNode, true);
        this.treeOutline.dispatchEventToListeners(Events.ElementSelected, this);
        if (lastSelected) {
            lastSelected.deselect();
        }
        return this.onselect(selectedByUser);
    }
    setFocusable(focusable) {
        if (focusable) {
            this.listItemNode.setAttribute('tabIndex', (this.treeOutline?.preventTabOrder) ? '-1' : '0');
            this.listItemNode.addEventListener('focus', this.boundOnFocus, false);
            this.listItemNode.addEventListener('blur', this.boundOnBlur, false);
        }
        else {
            this.listItemNode.removeAttribute('tabIndex');
            this.listItemNode.removeEventListener('focus', this.boundOnFocus, false);
            this.listItemNode.removeEventListener('blur', this.boundOnBlur, false);
        }
    }
    onFocus() {
        if (!this.treeOutline || this.treeOutline.getUseLightSelectionColor()) {
            return;
        }
        if (!this.treeOutline.contentElement.classList.contains('hide-selection-when-blurred')) {
            this.listItemNode.classList.add('force-white-icons');
        }
    }
    onBlur() {
        if (!this.treeOutline || this.treeOutline.getUseLightSelectionColor()) {
            return;
        }
        if (!this.treeOutline.contentElement.classList.contains('hide-selection-when-blurred')) {
            this.listItemNode.classList.remove('force-white-icons');
        }
    }
    revealAndSelect(omitFocus) {
        this.reveal(true);
        this.select(omitFocus);
    }
    deselect() {
        const hadFocus = this.listItemNode.hasFocus();
        this.selected = false;
        this.listItemNode.classList.remove('selected');
        ARIAUtils.clearSelected(this.listItemNode);
        this.setFocusable(false);
        if (this.treeOutline && this.treeOutline.selectedTreeElement === this) {
            this.treeOutline.selectedTreeElement = null;
            this.treeOutline.updateFocusable();
            if (hadFocus) {
                this.treeOutline.focus();
            }
        }
    }
    async populateIfNeeded() {
        if (this.treeOutline && this.expandable && !this.childrenInternal) {
            this.childrenInternal = [];
            await this.onpopulate();
        }
    }
    async onpopulate() {
        // Overridden by subclasses.
    }
    onenter() {
        if (this.expandable && !this.expanded) {
            this.expand();
            return true;
        }
        if (this.collapsible && this.expanded) {
            this.collapse();
            return true;
        }
        return false;
    }
    ondelete() {
        return false;
    }
    onspace() {
        return false;
    }
    onbind() {
    }
    onunbind() {
    }
    onattach() {
    }
    onexpand() {
    }
    oncollapse() {
    }
    ondblclick(_e) {
        return false;
    }
    onselect(_selectedByUser) {
        return false;
    }
    traverseNextTreeElement(skipUnrevealed, stayWithin, dontPopulate, info) {
        if (!dontPopulate) {
            void this.populateIfNeeded();
        }
        if (info) {
            info.depthChange = 0;
        }
        let element = skipUnrevealed ? (this.revealed() ? this.firstChild() : null) : this.firstChild();
        if (element && (!skipUnrevealed || (skipUnrevealed && this.expanded))) {
            if (info) {
                info.depthChange = 1;
            }
            return element;
        }
        if (this === stayWithin) {
            return null;
        }
        element = skipUnrevealed ? (this.revealed() ? this.nextSibling : null) : this.nextSibling;
        if (element) {
            return element;
        }
        element = this;
        while (element && !element.root &&
            !(skipUnrevealed ? (element.revealed() ? element.nextSibling : null) : element.nextSibling) &&
            element.parent !== stayWithin) {
            if (info) {
                info.depthChange -= 1;
            }
            element = element.parent;
        }
        if (!element || element.root) {
            return null;
        }
        return (skipUnrevealed ? (element.revealed() ? element.nextSibling : null) : element.nextSibling);
    }
    traversePreviousTreeElement(skipUnrevealed, dontPopulate) {
        let element = skipUnrevealed ? (this.revealed() ? this.previousSibling : null) : this.previousSibling;
        if (!dontPopulate && element) {
            void element.populateIfNeeded();
        }
        while (element &&
            (skipUnrevealed ? (element.revealed() && element.expanded ? element.lastChild() : null) :
                element.lastChild())) {
            if (!dontPopulate) {
                void element.populateIfNeeded();
            }
            element =
                (skipUnrevealed ? (element.revealed() && element.expanded ? element.lastChild() : null) :
                    element.lastChild());
        }
        if (element) {
            return element;
        }
        if (!this.parent || this.parent.root) {
            return null;
        }
        return this.parent;
    }
    isEventWithinDisclosureTriangle(event) {
        const arrowToggleWidth = 10;
        // FIXME: We should not use getComputedStyle(). For that we need to get rid of using ::before for disclosure triangle. (http://webk.it/74446)
        const paddingLeftValue = window.getComputedStyle(this.listItemNode).paddingLeft;
        console.assert(paddingLeftValue.endsWith('px'));
        const computedLeftPadding = parseFloat(paddingLeftValue);
        const left = this.listItemNode.getBoundingClientRect().left + computedLeftPadding;
        return event.pageX >= left && event.pageX <= left + arrowToggleWidth && this.expandable;
    }
    setDisableSelectFocus(toggle) {
        this.disableSelectFocus = toggle;
    }
}
function hasBooleanAttribute(element, name) {
    return element.hasAttribute(name) && element.getAttribute(name) !== 'false';
}
export class TreeSearch {
    #matches = [];
    #currentMatchIndex = 0;
    #nodeMatchMap;
    reset() {
        this.#matches = [];
        this.#nodeMatchMap = undefined;
        this.#currentMatchIndex = 0;
    }
    currentMatch() {
        return this.#matches.at(this.#currentMatchIndex);
    }
    #getNodeMatchMap() {
        if (!this.#nodeMatchMap) {
            this.#nodeMatchMap = new WeakMap();
            for (const match of this.#matches) {
                let entry = this.#nodeMatchMap.get(match.node);
                if (!entry) {
                    entry = [];
                    this.#nodeMatchMap.set(match.node, entry);
                }
                entry.push(match);
            }
        }
        return this.#nodeMatchMap;
    }
    getResults(node) {
        return this.#getNodeMatchMap().get(node) ?? [];
    }
    static highlight(ranges, selectedRange) {
        return Lit.Directives.ref(element => {
            if (!(element instanceof HTMLElement)) {
                return;
            }
            const configListItem = element.closest('li[role="treeitem"]');
            const titleElement = configListItem ? TreeViewTreeElement.get(configListItem)?.titleElement : undefined;
            if (configListItem && titleElement) {
                const targetElement = HTMLElementWithLightDOMTemplate.findCorrespondingElement(element, configListItem, titleElement);
                if (targetElement) {
                    Highlighting.HighlightManager.HighlightManager.instance().set(targetElement, ranges, selectedRange);
                }
            }
        });
    }
    updateSearchableView(view) {
        view.updateSearchMatchesCount(this.#matches.length);
        view.updateCurrentMatchIndex(this.#currentMatchIndex);
    }
    next() {
        this.#currentMatchIndex = Platform.NumberUtilities.mod(this.#currentMatchIndex + 1, this.#matches.length);
        return this.currentMatch();
    }
    prev() {
        this.#currentMatchIndex = Platform.NumberUtilities.mod(this.#currentMatchIndex - 1, this.#matches.length);
        return this.currentMatch();
    }
    // This is a generator to sidestep stack overflow risks
    *#innerSearch(node, currentMatch, jumpBackwards, match) {
        const updateCurrentMatchIndex = (isPostOrder) => {
            if (currentMatch?.node === node && currentMatch.isPostOrderMatch === isPostOrder) {
                // We're current matching the node that contains the currently focused search result, the n-th result
                // within that node. When updating the search hits, make sure we're still focusing the n-th result within
                // that node. That may make the result jump within the node, but at least we're still focusing the same
                // node. If there are fewer than n hits in the current node, we're going to move the focus to the next
                // search hit in the next node by default, or the last one in this node if searching backwards.
                if (currentMatch.matchIndexInNode >= preOrderMatches.length) {
                    this.#currentMatchIndex = jumpBackwards ? this.#matches.length - 1 : this.#matches.length;
                }
                else {
                    this.#currentMatchIndex = this.#matches.length - preOrderMatches.length + currentMatch.matchIndexInNode;
                }
            }
        };
        const preOrderMatches = match(node, /* isPostOrder=*/ false);
        this.#matches.push(...preOrderMatches);
        updateCurrentMatchIndex(/* isPostOrder=*/ false);
        yield* preOrderMatches.values();
        for (const child of node.children()) {
            yield* this.#innerSearch(child, currentMatch, jumpBackwards, match);
        }
        const postOrderMatches = match(node, /* isPostOrder=*/ true);
        this.#matches.push(...postOrderMatches);
        updateCurrentMatchIndex(/* isPostOrder=*/ true);
        yield* postOrderMatches.values();
    }
    search(node, jumpBackwards, match) {
        const currentMatch = this.currentMatch();
        this.reset();
        // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-unused-vars
        for (const _ of this.#innerSearch(node, currentMatch, jumpBackwards, match)) {
            // run the generator
        }
        this.#currentMatchIndex = Platform.NumberUtilities.mod(this.#currentMatchIndex, this.#matches.length);
        return this.#matches.length;
    }
}
class TreeViewTreeElement extends TreeElement {
    #clonedAttributes = new Set();
    #clonedClasses = new Set();
    static #elementToTreeElement = new WeakMap();
    configElement;
    constructor(treeOutline, configElement) {
        super(undefined, undefined, configElement.getAttribute('jslog-context') ?? undefined);
        this.configElement = configElement;
        TreeViewTreeElement.#elementToTreeElement.set(configElement, this);
        this.refresh();
    }
    refresh() {
        this.titleElement.textContent = '';
        this.#clonedAttributes.forEach(attr => this.listItemElement.attributes.removeNamedItem(attr));
        this.#clonedClasses.forEach(className => this.listItemElement.classList.remove(className));
        this.#clonedAttributes.clear();
        this.#clonedClasses.clear();
        for (let i = 0; i < this.configElement.attributes.length; ++i) {
            const attribute = this.configElement.attributes.item(i);
            if (attribute && attribute.name !== 'role' && SDK.DOMModel.ARIA_ATTRIBUTES.has(attribute.name)) {
                this.listItemElement.setAttribute(attribute.name, attribute.value);
                this.#clonedAttributes.add(attribute.name);
            }
        }
        for (const className of this.configElement.classList) {
            this.listItemElement.classList.add(className);
            this.#clonedClasses.add(className);
        }
        InterceptBindingDirective.attachEventListeners(this.configElement, this.listItemElement);
        for (const child of this.configElement.childNodes) {
            if (child instanceof HTMLUListElement && child.role === 'group') {
                continue;
            }
            this.titleElement.appendChild(HTMLElementWithLightDOMTemplate.cloneNode(child));
        }
        Highlighting.HighlightManager.HighlightManager.instance().apply(this.titleElement);
    }
    static get(configElement) {
        return configElement && TreeViewTreeElement.#elementToTreeElement.get(configElement);
    }
    remove() {
        const parent = this.parent;
        if (parent) {
            parent.removeChild(this);
            parent.setExpandable(parent.children().length > 0);
        }
        TreeViewTreeElement.#elementToTreeElement.delete(this.configElement);
    }
}
function getTreeNodes(nodeList) {
    return nodeList.values()
        .flatMap(node => {
        if (node instanceof HTMLLIElement && node.role === 'treeitem') {
            return [node, ...node.querySelectorAll('ul[role="group"] li[role="treeitem"]')];
        }
        if (node instanceof HTMLElement) {
            return node.querySelectorAll('li[role="treeitem"]');
        }
        return [];
    })
        .toArray();
}
function getStyleElements(nodes) {
    return [...nodes].flatMap(node => {
        if (node instanceof HTMLStyleElement) {
            return [node];
        }
        if (node instanceof HTMLElement) {
            return [...node.querySelectorAll('style')];
        }
        return [];
    });
}
/**
 * A tree element that can be used as progressive enhancement over a <ul> element. A `template` IDL attribute allows
 * additionally to insert the <ul> into a <template>, avoiding rendering anything into light DOM, which is recommended.
 * The <ul> itself will be cloned into shadow DOM and rendered there.
 *
 * ## Usage ##
 *
 * It can be used as
 * ```
 * <devtools-tree
 *   .template=${html`
 *     <ul role="tree">
 *        <li role="treeitem" @expand=${onExpand}>
 *          Tree Node Text
 *          <ul role="group">
 *            Node with subtree
 *            <li role="treeitem" jslog-context="context">
 *              <ul role="group" hidden>
 *                <li role="treeitem">Tree Node Text in collapsed subtree</li>
 *                <li role="treeitem">Tree Node Text in collapsed subtree</li>
 *              </ul>
 *           </li>
 *           <li selected role="treeitem">Tree Node Text in a selected-by-default node</li>
 *         </ul>
 *       </li>
 *     </ul>
 *   </template>`}
 * ></devtools-tree>
 *
 * ```
 * where a <li role="treeitem"> element defines a tree node and its contents (the <li> is the `config element` for this
 * tree node). If a tree node contains a <ul role="group">, that defines a subtree under that tree node. The `hidden`
 * attribute on the <ul> defines whether that subtree should render as collapsed. Note that node expanding/collapsing do
 * not reflect this state back to the attribute on the config element, those state changes are rather sent out as
 * `expand` events on the config element.
 *
 * Under the hood this uses TreeOutline.
 *
 * ## Config Element Attributes ##
 *
 * - `selected`: Whether the tree node should be rendered as selected.
 * - `jslog-context`: The jslog context for the tree element.
 * - `aria-*`: All aria attributes defined on the config element are cloned over.
 * - `hidden`: On the <ul>, declares whether the subtree should be rendererd as expanded or collapsed.
 *
 * ## Event Handling ##
 *
 * This section is only relevant if NOT using the `template`.
 *
 * Since config elements are cloned into the shadow DOM, it's not possible to directly attach event listeners to the
 * children of config elements. Instead, the `UI.UIUtils.InterceptBindingDirective` directive needs to be used as a
 * wrapper:
 * ```
 * const on = Lit.Directive.directive(UI.UIUtils.InterceptBindingDirective);
 *
 * html`<li role="treeitem">
 *   <button @click=${on(clickHandler)}>click me</button>
 * </li>`
 * ```
 *
 * @property template Define the tree contents
 * @event selected A node was selected
 * @attribute navigation-variant Turn this tree into the navigation variant
 * @attribute hide-overflow
 */
export class TreeViewElement extends HTMLElementWithLightDOMTemplate {
    static observedAttributes = ['navigation-variant', 'hide-overflow'];
    #treeOutline = new TreeOutlineInShadow(undefined, this);
    constructor() {
        super();
        this.#treeOutline.addEventListener(Events.ElementSelected, event => {
            if (event.data instanceof TreeViewTreeElement) {
                this.dispatchEvent(new TreeViewElement.SelectEvent(event.data.configElement));
            }
        });
        this.#treeOutline.addEventListener(Events.ElementExpanded, event => {
            if (event.data instanceof TreeViewTreeElement) {
                event.data.listItemElement.dispatchEvent(new TreeViewElement.ExpandEvent({ expanded: true }));
            }
        });
        this.#treeOutline.addEventListener(Events.ElementCollapsed, event => {
            if (event.data instanceof TreeViewTreeElement) {
                event.data.listItemElement.dispatchEvent(new TreeViewElement.ExpandEvent({ expanded: false }));
            }
        });
        this.addNodes(getTreeNodes([this]));
    }
    getInternalTreeOutlineForTest() {
        return this.#treeOutline;
    }
    #getParentTreeElement(element) {
        const subtreeRoot = element.parentElement;
        if (!(subtreeRoot instanceof HTMLUListElement)) {
            return null;
        }
        if (subtreeRoot.role === 'tree') {
            return { treeElement: this.#treeOutline.rootElement(), expanded: false };
        }
        if (subtreeRoot.role !== 'group' || !subtreeRoot.parentElement) {
            return null;
        }
        const expanded = !hasBooleanAttribute(subtreeRoot, 'hidden');
        const treeElement = TreeViewTreeElement.get(subtreeRoot.parentElement);
        return treeElement ? { expanded, treeElement } : null;
    }
    updateNode(node, attributeName) {
        while (node?.parentNode && !(node instanceof HTMLElement)) {
            node = node.parentNode;
        }
        const treeNode = node instanceof HTMLElement ? node.closest('li[role="treeitem"]') : null;
        if (!treeNode) {
            return;
        }
        const treeElement = TreeViewTreeElement.get(treeNode);
        if (!treeElement) {
            return;
        }
        treeElement.refresh();
        if (node === treeNode && attributeName === 'selected' && hasBooleanAttribute(treeNode, 'selected')) {
            treeElement.revealAndSelect(true);
        }
        if (attributeName === 'hidden' && node instanceof HTMLUListElement && node.role === 'group') {
            if (hasBooleanAttribute(node, 'hidden')) {
                treeElement.collapse();
            }
            else {
                treeElement.expand();
            }
        }
    }
    addNodes(nodes, nextSibling) {
        for (const node of getTreeNodes(nodes)) {
            if (TreeViewTreeElement.get(node)) {
                continue; // Not sure this can happen
            }
            const parent = this.#getParentTreeElement(node);
            if (!parent) {
                continue;
            }
            while (nextSibling && nextSibling.nodeType !== Node.ELEMENT_NODE) {
                nextSibling = nextSibling.nextSibling;
            }
            const nextElement = nextSibling ? TreeViewTreeElement.get(nextSibling) : null;
            const index = nextElement ? parent.treeElement.indexOfChild(nextElement) : parent.treeElement.children().length;
            const treeElement = new TreeViewTreeElement(this.#treeOutline, node);
            const expandable = Boolean(node.querySelector('ul[role="group"]'));
            treeElement.setExpandable(expandable);
            parent.treeElement.insertChild(treeElement, index);
            if (hasBooleanAttribute(node, 'selected')) {
                treeElement.revealAndSelect(true);
            }
            if (parent.expanded) {
                parent.treeElement.expand();
            }
        }
        for (const element of getStyleElements(nodes)) {
            this.#treeOutline.shadowRoot.appendChild(element.cloneNode(true));
        }
    }
    removeNodes(nodes) {
        for (const node of getTreeNodes(nodes)) {
            TreeViewTreeElement.get(node)?.remove();
        }
    }
    set hideOverflow(hide) {
        this.toggleAttribute('hide-overflow', hide);
    }
    get hideOverflow() {
        return hasBooleanAttribute(this, 'hide-overflow');
    }
    set navgiationVariant(navigationVariant) {
        this.toggleAttribute('navigation-variant', navigationVariant);
    }
    get navigationVariant() {
        return hasBooleanAttribute(this, 'navigation-variant');
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        switch (name) {
            case 'navigation-variant':
                this.#treeOutline.setVariant(newValue !== 'false' ? "NavigationTree" /* TreeVariant.NAVIGATION_TREE */ : "Other" /* TreeVariant.OTHER */);
                break;
            case 'hide-overflow':
                this.#treeOutline.setHideOverflow(newValue !== 'false');
        }
    }
}
(function (TreeViewElement) {
    class SelectEvent extends CustomEvent {
        constructor(detail) {
            super('select', { detail });
        }
    }
    TreeViewElement.SelectEvent = SelectEvent;
    class ExpandEvent extends CustomEvent {
        constructor(detail) {
            super('expand', { detail });
        }
    }
    TreeViewElement.ExpandEvent = ExpandEvent;
})(TreeViewElement || (TreeViewElement = {}));
customElements.define('devtools-tree', TreeViewElement);
function loggingParentProvider(e) {
    const treeElement = TreeElement.getTreeElementBylistItemNode(e);
    const parentElement = treeElement?.parent?.listItemElement;
    return parentElement?.isConnected && parentElement || treeElement?.treeOutline?.contentElement;
}
VisualLogging.registerParentProvider('parentTreeItem', loggingParentProvider);
//# sourceMappingURL=Treeoutline.js.map