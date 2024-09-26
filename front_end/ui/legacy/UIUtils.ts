// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Buttons from '../components/buttons/buttons.js';
import * as IconButton from '../components/icon_button/icon_button.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import applicationColorTokensStyles from './applicationColorTokens.css.legacy.js';
import * as ARIAUtils from './ARIAUtils.js';
import checkboxTextLabelStyles from './checkboxTextLabel.css.legacy.js';
import confirmDialogStyles from './confirmDialog.css.legacy.js';
import designTokensStyles from './designTokens.css.legacy.js';
import {Dialog} from './Dialog.js';
import {Size} from './Geometry.js';
import {GlassPane, PointerEventsBehavior, SizeBehavior} from './GlassPane.js';
import inlineButtonStyles from './inlineButton.css.legacy.js';
import inspectorCommonStyles from './inspectorCommon.css.legacy.js';
import {KeyboardShortcut} from './KeyboardShortcut.js';
import radioButtonStyles from './radioButton.css.legacy.js';
import sliderStyles from './slider.css.legacy.js';
import smallBubbleStyles from './smallBubble.css.legacy.js';
import textButtonStyles from './textButton.css.legacy.js';
import * as ThemeSupport from './theme_support/theme_support.js';
import themeColorsStyles from './themeColors.css.legacy.js';
import tokens from './tokens.css.legacy.js';
import {Toolbar, type ToolbarButton} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {type TreeOutline} from './Treeoutline.js';
import {Widget} from './Widget.js';

