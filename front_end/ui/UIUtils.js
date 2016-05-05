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

WebInspector.highlightedSearchResultClassName = "highlighted-search-result";

/**
 * @param {!Element} element
 * @param {?function(!MouseEvent): boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {string} cursor
 * @param {?string=} hoverCursor
 * @param {number=} startDelay
 */
WebInspector.installDragHandle = function(element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay)
{
    /**
     * @param {!Event} event
     */
    function onMouseDown(event)
    {
        var dragStart = WebInspector.elementDragStart.bind(WebInspector, element, elementDragStart, elementDrag, elementDragEnd, cursor, event);
        if (!startDelay)
            dragStart();
        startTimer = setTimeout(dragStart, startDelay || 0);
    }

    function onMouseUp()
    {
        if (startTimer)
            clearInterval(startTimer);
        startTimer = null;
    }

    var startTimer;
    element.addEventListener("mousedown", onMouseDown, false);
    if (startDelay)
        element.addEventListener("mouseup", onMouseUp, false);
    if (hoverCursor !== null)
        element.style.cursor = hoverCursor || cursor;
}

/**
 * @param {!Element} targetElement
 * @param {?function(!MouseEvent):boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {string} cursor
 * @param {!Event} event
 */
WebInspector.elementDragStart = function(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event)
{
    // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
    if (event.button || (WebInspector.isMac() && event.ctrlKey))
        return;

    if (WebInspector._elementDraggingEventListener)
        return;

    if (elementDragStart && !elementDragStart(/** @type {!MouseEvent} */ (event)))
        return;

    if (WebInspector._elementDraggingGlassPane) {
        WebInspector._elementDraggingGlassPane.dispose();
        delete WebInspector._elementDraggingGlassPane;
    }

    var targetDocument = event.target.ownerDocument;

    WebInspector._elementDraggingEventListener = elementDrag;
    WebInspector._elementEndDraggingEventListener = elementDragEnd;
    WebInspector._mouseOutWhileDraggingTargetDocument = targetDocument;
    WebInspector._dragEventsTargetDocument = targetDocument;
    WebInspector._dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;

    targetDocument.addEventListener("mousemove", WebInspector._elementDragMove, true);
    targetDocument.addEventListener("mouseup", WebInspector._elementDragEnd, true);
    targetDocument.addEventListener("mouseout", WebInspector._mouseOutWhileDragging, true);
    if (targetDocument !== WebInspector._dragEventsTargetDocumentTop)
        WebInspector._dragEventsTargetDocumentTop.addEventListener("mouseup", WebInspector._elementDragEnd, true);

    if (typeof cursor === "string") {
        WebInspector._restoreCursorAfterDrag = restoreCursor.bind(null, targetElement.style.cursor);
        targetElement.style.cursor = cursor;
        targetDocument.body.style.cursor = cursor;
    }
    function restoreCursor(oldCursor)
    {
        targetDocument.body.style.removeProperty("cursor");
        targetElement.style.cursor = oldCursor;
        WebInspector._restoreCursorAfterDrag = null;
    }
    event.preventDefault();
}

WebInspector._mouseOutWhileDragging = function()
{
    var document = WebInspector._mouseOutWhileDraggingTargetDocument;
    WebInspector._unregisterMouseOutWhileDragging();
    WebInspector._elementDraggingGlassPane = new WebInspector.GlassPane(document);
}

WebInspector._unregisterMouseOutWhileDragging = function()
{
    if (!WebInspector._mouseOutWhileDraggingTargetDocument)
        return;
    WebInspector._mouseOutWhileDraggingTargetDocument.removeEventListener("mouseout", WebInspector._mouseOutWhileDragging, true);
    delete WebInspector._mouseOutWhileDraggingTargetDocument;
}

WebInspector._unregisterDragEvents = function()
{
    if (!WebInspector._dragEventsTargetDocument)
        return;
    WebInspector._dragEventsTargetDocument.removeEventListener("mousemove", WebInspector._elementDragMove, true);
    WebInspector._dragEventsTargetDocument.removeEventListener("mouseup", WebInspector._elementDragEnd, true);
    if (WebInspector._dragEventsTargetDocument !== WebInspector._dragEventsTargetDocumentTop)
        WebInspector._dragEventsTargetDocumentTop.removeEventListener("mouseup", WebInspector._elementDragEnd, true);
    delete WebInspector._dragEventsTargetDocument;
    delete WebInspector._dragEventsTargetDocumentTop;
}

/**
 * @param {!Event} event
 */
WebInspector._elementDragMove = function(event)
{
    if (event.buttons !== 1) {
        WebInspector._elementDragEnd(event);
        return;
    }

    if (WebInspector._elementDraggingEventListener(/** @type {!MouseEvent} */ (event)))
        WebInspector._cancelDragEvents(event);
}

/**
 * @param {!Event} event
 */
WebInspector._cancelDragEvents = function(event)
{
    WebInspector._unregisterDragEvents();
    WebInspector._unregisterMouseOutWhileDragging();

    if (WebInspector._restoreCursorAfterDrag)
        WebInspector._restoreCursorAfterDrag();

    if (WebInspector._elementDraggingGlassPane)
        WebInspector._elementDraggingGlassPane.dispose();

    delete WebInspector._elementDraggingGlassPane;
    delete WebInspector._elementDraggingEventListener;
    delete WebInspector._elementEndDraggingEventListener;
}

/**
 * @param {!Event} event
 */
WebInspector._elementDragEnd = function(event)
{
    var elementDragEnd = WebInspector._elementEndDraggingEventListener;

    WebInspector._cancelDragEvents(/** @type {!MouseEvent} */ (event));

    event.preventDefault();
    if (elementDragEnd)
        elementDragEnd(/** @type {!MouseEvent} */ (event));
}

/**
 * @constructor
 * @param {!Document} document
 * @param {boolean=} dimmed
 */
