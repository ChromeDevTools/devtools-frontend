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

import * as Common from '../common/common.js';
import * as DOMExtension from '../dom_extension/dom_extension.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as ThemeSupport from '../theme_support/theme_support.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Dialog} from './Dialog.js';
import {Size} from './Geometry.js';
import {GlassPane, PointerEventsBehavior, SizeBehavior} from './GlassPane.js';
import {Icon} from './Icon.js';
import {KeyboardShortcut} from './KeyboardShortcut.js';
import {Toolbar, ToolbarButton} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {Tooltip} from './Tooltip.js';
import {TreeOutline} from './Treeoutline.js';  // eslint-disable-line no-unused-vars
import {appendStyle} from './utils/append-style.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';
import {focusChanged} from './utils/focus-changed.js';
import {injectCoreStyles} from './utils/inject-core-styles.js';
import {measuredScrollbarWidth} from './utils/measured-scrollbar-width.js';
import {registerCustomElement} from './utils/register-custom-element.js';

export const highlightedSearchResultClassName = 'highlighted-search-result';
export const highlightedCurrentSearchResultClassName = 'current-search-result';

/**
 * @param {!Element} element
 * @param {?function(!MouseEvent): boolean} elementDragStart
 * @param {function(!MouseEvent):void} elementDrag
 * @param {?function(!MouseEvent):void} elementDragEnd
 * @param {?string} cursor
 * @param {?string=} hoverCursor
 * @param {number=} startDelay
 */
export function installDragHandle(
    element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay) {
  /**
   * @param {!Event} event
   */
  function onMouseDown(event) {
    const dragHandler = new DragHandler();
    const dragStart = () =>
        dragHandler.elementDragStart(element, elementDragStart, elementDrag, elementDragEnd, cursor, event);
    if (startDelay) {
      startTimer = window.setTimeout(dragStart, startDelay);
    } else {
      dragStart();
    }
  }

  function onMouseUp() {
    if (startTimer) {
      window.clearTimeout(startTimer);
    }
    startTimer = null;
  }

  /** @type {?number} */
  let startTimer;
  element.addEventListener('mousedown', onMouseDown, false);
  if (startDelay) {
    element.addEventListener('mouseup', onMouseUp, false);
  }
  if (hoverCursor !== null) {
    /** @type {!HTMLElement} */ (element).style.cursor = hoverCursor || cursor || '';
  }
}

/**
 * @param {!Element} targetElement
 * @param {?function(!MouseEvent):boolean} elementDragStart
 * @param {function(!MouseEvent):void} elementDrag
 * @param {?function(!MouseEvent):void} elementDragEnd
 * @param {?string} cursor
 * @param {!Event} event
 */
export function elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
  const dragHandler = new DragHandler();
  dragHandler.elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event);
}

class DragHandler {
  constructor() {
    this._elementDragMove = this._elementDragMove.bind(this);
    this._elementDragEnd = this._elementDragEnd.bind(this);
    this._mouseOutWhileDragging = this._mouseOutWhileDragging.bind(this);
  }

  _createGlassPane() {
    this._glassPaneInUse = true;
    if (!DragHandler._glassPaneUsageCount++) {
      DragHandler._glassPane = new GlassPane();
      DragHandler._glassPane.setPointerEventsBehavior(PointerEventsBehavior.BlockedByGlassPane);
      if (DragHandler._documentForMouseOut) {
        DragHandler._glassPane.show(DragHandler._documentForMouseOut);
      }
    }
  }

  _disposeGlassPane() {
    if (!this._glassPaneInUse) {
      return;
    }
    this._glassPaneInUse = false;
    if (--DragHandler._glassPaneUsageCount) {
      return;
    }
    if (DragHandler._glassPane) {
      DragHandler._glassPane.hide();
      DragHandler._glassPane = null;
    }
    DragHandler._documentForMouseOut = null;
  }

  /**
   * @param {!Element} targetElement
   * @param {?function(!MouseEvent):boolean} elementDragStart
   * @param {function(!MouseEvent):void} elementDrag
   * @param {?function(!MouseEvent):void} elementDragEnd
   * @param {?string} cursor
   * @param {!Event} ev
   */
  elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, ev) {
    const event = /** @type {!MouseEvent} */ (ev);
    // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
    if (event.button || (Host.Platform.isMac() && event.ctrlKey)) {
      return;
    }

    if (this._elementDraggingEventListener) {
      return;
    }

    if (elementDragStart && !elementDragStart(/** @type {!MouseEvent} */ (event))) {
      return;
    }

    const targetDocument = /** @type {!Document} */ (event.target instanceof Node && event.target.ownerDocument);
    this._elementDraggingEventListener = elementDrag;
    this._elementEndDraggingEventListener = elementDragEnd;
    console.assert(
        (DragHandler._documentForMouseOut || targetDocument) === targetDocument, 'Dragging on multiple documents.');
    DragHandler._documentForMouseOut = targetDocument;
    this._dragEventsTargetDocument = targetDocument;
    try {
      if (targetDocument.defaultView) {
        this._dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;
      }
    } catch (e) {
      this._dragEventsTargetDocumentTop = this._dragEventsTargetDocument;
    }

    targetDocument.addEventListener('mousemove', e => this._elementDragMove(/** @type {!MouseEvent} */ (e)), true);
    targetDocument.addEventListener('mouseup', this._elementDragEnd, true);
    targetDocument.addEventListener('mouseout', this._mouseOutWhileDragging, true);
    if (this._dragEventsTargetDocumentTop && targetDocument !== this._dragEventsTargetDocumentTop) {
      this._dragEventsTargetDocumentTop.addEventListener('mouseup', this._elementDragEnd, true);
    }

    const targetHtmlElement = /** @type {!HTMLElement} */ (targetElement);
    if (typeof cursor === 'string') {
      this._restoreCursorAfterDrag = restoreCursor.bind(this, targetHtmlElement.style.cursor);
      targetHtmlElement.style.cursor = cursor;
      targetDocument.body.style.cursor = cursor;
    }
    /**
     * @param {string} oldCursor
     * @this {DragHandler}
     */
    function restoreCursor(oldCursor) {
      targetDocument.body.style.removeProperty('cursor');
      targetHtmlElement.style.cursor = oldCursor;
      this._restoreCursorAfterDrag = undefined;
    }
    event.preventDefault();
  }

  _mouseOutWhileDragging() {
    this._unregisterMouseOutWhileDragging();
    this._createGlassPane();
  }

  _unregisterMouseOutWhileDragging() {
    if (!DragHandler._documentForMouseOut) {
      return;
    }
    DragHandler._documentForMouseOut.removeEventListener('mouseout', this._mouseOutWhileDragging, true);
  }

  _unregisterDragEvents() {
    if (!this._dragEventsTargetDocument) {
      return;
    }
    this._dragEventsTargetDocument.removeEventListener('mousemove', this._elementDragMove, true);
    this._dragEventsTargetDocument.removeEventListener('mouseup', this._elementDragEnd, true);
    if (this._dragEventsTargetDocumentTop && this._dragEventsTargetDocument !== this._dragEventsTargetDocumentTop) {
      this._dragEventsTargetDocumentTop.removeEventListener('mouseup', this._elementDragEnd, true);
    }
    delete this._dragEventsTargetDocument;
    delete this._dragEventsTargetDocumentTop;
  }

  /**
   * @param {!MouseEvent} event
   */
  _elementDragMove(event) {
    if (event.buttons !== 1) {
      this._elementDragEnd(event);
      return;
    }
    if (this._elementDraggingEventListener && this._elementDraggingEventListener(event)) {
      this._cancelDragEvents(event);
    }
  }

  /**
   * @param {!Event} event
   */
  _cancelDragEvents(event) {
    this._unregisterDragEvents();
    this._unregisterMouseOutWhileDragging();

    if (this._restoreCursorAfterDrag) {
      this._restoreCursorAfterDrag();
    }

    this._disposeGlassPane();

    delete this._elementDraggingEventListener;
    delete this._elementEndDraggingEventListener;
  }

  /**
   * @param {!Event} event
   */
  _elementDragEnd(event) {
    const elementDragEnd = this._elementEndDraggingEventListener;
    this._cancelDragEvents(/** @type {!MouseEvent} */ (event));
    event.preventDefault();
    if (elementDragEnd) {
      elementDragEnd(/** @type {!MouseEvent} */ (event));
    }
  }
}

