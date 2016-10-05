// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!Element} selectElement
 */
WebInspector.ConsoleContextSelector = function(selectElement)
{
    this._selectElement = selectElement;
    /**
     * @type {!Map.<!WebInspector.ExecutionContext, !Element>}
     */
    this._optionByExecutionContext = new Map();

    WebInspector.targetManager.observeTargets(this);
    WebInspector.targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
    WebInspector.targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextChanged, this._onExecutionContextChanged, this);
    WebInspector.targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, this._onExecutionContextDestroyed, this);

    this._selectElement.addEventListener("change", this._executionContextChanged.bind(this), false);
    WebInspector.context.addFlavorChangeListener(WebInspector.ExecutionContext, this._executionContextChangedExternally, this);
};

WebInspector.ConsoleContextSelector.prototype = {
    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {string}
     */
    _titleFor: function(executionContext)
    {
        var result;
        if (executionContext.isDefault) {
            if (executionContext.frameId) {
                var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(executionContext.target());
                var frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
                result =  frame ? frame.displayName() : executionContext.label();
            } else {
                result = executionContext.target().decorateLabel(executionContext.label());
            }
        } else {
            result = "\u00a0\u00a0\u00a0\u00a0" + (executionContext.label() || executionContext.origin);
        }

        var maxLength = 50;
        return result.trimMiddle(maxLength);
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     */
    _executionContextCreated: function(executionContext)
    {
        // FIXME(413886): We never want to show execution context for the main thread of shadow page in service/shared worker frontend.
        // This check could be removed once we do not send this context to frontend.
        if (!executionContext.target().hasJSCapability())
            return;

        var newOption = createElement("option");
        newOption.__executionContext = executionContext;
        newOption.text = this._titleFor(executionContext);
        this._optionByExecutionContext.set(executionContext, newOption);
        var options = this._selectElement.options;
        var contexts = Array.prototype.map.call(options, mapping);
        var index = contexts.lowerBound(executionContext, executionContext.runtimeModel.executionContextComparator());
        this._selectElement.insertBefore(newOption, options[index]);

        if (executionContext === WebInspector.context.flavor(WebInspector.ExecutionContext))
            this._select(newOption);

        /**
         * @param {!Element} option
         * @return {!WebInspector.ExecutionContext}
         */
        function mapping(option)
        {
            return option.__executionContext;
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextCreated: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
        this._executionContextCreated(executionContext);
        this._updateSelectionWarning();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextChanged: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
        var option = this._optionByExecutionContext.get(executionContext);
        if (option)
            option.text = this._titleFor(executionContext);
        this._updateSelectionWarning();
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     */
    _executionContextDestroyed: function(executionContext)
    {
        var option = this._optionByExecutionContext.remove(executionContext);
        option.remove();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextDestroyed: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
        this._executionContextDestroyed(executionContext);
        this._updateSelectionWarning();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _executionContextChangedExternally: function(event)
    {
        var executionContext =  /** @type {?WebInspector.ExecutionContext} */ (event.data);
        if (!executionContext)
            return;

        var options = this._selectElement.options;
        for (var i = 0; i < options.length; ++i) {
            if (options[i].__executionContext === executionContext)
                this._select(options[i]);
        }
    },

    _executionContextChanged: function()
    {
        var option = this._selectedOption();
        var newContext = option ? option.__executionContext : null;
        WebInspector.context.setFlavor(WebInspector.ExecutionContext, newContext);
        this._updateSelectionWarning();
    },

    _updateSelectionWarning: function()
    {
        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        this._selectElement.parentElement.classList.toggle("warning", !this._isTopContext(executionContext) && this._hasTopContext());
    },

    /**
     * @param {?WebInspector.ExecutionContext} executionContext
     * @return {boolean}
     */
    _isTopContext: function(executionContext)
    {
        if (!executionContext || !executionContext.isDefault)
            return false;
        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(executionContext.target());
        var frame = executionContext.frameId && resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
        if (!frame)
            return false;
        return frame.isMainFrame();
    },

    /**
     * @return {boolean}
     */
    _hasTopContext: function()
    {
        var options = this._selectElement.options;
        for (var i = 0; i < options.length; i++){
            if (this._isTopContext(options[i].__executionContext))
                return true;
        }
        return false;
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        target.runtimeModel.executionContexts().forEach(this._executionContextCreated, this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var executionContexts = this._optionByExecutionContext.keysArray();
        for (var i = 0; i < executionContexts.length; ++i) {
            if (executionContexts[i].target() === target)
                this._executionContextDestroyed(executionContexts[i]);
        }
    },

    /**
     * @param {!Element} option
     */
    _select: function(option)
    {
        this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
        this._updateSelectionWarning();
    },

    /**
     * @return {?Element}
     */
    _selectedOption: function()
    {
        if (this._selectElement.selectedIndex >= 0)
            return this._selectElement[this._selectElement.selectedIndex];
        return null;
    }
};