WebInspector.GlassPane = function(document, dimmed)
{
    this.element = createElement("div");
    var background = dimmed ? "rgba(255, 255, 255, 0.5)" : "transparent";
    this._zIndex = WebInspector._glassPane ? WebInspector._glassPane._zIndex + 1000 : 3000; // Deliberately starts with 3000 to hide other z-indexed elements below.
    this.element.style.cssText = "position:absolute;top:0;bottom:0;left:0;right:0;background-color:" + background + ";z-index:" + this._zIndex + ";overflow:hidden;";
    document.body.appendChild(this.element);
    WebInspector._glassPane = this;
}

WebInspector.GlassPane.prototype = {
    dispose: function()
    {
        delete WebInspector._glassPane;
        if (WebInspector.GlassPane.DefaultFocusedViewStack.length)
            WebInspector.GlassPane.DefaultFocusedViewStack.peekLast().focus();
        this.element.remove();
    }
}

/** @type {!WebInspector.GlassPane|undefined} */
WebInspector._glassPane;

/**
 * @type {!Array.<!WebInspector.Widget|!WebInspector.Dialog>}
 */
WebInspector.GlassPane.DefaultFocusedViewStack = [];

/**
 * @param {?Node=} node
 * @return {boolean}
 */
WebInspector.isBeingEdited = function(node)
{
    if (!node || node.nodeType !== Node.ELEMENT_NODE)
        return false;
    var element = /** {!Element} */ (node);
    if (element.classList.contains("text-prompt") || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA")
        return true;

    if (!WebInspector.__editingCount)
        return false;

    while (element) {
        if (element.__editing)
            return true;
        element = element.parentElementOrShadowHost();
    }
    return false;
}

/**
 * @return {boolean}
 */
WebInspector.isEditing = function()
{
    if (WebInspector.__editingCount)
        return true;

    var element = WebInspector.currentFocusElement();
    if (!element)
        return false;
    return element.classList.contains("text-prompt") || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA";
}

/**
 * @param {!Element} element
 * @param {boolean} value
 * @return {boolean}
 */
WebInspector.markBeingEdited = function(element, value)
{
    if (value) {
        if (element.__editing)
            return false;
        element.classList.add("being-edited");
        element.__editing = true;
        WebInspector.__editingCount = (WebInspector.__editingCount || 0) + 1;
    } else {
        if (!element.__editing)
            return false;
        element.classList.remove("being-edited");
        delete element.__editing;
        --WebInspector.__editingCount;
    }
    return true;
}

WebInspector.CSSNumberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;

WebInspector.StyleValueDelimiters = " \xA0\t\n\"':;,/()";


/**
 * @param {!Event} event
 * @return {?string}
 */
WebInspector._valueModificationDirection = function(event)
{
    var direction = null;
    if (event.type === "mousewheel") {
        if (event.wheelDeltaY > 0)
            direction = "Up";
        else if (event.wheelDeltaY < 0)
            direction = "Down";
    } else {
        if (event.keyIdentifier === "Up" || event.keyIdentifier === "PageUp")
            direction = "Up";
        else if (event.keyIdentifier === "Down" || event.keyIdentifier === "PageDown")
            direction = "Down";
    }
    return direction;
}

/**
 * @param {string} hexString
 * @param {!Event} event
 */
WebInspector._modifiedHexValue = function(hexString, event)
{
    var direction = WebInspector._valueModificationDirection(event);
    if (!direction)
        return hexString;

    var number = parseInt(hexString, 16);
    if (isNaN(number) || !isFinite(number))
        return hexString;

    var maxValue = Math.pow(16, hexString.length) - 1;
    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var delta;

    if (arrowKeyOrMouseWheelEvent)
        delta = (direction === "Up") ? 1 : -1;
    else
        delta = (event.keyIdentifier === "PageUp") ? 16 : -16;

    if (event.shiftKey)
        delta *= 16;

    var result = number + delta;
    if (result < 0)
        result = 0; // Color hex values are never negative, so clamp to 0.
    else if (result > maxValue)
        return hexString;

    // Ensure the result length is the same as the original hex value.
    var resultString = result.toString(16).toUpperCase();
    for (var i = 0, lengthDelta = hexString.length - resultString.length; i < lengthDelta; ++i)
        resultString = "0" + resultString;
    return resultString;
}

/**
 * @param {number} number
 * @param {!Event} event
 */
WebInspector._modifiedFloatNumber = function(number, event)
{
    var direction = WebInspector._valueModificationDirection(event);
    if (!direction)
        return number;

    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");

    // Jump by 10 when shift is down or jump by 0.1 when Alt/Option is down.
    // Also jump by 10 for page up and down, or by 100 if shift is held with a page key.
    var changeAmount = 1;
    if (event.shiftKey && !arrowKeyOrMouseWheelEvent)
        changeAmount = 100;
    else if (event.shiftKey || !arrowKeyOrMouseWheelEvent)
        changeAmount = 10;
    else if (event.altKey)
        changeAmount = 0.1;

    if (direction === "Down")
        changeAmount *= -1;

    // Make the new number and constrain it to a precision of 6, this matches numbers the engine returns.
    // Use the Number constructor to forget the fixed precision, so 1.100000 will print as 1.1.
    var result = Number((number + changeAmount).toFixed(6));
    if (!String(result).match(WebInspector.CSSNumberRegex))
        return null;

    return result;
}

/**
 * @param {string} wordString
 * @param {!Event} event
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {?string}
 */
WebInspector.createReplacementString = function(wordString, event, customNumberHandler)
{
    var replacementString;
    var prefix, suffix, number;

    var matches;
    matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
    if (matches && matches.length) {
        prefix = matches[1];
        suffix = matches[3];
        number = WebInspector._modifiedHexValue(matches[2], event);

        replacementString = customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
    } else {
        matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
        if (matches && matches.length) {
            prefix = matches[1];
            suffix = matches[3];
            number = WebInspector._modifiedFloatNumber(parseFloat(matches[2]), event);

            // Need to check for null explicitly.
            if (number === null)
                return null;

            replacementString = customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
        }
    }
    return replacementString || null;
}

/**
 * @param {!Event} event
 * @param {!Element} element
 * @param {function(string,string)=} finishHandler
 * @param {function(string)=} suggestionHandler
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {boolean}
 */
WebInspector.handleElementValueModifications = function(event, element, finishHandler, suggestionHandler, customNumberHandler)
{
    /**
     * @return {?Range}
     * @suppressGlobalPropertiesCheck
     */
    function createRange()
    {
        return document.createRange();
    }

    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var pageKeyPressed = (event.keyIdentifier === "PageUp" || event.keyIdentifier === "PageDown");
    if (!arrowKeyOrMouseWheelEvent && !pageKeyPressed)
        return false;

    var selection = element.getComponentSelection();
    if (!selection.rangeCount)
        return false;

    var selectionRange = selection.getRangeAt(0);
    if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element))
        return false;

    var originalValue = element.textContent;
    var wordRange = selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, WebInspector.StyleValueDelimiters, element);
    var wordString = wordRange.toString();

    if (suggestionHandler && suggestionHandler(wordString))
        return false;

    var replacementString = WebInspector.createReplacementString(wordString, event, customNumberHandler);

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
}

