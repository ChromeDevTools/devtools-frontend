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
UI.highlightedSearchResultClassName = 'highlighted-search-result';
UI.highlightedCurrentSearchResultClassName = 'current-search-result';

/**
 * @param {!Element} element
 * @param {?function(!MouseEvent): boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {string} cursor
 * @param {?string=} hoverCursor
 * @param {number=} startDelay
 */
UI.installDragHandle = function(
    element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay) {
  /**
   * @param {!Event} event
   */
  function onMouseDown(event) {
    var dragHandler = new UI.DragHandler();
    var dragStart = dragHandler.elementDragStart.bind(
        dragHandler, element, elementDragStart, elementDrag, elementDragEnd, cursor, event);
    if (startDelay)
      startTimer = setTimeout(dragStart, startDelay);
    else
      dragStart();
  }

  function onMouseUp() {
    if (startTimer)
      clearTimeout(startTimer);
    startTimer = null;
  }

  var startTimer;
  element.addEventListener('mousedown', onMouseDown, false);
  if (startDelay)
    element.addEventListener('mouseup', onMouseUp, false);
  if (hoverCursor !== null)
    element.style.cursor = hoverCursor || cursor;
};

/**
 * @param {!Element} targetElement
 * @param {?function(!MouseEvent):boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {string} cursor
 * @param {!Event} event
 */
UI.elementDragStart = function(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
  var dragHandler = new UI.DragHandler();
  dragHandler.elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event);
};

/**
 * @unrestricted
 */
UI.DragHandler = class {
  constructor() {
    this._elementDragMove = this._elementDragMove.bind(this);
    this._elementDragEnd = this._elementDragEnd.bind(this);
    this._mouseOutWhileDragging = this._mouseOutWhileDragging.bind(this);
  }

  _createGlassPane() {
    this._glassPaneInUse = true;
    if (!UI.DragHandler._glassPaneUsageCount++)
      UI.DragHandler._glassPane = new UI.GlassPane(UI.DragHandler._documentForMouseOut);
  }

  _disposeGlassPane() {
    if (!this._glassPaneInUse)
      return;
    this._glassPaneInUse = false;
    if (--UI.DragHandler._glassPaneUsageCount)
      return;
    UI.DragHandler._glassPane.dispose();
    delete UI.DragHandler._glassPane;
    delete UI.DragHandler._documentForMouseOut;
  }

  /**
   * @param {!Element} targetElement
   * @param {?function(!MouseEvent):boolean} elementDragStart
   * @param {function(!MouseEvent)} elementDrag
   * @param {?function(!MouseEvent)} elementDragEnd
   * @param {string} cursor
   * @param {!Event} event
   */
  elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
    // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
    if (event.button || (Host.isMac() && event.ctrlKey))
      return;

    if (this._elementDraggingEventListener)
      return;

    if (elementDragStart && !elementDragStart(/** @type {!MouseEvent} */ (event)))
      return;

    var targetDocument = event.target.ownerDocument;
    this._elementDraggingEventListener = elementDrag;
    this._elementEndDraggingEventListener = elementDragEnd;
    console.assert(
        (UI.DragHandler._documentForMouseOut || targetDocument) === targetDocument, 'Dragging on multiple documents.');
    UI.DragHandler._documentForMouseOut = targetDocument;
    this._dragEventsTargetDocument = targetDocument;
    this._dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;

    targetDocument.addEventListener('mousemove', this._elementDragMove, true);
    targetDocument.addEventListener('mouseup', this._elementDragEnd, true);
    targetDocument.addEventListener('mouseout', this._mouseOutWhileDragging, true);
    if (targetDocument !== this._dragEventsTargetDocumentTop)
      this._dragEventsTargetDocumentTop.addEventListener('mouseup', this._elementDragEnd, true);

    if (typeof cursor === 'string') {
      this._restoreCursorAfterDrag = restoreCursor.bind(this, targetElement.style.cursor);
      targetElement.style.cursor = cursor;
      targetDocument.body.style.cursor = cursor;
    }
    /**
     * @param {string} oldCursor
     * @this {UI.DragHandler}
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
    if (!UI.DragHandler._documentForMouseOut)
      return;
    UI.DragHandler._documentForMouseOut.removeEventListener('mouseout', this._mouseOutWhileDragging, true);
  }

  _unregisterDragEvents() {
    if (!this._dragEventsTargetDocument)
      return;
    this._dragEventsTargetDocument.removeEventListener('mousemove', this._elementDragMove, true);
    this._dragEventsTargetDocument.removeEventListener('mouseup', this._elementDragEnd, true);
    if (this._dragEventsTargetDocument !== this._dragEventsTargetDocumentTop)
      this._dragEventsTargetDocumentTop.removeEventListener('mouseup', this._elementDragEnd, true);
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
    if (this._elementDraggingEventListener(/** @type {!MouseEvent} */ (event)))
      this._cancelDragEvents(event);
  }

  /**
   * @param {!Event} event
   */
  _cancelDragEvents(event) {
    this._unregisterDragEvents();
    this._unregisterMouseOutWhileDragging();

    if (this._restoreCursorAfterDrag)
      this._restoreCursorAfterDrag();

    this._disposeGlassPane();

    delete this._elementDraggingEventListener;
    delete this._elementEndDraggingEventListener;
  }

  /**
   * @param {!Event} event
   */
  _elementDragEnd(event) {
    var elementDragEnd = this._elementEndDraggingEventListener;
    this._cancelDragEvents(/** @type {!MouseEvent} */ (event));
    event.preventDefault();
    if (elementDragEnd)
      elementDragEnd(/** @type {!MouseEvent} */ (event));
  }
};

UI.DragHandler._glassPaneUsageCount = 0;

/**
 * @param {!Element} element
 * @param {function(number, number, !MouseEvent): boolean} elementDragStart
 * @param {function(number, number)} elementDrag
 * @param {function(number, number)} elementDragEnd
 * @param {string} cursor
 * @param {?string=} hoverCursor
 * @param {number=} startDelay
 * @param {number=} friction
 */