DragHandler._glassPaneUsageCount = 0;

/** @type {?GlassPane} */
DragHandler._glassPane = null;

/** @type {?Document} */
DragHandler._documentForMouseOut = null;

/**
 * @param {?Node=} node
 * @return {boolean}
 */
export function isBeingEdited(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const element = /** @type {!Element} */ (node);
  if (element.classList.contains('text-prompt') || element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
    return true;
  }

  if (!elementsBeingEdited.size) {
    return false;
  }

  /** @type {?Element} */
  let currentElement = element;
  while (currentElement) {
    if (elementsBeingEdited.has(element)) {
      return true;
    }
    currentElement = currentElement.parentElementOrShadowHost();
  }
  return false;
}

/**
 * @return {boolean}
 */
export function isEditing() {
  if (elementsBeingEdited.size) {
    return true;
  }

  const focused = document.deepActiveElement();
  if (!focused) {
    return false;
  }
  return focused.classList.contains('text-prompt') || focused.nodeName === 'INPUT' || focused.nodeName === 'TEXTAREA';
}

/**
 * @param {!Element} element
 * @param {boolean} value
 * @return {boolean}
 */
export function markBeingEdited(element, value) {
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

/** @type {!Set<!Element>} */
const elementsBeingEdited = new Set();

// Avoids Infinity, NaN, and scientific notation (e.g. 1e20), see crbug.com/81165.
const _numberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;

export const StyleValueDelimiters = ' \xA0\t\n"\':;,/()';

/**
 * @param {!Event} event
 * @return {?string}
 */
export function getValueModificationDirection(event) {
  let direction = null;
  if (event.type === 'wheel') {
    // When shift is pressed while spinning mousewheel, delta comes as wheelDeltaX.
    const wheelEvent = /** @type {!WheelEvent} */ (event);
    if (wheelEvent.deltaY < 0 || wheelEvent.deltaX < 0) {
      direction = 'Up';
    } else if (wheelEvent.deltaY > 0 || wheelEvent.deltaX > 0) {
      direction = 'Down';
    }
  } else {
    const keyEvent = /** @type {!KeyboardEvent} */ (event);
    if (keyEvent.key === 'ArrowUp' || keyEvent.key === 'PageUp') {
      direction = 'Up';
    } else if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'PageDown') {
      direction = 'Down';
    }
  }

  return direction;
}

/**
 * @param {string} hexString
 * @param {!Event} event
 * @return {?string}
 */