/**
 * @param {number} ms
 * @param {number=} precision
 * @return {string}
 */
Number.preciseMillisToString = function(ms, precision)
{
    precision = precision || 0;
    var format = "%." + precision + "f\u2009ms";
    return WebInspector.UIString(format, ms);
}

/** @type {!WebInspector.UIStringFormat} */
WebInspector._subMillisFormat = new WebInspector.UIStringFormat("%.2f\u2009ms");

/** @type {!WebInspector.UIStringFormat} */
WebInspector._millisFormat = new WebInspector.UIStringFormat("%.0f\u2009ms");

/** @type {!WebInspector.UIStringFormat} */
WebInspector._secondsFormat = new WebInspector.UIStringFormat("%.2f\u2009s");

/** @type {!WebInspector.UIStringFormat} */
WebInspector._minutesFormat = new WebInspector.UIStringFormat("%.1f\u2009min");

/** @type {!WebInspector.UIStringFormat} */
WebInspector._hoursFormat = new WebInspector.UIStringFormat("%.1f\u2009hrs");

/** @type {!WebInspector.UIStringFormat} */
WebInspector._daysFormat = new WebInspector.UIStringFormat("%.1f\u2009days");

/**
 * @param {number} ms
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.millisToString = function(ms, higherResolution)
{
    if (!isFinite(ms))
        return "-";

    if (ms === 0)
        return "0";

    if (higherResolution && ms < 1000)
        return WebInspector._subMillisFormat.format(ms);
    else if (ms < 1000)
        return WebInspector._millisFormat.format(ms);

    var seconds = ms / 1000;
    if (seconds < 60)
        return WebInspector._secondsFormat.format(seconds);

    var minutes = seconds / 60;
    if (minutes < 60)
        return WebInspector._minutesFormat.format(minutes);

    var hours = minutes / 60;
    if (hours < 24)
        return WebInspector._hoursFormat.format(hours);

    var days = hours / 24;
    return WebInspector._daysFormat.format(days);
}

/**
 * @param {number} seconds
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.secondsToString = function(seconds, higherResolution)
{
    if (!isFinite(seconds))
        return "-";
    return Number.millisToString(seconds * 1000, higherResolution);
}

/**
 * @param {number} bytes
 * @return {string}
 */
Number.bytesToString = function(bytes)
{
    if (bytes < 1024)
        return WebInspector.UIString("%.0f\u2009B", bytes);

    var kilobytes = bytes / 1024;
    if (kilobytes < 100)
        return WebInspector.UIString("%.1f\u2009KB", kilobytes);
    if (kilobytes < 1024)
        return WebInspector.UIString("%.0f\u2009KB", kilobytes);

    var megabytes = kilobytes / 1024;
    if (megabytes < 100)
        return WebInspector.UIString("%.1f\u2009MB", megabytes);
    else
        return WebInspector.UIString("%.0f\u2009MB", megabytes);
}

/**
 * @param {number} num
 * @return {string}
 */
Number.withThousandsSeparator = function(num)
{
    var str = num + "";
    var re = /(\d+)(\d{3})/;
    while (str.match(re))
        str = str.replace(re, "$1\u2009$2"); // \u2009 is a thin space.
    return str;
}

/**
 * @param {string} format
 * @param {?ArrayLike} substitutions
 * @return {!Element}
 */
WebInspector.formatLocalized = function(format, substitutions)
{
    var formatters = {
        s: substitution => substitution
    };
    /**
     * @param {!Element} a
     * @param {string|!Element} b
     * @return {!Element}
     */
    function append(a, b)
    {
        a.appendChild(typeof b === "string" ? createTextNode(b) : b);
        return a;
    }
    return String.format(WebInspector.UIString(format), substitutions, formatters, createElement("span"), append).formattedResult;
}

/**
 * @return {string}
 */
WebInspector.openLinkExternallyLabel = function()
{
    return WebInspector.UIString.capitalize("Open ^link in ^new ^tab");
}

/**
 * @return {string}
 */
WebInspector.copyLinkAddressLabel = function()
{
    return WebInspector.UIString.capitalize("Copy ^link ^address");
}

/**
 * @return {string}
 */
WebInspector.anotherProfilerActiveLabel = function()
{
    return WebInspector.UIString("Another profiler is already active");
}

/**
 * @param {string|undefined} description
 * @return {string}
 */
WebInspector.asyncStackTraceLabel = function(description)
{
    if (description)
        return description + " " + WebInspector.UIString("(async)");
    return WebInspector.UIString("Async Call");
}

/**
 * @return {string}
 */
WebInspector.manageBlackboxingSettingsTabLabel = function()
{
    return WebInspector.UIString("Blackboxing");
}

/**
 * @param {!Element} element
 */
WebInspector.installComponentRootStyles = function(element)
{
    WebInspector.appendStyle(element, "ui/inspectorCommon.css");
    WebInspector.themeSupport.injectHighlightStyleSheets(element);
    element.classList.add("platform-" + WebInspector.platform());
}