UI.installInertialDragHandle = function(
    element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay, friction) {
  UI.installDragHandle(
      element, drag.bind(null, elementDragStart), drag.bind(null, elementDrag), dragEnd, cursor, hoverCursor,
      startDelay);
  if (typeof friction !== 'number')
    friction = 50;
  var lastX;
  var lastY;
  var lastTime;
  var velocityX;
  var velocityY;
  var holding = false;

  /**
   * @param {function(number, number, !MouseEvent): boolean} callback
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  function drag(callback, event) {
    lastTime = window.performance.now();
    lastX = event.pageX;
    lastY = event.pageY;
    holding = true;
    return callback(lastX, lastY, event);
  }

  /**
   * @param {!MouseEvent} event
   */
  function dragEnd(event) {
    var now = window.performance.now();
    var duration = now - lastTime || 1;
    const maxVelocity = 4;  // 4px per millisecond.
    velocityX = Number.constrain((event.pageX - lastX) / duration, -maxVelocity, maxVelocity);
    velocityY = Number.constrain((event.pageY - lastY) / duration, -maxVelocity, maxVelocity);
    lastX = event.pageX;
    lastY = event.pageY;
    lastTime = now;
    holding = false;
    animationStep();
  }

  function animationStep() {
    var v2 = velocityX * velocityX + velocityY * velocityY;
    if (v2 < 0.001 || holding) {
      elementDragEnd(lastX, lastY);
      return;
    }
    element.window().requestAnimationFrame(animationStep);
    var now = window.performance.now();
    var duration = now - lastTime;
    if (!duration)
      return;
    lastTime = now;
    lastX += velocityX * duration;
    lastY += velocityY * duration;
    var k = Math.pow(1 / (1 + friction), duration / 1000);
    velocityX *= k;
    velocityY *= k;
    elementDrag(lastX, lastY);
  }
};

/**
 * @unrestricted
 */
UI.GlassPane = class {
  /**
   * @param {!Document} document
   * @param {boolean=} dimmed
   */
  constructor(document, dimmed) {
    this.element = createElement('div');
    var background = dimmed ? 'rgba(255, 255, 255, 0.5)' : 'transparent';
    this._zIndex = UI._glassPane ? UI._glassPane._zIndex + 1000 :
                                   3000;  // Deliberately starts with 3000 to hide other z-indexed elements below.
    this.element.style.cssText = 'position:absolute;top:0;bottom:0;left:0;right:0;background-color:' + background +
        ';z-index:' + this._zIndex + ';overflow:hidden;';
    document.body.appendChild(this.element);
    UI._glassPane = this;
    // TODO(dgozman): disallow focus outside of glass pane?
  }

  dispose() {
    delete UI._glassPane;
    this.element.remove();
  }
};

/** @type {!UI.GlassPane|undefined} */
UI._glassPane;

/**
 * @param {?Node=} node
 * @return {boolean}
 */
UI.isBeingEdited = function(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE)
    return false;
  var element = /** {!Element} */ (node);
  if (element.classList.contains('text-prompt') || element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA')
    return true;

  if (!UI.__editingCount)
    return false;

  while (element) {
    if (element.__editing)
      return true;
    element = element.parentElementOrShadowHost();
  }
  return false;
};

/**
 * @return {boolean}
 * @suppressGlobalPropertiesCheck
 */
UI.isEditing = function() {
  if (UI.__editingCount)
    return true;

  var focused = document.deepActiveElement();
  if (!focused)
    return false;
  return focused.classList.contains('text-prompt') || focused.nodeName === 'INPUT' || focused.nodeName === 'TEXTAREA';
};

/**
 * @param {!Element} element
 * @param {boolean} value
 * @return {boolean}
 */
UI.markBeingEdited = function(element, value) {
  if (value) {
    if (element.__editing)
      return false;
    element.classList.add('being-edited');
    element.__editing = true;
    UI.__editingCount = (UI.__editingCount || 0) + 1;
  } else {
    if (!element.__editing)
      return false;
    element.classList.remove('being-edited');
    delete element.__editing;
    --UI.__editingCount;
  }
  return true;
};

UI.CSSNumberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;

UI.StyleValueDelimiters = ' \xA0\t\n"\':;,/()';

/**
 * @param {!Event} event
 * @return {?string}
 */
UI._valueModificationDirection = function(event) {
  var direction = null;
  if (event.type === 'mousewheel') {
    // When shift is pressed while spinning mousewheel, delta comes as wheelDeltaX.
    if (event.wheelDeltaY > 0 || event.wheelDeltaX > 0)
      direction = 'Up';
    else if (event.wheelDeltaY < 0 || event.wheelDeltaX < 0)
      direction = 'Down';
  } else {
    if (event.key === 'ArrowUp' || event.key === 'PageUp')
      direction = 'Up';
    else if (event.key === 'ArrowDown' || event.key === 'PageDown')
      direction = 'Down';
  }
  return direction;
};

/**
 * @param {string} hexString
 * @param {!Event} event
 * @return {?string}
 */
UI._modifiedHexValue = function(hexString, event) {
  var direction = UI._valueModificationDirection(event);
  if (!direction)
    return null;

  var mouseEvent = /** @type {!MouseEvent} */ (event);
  var number = parseInt(hexString, 16);
  if (isNaN(number) || !isFinite(number))
    return null;

  var hexStrLen = hexString.length;
  var channelLen = hexStrLen / 3;

  // Colors are either rgb or rrggbb.
  if (channelLen !== 1 && channelLen !== 2)
    return null;

  // Precision modifier keys work with both mousewheel and up/down keys.
  // When ctrl is pressed, increase R by 1.
  // When shift is pressed, increase G by 1.
  // When alt is pressed, increase B by 1.
  // If no shortcut keys are pressed then increase hex value by 1.
  // Keys can be pressed together to increase RGB channels. e.g trying different shades.
  var delta = 0;
  if (UI.KeyboardShortcut.eventHasCtrlOrMeta(mouseEvent))
    delta += Math.pow(16, channelLen * 2);
  if (mouseEvent.shiftKey)
    delta += Math.pow(16, channelLen);
  if (mouseEvent.altKey)
    delta += 1;
  if (delta === 0)
    delta = 1;
  if (direction === 'Down')
    delta *= -1;

  // Increase hex value by 1 and clamp from 0 ... maxValue.
  var maxValue = Math.pow(16, hexStrLen) - 1;
  var result = Number.constrain(number + delta, 0, maxValue);

  // Ensure the result length is the same as the original hex value.
  var resultString = result.toString(16).toUpperCase();
  for (var i = 0, lengthDelta = hexStrLen - resultString.length; i < lengthDelta; ++i)
    resultString = '0' + resultString;
  return resultString;
};

/**
 * @param {number} number
 * @param {!Event} event
 * @return {?number}
 */
