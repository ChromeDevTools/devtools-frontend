// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

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

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Buttons from '../components/buttons/buttons.js';
import * as IconButton from '../components/icon_button/icon_button.js';
import * as Lit from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ActionRegistration from './ActionRegistration.js';
import {ActionRegistry} from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import checkboxTextLabelStyles from './checkboxTextLabel.css.js';
import confirmDialogStyles from './confirmDialog.css.js';
import {Dialog} from './Dialog.js';
import {GlassPane, PointerEventsBehavior, SizeBehavior} from './GlassPane.js';
import inlineButtonStyles from './inlineButton.css.js';
import inspectorCommonStyles from './inspectorCommon.css.js';
import {KeyboardShortcut, Keys} from './KeyboardShortcut.js';
import smallBubbleStyles from './smallBubble.css.js';
import type {ToolbarButton} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {Widget} from './Widget.js';
import type {XWidget} from './XWidget.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-checkbox': CheckboxLabel;
    'dt-close-button': DevToolsCloseButton;
    'dt-icon-label': DevToolsIconLabel;
    'dt-small-bubble': DevToolsSmallBubble;
  }
}
const {Directives, render} = Lit;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/UIUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const highlightedSearchResultClassName = 'highlighted-search-result';
export const highlightedCurrentSearchResultClassName = 'current-search-result';

export function installDragHandle(
    element: Element, elementDragStart: ((arg0: MouseEvent) => boolean)|null, elementDrag: (arg0: MouseEvent) => void,
    elementDragEnd: ((arg0: MouseEvent) => void)|null, cursor: string|null, hoverCursor?: string|null,
    startDelay?: number, mouseDownPreventDefault = true): void {
  function onMouseDown(event: Event): void {
    const dragHandler = new DragHandler();
    const dragStart = (): void => dragHandler.elementDragStart(
        element, elementDragStart, elementDrag, elementDragEnd, cursor, event, mouseDownPreventDefault);
    if (startDelay) {
      startTimer = window.setTimeout(dragStart, startDelay);
    } else {
      dragStart();
    }
  }

  function onMouseUp(): void {
    if (startTimer) {
      window.clearTimeout(startTimer);
    }
    startTimer = null;
  }

  let startTimer: number|null;
  element.addEventListener('pointerdown', onMouseDown, false);
  if (startDelay) {
    element.addEventListener('pointerup', onMouseUp, false);
  }
  if (hoverCursor !== null) {
    (element as HTMLElement).style.cursor = hoverCursor || cursor || '';
  }
}

export function elementDragStart(
    targetElement: Element, elementDragStart: ((arg0: MouseEvent) => boolean)|null,
    elementDrag: (arg0: MouseEvent) => void, elementDragEnd: ((arg0: MouseEvent) => void)|null, cursor: string|null,
    event: Event): void {
  const dragHandler = new DragHandler();
  dragHandler.elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event);
}

class DragHandler {
  private glassPaneInUse?: boolean;
  private elementDraggingEventListener?: ((arg0: MouseEvent) => void|boolean);
  private elementEndDraggingEventListener?: ((arg0: MouseEvent) => void)|null;
  private dragEventsTargetDocument?: Document;
  private dragEventsTargetDocumentTop?: Document;
  private restoreCursorAfterDrag?: (() => void);

  constructor() {
    this.elementDragMove = this.elementDragMove.bind(this);
    this.elementDragEnd = this.elementDragEnd.bind(this);
    this.mouseOutWhileDragging = this.mouseOutWhileDragging.bind(this);
  }