function _modifiedHexValue(hexString, event) {
  const direction = getValueModificationDirection(event);
  if (!direction) {
    return null;
  }

  const mouseEvent = /** @type {!MouseEvent} */ (event);
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
  if (KeyboardShortcut.eventHasCtrlOrMeta(mouseEvent)) {
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

/**
 * @param {number} number
 * @param {!Event} event
 * @param {number=} modifierMultiplier
 * @return {?number}
 */
function _modifiedFloatNumber(number, event, modifierMultiplier) {
  const direction = getValueModificationDirection(event);
  if (!direction) {
    return null;
  }

  const mouseEvent = /** @type {!MouseEvent} */ (event);

  // Precision modifier keys work with both mousewheel and up/down keys.
  // When ctrl is pressed, increase by 100.
  // When shift is pressed, increase by 10.
  // When alt is pressed, increase by 0.1.
  // Otherwise increase by 1.
  let delta = 1;
  if (KeyboardShortcut.eventHasCtrlOrMeta(mouseEvent)) {
    delta = 100;
  } else if (mouseEvent.shiftKey) {
    delta = 10;
  } else if (mouseEvent.altKey) {
    delta = 0.1;
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
  if (!String(result).match(_numberRegex)) {
    return null;
  }
  return result;
}

/**
 * @param {string} wordString
 * @param {!Event} event
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {?string}
 */
export function createReplacementString(wordString, event, customNumberHandler) {
  let prefix;
  let suffix;
  let number;
  let replacementString = null;
  let matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
  if (matches && matches.length) {
    prefix = matches[1];
    suffix = matches[3];
    number = _modifiedHexValue(matches[2], event);
    if (number !== null) {
      replacementString = prefix + number + suffix;
    }
  } else {
    matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
    if (matches && matches.length) {
      prefix = matches[1];
      suffix = matches[3];
      number = _modifiedFloatNumber(parseFloat(matches[2]), event);
      if (number !== null) {
        replacementString =
            customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
      }
    }
  }
  return replacementString;
}

/**
 * @param {!Event} event
 * @param {!Element} element
 * @param {function(string,string):void=} finishHandler
 * @param {(function(string):*)=} suggestionHandler
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {boolean}
 */
export function handleElementValueModifications(event, element, finishHandler, suggestionHandler, customNumberHandler) {
  const arrowKeyOrWheelEvent =
      (/** @type {!KeyboardEvent} */ (event).key === 'ArrowUp' ||
       /** @type {!KeyboardEvent} */ (event).key === 'ArrowDown' || event.type === 'wheel');
  const pageKeyPressed =
      (/** @type {!KeyboardEvent} */ (event).key === 'PageUp' ||
       /** @type {!KeyboardEvent} */ (event).key === 'PageDown');
  if (!arrowKeyOrWheelEvent && !pageKeyPressed) {
    return false;
  }

  const selection = element.getComponentSelection();
  if (!selection || !selection.rangeCount) {
    return false;
  }

  const selectionRange = selection.getRangeAt(0);
  if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element)) {
    return false;
  }

  const originalValue = element.textContent;
  const wordRange = DOMExtension.DOMExtension.rangeOfWord(
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

/**
 * @param {number} ms
 * @param {number=} precision
 * @return {string}
 */
Number.preciseMillisToString = function(ms, precision) {
  precision = precision || 0;
  const format = '%.' + precision + 'f\xa0ms';
  return Common.UIString.UIString(format, ms);
};

/** @type {!Common.UIString.UIStringFormat} */
export const _microsFormat = new Common.UIString.UIStringFormat('%.0f\xa0\u03bcs');

/** @type {!Common.UIString.UIStringFormat} */
export const _subMillisFormat = new Common.UIString.UIStringFormat('%.2f\xa0ms');

/** @type {!Common.UIString.UIStringFormat} */
export const _millisFormat = new Common.UIString.UIStringFormat('%.0f\xa0ms');

/** @type {!Common.UIString.UIStringFormat} */
export const _secondsFormat = new Common.UIString.UIStringFormat('%.2f\xa0s');

/** @type {!Common.UIString.UIStringFormat} */
export const _minutesFormat = new Common.UIString.UIStringFormat('%.1f\xa0min');

/** @type {!Common.UIString.UIStringFormat} */
export const _hoursFormat = new Common.UIString.UIStringFormat('%.1f\xa0hrs');

/** @type {!Common.UIString.UIStringFormat} */
export const _daysFormat = new Common.UIString.UIStringFormat('%.1f\xa0days');

/**
 * @param {number} ms
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.millisToString = function(ms, higherResolution) {
  if (!isFinite(ms)) {
    return '-';
  }

  if (ms === 0) {
    return '0';
  }

  if (higherResolution && ms < 0.1) {
    return _microsFormat.format(ms * 1000);
  }
  if (higherResolution && ms < 1000) {
    return _subMillisFormat.format(ms);
  }
  if (ms < 1000) {
    return _millisFormat.format(ms);
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return _secondsFormat.format(seconds);
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return _minutesFormat.format(minutes);
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return _hoursFormat.format(hours);
  }

  const days = hours / 24;
  return _daysFormat.format(days);
};

/**
 * @param {number} seconds
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.secondsToString = function(seconds, higherResolution) {
  if (!isFinite(seconds)) {
    return '-';
  }
  return Number.millisToString(seconds * 1000, higherResolution);
};

/**
 * @param {number} num
 * @return {string}
 */
Number.withThousandsSeparator = function(num) {
  let str = String(num);
  const re = /(\d+)(\d{3})/;
  while (str.match(re)) {
    str = str.replace(re, '$1\xA0$2');
  }  // \xa0 is a non-breaking space
  return str;
};

/**
 * @param {string} format
 * @param {?ArrayLike<*>} substitutions
 * @return {!Element}
 */
export function formatLocalized(format, substitutions) {
  const formatters = {s: /** @param {*} substitution */ substitution => substitution};
  /**
   * @param {!Element} a
   * @param {*} b
   * @return {!Element}
   */
  function append(a, b) {
    a.appendChild(typeof b === 'string' ? document.createTextNode(b) : /** @type {!Element} */ (b));
    return a;
  }
  return Platform.StringUtilities
      .format(Common.UIString.UIString(format), substitutions, formatters, document.createElement('span'), append)
      .formattedResult;
}

/**
 * @return {string}
 */
export function openLinkExternallyLabel() {
  return Common.UIString.UIString('Open in new tab');
}

/**
 * @return {string}
 */
export function copyLinkAddressLabel() {
  return Common.UIString.UIString('Copy link address');
}


/**
 * @return {string}
 */
export function copyFileNameLabel() {
  return ls`Copy file name`;
}

/**
 * @return {string}
 */
export function anotherProfilerActiveLabel() {
  return Common.UIString.UIString('Another profiler is already active');
}

/**
 * @param {string|undefined} description
 * @return {string}
 */
export function asyncStackTraceLabel(description) {
  if (description) {
    if (description === 'Promise.resolve') {
      return ls`Promise resolved (async)`;
    }
    if (description === 'Promise.reject') {
      return ls`Promise rejected (async)`;
    }
    return ls`${description} (async)`;
  }
  return Common.UIString.UIString('Async Call');
}

/**
 * @param {!Element} element
 */
export function installComponentRootStyles(element) {
  injectCoreStyles(element);
  element.classList.add('platform-' + Host.Platform.platform());

  // Detect overlay scrollbar enable by checking for nonzero scrollbar width.
  if (!Host.Platform.isMac() && measuredScrollbarWidth(element.ownerDocument) === 0) {
    element.classList.add('overlay-scrollbar-enabled');
  }
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
function _windowFocused(document, event) {
  if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document.body.classList.remove('inactive');
  }
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
function _windowBlurred(document, event) {
  if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document.body.classList.add('inactive');
  }
}

export class ElementFocusRestorer {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    /** @type {?HTMLElement} */
    this._element = /** @type {?HTMLElement} */ (element);
    /** @type {?HTMLElement} */
    this._previous = /** @type {?HTMLElement} */ (element.ownerDocument.deepActiveElement());
    /** @type {!HTMLElement} */ (element).focus();
  }

  restore() {
    if (!this._element) {
      return;
    }
    if (this._element.hasFocus() && this._previous) {
      this._previous.focus();
    }
    this._previous = null;
    this._element = null;
  }
}

/**
 * @param {!Element} element
 * @param {number} offset
 * @param {number} length
 * @param {!Array.<*>=} domChanges
 * @return {?Element}
 */
export function highlightSearchResult(element, offset, length, domChanges) {
  const result = highlightSearchResults(element, [new TextUtils.TextRange.SourceRange(offset, length)], domChanges);
  return result.length ? result[0] : null;
}

/**
 * @param {!Element} element
 * @param {!Array.<!TextUtils.TextRange.SourceRange>} resultRanges
 * @param {!Array.<!HighlightChange>=} changes
 * @return {!Array.<!Element>}
 */
export function highlightSearchResults(element, resultRanges, changes) {
  return highlightRangesWithStyleClass(element, resultRanges, highlightedSearchResultClassName, changes);
}

/**
 * @param {!Element} element
 * @param {string} className
 */
export function runCSSAnimationOnce(element, className) {
  function animationEndCallback() {
    element.classList.remove(className);
    element.removeEventListener('webkitAnimationEnd', animationEndCallback, false);
  }

  if (element.classList.contains(className)) {
    element.classList.remove(className);
  }

  element.addEventListener('webkitAnimationEnd', animationEndCallback, false);
  element.classList.add(className);
}

/**
 * @param {!Element} element
 * @param {!Array.<!TextUtils.TextRange.SourceRange>} resultRanges
 * @param {string} styleClass
 * @param {!Array.<!HighlightChange>=} changes
 * @return {!Array.<!Element>}
 */
export function highlightRangesWithStyleClass(element, resultRanges, styleClass, changes) {
  changes = changes || [];
  /** @type {!Array<!Element>} */
  const highlightNodes = [];
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

  const nodeRanges = [];
  let rangeEndOffset = 0;
  for (const textNode of textNodes) {
    const range = {};
    range.offset = rangeEndOffset;
    range.length = textNode.textContent ? textNode.textContent.length : 0;
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
      node: /** @type {!Element} */ (lastTextNode),
      type: 'changed',
      oldText: lastText,
      newText: lastTextNode.textContent,
      nextSibling: undefined,
      parent: undefined
    });

    if (startIndex === endIndex && lastTextNode.parentElement) {
      lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
      changes.push({
        node: highlightNode,
        type: 'added',
        nextSibling: lastTextNode,
        parent: lastTextNode.parentElement,
        oldText: undefined,
        newText: undefined
      });
      highlightNodes.push(highlightNode);

      const prefixNode =
          ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
      lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
      changes.push({
        node: /** @type {*} */ (prefixNode),
        type: 'added',
        nextSibling: highlightNode,
        parent: lastTextNode.parentElement,
        oldText: undefined,
        newText: undefined
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
          newText: undefined
        });
        highlightNodes.push(highlightNode);
      }

      firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
      changes.push({
        node: /** @type {!Element} */ (firstTextNode),
        type: 'changed',
        oldText: firstText,
        newText: firstTextNode.textContent,
        nextSibling: undefined,
        parent: undefined
      });

      for (let j = startIndex + 1; j < endIndex; j++) {
        const textNode = textNodes[j];
        const text = textNode.textContent;
        textNode.textContent = '';
        changes.push({
          node: /** @type {!Element} */ (textNode),
          type: 'changed',
          oldText: text || undefined,
          newText: textNode.textContent,
          nextSibling: undefined,
          parent: undefined
        });
      }
    }
    startIndex = endIndex;
    nodeRanges[startIndex].offset = endOffset;
    nodeRanges[startIndex].length = lastTextNode.textContent.length;
  }
  return highlightNodes;
}