UI._modifiedFloatNumber = function(number, event) {
  var direction = UI._valueModificationDirection(event);
  if (!direction)
    return null;

  var mouseEvent = /** @type {!MouseEvent} */ (event);

  // Precision modifier keys work with both mousewheel and up/down keys.
  // When ctrl is pressed, increase by 100.
  // When shift is pressed, increase by 10.
  // When alt is pressed, increase by 0.1.
  // Otherwise increase by 1.
  var delta = 1;
  if (UI.KeyboardShortcut.eventHasCtrlOrMeta(mouseEvent))
    delta = 100;
  else if (mouseEvent.shiftKey)
    delta = 10;
  else if (mouseEvent.altKey)
    delta = 0.1;

  if (direction === 'Down')
    delta *= -1;

  // Make the new number and constrain it to a precision of 6, this matches numbers the engine returns.
  // Use the Number constructor to forget the fixed precision, so 1.100000 will print as 1.1.
  var result = Number((number + delta).toFixed(6));
  if (!String(result).match(UI.CSSNumberRegex))
    return null;

  return result;
};

/**
 * @param {string} wordString
 * @param {!Event} event
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {?string}
 */
UI.createReplacementString = function(wordString, event, customNumberHandler) {
  var prefix;
  var suffix;
  var number;
  var replacementString = null;
  var matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
  if (matches && matches.length) {
    prefix = matches[1];
    suffix = matches[3];
    number = UI._modifiedHexValue(matches[2], event);
    if (number !== null)
      replacementString = prefix + number + suffix;
  } else {
    matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
    if (matches && matches.length) {
      prefix = matches[1];
      suffix = matches[3];
      number = UI._modifiedFloatNumber(parseFloat(matches[2]), event);
      if (number !== null) {
        replacementString =
            customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
      }
    }
  }
  return replacementString;
};

/**
 * @param {!Event} event
 * @param {!Element} element
 * @param {function(string,string)=} finishHandler
 * @param {function(string)=} suggestionHandler
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {boolean}
 */
UI.handleElementValueModifications = function(event, element, finishHandler, suggestionHandler, customNumberHandler) {
  /**
   * @return {?Range}
   * @suppressGlobalPropertiesCheck
   */
  function createRange() {
    return document.createRange();
  }

  var arrowKeyOrMouseWheelEvent = (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.type === 'mousewheel');
  var pageKeyPressed = (event.key === 'PageUp' || event.key === 'PageDown');
  if (!arrowKeyOrMouseWheelEvent && !pageKeyPressed)
    return false;

  var selection = element.getComponentSelection();
  if (!selection.rangeCount)
    return false;

  var selectionRange = selection.getRangeAt(0);
  if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element))
    return false;

  var originalValue = element.textContent;
  var wordRange =
      selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, UI.StyleValueDelimiters, element);
  var wordString = wordRange.toString();

  if (suggestionHandler && suggestionHandler(wordString))
    return false;

  var replacementString = UI.createReplacementString(wordString, event, customNumberHandler);

  if (replacementString) {
    var replacementTextNode = createTextNode(replacementString);

    wordRange.deleteContents();
    wordRange.insertNode(replacementTextNode);

    var finalSelectionRange = createRange();
    finalSelectionRange.setStart(replacementTextNode, 0);
    finalSelectionRange.setEnd(replacementTextNode, replacementString.length);

    selection.removeAllRanges();
    selection.addRange(finalSelectionRange);

    event.handled = true;
    event.preventDefault();

    if (finishHandler)
      finishHandler(originalValue, replacementString);

    return true;
  }
  return false;
};

/**
 * @param {number} ms
 * @param {number=} precision
 * @return {string}
 */
Number.preciseMillisToString = function(ms, precision) {
  precision = precision || 0;
  var format = '%.' + precision + 'f\u2009ms';
  return Common.UIString(format, ms);
};

/** @type {!Common.UIStringFormat} */
UI._microsFormat = new Common.UIStringFormat('%.0f\u2009\u03bcs');

/** @type {!Common.UIStringFormat} */
UI._subMillisFormat = new Common.UIStringFormat('%.2f\u2009ms');

/** @type {!Common.UIStringFormat} */
UI._millisFormat = new Common.UIStringFormat('%.0f\u2009ms');

/** @type {!Common.UIStringFormat} */
UI._secondsFormat = new Common.UIStringFormat('%.2f\u2009s');

/** @type {!Common.UIStringFormat} */
UI._minutesFormat = new Common.UIStringFormat('%.1f\u2009min');

/** @type {!Common.UIStringFormat} */
UI._hoursFormat = new Common.UIStringFormat('%.1f\u2009hrs');

/** @type {!Common.UIStringFormat} */
UI._daysFormat = new Common.UIStringFormat('%.1f\u2009days');

/**
 * @param {number} ms
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.millisToString = function(ms, higherResolution) {
  if (!isFinite(ms))
    return '-';

  if (ms === 0)
    return '0';

  if (higherResolution && ms < 0.1)
    return UI._microsFormat.format(ms * 1000);
  if (higherResolution && ms < 1000)
    return UI._subMillisFormat.format(ms);
  if (ms < 1000)
    return UI._millisFormat.format(ms);

  var seconds = ms / 1000;
  if (seconds < 60)
    return UI._secondsFormat.format(seconds);

  var minutes = seconds / 60;
  if (minutes < 60)
    return UI._minutesFormat.format(minutes);

  var hours = minutes / 60;
  if (hours < 24)
    return UI._hoursFormat.format(hours);

  var days = hours / 24;
  return UI._daysFormat.format(days);
};

/**
 * @param {number} seconds
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.secondsToString = function(seconds, higherResolution) {
  if (!isFinite(seconds))
    return '-';
  return Number.millisToString(seconds * 1000, higherResolution);
};

/**
 * @param {number} bytes
 * @return {string}
 */
Number.bytesToString = function(bytes) {
  if (bytes < 1024)
    return Common.UIString('%.0f\u2009B', bytes);

  var kilobytes = bytes / 1024;
  if (kilobytes < 100)
    return Common.UIString('%.1f\u2009KB', kilobytes);
  if (kilobytes < 1024)
    return Common.UIString('%.0f\u2009KB', kilobytes);

  var megabytes = kilobytes / 1024;
  if (megabytes < 100)
    return Common.UIString('%.1f\u2009MB', megabytes);
  else
    return Common.UIString('%.0f\u2009MB', megabytes);
};

/**
 * @param {number} num
 * @return {string}
 */
Number.withThousandsSeparator = function(num) {
  var str = num + '';
  var re = /(\d+)(\d{3})/;
  while (str.match(re))
    str = str.replace(re, '$1\u2009$2');  // \u2009 is a thin space.
  return str;
};

/**
 * @param {string} format
 * @param {?ArrayLike} substitutions
 * @return {!Element}
 */
