// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
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
import './Toolbar.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../components/buttons/buttons.js';
import { Icon } from '../kit/kit.js';
import * as Lit from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import { ActionRegistry } from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import checkboxTextLabelStyles from './checkboxTextLabel.css.js';
import confirmDialogStyles from './confirmDialog.css.js';
import { Dialog } from './Dialog.js';
import { appendStyle, deepActiveElement, rangeOfWord } from './DOMUtilities.js';
import { GlassPane } from './GlassPane.js';
import inspectorCommonStyles from './inspectorCommon.css.js';
import { InspectorView } from './InspectorView.js';
import { KeyboardShortcut, Keys } from './KeyboardShortcut.js';
import smallBubbleStyles from './smallBubble.css.js';
import { Tooltip } from './Tooltip.js';
import { Widget } from './Widget.js';
const { Directives, render } = Lit;
const UIStrings = {
    /**
     * @description label to open link externally
     */
    openInNewTab: 'Open in new tab',
    /**
     * @description label to copy link address
     */
    copyLinkAddress: 'Copy link address',
    /**
     * @description label to copy file name
     */
    copyFileName: 'Copy file name',
    /**
     * @description label for the profiler control button
     */
    anotherProfilerIsAlreadyActive: 'Another profiler is already active',
    /**
     * @description Text in UIUtils
     */
    promiseResolvedAsync: 'Promise resolved (async)',
    /**
     * @description Text in UIUtils
     */
    promiseRejectedAsync: 'Promise rejected (async)',
    /**
     * @description Text for the title of asynchronous function calls group in Call Stack
     */
    asyncCall: 'Async Call',
    /**
     * @description Text for the name of anonymous functions
     */
    anonymous: '(anonymous)',
    /**
     * @description Text to close something
     */
    close: 'Close',
    /**
     * @description Text on a button for message dialog
     */
    ok: 'OK',
    /**
     * @description Text to cancel something
     */
    cancel: 'Cancel',
    /**
     * @description Text for the new badge appearing next to some menu items
     */
    new: 'NEW',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/UIUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function installDragHandle(element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay, mouseDownPreventDefault = true) {
    function onMouseDown(event) {
        const dragHandler = new DragHandler();
        const dragStart = () => dragHandler.elementDragStart(element, elementDragStart, elementDrag, elementDragEnd, cursor, event, mouseDownPreventDefault);
        if (startDelay) {
            startTimer = window.setTimeout(dragStart, startDelay);
        }
        else {
            dragStart();
        }
    }
    function onMouseUp() {
        if (startTimer) {
            window.clearTimeout(startTimer);
        }
        startTimer = null;
    }
    let startTimer;
    element.addEventListener('pointerdown', onMouseDown, false);
    if (startDelay) {
        element.addEventListener('pointerup', onMouseUp, false);
    }
    if (hoverCursor !== null) {
        element.style.cursor = hoverCursor || cursor || '';
    }
}
export function elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
    const dragHandler = new DragHandler();
    dragHandler.elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event);
}
class DragHandler {
    glassPaneInUse;
    elementDraggingEventListener;
    elementEndDraggingEventListener;
    dragEventsTargetDocument;
    dragEventsTargetDocumentTop;
    restoreCursorAfterDrag;
    constructor() {
        this.elementDragMove = this.elementDragMove.bind(this);
        this.elementDragEnd = this.elementDragEnd.bind(this);
        this.mouseOutWhileDragging = this.mouseOutWhileDragging.bind(this);
    }
    createGlassPane() {
        this.glassPaneInUse = true;
        if (!DragHandler.glassPaneUsageCount++) {
            DragHandler.glassPane = new GlassPane();
            DragHandler.glassPane.setPointerEventsBehavior("BlockedByGlassPane" /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */);
            if (DragHandler.documentForMouseOut) {
                DragHandler.glassPane.show(DragHandler.documentForMouseOut);
            }
        }
    }
    disposeGlassPane() {
        if (!this.glassPaneInUse) {
            return;
        }
        this.glassPaneInUse = false;
        if (--DragHandler.glassPaneUsageCount) {
            return;
        }
        if (DragHandler.glassPane) {
            DragHandler.glassPane.hide();
            DragHandler.glassPane = null;
        }
        DragHandler.documentForMouseOut = null;
        DragHandler.rootForMouseOut = null;
    }
    elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, ev, preventDefault = true) {
        const event = ev;
        // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
        if (event.button || (Host.Platform.isMac() && event.ctrlKey)) {
            return;
        }
        if (this.elementDraggingEventListener) {
            return;
        }
        if (elementDragStart && !elementDragStart((event))) {
            return;
        }
        const targetDocument = (event.target instanceof Node && event.target.ownerDocument);
        this.elementDraggingEventListener = elementDrag;
        this.elementEndDraggingEventListener = elementDragEnd;
        console.assert((DragHandler.documentForMouseOut || targetDocument) === targetDocument, 'Dragging on multiple documents.');
        DragHandler.documentForMouseOut = targetDocument;
        DragHandler.rootForMouseOut = event.target instanceof Node && event.target.getRootNode() || null;
        this.dragEventsTargetDocument = targetDocument;
        try {
            if (targetDocument.defaultView && targetDocument.defaultView.top) {
                this.dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;
            }
        }
        catch {
            this.dragEventsTargetDocumentTop = this.dragEventsTargetDocument;
        }
        targetDocument.addEventListener('pointermove', this.elementDragMove, true);
        targetDocument.addEventListener('pointerup', this.elementDragEnd, true);
        DragHandler.rootForMouseOut?.addEventListener('pointerout', this.mouseOutWhileDragging, { capture: true });
        if (this.dragEventsTargetDocumentTop && targetDocument !== this.dragEventsTargetDocumentTop) {
            this.dragEventsTargetDocumentTop.addEventListener('pointerup', this.elementDragEnd, true);
        }
        const targetHtmlElement = targetElement;
        if (typeof cursor === 'string') {
            this.restoreCursorAfterDrag = restoreCursor.bind(this, targetHtmlElement.style.cursor);
            targetHtmlElement.style.cursor = cursor;
            targetDocument.body.style.cursor = cursor;
        }
        function restoreCursor(oldCursor) {
            targetDocument.body.style.removeProperty('cursor');
            targetHtmlElement.style.cursor = oldCursor;
            this.restoreCursorAfterDrag = undefined;
        }
        if (preventDefault) {
            event.preventDefault();
        }
    }
    mouseOutWhileDragging() {
        this.unregisterMouseOutWhileDragging();
        this.createGlassPane();
    }
    unregisterMouseOutWhileDragging() {
        if (!DragHandler.rootForMouseOut) {
            return;
        }
        DragHandler.rootForMouseOut.removeEventListener('pointerout', this.mouseOutWhileDragging, { capture: true });
    }
    unregisterDragEvents() {
        if (!this.dragEventsTargetDocument) {
            return;
        }
        this.dragEventsTargetDocument.removeEventListener('pointermove', this.elementDragMove, true);
        this.dragEventsTargetDocument.removeEventListener('pointerup', this.elementDragEnd, true);
        if (this.dragEventsTargetDocumentTop && this.dragEventsTargetDocument !== this.dragEventsTargetDocumentTop) {
            this.dragEventsTargetDocumentTop.removeEventListener('pointerup', this.elementDragEnd, true);
        }
        delete this.dragEventsTargetDocument;
        delete this.dragEventsTargetDocumentTop;
    }
    elementDragMove(event) {
        if (event.buttons !== 1) {
            this.elementDragEnd(event);
            return;
        }
        if (this.elementDraggingEventListener?.(event)) {
            this.cancelDragEvents(event);
        }
    }
    cancelDragEvents(_event) {
        this.unregisterDragEvents();
        this.unregisterMouseOutWhileDragging();
        if (this.restoreCursorAfterDrag) {
            this.restoreCursorAfterDrag();
        }
        this.disposeGlassPane();
        delete this.elementDraggingEventListener;
        delete this.elementEndDraggingEventListener;
    }
    elementDragEnd(event) {
        const elementDragEnd = this.elementEndDraggingEventListener;
        this.cancelDragEvents(event);
        event.preventDefault();
        if (elementDragEnd) {
            elementDragEnd(event);
        }
    }
    static glassPaneUsageCount = 0;
    static glassPane = null;
    static documentForMouseOut = null;
    static rootForMouseOut = null;
}
export function isBeingEdited(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }
    const element = node;
    if (element.classList.contains('text-prompt') || element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
        return true;
    }
    if (!elementsBeingEdited.size) {
        return false;
    }
    let currentElement = element;
    while (currentElement) {
        if (elementsBeingEdited.has(element)) {
            return true;
        }
        currentElement = currentElement.parentElementOrShadowHost();
    }
    return false;
}
export function isEditing() {
    if (elementsBeingEdited.size) {
        return true;
    }
    const focused = deepActiveElement(document);
    if (!focused) {
        return false;
    }
    return focused.classList.contains('text-prompt') || focused.nodeName === 'INPUT' || focused.nodeName === 'TEXTAREA' ||
        (focused.contentEditable === 'true' ||
            focused.contentEditable === 'plaintext-only');
}
export function markBeingEdited(element, value) {
    if (value) {
        if (elementsBeingEdited.has(element)) {
            return false;
        }
        element.classList.add('being-edited');
        elementsBeingEdited.add(element);
    }
    else {
        if (!elementsBeingEdited.has(element)) {
            return false;
        }
        element.classList.remove('being-edited');
        elementsBeingEdited.delete(element);
    }
    return true;
}
const elementsBeingEdited = new Set();
// Avoids Infinity, NaN, and scientific notation (e.g. 1e20), see crbug.com/81165.
const numberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;
export const StyleValueDelimiters = ' \xA0\t\n"\':;,/()';
export function getValueModificationDirection(event) {
    let direction = null;
    if (event instanceof WheelEvent) {
        // When shift is pressed while spinning mousewheel, delta comes as wheelDeltaX.
        if (event.deltaY < 0 || event.deltaX < 0) {
            direction = 'Up';
        }
        else if (event.deltaY > 0 || event.deltaX > 0) {
            direction = 'Down';
        }
    }
    else if (event instanceof MouseEvent) {
        if (event.movementX < 0) {
            direction = 'Down';
        }
        else if (event.movementX > 0) {
            direction = 'Up';
        }
    }
    else if (event instanceof KeyboardEvent) {
        if (event.key === 'ArrowUp' || event.key === 'PageUp') {
            direction = 'Up';
        }
        else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
            direction = 'Down';
        }
    }
    return direction;
}
function modifiedHexValue(hexString, event) {
    const direction = getValueModificationDirection(event);
    if (!direction) {
        return null;
    }
    const mouseEvent = event;
    const number = parseInt(hexString, 16);
    if (isNaN(number) || !isFinite(number)) {
        return null;
    }
    const hexStrLen = hexString.length;
    const channelLen = hexStrLen / 3;
    // Colors are either rgb or rrggbb.
    if (channelLen !== 1 && channelLen !== 2) {
        return null;
    }
    // Precision modifier keys work with both mousewheel and up/down keys.
    // When ctrl is pressed, increase R by 1.
    // When shift is pressed, increase G by 1.
    // When alt is pressed, increase B by 1.
    // If no shortcut keys are pressed then increase hex value by 1.
    // Keys can be pressed together to increase RGB channels. e.g trying different shades.
    let delta = 0;
    if (KeyboardShortcut.eventHasCtrlEquivalentKey(mouseEvent)) {
        delta += Math.pow(16, channelLen * 2);
    }
    if (mouseEvent.shiftKey) {
        delta += Math.pow(16, channelLen);
    }
    if (mouseEvent.altKey) {
        delta += 1;
    }
    if (delta === 0) {
        delta = 1;
    }
    if (direction === 'Down') {
        delta *= -1;
    }
    // Increase hex value by 1 and clamp from 0 ... maxValue.
    const maxValue = Math.pow(16, hexStrLen) - 1;
    const result = Platform.NumberUtilities.clamp(number + delta, 0, maxValue);
    // Ensure the result length is the same as the original hex value.
    let resultString = result.toString(16).toUpperCase();
    for (let i = 0, lengthDelta = hexStrLen - resultString.length; i < lengthDelta; ++i) {
        resultString = '0' + resultString;
    }
    return resultString;
}
export function modifiedFloatNumber(number, event, modifierMultiplier, range) {
    const direction = getValueModificationDirection(event);
    if (!direction) {
        return null;
    }
    const mouseEvent = event;
    // Precision modifier keys work with both mousewheel and up/down keys.
    // When ctrl is pressed, increase by 100.
    // When shift is pressed, increase by 10.
    // When alt is pressed, increase by 0.1.
    // Otherwise increase by 1.
    let delta = mouseEvent.type === 'mousemove' ? Math.abs(mouseEvent.movementX) : 1;
    if (KeyboardShortcut.eventHasCtrlEquivalentKey(mouseEvent)) {
        delta *= 100;
    }
    else if (mouseEvent.shiftKey) {
        delta *= 10;
    }
    else if (mouseEvent.altKey) {
        delta *= 0.1;
    }
    if (direction === 'Down') {
        delta *= -1;
    }
    if (modifierMultiplier) {
        delta *= modifierMultiplier;
    }
    // Make the new number and constrain it to a precision of 6, this matches numbers the engine returns.
    // Use the Number constructor to forget the fixed precision, so 1.100000 will print as 1.1.
    let result = Number((number + delta).toFixed(6));
    if (range?.min !== undefined) {
        result = Math.max(result, range.min);
    }
    if (range?.max !== undefined) {
        result = Math.min(result, range.max);
    }
    if (!String(result).match(numberRegex)) {
        return null;
    }
    return result;
}
export function createReplacementString(wordString, event, customNumberHandler, stepping) {
    let prefix;
    let suffix;
    let number;
    let replacementString = null;
    let matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
    if (matches?.length) {
        prefix = matches[1];
        suffix = matches[3];
        number = modifiedHexValue(matches[2], event);
        if (number !== null) {
            replacementString = prefix + number + suffix;
        }
    }
    else {
        matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
        if (matches?.length) {
            prefix = matches[1];
            suffix = matches[3];
            number = modifiedFloatNumber(parseFloat(matches[2]), event, stepping?.step, stepping?.range);
            if (number !== null) {
                replacementString =
                    customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
            }
        }
    }
    return replacementString;
}
export function isElementValueModification(event) {
    if (event instanceof MouseEvent) {
        const { type } = event;
        return type === 'mousemove' || type === 'wheel';
    }
    if (event instanceof KeyboardEvent) {
        const { key } = event;
        return key === 'ArrowUp' || key === 'ArrowDown' || key === 'PageUp' || key === 'PageDown';
    }
    return false;
}
export function handleElementValueModifications(event, element, finishHandler, suggestionHandler, customNumberHandler) {
    if (!isElementValueModification(event)) {
        return false;
    }
    void VisualLogging.logKeyDown(event.currentTarget, event, 'element-value-modification');
    const selection = element.getComponentSelection();
    if (!selection?.rangeCount) {
        return false;
    }
    const selectionRange = selection.getRangeAt(0);
    if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element)) {
        return false;
    }
    const originalValue = element.textContent;
    const wordRange = rangeOfWord(selectionRange.startContainer, selectionRange.startOffset, StyleValueDelimiters, element);
    const wordString = wordRange.toString();
    if (suggestionHandler?.(wordString)) {
        return false;
    }
    const replacementString = createReplacementString(wordString, event, customNumberHandler);
    if (replacementString) {
        const replacementTextNode = document.createTextNode(replacementString);
        wordRange.deleteContents();
        wordRange.insertNode(replacementTextNode);
        const finalSelectionRange = document.createRange();
        finalSelectionRange.setStart(replacementTextNode, 0);
        finalSelectionRange.setEnd(replacementTextNode, replacementString.length);
        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);
        event.handled = true;
        event.preventDefault();
        if (finishHandler) {
            finishHandler(originalValue || '', replacementString);
        }
        return true;
    }
    return false;
}
export function openLinkExternallyLabel() {
    return i18nString(UIStrings.openInNewTab);
}
export function copyLinkAddressLabel() {
    return i18nString(UIStrings.copyLinkAddress);
}
export function copyFileNameLabel() {
    return i18nString(UIStrings.copyFileName);
}
export function anotherProfilerActiveLabel() {
    return i18nString(UIStrings.anotherProfilerIsAlreadyActive);
}
export function asyncStackTraceLabel(description, previousCallFrames) {
    if (description) {
        if (description === 'Promise.resolve') {
            return i18nString(UIStrings.promiseResolvedAsync);
        }
        if (description === 'Promise.reject') {
            return i18nString(UIStrings.promiseRejectedAsync);
        }
        if (description === 'await' && previousCallFrames.length !== 0) {
            const lastPreviousFrame = previousCallFrames[previousCallFrames.length - 1];
            const lastPreviousFrameName = beautifyFunctionName(lastPreviousFrame.functionName);
            description = `await in ${lastPreviousFrameName}`;
        }
        return description;
    }
    return i18nString(UIStrings.asyncCall);
}
export function addPlatformClass(element) {
    element.classList.add('platform-' + Host.Platform.platform());
}
export function installComponentRootStyles(element) {
    appendStyle(element, inspectorCommonStyles);
    appendStyle(element, Buttons.textButtonStyles);
    // Detect overlay scrollbar enable by checking for nonzero scrollbar width.
    if (!Host.Platform.isMac() && measuredScrollbarWidth(element.ownerDocument) === 0) {
        element.classList.add('overlay-scrollbar-enabled');
    }
}
function windowFocused(document, event) {
    if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
        document.body.classList.remove('inactive');
    }
}
function windowBlurred(document, event) {
    if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
        document.body.classList.add('inactive');
    }
}
export class ElementFocusRestorer {
    element;
    previous;
    constructor(element) {
        this.element = element;
        this.previous = deepActiveElement(element.ownerDocument);
        element.focus();
    }
    restore() {
        if (!this.element) {
            return;
        }
        if (this.element.hasFocus() && this.previous) {
            this.previous.focus();
        }
        this.previous = null;
        this.element = null;
    }
}
export function runCSSAnimationOnce(element, className) {
    function animationEndCallback() {
        element.classList.remove(className);
        element.removeEventListener('webkitAnimationEnd', animationEndCallback, false);
        element.removeEventListener('animationcancel', animationEndCallback, false);
    }
    if (element.classList.contains(className)) {
        element.classList.remove(className);
    }
    element.addEventListener('webkitAnimationEnd', animationEndCallback, false);
    element.addEventListener('animationcancel', animationEndCallback, false);
    element.classList.add(className);
}
export function measurePreferredSize(element, containerElement) {
    const oldParent = element.parentElement;
    const oldNextSibling = element.nextSibling;
    containerElement = containerElement || element.ownerDocument.body;
    containerElement.appendChild(element);
    element.positionAt(0, 0);
    const result = element.getBoundingClientRect();
    element.positionAt(undefined, undefined);
    if (oldParent) {
        oldParent.insertBefore(element, oldNextSibling);
    }
    else {
        element.remove();
    }
    return new Geometry.Size(result.width, result.height);
}
class InvokeOnceHandlers {
    handlers;
    autoInvoke;
    constructor(autoInvoke) {
        this.handlers = null;
        this.autoInvoke = autoInvoke;
    }
    add(object, method) {
        if (!this.handlers) {
            this.handlers = new Map();
            if (this.autoInvoke) {
                this.scheduleInvoke();
            }
        }
        let methods = this.handlers.get(object);
        if (!methods) {
            methods = new Set();
            this.handlers.set(object, methods);
        }
        methods.add(method);
    }
    scheduleInvoke() {
        if (this.handlers) {
            requestAnimationFrame(this.invoke.bind(this));
        }
    }
    invoke() {
        const handlers = this.handlers;
        this.handlers = null;
        if (handlers) {
            for (const [object, methods] of handlers) {
                for (const method of methods) {
                    method.call(object);
                }
            }
        }
    }
}
let coalescingLevel = 0;
let postUpdateHandlers = null;
export function startBatchUpdate() {
    if (!coalescingLevel++) {
        postUpdateHandlers = new InvokeOnceHandlers(false);
    }
}
export function endBatchUpdate() {
    if (--coalescingLevel) {
        return;
    }
    if (postUpdateHandlers) {
        postUpdateHandlers.scheduleInvoke();
        postUpdateHandlers = null;
    }
}
export function animateFunction(window, func, params, duration, animationComplete) {
    const start = window.performance.now();
    let raf = window.requestAnimationFrame(animationStep);
    function animationStep(timestamp) {
        const progress = Platform.NumberUtilities.clamp((timestamp - start) / duration, 0, 1);
        func(...params.map(p => p.from + (p.to - p.from) * progress));
        if (progress < 1) {
            raf = window.requestAnimationFrame(animationStep);
        }
        else if (animationComplete) {
            animationComplete();
        }
    }
    return () => window.cancelAnimationFrame(raf);
}
export class LongClickController {
    element;
    callback;
    editKey;
    longClickData;
    longClickInterval;
    constructor(element, callback, isEditKeyFunc = (event) => Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        this.element = element;
        this.callback = callback;
        this.editKey = isEditKeyFunc;
        this.enable();
    }
    reset() {
        if (this.longClickInterval) {
            clearInterval(this.longClickInterval);
            delete this.longClickInterval;
        }
    }
    enable() {
        if (this.longClickData) {
            return;
        }
        const boundKeyDown = keyDown.bind(this);
        const boundKeyUp = keyUp.bind(this);
        const boundMouseDown = mouseDown.bind(this);
        const boundMouseUp = mouseUp.bind(this);
        const boundReset = this.reset.bind(this);
        this.element.addEventListener('keydown', boundKeyDown, false);
        this.element.addEventListener('keyup', boundKeyUp, false);
        this.element.addEventListener('pointerdown', boundMouseDown, false);
        this.element.addEventListener('pointerout', boundReset, false);
        this.element.addEventListener('pointerup', boundMouseUp, false);
        this.element.addEventListener('click', boundReset, true);
        this.longClickData = { mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset };
        function keyDown(e) {
            if (this.editKey(e)) {
                const callback = this.callback;
                this.longClickInterval = window.setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
            }
        }
        function keyUp(e) {
            if (this.editKey(e)) {
                this.reset();
            }
        }
        function mouseDown(e) {
            if (e.which !== 1) {
                return;
            }
            const callback = this.callback;
            this.longClickInterval = window.setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
        }
        function mouseUp(e) {
            if (e.which !== 1) {
                return;
            }
            this.reset();
        }
    }
    dispose() {
        if (!this.longClickData) {
            return;
        }
        this.element.removeEventListener('pointerdown', this.longClickData.mouseDown, false);
        this.element.removeEventListener('pointerout', this.longClickData.reset, false);
        this.element.removeEventListener('pointerup', this.longClickData.mouseUp, false);
        this.element.addEventListener('click', this.longClickData.reset, true);
        delete this.longClickData;
    }
    static TIME_MS = 200;
}
export function initializeUIUtils(document) {
    document.body.classList.toggle('inactive', !document.hasFocus());
    if (document.defaultView) {
        document.defaultView.addEventListener('focus', windowFocused.bind(undefined, document), false);
        document.defaultView.addEventListener('blur', windowBlurred.bind(undefined, document), false);
    }
    document.addEventListener('focus', focusChanged.bind(undefined), true);
    const body = document.body;
    GlassPane.setContainer(body);
}
export function beautifyFunctionName(name) {
    return name || i18nString(UIStrings.anonymous);
}
export const createTextChild = (element, text) => {
    const textNode = element.ownerDocument.createTextNode(text);
    element.appendChild(textNode);
    return textNode;
};
export const createTextChildren = (element, ...childrenText) => {
    for (const child of childrenText) {
        createTextChild(element, child);
    }
};
export function createTextButton(text, clickHandler, opts) {
    const button = new Buttons.Button.Button();
    if (opts?.className) {
        button.className = opts.className;
    }
    button.textContent = text;
    button.iconName = opts?.icon;
    button.variant = opts?.variant ? opts.variant : "outlined" /* Buttons.Button.Variant.OUTLINED */;
    if (clickHandler) {
        button.addEventListener('click', clickHandler);
        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === 'Space') {
                // Make sure we don't propagate 'Enter' or 'Space' key events to parents,
                // so that these get turned into 'click' events properly.
                event.stopImmediatePropagation();
            }
        });
    }
    if (opts?.jslogContext) {
        button.setAttribute('jslog', `${VisualLogging.action().track({ click: true }).context(opts.jslogContext)}`);
    }
    if (opts?.title) {
        button.setAttribute('title', opts.title);
    }
    button.type = 'button';
    return button;
}
export function createInput(className, type, jslogContext) {
    const element = document.createElement('input');
    if (className) {
        element.className = className;
    }
    element.spellcheck = false;
    element.classList.add('harmony-input');
    if (type) {
        element.type = type;
    }
    if (jslogContext) {
        element.setAttribute('jslog', `${VisualLogging.textField().track({ keydown: 'Enter', change: true }).context(jslogContext)}`);
    }
    return element;
}
export function createHistoryInput(type = 'search', className) {
    const history = [''];
    let historyPosition = 0;
    const historyInput = document.createElement('input');
    historyInput.type = type;
    if (className) {
        historyInput.className = className;
    }
    historyInput.addEventListener('input', onInput, false);
    historyInput.addEventListener('keydown', onKeydown, false);
    return historyInput;
    function onInput(_event) {
        if (history.length === historyPosition + 1) {
            history[historyPosition] = historyInput.value;
        }
    }
    function onKeydown(event) {
        if (event.keyCode === Keys.Up.code) {
            historyPosition = Math.max(historyPosition - 1, 0);
            historyInput.value = history[historyPosition];
            historyInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            event.consume(true);
        }
        else if (event.keyCode === Keys.Down.code) {
            historyPosition = Math.min(historyPosition + 1, history.length - 1);
            historyInput.value = history[historyPosition];
            historyInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            event.consume(true);
        }
        else if (event.keyCode === Keys.Enter.code) {
            if (history.length > 1 && history[history.length - 2] === historyInput.value) {
                return;
            }
            history[history.length - 1] = historyInput.value;
            historyPosition = history.length - 1;
            history.push('');
        }
    }
}
export function createSelect(name, options) {
    const select = document.createElement('select');
    ARIAUtils.setLabel(select, name);
    for (const option of options) {
        if (option instanceof Map) {
            for (const [key, value] of option) {
                const optGroup = select.createChild('optgroup');
                optGroup.label = key;
                for (const child of value) {
                    if (typeof child === 'string') {
                        optGroup.appendChild(createOption(child, child, Platform.StringUtilities.toKebabCase(child)));
                    }
                }
            }
        }
        else if (typeof option === 'string') {
            select.add(createOption(option, option, Platform.StringUtilities.toKebabCase(option)));
        }
    }
    return select;
}
export function createOption(title, value, jslogContext) {
    const result = new Option(title, value || title);
    if (jslogContext) {
        result.setAttribute('jslog', `${VisualLogging.item(jslogContext).track({ click: true })}`);
    }
    return result;
}
export function createLabel(title, className, associatedControl) {
    const element = document.createElement('label');
    if (className) {
        element.className = className;
    }
    element.textContent = title;
    if (associatedControl) {
        ARIAUtils.bindLabelToControl(element, associatedControl);
    }
    return element;
}
export function createIconLabel(options) {
    const element = document.createElement('dt-icon-label');
    if (options.title) {
        element.createChild('span').textContent = options.title;
    }
    element.data = {
        iconName: options.iconName,
        color: options.color ?? 'var(--icon-default)',
        width: options.width ?? '14px',
        height: options.height ?? '14px',
    };
    return element;
}
/**
 * Creates a radio button, which is comprised of a `<label>` and an `<input type="radio">` element.
 *
 * The returned pair contains the `label` element and and the `radio` input element. The latter is
 * a child of the `label`, and therefore no association via `for` attribute is necessary to make
 * the radio button accessible.
 *
 * The element is automatically styled correctly, as long as the core styles (in particular
 * `inspectorCommon.css` is injected into the current document / shadow root). The lit
 * equivalent of calling this method is:
 *
 * ```js
 * const jslog = VisualLogging.toggle().track({change: true}).context(jslogContext);
 * html`<label><input type="radio" name=${name} jslog=${jslog}>${title}</label>`
 * ```
 *
 * @param name the name of the radio group.
 * @param title the label text for the radio button.
 * @param jslogContext the context string for the `jslog` attribute.
 * @returns the pair of `HTMLLabelElement` and `HTMLInputElement`.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio
 */