  private createGlassPane(): void {
    this.glassPaneInUse = true;
    if (!DragHandler.glassPaneUsageCount++) {
      DragHandler.glassPane = new GlassPane();
      DragHandler.glassPane.setPointerEventsBehavior(PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
      if (DragHandler.documentForMouseOut) {
        DragHandler.glassPane.show(DragHandler.documentForMouseOut);
      }
    }
  }

  private disposeGlassPane(): void {
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

  elementDragStart(
      targetElement: Element, elementDragStart: ((arg0: MouseEvent) => boolean)|null,
      elementDrag: (arg0: MouseEvent) => void|boolean, elementDragEnd: ((arg0: MouseEvent) => void)|null,
      cursor: string|null, ev: Event, preventDefault = true): void {
    const event = (ev as MouseEvent);
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

    const targetDocument = (event.target instanceof Node && event.target.ownerDocument) as Document;
    this.elementDraggingEventListener = elementDrag;
    this.elementEndDraggingEventListener = elementDragEnd;
    console.assert(
        (DragHandler.documentForMouseOut || targetDocument) === targetDocument, 'Dragging on multiple documents.');
    DragHandler.documentForMouseOut = targetDocument;
    DragHandler.rootForMouseOut = event.target instanceof Node && event.target.getRootNode() || null;
    this.dragEventsTargetDocument = targetDocument;
    try {
      if (targetDocument.defaultView && targetDocument.defaultView.top) {
        this.dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;
      }
    } catch {
      this.dragEventsTargetDocumentTop = this.dragEventsTargetDocument;
    }

    targetDocument.addEventListener('pointermove', this.elementDragMove, true);
    targetDocument.addEventListener('pointerup', this.elementDragEnd, true);
    DragHandler.rootForMouseOut?.addEventListener('pointerout', this.mouseOutWhileDragging, {capture: true});
    if (this.dragEventsTargetDocumentTop && targetDocument !== this.dragEventsTargetDocumentTop) {
      this.dragEventsTargetDocumentTop.addEventListener('pointerup', this.elementDragEnd, true);
    }

    const targetHtmlElement = (targetElement as HTMLElement);
    if (typeof cursor === 'string') {
      this.restoreCursorAfterDrag = restoreCursor.bind(this, targetHtmlElement.style.cursor);
      targetHtmlElement.style.cursor = cursor;
      targetDocument.body.style.cursor = cursor;
    }
    function restoreCursor(this: DragHandler, oldCursor: string): void {
      targetDocument.body.style.removeProperty('cursor');
      targetHtmlElement.style.cursor = oldCursor;
      this.restoreCursorAfterDrag = undefined;
    }

    if (preventDefault) {
      event.preventDefault();
    }
  }

  private mouseOutWhileDragging(): void {
    this.unregisterMouseOutWhileDragging();
    this.createGlassPane();
  }

  private unregisterMouseOutWhileDragging(): void {
    if (!DragHandler.rootForMouseOut) {
      return;
    }
    DragHandler.rootForMouseOut.removeEventListener('pointerout', this.mouseOutWhileDragging, {capture: true});
  }

  private unregisterDragEvents(): void {
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

  private elementDragMove(event: MouseEvent): void {
    if (event.buttons !== 1) {
      this.elementDragEnd(event);
      return;
    }
    if (this.elementDraggingEventListener?.(event)) {
      this.cancelDragEvents(event);
    }
  }

  private cancelDragEvents(_event: Event): void {
    this.unregisterDragEvents();
    this.unregisterMouseOutWhileDragging();

    if (this.restoreCursorAfterDrag) {
      this.restoreCursorAfterDrag();
    }

    this.disposeGlassPane();

    delete this.elementDraggingEventListener;
    delete this.elementEndDraggingEventListener;
  }

  private elementDragEnd(event: Event): void {
    const elementDragEnd = this.elementEndDraggingEventListener;
    this.cancelDragEvents((event as MouseEvent));
    event.preventDefault();
    if (elementDragEnd) {
      elementDragEnd((event as MouseEvent));
    }
  }

  private static glassPaneUsageCount = 0;
  private static glassPane: GlassPane|null = null;
  private static documentForMouseOut: Document|null = null;
  private static rootForMouseOut: Node|null = null;
}

export function isBeingEdited(node?: Node|null): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const element = (node as Element);
  if (element.classList.contains('text-prompt') || element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
    return true;
  }

  if (!elementsBeingEdited.size) {
    return false;
  }

  let currentElement: (Element|null)|Element = element;
  while (currentElement) {
    if (elementsBeingEdited.has(element)) {
      return true;
    }
    currentElement = currentElement.parentElementOrShadowHost();
  }
  return false;
}

export function isEditing(): boolean {
  if (elementsBeingEdited.size) {
    return true;
  }

  const focused = Platform.DOMUtilities.deepActiveElement(document);
  if (!focused) {
    return false;
  }
  return focused.classList.contains('text-prompt') || focused.nodeName === 'INPUT' || focused.nodeName === 'TEXTAREA' ||
      ((focused as HTMLElement).contentEditable === 'true' ||
       (focused as HTMLElement).contentEditable === 'plaintext-only');
}

export function markBeingEdited(element: Element, value: boolean): boolean {
  if (value) {
    if (elementsBeingEdited.has(element)) {
      return false;
    }
    element.classList.add('being-edited');
    elementsBeingEdited.add(element);
  } else {
    if (!elementsBeingEdited.has(element)) {
      return false;
    }
    element.classList.remove('being-edited');
    elementsBeingEdited.delete(element);
  }
  return true;
}

const elementsBeingEdited = new Set<Element>();

// Avoids Infinity, NaN, and scientific notation (e.g. 1e20), see crbug.com/81165.
const numberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;

export const StyleValueDelimiters = ' \xA0\t\n"\':;,/()';

export function getValueModificationDirection(event: Event): string|null {
  let direction: 'Up'|'Down'|null = null;
  if (event instanceof WheelEvent) {
    // When shift is pressed while spinning mousewheel, delta comes as wheelDeltaX.
    if (event.deltaY < 0 || event.deltaX < 0) {
      direction = 'Up';
    } else if (event.deltaY > 0 || event.deltaX > 0) {
      direction = 'Down';
    }
  } else if (event instanceof MouseEvent) {
    if (event.movementX < 0) {
      direction = 'Down';
    } else if (event.movementX > 0) {
      direction = 'Up';
    }
  } else if (event instanceof KeyboardEvent) {
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      direction = 'Up';
    } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      direction = 'Down';
    }
  }

  return direction;
}

