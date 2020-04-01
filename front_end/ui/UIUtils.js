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
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Dialog} from './Dialog.js';
import {Size} from './Geometry.js';
import {GlassPane, PointerEventsBehavior, SizeBehavior} from './GlassPane.js';
import {Icon} from './Icon.js';
import {KeyboardShortcut} from './KeyboardShortcut.js';
import {Toolbar, ToolbarButton} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {TreeOutline} from './Treeoutline.js';         // eslint-disable-line no-unused-vars
import {appendStyle} from './utils/append-style.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';
import {focusChanged} from './utils/focus-changed.js';
import {injectCoreStyles} from './utils/inject-core-styles.js';
import {measuredScrollbarWidth} from './utils/measured-scrollbar-width.js';
import {registerCustomElement} from './utils/register-custom-element.js';
import {XLink} from './XLink.js';

export const highlightedSearchResultClassName = 'highlighted-search-result';
export const highlightedCurrentSearchResultClassName = 'current-search-result';

export {markAsFocusedByKeyboard} from './utils/focus-changed.js';

/**
 * @param {!Element} element
 * @param {?function(!MouseEvent): boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
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
    const dragStart = dragHandler.elementDragStart.bind(
        dragHandler, element, elementDragStart, elementDrag, elementDragEnd, cursor, event);
    if (startDelay) {
      startTimer = setTimeout(dragStart, startDelay);
    } else {
      dragStart();
    }
  }

  function onMouseUp() {
    if (startTimer) {
      clearTimeout(startTimer);
    }
    startTimer = null;
  }

  let startTimer;
  element.addEventListener('mousedown', onMouseDown, false);
  if (startDelay) {
    element.addEventListener('mouseup', onMouseUp, false);
  }
  if (hoverCursor !== null) {
    element.style.cursor = hoverCursor || cursor || '';
  }
}

/**
 * @param {!Element} targetElement
 * @param {?function(!MouseEvent):boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {?string} cursor
 * @param {!Event} event
 */
export function elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
  const dragHandler = new DragHandler();
  dragHandler.elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event);
}