/** @param {!Array<*>} domChanges */
export function applyDomChanges(domChanges) {
  for (let i = 0, size = domChanges.length; i < size; ++i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case 'added':
        entry.parent.insertBefore(entry.node, entry.nextSibling);
        break;
      case 'changed':
        entry.node.textContent = entry.newText;
        break;
    }
  }
}

/** @param {!Array<*>} domChanges */
export function revertDomChanges(domChanges) {
  for (let i = domChanges.length - 1; i >= 0; --i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case 'added':
        entry.node.remove();
        break;
      case 'changed':
        entry.node.textContent = entry.oldText;
        break;
    }
  }
}

/**
 * @param {!Element} element
 * @param {?Element=} containerElement
 * @return {!Size}
 */
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
  } else {
    element.remove();
  }
  return new Size(result.width, result.height);
}

class InvokeOnceHandlers {
  /**
   * @param {boolean} autoInvoke
   */
  constructor(autoInvoke) {
    this._handlers = null;
    this._autoInvoke = autoInvoke;
  }

  /**
   * @param {!Object} object
   * @param {function():void} method
   */
  add(object, method) {
    if (!this._handlers) {
      this._handlers = new Map();
      if (this._autoInvoke) {
        this.scheduleInvoke();
      }
    }
    let methods = this._handlers.get(object);
    if (!methods) {
      methods = new Set();
      this._handlers.set(object, methods);
    }
    methods.add(method);
  }
  scheduleInvoke() {
    if (this._handlers) {
      requestAnimationFrame(this._invoke.bind(this));
    }
  }

  _invoke() {
    const handlers = this._handlers || new Map();  // Make closure happy. This should not be null.
    this._handlers = null;
    for (const [object, methods] of handlers) {
      for (const method of methods) {
        method.call(object);
      }
    }
  }
}

let _coalescingLevel = 0;
/** @type {?InvokeOnceHandlers} */
let _postUpdateHandlers = null;

export function startBatchUpdate() {
  if (!_coalescingLevel++) {
    _postUpdateHandlers = new InvokeOnceHandlers(false);
  }
}

export function endBatchUpdate() {
  if (--_coalescingLevel) {
    return;
  }

  if (_postUpdateHandlers) {
    _postUpdateHandlers.scheduleInvoke();
    _postUpdateHandlers = null;
  }
}

/**
 * @param {!Object} object
 * @param {function():void} method
 */
export function invokeOnceAfterBatchUpdate(object, method) {
  if (!_postUpdateHandlers) {
    _postUpdateHandlers = new InvokeOnceHandlers(true);
  }
  _postUpdateHandlers.add(object, method);
}

/**
 * @param {!Window} window
 * @param {!Function} func
 * @param {!Array.<{from:number, to:number}>} params
 * @param {number} duration
 * @param {function():*=} animationComplete
 * @return {function():void}
 */
