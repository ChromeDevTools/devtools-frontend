/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SimpleView}
 * @implements {WebInspector.ContextFlavorListener}
 */
WebInspector.CallStackSidebarPane = function()
{
    WebInspector.SimpleView.call(this, WebInspector.UIString("Call Stack"));
    this.element.addEventListener("keydown", this._keyDown.bind(this), true);
    this.element.tabIndex = 0;
    this.callFrameList = new WebInspector.UIList();
    this.callFrameList.show(this.element);
    this._linkifier = new WebInspector.Linkifier();
    WebInspector.moduleSetting("enableAsyncStackTraces").addChangeListener(this._asyncStackTracesStateChanged, this);
    WebInspector.moduleSetting("skipStackFramesPattern").addChangeListener(this._update, this);
    /** @type {!Array<!WebInspector.CallStackSidebarPane.CallFrame>} */
    this.callFrames = [];
    this._locationPool = new WebInspector.LiveLocationPool();
    this._update();
}

WebInspector.CallStackSidebarPane.prototype = {
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

        this.callFrameList.detach();
        this.callFrameList.clear();
        this._linkifier.reset();
        this.element.removeChildren();
        this._locationPool.disposeAll();

        this.callFrameList.show(this.element);
        delete this._hiddenCallFramesMessageElement;
        this.callFrames = [];
        this._hiddenCallFrames = 0;

        this._updateStatusMessage(details);

        if (!details) {
            WebInspector.context.setFlavor(WebInspector.DebuggerModel.CallFrame, null);
            return;
        }
        this._debuggerModel = details.debuggerModel;
        var asyncStackTrace = details.asyncStackTrace;

        this._appendSidebarCallFrames(this._callFramesFromDebugger(details.callFrames));
        var topStackHidden = (this._hiddenCallFrames === this.callFrames.length);

        while (asyncStackTrace) {
            var title = WebInspector.asyncStackTraceLabel(asyncStackTrace.description);
            var asyncCallFrame = new WebInspector.UIList.Item(title, "", true);
            asyncCallFrame.setHoverable(false);
            asyncCallFrame.element.addEventListener("contextmenu", this._asyncCallFrameContextMenu.bind(this, this.callFrames.length), true);
            this._appendSidebarCallFrames(this._callFramesFromRuntime(asyncStackTrace.callFrames, asyncCallFrame), asyncCallFrame);
            asyncStackTrace = asyncStackTrace.parent;
        }

        if (topStackHidden)
            this._revealHiddenCallFrames();
        if (this._hiddenCallFrames) {
            var element = createElementWithClass("div", "hidden-callframes-message");
            if (this._hiddenCallFrames === 1)
                element.textContent = WebInspector.UIString("1 stack frame is hidden (black-boxed).");
            else
                element.textContent = WebInspector.UIString("%d stack frames are hidden (black-boxed).", this._hiddenCallFrames);
            element.createTextChild(" ");
            var showAllLink = element.createChild("span", "link");
            showAllLink.textContent = WebInspector.UIString("Show");
            showAllLink.addEventListener("click", this._revealHiddenCallFrames.bind(this), false);
            this.element.insertBefore(element, this.element.firstChild);
            this._hiddenCallFramesMessageElement = element;
        }
        this._selectNextVisibleCallFrame(0);
        this.revealView();
    },

    /**
     * @param {?WebInspector.DebuggerPausedDetails} details
     */
    _updateStatusMessage: function(details)
    {
        var status = this.contentElement.createChild("div", "callstack-info");
        status.removeChildren();

        if (!details) {
            status.textContent = WebInspector.UIString("Not Paused");
            status.classList.toggle("status", false);
            return;
        }

        if (details.reason === WebInspector.DebuggerModel.BreakReason.DOM) {
            status.appendChild(WebInspector.domBreakpointsSidebarPane.createBreakpointHitStatusMessage(details));
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.EventListener) {
            var eventName = details.auxData["eventName"];
            var eventNameForUI = WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName, details.auxData);
            status.textContent = WebInspector.UIString("Paused on a \"%s\" Event Listener.", eventNameForUI);
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.XHR) {
            status.textContent = WebInspector.UIString("Paused on a XMLHttpRequest.");
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.Exception) {
            var description = details.auxData["description"] || "";
            status.textContent = WebInspector.UIString("Paused on exception: '%s'.", description.split("\n", 1)[0]);
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.PromiseRejection) {
            var description = details.auxData["description"] || "";
            status.textContent = WebInspector.UIString("Paused on promise rejection: '%s'.", description.split("\n", 1)[0]);
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.Assert) {
            status.textContent = WebInspector.UIString("Paused on assertion.");
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.DebugCommand) {
            status.textContent = WebInspector.UIString("Paused on a debugged function.");
        } else {
            if (details.callFrames.length) {
                var uiLocation = details && details.callFrames.length ? WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location()) : null;
                var breakpoint = uiLocation ? WebInspector.breakpointManager.findBreakpointOnLine(uiLocation.uiSourceCode, uiLocation.lineNumber) : null;
                if (breakpoint) {
                    status.textContent = WebInspector.UIString("Paused on a JavaScript breakpoint.");
                }
            } else {
                console.warn("ScriptsPanel paused, but callFrames.length is zero."); // TODO remove this once we understand this case better
            }
        }
        status.classList.toggle("hidden", !status.firstChild);
    },

    /**
     * @param {!Array.<!WebInspector.DebuggerModel.CallFrame>} callFrames
     * @return {!Array<!WebInspector.CallStackSidebarPane.CallFrame>}
     */
    _callFramesFromDebugger: function(callFrames)
    {
        var callFrameItems = [];
        for (var i = 0, n = callFrames.length; i < n; ++i) {
            var callFrame = callFrames[i];
            var callFrameItem = new WebInspector.CallStackSidebarPane.CallFrame(callFrame.functionName, callFrame.location(), this._linkifier, callFrame, this._locationPool);
            callFrameItem.element.addEventListener("click", this._callFrameSelected.bind(this, callFrameItem), false);
            callFrameItems.push(callFrameItem);
        }
        return callFrameItems;
    },

    /**
     * @param {!Array<!RuntimeAgent.CallFrame>} callFrames
     * @param {!WebInspector.UIList.Item} asyncCallFrameItem
     * @return {!Array<!WebInspector.CallStackSidebarPane.CallFrame>}
     */
    _callFramesFromRuntime: function(callFrames, asyncCallFrameItem)
    {
        var callFrameItems = [];
        for (var i = 0, n = callFrames.length; i < n; ++i) {
            var callFrame = callFrames[i];
            var location = new WebInspector.DebuggerModel.Location(this._debuggerModel, callFrame.scriptId, callFrame.lineNumber, callFrame.columnNumber);
            var callFrameItem = new WebInspector.CallStackSidebarPane.CallFrame(callFrame.functionName, location, this._linkifier, null, this._locationPool, asyncCallFrameItem);
            callFrameItem.element.addEventListener("click", this._asyncCallFrameClicked.bind(this, callFrameItem), false);
            callFrameItems.push(callFrameItem);
        }
        return callFrameItems;
    },

    /**
     * @param {!Array.<!WebInspector.CallStackSidebarPane.CallFrame>} callFrames
     * @param {!WebInspector.UIList.Item=} asyncCallFrameItem
     */
    _appendSidebarCallFrames: function(callFrames, asyncCallFrameItem)
    {
        if (asyncCallFrameItem)
            this.callFrameList.addItem(asyncCallFrameItem);

        var allCallFramesHidden = true;
        for (var i = 0, n = callFrames.length; i < n; ++i) {
            var callFrameItem = callFrames[i];
            callFrameItem.element.addEventListener("contextmenu", this._callFrameContextMenu.bind(this, callFrameItem), true);
            this.callFrames.push(callFrameItem);

            if (WebInspector.blackboxManager.isBlackboxedRawLocation(callFrameItem._location)) {
                callFrameItem.setHidden(true);
                callFrameItem.setDimmed(true);
                ++this._hiddenCallFrames;
            } else {
                this.callFrameList.addItem(callFrameItem);
                allCallFramesHidden = false;
            }
        }
        if (allCallFramesHidden && asyncCallFrameItem) {
            asyncCallFrameItem.setHidden(true);
            asyncCallFrameItem.element.remove();
        }
    },

    _revealHiddenCallFrames: function()
    {
        if (!this._hiddenCallFrames)
            return;
        this._hiddenCallFrames = 0;
        this.callFrameList.clear();
        for (var i = 0; i < this.callFrames.length; ++i) {
            var callFrame = this.callFrames[i];
            if (callFrame._asyncCallFrame) {
                callFrame._asyncCallFrame.setHidden(false);
                if (i && callFrame._asyncCallFrame !== this.callFrames[i - 1]._asyncCallFrame)
                    this.callFrameList.addItem(callFrame._asyncCallFrame);
            }
            callFrame.setHidden(false);
            this.callFrameList.addItem(callFrame);
        }
        if (this._hiddenCallFramesMessageElement) {
            this._hiddenCallFramesMessageElement.remove();
            delete this._hiddenCallFramesMessageElement;
        }
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.CallFrame} callFrame
     * @param {!Event} event
     */
    _callFrameContextMenu: function(callFrame, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        var debuggerCallFrame = callFrame._debuggerCallFrame;
        if (debuggerCallFrame)
            contextMenu.appendItem(WebInspector.UIString.capitalize("Restart ^frame"), debuggerCallFrame.restart.bind(debuggerCallFrame));

        contextMenu.appendItem(WebInspector.UIString.capitalize("Copy ^stack ^trace"), this._copyStackTrace.bind(this));

        var uiLocation = WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame._location);
        this.appendBlackboxURLContextMenuItems(contextMenu, uiLocation.uiSourceCode);

        contextMenu.show();
    },

    /**
     * @param {number} index
     * @param {!Event} event
     */
    _asyncCallFrameContextMenu: function(index, event)
    {
        for (; index < this.callFrames.length; ++index) {
            var callFrame = this.callFrames[index];
            if (!callFrame.isHidden()) {
                this._callFrameContextMenu(callFrame, event);
                break;
            }
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    appendBlackboxURLContextMenuItems: function(contextMenu, uiSourceCode)
    {
        var binding = WebInspector.persistence.binding(uiSourceCode);
        if (binding)
            uiSourceCode = binding.network;
        if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem)
            return;
        var canBlackbox = WebInspector.blackboxManager.canBlackboxUISourceCode(uiSourceCode);
        var isBlackboxed = WebInspector.blackboxManager.isBlackboxedUISourceCode(uiSourceCode);
        var isContentScript = uiSourceCode.project().type() === WebInspector.projectTypes.ContentScripts;

        var manager = WebInspector.blackboxManager;
        if (canBlackbox) {
            if (isBlackboxed)
                contextMenu.appendItem(WebInspector.UIString.capitalize("Stop ^blackboxing"), manager.unblackboxUISourceCode.bind(manager, uiSourceCode));
            else
                contextMenu.appendItem(WebInspector.UIString.capitalize("Blackbox ^script"), manager.blackboxUISourceCode.bind(manager, uiSourceCode));
        }
        if (isContentScript) {
            if (isBlackboxed)
                contextMenu.appendItem(WebInspector.UIString.capitalize("Stop blackboxing ^all ^content ^scripts"), manager.blackboxContentScripts.bind(manager));
            else
                contextMenu.appendItem(WebInspector.UIString.capitalize("Blackbox ^all ^content ^scripts"), manager.unblackboxContentScripts.bind(manager));
        }
    },

    _asyncStackTracesStateChanged: function()
    {
        var enabled = WebInspector.moduleSetting("enableAsyncStackTraces").get();
        if (!enabled && this.callFrames)
            this._removeAsyncCallFrames();
    },

    _removeAsyncCallFrames: function()
    {
        var shouldSelectTopFrame = false;
        var lastSyncCallFrameIndex = -1;
        for (var i = 0; i < this.callFrames.length; ++i) {
            var callFrame = this.callFrames[i];
            if (callFrame._asyncCallFrame) {
                if (callFrame.isSelected())
                    shouldSelectTopFrame = true;
                callFrame._asyncCallFrame.element.remove();
                callFrame.element.remove();
            } else {
                lastSyncCallFrameIndex = i;
            }
        }
        this.callFrames.length = lastSyncCallFrameIndex + 1;
        if (shouldSelectTopFrame)
            this._selectNextVisibleCallFrame(0);
    },

    /**
     * @return {boolean}
     */
    _selectNextCallFrameOnStack: function()
    {
        var index = this._selectedCallFrameIndex();
        if (index === -1)
            return false;
        return this._selectNextVisibleCallFrame(index + 1);
    },

    /**
     * @return {boolean}
     */
    _selectPreviousCallFrameOnStack: function()
    {
        var index = this._selectedCallFrameIndex();
        if (index === -1)
            return false;
        return this._selectNextVisibleCallFrame(index - 1, true);
    },

    /**
     * @param {number} index
     * @param {boolean=} backward
     * @return {boolean}
     */
    _selectNextVisibleCallFrame: function(index, backward)
    {
        while (0 <= index && index < this.callFrames.length) {
            var callFrame = this.callFrames[index];
            if (!callFrame.isHidden() && !callFrame.isLabel() && !callFrame._asyncCallFrame) {
                this._callFrameSelected(callFrame);
                return true;
            }
            index += backward ? -1 : 1;
        }
        return false;
    },

    /**
     * @return {number}
     */
    _selectedCallFrameIndex: function()
    {
        if (!this._debuggerModel)
            return -1;
        var selectedCallFrame = this._debuggerModel.selectedCallFrame();
        if (!selectedCallFrame)
            return -1;
        for (var i = 0; i < this.callFrames.length; ++i) {
            if (this.callFrames[i]._debuggerCallFrame === selectedCallFrame)
                return i;
        }
        return -1;
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.CallFrame} callFrameItem
     */
    _asyncCallFrameClicked: function(callFrameItem)
    {
        var uiLocation = WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(callFrameItem._location);
        WebInspector.Revealer.reveal(uiLocation);
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.CallFrame} selectedCallFrame
     */
    _callFrameSelected: function(selectedCallFrame)
    {
        selectedCallFrame.element.scrollIntoViewIfNeeded();
        var callFrame = selectedCallFrame._debuggerCallFrame;

        for (var i = 0; i < this.callFrames.length; ++i) {
            var callFrameItem = this.callFrames[i];
            callFrameItem.setSelected(callFrameItem === selectedCallFrame);
            if (callFrameItem.isSelected() && callFrameItem.isHidden())
                this._revealHiddenCallFrames();
        }

        WebInspector.context.setFlavor(WebInspector.DebuggerModel.CallFrame, callFrame);
        callFrame.debuggerModel.setSelectedCallFrame(callFrame);
    },

    _copyStackTrace: function()
    {
        var text = "";
        var lastCallFrame = null;
        for (var i = 0; i < this.callFrames.length; ++i) {
            var callFrame = this.callFrames[i];
            if (callFrame.isHidden())
                continue;
            if (lastCallFrame && callFrame._asyncCallFrame !== lastCallFrame._asyncCallFrame)
                text += callFrame._asyncCallFrame.title() + "\n";
            text += callFrame.title() + " (" + callFrame.subtitle() + ")\n";
            lastCallFrame = callFrame;
        }
        InspectorFrontendHost.copyText(text);
    },

    /**
     * @param {function(!Array.<!WebInspector.KeyboardShortcut.Descriptor>, function(!Event=):boolean)} registerShortcutDelegate
     */
    registerShortcuts: function(registerShortcutDelegate)
    {
        registerShortcutDelegate(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame, this._selectNextCallFrameOnStack.bind(this));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame, this._selectPreviousCallFrameOnStack.bind(this));
    },

    _keyDown: function(event)
    {
        if (event.altKey || event.shiftKey || event.metaKey || event.ctrlKey)
            return;
        if (event.key === "ArrowUp" && this._selectPreviousCallFrameOnStack() || event.key === "ArrowDown" && this._selectNextCallFrameOnStack())
            event.consume(true);
    },

    __proto__: WebInspector.SimpleView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.UIList.Item}
 * @param {string} functionName
 * @param {!WebInspector.DebuggerModel.Location} location
 * @param {!WebInspector.Linkifier} linkifier
 * @param {?WebInspector.DebuggerModel.CallFrame} debuggerCallFrame
 * @param {!WebInspector.LiveLocationPool} locationPool
 * @param {!WebInspector.UIList.Item=} asyncCallFrame
 */