/**
 * @unrestricted
 */
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
      DragHandler._glassPane.show(DragHandler._documentForMouseOut);
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
    DragHandler._glassPane.hide();
    delete DragHandler._glassPane;
    delete DragHandler._documentForMouseOut;
  }

  /**
   * @param {!Element} targetElement
   * @param {?function(!MouseEvent):boolean} elementDragStart
   * @param {function(!MouseEvent)} elementDrag
   * @param {?function(!MouseEvent)} elementDragEnd
   * @param {?string} cursor
   * @param {!Event} event
   */
  elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
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

    const targetDocument = event.target.ownerDocument;
    this._elementDraggingEventListener = elementDrag;
    this._elementEndDraggingEventListener = elementDragEnd;
    console.assert(
        (DragHandler._documentForMouseOut || targetDocument) === targetDocument, 'Dragging on multiple documents.');
    DragHandler._documentForMouseOut = targetDocument;
    this._dragEventsTargetDocument = targetDocument;
    try {
      this._dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;
    } catch (e) {
      this._dragEventsTargetDocumentTop = this._dragEventsTargetDocument;
    }

    targetDocument.addEventListener('mousemove', this._elementDragMove, true);
    targetDocument.addEventListener('mouseup', this._elementDragEnd, true);
    targetDocument.addEventListener('mouseout', this._mouseOutWhileDragging, true);
    if (targetDocument !== this._dragEventsTargetDocumentTop) {
      this._dragEventsTargetDocumentTop.addEventListener('mouseup', this._elementDragEnd, true);
    }

    if (typeof cursor === 'string') {
      this._restoreCursorAfterDrag = restoreCursor.bind(this, targetElement.style.cursor);
      targetElement.style.cursor = cursor;
      targetDocument.body.style.cursor = cursor;
    }
    /**
     * @param {string} oldCursor
     * @this {DragHandler}
     */
    function restoreCursor(oldCursor) {
      targetDocument.body.style.removeProperty('cursor');
      targetElement.style.cursor = oldCursor;
      this._restoreCursorAfterDrag = null;
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
    if (this._dragEventsTargetDocument !== this._dragEventsTargetDocumentTop) {
      this._dragEventsTargetDocumentTop.removeEventListener('mouseup', this._elementDragEnd, true);
    }
    delete this._dragEventsTargetDocument;
    delete this._dragEventsTargetDocumentTop;
  }

  /**
   * @param {!Event} event
   */
  _elementDragMove(event) {
    if (event.buttons !== 1) {
      this._elementDragEnd(event);
      return;
    }
    if (this._elementDraggingEventListener(/** @type {!MouseEvent} */ (event))) {
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

/**
 * @param {?Node=} node
 * @return {boolean}
 */
export function isBeingEdited(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  let element = /** {!Element} */ (node);
  if (element.classList.contains('text-prompt') || element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
    return true;
  }

  if (!UI.__editingCount) {
    return false;
  }

  while (element) {
    if (element.__editing) {
      return true;
    }
    element = element.parentElementOrShadowHost();
  }
  return false;
}

/**
 * @return {boolean}
 * @suppressGlobalPropertiesCheck
 */
export function isEditing() {
  if (UI.__editingCount) {
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
    if (element.__editing) {
      return false;
    }
    element.classList.add('being-edited');
    element.__editing = true;
    UI.__editingCount = (UI.__editingCount || 0) + 1;
  } else {
    if (!element.__editing) {
      return false;
    }
    element.classList.remove('being-edited');
    delete element.__editing;
    --UI.__editingCount;
  }
  return true;
}

// Avoids Infinity, NaN, and scientific notation (e.g. 1e20), see crbug.com/81165.
const _numberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;

export const StyleValueDelimiters = ' \xA0\t\n"\':;,/()';

/**
 * @param {!Event} event
 * @return {?string}
 */
function _valueModificationDirection(event) {
  let direction = null;
  if (event.type === 'mousewheel') {
    // When shift is pressed while spinning mousewheel, delta comes as wheelDeltaX.
    if (event.wheelDeltaY > 0 || event.wheelDeltaX > 0) {
      direction = 'Up';
    } else if (event.wheelDeltaY < 0 || event.wheelDeltaX < 0) {
      direction = 'Down';
    }
  } else {
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      direction = 'Up';
    } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
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
  const direction = _valueModificationDirection(event);
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
  const direction = _valueModificationDirection(event);
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
 * @param {function(string,string)=} finishHandler
 * @param {function(string)=} suggestionHandler
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {boolean}
 */
export function handleElementValueModifications(event, element, finishHandler, suggestionHandler, customNumberHandler) {
  /**
   * @return {?Range}
   * @suppressGlobalPropertiesCheck
   */
  function createRange() {
    return document.createRange();
  }

  const arrowKeyOrMouseWheelEvent =
      (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.type === 'mousewheel');
  const pageKeyPressed = (event.key === 'PageUp' || event.key === 'PageDown');
  if (!arrowKeyOrMouseWheelEvent && !pageKeyPressed) {
    return false;
  }

  const selection = element.getComponentSelection();
  if (!selection.rangeCount) {
    return false;
  }

  const selectionRange = selection.getRangeAt(0);
  if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element)) {
    return false;
  }

  const originalValue = element.textContent;
  const wordRange =
      selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, StyleValueDelimiters, element);
  const wordString = wordRange.toString();

  if (suggestionHandler && suggestionHandler(wordString)) {
    return false;
  }

  const replacementString = createReplacementString(wordString, event, customNumberHandler);

  if (replacementString) {
    const replacementTextNode = createTextNode(replacementString);

    wordRange.deleteContents();
    wordRange.insertNode(replacementTextNode);

    const finalSelectionRange = createRange();
    finalSelectionRange.setStart(replacementTextNode, 0);
    finalSelectionRange.setEnd(replacementTextNode, replacementString.length);

    selection.removeAllRanges();
    selection.addRange(finalSelectionRange);

    event.handled = true;
    event.preventDefault();

    if (finishHandler) {
      finishHandler(originalValue, replacementString);
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
 * @param {number} bytes
 * @return {string}
 */
Number.bytesToString = function(bytes) {
  if (bytes < 1000) {
    return Common.UIString.UIString('%.0f\xA0B', bytes);
  }

  const kilobytes = bytes / 1000;
  if (kilobytes < 100) {
    return Common.UIString.UIString('%.1f\xA0kB', kilobytes);
  }
  if (kilobytes < 1000) {
    return Common.UIString.UIString('%.0f\xA0kB', kilobytes);
  }

  const megabytes = kilobytes / 1000;
  if (megabytes < 100) {
    return Common.UIString.UIString('%.1f\xA0MB', megabytes);
  }
  return Common.UIString.UIString('%.0f\xA0MB', megabytes);
};

/**
 * @param {number} num
 * @return {string}
 */
Number.withThousandsSeparator = function(num) {
  let str = num + '';
  const re = /(\d+)(\d{3})/;
  while (str.match(re)) {
    str = str.replace(re, '$1\xA0$2');
  }  // \xa0 is a non-breaking space
  return str;
};

/**
 * @param {string} format
 * @param {?ArrayLike} substitutions
 * @return {!Element}
 */
export function formatLocalized(format, substitutions) {
  const formatters = {s: substitution => substitution};
  /**
   * @param {!Element} a
   * @param {string|!Element} b
   * @return {!Element}
   */
  function append(a, b) {
    a.appendChild(typeof b === 'string' ? createTextNode(b) : b);
    return a;
  }
  return Platform.StringUtilities
      .format(Common.UIString.UIString(format), substitutions, formatters, createElement('span'), append)
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
  if (event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document.body.classList.remove('inactive');
  }
  UI._keyboardFocus = true;
  const listener = () => {
    const activeElement = document.deepActiveElement();
    if (activeElement) {
      activeElement.removeAttribute('data-keyboard-focus');
    }
    UI._keyboardFocus = false;
  };
  document.defaultView.requestAnimationFrame(() => {
    UI._keyboardFocus = false;
    document.removeEventListener('mousedown', listener, true);
  });
  document.addEventListener('mousedown', listener, true);
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
function _windowBlurred(document, event) {
  if (event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document.body.classList.add('inactive');
  }
}

/**
 * @param {!Element} element
 * @returns {boolean}
 */
export function elementIsFocusedByKeyboard(element) {
  return element.hasAttribute('data-keyboard-focus');
}

/**
 * @unrestricted
 */
export class ElementFocusRestorer {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    this._element = element;
    this._previous = element.ownerDocument.deepActiveElement();
    element.focus();
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
 * @param {!Array.<!Object>=} domChanges
 * @return {?Element}
 */
export function highlightSearchResult(element, offset, length, domChanges) {
  const result = highlightSearchResults(element, [new TextUtils.SourceRange(offset, length)], domChanges);
  return result.length ? result[0] : null;
}

/**
 * @param {!Element} element
 * @param {!Array.<!TextUtils.SourceRange>} resultRanges
 * @param {!Array.<!Object>=} changes
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
 * @param {!Array.<!TextUtils.SourceRange>} resultRanges
 * @param {string} styleClass
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
export function highlightRangesWithStyleClass(element, resultRanges, styleClass, changes) {
  changes = changes || [];
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
  for (let i = 0; i < textNodes.length; ++i) {
    const range = {};
    range.offset = rangeEndOffset;
    range.length = textNodes[i].textContent.length;
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
    const lastText = lastTextNode.textContent;
    lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
    changes.push({node: lastTextNode, type: 'changed', oldText: lastText, newText: lastTextNode.textContent});

    if (startIndex === endIndex) {
      lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
      changes.push({node: highlightNode, type: 'added', nextSibling: lastTextNode, parent: lastTextNode.parentElement});
      highlightNodes.push(highlightNode);

      const prefixNode =
          ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
      lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
      changes.push({node: prefixNode, type: 'added', nextSibling: highlightNode, parent: lastTextNode.parentElement});
    } else {
      const firstTextNode = textNodes[startIndex];
      const firstText = firstTextNode.textContent;
      const anchorElement = firstTextNode.nextSibling;

      firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
      changes.push(
          {node: highlightNode, type: 'added', nextSibling: anchorElement, parent: firstTextNode.parentElement});
      highlightNodes.push(highlightNode);

      firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
      changes.push({node: firstTextNode, type: 'changed', oldText: firstText, newText: firstTextNode.textContent});

      for (let j = startIndex + 1; j < endIndex; j++) {
        const textNode = textNodes[j];
        const text = textNode.textContent;
        textNode.textContent = '';
        changes.push({node: textNode, type: 'changed', oldText: text, newText: textNode.textContent});
      }
    }
    startIndex = endIndex;
    nodeRanges[startIndex].offset = endOffset;
    nodeRanges[startIndex].length = lastTextNode.textContent.length;
  }
  return highlightNodes;
}

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

/**
 * @unrestricted
 */
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
   * @param {function()} method
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

  /**
   * @suppressGlobalPropertiesCheck
   */
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
  _postUpdateHandlers.scheduleInvoke();
  _postUpdateHandlers = null;
}

/**
 * @param {!Object} object
 * @param {function()} method
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
 * @param {function()=} animationComplete
 * @return {function()}
 */
export function animateFunction(window, func, params, duration, animationComplete) {
  const start = window.performance.now();
  let raf = window.requestAnimationFrame(animationStep);

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

/**
 * @unrestricted
 */
export class LongClickController extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Element} element
   * @param {function(!Event)} callback
   * @param {function(!Event)} isEditKeyFunc
   */
  constructor(element, callback, isEditKeyFunc = event => isEnterOrSpaceKey(event)) {
    super();
    this._element = element;
    this._callback = callback;
    this._editKey = isEditKeyFunc;
    this._enable();
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
        this._longClickInterval = setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
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
      if (e.which !== 1) {
        return;
      }
      const callback = this._callback;
      this._longClickInterval = setTimeout(callback.bind(null, e), LongClickController.TIME_MS);
    }

    /**
     * @param {!Event} e
     * @this {LongClickController}
     */
    function mouseUp(e) {
      if (e.which !== 1) {
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

function _trackKeyboardFocus() {
  UI._keyboardFocus = true;
  document.defaultView.requestAnimationFrame(() => void(UI._keyboardFocus = false));
}

/**
 * @param {!Document} document
 * @param {!Common.Settings.Setting} themeSetting
 */
export function initializeUIUtils(document, themeSetting) {
  document.body.classList.toggle('inactive', !document.hasFocus());
  document.defaultView.addEventListener('focus', _windowFocused.bind(UI, document), false);
  document.defaultView.addEventListener('blur', _windowBlurred.bind(UI, document), false);
  document.addEventListener('focus', focusChanged.bind(UI), true);

  // Track which focus changes occur due to keyboard input.
  // When focus changes from tab navigation (keydown).
  // When focus() is called in keyboard initiated click events (keyup).
  document.addEventListener('keydown', _trackKeyboardFocus, true);
  document.addEventListener('keyup', _trackKeyboardFocus, true);

  if (!self.UI.themeSupport) {
    self.UI.themeSupport = new ThemeSupport(themeSetting);
  }
  self.UI.themeSupport.applyTheme(document);

  const body = /** @type {!Element} */ (document.body);
  appendStyle(body, 'ui/inspectorStyle.css');
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
 * @param {string} text
 * @param {function(!Event)=} clickHandler
 * @param {string=} className
 * @param {boolean=} primary
 * @return {!Element}
 */
export function createTextButton(text, clickHandler, className, primary) {
  const element = createElementWithClass('button', className || '');
  element.textContent = text;
  element.classList.add('text-button');
  if (primary) {
    element.classList.add('primary-button');
  }
  if (clickHandler) {
    element.addEventListener('click', clickHandler, false);
  }
  element.type = 'button';
  return element;
}

/**
 * @param {string=} className
 * @param {string=} type
 * @return {!Element}
 */
export function createInput(className, type) {
  const element = createElementWithClass('input', className || '');
  element.spellcheck = false;
  element.classList.add('harmony-input');
  if (type) {
    element.type = type;
  }
  return element;
}

/**
 * @param {string} title
 * @param {string=} className
 * @param {!Element=} associatedControl
 * @return {!Element}
 */
export function createLabel(title, className, associatedControl) {
  const element = createElementWithClass('label', className || '');
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
 * @return {!Element}
 */
export function createRadioLabel(name, title, checked) {
  const element = createElement('span', 'dt-radio');
  element.radioElement.name = name;
  element.radioElement.checked = !!checked;
  element.labelElement.createTextChild(title);
  return element;
}

/**
 * @param {string} title
 * @param {string} iconClass
 * @return {!Element}
 */
export function createIconLabel(title, iconClass) {
  const element = createElement('span', 'dt-icon-label');
  element.createChild('span').textContent = title;
  element.type = iconClass;
  return element;
}

/**
 * @return {!Element}
 * @param {number} min
 * @param {number} max
 * @param {number} tabIndex
 */
export function createSlider(min, max, tabIndex) {
  const element = createElement('span', 'dt-slider');
  element.sliderElement.min = min;
  element.sliderElement.max = max;
  element.sliderElement.step = 1;
  element.sliderElement.tabIndex = tabIndex;
  return element;
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
    CheckboxLabel._lastId = (CheckboxLabel._lastId || 0) + 1;
    const id = 'ui-checkbox-label' + CheckboxLabel._lastId;
    this._shadowRoot = createShadowRootWithCoreStyles(this, 'ui/checkboxTextLabel.css');
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
    element.checkboxElement.checked = !!checked;
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
   * @this {Element}
   */
  set backgroundColor(color) {
    this.checkboxElement.classList.add('dt-checkbox-themed');
    this.checkboxElement.style.backgroundColor = color;
  }

  /**
   * @param {string} color
   * @this {Element}
   */
  set checkColor(color) {
    this.checkboxElement.classList.add('dt-checkbox-themed');
    const stylesheet = createElement('style');
    stylesheet.textContent = 'input.dt-checkbox-themed:checked:after { background-color: ' + color + '}';
    this._shadowRoot.appendChild(stylesheet);
  }

  /**
   * @param {string} color
   * @this {Element}
   */
  set borderColor(color) {
    this.checkboxElement.classList.add('dt-checkbox-themed');
    this.checkboxElement.style.borderColor = color;
  }
}

(function() {
let labelId = 0;
registerCustomElement('span', 'dt-radio', class extends HTMLSpanElement {
  constructor() {
    super();
    this.radioElement = this.createChild('input', 'dt-radio-button');
    this.labelElement = this.createChild('label');

    const id = 'dt-radio-button-id' + (++labelId);
    this.radioElement.id = id;
    this.radioElement.type = 'radio';
    this.labelElement.htmlFor = id;
    const root = createShadowRootWithCoreStyles(this, 'ui/radioButton.css');
    root.createChild('slot');
    this.addEventListener('click', radioClickHandler, false);
  }
});

/**
   * @param {!Event} event
   * @suppressReceiverCheck
   * @this {Element}
   */
function radioClickHandler(event) {
  if (this.radioElement.checked || this.radioElement.disabled) {
    return;
  }
  this.radioElement.checked = true;
  this.radioElement.dispatchEvent(new Event('change'));
}

registerCustomElement('span', 'dt-icon-label', class extends HTMLSpanElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this);
    this._iconElement = Icon.create();
    this._iconElement.style.setProperty('margin-right', '4px');
    root.appendChild(this._iconElement);
    root.createChild('slot');
  }

  /**
     * @param {string} type
     * @this {Element}
     */
  set type(type) {
    this._iconElement.setIconType(type);
  }
});

registerCustomElement('span', 'dt-slider', class extends HTMLSpanElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, 'ui/slider.css');
    this.sliderElement = createElementWithClass('input', 'dt-range-input');
    this.sliderElement.type = 'range';
    root.appendChild(this.sliderElement);
  }

  /**
     * @param {number} amount
     * @this {Element}
     */
  set value(amount) {
    this.sliderElement.value = amount;
  }

  /**
     * @this {Element}
     */
  get value() {
    return this.sliderElement.value;
  }
});

registerCustomElement('span', 'dt-small-bubble', class extends HTMLSpanElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, 'ui/smallBubble.css');
    this._textElement = root.createChild('div');
    this._textElement.className = 'info';
    this._textElement.createChild('slot');
  }

  /**
     * @param {string} type
     * @this {Element}
     */
  set type(type) {
    this._textElement.className = type;
  }
});

registerCustomElement('div', 'dt-close-button', class extends HTMLDivElement {
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, 'ui/closeButton.css');
    this._buttonElement = root.createChild('div', 'close-button');
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
     * @this {Element}
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
   * @this {Element}
   */
  setAccessibleName(name) {
    ARIAUtils.setAccessibleName(this._buttonElement, name);
  }

  /**
   * @param {boolean} tabbable
   * @this {Element}
   */
  setTabbable(tabbable) {
    if (tabbable) {
      this._buttonElement.tabIndex = 0;
    } else {
      this._buttonElement.tabIndex = -1;
    }
  }
});
})();