export function animateFunction(window, func, params, duration, animationComplete) {
  const start = window.performance.now();
  let raf = window.requestAnimationFrame(animationStep);

  /** @param {number} timestamp */
  function animationStep(timestamp) {
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

export class LongClickController extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Element} element
   * @param {function(!Event):void} callback
   * @param {function(!Event):boolean} isEditKeyFunc
   */
  constructor(element, callback, isEditKeyFunc = event => isEnterOrSpaceKey(event)) {
    super();
    this._element = element;
    this._callback = callback;
    this._editKey = isEditKeyFunc;
    this._enable();

    /** @type {({mouseUp: function(!Event):void, mouseDown: function(!Event):void, reset: function():void}|undefined)}} */
    this._longClickData;

    /** @type {(number|undefined)} */
    this._longClickInterval;
  }

  reset() {
    if (this._longClickInterval) {
      clearInterval(this._longClickInterval);
      delete this._longClickInterval;
    }
  }

  _enable() {
    if (this._longClickData) {
      return;
    }
    const boundKeyDown = keyDown.bind(this);
    const boundKeyUp = keyUp.bind(this);
    const boundMouseDown = mouseDown.bind(this);
    const boundMouseUp = mouseUp.bind(this);
    const boundReset = this.reset.bind(this);


    this._element.addEventListener('keydown', boundKeyDown, false);
    this._element.addEventListener('keyup', boundKeyUp, false);
    this._element.addEventListener('mousedown', boundMouseDown, false);
    this._element.addEventListener('mouseout', boundReset, false);
    this._element.addEventListener('mouseup', boundMouseUp, false);
    this._element.addEventListener('click', boundReset, true);

    this._longClickData = {mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset};

    /**
     * @param {!Event} e
     * @this {LongClickController}
     */
    function keyDown(e) {
      if (this._editKey(e)) {
        const callback = this._callback;
        this._longClickInterval = window.setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
      }
    }

    /**
     * @param {!Event} e
     * @this {LongClickController}
     */
    function keyUp(e) {
      if (this._editKey(e)) {
        this.reset();
      }
    }

    /**
     * @param {!Event} e
     * @this {LongClickController}
     */
    function mouseDown(e) {
      if (/** @type {!MouseEvent} */ (e).which !== 1) {
        return;
      }
      const callback = this._callback;
      this._longClickInterval = window.setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
    }

    /**
     * @param {!Event} e
     * @this {LongClickController}
     */
    function mouseUp(e) {
      if (/** @type {!MouseEvent} */ (e).which !== 1) {
        return;
      }
      this.reset();
    }
  }

  dispose() {
    if (!this._longClickData) {
      return;
    }
    this._element.removeEventListener('mousedown', this._longClickData.mouseDown, false);
    this._element.removeEventListener('mouseout', this._longClickData.reset, false);
    this._element.removeEventListener('mouseup', this._longClickData.mouseUp, false);
    this._element.addEventListener('click', this._longClickData.reset, true);
    delete this._longClickData;
  }
}

LongClickController.TIME_MS = 200;

/**
 * @param {!Document} document
 * @param {!Common.Settings.Setting<string>} themeSetting
 */
export function initializeUIUtils(document, themeSetting) {
  document.body.classList.toggle('inactive', !document.hasFocus());
  if (document.defaultView) {
    document.defaultView.addEventListener('focus', _windowFocused.bind(undefined, document), false);
    document.defaultView.addEventListener('blur', _windowBlurred.bind(undefined, document), false);
  }
  document.addEventListener('focus', focusChanged.bind(undefined), true);

  if (!ThemeSupport.ThemeSupport.hasInstance()) {
    ThemeSupport.ThemeSupport.instance({forceNew: true, setting: themeSetting});
  }
  ThemeSupport.ThemeSupport.instance().applyTheme(document);

  const body = /** @type {!Element} */ (document.body);
  appendStyle(body, 'ui/inspectorStyle.css', {enableLegacyPatching: true});
  appendStyle(body, 'ui/themeColors.css', {enableLegacyPatching: false});
  GlassPane.setContainer(/** @type {!Element} */ (document.body));
}

/**
 * @param {string} name
 * @return {string}
 */
export function beautifyFunctionName(name) {
  return name || Common.UIString.UIString('(anonymous)');
}

/**
 * @param {!Element|!DocumentFragment} element
 * @param {string} text
 * @return {!Text}
 */
export const createTextChild = (element, text) => {
  const textNode = element.ownerDocument.createTextNode(text);
  element.appendChild(textNode);
  return textNode;
};

/**
 * @param {!Element|!DocumentFragment} element
 * @param {...string} childrenText
 */
export const createTextChildren = (element, ...childrenText) => {
  for (const child of childrenText) {
    createTextChild(element, child);
  }
};

/**
 * @param {string} text
 * @param {function(!Event):*=} eventHandler
 * @param {string=} className
 * @param {boolean=} primary
 * @param {string=} alternativeEvent
 * @return {!HTMLButtonElement}
 */
export function createTextButton(text, eventHandler, className, primary, alternativeEvent) {
  const element = /** @type {!HTMLButtonElement} */ (document.createElement('button'));
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  element.classList.add('text-button');
  if (primary) {
    element.classList.add('primary-button');
  }
  if (eventHandler) {
    element.addEventListener(alternativeEvent || 'click', eventHandler);
  }
  element.type = 'button';
  return element;
}


/**
 * @param {string=} className
 * @param {string=} type
 * @return {!HTMLInputElement}
 */
export function createInput(className, type) {
  const element = document.createElement('input');
  if (className) {
    element.className = className;
  }
  element.spellcheck = false;
  element.classList.add('harmony-input');
  if (type) {
    element.type = type;
  }
  return /** @type {!HTMLInputElement} */ (element);
}

/**
 * @param {string} name
 * @param {!Array<!Map<string, !Array<string>>> | !Array<string> | !Set<string>} options
 * @return {!HTMLSelectElement}
 */
export function createSelect(name, options) {
  const select = /** @type {!HTMLSelectElement} */ (document.createElementWithClass('select', 'chrome-select'));
  ARIAUtils.setAccessibleName(select, name);
  for (const option of options) {
    if (option instanceof Map) {
      for (const [key, value] of option) {
        const optGroup = /** @type {!HTMLOptGroupElement} */ (select.createChild('optgroup'));
        optGroup.label = key;
        for (const child of value) {
          if (typeof child === 'string') {
            optGroup.appendChild(new Option(child, child));
          }
        }
      }
    } else if (typeof option === 'string') {
      select.add(new Option(option, option));
    }
  }
  return select;
}

/**
 * @param {string} title
 * @param {string=} className
 * @param {!Element=} associatedControl
 * @return {!Element}
 */
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

/**
 * @param {string} name
 * @param {string} title
 * @param {boolean=} checked
 * @return {!DevToolsRadioButton}
 */