UI.formatLocalized = function(format, substitutions) {
  var formatters = {s: substitution => substitution};
  /**
   * @param {!Element} a
   * @param {string|!Element} b
   * @return {!Element}
   */
  function append(a, b) {
    a.appendChild(typeof b === 'string' ? createTextNode(b) : b);
    return a;
  }
  return String.format(Common.UIString(format), substitutions, formatters, createElement('span'), append)
      .formattedResult;
};

/**
 * @return {string}
 */
UI.openLinkExternallyLabel = function() {
  return Common.UIString.capitalize('Open in ^new ^tab');
};

/**
 * @return {string}
 */
UI.copyLinkAddressLabel = function() {
  return Common.UIString.capitalize('Copy ^link ^address');
};

/**
 * @return {string}
 */
UI.anotherProfilerActiveLabel = function() {
  return Common.UIString('Another profiler is already active');
};

/**
 * @param {string|undefined} description
 * @return {string}
 */
UI.asyncStackTraceLabel = function(description) {
  if (description)
    return description + ' ' + Common.UIString('(async)');
  return Common.UIString('Async Call');
};

/**
 * @param {!Element} element
 */
UI.installComponentRootStyles = function(element) {
  UI.appendStyle(element, 'ui/inspectorCommon.css');
  UI.themeSupport.injectHighlightStyleSheets(element);
  element.classList.add('platform-' + Host.platform());
};

/**
 * @param {!Element} element
 * @param {string=} cssFile
 * @return {!DocumentFragment}
 */
UI.createShadowRootWithCoreStyles = function(element, cssFile) {
  var shadowRoot = element.createShadowRoot();
  UI.appendStyle(shadowRoot, 'ui/inspectorCommon.css');
  UI.themeSupport.injectHighlightStyleSheets(shadowRoot);
  if (cssFile)
    UI.appendStyle(shadowRoot, cssFile);
  shadowRoot.addEventListener('focus', UI._focusChanged.bind(UI), true);
  return shadowRoot;
};

/**
 * @param {!Document} document
 * @param {!Event} event
 */
UI._windowFocused = function(document, event) {
  if (event.target.document.nodeType === Node.DOCUMENT_NODE)
    document.body.classList.remove('inactive');
};

/**
 * @param {!Document} document
 * @param {!Event} event
 */
UI._windowBlurred = function(document, event) {
  if (event.target.document.nodeType === Node.DOCUMENT_NODE)
    document.body.classList.add('inactive');
};

/**
 * @param {!Event} event
 */
UI._focusChanged = function(event) {
  var document = event.target && event.target.ownerDocument;
  var element = document ? document.deepActiveElement() : null;
  UI.Widget.focusWidgetForNode(element);
};

/**
 * @unrestricted
 */
UI.ElementFocusRestorer = class {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    this._element = element;
    this._previous = element.ownerDocument.deepActiveElement();
    element.focus();
  }

  restore() {
    if (!this._element)
      return;
    if (this._element.hasFocus() && this._previous)
      this._previous.focus();
    this._previous = null;
    this._element = null;
  }
};

/**
 * @param {!Element} element
 * @param {number} offset
 * @param {number} length
 * @param {!Array.<!Object>=} domChanges
 * @return {?Element}
 */
UI.highlightSearchResult = function(element, offset, length, domChanges) {
  var result = UI.highlightSearchResults(element, [new Common.SourceRange(offset, length)], domChanges);
  return result.length ? result[0] : null;
};

/**
 * @param {!Element} element
 * @param {!Array.<!Common.SourceRange>} resultRanges
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
UI.highlightSearchResults = function(element, resultRanges, changes) {
  return UI.highlightRangesWithStyleClass(element, resultRanges, UI.highlightedSearchResultClassName, changes);
};

/**
 * @param {!Element} element
 * @param {string} className
 */
UI.runCSSAnimationOnce = function(element, className) {
  function animationEndCallback() {
    element.classList.remove(className);
    element.removeEventListener('webkitAnimationEnd', animationEndCallback, false);
  }

  if (element.classList.contains(className))
    element.classList.remove(className);

  element.addEventListener('webkitAnimationEnd', animationEndCallback, false);
  element.classList.add(className);
};

/**
 * @param {!Element} element
 * @param {!Array.<!Common.SourceRange>} resultRanges
 * @param {string} styleClass
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
UI.highlightRangesWithStyleClass = function(element, resultRanges, styleClass, changes) {
  changes = changes || [];
  var highlightNodes = [];
  var textNodes = element.childTextNodes();
  var lineText = textNodes
                     .map(function(node) {
                       return node.textContent;
                     })
                     .join('');
  var ownerDocument = element.ownerDocument;

  if (textNodes.length === 0)
    return highlightNodes;

  var nodeRanges = [];
  var rangeEndOffset = 0;
  for (var i = 0; i < textNodes.length; ++i) {
    var range = {};
    range.offset = rangeEndOffset;
    range.length = textNodes[i].textContent.length;
    rangeEndOffset = range.offset + range.length;
    nodeRanges.push(range);
  }

  var startIndex = 0;
  for (var i = 0; i < resultRanges.length; ++i) {
    var startOffset = resultRanges[i].offset;
    var endOffset = startOffset + resultRanges[i].length;

    while (startIndex < textNodes.length &&
           nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset)
      startIndex++;
    var endIndex = startIndex;
    while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset)
      endIndex++;
    if (endIndex === textNodes.length)
      break;

    var highlightNode = ownerDocument.createElement('span');
    highlightNode.className = styleClass;
    highlightNode.textContent = lineText.substring(startOffset, endOffset);

    var lastTextNode = textNodes[endIndex];
    var lastText = lastTextNode.textContent;
    lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
    changes.push({node: lastTextNode, type: 'changed', oldText: lastText, newText: lastTextNode.textContent});

    if (startIndex === endIndex) {
      lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
      changes.push({node: highlightNode, type: 'added', nextSibling: lastTextNode, parent: lastTextNode.parentElement});
      highlightNodes.push(highlightNode);

      var prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
      lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
      changes.push({node: prefixNode, type: 'added', nextSibling: highlightNode, parent: lastTextNode.parentElement});
    } else {
      var firstTextNode = textNodes[startIndex];
      var firstText = firstTextNode.textContent;
      var anchorElement = firstTextNode.nextSibling;

      firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
      changes.push(
          {node: highlightNode, type: 'added', nextSibling: anchorElement, parent: firstTextNode.parentElement});
      highlightNodes.push(highlightNode);

      firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
      changes.push({node: firstTextNode, type: 'changed', oldText: firstText, newText: firstTextNode.textContent});

      for (var j = startIndex + 1; j < endIndex; j++) {
        var textNode = textNodes[j];
        var text = textNode.textContent;
        textNode.textContent = '';
        changes.push({node: textNode, type: 'changed', oldText: text, newText: textNode.textContent});
      }
    }
    startIndex = endIndex;
    nodeRanges[startIndex].offset = endOffset;
    nodeRanges[startIndex].length = lastTextNode.textContent.length;
  }
  return highlightNodes;
};

UI.applyDomChanges = function(domChanges) {
  for (var i = 0, size = domChanges.length; i < size; ++i) {
    var entry = domChanges[i];
    switch (entry.type) {
      case 'added':
        entry.parent.insertBefore(entry.node, entry.nextSibling);
        break;
      case 'changed':
        entry.node.textContent = entry.newText;
        break;
    }
  }
};

UI.revertDomChanges = function(domChanges) {
  for (var i = domChanges.length - 1; i >= 0; --i) {
    var entry = domChanges[i];
    switch (entry.type) {
      case 'added':
        entry.node.remove();
        break;
      case 'changed':
        entry.node.textContent = entry.oldText;
        break;
    }
  }
};

/**
 * @param {!Element} element
 * @param {?Element=} containerElement
 * @return {!Size}
 */