/**
 * @param {!Element} input
 * @param {function(string)} apply
 * @param {function(string):{valid: boolean, errorMessage: (string|undefined)}} validate
 * @param {boolean} numeric
 * @param {number=} modifierMultiplier
 * @return {function(string)}
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
   * @param {!Event} event
   */
  function onKeyDown(event) {
    if (isEnterKey(event)) {
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
  return trimText(context, text, maxWidth, (text, width) => text.trimMiddle(width));
}

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {string} text
 * @param {number} maxWidth
 * @return {string}
 */
export function trimTextEnd(context, text, maxWidth) {
  return trimText(context, text, maxWidth, (text, width) => text.trimEndWithMaxLength(width));
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

  let widthCache = measureTextWidth._textWidthCache;
  if (!widthCache) {
    widthCache = new Map();
    measureTextWidth._textWidthCache = widthCache;
  }
  const font = context.font;
  let textWidths = widthCache.get(font);
  if (!textWidths) {
    textWidths = new Map();
    widthCache.set(font, textWidths);
  }
  let width = textWidths.get(text);
  if (!width) {
    width = context.measureText(text).width;
    textWidths.set(text, width);
  }
  return width;
}

/**
 * @unrestricted
 */
export class ThemeSupport {
  /**
   * @param {!Common.Settings.Setting} setting
   */
  constructor(setting) {
    const systemPreferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
    this._themeName = setting.get() === 'systemPreferred' ? systemPreferredTheme : setting.get();
    this._themableProperties = new Set([
      'color', 'box-shadow', 'text-shadow', 'outline-color', 'background-image', 'background-color',
      'border-left-color', 'border-right-color', 'border-top-color', 'border-bottom-color', '-webkit-border-image',
      'fill', 'stroke'
    ]);
    /** @type {!Map<string, string>} */
    this._cachedThemePatches = new Map();
    this._setting = setting;
    this._customSheets = new Set();
  }

  /**
   * @return {boolean}
   */
  hasTheme() {
    return this._themeName !== 'default';
  }

  /**
   * @return {string}
   */
  themeName() {
    return this._themeName;
  }

  /**
   * @param {!Element|!ShadowRoot} element
   */
  injectHighlightStyleSheets(element) {
    this._injectingStyleSheet = true;
    appendStyle(element, 'ui/inspectorSyntaxHighlight.css');
    if (this._themeName === 'dark') {
      appendStyle(element, 'ui/inspectorSyntaxHighlightDark.css');
    }
    this._injectingStyleSheet = false;
  }

   /**
   * @param {!Element|!ShadowRoot} element
   */
  injectCustomStyleSheets(element) {
    for (const sheet of this._customSheets){
      const styleElement = createElement('style');
      styleElement.textContent = sheet;
      element.appendChild(styleElement);
    }
  }

  /**
   * @return {boolean}
   */
  isForcedColorsMode() {
    return window.matchMedia('(forced-colors: active)').matches;
  }

  /**
   * @param {string} sheetText
   */
  addCustomStylesheet(sheetText) {
    this._customSheets.add(sheetText);
  }

  /**
   * @param {!Document} document
   */
  applyTheme(document) {
    if (!this.hasTheme() || this.isForcedColorsMode()) {
      return;
    }

    if (this._themeName === 'dark') {
      document.documentElement.classList.add('-theme-with-dark-background');
    }

    const styleSheets = document.styleSheets;
    const result = [];
    for (let i = 0; i < styleSheets.length; ++i) {
      result.push(this._patchForTheme(styleSheets[i].href, styleSheets[i]));
    }
    result.push('/*# sourceURL=inspector.css.theme */');

    const styleElement = createElement('style');
    styleElement.textContent = result.join('\n');
    document.head.appendChild(styleElement);
  }

  /**
   * @param {string} id
   * @param {string} text
   * @return {string}
   * @suppressGlobalPropertiesCheck
   */
  themeStyleSheet(id, text) {
    if (!this.hasTheme() || this._injectingStyleSheet || this.isForcedColorsMode()) {
      return '';
    }

    let patch = this._cachedThemePatches.get(id);
    if (!patch) {
      const styleElement = createElement('style');
      styleElement.textContent = text;
      document.body.appendChild(styleElement);
      patch = this._patchForTheme(id, styleElement.sheet);
      document.body.removeChild(styleElement);
    }
    return patch;
  }

  /**
   * @param {string} id
   * @param {!StyleSheet} styleSheet
   * @return {string}
   */
  _patchForTheme(id, styleSheet) {
    const cached = this._cachedThemePatches.get(id);
    if (cached) {
      return cached;
    }

    try {
      const rules = styleSheet.cssRules;
      const result = [];
      for (let j = 0; j < rules.length; ++j) {
        if (rules[j] instanceof CSSImportRule) {
          result.push(this._patchForTheme(rules[j].styleSheet.href, rules[j].styleSheet));
          continue;
        }
        const output = [];
        const style = rules[j].style;
        const selectorText = rules[j].selectorText;
        for (let i = 0; style && i < style.length; ++i) {
          this._patchProperty(selectorText, style, style[i], output);
        }
        if (output.length) {
          result.push(rules[j].selectorText + '{' + output.join('') + '}');
        }
      }

      const fullText = result.join('\n');
      this._cachedThemePatches.set(id, fullText);
      return fullText;
    } catch (e) {
      this._setting.set('default');
      return '';
    }
  }

  /**
   * @param {string} selectorText
   * @param {!CSSStyleDeclaration} style
   * @param {string} name
   * @param {!Array<string>} output
   *
   * Theming API is primarily targeted at making dark theme look good.
   * - If rule has ".-theme-preserve" in selector, it won't be affected.
   * - One can create specializations for dark themes via body.-theme-with-dark-background selector in host context.
   */
  _patchProperty(selectorText, style, name, output) {
    if (!this._themableProperties.has(name)) {
      return;
    }

    const value = style.getPropertyValue(name);
    if (!value || value === 'none' || value === 'inherit' || value === 'initial' || value === 'transparent') {
      return;
    }
    if (name === 'background-image' && value.indexOf('gradient') === -1) {
      return;
    }

    if (selectorText.indexOf('-theme-') !== -1) {
      return;
    }

    let colorUsage = ThemeSupport.ColorUsage.Unknown;
    if (name.indexOf('background') === 0 || name.indexOf('border') === 0) {
      colorUsage |= ThemeSupport.ColorUsage.Background;
    }
    if (name.indexOf('background') === -1) {
      colorUsage |= ThemeSupport.ColorUsage.Foreground;
    }

    output.push(name);
    output.push(':');
    const items = value.replace(Common.Color.Regex, '\0$1\0').split('\0');
    for (let i = 0; i < items.length; ++i) {
      output.push(this.patchColorText(items[i], /** @type {!ThemeSupport.ColorUsage} */ (colorUsage)));
    }
    if (style.getPropertyPriority(name)) {
      output.push(' !important');
    }
    output.push(';');
  }

  /**
   * @param {string} text
   * @param {!ThemeSupport.ColorUsage} colorUsage
   * @return {string}
   */
  patchColorText(text, colorUsage) {
    const color = Common.Color.Color.parse(text);
    if (!color) {
      return text;
    }
    const outColor = this.patchColor(color, colorUsage);
    let outText = outColor.asString(null);
    if (!outText) {
      outText = outColor.asString(outColor.hasAlpha() ? Common.Color.Format.RGBA : Common.Color.Format.RGB);
    }
    return outText || text;
  }

  /**
   * @param {!Common.Color.Color} color
   * @param {!ThemeSupport.ColorUsage} colorUsage
   * @return {!Common.Color.Color}
   */
  patchColor(color, colorUsage) {
    const hsla = color.hsla();
    this._patchHSLA(hsla, colorUsage);
    const rgba = [];
    Common.Color.Color.hsl2rgb(hsla, rgba);
    return new Common.Color.Color(rgba, color.format());
  }

  /**
   * @param {!Array<number>} hsla
   * @param {!ThemeSupport.ColorUsage} colorUsage
   */
  _patchHSLA(hsla, colorUsage) {
    const hue = hsla[0];
    const sat = hsla[1];
    let lit = hsla[2];
    const alpha = hsla[3];

    switch (this._themeName) {
      case 'dark': {
        const minCap = colorUsage & ThemeSupport.ColorUsage.Background ? 0.14 : 0;
        const maxCap = colorUsage & ThemeSupport.ColorUsage.Foreground ? 0.9 : 1;
        lit = 1 - lit;
        if (lit < minCap * 2) {
          lit = minCap + lit / 2;
        } else if (lit > 2 * maxCap - 1) {
          lit = maxCap - 1 / 2 + lit / 2;
        }
        break;
      }
    }
    hsla[0] = Platform.NumberUtilities.clamp(hue, 0, 1);
    hsla[1] = Platform.NumberUtilities.clamp(sat, 0, 1);
    hsla[2] = Platform.NumberUtilities.clamp(lit, 0, 1);
    hsla[3] = Platform.NumberUtilities.clamp(alpha, 0, 1);
  }
}

/**
 * @enum {number}
 */
ThemeSupport.ColorUsage = {
  Unknown: 0,
  Foreground: 1 << 0,
  Background: 1 << 1,
};

/**
 * @param {string} article
 * @param {string} title
 * @return {!Element}
 */
export function createDocumentationLink(article, title) {
  return XLink.create('https://developers.google.com/web/tools/chrome-devtools/' + article, title);
}

/**
 * @param {string} article
 * @param {string} title
 * @return {!Element}
 */
export function createWebDevLink(article, title) {
  return XLink.create('https://web.dev/' + article, title);
}

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
 * @return {!Promise<?Image>}
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
 * @return {!Promise<?Image>}
 */
export function loadImageFromData(data) {
  return data ? loadImage('data:image/jpg;base64,' + data) : Promise.resolve(null);
}

/**
 * @param {function(!File)} callback
 * @return {!Node}
 */
export function createFileSelectorElement(callback) {
  const fileSelectorElement = createElement('input');
  fileSelectorElement.type = 'file';
  fileSelectorElement.style.display = 'none';
  fileSelectorElement.setAttribute('tabindex', -1);
  fileSelectorElement.onchange = onChange;
  function onChange(event) {
    callback(fileSelectorElement.files[0]);
  }
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
   * @return {!Promise}
   */
  static async show(message, where) {
    const dialog = new Dialog();
    dialog.setSizeBehavior(SizeBehavior.MeasureContent);
    dialog.setDimmed(true);
    const shadowRoot = createShadowRootWithCoreStyles(dialog.contentElement, 'ui/confirmDialog.css');
    const content = shadowRoot.createChild('div', 'widget');
    await new Promise(resolve => {
      const okButton = createTextButton(Common.UIString.UIString('OK'), resolve, '', true);
      content.createChild('div', 'message').createChild('span').textContent = message;
      content.createChild('div', 'button').appendChild(okButton);
      dialog.setOutsideClickCallback(event => {
        event.consume();
        resolve();
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
    const shadowRoot = createShadowRootWithCoreStyles(dialog.contentElement, 'ui/confirmDialog.css');
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
  const element = createElement('span');
  const shadowRoot = createShadowRootWithCoreStyles(element, 'ui/inlineButton.css');
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
  const renderer = await self.runtime.extension(Renderer, object).instance();
  return renderer ? renderer.render(object, options || {}) : null;
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
export let Options;