export function createRadioLabel(name, title, checked) {
  const element = /** @type {!DevToolsRadioButton} */ (document.createElement('span', {is: 'dt-radio'}));
  element.radioElement.name = name;
  element.radioElement.checked = Boolean(checked);
  createTextChild(element.labelElement, title);
  return element;
}

/**
 * @param {string} title
 * @param {string} iconClass
 * @return {!HTMLElement}
 */
export function createIconLabel(title, iconClass) {
  const element = /** @type {!DevToolsIconLabel} */ (document.createElement('span', {is: 'dt-icon-label'}));
  element.createChild('span').textContent = title;
  element.type = iconClass;
  return element;
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} tabIndex
 * @return {!Element}
 */
export function createSlider(min, max, tabIndex) {
  const element = /** @type {!DevToolsSlider} */ (document.createElement('span', {is: 'dt-slider'}));
  element.sliderElement.min = String(min);
  element.sliderElement.max = String(max);
  element.sliderElement.step = String(1);
  element.sliderElement.tabIndex = tabIndex;
  return element;
}

/**
 * @param {!HTMLElement} element
 * @param {string} title
 * @param {string | undefined} actionId
 */
export function setTitle(element, title, actionId = undefined) {
  ARIAUtils.setAccessibleName(element, title);
  Tooltip.install(element, title, actionId, {
    anchorTooltipAtElement: true,
  });
}

export class CheckboxLabel extends HTMLSpanElement {
  constructor() {
    super();
    /** @type {!DocumentFragment} */
    this._shadowRoot;
    /** @type {!HTMLInputElement} */
    this.checkboxElement;
    /** @type {!Element} */
    this.textElement;
    CheckboxLabel._lastId = CheckboxLabel._lastId + 1;
    const id = 'ui-checkbox-label' + CheckboxLabel._lastId;
    this._shadowRoot = createShadowRootWithCoreStyles(
        this, {cssFile: 'ui/checkboxTextLabel.css', enableLegacyPatching: true, delegatesFocus: undefined});
    this.checkboxElement = /** @type {!HTMLInputElement} */ (this._shadowRoot.createChild('input'));
    this.checkboxElement.type = 'checkbox';
    this.checkboxElement.setAttribute('id', id);
    this.textElement = this._shadowRoot.createChild('label', 'dt-checkbox-text');
    this.textElement.setAttribute('for', id);
    this._shadowRoot.createChild('slot');
  }

  /**
   * @param {string=} title
   * @param {boolean=} checked
   * @param {string=} subtitle
   * @return {!CheckboxLabel}
   */
  static create(title, checked, subtitle) {
    if (!CheckboxLabel._constructor) {
      CheckboxLabel._constructor = registerCustomElement('span', 'dt-checkbox', CheckboxLabel);
    }
    const element = /** @type {!CheckboxLabel} */ (CheckboxLabel._constructor());
    element.checkboxElement.checked = Boolean(checked);
    if (title !== undefined) {
      element.textElement.textContent = title;
      ARIAUtils.setAccessibleName(element.checkboxElement, title);
      if (subtitle !== undefined) {
        element.textElement.createChild('div', 'dt-checkbox-subtitle').textContent = subtitle;
      }
    }
    return element;
  }

  /**
   * @param {string} color
   */
  set backgroundColor(color) {
    this.checkboxElement.classList.add('dt-checkbox-themed');
    this.checkboxElement.style.backgroundColor = color;
  }

  /**
   * @param {string} color
   */
  set checkColor(color) {
    this.checkboxElement.classList.add('dt-checkbox-themed');
    const stylesheet = document.createElement('style');
    stylesheet.textContent = 'input.dt-checkbox-themed:checked:after { background-color: ' + color + '}';
    this._shadowRoot.appendChild(stylesheet);
  }

  /**
   * @param {string} color
   */
  set borderColor(color) {
    this.checkboxElement.classList.add('dt-checkbox-themed');
    this.checkboxElement.style.borderColor = color;
  }
}

/** @type {number} */
CheckboxLabel._lastId = 0;

/** @type {?function():Element} */
CheckboxLabel._constructor = null;

export class DevToolsIconLabel extends HTMLSpanElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, {
      enableLegacyPatching: true,
      cssFile: undefined,
      delegatesFocus: undefined,
    });
    this._iconElement = Icon.create();
    this._iconElement.style.setProperty('margin-right', '4px');
    root.appendChild(this._iconElement);
    root.createChild('slot');
  }

  /**
   * @param {string} type
   */
  set type(type) {
    this._iconElement.setIconType(type);
  }
}

let labelId = 0;

export class DevToolsRadioButton extends HTMLSpanElement {
  constructor() {
    super();
    /** @type {!HTMLInputElement} */
    this.radioElement = /** @type {!HTMLInputElement} */ (this.createChild('input', 'dt-radio-button'));
    /** @type {!HTMLLabelElement} */
    this.labelElement = /** @type {!HTMLLabelElement} */ (this.createChild('label'));

    const id = 'dt-radio-button-id' + (++labelId);
    this.radioElement.id = id;
    this.radioElement.type = 'radio';
    this.labelElement.htmlFor = id;
    const root = createShadowRootWithCoreStyles(
        this, {cssFile: 'ui/radioButton.css', enableLegacyPatching: true, delegatesFocus: undefined});
    root.createChild('slot');
    this.addEventListener('click', this.radioClickHandler.bind(this), false);
  }

  radioClickHandler() {
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
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(
        this, {cssFile: 'ui/slider.css', enableLegacyPatching: true, delegatesFocus: undefined});
    this.sliderElement = document.createElement('input');
    this.sliderElement.classList.add('dt-range-input');
    this.sliderElement.type = 'range';
    root.appendChild(this.sliderElement);
  }

  /**
     * @param {number} amount
     */
  set value(amount) {
    this.sliderElement.value = String(amount);
  }

  get value() {
    return Number(this.sliderElement.value);
  }
}

registerCustomElement('span', 'dt-slider', DevToolsSlider);

export class DevToolsSmallBubble extends HTMLSpanElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(
        this, {cssFile: 'ui/smallBubble.css', enableLegacyPatching: true, delegatesFocus: undefined});
    this._textElement = root.createChild('div');
    this._textElement.className = 'info';
    this._textElement.createChild('slot');
  }

  /**
     * @param {string} type
     */
  set type(type) {
    this._textElement.className = type;
  }
}

registerCustomElement('span', 'dt-small-bubble', DevToolsSmallBubble);

