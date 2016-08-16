// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ContextFlavorListener}
 */
WebInspector.JavaScriptBreakpointsSidebarPane = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("components/breakpointsList.css");

    this._breakpointManager = WebInspector.breakpointManager;

    this._listElement = createElementWithClass("ol", "breakpoint-list");

    this.emptyElement = this.element.createChild("div", "gray-info-message");
    this.emptyElement.textContent = WebInspector.UIString("No Breakpoints");

    this._items = new Map();

    var breakpointLocations = this._breakpointManager.allBreakpointLocations();
    for (var i = 0; i < breakpointLocations.length; ++i)
        this._addBreakpoint(breakpointLocations[i].breakpoint, breakpointLocations[i].uiLocation);

    this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
    this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);

    this.emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), true);
    this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointsActiveStateChanged, this._breakpointsActiveStateChanged, this);
    this._breakpointsActiveStateChanged();
    this._update();
}

WebInspector.JavaScriptBreakpointsSidebarPane.prototype = {
    _emptyElementContextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        this._appendBreakpointActiveItem(contextMenu);
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendBreakpointActiveItem: function(contextMenu)
    {
        var breakpointActive = this._breakpointManager.breakpointsActive();
        var breakpointActiveTitle = breakpointActive ?
            WebInspector.UIString.capitalize("Deactivate ^breakpoints") :
            WebInspector.UIString.capitalize("Activate ^breakpoints");
        contextMenu.appendItem(breakpointActiveTitle, this._breakpointManager.setBreakpointsActive.bind(this._breakpointManager, !breakpointActive));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _breakpointAdded: function(event)
    {
        this._breakpointRemoved(event);

        var breakpoint = /** @type {!WebInspector.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
        var uiLocation = /** @type {!WebInspector.UILocation} */ (event.data.uiLocation);
        this._addBreakpoint(breakpoint, uiLocation);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {!WebInspector.UILocation} uiLocation
     */
    _addBreakpoint: function(breakpoint, uiLocation)
    {
        var element = createElementWithClass("li", "cursor-pointer");
        element.addEventListener("contextmenu", this._breakpointContextMenu.bind(this, breakpoint), true);
        element.addEventListener("click", this._breakpointClicked.bind(this, uiLocation), false);

        var checkboxLabel = createCheckboxLabel(uiLocation.linkText(), breakpoint.enabled());
        element.appendChild(checkboxLabel);
        checkboxLabel.addEventListener("click", this._breakpointCheckboxClicked.bind(this, breakpoint), false);

        var snippetElement = element.createChild("div", "source-text monospace");

        /**
         * @param {?string} content
         * @this {WebInspector.JavaScriptBreakpointsSidebarPane}
         */
        function didRequestContent(content)
        {
            var lineNumber = uiLocation.lineNumber
            var columnNumber = uiLocation.columnNumber;
            var text = new WebInspector.Text(content || "");
            if (lineNumber < text.lineCount()) {
                var lineText = text.lineAt(lineNumber);
                var maxSnippetLength = 200;
                var snippetStartIndex = columnNumber > 100 ? columnNumber : 0;
                snippetElement.textContent = lineText.substr(snippetStartIndex).trimEnd(maxSnippetLength);
            }
            this.didReceiveBreakpointLineForTest(uiLocation.uiSourceCode);
        }

        uiLocation.uiSourceCode.requestContent().then(didRequestContent.bind(this));

        element._data = uiLocation;
        var currentElement = this._listElement.firstChild;
        while (currentElement) {
            if (currentElement._data && this._compareBreakpoints(currentElement._data, element._data) > 0)
                break;
            currentElement = currentElement.nextSibling;
        }
        this._addListElement(element, currentElement);

        var breakpointItem = { element: element, checkbox: checkboxLabel.checkboxElement };
        this._items.set(breakpoint, breakpointItem);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    didReceiveBreakpointLineForTest: function(uiSourceCode)
    {
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _breakpointRemoved: function(event)
    {
        var breakpoint = /** @type {!WebInspector.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
        var breakpointItem = this._items.get(breakpoint);
        if (!breakpointItem)
            return;
        this._items.remove(breakpoint);
        this._removeListElement(breakpointItem.element);
    },

    /**
     * @override
     * @param {?Object} object
     */
    flavorChanged: function(object)
    {
        this._update();
    },

    _update: function()
    {
        var details = WebInspector.context.flavor(WebInspector.DebuggerPausedDetails);
        var uiLocation = details && details.callFrames.length ? WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location()) : null;
        var breakpoint = uiLocation ? this._breakpointManager.findBreakpointOnLine(uiLocation.uiSourceCode, uiLocation.lineNumber) : null;
        var breakpointItem = this._items.get(breakpoint);
        if (!breakpointItem) {
            if (this._highlightedBreakpointItem) {
                this._highlightedBreakpointItem.element.classList.remove("breakpoint-hit");
                delete this._highlightedBreakpointItem;
            }
            return;
        }

        breakpointItem.element.classList.add("breakpoint-hit");
        this._highlightedBreakpointItem = breakpointItem;
        WebInspector.viewManager.showView("sources.jsBreakpoints");
    },

    _breakpointsActiveStateChanged: function()
    {
        this._listElement.classList.toggle("breakpoints-list-deactivated", !this._breakpointManager.breakpointsActive());
    },

    /**
     * @param {!WebInspector.UILocation} uiLocation
     */
    _breakpointClicked: function(uiLocation)
    {
        WebInspector.Revealer.reveal(uiLocation);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {!Event} event
     */
    _breakpointCheckboxClicked: function(breakpoint, event)
    {
        // Breakpoint element has it's own click handler.
        event.consume();
        breakpoint.setEnabled(event.target.checkboxElement.checked);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {!Event} event
     */
    _breakpointContextMenu: function(breakpoint, event)
    {
        var breakpoints = this._items.valuesArray();
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Remove ^breakpoint"), breakpoint.remove.bind(breakpoint));
        if (breakpoints.length > 1) {
            var removeAllTitle = WebInspector.UIString.capitalize("Remove ^all ^breakpoints");
            contextMenu.appendItem(removeAllTitle, this._breakpointManager.removeAllBreakpoints.bind(this._breakpointManager));
        }

        contextMenu.appendSeparator();
        this._appendBreakpointActiveItem(contextMenu);

        function enabledBreakpointCount(breakpoints)
        {
            var count = 0;
            for (var i = 0; i < breakpoints.length; ++i) {
                if (breakpoints[i].checkbox.checked)
                    count++;
            }
            return count;
        }
        if (breakpoints.length > 1) {
            var enableBreakpointCount = enabledBreakpointCount(breakpoints);
            var enableTitle = WebInspector.UIString.capitalize("Enable ^all ^breakpoints");
            var disableTitle = WebInspector.UIString.capitalize("Disable ^all ^breakpoints");

            contextMenu.appendSeparator();

            contextMenu.appendItem(enableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, true), !(enableBreakpointCount !== breakpoints.length));
            contextMenu.appendItem(disableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, false), !(enableBreakpointCount > 1));
        }

        contextMenu.show();
    },

    _addListElement: function(element, beforeElement)
    {
        if (beforeElement)
            this._listElement.insertBefore(element, beforeElement);
        else {
            if (!this._listElement.firstChild) {
                this.element.removeChild(this.emptyElement);
                this.element.appendChild(this._listElement);
            }
            this._listElement.appendChild(element);
        }
    },

    _removeListElement: function(element)
    {
        this._listElement.removeChild(element);
        if (!this._listElement.firstChild) {
            this.element.removeChild(this._listElement);
            this.element.appendChild(this.emptyElement);
        }
    },

    _compare: function(x, y)
    {
        if (x !== y)
            return x < y ? -1 : 1;
        return 0;
    },

    _compareBreakpoints: function(b1, b2)
    {
        return this._compare(b1.uiSourceCode.url(), b2.uiSourceCode.url()) || this._compare(b1.lineNumber, b2.lineNumber);
    },

    reset: function()
    {
        this._listElement.removeChildren();
        if (this._listElement.parentElement) {
            this.element.removeChild(this._listElement);
            this.element.appendChild(this.emptyElement);
        }
        this._items.clear();
    },

    __proto__: WebInspector.VBox.prototype
}