const UIStrings = {
  /**
   *@description label to open link externally
   */
  openInNewTab: 'Open in new tab',
  /**
   *@description label to copy link address
   */
  copyLinkAddress: 'Copy link address',
  /**
   *@description label to copy file name
   */
  copyFileName: 'Copy file name',
  /**
   *@description label for the profiler control button
   */
  anotherProfilerIsAlreadyActive: 'Another profiler is already active',
  /**
   *@description Text in UIUtils
   */
  promiseResolvedAsync: 'Promise resolved (async)',
  /**
   *@description Text in UIUtils
   */
  promiseRejectedAsync: 'Promise rejected (async)',
  /**
   *@description Text for the title of asynchronous function calls group in Call Stack
   */
  asyncCall: 'Async Call',
  /**
   *@description Text for the name of anonymous functions
   */
  anonymous: '(anonymous)',
  /**
   *@description Text to close something
   */
  close: 'Close',
  /**
   *@description Text on a button for message dialog
   */
  ok: 'OK',
  /**
   *@description Text to cancel something
   */
  cancel: 'Cancel',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/UIUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const highlightedSearchResultClassName = 'highlighted-search-result';
export const highlightedCurrentSearchResultClassName = 'current-search-result';

export function installDragHandle(
    element: Element, elementDragStart: ((arg0: MouseEvent) => boolean)|null, elementDrag: (arg0: MouseEvent) => void,
    elementDragEnd: ((arg0: MouseEvent) => void)|null, cursor: string|null, hoverCursor?: string|null,
    startDelay?: number): void {
  function onMouseDown(event: Event): void {
    const dragHandler = new DragHandler();
    const dragStart = (): void =>
        dragHandler.elementDragStart(element, elementDragStart, elementDrag, elementDragEnd, cursor, event);
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
      cursor: string|null, ev: Event): void {
    const event = (ev as MouseEvent);
    // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
    if (event.button || (Host.Platform.isMac() && event.ctrlKey)) {
      return;
    }

    if (this.elementDraggingEventListener) {
      return;
    }

    if (elementDragStart && !elementDragStart((event as MouseEvent))) {
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
    } catch (e) {
      this.dragEventsTargetDocumentTop = this.dragEventsTargetDocument;
    }

    targetDocument.addEventListener('pointermove', this.elementDragMove, true);
    targetDocument.addEventListener('pointerup', this.elementDragEnd, true);
    DragHandler.rootForMouseOut &&
        DragHandler.rootForMouseOut.addEventListener('pointerout', this.mouseOutWhileDragging, {capture: true});
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
    event.preventDefault();
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
    if (this.elementDraggingEventListener && this.elementDraggingEventListener(event)) {
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

export function modifiedFloatNumber(number: number, event: Event, modifierMultiplier?: number): number|null {
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
  const result = Number((number + delta).toFixed(6));
  if (!String(result).match(numberRegex)) {
    return null;
  }
  return result;
}

export function createReplacementString(
    wordString: string, event: Event,
    customNumberHandler?: ((arg0: string, arg1: number, arg2: string) => string)): string|null {
  let prefix;
  let suffix;
  let number;
  let replacementString: string|null = null;
  let matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
  if (matches && matches.length) {
    prefix = matches[1];
    suffix = matches[3];
    number = modifiedHexValue(matches[2], event);
    if (number !== null) {
      replacementString = prefix + number + suffix;
    }
  } else {
    matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
    if (matches && matches.length) {
      prefix = matches[1];
      suffix = matches[3];
      number = modifiedFloatNumber(parseFloat(matches[2]), event);
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
  if (!selection || !selection.rangeCount) {
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

  if (suggestionHandler && suggestionHandler(wordString)) {
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
    description: string|undefined, previousCallFrames: {functionName: string}[]): string {
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
  injectCoreStyles(element);

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
  }

  if (element.classList.contains(className)) {
    element.classList.remove(className);
  }

  element.addEventListener('webkitAnimationEnd', animationEndCallback, false);
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

export function measurePreferredSize(element: Element, containerElement?: Element|null): Size {
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
  return new Size(result.width, result.height);
}

class InvokeOnceHandlers {
  private handlers: Map<Object, Set<Function>>|null;
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

export function invokeOnceAfterBatchUpdate(object: Object, method: () => void): void {
  if (!postUpdateHandlers) {
    postUpdateHandlers = new InvokeOnceHandlers(true);
  }
  postUpdateHandlers.add(object, method);
}

export function animateFunction(
    window: Window, func: Function, params: {
      from: number,
      to: number,
    }[],
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
}): Buttons.Button.Button {
  const button = new Buttons.Button.Button();
  if (opts?.className) {
    button.className = opts.className;
  }
  button.textContent = text;
  button.variant = opts?.variant ? opts.variant : Buttons.Button.Variant.OUTLINED;
  if (clickHandler) {
    button.addEventListener('click', clickHandler);
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

export function createSelect(name: string, options: string[]|Map<string, string[]>[]|Set<string>): HTMLSelectElement {
  const select = document.createElement('select');
  select.classList.add('chrome-select');
  ARIAUtils.setLabel(select, name);
  for (const option of options) {
    if (option instanceof Map) {
      for (const [key, value] of option) {
        const optGroup = (select.createChild('optgroup') as HTMLOptGroupElement);
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

export function createRadioLabel(
    name: string, title: string, checked?: boolean, jslogContext?: string): DevToolsRadioButton {
  const element = (document.createElement('span', {is: 'dt-radio'}) as DevToolsRadioButton);
  element.radioElement.name = name;
  element.radioElement.checked = Boolean(checked);
  createTextChild(element.labelElement, title);
  if (jslogContext) {
    element.radioElement.setAttribute('jslog', `${VisualLogging.toggle().track({change: true}).context(jslogContext)}`);
  }
  return element;
}

export function createIconLabel(
    options: {title?: string, iconName: string, color?: string, width?: '14px'|'20px', height?: '14px'|'20px'}):
    DevToolsIconLabel {
  const element = (document.createElement('span', {is: 'dt-icon-label'}) as DevToolsIconLabel);
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

export function createSlider(min: number, max: number, tabIndex: number): Element {
  const element = (document.createElement('span', {is: 'dt-slider'}) as DevToolsSlider);
  element.sliderElement.min = String(min);
  element.sliderElement.max = String(max);
  element.sliderElement.step = String(1);
  element.sliderElement.tabIndex = tabIndex;
  return element;
}

export function setTitle(element: HTMLElement, title: string): void {
  ARIAUtils.setLabel(element, title);
  Tooltip.install(element, title);
}

export class CheckboxLabel extends HTMLSpanElement {
  private readonly shadowRootInternal!: DocumentFragment;
  checkboxElement!: HTMLInputElement;
  textElement!: HTMLElement;

  constructor() {
    super();
    CheckboxLabel.lastId = CheckboxLabel.lastId + 1;
    const id = 'ui-checkbox-label' + CheckboxLabel.lastId;
    this.shadowRootInternal =
        createShadowRootWithCoreStyles(this, {cssFile: checkboxTextLabelStyles, delegatesFocus: undefined});
    this.checkboxElement = (this.shadowRootInternal.createChild('input') as HTMLInputElement);
    this.checkboxElement.type = 'checkbox';
    this.checkboxElement.setAttribute('id', id);
    this.textElement = this.shadowRootInternal.createChild('label', 'dt-checkbox-text') as HTMLElement;
    this.textElement.setAttribute('for', id);
    this.shadowRootInternal.createChild('slot');
  }

  static create(title?: string, checked?: boolean, subtitle?: string, jslogContext?: string, small?: boolean):
      CheckboxLabel {
    if (!CheckboxLabel.constructorInternal) {
      CheckboxLabel.constructorInternal = registerCustomElement('span', 'dt-checkbox', CheckboxLabel);
    }
    const element = (CheckboxLabel.constructorInternal() as CheckboxLabel);
    element.checkboxElement.checked = Boolean(checked);
    if (jslogContext) {
      element.checkboxElement.setAttribute(
          'jslog', `${VisualLogging.toggle().track({change: true}).context(jslogContext)}`);
    }
    if (title !== undefined) {
      element.textElement.textContent = title;
      element.checkboxElement.title = title;
      if (subtitle !== undefined) {
        element.textElement.createChild('div', 'dt-checkbox-subtitle').textContent = subtitle;
      }
    }
    element.checkboxElement.classList.toggle('small', small);
    return element;
  }

  private static lastId = 0;
  static constructorInternal: (() => Element)|null = null;
}

export class DevToolsIconLabel extends HTMLSpanElement {
  readonly #icon: IconButton.Icon.Icon;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, {
      cssFile: undefined,
      delegatesFocus: undefined,
    });
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

let labelId = 0;

export class DevToolsRadioButton extends HTMLSpanElement {
  radioElement: HTMLInputElement;
  labelElement: HTMLLabelElement;

  constructor() {
    super();
    this.radioElement = (this.createChild('input', 'dt-radio-button') as HTMLInputElement);
    this.labelElement = (this.createChild('label') as HTMLLabelElement);

    const id = 'dt-radio-button-id' + (++labelId);
    this.radioElement.id = id;
    this.radioElement.type = 'radio';
    this.labelElement.htmlFor = id;
    const root = createShadowRootWithCoreStyles(this, {cssFile: radioButtonStyles, delegatesFocus: undefined});
    root.createChild('slot');
    this.addEventListener('click', this.radioClickHandler.bind(this), false);
  }

  radioClickHandler(): void {
    if (this.radioElement.checked || this.radioElement.disabled) {
      return;
    }
    this.radioElement.checked = true;
    this.radioElement.dispatchEvent(new Event('change'));
  }
}

registerCustomElement('span', 'dt-radio', DevToolsRadioButton);
registerCustomElement('span', 'dt-icon-label', DevToolsIconLabel);

export class DevToolsSlider extends HTMLSpanElement {
  sliderElement: HTMLInputElement;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, {cssFile: sliderStyles, delegatesFocus: undefined});
    this.sliderElement = document.createElement('input');
    this.sliderElement.classList.add('dt-range-input');
    this.sliderElement.type = 'range';
    root.appendChild(this.sliderElement);
  }

  set value(amount: number) {
    this.sliderElement.value = String(amount);
  }

  get value(): number {
    return Number(this.sliderElement.value);
  }
}

registerCustomElement('span', 'dt-slider', DevToolsSlider);

export class DevToolsSmallBubble extends HTMLSpanElement {
  private textElement: Element;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, {cssFile: smallBubbleStyles, delegatesFocus: undefined});
    this.textElement = root.createChild('div');
    this.textElement.className = 'info';
    this.textElement.createChild('slot');
  }

  set type(type: string) {
    this.textElement.className = type;
  }
}

registerCustomElement('span', 'dt-small-bubble', DevToolsSmallBubble);

export class DevToolsCloseButton extends HTMLDivElement {
  private button: Buttons.Button.Button;

  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, {delegatesFocus: undefined});
    this.button = new Buttons.Button.Button();
    this.button.data = {variant: Buttons.Button.Variant.ICON, iconName: 'cross'};
    this.button.classList.add('close-button');
    this.button.setAttribute('jslog', `${VisualLogging.close().track({click: true})}`);
    Tooltip.install(this.button, i18nString(UIStrings.close));
    ARIAUtils.setLabel(this.button, i18nString(UIStrings.close));
    root.appendChild(this.button);
  }

  setAccessibleName(name: string): void {
    ARIAUtils.setLabel(this.button, name);
  }

  setTabbable(tabbable: boolean): void {
    if (tabbable) {
      this.button.tabIndex = 0;
    } else {
      this.button.tabIndex = -1;
    }
  }
}

registerCustomElement('div', 'dt-close-button', DevToolsCloseButton);

export function bindInput(
    input: HTMLInputElement, apply: (arg0: string) => void, validate: (arg0: string) => {
      valid: boolean,
      errorMessage: (string | undefined),
    },
    numeric: boolean, modifierMultiplier?: number): (arg0: string) => void {
  input.addEventListener('change', onChange, false);
  input.addEventListener('input', onInput, false);
  input.addEventListener('keydown', onKeyDown, false);
  input.addEventListener('focus', input.select.bind(input), false);

  function onInput(): void {
    input.classList.toggle('error-input', !validate(input.value));
  }

  function onChange(): void {
    const {valid} = validate(input.value);
    input.classList.toggle('error-input', !valid);
    if (valid) {
      apply(input.value);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const {valid} = validate(input.value);
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
    const {valid} = validate(stringValue);
    if (valid) {
      setValue(stringValue);
    }
    event.preventDefault();
  }

  function setValue(value: string): void {
    if (value === input.value) {
      return;
    }
    const {valid} = validate(value);
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

/**
 * Adds a 'utm_source=devtools' as query parameter to the url.
 */
export function addReferrerToURL(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
  if (/(\?|&)utm_source=devtools/.test(url)) {
    return url;
  }
  if (url.indexOf('?') === -1) {
    // If the URL does not contain a query, add the referrer query after path
    // and before (potential) anchor.
    return url.replace(/^([^#]*)(#.*)?$/g, '$1?utm_source=devtools$2') as Platform.DevToolsPath.UrlString;
  }
  // If the URL already contains a query, add the referrer query after the last query
  // and before (potential) anchor.
  return url.replace(/^([^#]*)(#.*)?$/g, '$1&utm_source=devtools$2') as Platform.DevToolsPath.UrlString;
}

/**
 * We want to add a referrer query param to every request to
 * 'web.dev' or 'developers.google.com'.
 */
export function addReferrerToURLIfNecessary(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
  if (/(\/\/developers.google.com\/|\/\/web.dev\/|\/\/developer.chrome.com\/)/.test(url)) {
    return addReferrerToURL(url);
  }
  return url;
}

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
 * @param callback - the function that will be called with the file the user selected
 * @param accept - optionally used to set the [`accept`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept) parameter to limit file-types the user can pick.
 */
export function createFileSelectorElement(callback: (arg0: File) => void, accept?: string): HTMLInputElement {
  const fileSelectorElement = document.createElement('input');
  fileSelectorElement.type = 'file';
  if (accept) {
    fileSelectorElement.setAttribute('accept', accept);
  }
  fileSelectorElement.style.display = 'none';
  fileSelectorElement.tabIndex = -1;
  fileSelectorElement.onchange = () => {
    if (fileSelectorElement.files) {
      callback(fileSelectorElement.files[0]);
    }
  };

  return fileSelectorElement;
}

export const MaxLengthForDisplayedURLs = 150;

export class MessageDialog {
  static async show(message: string, where?: Element|Document, jslogContext?: string): Promise<void> {
    const dialog = new Dialog(jslogContext);
    dialog.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    dialog.setDimmed(true);
    const shadowRoot = createShadowRootWithCoreStyles(
        dialog.contentElement, {cssFile: confirmDialogStyles, delegatesFocus: undefined});
    const content = shadowRoot.createChild('div', 'widget');
    await new Promise(resolve => {
      const okButton = createTextButton(
          i18nString(UIStrings.ok), resolve, {jslogContext: 'confirm', variant: Buttons.Button.Variant.PRIMARY});
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
  static async show(message: string, where?: Element|Document, options?: ConfirmDialogOptions): Promise<boolean> {
    const dialog = new Dialog(options?.jslogContext);
    dialog.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    dialog.setDimmed(true);
    ARIAUtils.setLabel(dialog.contentElement, message);
    const shadowRoot = createShadowRootWithCoreStyles(
        dialog.contentElement, {cssFile: confirmDialogStyles, delegatesFocus: undefined});
    const content = shadowRoot.createChild('div', 'widget');
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
  const shadowRoot = createShadowRootWithCoreStyles(element, {cssFile: inlineButtonStyles, delegatesFocus: undefined});
  element.classList.add('inline-button');
  const toolbar = new Toolbar('');
  toolbar.appendToolbarItem(toolbarButton);
  shadowRoot.appendChild(toolbar.element);
  return element;
}

export abstract class Renderer {
  abstract render(object: Object, options?: Options): Promise<{
    node: Node,
    tree: TreeOutline|null,
  }|null>;

  static async render(object: Object, options?: Options): Promise<{
    node: Node,
    tree: TreeOutline|null,
  }|null> {
    if (!object) {
      throw new Error('Can\'t render ' + object);
    }
    const extension = getApplicableRegisteredRenderers(object)[0];
    if (!extension) {
      return null;
    }
    const renderer = await extension.loadRenderer();
    return renderer.render(object, options);
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
  contextTypes: () => Array<Function>;
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
  while (widget && widget.parentWidget()) {
    const parentWidget = widget.parentWidget();
    if (!parentWidget) {
      break;
    }

    parentWidget.defaultFocusedChild = widget;
    widget = parentWidget;
  }
}

function updateXWidgetfocusWidgetForNode(node: Node|null): void {
  node = node && node.parentNodeOrShadowHost();
  const XWidgetCtor = customElements.get('x-widget');
  let widget = null;
  while (node) {
    if (XWidgetCtor && node instanceof XWidgetCtor) {
      if (widget) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any).defaultFocusedElement = widget;
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

export function injectCoreStyles(root: Element|ShadowRoot): void {
  ThemeSupport.ThemeSupport.instance().appendStyle(root, applicationColorTokensStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, designTokensStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, inspectorCommonStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, textButtonStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, themeColorsStyles);
  ThemeSupport.ThemeSupport.instance().appendStyle(root, tokens);

  ThemeSupport.ThemeSupport.instance().injectHighlightStyleSheets(root);
}

export function injectTextButtonStyles(root: Element|ShadowRoot): void {
  ThemeSupport.ThemeSupport.instance().appendStyle(root, textButtonStyles);
}

export function createShadowRootWithCoreStyles(
    element: Element, options: {cssFile?: CSSStyleSheet[]|{cssContent: string}, delegatesFocus?: boolean} = {
      delegatesFocus: undefined,
      cssFile: undefined,
    }): ShadowRoot {
  const {
    cssFile,
    delegatesFocus,
  } = options;

  const shadowRoot = element.attachShadow({mode: 'open', delegatesFocus});
  injectCoreStyles(shadowRoot);
  if (cssFile) {
    if ('cssContent' in cssFile) {
      ThemeSupport.ThemeSupport.instance().appendStyle(shadowRoot, cssFile);
    } else {
      shadowRoot.adoptedStyleSheets = cssFile;
    }
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

export function registerCustomElement(
    localName: string, typeExtension: string, definition: new () => HTMLElement): () => Element {
  self.customElements.define(typeExtension, class extends definition {
    constructor() {
      // The JSDoc above does not allow the super call to have no params, but
      // it seems to be the nearest to something both Closure and TS understand.
      // @ts-ignore crbug.com/1011811: Fix after Closure has been removed.
      super();
      // TODO(einbinder) convert to classes and custom element tags
      this.setAttribute('is', typeExtension);
    }
  }, {extends: localName});
  return (): Element => document.createElement(localName, {is: typeExtension});
}