UI.measurePreferredSize = function(element, containerElement) {
  var oldParent = element.parentElement;
  var oldNextSibling = element.nextSibling;
  containerElement = containerElement || element.ownerDocument.body;
  containerElement.appendChild(element);
  element.positionAt(0, 0);
  var result = new Size(element.offsetWidth, element.offsetHeight);

  element.positionAt(undefined, undefined);
  if (oldParent)
    oldParent.insertBefore(element, oldNextSibling);
  else
    element.remove();
  return result;
};

/**
 * @unrestricted
 */
UI.InvokeOnceHandlers = class {
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
      if (this._autoInvoke)
        this.scheduleInvoke();
    }
    var methods = this._handlers.get(object);
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
    if (this._handlers)
      requestAnimationFrame(this._invoke.bind(this));
  }

  _invoke() {
    var handlers = this._handlers;
    this._handlers = null;
    var keys = handlers.keysArray();
    for (var i = 0; i < keys.length; ++i) {
      var object = keys[i];
      var methods = handlers.get(object).valuesArray();
      for (var j = 0; j < methods.length; ++j)
        methods[j].call(object);
    }
  }
};

UI._coalescingLevel = 0;
UI._postUpdateHandlers = null;

UI.startBatchUpdate = function() {
  if (!UI._coalescingLevel++)
    UI._postUpdateHandlers = new UI.InvokeOnceHandlers(false);
};

UI.endBatchUpdate = function() {
  if (--UI._coalescingLevel)
    return;
  UI._postUpdateHandlers.scheduleInvoke();
  UI._postUpdateHandlers = null;
};

/**
 * @param {!Object} object
 * @param {function()} method
 */
UI.invokeOnceAfterBatchUpdate = function(object, method) {
  if (!UI._postUpdateHandlers)
    UI._postUpdateHandlers = new UI.InvokeOnceHandlers(true);
  UI._postUpdateHandlers.add(object, method);
};

/**
 * @param {!Window} window
 * @param {!Function} func
 * @param {!Array.<{from:number, to:number}>} params
 * @param {number} frames
 * @param {function()=} animationComplete
 * @return {function()}
 */
UI.animateFunction = function(window, func, params, frames, animationComplete) {
  var values = new Array(params.length);
  var deltas = new Array(params.length);
  for (var i = 0; i < params.length; ++i) {
    values[i] = params[i].from;
    deltas[i] = (params[i].to - params[i].from) / frames;
  }

  var raf = window.requestAnimationFrame(animationStep);

  var framesLeft = frames;

  function animationStep() {
    if (--framesLeft < 0) {
      if (animationComplete)
        animationComplete();
      return;
    }
    for (var i = 0; i < params.length; ++i) {
      if (params[i].to > params[i].from)
        values[i] = Number.constrain(values[i] + deltas[i], params[i].from, params[i].to);
      else
        values[i] = Number.constrain(values[i] + deltas[i], params[i].to, params[i].from);
    }
    func.apply(null, values);
    raf = window.requestAnimationFrame(animationStep);
  }

  function cancelAnimation() {
    window.cancelAnimationFrame(raf);
  }

  return cancelAnimation;
};

/**
 * @unrestricted
 */
UI.LongClickController = class extends Common.Object {
  /**
   * @param {!Element} element
   * @param {function(!Event)} callback
   */
  constructor(element, callback) {
    super();
    this._element = element;
    this._callback = callback;
    this._enable();
  }

  reset() {
    if (this._longClickInterval) {
      clearInterval(this._longClickInterval);
      delete this._longClickInterval;
    }
  }

  _enable() {
    if (this._longClickData)
      return;
    var boundMouseDown = mouseDown.bind(this);
    var boundMouseUp = mouseUp.bind(this);
    var boundReset = this.reset.bind(this);

    this._element.addEventListener('mousedown', boundMouseDown, false);
    this._element.addEventListener('mouseout', boundReset, false);
    this._element.addEventListener('mouseup', boundMouseUp, false);
    this._element.addEventListener('click', boundReset, true);

    this._longClickData = {mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset};

    /**
     * @param {!Event} e
     * @this {UI.LongClickController}
     */
    function mouseDown(e) {
      if (e.which !== 1)
        return;
      var callback = this._callback;
      this._longClickInterval = setTimeout(callback.bind(null, e), 200);
    }

    /**
     * @param {!Event} e
     * @this {UI.LongClickController}
     */
    function mouseUp(e) {
      if (e.which !== 1)
        return;
      this.reset();
    }
  }

  dispose() {
    if (!this._longClickData)
      return;
    this._element.removeEventListener('mousedown', this._longClickData.mouseDown, false);
    this._element.removeEventListener('mouseout', this._longClickData.reset, false);
    this._element.removeEventListener('mouseup', this._longClickData.mouseUp, false);
    this._element.addEventListener('click', this._longClickData.reset, true);
    delete this._longClickData;
  }
};

/**
 * @param {!Document} document
 * @param {!Common.Setting} themeSetting
 */
UI.initializeUIUtils = function(document, themeSetting) {
  document.defaultView.addEventListener('focus', UI._windowFocused.bind(UI, document), false);
  document.defaultView.addEventListener('blur', UI._windowBlurred.bind(UI, document), false);
  document.addEventListener('focus', UI._focusChanged.bind(UI), true);

  if (!UI.themeSupport)
    UI.themeSupport = new UI.ThemeSupport(themeSetting);
  UI.themeSupport.applyTheme(document);

  var body = /** @type {!Element} */ (document.body);
  UI.appendStyle(body, 'ui/inspectorStyle.css');
  UI.appendStyle(body, 'ui/popover.css');
};