export class DevToolsCloseButton extends HTMLDivElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(
        this, {cssFile: 'ui/closeButton.css', enableLegacyPatching: false, delegatesFocus: undefined});
    /** @type {!HTMLElement} */
    this._buttonElement = /** @type {!HTMLElement} */ (root.createChild('div', 'close-button'));
    ARIAUtils.setAccessibleName(this._buttonElement, ls`Close`);
    ARIAUtils.markAsButton(this._buttonElement);
    const regularIcon = Icon.create('smallicon-cross', 'default-icon');
    this._hoverIcon = Icon.create('mediumicon-red-cross-hover', 'hover-icon');
    this._activeIcon = Icon.create('mediumicon-red-cross-active', 'active-icon');
    this._buttonElement.appendChild(regularIcon);
    this._buttonElement.appendChild(this._hoverIcon);
    this._buttonElement.appendChild(this._activeIcon);
  }

  /**
     * @param {boolean} gray
     */
  set gray(gray) {
    if (gray) {
      this._hoverIcon.setIconType('mediumicon-gray-cross-hover');
      this._activeIcon.setIconType('mediumicon-gray-cross-active');
    } else {
      this._hoverIcon.setIconType('mediumicon-red-cross-hover');
      this._activeIcon.setIconType('mediumicon-red-cross-active');
    }
  }

  /**
   * @param {string} name
   */
  setAccessibleName(name) {
    ARIAUtils.setAccessibleName(this._buttonElement, name);
  }

  /**
   * @param {boolean} tabbable
   */
  setTabbable(tabbable) {
    if (tabbable) {
      this._buttonElement.tabIndex = 0;
    } else {
      this._buttonElement.tabIndex = -1;
    }
  }
}

registerCustomElement('div', 'dt-close-button', DevToolsCloseButton);

/**
 * @param {!HTMLInputElement} input
 * @param {function(string):void} apply
 * @param {function(string):{valid: boolean, errorMessage: (string|undefined)}} validate
 * @param {boolean} numeric
 * @param {number=} modifierMultiplier
 * @return {function(string):void}
 */
export function bindInput(input, apply, validate, numeric, modifierMultiplier) {
  input.addEventListener('change', onChange, false);
  input.addEventListener('input', onInput, false);
  input.addEventListener('keydown', onKeyDown, false);
  input.addEventListener('focus', input.select.bind(input), false);

  function onInput() {
    input.classList.toggle('error-input', !validate(input.value));
  }

  function onChange() {
    const {valid} = validate(input.value);
    input.classList.toggle('error-input', !valid);
    if (valid) {
      apply(input.value);
    }
  }

  /**
   * @param {!KeyboardEvent} event
   */
  function onKeyDown(event) {
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

    const value = _modifiedFloatNumber(parseFloat(input.value), event, modifierMultiplier);
    const stringValue = value ? String(value) : '';
    const {valid} = validate(stringValue);
    if (!valid || !value) {
      return;
    }

    input.value = stringValue;
    apply(input.value);
    event.preventDefault();
  }

  /**
   * @param {string} value
   */
  function setValue(value) {
    if (value === input.value) {
      return;
    }
    const {valid} = validate(value);
    input.classList.toggle('error-input', !valid);
    input.value = value;
  }

  return setValue;
}

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {string} text
 * @param {number} maxWidth
 * @param {function(string, number):string} trimFunction
 * @return {string}
 */
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
    } else {
      r = m - 1;
      rv = mv;
    }
  }
  text = trimFunction(text, l);
  return text !== '…' ? text : '';
}

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {string} text
 * @param {number} maxWidth
 * @return {string}
 */
export function trimTextMiddle(context, text, maxWidth) {
  return trimText(context, text, maxWidth, (text, width) => Platform.StringUtilities.trimMiddle(text, width));
}

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {string} text
 * @param {number} maxWidth
 * @return {string}
 */
export function trimTextEnd(context, text, maxWidth) {
  return trimText(context, text, maxWidth, (text, width) => Platform.StringUtilities.trimEndWithMaxLength(text, width));
}

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {string} text
 * @return {number}
 */
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

/** @type {?Map<string, !Map<string, number>>} */
let measureTextWidthCache = null;

/**
 * Adds a 'utm_source=devtools' as query parameter to the url.
 * @param {string} url
 * @return {string}
 */