export function createRadioButton(name, title, jslogContext) {
    const label = document.createElement('label');
    const radio = label.createChild('input');
    radio.type = 'radio';
    radio.name = name;
    radio.setAttribute('jslog', `${VisualLogging.toggle().track({ change: true }).context(jslogContext)}`);
    createTextChild(label, title);
    return { label, radio };
}
/**
 * Creates an `<input type="range">` element with the specified parameters (a slider)
 * and a `step` of 1 (the default for the element).
 *
 * The element is automatically styled correctly, as long as the core styles (in particular
 * `inspectorCommon.css` is injected into the current document / shadow root). The lit
 * equivalent of calling this method is:
 *
 * ```js
 * html`<input type="range" min=${min} max=${max} tabindex=${tabIndex}>`
 * ```
 *
 * @param min the minimum allowed value.
 * @param max the maximum allowed value.
 * @param tabIndex the value for the `tabindex` attribute.
 * @returns the newly created `HTMLInputElement` for the slider.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range
 */
export function createSlider(min, max, tabIndex) {
    const element = document.createElement('input');
    element.type = 'range';
    element.min = String(min);
    element.max = String(max);
    element.tabIndex = tabIndex;
    return element;
}
export function setTitle(element, title) {
    ARIAUtils.setLabel(element, title);
    Tooltip.install(element, title);
}
export class CheckboxLabel extends HTMLElement {
    static observedAttributes = ['checked', 'disabled', 'indeterminate', 'name', 'title', 'aria-label'];
    #shadowRoot;
    #checkboxElement;
    #textElement;
    constructor() {
        super();
        CheckboxLabel.lastId = CheckboxLabel.lastId + 1;
        const id = 'ui-checkbox-label' + CheckboxLabel.lastId;
        this.#shadowRoot = createShadowRootWithCoreStyles(this, { cssFile: checkboxTextLabelStyles, delegatesFocus: true });
        this.#checkboxElement = this.#shadowRoot.createChild('input');
        this.#checkboxElement.type = 'checkbox';
        this.#checkboxElement.setAttribute('id', id);
        // Change event is not composable, so it doesn't bubble up through the shadow root.
        this.#checkboxElement.addEventListener('change', () => this.dispatchEvent(new Event('change')));
        this.#textElement = this.#shadowRoot.createChild('label', 'devtools-checkbox-text');
        this.#textElement.setAttribute('for', id);
        // Click events are composable, so both label and checkbox bubble up through the shadow root.
        // However, clicking the label, also triggers the checkbox click, so we stop the label event
        // propagation here to avoid duplicate events.
        this.#textElement.addEventListener('click', e => e.stopPropagation());
        this.#textElement.createChild('slot');
    }
    static create(title, checked, subtitle, jslogContext, small) {
        const element = document.createElement('devtools-checkbox');
        element.#checkboxElement.checked = Boolean(checked);
        if (jslogContext) {
            element.#checkboxElement.setAttribute('jslog', `${VisualLogging.toggle().track({ change: true }).context(jslogContext)}`);
        }
        if (title !== undefined) {
            element.#textElement.textContent = title;
            element.#checkboxElement.title = title;
            if (subtitle !== undefined) {
                element.#textElement.createChild('div', 'devtools-checkbox-subtitle').textContent = subtitle;
            }
        }
        element.#checkboxElement.classList.toggle('small', small);
        return element;
    }
    attributeChangedCallback(name, _oldValue, newValue) {
        if (name === 'checked') {
            this.#checkboxElement.checked = newValue !== null;
        }
        else if (name === 'disabled') {
            this.#checkboxElement.disabled = newValue !== null;
        }
        else if (name === 'indeterminate') {
            this.#checkboxElement.indeterminate = newValue !== null;
        }
        else if (name === 'name') {
            this.#checkboxElement.name = newValue ?? '';
        }
        else if (name === 'title') {
            this.#checkboxElement.title = newValue ?? '';
            this.#textElement.title = newValue ?? '';
        }
        else if (name === 'aria-label') {
            this.#checkboxElement.ariaLabel = newValue;
        }
    }
    getLabelText() {
        return this.#textElement.textContent;
    }
    setLabelText(content) {
        this.#textElement.textContent = content;
    }
    get ariaLabel() {
        return this.#checkboxElement.ariaLabel;
    }
    set ariaLabel(ariaLabel) {
        this.setAttribute('aria-label', ariaLabel);
    }
    get checked() {
        return this.#checkboxElement.checked;
    }
    set checked(checked) {
        this.toggleAttribute('checked', checked);
    }
    set disabled(disabled) {
        this.toggleAttribute('disabled', disabled);
    }
    get disabled() {
        return this.#checkboxElement.disabled;
    }
    set indeterminate(indeterminate) {
        this.toggleAttribute('indeterminate', indeterminate);
    }
    get indeterminate() {
        return this.#checkboxElement.indeterminate;
    }
    set title(title) {
        this.setAttribute('title', title);
    }
    get title() {
        return this.#checkboxElement.title;
    }
    set name(name) {
        this.setAttribute('name', name);
    }
    get name() {
        return this.#checkboxElement.name;
    }
    click() {
        this.#checkboxElement.click();
    }
    /** Only to be used when the checkbox label is 'generated' (a regex, a className, etc). Most checkboxes should be create()'d with UIStrings */
    static createWithStringLiteral(title, checked, jslogContext, small) {
        const stringLiteral = title;
        return CheckboxLabel.create(stringLiteral, checked, undefined, jslogContext, small);
    }
    static lastId = 0;
}
customElements.define('devtools-checkbox', CheckboxLabel);
export class DevToolsIconLabel extends HTMLElement {
    #icon;
    constructor() {
        super();
        const root = createShadowRootWithCoreStyles(this);
        this.#icon = new Icon();
        this.#icon.style.setProperty('margin-right', '4px');
        this.#icon.style.setProperty('vertical-align', 'baseline');
        root.appendChild(this.#icon);
        root.createChild('slot');
    }
    set data(data) {
        this.#icon.data = data;
        // TODO(crbug.com/1427397): Clean this up. This was necessary so `DevToolsIconLabel` can use Lit icon
        //    while being backwards-compatible with the legacy Icon while working for both small and large icons.
        if (data.height === '14px') {
            this.#icon.style.setProperty('margin-bottom', '-2px');
        }
        else if (data.height === '20px') {
            this.#icon.style.setProperty('margin-bottom', '2px');
        }
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('dt-icon-label', DevToolsIconLabel);
export class DevToolsSmallBubble extends HTMLElement {
    textElement;
    constructor() {
        super();
        const root = createShadowRootWithCoreStyles(this, { cssFile: smallBubbleStyles });
        this.textElement = root.createChild('div');
        this.textElement.className = 'info';
        this.textElement.createChild('slot');
    }
    set type(type) {
        this.textElement.className = type;
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('dt-small-bubble', DevToolsSmallBubble);
export class DevToolsCloseButton extends HTMLElement {
    #button;
    constructor() {
        super();
        const root = createShadowRootWithCoreStyles(this);
        this.#button = new Buttons.Button.Button();
        this.#button.data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName: 'cross' };
        this.#button.classList.add('close-button');
        this.#button.setAttribute('jslog', `${VisualLogging.close().track({ click: true })}`);
        Tooltip.install(this.#button, i18nString(UIStrings.close));
        ARIAUtils.setLabel(this.#button, i18nString(UIStrings.close));
        root.appendChild(this.#button);
    }
    setAccessibleName(name) {
        ARIAUtils.setLabel(this.#button, name);
    }
    setSize(size) {
        this.#button.size = size;
    }
    setTabbable(tabbable) {
        if (tabbable) {
            this.#button.tabIndex = 0;
        }
        else {
            this.#button.tabIndex = -1;
        }
    }
    focus() {
        this.#button.focus();
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('dt-close-button', DevToolsCloseButton);
export function bindInput(input, apply, validate, numeric, modifierMultiplier) {
    input.addEventListener('change', onChange, false);
    input.addEventListener('input', onInput, false);
    input.addEventListener('keydown', onKeyDown, false);
    input.addEventListener('focus', input.select.bind(input), false);
    function onInput() {
        input.classList.toggle('error-input', !validate(input.value));
    }
    function onChange() {
        const valid = validate(input.value);
        input.classList.toggle('error-input', !valid);
        if (valid) {
            apply(input.value);
        }
    }
    function onKeyDown(event) {
        if (event.key === 'Enter') {
            const valid = validate(input.value);
            if (valid) {
                apply(input.value);
            }
            event.preventDefault();
            return;
        }
        if (!numeric) {
            return;
        }
        const value = modifiedFloatNumber(parseFloat(input.value), event, modifierMultiplier);
        if (value === null) {
            return;
        }
        const stringValue = String(value);
        const valid = validate(stringValue);
        if (valid) {
            setValue(stringValue);
        }
        event.preventDefault();
    }
    function setValue(value) {
        if (value === input.value) {
            return;
        }
        const valid = validate(value);
        input.classList.toggle('error-input', !valid);
        input.value = value;
    }
    return setValue;
}
export function trimText(context, text, maxWidth, trimFunction) {
    const maxLength = 200;
    if (maxWidth <= 10) {
        return '';
    }
    if (text.length > maxLength) {
        text = trimFunction(text, maxLength);
    }
    const textWidth = measureTextWidth(context, text);
    if (textWidth <= maxWidth) {
        return text;
    }
    let l = 0;
    let r = text.length;
    let lv = 0;
    let rv = textWidth;
    while (l < r && lv !== rv && lv !== maxWidth) {
        const m = Math.ceil(l + (r - l) * (maxWidth - lv) / (rv - lv));
        const mv = measureTextWidth(context, trimFunction(text, m));
        if (mv <= maxWidth) {
            l = m;
            lv = mv;
        }
        else {
            r = m - 1;
            rv = mv;
        }
    }
    text = trimFunction(text, l);
    return text !== '…' ? text : '';
}
export function trimTextMiddle(context, text, maxWidth) {
    return trimText(context, text, maxWidth, (text, width) => Platform.StringUtilities.trimMiddle(text, width));
}
export function trimTextEnd(context, text, maxWidth) {
    return trimText(context, text, maxWidth, (text, width) => Platform.StringUtilities.trimEndWithMaxLength(text, width));
}
export function measureTextWidth(context, text) {
    const maxCacheableLength = 200;
    if (text.length > maxCacheableLength) {
        return context.measureText(text).width;
    }
    if (!measureTextWidthCache) {
        measureTextWidthCache = new Map();
    }
    const font = context.font;
    let textWidths = measureTextWidthCache.get(font);
    if (!textWidths) {
        textWidths = new Map();
        measureTextWidthCache.set(font, textWidths);
    }
    let width = textWidths.get(text);
    if (!width) {
        width = context.measureText(text).width;
        textWidths.set(text, width);
    }
    return width;
}
let measureTextWidthCache = null;
export function loadImage(url) {
    return new Promise(fulfill => {
        const image = new Image();
        image.addEventListener('load', () => fulfill(image));
        image.addEventListener('error', () => fulfill(null));
        image.src = url;
    });
}
/**
 * Creates a file selector element.
 * @param callback the function that will be called with the file the user selected
 * @param accept optionally used to set the [`accept`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept) parameter to limit file-types the user can pick.
 */
export function createFileSelectorElement(callback, accept) {
    const fileSelectorElement = document.createElement('input');
    fileSelectorElement.type = 'file';
    if (accept) {
        fileSelectorElement.setAttribute('accept', accept);
    }
    fileSelectorElement.style.display = 'none';
    fileSelectorElement.tabIndex = -1;
    fileSelectorElement.addEventListener('change', () => {
        if (fileSelectorElement.files?.length) {
            callback(fileSelectorElement.files[0]);
        }
    });
    fileSelectorElement.addEventListener('click', () => {
        fileSelectorElement.value = '';
    });
    return fileSelectorElement;
}
export const MaxLengthForDisplayedURLs = 150;
export class MessageDialog {
    static async show(header, message, where, jslogContext) {
        const dialog = new Dialog(jslogContext);
        dialog.setSizeBehavior("MeasureContent" /* SizeBehavior.MEASURE_CONTENT */);
        dialog.setDimmed(true);
        const shadowRoot = createShadowRootWithCoreStyles(dialog.contentElement, { cssFile: confirmDialogStyles });
        const content = shadowRoot.createChild('div', 'widget');
        await new Promise(resolve => {
            const okButton = createTextButton(i18nString(UIStrings.ok), resolve, { jslogContext: 'confirm', variant: "primary" /* Buttons.Button.Variant.PRIMARY */ });
            content.createChild('span', 'header').textContent = header;
            content.createChild('div', 'message').createChild('span').textContent = message;
            content.createChild('div', 'button').appendChild(okButton);
            dialog.setOutsideClickCallback(event => {
                event.consume();
                resolve(undefined);
            });
            dialog.show(where);
            okButton.focus();
        });
        dialog.hide();
    }
}
export class ConfirmDialog {
    static async show(message, header, where, options) {
        const dialog = new Dialog(options?.jslogContext);
        dialog.setSizeBehavior("MeasureContent" /* SizeBehavior.MEASURE_CONTENT */);
        dialog.setDimmed(true);
        ARIAUtils.setLabel(dialog.contentElement, message);
        const shadowRoot = createShadowRootWithCoreStyles(dialog.contentElement, { cssFile: confirmDialogStyles });
        const content = shadowRoot.createChild('div', 'widget');
        if (header) {
            content.createChild('span', 'header').textContent = header;
        }
        content.createChild('div', 'message').createChild('span').textContent = message;
        const buttonsBar = content.createChild('div', 'button');
        const result = await new Promise(resolve => {
            const okButton = createTextButton(
            /* text= */ options?.okButtonLabel || i18nString(UIStrings.ok), /* clickHandler= */ () => resolve(true), { jslogContext: 'confirm', variant: "primary" /* Buttons.Button.Variant.PRIMARY */ });
            buttonsBar.appendChild(okButton);
            buttonsBar.appendChild(createTextButton(options?.cancelButtonLabel || i18nString(UIStrings.cancel), () => resolve(false), { jslogContext: 'cancel' }));
            dialog.setOutsideClickCallback(event => {
                event.consume();
                resolve(false);
            });
            dialog.show(where);
            okButton.focus();
        });
        dialog.hide();
        return result;
    }
}
export class Renderer {
    static async render(object, options) {
        if (!object) {
            throw new Error('Can\'t render ' + object);
        }
        const extension = getApplicableRegisteredRenderers(object)[0];
        if (!extension) {
            return null;
        }
        const renderer = await extension.loadRenderer();
        return await renderer.render(object, options);
    }
}
export function formatTimestamp(timestamp, full) {
    const date = new Date(timestamp);
    const yymmdd = date.getFullYear() + '-' + leadZero(date.getMonth() + 1, 2) + '-' + leadZero(date.getDate(), 2);
    const hhmmssfff = leadZero(date.getHours(), 2) + ':' + leadZero(date.getMinutes(), 2) + ':' +
        leadZero(date.getSeconds(), 2) + '.' + leadZero(date.getMilliseconds(), 3);
    return full ? (yymmdd + ' ' + hhmmssfff) : hhmmssfff;
    function leadZero(value, length) {
        const valueString = String(value);
        return valueString.padStart(length, '0');
    }
}
export const isScrolledToBottom = (element) => {
    // This code works only for 0-width border.
    // The scrollTop, clientHeight and scrollHeight are computed in double values internally.
    // However, they are exposed to javascript differently, each being either rounded (via
    // round, ceil or floor functions) or left intouch.
    // This adds up a total error up to 2.
    return Math.abs(element.scrollTop + element.clientHeight - element.scrollHeight) <= 2;
};
export function createSVGChild(element, childType, className) {
    const child = element.ownerDocument.createElementNS('http://www.w3.org/2000/svg', childType);
    if (className) {
        child.setAttribute('class', className);
    }
    element.appendChild(child);
    return child;
}
export const enclosingNodeOrSelfWithNodeNameInArray = (initialNode, nameArray) => {
    let node = initialNode;
    for (; node && node !== initialNode.ownerDocument; node = node.parentNodeOrShadowHost()) {
        for (let i = 0; i < nameArray.length; ++i) {
            if (node.nodeName.toLowerCase() === nameArray[i].toLowerCase()) {
                return node;
            }
        }
    }
    return null;
};
export const enclosingNodeOrSelfWithNodeName = function (node, nodeName) {
    return enclosingNodeOrSelfWithNodeNameInArray(node, [nodeName]);
};
export const deepElementFromPoint = (document, x, y) => {
    let container = document;
    let node = null;
    while (container) {
        const innerNode = container.elementFromPoint(x, y);
        if (!innerNode || node === innerNode) {
            break;
        }
        node = innerNode;
        container = node.shadowRoot;
    }
    return node;
};
export const deepElementFromEvent = (ev) => {
    const event = ev;
    // Some synthetic events have zero coordinates which lead to a wrong element.
    // Better return nothing in this case.
    if (!event.which && !event.pageX && !event.pageY && !event.clientX && !event.clientY && !event.movementX &&
        !event.movementY) {
        return null;
    }
    const root = event.target && event.target.getComponentRoot();
    return root ? deepElementFromPoint(root, event.pageX, event.pageY) : null;
};
const registeredRenderers = [];
export function registerRenderer(registration) {
    registeredRenderers.push(registration);
}
export function getApplicableRegisteredRenderers(object) {
    return registeredRenderers.filter(isRendererApplicableToContextTypes);
    function isRendererApplicableToContextTypes(rendererRegistration) {
        if (!rendererRegistration.contextTypes) {
            return true;
        }
        for (const contextType of rendererRegistration.contextTypes()) {
            if (object instanceof contextType) {
                return true;
            }
        }
        return false;
    }
}
function updateWidgetfocusWidgetForNode(node) {
    while (node) {
        if (Widget.get(node)) {
            break;
        }
        node = node.parentNodeOrShadowHost();
    }
    if (!node) {
        return;
    }
    let widget = Widget.get(node);
    while (widget?.parentWidget()) {
        const parentWidget = widget.parentWidget();
        if (!parentWidget) {
            break;
        }
        parentWidget.setDefaultFocusedChild(widget);
        widget = parentWidget;
    }
}
function focusChanged(event) {
    const target = event.target;
    const document = target ? target.ownerDocument : null;
    const element = document ? deepActiveElement(document) : null;
    updateWidgetfocusWidgetForNode(element);
}
/**
 * Creates a new shadow DOM tree with the core styles and an optional list of
 * additional styles, and attaches it to the specified `element`.
 *
 * @param element the `Element` to attach the shadow DOM tree to.
 * @param options optional additional style sheets and options for `Element#attachShadow()`.
 * @returns the newly created `ShadowRoot`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
 */
export function createShadowRootWithCoreStyles(element, options = {
    delegatesFocus: undefined,
    cssFile: undefined,
}) {
    const { cssFile, delegatesFocus } = options;
    const shadowRoot = element.attachShadow({ mode: 'open', delegatesFocus });
    appendStyle(shadowRoot, inspectorCommonStyles, Buttons.textButtonStyles);
    if (Array.isArray(cssFile)) {
        appendStyle(shadowRoot, ...cssFile);
    }
    else if (cssFile) {
        appendStyle(shadowRoot, cssFile);
    }
    shadowRoot.addEventListener('focus', focusChanged, true);
    return shadowRoot;
}
let cachedMeasuredScrollbarWidth;
export function resetMeasuredScrollbarWidthForTest() {
    cachedMeasuredScrollbarWidth = undefined;
}
export function measuredScrollbarWidth(document) {
    if (typeof cachedMeasuredScrollbarWidth === 'number') {
        return cachedMeasuredScrollbarWidth;
    }
    if (!document) {
        return 16;
    }
    const scrollDiv = document.createElement('div');
    const innerDiv = document.createElement('div');
    scrollDiv.setAttribute('style', 'display: block; width: 100px; height: 100px; overflow: scroll;');
    innerDiv.setAttribute('style', 'height: 200px');
    scrollDiv.appendChild(innerDiv);
    document.body.appendChild(scrollDiv);
    cachedMeasuredScrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return cachedMeasuredScrollbarWidth;
}
const MAX_DISPLAY_COUNT = 10;
// 60 days in ms
const MAX_DURATION = 60 * 24 * 60 * 60 * 1000;
const MAX_INTERACTION_COUNT = 2;
export class PromotionManager {
    static #instance;
    static instance() {
        if (!PromotionManager.#instance) {
            PromotionManager.#instance = new PromotionManager();
        }
        return PromotionManager.#instance;
    }
    getPromotionDisplayState(id) {
        const displayStateString = localStorage.getItem(id);
        return displayStateString ? JSON.parse(displayStateString) : null;
    }
    setPromotionDisplayState(id, promotionDisplayState) {
        localStorage.setItem(id, JSON.stringify(promotionDisplayState));
    }
    registerPromotion(id) {
        this.setPromotionDisplayState(id, {
            displayCount: 0,
            firstRegistered: Date.now(),
            featureInteractionCount: 0,
        });
    }
    recordPromotionShown(id) {
        const displayState = this.getPromotionDisplayState(id);
        if (!displayState) {
            throw new Error(`Cannot record promotion shown for unregistered promotion ${id}`);
        }
        this.setPromotionDisplayState(id, {
            ...displayState,
            displayCount: displayState.displayCount + 1,
        });
    }
    canShowPromotion(id) {
        const displayState = this.getPromotionDisplayState(id);
        if (!displayState) {
            this.registerPromotion(id);
            return true;
        }
        return displayState.displayCount < MAX_DISPLAY_COUNT && Date.now() - displayState.firstRegistered < MAX_DURATION &&
            displayState.featureInteractionCount < MAX_INTERACTION_COUNT;
    }
    recordFeatureInteraction(id) {
        const displayState = this.getPromotionDisplayState(id);
        if (!displayState) {
            throw new Error(`Cannot record feature interaction for unregistered promotion ${id}`);
        }
        this.setPromotionDisplayState(id, {
            ...displayState,
            featureInteractionCount: displayState.featureInteractionCount + 1,
        });
    }
    maybeShowPromotion(id) {
        if (this.canShowPromotion(id)) {
            this.recordPromotionShown(id);
            return true;
        }
        return false;
    }
}
/**
 * Creates a `<div>` element with the localized text NEW.
 *
 * The element is automatically styled correctly, as long as the core styles (in particular
 * `inspectorCommon.css` is injected into the current document / shadow root). The lit
 * equivalent of calling this method is:
 *
 * ```js
 * const jslog = VisualLogging.badge('new-badge');
 * html`<div class='new-badge' jsog=${jslog}>i18nString(UIStrings.new)</div>`
 *
 * @returns the newly created `HTMLDivElement` for the new badge.
 */
export function maybeCreateNewBadge(promotionId) {
    const promotionManager = PromotionManager.instance();
    if (promotionManager.maybeShowPromotion(promotionId)) {
        const badge = document.createElement('div');
        badge.className = 'new-badge';
        badge.textContent = i18nString(UIStrings.new);
        badge.setAttribute('jslog', `${VisualLogging.badge('new-badge')}`);
        return badge;
    }
    return undefined;
}
export function bindToAction(actionName) {
    const action = ActionRegistry.instance().getAction(actionName);
    let setEnabled;
    let toggled;
    function actionEnabledChanged(event) {
        setEnabled(event.data);
    }
    return Directives.ref((e) => {
        if (!e || !(e instanceof Buttons.Button.Button)) {
            action.removeEventListener("Enabled" /* ActionRegistration.Events.ENABLED */, actionEnabledChanged);
            action.removeEventListener("Toggled" /* ActionRegistration.Events.TOGGLED */, toggled);
            return;
        }
        setEnabled = enabled => {
            e.disabled = !enabled;
        };
        action.addEventListener("Enabled" /* ActionRegistration.Events.ENABLED */, actionEnabledChanged);
        const toggleable = action.toggleable();
        const title = action.title();
        const iconName = action.icon() ?? '';
        const jslogContext = action.id();
        const toggledIconName = action.toggledIcon() ?? iconName;
        const toggleType = action.toggleWithRedColor() ? "red-toggle" /* Buttons.Button.ToggleType.RED */ : "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */;
        if (e.childNodes.length) {
            e.jslogContext = jslogContext;
        }
        else if (toggleable) {
            toggled = () => {
                e.toggled = action.toggled();
                if (action.title()) {
                    e.title = action.title();
                    Tooltip.installWithActionBinding(e, action.title(), action.id());
                }
            };
            action.addEventListener("Toggled" /* ActionRegistration.Events.TOGGLED */, toggled);
            e.data = {
                jslogContext,
                title,
                variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
                iconName,
                toggledIconName,
                toggleType,
                toggled: action.toggled(),
            };
            toggled();
        }
        else if (iconName) {
            e.data = { iconName, jslogContext, title, variant: "icon" /* Buttons.Button.Variant.ICON */ };
        }
        else {
            e.data = { jslogContext, title, variant: "text" /* Buttons.Button.Variant.TEXT */ };
        }
        setEnabled(action.enabled());
        e.onclick = () => action.execute();
    });
}
export class InterceptBindingDirective extends Lit.Directive.Directive {
    static #interceptedBindings = new WeakMap();
    update(part, [listener]) {
        if (part.type !== Lit.Directive.PartType.EVENT) {
            return listener;
        }
        let eventListeners = InterceptBindingDirective.#interceptedBindings.get(part.element);
        if (!eventListeners) {
            eventListeners = new Map();
            InterceptBindingDirective.#interceptedBindings.set(part.element, eventListeners);
        }
        eventListeners.set(part.name, listener);
        return this.render(listener);
    }
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */
    render(_listener) {
        return undefined;
    }
    static attachEventListeners(templateElement, renderedElement) {
        const eventListeners = InterceptBindingDirective.#interceptedBindings.get(templateElement);
        if (!eventListeners) {
            return;
        }
        for (const [name, listener] of eventListeners) {
            renderedElement.addEventListener(name, listener);
        }
    }
}
export const cloneCustomElement = (element, deep) => {
    const clone = document.createElement(element.localName);
    for (const attribute of element.attributes) {
        clone.setAttribute(attribute.name, attribute.value);
    }
    if (deep) {
        for (const child of element.childNodes) {
            clone.appendChild(child.cloneNode(deep));
        }
    }
    return clone;
};
export class HTMLElementWithLightDOMTemplate extends HTMLElement {
    #mutationObserver = new MutationObserver(this.#onChange.bind(this));
    #contentTemplate = null;
    constructor() {
        super();
        this.#mutationObserver.observe(this, { childList: true, attributes: true, subtree: true, characterData: true });
    }
    static cloneNode(node) {
        const clone = node.cloneNode(false);
        for (const child of node.childNodes) {
            clone.appendChild(HTMLElementWithLightDOMTemplate.cloneNode(child));
        }
        if (node instanceof Element && clone instanceof Element) {
            InterceptBindingDirective.attachEventListeners(node, clone);
        }
        return clone;
    }
    static patchLitTemplate(template) {
        const wrapper = Lit.Directive.directive(InterceptBindingDirective);
        if (template === Lit.nothing) {
            return;
        }
        template.values = template.values.map(patchValue);
        function isLitTemplate(value) {
            return Boolean(typeof value === 'object' && value && '_$litType$' in value && 'strings' in value && 'values' in value &&
                value['_$litType$'] === 1);
        }
        function patchValue(value) {
            if (typeof value === 'function') {
                try {
                    return wrapper(value);
                }
                catch {
                    return value;
                }
            }
            if (isLitTemplate(value)) {
                HTMLElementWithLightDOMTemplate.patchLitTemplate(value);
                return value;
            }
            if (Array.isArray(value)) {
                return value.map(patchValue);
            }
            return value;
        }
    }
    get templateRoot() {
        return this.#contentTemplate?.content ?? this;
    }
    set template(template) {
        if (!this.#contentTemplate) {
            this.removeChildren();
            this.#contentTemplate = this.createChild('template');
            this.#mutationObserver.disconnect();
            this.#mutationObserver.observe(this.#contentTemplate.content, { childList: true, attributes: true, subtree: true, characterData: true });
        }
        HTMLElementWithLightDOMTemplate.patchLitTemplate(template);
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        render(template, this.#contentTemplate.content);
    }
    #onChange(mutationList) {
        this.onChange(mutationList);
        for (const mutation of mutationList) {
            this.removeNodes(mutation.removedNodes);
            this.addNodes(mutation.addedNodes, mutation.nextSibling);
            this.updateNode(mutation.target, mutation.attributeName);
        }
    }
    onChange(_mutationList) {
    }
    updateNode(_node, _attributeName) {
    }
    addNodes(_nodes, _nextSibling) {
    }
    removeNodes(_nodes) {
    }
    static findCorrespondingElement(sourceElement, sourceRootElement, targetRootElement) {
        let currentElement = sourceElement;
        const childIndexesOnPathToRoot = [];
        while (currentElement?.parentElement && currentElement !== sourceRootElement) {
            childIndexesOnPathToRoot.push([...currentElement.parentElement.children].indexOf(currentElement));
            currentElement = currentElement.parentElement;
        }
        if (!currentElement) {
            return null;
        }
        let targetElement = targetRootElement;
        for (const index of childIndexesOnPathToRoot.reverse()) {
            targetElement = targetElement.children[index];
        }
        return targetElement;
    }
}
/**
 * @param text Text to copy to clipboard
 * @param alert Message to send for a11y only required if there
 * were other UI changes that visually indicated this copy happened.
 */
export function copyTextToClipboard(text, alert) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text);
    if (alert) {
        ARIAUtils.LiveAnnouncer.alert(alert);
    }
}
export function getDevToolsBoundingElement() {
    return InspectorView.maybeGetInspectorViewInstance()?.element || document.body;
}
/**
 * @deprecated Prefer {@link bindToSetting} as this function leaks the checkbox via the setting listener.
 */
export const bindCheckbox = function (input, setting, metric) {
    const setValue = bindCheckboxImpl(input, setting.set.bind(setting), metric);
    setting.addChangeListener(event => setValue(event.data));
    setValue(setting.get());
};
export const bindCheckboxImpl = function (input, apply, metric) {
    input.addEventListener('change', onInputChanged, false);
    function onInputChanged() {
        apply(input.checked);
        if (input.checked && metric?.enable) {
            Host.userMetrics.actionTaken(metric.enable);
        }
        if (!input.checked && metric?.disable) {
            Host.userMetrics.actionTaken(metric.disable);
        }
        if (metric?.toggle) {
            Host.userMetrics.actionTaken(metric.toggle);
        }
    }
    return function setValue(value) {
        if (value !== input.checked) {
            input.checked = value;
        }
    };
};
export const bindToSetting = (settingOrName, stringValidator) => {
    const setting = typeof settingOrName === 'string' ?
        Common.Settings.Settings.instance().moduleSetting(settingOrName) :
        settingOrName;
    // We can't use `setValue` as the change listener directly, otherwise we won't
    // be able to remove it again.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let setValue;
    function settingChanged() {
        setValue(setting.get());
    }
    if (setting.type() === "boolean" /* Common.Settings.SettingType.BOOLEAN */ || typeof setting.defaultValue === 'boolean') {
        return Directives.ref(e => {
            if (e === undefined) {
                setting.removeChangeListener(settingChanged);
                return;
            }
            setting.addChangeListener(settingChanged);
            setValue =
                bindCheckboxImpl(e, setting.set.bind(setting));
            setValue(setting.get());
        });
    }
    if (setting.type() === "regex" /* Common.Settings.SettingType.REGEX */ || setting instanceof Common.Settings.RegExpSetting) {
        return Directives.ref(e => {
            if (e === undefined) {
                setting.removeChangeListener(settingChanged);
                return;
            }
            setting.addChangeListener(settingChanged);
            setValue = bindInput(e, setting.set.bind(setting), (value) => {
                try {
                    new RegExp(value);
                    return true;
                }
                catch {
                    return false;
                }
            }, /* numeric */ false);
            setValue(setting.get());
        });
    }
    if (typeof setting.defaultValue === 'string') {
        return Directives.ref(e => {
            if (e === undefined) {
                setting.removeChangeListener(settingChanged);
                return;
            }
            setting.addChangeListener(settingChanged);
            setValue = bindInput(e, setting.set.bind(setting), stringValidator ?? (() => true), /* numeric */ false);
            setValue(setting.get());
        });
    }
    throw new Error(`Cannot infer type for setting  '${setting.name}'`);
};
//# sourceMappingURL=UIUtils.js.map