/**
 * @param {string} name
 * @return {string}
 */
UI.beautifyFunctionName = function(name) {
  return name || Common.UIString('(anonymous)');
};

/**
 * @param {string} localName
 * @param {string} typeExtension
 * @param {!Object} prototype
 * @return {function()}
 * @suppressGlobalPropertiesCheck
 * @template T
 */
function registerCustomElement(localName, typeExtension, prototype) {
  return document.registerElement(typeExtension, {prototype: Object.create(prototype), extends: localName});
}

/**
 * @param {string} text
 * @param {function(!Event)=} clickHandler
 * @param {string=} className
 * @param {string=} title
 * @return {!Element}
 */
function createTextButton(text, clickHandler, className, title) {
  var element = createElementWithClass('button', className || '', 'text-button');
  element.textContent = text;
  if (clickHandler)
    element.addEventListener('click', clickHandler, false);
  if (title)
    element.title = title;
  return element;
}

/**
 * @param {string} name
 * @param {string} title
 * @param {boolean=} checked
 * @return {!Element}
 */
function createRadioLabel(name, title, checked) {
  var element = createElement('label', 'dt-radio');
  element.radioElement.name = name;
  element.radioElement.checked = !!checked;
  element.createTextChild(title);
  return element;
}

/**
 * @param {string} title
 * @param {string} iconClass
 * @return {!Element}
 */
function createLabel(title, iconClass) {
  var element = createElement('label', 'dt-icon-label');
  element.createChild('span').textContent = title;
  element.type = iconClass;
  return element;
}

/**
 * @param {string=} title
 * @param {boolean=} checked
 * @param {string=} subtitle
 * @return {!Element}
 */
function createCheckboxLabel(title, checked, subtitle) {
  var element = createElement('label', 'dt-checkbox');
  element.checkboxElement.checked = !!checked;
  if (title !== undefined) {
    element.textElement = element.createChild('div', 'dt-checkbox-text');
    element.textElement.textContent = title;
    if (subtitle !== undefined) {
      element.subtitleElement = element.textElement.createChild('div', 'dt-checkbox-subtitle');
      element.subtitleElement.textContent = subtitle;
    }
  }
  return element;
}

/**
 * @return {!Element}
 * @param {number} min
 * @param {number} max
 * @param {number} tabIndex
 */
function createSliderLabel(min, max, tabIndex) {
  var element = createElement('label', 'dt-slider');
  element.sliderElement.min = min;
  element.sliderElement.max = max;
  element.sliderElement.step = 1;
  element.sliderElement.tabIndex = tabIndex;
  return element;
}

/**
 * @param {!Node} node
 * @param {string} cssFile
 * @suppressGlobalPropertiesCheck
 */
UI.appendStyle = function(node, cssFile) {
  var content = Runtime.cachedResources[cssFile] || '';
  if (!content)
    console.error(cssFile + ' not preloaded. Check module.json');
  var styleElement = createElement('style');
  styleElement.type = 'text/css';
  styleElement.textContent = content;
  node.appendChild(styleElement);

  var themeStyleSheet = UI.themeSupport.themeStyleSheet(cssFile, content);
  if (themeStyleSheet) {
    styleElement = createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = themeStyleSheet + '\n' + Runtime.resolveSourceURL(cssFile + '.theme');
    node.appendChild(styleElement);
  }
};

(function() {
  registerCustomElement('button', 'text-button', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      this.type = 'button';
      var root = UI.createShadowRootWithCoreStyles(this, 'ui/textButton.css');
      root.createChild('content');
    },

    __proto__: HTMLButtonElement.prototype
  });

  registerCustomElement('label', 'dt-radio', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      this.radioElement = this.createChild('input', 'dt-radio-button');
      this.radioElement.type = 'radio';
      var root = UI.createShadowRootWithCoreStyles(this, 'ui/radioButton.css');
      root.createChild('content').select = '.dt-radio-button';
      root.createChild('content');
      this.addEventListener('click', radioClickHandler, false);
    },

    __proto__: HTMLLabelElement.prototype
  });

  /**
   * @param {!Event} event
   * @suppressReceiverCheck
   * @this {Element}
   */
  function radioClickHandler(event) {
    if (this.radioElement.checked || this.radioElement.disabled)
      return;
    this.radioElement.checked = true;
    this.radioElement.dispatchEvent(new Event('change'));
  }

  registerCustomElement('label', 'dt-checkbox', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      this._root = UI.createShadowRootWithCoreStyles(this, 'ui/checkboxTextLabel.css');
      var checkboxElement = createElementWithClass('input', 'dt-checkbox-button');
      checkboxElement.type = 'checkbox';
      this._root.appendChild(checkboxElement);
      this.checkboxElement = checkboxElement;

      this.addEventListener('click', toggleCheckbox.bind(this));

      /**
       * @param {!Event} event
       * @this {Node}
       */
      function toggleCheckbox(event) {
        if (event.target !== checkboxElement && event.target !== this) {
          event.consume();
          checkboxElement.click();
        }
      }

      this._root.createChild('content');
    },

    /**
     * @param {string} color
     * @this {Element}
     */
    set backgroundColor(color) {
      this.checkboxElement.classList.add('dt-checkbox-themed');
      this.checkboxElement.style.backgroundColor = color;
    },

    /**
     * @param {string} color
     * @this {Element}
     */
    set checkColor(color) {
      this.checkboxElement.classList.add('dt-checkbox-themed');
      var stylesheet = createElement('style');
      stylesheet.textContent = 'input.dt-checkbox-themed:checked:after { background-color: ' + color + '}';
      this._root.appendChild(stylesheet);
    },

    /**
     * @param {string} color
     * @this {Element}
     */
    set borderColor(color) {
      this.checkboxElement.classList.add('dt-checkbox-themed');
      this.checkboxElement.style.borderColor = color;
    },

    /**
     * @param {boolean} focus
     * @this {Element}
     */
    set visualizeFocus(focus) {
      this.checkboxElement.classList.toggle('dt-checkbox-visualize-focus', focus);
    },

    __proto__: HTMLLabelElement.prototype
  });

  registerCustomElement('label', 'dt-icon-label', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      var root = UI.createShadowRootWithCoreStyles(this);
      this._iconElement = UI.Icon.create();
      this._iconElement.style.setProperty('margin-right', '4px');
      root.appendChild(this._iconElement);
      root.createChild('content');
    },

    /**
     * @param {string} type
     * @this {Element}
     */
    set type(type) {
      this._iconElement.setIconType(type);
    },

    __proto__: HTMLLabelElement.prototype
  });

  registerCustomElement('label', 'dt-slider', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      var root = UI.createShadowRootWithCoreStyles(this, 'ui/slider.css');
      this.sliderElement = createElementWithClass('input', 'dt-range-input');
      this.sliderElement.type = 'range';
      root.appendChild(this.sliderElement);
    },

    /**
     * @param {number} amount
     * @this {Element}
     */
    set value(amount) {
      this.sliderElement.value = amount;
    },

    /**
     * @this {Element}
     */
    get value() {
      return this.sliderElement.value;
    },

    __proto__: HTMLLabelElement.prototype
  });

  registerCustomElement('label', 'dt-small-bubble', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      var root = UI.createShadowRootWithCoreStyles(this, 'ui/smallBubble.css');
      this._textElement = root.createChild('div');
      this._textElement.className = 'info';
      this._textElement.createChild('content');
    },

    /**
     * @param {string} type
     * @this {Element}
     */
    set type(type) {
      this._textElement.className = type;
    },

    __proto__: HTMLLabelElement.prototype
  });

  registerCustomElement('div', 'dt-close-button', {
    /**
     * @this {Element}
     */
    createdCallback: function() {
      var root = UI.createShadowRootWithCoreStyles(this, 'ui/closeButton.css');
      this._buttonElement = root.createChild('div', 'close-button');
    },

    /**
     * @param {boolean} gray
     * @this {Element}
     */
    set gray(gray) {
      this._buttonElement.className = gray ? 'close-button-gray' : 'close-button';
    },

    __proto__: HTMLDivElement.prototype
  });
})();