/**
 * @param {!Element} element
 * @param {string=} cssFile
 * @return {!DocumentFragment}
 */
WebInspector.createShadowRootWithCoreStyles = function(element, cssFile)
{
    var shadowRoot = element.createShadowRoot();
    WebInspector.appendStyle(shadowRoot, "ui/inspectorCommon.css");
    WebInspector.themeSupport.injectHighlightStyleSheets(shadowRoot);
    if (cssFile)
        WebInspector.appendStyle(shadowRoot, cssFile);
    shadowRoot.addEventListener("focus", WebInspector._focusChanged.bind(WebInspector), true);
    return shadowRoot;
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
WebInspector._windowFocused = function(document, event)
{
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.classList.remove("inactive");
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
WebInspector._windowBlurred = function(document, event)
{
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.classList.add("inactive");
}

/**
 * @return {!Element}
 */
WebInspector.previousFocusElement = function()
{
    return WebInspector._previousFocusElement;
}

/**
 * @return {!Element}
 */
WebInspector.currentFocusElement = function()
{
    return WebInspector._currentFocusElement;
}

/**
 * @param {!Event} event
 */
WebInspector._focusChanged = function(event)
{
    var node = event.deepActiveElement();
    WebInspector.setCurrentFocusElement(node);
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
WebInspector._documentBlurred = function(document, event)
{
    // We want to know when currentFocusElement loses focus to nowhere.
    // This is the case when event.relatedTarget is null (no element is being focused)
    // and document.activeElement is reset to default (this is not a window blur).
    if (!event.relatedTarget && document.activeElement === document.body)
      WebInspector.setCurrentFocusElement(null);
}

WebInspector._textInputTypes = ["text", "search", "tel", "url", "email", "password"].keySet();
WebInspector._isTextEditingElement = function(element)
{
    if (element instanceof HTMLInputElement)
        return element.type in WebInspector._textInputTypes;

    if (element instanceof HTMLTextAreaElement)
        return true;

    return false;
}

/**
 * @param {?Node} x
 */
WebInspector.setCurrentFocusElement = function(x)
{
    if (WebInspector._glassPane && x && !WebInspector._glassPane.element.isAncestor(x))
        return;
    if (WebInspector._currentFocusElement !== x)
        WebInspector._previousFocusElement = WebInspector._currentFocusElement;
    WebInspector._currentFocusElement = x;

    if (x) {
        x.focus();

        // Make a caret selection inside the new element if there isn't a range selection and there isn't already a caret selection inside.
        // This is needed (at least) to remove caret from console when focus is moved to some element in the panel.
        // The code below should not be applied to text fields and text areas, hence _isTextEditingElement check.
        var selection = x.getComponentSelection();
        if (!WebInspector._isTextEditingElement(x) && selection.isCollapsed && !x.isInsertionCaretInside()) {
            var selectionRange = x.ownerDocument.createRange();
            selectionRange.setStart(x, 0);
            selectionRange.setEnd(x, 0);

            selection.removeAllRanges();
            selection.addRange(selectionRange);
        }
    } else if (WebInspector._previousFocusElement)
        WebInspector._previousFocusElement.blur();
}

WebInspector.restoreFocusFromElement = function(element)
{
    if (element && element.isSelfOrAncestor(WebInspector.currentFocusElement()))
        WebInspector.setCurrentFocusElement(WebInspector.previousFocusElement());
}

/**
 * @param {!Element} element
 * @param {number} offset
 * @param {number} length
 * @param {!Array.<!Object>=} domChanges
 * @return {?Element}
 */
WebInspector.highlightSearchResult = function(element, offset, length, domChanges)
{
    var result = WebInspector.highlightSearchResults(element, [new WebInspector.SourceRange(offset, length)], domChanges);
    return result.length ? result[0] : null;
}

/**
 * @param {!Element} element
 * @param {!Array.<!WebInspector.SourceRange>} resultRanges
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
WebInspector.highlightSearchResults = function(element, resultRanges, changes)
{
    return WebInspector.highlightRangesWithStyleClass(element, resultRanges, WebInspector.highlightedSearchResultClassName, changes);
}

/**
 * @param {!Element} element
 * @param {string} className
 */
WebInspector.runCSSAnimationOnce = function(element, className)
{
    function animationEndCallback()
    {
        element.classList.remove(className);
        element.removeEventListener("webkitAnimationEnd", animationEndCallback, false);
    }

    if (element.classList.contains(className))
        element.classList.remove(className);

    element.addEventListener("webkitAnimationEnd", animationEndCallback, false);
    element.classList.add(className);
}

/**
 * @param {!Element} element
 * @param {!Array.<!WebInspector.SourceRange>} resultRanges
 * @param {string} styleClass
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
WebInspector.highlightRangesWithStyleClass = function(element, resultRanges, styleClass, changes)
{
    changes = changes || [];
    var highlightNodes = [];
    var textNodes = element.childTextNodes();
    var lineText = textNodes.map(function(node) { return node.textContent; }).join("");
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

        while (startIndex < textNodes.length && nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset)
            startIndex++;
        var endIndex = startIndex;
        while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset)
            endIndex++;
        if (endIndex === textNodes.length)
            break;

        var highlightNode = ownerDocument.createElement("span");
        highlightNode.className = styleClass;
        highlightNode.textContent = lineText.substring(startOffset, endOffset);

        var lastTextNode = textNodes[endIndex];
        var lastText = lastTextNode.textContent;
        lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
        changes.push({ node: lastTextNode, type: "changed", oldText: lastText, newText: lastTextNode.textContent });

        if (startIndex === endIndex) {
            lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
            changes.push({ node: highlightNode, type: "added", nextSibling: lastTextNode, parent: lastTextNode.parentElement });
            highlightNodes.push(highlightNode);

            var prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
            lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
            changes.push({ node: prefixNode, type: "added", nextSibling: highlightNode, parent: lastTextNode.parentElement });
        } else {
            var firstTextNode = textNodes[startIndex];
            var firstText = firstTextNode.textContent;
            var anchorElement = firstTextNode.nextSibling;

            firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
            changes.push({ node: highlightNode, type: "added", nextSibling: anchorElement, parent: firstTextNode.parentElement });
            highlightNodes.push(highlightNode);

            firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
            changes.push({ node: firstTextNode, type: "changed", oldText: firstText, newText: firstTextNode.textContent });

            for (var j = startIndex + 1; j < endIndex; j++) {
                var textNode = textNodes[j];
                var text = textNode.textContent;
                textNode.textContent = "";
                changes.push({ node: textNode, type: "changed", oldText: text, newText: textNode.textContent });
            }
        }
        startIndex = endIndex;
        nodeRanges[startIndex].offset = endOffset;
        nodeRanges[startIndex].length = lastTextNode.textContent.length;

    }
    return highlightNodes;
}

WebInspector.applyDomChanges = function(domChanges)
{
    for (var i = 0, size = domChanges.length; i < size; ++i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.parent.insertBefore(entry.node, entry.nextSibling);
            break;
        case "changed":
            entry.node.textContent = entry.newText;
            break;
        }
    }
}

WebInspector.revertDomChanges = function(domChanges)
{
    for (var i = domChanges.length - 1; i >= 0; --i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.node.remove();
            break;
        case "changed":
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
WebInspector.measurePreferredSize = function(element, containerElement)
{
    containerElement = containerElement || element.ownerDocument.body;
    containerElement.appendChild(element);
    element.positionAt(0, 0);
    var result = new Size(element.offsetWidth, element.offsetHeight);
    element.positionAt(undefined, undefined);
    element.remove();
    return result;
}

/**
 * @constructor
 * @param {boolean} autoInvoke
 */
WebInspector.InvokeOnceHandlers = function(autoInvoke)
{
    this._handlers = null;
    this._autoInvoke = autoInvoke;
}

WebInspector.InvokeOnceHandlers.prototype = {
    /**
     * @param {!Object} object
     * @param {function()} method
     */
    add: function(object, method)
    {
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
    },

    /**
     * @suppressGlobalPropertiesCheck
     */
    scheduleInvoke: function()
    {
        if (this._handlers)
            requestAnimationFrame(this._invoke.bind(this));
    },

    _invoke: function()
    {
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
}

WebInspector._coalescingLevel = 0;
WebInspector._postUpdateHandlers = null;

WebInspector.startBatchUpdate = function()
{
    if (!WebInspector._coalescingLevel++)
        WebInspector._postUpdateHandlers = new WebInspector.InvokeOnceHandlers(false);
}

WebInspector.endBatchUpdate = function()
{
    if (--WebInspector._coalescingLevel)
        return;
    WebInspector._postUpdateHandlers.scheduleInvoke();
    WebInspector._postUpdateHandlers = null;
}

/**
 * @param {!Object} object
 * @param {function()} method
 */
WebInspector.invokeOnceAfterBatchUpdate = function(object, method)
{
    if (!WebInspector._postUpdateHandlers)
        WebInspector._postUpdateHandlers = new WebInspector.InvokeOnceHandlers(true);
    WebInspector._postUpdateHandlers.add(object, method);
}

/**
 * @param {!Window} window
 * @param {!Function} func
 * @param {!Array.<{from:number, to:number}>} params
 * @param {number} frames
 * @param {function()=} animationComplete
 * @return {function()}
 */
WebInspector.animateFunction = function(window, func, params, frames, animationComplete)
{
    var values = new Array(params.length);
    var deltas = new Array(params.length);
    for (var i = 0; i < params.length; ++i) {
        values[i] = params[i].from;
        deltas[i] = (params[i].to - params[i].from) / frames;
    }

    var raf = window.requestAnimationFrame(animationStep);

    var framesLeft = frames;

    function animationStep()
    {
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

    function cancelAnimation()
    {
        window.cancelAnimationFrame(raf);
    }

    return cancelAnimation;
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!Element} element
 * @param {function(!Event)} callback
 */
WebInspector.LongClickController = function(element, callback)
{
    this._element = element;
    this._callback = callback;
    this._enable();
}

WebInspector.LongClickController.prototype = {
    reset: function()
    {
        if (this._longClickInterval) {
            clearInterval(this._longClickInterval);
            delete this._longClickInterval;
        }
    },

    _enable: function()
    {
        if (this._longClickData)
            return;
        var boundMouseDown = mouseDown.bind(this);
        var boundMouseUp = mouseUp.bind(this);
        var boundReset = this.reset.bind(this);

        this._element.addEventListener("mousedown", boundMouseDown, false);
        this._element.addEventListener("mouseout", boundReset, false);
        this._element.addEventListener("mouseup", boundMouseUp, false);
        this._element.addEventListener("click", boundReset, true);

        this._longClickData = { mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset };

        /**
         * @param {!Event} e
         * @this {WebInspector.LongClickController}
         */
        function mouseDown(e)
        {
            if (e.which !== 1)
                return;
            var callback = this._callback;
            this._longClickInterval = setTimeout(callback.bind(null, e), 200);
        }

        /**
         * @param {!Event} e
         * @this {WebInspector.LongClickController}
         */
        function mouseUp(e)
        {
            if (e.which !== 1)
                return;
            this.reset();
        }
    },

    dispose: function()
    {
        if (!this._longClickData)
            return;
        this._element.removeEventListener("mousedown", this._longClickData.mouseDown, false);
        this._element.removeEventListener("mouseout", this._longClickData.reset, false);
        this._element.removeEventListener("mouseup", this._longClickData.mouseUp, false);
        this._element.addEventListener("click", this._longClickData.reset, true);
        delete this._longClickData;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @param {!Document} document
 * @param {!WebInspector.Setting} themeSetting
 */
WebInspector.initializeUIUtils = function(document, themeSetting)
{
    document.defaultView.addEventListener("focus", WebInspector._windowFocused.bind(WebInspector, document), false);
    document.defaultView.addEventListener("blur", WebInspector._windowBlurred.bind(WebInspector, document), false);
    document.addEventListener("focus", WebInspector._focusChanged.bind(WebInspector), true);
    document.addEventListener("blur", WebInspector._documentBlurred.bind(WebInspector, document), true);

    if (!WebInspector.themeSupport)
        WebInspector.themeSupport = new WebInspector.ThemeSupport(themeSetting);
    WebInspector.themeSupport.applyTheme(document);

    var body = /** @type {!Element} */ (document.body);
    WebInspector.appendStyle(body, "ui/inspectorStyle.css");
    WebInspector.appendStyle(body, "ui/popover.css");
    WebInspector.appendStyle(body, "ui/sidebarPane.css");

}

/**
 * @param {string} name
 * @return {string}
 */
WebInspector.beautifyFunctionName = function(name)
{
    return name || WebInspector.UIString("(anonymous function)");
}

/**
 * @param {string} localName
 * @param {string} typeExtension
 * @param {!Object} prototype
 * @return {function()}
 * @suppressGlobalPropertiesCheck
 * @template T
 */
function registerCustomElement(localName, typeExtension, prototype)
{
    return document.registerElement(typeExtension, {
        prototype: Object.create(prototype),
        extends: localName
    });
}

/**
 * @param {string} text
 * @param {function(!Event)=} clickHandler
 * @param {string=} className
 * @param {string=} title
 * @return {!Element}
 */
function createTextButton(text, clickHandler, className, title)
{
    var element = createElementWithClass("button", className || "", "text-button");
    element.textContent = text;
    if (clickHandler)
        element.addEventListener("click", clickHandler, false);
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
function createRadioLabel(name, title, checked)
{
    var element = createElement("label", "dt-radio");
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
function createLabel(title, iconClass)
{
    var element = createElement("label", "dt-icon-label");
    element.createChild("span").textContent = title;
    element.type = iconClass;
    return element;
}

/**
 * @param {string=} title
 * @param {boolean=} checked
 * @param {string=} subtitle
 * @return {!Element}
 */
function createCheckboxLabel(title, checked, subtitle)
{
    var element = createElement("label", "dt-checkbox");
    element.checkboxElement.checked = !!checked;
    if (title !== undefined) {
        element.textElement = element.createChild("div", "dt-checkbox-text");
        element.textElement.textContent = title;
        if (subtitle !== undefined) {
            element.subtitleElement = element.textElement.createChild("div", "dt-checkbox-subtitle");
            element.subtitleElement.textContent = subtitle;
        }
    }
    return element;
}

/**
 * @param {!Node} node
 * @param {string} cssFile
 * @suppressGlobalPropertiesCheck
 */
WebInspector.appendStyle = function(node, cssFile)
{
    var content = Runtime.cachedResources[cssFile] || "";
    if (!content)
        console.error(cssFile + " not preloaded. Check module.json");
    var styleElement = createElement("style");
    styleElement.type = "text/css";
    styleElement.textContent = content;
    node.appendChild(styleElement);

    var themeStyleSheet = WebInspector.themeSupport.themeStyleSheet(cssFile, content);
    if (themeStyleSheet) {
        styleElement = createElement("style");
        styleElement.type = "text/css";
        styleElement.textContent = themeStyleSheet + "\n" + Runtime.resolveSourceURL(cssFile + ".theme");
        node.appendChild(styleElement);
    }
}

;(function() {
    registerCustomElement("button", "text-button", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            this.type = "button";
            var root = WebInspector.createShadowRootWithCoreStyles(this, "ui/textButton.css");
            root.createChild("content");
        },

        __proto__: HTMLButtonElement.prototype
    });

    registerCustomElement("label", "dt-radio", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            this.radioElement = this.createChild("input", "dt-radio-button");
            this.radioElement.type = "radio";
            var root = WebInspector.createShadowRootWithCoreStyles(this, "ui/radioButton.css");
            root.createChild("content").select = ".dt-radio-button";
            root.createChild("content");
            this.addEventListener("click", radioClickHandler, false);
        },

        __proto__: HTMLLabelElement.prototype
    });

    /**
     * @param {!Event} event
     * @suppressReceiverCheck
     * @this {Element}
     */
    function radioClickHandler(event)
    {
        if (this.radioElement.checked || this.radioElement.disabled)
            return;
        this.radioElement.checked = true;
        this.radioElement.dispatchEvent(new Event("change"));
    }

    registerCustomElement("label", "dt-checkbox", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            this._root = WebInspector.createShadowRootWithCoreStyles(this, "ui/checkboxTextLabel.css");
            var checkboxElement = createElementWithClass("input", "dt-checkbox-button");
            checkboxElement.type = "checkbox";
            this._root.appendChild(checkboxElement);
            this.checkboxElement = checkboxElement;

            this.addEventListener("click", toggleCheckbox.bind(this));

            /**
             * @param {!Event} event
             * @this {Node}
             */
            function toggleCheckbox(event)
            {
                if (event.target !== checkboxElement && event.target !== this) {
                    event.consume();
                    checkboxElement.click();
                }
            }

            this._root.createChild("content");
        },

        /**
         * @param {string} color
         * @this {Element}
         */
        set backgroundColor(color)
        {
            this.checkboxElement.classList.add("dt-checkbox-themed");
            this.checkboxElement.style.backgroundColor = color;
        },

        /**
         * @param {string} color
         * @this {Element}
         */
        set checkColor(color)
        {
            this.checkboxElement.classList.add("dt-checkbox-themed");
            var stylesheet = createElement("style");
            stylesheet.textContent = "input.dt-checkbox-themed:checked:after { background-color: " + color + "}";
            this._root.appendChild(stylesheet);
        },

        /**
         * @param {string} color
         * @this {Element}
         */
        set borderColor(color)
        {
            this.checkboxElement.classList.add("dt-checkbox-themed");
            this.checkboxElement.style.borderColor = color;
        },

        __proto__: HTMLLabelElement.prototype
    });

    registerCustomElement("label", "dt-icon-label", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            var root = WebInspector.createShadowRootWithCoreStyles(this, "ui/smallIcon.css");
            this._iconElement = root.createChild("div");
            root.createChild("content");
        },

        /**
         * @param {string} type
         * @this {Element}
         */
        set type(type)
        {
            this._iconElement.className = type;
        },

        __proto__: HTMLLabelElement.prototype
    });

    registerCustomElement("div", "dt-close-button", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            var root = WebInspector.createShadowRootWithCoreStyles(this, "ui/closeButton.css");
            this._buttonElement = root.createChild("div", "close-button");
        },

        /**
         * @param {boolean} gray
         * @this {Element}
         */
        set gray(gray)
        {
            this._buttonElement.className = gray ? "close-button-gray" : "close-button";
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
WebInspector.bindInput = function(input, apply, validate, numeric)
{
    input.addEventListener("change", onChange, false);
    input.addEventListener("input", onInput, false);
    input.addEventListener("keydown", onKeyDown, false);
    input.addEventListener("focus", input.select.bind(input), false);

    function onInput()
    {
        input.classList.toggle("error-input", !validate(input.value));
    }

    function onChange()
    {
        var valid = validate(input.value);
        input.classList.toggle("error-input", !valid);
        if (valid)
            apply(input.value);
    }

    /**
     * @param {!Event} event
     */
    function onKeyDown(event)
    {
        if (isEnterKey(event)) {
            if (validate(input.value))
                apply(input.value);
            return;
        }

        if (!numeric)
            return;

        var increment = event.keyIdentifier === "Up" ? 1 : event.keyIdentifier === "Down" ? -1 : 0;
        if (!increment)
            return;
        if (event.shiftKey)
            increment *= 10;

        var value = input.value;
        if (!validate(value) || !value)
            return;

        value = (value ? Number(value) : 0) + increment;
        var stringValue = value ? String(value) : "";
        if (!validate(stringValue) || !value)
            return;

        input.value = stringValue;
        apply(input.value);
        event.preventDefault();
    }

    /**
     * @param {string} value
     */
    function setValue(value)
    {
        if (value === input.value)
            return;
        var valid = validate(value);
        input.classList.toggle("error-input", !valid);
        input.value = value;

        // Selection range operations are not supported by type "number" inputs.  This browser
        // behavior is detailed by the WHATWG forms spec.
        if (input.type !== "number")
            input.setSelectionRange(value.length, value.length);
    }

    return setValue;
}

/**
 * @constructor
 */
WebInspector.StringFormatter = function()
{
    this._processors = [];
    this._regexes = [];
}

WebInspector.StringFormatter.prototype = {
    /**
     * @param {!RegExp} regex
     * @param {function(string):!Node} handler
     */
    addProcessor: function(regex, handler)
    {
        this._regexes.push(regex);
        this._processors.push(handler);
    },

    /**
     * @param {string} text
     * @return {!Node}
     */
    formatText: function(text)
    {
        return this._runProcessor(0, text);
    },

    /**
     * @param {number} processorIndex
     * @param {string} text
     * @return {!Node}
     */
    _runProcessor: function(processorIndex, text)
    {
        if (processorIndex >= this._processors.length)
            return createTextNode(text);

        var container = createDocumentFragment();
        var regex = this._regexes[processorIndex];
        var processor = this._processors[processorIndex];

        // Due to the nature of regex, |items| array has matched elements on its even indexes.
        var items = text.replace(regex, "\0$1\0").split("\0");
        for (var i = 0; i < items.length; ++i) {
            var processedNode = i % 2 ? processor(items[i]) : this._runProcessor(processorIndex + 1, items[i]);
            container.appendChild(processedNode);
        }

        return container;
    }
}

/**
 * @constructor
 * @param {!WebInspector.Setting} setting
 */
WebInspector.ThemeSupport = function(setting)
{
    this._themeName = setting.get() || "default";
    this._themableProperties = new Set([
        "color", "box-shadow", "text-shadow", "outline-color",
        "background-image", "background-color",
        "border-left-color", "border-right-color", "border-top-color", "border-bottom-color",
        "-webkit-border-image"]);
    /** @type {!Map<string, string>} */
    this._cachedThemePatches = new Map();
    this._setting = setting;
}

/**
 * @enum {number}
 */
WebInspector.ThemeSupport.ColorUsage = {
    Unknown: 0,
    Foreground: 1 << 0,
    Background: 1 << 1,
    Selection: 1 << 2,
};

WebInspector.ThemeSupport.prototype = {
    /**
     * @return {boolean}
     */
    hasTheme: function()
    {
        return this._themeName !== "default";
    },

    /**
     * @param {!Element} element
     */
    injectHighlightStyleSheets: function(element)
    {
        this._injectingStyleSheet = true;
        WebInspector.appendStyle(element, "ui/inspectorSyntaxHighlight.css");
        if (this._themeName === "dark")
            WebInspector.appendStyle(element, "ui/inspectorSyntaxHighlightDark.css");
        this._injectingStyleSheet = false;
    },

    /**
     * @param {!Document} document
     */
    applyTheme: function(document)
    {
        if (!this.hasTheme())
            return;

        if (this._themeName === "dark")
            document.body.classList.add("-theme-with-dark-background");

        var styleSheets = document.styleSheets;
        var result = [];
        for (var i = 0; i < styleSheets.length; ++i)
            result.push(this._patchForTheme(styleSheets[i].href, styleSheets[i]));
        result.push("/*# sourceURL=inspector.css.theme */");

        var styleElement = createElement("style");
        styleElement.type = "text/css";
        styleElement.textContent = result.join("\n");
        document.head.appendChild(styleElement);
    },

    /**
     * @param {string} id
     * @param {string} text
     * @return {string}
     * @suppressGlobalPropertiesCheck
     */
    themeStyleSheet: function(id, text)
    {
        if (!this.hasTheme() || this._injectingStyleSheet)
            return "";

        var patch = this._cachedThemePatches.get(id);
        if (!patch) {
            var styleElement = createElement("style");
            styleElement.type = "text/css";
            styleElement.textContent = text;
            document.body.appendChild(styleElement);
            patch = this._patchForTheme(id, styleElement.sheet);
            document.body.removeChild(styleElement);
        }
        return patch;
    },

    /**
     * @param {string} id
     * @param {!StyleSheet} styleSheet
     * @return {string}
     */
    _patchForTheme: function(id, styleSheet)
    {
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
                    result.push(rules[j].selectorText + "{" + output.join("") + "}");
            }

            var fullText = result.join("\n");
            this._cachedThemePatches.set(id, fullText);
            return fullText;
        } catch (e) {
           this._setting.set("default");
           return "";
        }
    },

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
    _patchProperty: function(selectorText, style, name, output)
    {
        if (!this._themableProperties.has(name))
            return;

        var value = style.getPropertyValue(name);
        if (!value || value === "none" || value === "inherit" || value === "initial" || value === "transparent")
            return;
        if (name === "background-image" && value.indexOf("gradient") === -1)
            return;

        var isSelection = selectorText.indexOf(".-theme-selection-color") !== -1;
        if (selectorText.indexOf("-theme-") !== -1 && !isSelection)
            return;

        if (name === "-webkit-border-image") {
            output.push("-webkit-filter: invert(100%)");
            return;
        }

        isSelection = isSelection || selectorText.indexOf("selected") !== -1 || selectorText.indexOf(".selection") !== -1;
        var colorUsage = WebInspector.ThemeSupport.ColorUsage.Unknown;
        if (isSelection)
            colorUsage |= WebInspector.ThemeSupport.ColorUsage.Selection;
        if (name.indexOf("background") === 0 || name.indexOf("border") === 0)
            colorUsage |= WebInspector.ThemeSupport.ColorUsage.Background;
        if (name.indexOf("background") === -1)
            colorUsage |= WebInspector.ThemeSupport.ColorUsage.Foreground;

        var colorRegex = /((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b\w+\b(?!-))/g;
        output.push(name);
        output.push(":");
        var items = value.replace(colorRegex, "\0$1\0").split("\0");
        for (var i = 0; i < items.length; ++i)
            output.push(this.patchColor(items[i], colorUsage));
        if (style.getPropertyPriority(name))
            output.push(" !important");
        output.push(";");
    },

    /**
     * @param {string} text
     * @param {!WebInspector.ThemeSupport.ColorUsage} colorUsage
     * @return {string}
     */
    patchColor: function(text, colorUsage)
    {
        var color = WebInspector.Color.parse(text);
        if (!color)
            return text;

        var hsla = color.hsla();
        this._patchHSLA(hsla, colorUsage);
        var rgba = [];
        WebInspector.Color.hsl2rgb(hsla, rgba);
        var outColor = new WebInspector.Color(rgba, color.format());
        var outText = outColor.asString(null);
        if (!outText)
            outText = outColor.asString(outColor.hasAlpha() ? WebInspector.Color.Format.RGBA : WebInspector.Color.Format.RGB);
        return outText || text;
    },

    /**
     * @param {!Array<number>} hsla
     * @param {!WebInspector.ThemeSupport.ColorUsage} colorUsage
     */
    _patchHSLA: function(hsla, colorUsage)
    {
        var hue = hsla[0];
        var sat = hsla[1];
        var lit = hsla[2];
        var alpha = hsla[3]

        switch (this._themeName) {
        case "dark":
            if (colorUsage & WebInspector.ThemeSupport.ColorUsage.Selection)
                hue = (hue + 0.5) % 1;
            var minCap = colorUsage & WebInspector.ThemeSupport.ColorUsage.Background ? 0.14 : 0;
            var maxCap = colorUsage & WebInspector.ThemeSupport.ColorUsage.Foreground ? 0.9 : 1;
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
}

/**
 * @param {?NetworkAgent.ResourcePriority} priority
 * @return {string}
 */
WebInspector.uiLabelForPriority = function(priority)
{
    var labelMap = WebInspector.uiLabelForPriority._priorityToUILabel;
    if (!labelMap) {
        labelMap = new Map([
            [NetworkAgent.ResourcePriority.VeryLow, WebInspector.UIString("Lowest")],
            [NetworkAgent.ResourcePriority.Low, WebInspector.UIString("Low")],
            [NetworkAgent.ResourcePriority.Medium, WebInspector.UIString("Medium")],
            [NetworkAgent.ResourcePriority.High, WebInspector.UIString("High")],
            [NetworkAgent.ResourcePriority.VeryHigh, WebInspector.UIString("Highest")]
        ]);
        WebInspector.uiLabelForPriority._priorityToUILabel = labelMap;
    }
    return labelMap.get(priority) || WebInspector.UIString("Unknown");
}

/**
 * @param {string} url
 * @param {string=} linkText
 * @param {string=} classes
 * @param {boolean=} isExternal
 * @param {string=} tooltipText
 * @return {!Element}
 */
WebInspector.linkifyURLAsNode = function(url, linkText, classes, isExternal, tooltipText)
{
    if (!linkText)
        linkText = url;

    var a = createElementWithClass("a", classes);
    var href = url;
    if (url.trim().toLowerCase().startsWith("javascript:"))
        href = null;
    if (isExternal && WebInspector.ParsedURL.isRelativeURL(url))
        href = null;
    if (href !== null) {
        a.href = href;
        a.classList.add(isExternal ? "webkit-html-external-link" : "webkit-html-resource-link");
    }
    if (!tooltipText && linkText !== url)
        a.title = url;
    else if (tooltipText)
        a.title = tooltipText;
    a.textContent = linkText.trimMiddle(150);
    if (isExternal)
        a.setAttribute("target", "_blank");

    return a;
}

/**
 * @param {string} article
 * @param {string} title
 * @return {!Element}
 */
WebInspector.linkifyDocumentationURLAsNode = function(article, title)
{
    return WebInspector.linkifyURLAsNode("https://developers.google.com/web/tools/chrome-devtools/" + article, title, undefined, true);
}

/** @type {!WebInspector.ThemeSupport} */
WebInspector.themeSupport;
