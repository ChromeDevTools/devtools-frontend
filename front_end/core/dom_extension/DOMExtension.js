// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 *
 * Contains diff method based on Javascript Diff Algorithm By John Resig
 * http://ejohn.org/files/jsdiff.js (released under the MIT license).
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck This file is not checked by TypeScript Compiler as it has a lot of legacy code.
import * as Platform from '../platform/platform.js';
Node.prototype.traverseNextTextNode = function (stayWithin) {
    let node = this.traverseNextNode(stayWithin);
    if (!node) {
        return null;
    }
    const nonTextTags = { STYLE: 1, SCRIPT: 1, '#document-fragment': 1 };
    while (node && (node.nodeType !== Node.TEXT_NODE || nonTextTags[node.parentNode ? node.parentNode.nodeName : ''])) {
        node = node.traverseNextNode(stayWithin);
    }
    return node;
};
Element.prototype.positionAt = function (x, y, relativeTo) {
    let shift = { x: 0, y: 0 };
    if (relativeTo) {
        shift = relativeTo.boxInWindow(this.ownerDocument.defaultView);
    }
    if (typeof x === 'number') {
        this.style.setProperty('left', (shift.x + x) + 'px');
    }
    else {
        this.style.removeProperty('left');
    }
    if (typeof y === 'number') {
        this.style.setProperty('top', (shift.y + y) + 'px');
    }
    else {
        this.style.removeProperty('top');
    }
    if (typeof x === 'number' || typeof y === 'number') {
        this.style.setProperty('position', 'absolute');
    }
    else {
        this.style.removeProperty('position');
    }
};
Node.prototype.enclosingNodeOrSelfWithClass = function (className, stayWithin) {
    return this.enclosingNodeOrSelfWithClassList([className], stayWithin);
};
Node.prototype.enclosingNodeOrSelfWithClassList = function (classNames, stayWithin) {
    for (let node = this; node && node !== stayWithin && node !== this.ownerDocument; node = node.parentNodeOrShadowHost()) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            let containsAll = true;
            for (let i = 0; i < classNames.length && containsAll; ++i) {
                if (!node.classList.contains(classNames[i])) {
                    containsAll = false;
                }
            }
            if (containsAll) {
                return node;
            }
        }
    }
    return null;
};
Node.prototype.parentElementOrShadowHost = function () {
    if (this.nodeType === Node.DOCUMENT_FRAGMENT_NODE && this.host) {
        return this.host;
    }
    const node = this.parentNode;
    if (!node) {
        return null;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        return node;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        return node.host;
    }
    return null;
};
Node.prototype.parentNodeOrShadowHost = function () {
    if (this.parentNode) {
        return this.parentNode;
    }
    if (this.nodeType === Node.DOCUMENT_FRAGMENT_NODE && this.host) {
        return this.host;
    }
    return null;
};
Node.prototype.getComponentSelection = function () {
    let parent = this.parentNode;
    while (parent && parent.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        parent = parent.parentNode;
    }
    return parent instanceof ShadowRoot ? parent.getSelection() : this.window().getSelection();
};
Node.prototype.hasSelection = function () {
    // TODO(luoe): use contains(node, {includeShadow: true}) when it is fixed for shadow dom.
    if (this instanceof Element) {
        const slots = this.querySelectorAll('slot');
        for (const slot of slots) {
            if (Array.prototype.some.call(slot.assignedNodes(), node => node.hasSelection())) {
                return true;
            }
        }
    }
    const selection = this.getComponentSelection();
    if (selection.type !== 'Range') {
        return false;
    }
    return selection.containsNode(this, true) || selection.anchorNode.isSelfOrDescendant(this) ||
        selection.focusNode.isSelfOrDescendant(this);
};
Node.prototype.window = function () {
    return this.ownerDocument.defaultView;
};
Element.prototype.removeChildren = function () {
    if (this.firstChild) {
        this.textContent = '';
    }
};
self.createElement = function (tagName, customElementType) {
    return document.createElement(tagName, { is: customElementType });
};
self.createTextNode = function (data) {
    return document.createTextNode(data);
};
self.createDocumentFragment = function () {
    return document.createDocumentFragment();
};
DocumentFragment.prototype.createChild = Element.prototype.createChild = function (elementName, className) {
    const element = document.createElement(elementName);
    if (className) {
        element.className = className;
    }
    this.appendChild(element);
    return element;
};
self.AnchorBox = class {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
    contains(x, y) {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
    }
    relativeTo(box) {
        return new AnchorBox(this.x - box.x, this.y - box.y, this.width, this.height);
    }
    relativeToElement(element) {
        return this.relativeTo(element.boxInWindow(element.ownerDocument.defaultView));
    }
    equals(anchorBox) {
        return Boolean(anchorBox) && this.x === anchorBox.x && this.y === anchorBox.y && this.width === anchorBox.width &&
            this.height === anchorBox.height;
    }
};
Element.prototype.boxInWindow = function (targetWindow) {
    targetWindow = targetWindow || this.ownerDocument.defaultView;
    const anchorBox = new AnchorBox();
    let curElement = this;
    let curWindow = this.ownerDocument.defaultView;
    while (curWindow && curElement) {
        anchorBox.x += curElement.getBoundingClientRect().left;
        anchorBox.y += curElement.getBoundingClientRect().top;
        if (curWindow === targetWindow) {
            break;
        }
        curElement = curWindow.frameElement;
        curWindow = curWindow.parent;
    }
    anchorBox.width = Math.min(this.offsetWidth, targetWindow.innerWidth - anchorBox.x);
    anchorBox.height = Math.min(this.offsetHeight, targetWindow.innerHeight - anchorBox.y);
    return anchorBox;
};
Event.prototype.consume = function (preventDefault) {
    this.stopImmediatePropagation();
    if (preventDefault) {
        this.preventDefault();
    }
    this.handled = true;
};
Node.prototype.deepTextContent = function (normalizeWhitespace = false) {
    const text = this.childTextNodes().map(node => node.textContent).join('');
    return normalizeWhitespace ? text.replace(/\s+/g, ' ') : text;
};
Node.prototype.childTextNodes = function () {
    let node = this.traverseNextTextNode(this);
    const result = [];
    const nonTextTags = { STYLE: 1, SCRIPT: 1, '#document-fragment': 1 };
    while (node) {
        if (!nonTextTags[node.parentNode ? node.parentNode.nodeName : '']) {
            result.push(node);
        }
        node = node.traverseNextTextNode(this);
    }
    return result;
};
function innerTextDescendants(node) {
    if (![Node.ELEMENT_NODE, Node.TEXT_NODE].includes(node.nodeType) || ['SCRIPT', 'STYLE'].includes(node.nodeName)) {
        return [];
    }
    if (!(node instanceof HTMLElement)) {
        return [node];
    }
    if (node instanceof HTMLSlotElement) {
        return [...node.assignedNodes()].flatMap(innerTextDescendants);
    }
    if (node.shadowRoot) {
        return [...node.shadowRoot.childNodes].flatMap(innerTextDescendants);
    }
    const result = [];
    let expanded = false;
    for (const child of node.childNodes) {
        const childResult = innerTextDescendants(child);
        if (childResult.length > 1 || childResult.length === 1 && childResult[0] !== child) {
            expanded = true;
        }
        result.push(...childResult);
    }
    if (!expanded) {
        return [node];
    }
    return result;
}
Node.prototype.deepInnerText = function () {
    return innerTextDescendants(this)
        .map(n => n instanceof HTMLElement ? n.innerText : n.textContent.trim())
        .filter(Boolean)
        .join('\n');
};
Node.prototype.isAncestor = function (node) {
    if (!node) {
        return false;
    }
    let currentNode = node.parentNodeOrShadowHost();
    while (currentNode) {
        if (this === currentNode) {
            return true;
        }
        currentNode = currentNode.parentNodeOrShadowHost();
    }
    return false;
};
Node.prototype.isDescendant = function (descendant) {
    return Boolean(descendant) && descendant.isAncestor(this);
};
Node.prototype.isSelfOrAncestor = function (node) {
    return Boolean(node) && (node === this || this.isAncestor(node));
};
Node.prototype.isSelfOrDescendant = function (node) {
    return Boolean(node) && (node === this || this.isDescendant(node));
};
Node.prototype.traverseNextNode = function (stayWithin, skipShadowRoot = false) {
    if (!skipShadowRoot && this.shadowRoot) {
        return this.shadowRoot;
    }
    const distributedNodes = this instanceof HTMLSlotElement ? this.assignedNodes() : [];
    if (distributedNodes.length) {
        return distributedNodes[0];
    }
    if (this.firstChild) {
        return this.firstChild;
    }
    let node = this;
    while (node) {
        if (stayWithin && node === stayWithin) {
            return null;
        }
        const sibling = nextSibling(node);
        if (sibling) {
            return sibling;
        }
        node = node.assignedSlot || node.parentNodeOrShadowHost();
    }
    function nextSibling(node) {
        if (!node.assignedSlot) {
            return node.nextSibling;
        }
        const distributedNodes = node.assignedSlot.assignedNodes();
        const position = Array.prototype.indexOf.call(distributedNodes, node);
        if (position + 1 < distributedNodes.length) {
            return distributedNodes[position + 1];
        }
        return null;
    }
    return null;
};
Node.prototype.traversePreviousNode = function (stayWithin) {
    if (stayWithin && this === stayWithin) {
        return null;
    }
    let node = this.previousSibling;
    while (node?.lastChild) {
        node = node.lastChild;
    }
    if (node) {
        return node;
    }
    return this.parentNodeOrShadowHost();
};
Node.prototype.setTextContentTruncatedIfNeeded = function (text, placeholder) {
    // Huge texts in the UI reduce rendering performance drastically.
    // Moreover, Blink/WebKit uses <unsigned short> internally for storing text content
    // length, so texts longer than 65535 are inherently displayed incorrectly.
    const maxTextContentLength = 10000;
    if (typeof text === 'string' && text.length > maxTextContentLength) {
        this.textContent =
            typeof placeholder === 'string' ? placeholder : Platform.StringUtilities.trimMiddle(text, maxTextContentLength);
        return true;
    }
    this.textContent = text;
    return false;
};
Element.prototype.hasFocus = function () {
    const root = this.getComponentRoot();
    return Boolean(root) && this.isSelfOrAncestor(root.activeElement);
};
Node.prototype.getComponentRoot = function () {
    let node = this;
    while (node && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) {
        node = node.parentNode;
    }
    return node;
};
self.onInvokeElement = function (element, callback) {
    element.addEventListener('keydown', event => {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            callback(event);
        }
    });
    element.addEventListener('click', event => callback(event));
};
// DevTools front-end still assumes that
//   classList.toggle('a', undefined) works as
//   classList.toggle('a', false) rather than as
//   classList.toggle('a');
(function () {
    const originalToggle = DOMTokenList.prototype.toggle;
    DOMTokenList.prototype['toggle'] = function (token, force) {
        if (arguments.length === 1) {
            force = !this.contains(token);
        }
        return originalToggle.call(this, token, Boolean(force));
    };
})();
//# sourceMappingURL=DOMExtension.js.map