/**
 * @param {!Element} input
 * @param {function(string)} apply
 * @param {function(string):boolean} validate
 * @param {boolean} numeric
 * @return {function(string)}
 */
UI.bindInput = function(input, apply, validate, numeric) {
  input.addEventListener('change', onChange, false);
  input.addEventListener('input', onInput, false);
  input.addEventListener('keydown', onKeyDown, false);
  input.addEventListener('focus', input.select.bind(input), false);

  function onInput() {
    input.classList.toggle('error-input', !validate(input.value));
  }

  function onChange() {
    var valid = validate(input.value);
    input.classList.toggle('error-input', !valid);
    if (valid)
      apply(input.value);
  }

  /**
   * @param {!Event} event
   */
  function onKeyDown(event) {
    if (isEnterKey(event)) {
      if (validate(input.value))
        apply(input.value);
      return;
    }

    if (!numeric)
      return;

    var increment = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (!increment)
      return;
    if (event.shiftKey)
      increment *= 10;

    var value = input.value;
    if (!validate(value) || !value)
      return;

    value = (value ? Number(value) : 0) + increment;
    var stringValue = value ? String(value) : '';
    if (!validate(stringValue) || !value)
      return;

    input.value = stringValue;
    apply(input.value);
    event.preventDefault();
  }

  /**
   * @param {string} value
   */
  function setValue(value) {
    if (value === input.value)
      return;
    var valid = validate(value);
    input.classList.toggle('error-input', !valid);
    input.value = value;
  }

  return setValue;
};

/**
   * @param {!CanvasRenderingContext2D} context
   * @param {string} text
   * @param {number} maxWidth
   * @return {string}
   */
UI.trimTextMiddle = function(context, text, maxWidth) {
  const maxLength = 200;
  if (maxWidth <= 10)
    return '';
  if (text.length > maxLength)
    text = text.trimMiddle(maxLength);
  const textWidth = UI.measureTextWidth(context, text);
  if (textWidth <= maxWidth)
    return text;

  var l = 0;
  var r = text.length;
  var lv = 0;
  var rv = textWidth;
  while (l < r && lv !== rv && lv !== maxWidth) {
    const m = Math.ceil(l + (r - l) * (maxWidth - lv) / (rv - lv));
    const mv = UI.measureTextWidth(context, text.trimMiddle(m));
    if (mv <= maxWidth) {
      l = m;
      lv = mv;
    } else {
      r = m - 1;
      rv = mv;
    }
  }
  text = text.trimMiddle(l);
  return text !== '\u2026' ? text : '';
};

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {string} text
 * @return {number}
 */
UI.measureTextWidth = function(context, text) {
  const maxCacheableLength = 200;
  if (text.length > maxCacheableLength)
    return context.measureText(text).width;

  var widthCache = UI.measureTextWidth._textWidthCache;
  if (!widthCache) {
    widthCache = new Map();
    UI.measureTextWidth._textWidthCache = widthCache;
  }
  const font = context.font;
  var textWidths = widthCache.get(font);
  if (!textWidths) {
    textWidths = new Map();
    widthCache.set(font, textWidths);
  }
  var width = textWidths.get(text);
  if (!width) {
    width = context.measureText(text).width;
    textWidths.set(text, width);
  }
  return width;
};

/**
 * @unrestricted
 */