export function addReferrerToURL(url) {
  if (/(\?|&)utm_source=devtools/.test(url)) {
    return url;
  }
  if (url.indexOf('?') === -1) {
    // If the URL does not contain a query, add the referrer query after path
    // and before (potential) anchor.
    return url.replace(/^([^#]*)(#.*)?$/g, '$1?utm_source=devtools$2');
  }
  // If the URL already contains a query, add the referrer query after the last query
  // and before (potential) anchor.
  return url.replace(/^([^#]*)(#.*)?$/g, '$1&utm_source=devtools$2');
}

/**
 * We want to add a referrer query param to every request to
 * 'web.dev' or 'developers.google.com'.
 * @param {string} url
 * @return {string}
 */
export function addReferrerToURLIfNecessary(url) {
  if (/(\/\/developers.google.com\/|\/\/web.dev\/)/.test(url)) {
    return addReferrerToURL(url);
  }
  return url;
}

/**
 * @param {string} url
 * @return {!Promise<?HTMLImageElement>}
 */
export function loadImage(url) {
  return new Promise(fulfill => {
    const image = new Image();
    image.addEventListener('load', () => fulfill(image));
    image.addEventListener('error', () => fulfill(null));
    image.src = url;
  });
}

/**
 * @param {?string} data
 * @return {!Promise<?HTMLImageElement>}
 */
export function loadImageFromData(data) {
  return data ? loadImage('data:image/jpg;base64,' + data) : Promise.resolve(null);
}

/**
 * @param {function(!File):*} callback
 * @return {!HTMLInputElement}
 */
export function createFileSelectorElement(callback) {
  const fileSelectorElement = /** @type {!HTMLInputElement} */ (document.createElement('input'));
  fileSelectorElement.type = 'file';
  fileSelectorElement.style.display = 'none';
  fileSelectorElement.tabIndex = -1;
  fileSelectorElement.onchange = () => {
    if (fileSelectorElement.files) {
      callback(fileSelectorElement.files[0]);
    }
  };

  return fileSelectorElement;
}

/**
 * @const
 * @type {number}
 */
export const MaxLengthForDisplayedURLs = 150;

export class MessageDialog {
  /**
   * @param {string} message
   * @param {!Document|!Element=} where
   * @return {!Promise<void>}
   */
  static async show(message, where) {
    const dialog = new Dialog();
    dialog.setSizeBehavior(SizeBehavior.MeasureContent);
    dialog.setDimmed(true);
    const shadowRoot = createShadowRootWithCoreStyles(
        dialog.contentElement,
        {cssFile: 'ui/confirmDialog.css', enableLegacyPatching: false, delegatesFocus: undefined});
    const content = shadowRoot.createChild('div', 'widget');
    await new Promise(resolve => {
      const okButton = createTextButton(Common.UIString.UIString('OK'), resolve, '', true);
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
  /**
   * @param {string} message
   * @param {!Document|!Element=} where
   * @return {!Promise<boolean>}
   */
  static async show(message, where) {
    const dialog = new Dialog();
    dialog.setSizeBehavior(SizeBehavior.MeasureContent);
    dialog.setDimmed(true);
    ARIAUtils.setAccessibleName(dialog.contentElement, message);
    const shadowRoot = createShadowRootWithCoreStyles(
        dialog.contentElement,
        {cssFile: 'ui/confirmDialog.css', enableLegacyPatching: false, delegatesFocus: undefined});
    const content = shadowRoot.createChild('div', 'widget');
    content.createChild('div', 'message').createChild('span').textContent = message;
    const buttonsBar = content.createChild('div', 'button');
    const result = await new Promise(resolve => {
      const okButton = createTextButton(
          /* text= */ ls`OK`, /* clickHandler= */ () => resolve(true), /* className= */ '', /* primary= */ true);
      buttonsBar.appendChild(okButton);
      buttonsBar.appendChild(createTextButton(ls`Cancel`, () => resolve(false)));
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

/**
 * @param {!ToolbarButton} toolbarButton
 * @return {!Element}
 */
export function createInlineButton(toolbarButton) {
  const element = document.createElement('span');
  const shadowRoot = createShadowRootWithCoreStyles(
      element, {cssFile: 'ui/inlineButton.css', enableLegacyPatching: true, delegatesFocus: undefined});
  element.classList.add('inline-button');
  const toolbar = new Toolbar('');
  toolbar.appendToolbarItem(toolbarButton);
  shadowRoot.appendChild(toolbar.element);
  return element;
}

/**
 * @interface
 */
export class Renderer {
  /**
   * @param {!Object} object
   * @param {!Options=} options
   * @return {!Promise<?{node: !Node, tree: ?TreeOutline}>}
   */
  render(object, options) {
    throw new Error('not implemented');
  }
}

/**
   * @param {!Object} object
   * @param {!Options=} options
   * @return {!Promise<?{node: !Node, tree: ?TreeOutline}>}
   */
Renderer.render = async function(object, options) {
  if (!object) {
    throw new Error('Can\'t render ' + object);
  }
  const extension = Root.Runtime.Runtime.instance().extension(Renderer, object);
  if (!extension) {
    return null;
  }
  const renderer = /** @type {?Renderer} */ (await extension.instance());
  return renderer ? renderer.render(object, options) : null;
};

/**
 * @param {number} timestamp
 * @param {boolean} full
 * @return {string}
 */
export function formatTimestamp(timestamp, full) {
  const date = new Date(timestamp);
  const yymmdd = date.getFullYear() + '-' + leadZero(date.getMonth() + 1, 2) + '-' + leadZero(date.getDate(), 2);
  const hhmmssfff = leadZero(date.getHours(), 2) + ':' + leadZero(date.getMinutes(), 2) + ':' +
      leadZero(date.getSeconds(), 2) + '.' + leadZero(date.getMilliseconds(), 3);
  return full ? (yymmdd + ' ' + hhmmssfff) : hhmmssfff;

  /**
   * @param {number} value
   * @param {number} length
   * @return {string}
   */
  function leadZero(value, length) {
    const valueString = String(value);
    return valueString.padStart(length, '0');
  }
}

/** @typedef {!{title: (string|!Element|undefined), editable: (boolean|undefined) }} */
// @ts-ignore typedef
export let Options;

/**
 * @typedef {{
 *  node: !Element,
 *  type: string,
 *  oldText: (string|undefined),
 *  newText: (string|undefined),
 *  nextSibling: (Node|undefined),
 *  parent: (Node|undefined),
 * }}
 */
// @ts-ignore typedef
export let HighlightChange;


/**
 * @param {!Element} element
 * @return {boolean}
 */
export const isScrolledToBottom = element => {
  // This code works only for 0-width border.
  // The scrollTop, clientHeight and scrollHeight are computed in double values internally.
  // However, they are exposed to javascript differently, each being either rounded (via
  // round, ceil or floor functions) or left intouch.
  // This adds up a total error up to 2.
  return Math.abs(element.scrollTop + element.clientHeight - element.scrollHeight) <= 2;
};

/**
 * @param {!Element} element
 * @param {string} childType
 * @param {string=} className
 * @return {!Element}
 */
export function createSVGChild(element, childType, className) {
  const child = element.ownerDocument.createElementNS('http://www.w3.org/2000/svg', childType);
  if (className) {
    child.setAttribute('class', className);
  }
  element.appendChild(child);
  return child;
}


/**
 * @param {!Node} initialNode
 * @param {!Array<string>} nameArray
 * @return {?Node}
 */
export const enclosingNodeOrSelfWithNodeNameInArray = (initialNode, nameArray) => {
  /** @type {?Node} */
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

/**
 * @param {!Node} node
 * @param {string} nodeName
 * @return {?Node}
 */
export const enclosingNodeOrSelfWithNodeName = function(node, nodeName) {
  return enclosingNodeOrSelfWithNodeNameInArray(node, [nodeName]);
};

/**
 * @param {null|undefined|!Document|!ShadowRoot} document
 * @param {number} x
 * @param {number} y
 * @return {?Node}
 */
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

/**
 * @param {!Event} ev
 * @return {?Node}
 */
export const deepElementFromEvent = ev => {
  const event = /** @type {!MouseEvent} */ (ev);
  // Some synthetic events have zero coordinates which lead to a wrong element. Better return nothing in this case.
  if (!event.which && !event.pageX && !event.pageY && !event.clientX && !event.clientY && !event.movementX &&
      !event.movementY) {
    return null;
  }
  const root = event.target && /** @type {!Element} */ (event.target).getComponentRoot();
  return root ? deepElementFromPoint(/** @type {(!Document|!ShadowRoot)} */ (root), event.pageX, event.pageY) : null;
};
