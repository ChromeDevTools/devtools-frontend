// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.TargetManager} targetManager
 * @param {!WebInspector.Context} context
 */
WebInspector.ExecutionContextSelector = function(targetManager, context)
{
    targetManager.observeTargets(this, WebInspector.Target.Capability.JS);
    context.addFlavorChangeListener(WebInspector.ExecutionContext, this._executionContextChanged, this);
    context.addFlavorChangeListener(WebInspector.Target, this._targetChanged, this);

    targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
    targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, this._onExecutionContextDestroyed, this);
    targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextOrderChanged, this._onExecutionContextOrderChanged, this);
    this._targetManager = targetManager;
    this._context = context;
}

WebInspector.ExecutionContextSelector.prototype = {

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        // Defer selecting default target since we need all clients to get their
        // targetAdded notifications first.
        setImmediate(deferred.bind(this));

        /**
         * @this {WebInspector.ExecutionContextSelector}
         */
        function deferred()
        {
            // We always want the second context for the service worker targets.
            if (!this._context.flavor(WebInspector.Target))
                this._context.setFlavor(WebInspector.Target, target);
        }
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var currentExecutionContext = this._context.flavor(WebInspector.ExecutionContext);
        if (currentExecutionContext && currentExecutionContext.target() === target)
            this._currentExecutionContextGone();

        var targets = this._targetManager.targets(WebInspector.Target.Capability.JS);
        if (this._context.flavor(WebInspector.Target) === target && targets.length)
            this._context.setFlavor(WebInspector.Target, targets[0]);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _executionContextChanged: function(event)
    {
        var newContext = /** @type {?WebInspector.ExecutionContext} */ (event.data);
        if (newContext) {
            this._context.setFlavor(WebInspector.Target, newContext.target());
            if (!this._ignoreContextChanged)
                this._lastSelectedContextId = this._contextPersistentId(newContext);
        }
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {string}
     */
    _contextPersistentId: function(executionContext)
    {
        return executionContext.isDefault ? executionContext.target().name() + ":" + executionContext.frameId : "";
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _targetChanged: function(event)
    {
        var newTarget = /** @type {?WebInspector.Target} */(event.data);
        var currentContext = this._context.flavor(WebInspector.ExecutionContext);

        if (!newTarget || (currentContext && currentContext.target() === newTarget))
            return;

        var executionContexts = newTarget.runtimeModel.executionContexts();
        if (!executionContexts.length)
            return;

        var newContext = null;
        for (var i = 0; i < executionContexts.length && !newContext; ++i) {
            if (this._shouldSwitchToContext(executionContexts[i]))
                newContext = executionContexts[i];
        }
        for (var i = 0; i < executionContexts.length && !newContext; ++i) {
            if (this._isDefaultContext(executionContexts[i]))
                newContext = executionContexts[i];
        }
        this._ignoreContextChanged = true;
        this._context.setFlavor(WebInspector.ExecutionContext, newContext || executionContexts[0]);
        this._ignoreContextChanged = false;
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {boolean}
     */
    _shouldSwitchToContext: function(executionContext)
    {
        if (this._lastSelectedContextId && this._lastSelectedContextId === this._contextPersistentId(executionContext))
            return true;
        if (!this._lastSelectedContextId && this._isDefaultContext(executionContext))
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {boolean}
     */
    _isDefaultContext: function(executionContext)
    {
        if (!executionContext.isDefault || !executionContext.frameId)
            return false;
        if (executionContext.target().parentTarget())
            return false;
        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(executionContext.target());
        var frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
        if (frame && frame.isMainFrame())
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextCreated: function(event)
    {
        this._switchContextIfNecessary(/** @type {!WebInspector.ExecutionContext} */ (event.data));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextDestroyed: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext}*/ (event.data);
        if (this._context.flavor(WebInspector.ExecutionContext) === executionContext)
            this._currentExecutionContextGone();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextOrderChanged: function(event)
    {
        var runtimeModel = /** @type {!WebInspector.RuntimeModel} */ (event.data);
        var executionContexts = runtimeModel.executionContexts();
        for (var i = 0; i < executionContexts.length; i++) {
            if (this._switchContextIfNecessary(executionContexts[i]))
                break;
        }
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {boolean}
     */
    _switchContextIfNecessary: function(executionContext)
    {
        if (!this._context.flavor(WebInspector.ExecutionContext) || this._shouldSwitchToContext(executionContext)) {
            this._ignoreContextChanged = true;
            this._context.setFlavor(WebInspector.ExecutionContext, executionContext);
            this._ignoreContextChanged = false;
            return true;
        }
        return false;
    },

    _currentExecutionContextGone: function()
    {
        var targets = this._targetManager.targets(WebInspector.Target.Capability.JS);
        var newContext = null;
        for (var i = 0; i < targets.length && !newContext; ++i) {
            var executionContexts = targets[i].runtimeModel.executionContexts();
            for (var executionContext of executionContexts) {
                if (this._isDefaultContext(executionContext)) {
                    newContext = executionContext;
                    break;
                }
            }
        }
        if (!newContext) {
            for (var i = 0; i < targets.length && !newContext; ++i) {
                var executionContexts = targets[i].runtimeModel.executionContexts();
                if (executionContexts.length) {
                    newContext = executionContexts[0];
                    break;
                }
            }
        }
        this._ignoreContextChanged = true;
        this._context.setFlavor(WebInspector.ExecutionContext, newContext);
        this._ignoreContextChanged = false;
    }
}

/**
 * @param {!Element} proxyElement
 * @param {!Range} wordRange
 * @param {boolean} force
 * @param {function(!Array.<string>, number=)} completionsReadyCallback
 */
WebInspector.ExecutionContextSelector.completionsForTextPromptInCurrentContext = function(proxyElement, wordRange, force, completionsReadyCallback)
{
    var expressionRange = wordRange.cloneRange();
    expressionRange.collapse(true);
    expressionRange.setStartBefore(proxyElement);
    WebInspector.ExecutionContextSelector.completionsForTextInCurrentContext(expressionRange.toString(), wordRange.toString(), force, completionsReadyCallback);
}
/**
 * @param {string} text
 * @param {string} completionsPrefix
 * @param {boolean} force
 * @param {function(!Array.<string>, number=)} completionsReadyCallback
 */
WebInspector.ExecutionContextSelector.completionsForTextInCurrentContext = function(text, completionsPrefix, force, completionsReadyCallback)
{
    var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
    if (!executionContext) {
        completionsReadyCallback([]);
        return;
    }
    var index;
    var stopChars = new Set(" =:({;,!+-*/&|^<>`".split(""));
    for (index = text.length - 1; index >= 0; index--) {
        // Pass less stop characters to rangeOfWord so the range will be a more complete expression.
        if (stopChars.has(text.charAt(index)))
            break;
    }
    var clippedExpression = text.substring(index + 1);
    var bracketCount = 0;

    index = clippedExpression.length - 1;
    while (index >= 0) {
        var character = clippedExpression.charAt(index);
        if (character === "]")
            bracketCount++;
        // Allow an open bracket at the end for property completion.
        if (character === "[" && index < clippedExpression.length - 1) {
            bracketCount--;
            if (bracketCount < 0)
                break;
        }
        index--;
    }
    clippedExpression = clippedExpression.substring(index + 1);

    executionContext.completionsForExpression(clippedExpression, completionsPrefix, force, completionsReadyCallback);
}