UI.ThemeSupport = class {
  /**
   * @param {!Common.Setting} setting
   */
  constructor(setting) {
    this._themeName = setting.get() || 'default';
    this._themableProperties = new Set([
      'color', 'box-shadow', 'text-shadow', 'outline-color', 'background-image', 'background-color',
      'border-left-color', 'border-right-color', 'border-top-color', 'border-bottom-color', '-webkit-border-image'
    ]);
    /** @type {!Map<string, string>} */
    this._cachedThemePatches = new Map();
    this._setting = setting;
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
   * @param {!Element} element
   */
  injectHighlightStyleSheets(element) {
    this._injectingStyleSheet = true;
    UI.appendStyle(element, 'ui/inspectorSyntaxHighlight.css');
    if (this._themeName === 'dark')
      UI.appendStyle(element, 'ui/inspectorSyntaxHighlightDark.css');
    this._injectingStyleSheet = false;
  }

  /**
   * @param {!Document} document
   */
  applyTheme(document) {
    if (!this.hasTheme())
      return;

    if (this._themeName === 'dark')
      document.body.classList.add('-theme-with-dark-background');

    var styleSheets = document.styleSheets;
    var result = [];
    for (var i = 0; i < styleSheets.length; ++i)
      result.push(this._patchForTheme(styleSheets[i].href, styleSheets[i]));
    result.push('/*# sourceURL=inspector.css.theme */');

    var styleElement = createElement('style');
    styleElement.type = 'text/css';
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
    if (!this.hasTheme() || this._injectingStyleSheet)
      return '';

    var patch = this._cachedThemePatches.get(id);
    if (!patch) {
      var styleElement = createElement('style');
      styleElement.type = 'text/css';
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
    var cached = this._cachedThemePatches.get(id);
    if (cached)
      return cached;

    try {
      var rules = styleSheet.cssRules;
      var result = [];
      for (var j = 0; j < rules.length; ++j) {
        if (rules[j] instanceof CSSImportRule) {
          result.push(this._patchForTheme(rules[j].styleSheet.href, rules[j].styleSheet));
          continue;
        }
        var output = [];
        var style = rules[j].style;
        var selectorText = rules[j].selectorText;
        for (var i = 0; style && i < style.length; ++i)
          this._patchProperty(selectorText, style, style[i], output);
        if (output.length)
          result.push(rules[j].selectorText + '{' + output.join('') + '}');
      }

      var fullText = result.join('\n');
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
   * - If rule has ".selection" or "selected" or "-theme-selection-color" in selector, its hue is rotated 180deg in dark themes.
   * - One can create specializations for dark themes via body.-theme-with-dark-background selector in host context.
   */
  _patchProperty(selectorText, style, name, output) {
    if (!this._themableProperties.has(name))
      return;

    var value = style.getPropertyValue(name);
    if (!value || value === 'none' || value === 'inherit' || value === 'initial' || value === 'transparent')
      return;
    if (name === 'background-image' && value.indexOf('gradient') === -1)
      return;

    var isSelection = selectorText.indexOf('.-theme-selection-color') !== -1;
    if (selectorText.indexOf('-theme-') !== -1 && !isSelection)
      return;

    if (name === '-webkit-border-image') {
      output.push('-webkit-filter: invert(100%)');
      return;
    }

    isSelection = isSelection || selectorText.indexOf('selected') !== -1 || selectorText.indexOf('.selection') !== -1;
    var colorUsage = UI.ThemeSupport.ColorUsage.Unknown;
    if (isSelection)
      colorUsage |= UI.ThemeSupport.ColorUsage.Selection;
    if (name.indexOf('background') === 0 || name.indexOf('border') === 0)
      colorUsage |= UI.ThemeSupport.ColorUsage.Background;
    if (name.indexOf('background') === -1)
      colorUsage |= UI.ThemeSupport.ColorUsage.Foreground;

    output.push(name);
    output.push(':');
    var items = value.replace(Common.Color.Regex, '\0$1\0').split('\0');
    for (var i = 0; i < items.length; ++i)
      output.push(this.patchColor(items[i], colorUsage));
    if (style.getPropertyPriority(name))
      output.push(' !important');
    output.push(';');
  }

  /**
   * @param {string} text
   * @param {!UI.ThemeSupport.ColorUsage} colorUsage
   * @return {string}
   */
  patchColor(text, colorUsage) {
    var color = Common.Color.parse(text);
    if (!color)
      return text;

    var hsla = color.hsla();
    this._patchHSLA(hsla, colorUsage);
    var rgba = [];
    Common.Color.hsl2rgb(hsla, rgba);
    var outColor = new Common.Color(rgba, color.format());
    var outText = outColor.asString(null);
    if (!outText)
      outText = outColor.asString(outColor.hasAlpha() ? Common.Color.Format.RGBA : Common.Color.Format.RGB);
    return outText || text;
  }

  /**
   * @param {!Array<number>} hsla
   * @param {!UI.ThemeSupport.ColorUsage} colorUsage
   */
  _patchHSLA(hsla, colorUsage) {
    var hue = hsla[0];
    var sat = hsla[1];
    var lit = hsla[2];
    var alpha = hsla[3];

    switch (this._themeName) {
      case 'dark':
        if (colorUsage & UI.ThemeSupport.ColorUsage.Selection)
          hue = (hue + 0.5) % 1;
        var minCap = colorUsage & UI.ThemeSupport.ColorUsage.Background ? 0.14 : 0;
        var maxCap = colorUsage & UI.ThemeSupport.ColorUsage.Foreground ? 0.9 : 1;
        lit = 1 - lit;
        if (lit < minCap * 2)
          lit = minCap + lit / 2;
        else if (lit > 2 * maxCap - 1)
          lit = maxCap - 1 / 2 + lit / 2;

        break;
    }
    hsla[0] = Number.constrain(hue, 0, 1);
    hsla[1] = Number.constrain(sat, 0, 1);
    hsla[2] = Number.constrain(lit, 0, 1);
    hsla[3] = Number.constrain(alpha, 0, 1);
  }
};

/**
 * @enum {number}
 */
UI.ThemeSupport.ColorUsage = {
  Unknown: 0,
  Foreground: 1 << 0,
  Background: 1 << 1,
  Selection: 1 << 2,
};

/**
 * @param {string} url
 * @param {string=} linkText
 * @param {string=} className
 * @param {boolean=} preventClick
 * @return {!Element}
 */
UI.createExternalLink = function(url, linkText, className, preventClick) {
  if (!linkText)
    linkText = url;

  var a = createElementWithClass('a', className);
  var href = url;
  if (url.trim().toLowerCase().startsWith('javascript:'))
    href = null;
  if (Common.ParsedURL.isRelativeURL(url))
    href = null;
  if (href !== null) {
    a.href = href;
    a.classList.add('webkit-html-external-link');
    a.addEventListener('click', (event) => {
      event.consume(true);
      if (!preventClick)
        InspectorFrontendHost.openInNewTab(/** @type {string} */ (href));
    }, false);
    a[UI._externalLinkSymbol] = true;
  }
  if (linkText !== url)
    a.title = url;
  a.textContent = linkText.trimMiddle(150);
  a.setAttribute('target', '_blank');

  return a;
};

UI._externalLinkSymbol = Symbol('UI._externalLink');

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
UI.ExternaLinkContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    var targetNode = /** @type {!Node} */ (target);
    while (targetNode && !targetNode[UI._externalLinkSymbol])
      targetNode = targetNode.parentNodeOrShadowHost();
    if (!targetNode || !targetNode.href)
      return;
    contextMenu.appendItem(UI.openLinkExternallyLabel(), () => InspectorFrontendHost.openInNewTab(targetNode.href));
    contextMenu.appendItem(UI.copyLinkAddressLabel(), () => InspectorFrontendHost.copyText(targetNode.href));
  }
};


/**
 * @param {string} article
 * @param {string} title
 * @return {!Element}
 */
UI.createDocumentationLink = function(article, title) {
  return UI.createExternalLink('https://developers.google.com/web/tools/chrome-devtools/' + article, title);
};

/**
 * @param {string} url
 * @return {!Promise<?Image>}
 */
UI.loadImage = function(url) {
  return new Promise(fulfill => {
    var image = new Image();
    image.addEventListener('load', () => fulfill(image));
    image.addEventListener('error', () => fulfill(null));
    image.src = url;
  });
};

/** @type {!UI.ThemeSupport} */
UI.themeSupport;
