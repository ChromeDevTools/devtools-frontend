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
    targetManager.observeTargets(this);
    context.addFlavorChangeListener(WebInspector.ExecutionContext, this._executionContextChanged, this);
    context.addFlavorChangeListener(WebInspector.Target, this._targetChanged, this);

    targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
    targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, this._onExecutionContextDestroyed, this);
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
        if (!target.hasJSContext())
            return;
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
        if (!target.hasJSContext())
            return;
        var currentExecutionContext = this._context.flavor(WebInspector.ExecutionContext);
        if (currentExecutionContext && currentExecutionContext.target() === target)
            this._currentExecutionContextGone();

        var targets = this._targetManager.targetsWithJSContext();
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
            if (this._isMainFrameContext(executionContexts[i]))
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
        if (!this._lastSelectedContextId && this._isMainFrameContext(executionContext))
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {boolean}
     */
    _isMainFrameContext: function(executionContext)
    {
        if (!executionContext.isDefault)
            return false;
        var frame = executionContext.target().resourceTreeModel.frameForId(executionContext.frameId);
        if (frame && frame.isMainFrame())
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextCreated: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
        if (!this._context.flavor(WebInspector.ExecutionContext) || this._shouldSwitchToContext(executionContext)) {
            this._ignoreContextChanged = true;
            this._context.setFlavor(WebInspector.ExecutionContext, executionContext);
            this._ignoreContextChanged = false;
        }
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

    _currentExecutionContextGone: function()
    {
        var targets = this._targetManager.targetsWithJSContext();
        var newContext = null;
        for (var i = 0; i < targets.length && !newContext; ++i) {
            if (targets[i].isServiceWorker())
                continue;
            var executionContexts = targets[i].runtimeModel.executionContexts();
            for (var executionContext of executionContexts) {
                if (this._isMainFrameContext(executionContext)) {
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
 * @param {string} text
 * @param {number} cursorOffset
 * @param {!Range} wordRange
 * @param {boolean} force
 * @param {function(!Array.<string>, number=)} completionsReadyCallback
 */
WebInspector.ExecutionContextSelector.completionsForTextPromptInCurrentContext = function(proxyElement, text, cursorOffset, wordRange, force, completionsReadyCallback)
{
    var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
    if (!executionContext) {
        completionsReadyCallback([]);
        return;
    }

    // Pass less stop characters to rangeOfWord so the range will be a more complete expression.
    var expressionRange = wordRange.startContainer.rangeOfWord(wordRange.startOffset, " =:({;,!+-*/&|^<>", proxyElement, "backward");
    var expressionString = expressionRange.toString();

    // The "[" is also a stop character, except when it's the last character of the expression.
    var pos = expressionString.lastIndexOf("[", expressionString.length - 2);
    if (pos !== -1)
        expressionString = expressionString.substr(pos + 1);

    var prefix = wordRange.toString();
    executionContext.completionsForExpression(expressionString, text, cursorOffset, prefix, force, completionsReadyCallback);
}
