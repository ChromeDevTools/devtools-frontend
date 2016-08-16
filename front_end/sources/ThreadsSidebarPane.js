// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.ThreadsSidebarPane = function()
{
    WebInspector.VBox.call(this);

    /** @type {!Map.<!WebInspector.DebuggerModel, !WebInspector.UIList.Item>} */
    this._debuggerModelToListItems = new Map();
    /** @type {!Map.<!WebInspector.UIList.Item, !WebInspector.Target>} */
    this._listItemsToTargets = new Map();
    /** @type {?WebInspector.UIList.Item} */
    this._selectedListItem = null;
    this.threadList = new WebInspector.UIList();
    this.threadList.show(this.element);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._onDebuggerStateChanged, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._onDebuggerStateChanged, this);
    WebInspector.targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextChanged, this._onExecutionContextChanged, this);
    WebInspector.context.addFlavorChangeListener(WebInspector.Target, this._targetChanged, this);
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.ThreadsSidebarPane.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target)
        if (!debuggerModel)
            return;

        var executionContext = target.runtimeModel.defaultExecutionContext();
        var label = executionContext && executionContext.label() ? executionContext.label() : target.name();
        var listItem = new WebInspector.UIList.Item(label, "");
        listItem.element.addEventListener("click", this._onListItemClick.bind(this, listItem), false);
        var currentTarget = WebInspector.context.flavor(WebInspector.Target);
        if (currentTarget === target)
            this._selectListItem(listItem);

        this._debuggerModelToListItems.set(debuggerModel, listItem);
        this._listItemsToTargets.set(listItem, target);
        this.threadList.addItem(listItem);
        this._updateDebuggerState(debuggerModel);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target)
        if (!debuggerModel)
            return;
        var listItem = this._debuggerModelToListItems.remove(debuggerModel);
        if (listItem) {
            this._listItemsToTargets.remove(listItem);
            this.threadList.removeItem(listItem);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _targetChanged: function(event)
    {
        var newTarget = /** @type {!WebInspector.Target} */(event.data);
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(newTarget)
        if (!debuggerModel)
            return;
        var listItem =  /** @type {!WebInspector.UIList.Item} */ (this._debuggerModelToListItems.get(debuggerModel));
        this._selectListItem(listItem);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onDebuggerStateChanged: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._updateDebuggerState(debuggerModel);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextChanged: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
        if (!executionContext.isDefault)
            return;
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (WebInspector.DebuggerModel.fromTarget(executionContext.target()));
        var listItem = this._debuggerModelToListItems.get(debuggerModel);
        if (listItem && executionContext.label())
            listItem.setTitle(executionContext.label());
    },

    /**
     * @param {!WebInspector.DebuggerModel} debuggerModel
     */
    _updateDebuggerState: function(debuggerModel)
    {
        var listItem = this._debuggerModelToListItems.get(debuggerModel);
        listItem.setSubtitle(WebInspector.UIString(debuggerModel.isPaused() ? "paused" : ""));
    },

    /**
     * @param {!WebInspector.UIList.Item} listItem
     */
    _selectListItem: function(listItem)
    {
        if (listItem === this._selectedListItem)
            return;

        if (this._selectedListItem)
            this._selectedListItem.setSelected(false);

        this._selectedListItem = listItem;
        listItem.setSelected(true);
    },

    /**
     * @param {!WebInspector.UIList.Item} listItem
     */
    _onListItemClick: function(listItem)
    {
        WebInspector.context.setFlavor(WebInspector.Target, this._listItemsToTargets.get(listItem));
        listItem.element.scrollIntoViewIfNeeded();
    },


    __proto__: WebInspector.VBox.prototype
}