WebInspector.CallStackSidebarPane.CallFrame = function(functionName, location, linkifier, debuggerCallFrame, locationPool, asyncCallFrame)
{
    WebInspector.UIList.Item.call(this, WebInspector.beautifyFunctionName(functionName), "");
    this._location = location;
    this._debuggerCallFrame = debuggerCallFrame;
    this._asyncCallFrame = asyncCallFrame;

    if (asyncCallFrame) {
        var script = location.script();
        var locationElement = linkifier.linkifyRawLocation(location, script ? script.sourceURL : "");
        this.subtitleElement.appendChild(locationElement);
    } else {
        this._liveLocationPool = new WebInspector.LiveLocationPool();
        WebInspector.debuggerWorkspaceBinding.createCallFrameLiveLocation(location, this._update.bind(this), locationPool);
    }
}

WebInspector.CallStackSidebarPane.CallFrame.prototype = {
    /**
     * @param {!WebInspector.LiveLocation} liveLocation
     */
    _update: function(liveLocation)
    {
        var uiLocation = liveLocation.uiLocation();
        if (!uiLocation)
            return;
        var text = uiLocation.linkText();
        this.setSubtitle(text.trimMiddle(30));
        this.subtitleElement.title = text;
    },

    __proto__: WebInspector.UIList.Item.prototype
}