function modifiedHexValue(hexString: string, event: Event): string|null {
  const direction = getValueModificationDirection(event);
  if (!direction) {
    return null;
  }

  const mouseEvent = (event as MouseEvent);
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

export function modifiedFloatNumber(
    number: number, event: Event, modifierMultiplier?: number, range?: {min?: number, max?: number}): number|null {
  const direction = getValueModificationDirection(event);
  if (!direction) {
    return null;
  }

  const mouseEvent = (event as MouseEvent);

  // Precision modifier keys work with both mousewheel and up/down keys.
  // When ctrl is pressed, increase by 100.
  // When shift is pressed, increase by 10.
  // When alt is pressed, increase by 0.1.
  // Otherwise increase by 1.
  let delta = mouseEvent.type === 'mousemove' ? Math.abs(mouseEvent.movementX) : 1;
  if (KeyboardShortcut.eventHasCtrlEquivalentKey(mouseEvent)) {
    delta *= 100;
  } else if (mouseEvent.shiftKey) {
    delta *= 10;
  } else if (mouseEvent.altKey) {
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

export function createReplacementString(
    wordString: string, event: Event,
    customNumberHandler?: ((prefix: string, number: number, suffix: string) => string),
    stepping?: {step?: number, range?: {min?: number, max?: number}}): string|null {
  let prefix;
  let suffix;
  let number;
  let replacementString: string|null = null;
  let matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
  if (matches?.length) {
    prefix = matches[1];
    suffix = matches[3];
    number = modifiedHexValue(matches[2], event);
    if (number !== null) {
      replacementString = prefix + number + suffix;
    }
  } else {
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

export function isElementValueModification(event: Event): boolean {
  if (event instanceof MouseEvent) {
    const {type} = event;
    return type === 'mousemove' || type === 'wheel';
  }
  if (event instanceof KeyboardEvent) {
    const {key} = event;
    return key === 'ArrowUp' || key === 'ArrowDown' || key === 'PageUp' || key === 'PageDown';
  }
  return false;
}

export function handleElementValueModifications(
    event: Event, element: Element, finishHandler?: ((arg0: string, arg1: string) => void),
    suggestionHandler?: ((arg0: string) => boolean),
    customNumberHandler?: ((arg0: string, arg1: number, arg2: string) => string)): boolean {
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
  const wordRange = Platform.DOMUtilities.rangeOfWord(
      selectionRange.startContainer, selectionRange.startOffset, StyleValueDelimiters, element);
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

export function openLinkExternallyLabel(): string {
  return i18nString(UIStrings.openInNewTab);
}

export function copyLinkAddressLabel(): string {
  return i18nString(UIStrings.copyLinkAddress);
}

export function copyFileNameLabel(): string {
  return i18nString(UIStrings.copyFileName);
}

export function anotherProfilerActiveLabel(): string {
  return i18nString(UIStrings.anotherProfilerIsAlreadyActive);
}

export function asyncStackTraceLabel(
    description: string|undefined, previousCallFrames: Array<{functionName: string}>): string {
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

export function addPlatformClass(element: HTMLElement): void {
  element.classList.add('platform-' + Host.Platform.platform());
}

export function installComponentRootStyles(element: HTMLElement): void {
  Platform.DOMUtilities.appendStyle(element, inspectorCommonStyles);
  Platform.DOMUtilities.appendStyle(element, Buttons.textButtonStyles);

  // Detect overlay scrollbar enable by checking for nonzero scrollbar width.
  if (!Host.Platform.isMac() && measuredScrollbarWidth(element.ownerDocument) === 0) {
    element.classList.add('overlay-scrollbar-enabled');
  }
}

function windowFocused(document: Document, event: Event): void {
  if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document.body.classList.remove('inactive');
  }
}

function windowBlurred(document: Document, event: Event): void {
  if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document.body.classList.add('inactive');
  }
}

export class ElementFocusRestorer {
  private element: HTMLElement|null;
  private previous: HTMLElement|null;
  constructor(element: Element) {
    this.element = (element as HTMLElement | null);
    this.previous = (Platform.DOMUtilities.deepActiveElement(element.ownerDocument) as HTMLElement | null);
    (element as HTMLElement).focus();
  }

  restore(): void {
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

export function highlightSearchResult(
    element: Element, offset: number, length: number, domChanges?: HighlightChange[]): Element|null {
  const result = highlightSearchResults(element, [new TextUtils.TextRange.SourceRange(offset, length)], domChanges);
  return result.length ? result[0] : null;
}

export function highlightSearchResults(
    element: Element, resultRanges: TextUtils.TextRange.SourceRange[], changes?: HighlightChange[]): Element[] {
  return highlightRangesWithStyleClass(element, resultRanges, highlightedSearchResultClassName, changes);
}

export function runCSSAnimationOnce(element: Element, className: string): void {
  function animationEndCallback(): void {
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

export function highlightRangesWithStyleClass(
    element: Element, resultRanges: TextUtils.TextRange.SourceRange[], styleClass: string,
    changes?: HighlightChange[]): Element[] {
  changes = changes || [];
  const highlightNodes: Element[] = [];
  const textNodes = element.childTextNodes();
  const lineText = textNodes
                       .map(function(node) {
                         return node.textContent;
                       })
                       .join('');
  const ownerDocument = element.ownerDocument;

  if (textNodes.length === 0) {
    return highlightNodes;
  }

  const nodeRanges: TextUtils.TextRange.SourceRange[] = [];
  let rangeEndOffset = 0;
  for (const textNode of textNodes) {
    const range =
        new TextUtils.TextRange.SourceRange(rangeEndOffset, textNode.textContent ? textNode.textContent.length : 0);
    rangeEndOffset = range.offset + range.length;
    nodeRanges.push(range);
  }

  let startIndex = 0;
  for (let i = 0; i < resultRanges.length; ++i) {
    const startOffset = resultRanges[i].offset;
    const endOffset = startOffset + resultRanges[i].length;

    while (startIndex < textNodes.length &&
           nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset) {
      startIndex++;
    }
    let endIndex = startIndex;
    while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset) {
      endIndex++;
    }
    if (endIndex === textNodes.length) {
      break;
    }

    const highlightNode = ownerDocument.createElement('span');
    highlightNode.className = styleClass;
    highlightNode.textContent = lineText.substring(startOffset, endOffset);

    const lastTextNode = textNodes[endIndex];
    const lastText = lastTextNode.textContent || '';
    lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
    changes.push({
      node: (lastTextNode as Element),
      type: 'changed',
      oldText: lastText,
      newText: lastTextNode.textContent,
      nextSibling: undefined,
      parent: undefined,
    });

    if (startIndex === endIndex && lastTextNode.parentElement) {
      lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
      changes.push({
        node: highlightNode,
        type: 'added',
        nextSibling: lastTextNode,
        parent: lastTextNode.parentElement,
        oldText: undefined,
        newText: undefined,
      });
      highlightNodes.push(highlightNode);

      const prefixNode =
          ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
      lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
      changes.push({
        node: prefixNode,
        type: 'added',
        nextSibling: highlightNode,
        parent: lastTextNode.parentElement,
        oldText: undefined,
        newText: undefined,
      });
    } else {
      const firstTextNode = textNodes[startIndex];
      const firstText = firstTextNode.textContent || '';
      const anchorElement = firstTextNode.nextSibling;

      if (firstTextNode.parentElement) {
        firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
        changes.push({
          node: highlightNode,
          type: 'added',
          nextSibling: anchorElement || undefined,
          parent: firstTextNode.parentElement,
          oldText: undefined,
          newText: undefined,
        });
        highlightNodes.push(highlightNode);
      }

      firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
      changes.push({
        node: (firstTextNode as Element),
        type: 'changed',
        oldText: firstText,
        newText: firstTextNode.textContent,
        nextSibling: undefined,
        parent: undefined,
      });

      for (let j = startIndex + 1; j < endIndex; j++) {
        const textNode = textNodes[j];
        const text = textNode.textContent;
        textNode.textContent = '';
        changes.push({
          node: (textNode as Element),
          type: 'changed',
          oldText: text || undefined,
          newText: textNode.textContent,
          nextSibling: undefined,
          parent: undefined,
        });
      }
    }
    startIndex = endIndex;
    nodeRanges[startIndex].offset = endOffset;
    nodeRanges[startIndex].length = lastTextNode.textContent.length;
  }
  return highlightNodes;
}

// Used in chromium/src/third_party/blink/web_tests/http/tests/devtools/components/utilities-highlight-results.js
export function applyDomChanges(domChanges: HighlightChange[]): void {
  for (let i = 0, size = domChanges.length; i < size; ++i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case 'added':
        entry.parent?.insertBefore(entry.node, entry.nextSibling ?? null);
        break;
      case 'changed':
        entry.node.textContent = entry.newText ?? null;
        break;
    }
  }
}

export function revertDomChanges(domChanges: HighlightChange[]): void {
  for (let i = domChanges.length - 1; i >= 0; --i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case 'added':
        entry.node.remove();
        break;
      case 'changed':
        entry.node.textContent = entry.oldText ?? null;
        break;
    }
  }
}

export function measurePreferredSize(element: Element, containerElement?: Element|null): Geometry.Size {
  const oldParent = element.parentElement;
  const oldNextSibling = element.nextSibling;
  containerElement = containerElement || element.ownerDocument.body;
  containerElement.appendChild(element);
  element.positionAt(0, 0);
  const result = element.getBoundingClientRect();

  element.positionAt(undefined, undefined);
  if (oldParent) {
    oldParent.insertBefore(element, oldNextSibling);
  } else {
    element.remove();
  }
  return new Geometry.Size(result.width, result.height);
}

class InvokeOnceHandlers {
  private handlers: Map<object, Set<(...args: any[]) => void>>|null;
  private readonly autoInvoke: boolean;
  constructor(autoInvoke: boolean) {
    this.handlers = null;
    this.autoInvoke = autoInvoke;
  }

  add(object: Object, method: () => void): void {
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
  scheduleInvoke(): void {
    if (this.handlers) {
      requestAnimationFrame(this.invoke.bind(this));
    }
  }

  private invoke(): void {
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
let postUpdateHandlers: InvokeOnceHandlers|null = null;

export function startBatchUpdate(): void {
  if (!coalescingLevel++) {
    postUpdateHandlers = new InvokeOnceHandlers(false);
  }
}

export function endBatchUpdate(): void {
  if (--coalescingLevel) {
    return;
  }

  if (postUpdateHandlers) {
    postUpdateHandlers.scheduleInvoke();
    postUpdateHandlers = null;
  }
}

export function animateFunction(
    window: Window, func: (...args: any[]) => void, params: Array<{
      from: number,
      to: number,
    }>,
    duration: number, animationComplete?: (() => void)): () => void {
  const start = window.performance.now();
  let raf = window.requestAnimationFrame(animationStep);

  function animationStep(timestamp: number): void {
    const progress = Platform.NumberUtilities.clamp((timestamp - start) / duration, 0, 1);
    func(...params.map(p => p.from + (p.to - p.from) * progress));
    if (progress < 1) {
      raf = window.requestAnimationFrame(animationStep);
    } else if (animationComplete) {
      animationComplete();
    }
  }

  return () => window.cancelAnimationFrame(raf);
}

export class LongClickController {
  private readonly element: Element;
  private readonly callback: (arg0: Event) => void;
  private readonly editKey: (arg0: KeyboardEvent) => boolean;
  private longClickData!: {
    mouseUp: (arg0: Event) => void,
    mouseDown: (arg0: Event) => void,
    reset: () => void,
  }|undefined;
  private longClickInterval!: number|undefined;

  constructor(
      element: Element, callback: (arg0: Event) => void,
      isEditKeyFunc: (arg0: KeyboardEvent) => boolean = (event):
          boolean => Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
    this.element = element;
    this.callback = callback;
    this.editKey = isEditKeyFunc;
    this.enable();
  }

  reset(): void {
    if (this.longClickInterval) {
      clearInterval(this.longClickInterval);
      delete this.longClickInterval;
    }
  }

  private enable(): void {
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

    this.longClickData = {mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset};

    function keyDown(this: LongClickController, e: Event): void {
      if (this.editKey(e as KeyboardEvent)) {
        const callback = this.callback;
        this.longClickInterval = window.setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
      }
    }

    function keyUp(this: LongClickController, e: Event): void {
      if (this.editKey(e as KeyboardEvent)) {
        this.reset();
      }
    }

    function mouseDown(this: LongClickController, e: Event): void {
      if ((e as MouseEvent).which !== 1) {
        return;
      }
      const callback = this.callback;
      this.longClickInterval = window.setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
    }

    function mouseUp(this: LongClickController, e: Event): void {
      if ((e as MouseEvent).which !== 1) {
        return;
      }
      this.reset();
    }
  }

  dispose(): void {
    if (!this.longClickData) {
      return;
    }
    this.element.removeEventListener('pointerdown', this.longClickData.mouseDown, false);
    this.element.removeEventListener('pointerout', this.longClickData.reset, false);
    this.element.removeEventListener('pointerup', this.longClickData.mouseUp, false);
    this.element.addEventListener('click', this.longClickData.reset, true);
    delete this.longClickData;
  }

  static readonly TIME_MS = 200;
}

export function initializeUIUtils(document: Document): void {
  document.body.classList.toggle('inactive', !document.hasFocus());
  if (document.defaultView) {
    document.defaultView.addEventListener('focus', windowFocused.bind(undefined, document), false);
    document.defaultView.addEventListener('blur', windowBlurred.bind(undefined, document), false);
  }
  document.addEventListener('focus', focusChanged.bind(undefined), true);

  const body = (document.body as Element);
  GlassPane.setContainer(body);
}

export function beautifyFunctionName(name: string): string {
  return name || i18nString(UIStrings.anonymous);
}

export const createTextChild = (element: Element|DocumentFragment, text: string): Text => {
  const textNode = element.ownerDocument.createTextNode(text);
  element.appendChild(textNode);
  return textNode;
};

export const createTextChildren = (element: Element|DocumentFragment, ...childrenText: string[]): void => {
  for (const child of childrenText) {
    createTextChild(element, child);
  }
};

export function createTextButton(text: string, clickHandler?: ((arg0: Event) => void), opts?: {
  className?: string,
  jslogContext?: string,
  variant?: Buttons.Button.Variant,
  title?: string,
  icon?: string,
}): Buttons.Button.Button {
  const button = new Buttons.Button.Button();
  if (opts?.className) {
    button.className = opts.className;
  }

  button.textContent = text;
  button.iconName = opts?.icon;
  button.variant = opts?.variant ? opts.variant : Buttons.Button.Variant.OUTLINED;
  if (clickHandler) {
    button.addEventListener('click', clickHandler);
    button.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === 'Space') {
        // Make sure we don't propagate 'Enter' or 'Space' key events to parents,
        // so that these get turned into 'click' events properly.
        event.stopImmediatePropagation();
      }
    });
  }
  if (opts?.jslogContext) {
    button.setAttribute('jslog', `${VisualLogging.action().track({click: true}).context(opts.jslogContext)}`);
  }
  if (opts?.title) {
    button.setAttribute('title', opts.title);
  }
  button.type = 'button';
  return button;
}

export function createInput(className?: string, type?: string, jslogContext?: string): HTMLInputElement {
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
    element.setAttribute(
        'jslog', `${VisualLogging.textField().track({keydown: 'Enter', change: true}).context(jslogContext)}`);
  }
  return element;
}

export function createHistoryInput(type = 'search', className?: string): HTMLInputElement {
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

  function onInput(_event: Event): void {
    if (history.length === historyPosition + 1) {
      history[historyPosition] = historyInput.value;
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.keyCode === Keys.Up.code) {
      historyPosition = Math.max(historyPosition - 1, 0);
      historyInput.value = history[historyPosition];
      historyInput.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
      event.consume(true);
    } else if (event.keyCode === Keys.Down.code) {
      historyPosition = Math.min(historyPosition + 1, history.length - 1);
      historyInput.value = history[historyPosition];
      historyInput.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
      event.consume(true);
    } else if (event.keyCode === Keys.Enter.code) {
      if (history.length > 1 && history[history.length - 2] === historyInput.value) {
        return;
      }
      history[history.length - 1] = historyInput.value;
      historyPosition = history.length - 1;
      history.push('');
    }
  }
}

export function createSelect(
    name: string, options: string[]|Array<Map<string, string[]>>|Set<string>): HTMLSelectElement {
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
    } else if (typeof option === 'string') {
      select.add(createOption(option, option, Platform.StringUtilities.toKebabCase(option)));
    }
  }
  return select;
}

export function createOption(title: string, value?: string, jslogContext?: string): HTMLOptionElement {
  const result = new Option(title, value || title);
  if (jslogContext) {
    result.setAttribute('jslog', `${VisualLogging.item(jslogContext).track({click: true})}`);
  }
  return result;
}

export function createLabel(title: string, className?: string, associatedControl?: Element): Element {
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

export function createIconLabel(
    options: {iconName: string, title?: string, color?: string, width?: '14px'|'20px', height?: '14px'|'20px'}):
    DevToolsIconLabel {
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
export function createRadioButton(
    name: string, title: string, jslogContext: string): {label: HTMLLabelElement, radio: HTMLInputElement} {
  const label = document.createElement('label');
  const radio = label.createChild('input');
  radio.type = 'radio';
  radio.name = name;
  radio.setAttribute('jslog', `${VisualLogging.toggle().track({change: true}).context(jslogContext)}`);
  createTextChild(label, title);
  return {label, radio};
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
export function createSlider(min: number, max: number, tabIndex: number): HTMLInputElement {
  const element = document.createElement('input');
  element.type = 'range';
  element.min = String(min);
  element.max = String(max);
  element.tabIndex = tabIndex;
  return element;
}

export function setTitle(element: HTMLElement, title: string): void {
  ARIAUtils.setLabel(element, title);
  Tooltip.install(element, title);
}

export class CheckboxLabel extends HTMLElement {
  static readonly observedAttributes = ['checked', 'disabled', 'indeterminate', 'name', 'title', 'aria-label'];

  readonly #shadowRoot!: DocumentFragment;
  #checkboxElement!: HTMLInputElement;
  #textElement!: HTMLElement;

  constructor() {
    super();
    CheckboxLabel.lastId = CheckboxLabel.lastId + 1;
    const id = 'ui-checkbox-label' + CheckboxLabel.lastId;
    this.#shadowRoot = createShadowRootWithCoreStyles(this, {cssFile: checkboxTextLabelStyles, delegatesFocus: true});
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

  static create(
      title?: Platform.UIString.LocalizedString, checked?: boolean, subtitle?: Platform.UIString.LocalizedString,
      jslogContext?: string, small?: boolean): CheckboxLabel {
    const element = document.createElement('devtools-checkbox');
    element.#checkboxElement.checked = Boolean(checked);
    if (jslogContext) {
      element.#checkboxElement.setAttribute(
          'jslog', `${VisualLogging.toggle().track({change: true}).context(jslogContext)}`);
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

  attributeChangedCallback(name: string, _oldValue: string|null, newValue: string|null): void {
    if (name === 'checked') {
      this.#checkboxElement.checked = newValue !== null;
    } else if (name === 'disabled') {
      this.#checkboxElement.disabled = newValue !== null;
    } else if (name === 'indeterminate') {
      this.#checkboxElement.indeterminate = newValue !== null;
    } else if (name === 'name') {
      this.#checkboxElement.name = newValue ?? '';
    } else if (name === 'title') {
      this.#checkboxElement.title = newValue ?? '';
      this.#textElement.title = newValue ?? '';
    } else if (name === 'aria-label') {
      this.#checkboxElement.ariaLabel = newValue;
    }
  }

  getLabelText(): string|null {
    return this.#textElement.textContent;
  }

  setLabelText(content: string): void {
    this.#textElement.textContent = content;
  }

  override get ariaLabel(): string|null {
    return this.#checkboxElement.ariaLabel;
  }

  override set ariaLabel(ariaLabel: string) {
    this.setAttribute('aria-label', ariaLabel);
  }

  get checked(): boolean {
    return this.#checkboxElement.checked;
  }

  set checked(checked: boolean) {
    this.toggleAttribute('checked', checked);
  }

  set disabled(disabled: boolean) {
    this.toggleAttribute('disabled', disabled);
  }

  get disabled(): boolean {
    return this.#checkboxElement.disabled;
  }

  set indeterminate(indeterminate: boolean) {
    this.toggleAttribute('indeterminate', indeterminate);
  }

  get indeterminate(): boolean {
    return this.#checkboxElement.indeterminate;
  }

  override set title(title: string) {
    this.setAttribute('title', title);
  }

  override get title(): string {
    return this.#checkboxElement.title;
  }

  set name(name: string) {
    this.setAttribute('name', name);
  }

  get name(): string {
    return this.#checkboxElement.name;
  }

  override click(): void {
    this.#checkboxElement.click();
  }

  /** Only to be used when the checkbox label is 'generated' (a regex, a className, etc). Most checkboxes should be create()'d with UIStrings */
  static createWithStringLiteral(title?: string, checked?: boolean, jslogContext?: string, small?: boolean):
      CheckboxLabel {
    const stringLiteral = title as Platform.UIString.LocalizedString;
    return CheckboxLabel.create(stringLiteral, checked, undefined, jslogContext, small);
  }

  private static lastId = 0;
}

customElements.define('devtools-checkbox', CheckboxLabel);

export class DevToolsIconLabel extends HTMLElement {
  readonly #icon: IconButton.Icon.Icon;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this);
    this.#icon = new IconButton.Icon.Icon();
    this.#icon.style.setProperty('margin-right', '4px');
    this.#icon.style.setProperty('vertical-align', 'baseline');
    root.appendChild(this.#icon);
    root.createChild('slot');
  }

  set data(data: IconButton.Icon.IconData) {
    this.#icon.data = data;
    // TODO(crbug.com/1427397): Clean this up. This was necessary so `DevToolsIconLabel` can use Lit icon
    //    while being backwards-compatible with the legacy Icon while working for both small and large icons.
    if (data.height === '14px') {
      this.#icon.style.setProperty('margin-bottom', '-2px');
    } else if (data.height === '20px') {
      this.#icon.style.setProperty('margin-bottom', '2px');
    }
  }
}

customElements.define('dt-icon-label', DevToolsIconLabel);

export class DevToolsSmallBubble extends HTMLElement {
  private textElement: Element;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, {cssFile: smallBubbleStyles});
    this.textElement = root.createChild('div');
    this.textElement.className = 'info';
    this.textElement.createChild('slot');
  }

  set type(type: string) {
    this.textElement.className = type;
  }
}

customElements.define('dt-small-bubble', DevToolsSmallBubble);

export class DevToolsCloseButton extends HTMLElement {
  #button: Buttons.Button.Button;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this);
    this.#button = new Buttons.Button.Button();
    this.#button.data = {variant: Buttons.Button.Variant.ICON, iconName: 'cross'};
    this.#button.classList.add('close-button');
    this.#button.setAttribute('jslog', `${VisualLogging.close().track({click: true})}`);
    Tooltip.install(this.#button, i18nString(UIStrings.close));
    ARIAUtils.setLabel(this.#button, i18nString(UIStrings.close));
    root.appendChild(this.#button);
  }

  setAccessibleName(name: string): void {
    ARIAUtils.setLabel(this.#button, name);
  }

  setSize(size: Buttons.Button.Size): void {
    this.#button.size = size;
  }

  setTabbable(tabbable: boolean): void {
    if (tabbable) {
      this.#button.tabIndex = 0;
    } else {
      this.#button.tabIndex = -1;
    }
  }

  override focus(): void {
    this.#button.focus();
  }
}

customElements.define('dt-close-button', DevToolsCloseButton);

export function bindInput(
    input: HTMLInputElement, apply: (arg0: string) => void, validate: (arg0: string) => boolean, numeric: boolean,
    modifierMultiplier?: number): (arg0: string) => void {
  input.addEventListener('change', onChange, false);
  input.addEventListener('input', onInput, false);
  input.addEventListener('keydown', onKeyDown, false);
  input.addEventListener('focus', input.select.bind(input), false);

  function onInput(): void {
    input.classList.toggle('error-input', !validate(input.value));
  }

  function onChange(): void {
    const valid = validate(input.value);
    input.classList.toggle('error-input', !valid);
    if (valid) {
      apply(input.value);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
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

  function setValue(value: string): void {
    if (value === input.value) {
      return;
    }
    const valid = validate(value);
    input.classList.toggle('error-input', !valid);
    input.value = value;
  }

  return setValue;
}

export function trimText(
    context: CanvasRenderingContext2D, text: string, maxWidth: number,
    trimFunction: (arg0: string, arg1: number) => string): string {
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
  let r: number = text.length;
  let lv = 0;
  let rv: number = textWidth;
  while (l < r && lv !== rv && lv !== maxWidth) {
    const m = Math.ceil(l + (r - l) * (maxWidth - lv) / (rv - lv));
    const mv = measureTextWidth(context, trimFunction(text, m));
    if (mv <= maxWidth) {
      l = m;
      lv = mv;
    } else {
      r = m - 1;
      rv = mv;
    }
  }
  text = trimFunction(text, l);
  return text !== '…' ? text : '';
}

export function trimTextMiddle(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  return trimText(context, text, maxWidth, (text, width) => Platform.StringUtilities.trimMiddle(text, width));
}

export function trimTextEnd(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  return trimText(context, text, maxWidth, (text, width) => Platform.StringUtilities.trimEndWithMaxLength(text, width));
}

export function measureTextWidth(context: CanvasRenderingContext2D, text: string): number {
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

let measureTextWidthCache: Map<string, Map<string, number>>|null = null;

export function loadImage(url: string): Promise<HTMLImageElement|null> {
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
export function createFileSelectorElement(callback: (arg0: File) => void, accept?: string): HTMLInputElement {
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
  static async show(header: string, message: string, where?: Element|Document, jslogContext?: string): Promise<void> {
    const dialog = new Dialog(jslogContext);
    dialog.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    dialog.setDimmed(true);
    const shadowRoot = createShadowRootWithCoreStyles(dialog.contentElement, {cssFile: confirmDialogStyles});
    const content = shadowRoot.createChild('div', 'widget');
    await new Promise(resolve => {
      const okButton = createTextButton(
          i18nString(UIStrings.ok), resolve, {jslogContext: 'confirm', variant: Buttons.Button.Variant.PRIMARY});
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
  static async show(message: string, header?: string, where?: Element|Document, options?: ConfirmDialogOptions):
      Promise<boolean> {
    const dialog = new Dialog(options?.jslogContext);
    dialog.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    dialog.setDimmed(true);
    ARIAUtils.setLabel(dialog.contentElement, message);
    const shadowRoot = createShadowRootWithCoreStyles(dialog.contentElement, {cssFile: confirmDialogStyles});
    const content = shadowRoot.createChild('div', 'widget');
    if (header) {
      content.createChild('span', 'header').textContent = header;
    }
    content.createChild('div', 'message').createChild('span').textContent = message;
    const buttonsBar = content.createChild('div', 'button');
    const result = await new Promise<boolean>(resolve => {
      const okButton = createTextButton(
          /* text= */ options?.okButtonLabel || i18nString(UIStrings.ok), /* clickHandler= */ () => resolve(true),
          {jslogContext: 'confirm', variant: Buttons.Button.Variant.PRIMARY});
      buttonsBar.appendChild(okButton);
      buttonsBar.appendChild(createTextButton(
          options?.cancelButtonLabel || i18nString(UIStrings.cancel), () => resolve(false), {jslogContext: 'cancel'}));
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

export function createInlineButton(toolbarButton: ToolbarButton): Element {
  const element = document.createElement('span');
  const shadowRoot = createShadowRootWithCoreStyles(element, {cssFile: inlineButtonStyles});
  element.classList.add('inline-button');
  const toolbar = shadowRoot.createChild('devtools-toolbar');
  toolbar.appendToolbarItem(toolbarButton);
  return element;
}

export interface RenderedObject {
  element: HTMLElement;
  forceSelect(): void;
}

export abstract class Renderer {
  abstract render(object: Object, options?: Options): Promise<RenderedObject|null>;

  static async render(object: Object, options?: Options): Promise<RenderedObject|null> {
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

export function formatTimestamp(timestamp: number, full: boolean): string {
  const date = new Date(timestamp);
  const yymmdd = date.getFullYear() + '-' + leadZero(date.getMonth() + 1, 2) + '-' + leadZero(date.getDate(), 2);
  const hhmmssfff = leadZero(date.getHours(), 2) + ':' + leadZero(date.getMinutes(), 2) + ':' +
      leadZero(date.getSeconds(), 2) + '.' + leadZero(date.getMilliseconds(), 3);
  return full ? (yymmdd + ' ' + hhmmssfff) : hhmmssfff;

  function leadZero(value: number, length: number): string {
    const valueString = String(value);
    return valueString.padStart(length, '0');
  }
}

export interface Options {
  title?: string|Element;
  editable?: boolean;
  /**
   * Should the resulting object be expanded.
   */
  expand?: boolean;
}

export interface HighlightChange {
  node: Element|Text;
  type: string;
  oldText?: string;
  newText?: string;
  nextSibling?: Node;
  parent?: Node;
}

export const isScrolledToBottom = (element: Element): boolean => {
  // This code works only for 0-width border.
  // The scrollTop, clientHeight and scrollHeight are computed in double values internally.
  // However, they are exposed to javascript differently, each being either rounded (via
  // round, ceil or floor functions) or left intouch.
  // This adds up a total error up to 2.
  return Math.abs(element.scrollTop + element.clientHeight - element.scrollHeight) <= 2;
};

export function createSVGChild(element: Element, childType: string, className?: string): Element {
  const child = element.ownerDocument.createElementNS('http://www.w3.org/2000/svg', childType);
  if (className) {
    child.setAttribute('class', className);
  }
  element.appendChild(child);
  return child;
}

export const enclosingNodeOrSelfWithNodeNameInArray = (initialNode: Node, nameArray: string[]): Node|null => {
  let node: (Node|null)|Node = initialNode;
  for (; node && node !== initialNode.ownerDocument; node = node.parentNodeOrShadowHost()) {
    for (let i = 0; i < nameArray.length; ++i) {
      if (node.nodeName.toLowerCase() === nameArray[i].toLowerCase()) {
        return node;
      }
    }
  }
  return null;
};

export const enclosingNodeOrSelfWithNodeName = function(node: Node, nodeName: string): Node|null {
  return enclosingNodeOrSelfWithNodeNameInArray(node, [nodeName]);
};

export const deepElementFromPoint = (document: Document|ShadowRoot|null|undefined, x: number, y: number): Node|null => {
  let container: (ShadowRoot|null)|(Document | ShadowRoot | null | undefined) = document;
  let node: Element|null = null;
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

export const deepElementFromEvent = (ev: Event): Node|null => {
  const event = (ev as MouseEvent);
  // Some synthetic events have zero coordinates which lead to a wrong element.
  // Better return nothing in this case.
  if (!event.which && !event.pageX && !event.pageY && !event.clientX && !event.clientY && !event.movementX &&
      !event.movementY) {
    return null;
  }
  const root = event.target && (event.target as Element).getComponentRoot();
  return root ? deepElementFromPoint((root as Document | ShadowRoot), event.pageX, event.pageY) : null;
};

const registeredRenderers: RendererRegistration[] = [];

export function registerRenderer(registration: RendererRegistration): void {
  registeredRenderers.push(registration);
}
export function getApplicableRegisteredRenderers(object: Object): RendererRegistration[] {
  return registeredRenderers.filter(isRendererApplicableToContextTypes);

  function isRendererApplicableToContextTypes(rendererRegistration: RendererRegistration): boolean {
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

export interface RendererRegistration {
  loadRenderer: () => Promise<Renderer>;
  contextTypes: () => Array<Platform.Constructor.ConstructorOrAbstract<unknown>>;
}

export interface ConfirmDialogOptions {
  okButtonLabel?: string;
  cancelButtonLabel?: string;
  jslogContext?: string;
}

function updateWidgetfocusWidgetForNode(node: Node|null): void {
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

    parentWidget.defaultFocusedChild = widget;
    widget = parentWidget;
  }
}

function updateXWidgetfocusWidgetForNode(node: Node|null): void {
  node = node?.parentNodeOrShadowHost() ?? null;
  const XWidgetConstructor = customElements.get('x-widget') as Platform.Constructor.Constructor<XWidget>| undefined;
  let widget = null;
  while (node) {
    if (XWidgetConstructor && node instanceof XWidgetConstructor) {
      if (widget) {
        node.defaultFocusedElement = widget;
      }
      widget = node;
    }
    node = node.parentNodeOrShadowHost();
  }
}

function focusChanged(event: Event): void {
  const target = event.target as HTMLElement;
  const document = target ? target.ownerDocument : null;
  const element = document ? Platform.DOMUtilities.deepActiveElement(document) : null;
  updateWidgetfocusWidgetForNode(element);
  updateXWidgetfocusWidgetForNode(element);
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
export function createShadowRootWithCoreStyles(element: Element, options: {
  cssFile?: CSSInJS[]|CSSInJS,
  delegatesFocus?: boolean,
} = {
  delegatesFocus: undefined,
  cssFile: undefined,
}): ShadowRoot {
  const {cssFile, delegatesFocus} = options;

  const shadowRoot = element.attachShadow({mode: 'open', delegatesFocus});
  Platform.DOMUtilities.appendStyle(shadowRoot, inspectorCommonStyles, Buttons.textButtonStyles);
  if (Array.isArray(cssFile)) {
    Platform.DOMUtilities.appendStyle(shadowRoot, ...cssFile);
  } else if (cssFile) {
    Platform.DOMUtilities.appendStyle(shadowRoot, cssFile);
  }
  shadowRoot.addEventListener('focus', focusChanged, true);
  return shadowRoot;
}

let cachedMeasuredScrollbarWidth: number|undefined;

export function resetMeasuredScrollbarWidthForTest(): void {
  cachedMeasuredScrollbarWidth = undefined;
}

export function measuredScrollbarWidth(document?: Document|null): number {
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

/**
 * Opens the given `url` in a new Chrome tab.
 *
 * If the `url` is a Google owned documentation page (currently that includes
 * `web.dev`, `developers.google.com`, and `developer.chrome.com`), the `url`
 * will also be checked for UTM parameters:
 *
 * - If no `utm_source` search parameter is present, this method will add a new
 *   search parameter `utm_source=devtools` to `url`.
 * - If no `utm_campaign` search parameter is present, and DevTools is running
 *   within a branded build, this method will add `utm_campaign=<channel>` to
 *   the search parameters, with `<channel>` being the release channel of
 *   Chrome ("stable", "beta", "dev", or "canary").
 *
 * @param url the URL to open in a new tab.
 * @throws TypeError if `url` is not a valid URL.
 * @see https://en.wikipedia.org/wiki/UTM_parameters
 */
export function openInNewTab(url: URL|string): void {
  url = new URL(`${url}`);
  if (['developer.chrome.com', 'developers.google.com', 'web.dev'].includes(url.hostname)) {
    if (!url.searchParams.has('utm_source')) {
      url.searchParams.append('utm_source', 'devtools');
    }
    const {channel} = Root.Runtime.hostConfig;
    if (!url.searchParams.has('utm_campaign') && typeof channel === 'string') {
      url.searchParams.append('utm_campaign', channel);
    }
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Platform.DevToolsPath.urlString`${url}`);
}

export interface PromotionDisplayState {
  displayCount: number;
  firstRegistered: number;
  featureInteractionCount: number;
}

const MAX_DISPLAY_COUNT = 10;
// 60 days in ms
const MAX_DURATION = 60 * 24 * 60 * 60 * 1000;
const MAX_INTERACTION_COUNT = 2;

export class PromotionManager {
  static #instance?: PromotionManager;

  static instance(): PromotionManager {
    if (!PromotionManager.#instance) {
      PromotionManager.#instance = new PromotionManager();
    }
    return PromotionManager.#instance;
  }

  private getPromotionDisplayState(id: string): PromotionDisplayState|null {
    const displayStateString = localStorage.getItem(id);
    return displayStateString ? JSON.parse(displayStateString) : null;
  }

  private setPromotionDisplayState(id: string, promotionDisplayState: PromotionDisplayState): void {
    localStorage.setItem(id, JSON.stringify(promotionDisplayState));
  }

  private registerPromotion(id: string): void {
    this.setPromotionDisplayState(id, {
      displayCount: 0,
      firstRegistered: Date.now(),
      featureInteractionCount: 0,
    });
  }

  private recordPromotionShown(id: string): void {
    const displayState = this.getPromotionDisplayState(id);
    if (!displayState) {
      throw new Error(`Cannot record promotion shown for unregistered promotion ${id}`);
    }
    this.setPromotionDisplayState(id, {
      ...displayState,
      displayCount: displayState.displayCount + 1,
    });
  }

  canShowPromotion(id: string): boolean {
    const displayState = this.getPromotionDisplayState(id);
    if (!displayState) {
      this.registerPromotion(id);
      return true;
    }
    return displayState.displayCount < MAX_DISPLAY_COUNT && Date.now() - displayState.firstRegistered < MAX_DURATION &&
        displayState.featureInteractionCount < MAX_INTERACTION_COUNT;
  }

  recordFeatureInteraction(id: string): void {
    const displayState = this.getPromotionDisplayState(id);
    if (!displayState) {
      throw new Error(`Cannot record feature interaction for unregistered promotion ${id}`);
    }
    this.setPromotionDisplayState(id, {
      ...displayState,
      featureInteractionCount: displayState.featureInteractionCount + 1,
    });
  }

  maybeShowPromotion(id: string): boolean {
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
export function maybeCreateNewBadge(promotionId: string): HTMLDivElement|undefined {
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

export function bindToAction(actionName: string): ReturnType<typeof Directives.ref> {
  const action = ActionRegistry.instance().getAction(actionName);

  let setEnabled: (enabled: boolean) => void;
  function actionEnabledChanged(event: Common.EventTarget.EventTargetEvent<boolean>): void {
    setEnabled(event.data);
  }

  return Directives.ref((e: Element|undefined) => {
    if (!e || !(e instanceof Buttons.Button.Button)) {
      action.removeEventListener(ActionRegistration.Events.ENABLED, actionEnabledChanged);
      return;
    }

    setEnabled = enabled => {
      e.disabled = !enabled;
    };

    action.addEventListener(ActionRegistration.Events.ENABLED, actionEnabledChanged);

    const title = action.title();
    const iconName = action.icon();
    const jslogContext = action.id();
    if (iconName) {
      e.data = {iconName, jslogContext, title, variant: Buttons.Button.Variant.ICON};
    } else {
      e.data = {jslogContext, title, variant: Buttons.Button.Variant.TEXT};
    }
    setEnabled(action.enabled());
    e.onclick = () => action.execute();
  });
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type BindingEventListener = (arg: any) => any;
export class InterceptBindingDirective extends Lit.Directive.Directive {
  static readonly #interceptedBindings = new WeakMap<Element, Map<string, BindingEventListener>>();

  override update(part: Lit.Directive.Part, [listener]: [BindingEventListener]): unknown {
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
  render(_listener: Function): undefined {
    return undefined;
  }

  static attachEventListeners(templateElement: Element, renderedElement: Element): void {
    const eventListeners = InterceptBindingDirective.#interceptedBindings.get(templateElement);
    if (!eventListeners) {
      return;
    }
    for (const [name, listener] of eventListeners) {
      renderedElement.addEventListener(name, listener);
    }
  }
}

export const cloneCustomElement = <T extends HTMLElement>(element: T, deep?: boolean): T => {
  const clone = document.createElement(element.localName) as T;
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
  readonly #mutationObserver = new MutationObserver(this.#onChange.bind(this));
  #contentTemplate: HTMLTemplateElement|null = null;

  constructor() {
    super();
    this.#mutationObserver.observe(this, {childList: true, attributes: true, subtree: true, characterData: true});
  }

  static cloneNode(node: Node): Node {
    const clone = node.cloneNode(false);
    for (const child of node.childNodes) {
      clone.appendChild(HTMLElementWithLightDOMTemplate.cloneNode(child));
    }
    if (node instanceof Element && clone instanceof Element) {
      InterceptBindingDirective.attachEventListeners(node, clone);
    }
    return clone;
  }

  private static patchLitTemplate(template: Lit.LitTemplate): void {
    const wrapper = Lit.Directive.directive(InterceptBindingDirective);
    if (template === Lit.nothing) {
      return;
    }
    template.values = template.values.map(patchValue);

    function isLitTemplate(value: unknown): value is Lit.TemplateResult<1> {
      return Boolean(
          typeof value === 'object' && value && '_$litType$' in value && 'strings' in value && 'values' in value &&
          value['_$litType$'] === 1);
    }

    function patchValue(value: unknown): unknown {
      if (typeof value === 'function') {
        try {
          return wrapper(value);
        } catch {
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

  set template(template: Lit.LitTemplate) {
    if (!this.#contentTemplate) {
      this.removeChildren();
      this.#contentTemplate = this.createChild('template');
      this.#mutationObserver.disconnect();
      this.#mutationObserver.observe(
          this.#contentTemplate.content, {childList: true, attributes: true, subtree: true, characterData: true});
    }
    HTMLElementWithLightDOMTemplate.patchLitTemplate(template);
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(template, this.#contentTemplate.content);
  }

  #onChange(mutationList: MutationRecord[]): void {
    this.onChange(mutationList);
    for (const mutation of mutationList) {
      this.removeNodes(mutation.removedNodes);
      this.addNodes(mutation.addedNodes);
      this.updateNode(mutation.target, mutation.attributeName);
    }
  }

  protected onChange(_mutationList: MutationRecord[]): void {
  }

  protected updateNode(_node: Node, _attributeName: string|null): void {
  }

  protected addNodes(_nodes: NodeList|Node[]): void {
  }

  protected removeNodes(_nodes: NodeList): void {
  }
}
