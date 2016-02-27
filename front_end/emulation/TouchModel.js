// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.MultitargetTouchModel = function()
{
    this._touchEnabled = false;
    this._touchMobile = false;
    this._customTouchEnabled = false;

    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

WebInspector.MultitargetTouchModel._symbol = Symbol("MultitargetTouchModel.symbol");

WebInspector.MultitargetTouchModel.prototype = {
    /**
     * @param {boolean} enabled
     * @param {boolean} mobile
     */
    setTouchEnabled: function(enabled, mobile)
    {
        this._touchEnabled = enabled;
        this._touchMobile = mobile;
        this._updateAllTargets();
    },

    /**
     * @param {boolean} enabled
     */
    setCustomTouchEnabled: function(enabled)
    {
        this._customTouchEnabled = enabled;
        this._updateAllTargets();
    },

    _updateAllTargets: function()
    {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
            this._applyToTarget(target);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _applyToTarget: function(target)
    {
        var current = {enabled: this._touchEnabled, configuration : this._touchMobile ? "mobile" : "desktop"};
        if (this._customTouchEnabled)
            current = {enabled: true, configuration: "mobile"};

        var domModel = WebInspector.DOMModel.fromTarget(target);
        var inspectModeEnabled = domModel ? domModel.inspectModeEnabled() : false;
        if (inspectModeEnabled)
            current = {enabled: false, configuration: "mobile"};

        /**
         * @suppressGlobalPropertiesCheck
         */
        const injectedFunction = function() {
            const touchEvents = ["ontouchstart", "ontouchend", "ontouchmove", "ontouchcancel"];
            var recepients = [window.__proto__, document.__proto__];
            for (var i = 0; i < touchEvents.length; ++i) {
                for (var j = 0; j < recepients.length; ++j) {
                    if (!(touchEvents[i] in recepients[j]))
                        Object.defineProperty(recepients[j], touchEvents[i], { value: null, writable: true, configurable: true, enumerable: true });
                }
            }
        };

        var symbol = WebInspector.MultitargetTouchModel._symbol;
        var previous = target[symbol] || {enabled: false, configuration: "mobile", scriptId: ""};

        if (previous.enabled === current.enabled && (!current.enabled || previous.configuration === current.configuration))
            return;

        if (previous.scriptId) {
            target.pageAgent().removeScriptToEvaluateOnLoad(previous.scriptId);
            target[symbol].scriptId = "";
        }

        target[symbol] = current;
        target[symbol].scriptId = "";

        if (current.enabled)
            target.pageAgent().addScriptToEvaluateOnLoad("(" + injectedFunction.toString() + ")()", scriptAddedCallback);

        /**
         * @param {?Protocol.Error} error
         * @param {string} scriptId
         */
        function scriptAddedCallback(error, scriptId)
        {
            (target[symbol] || {}).scriptId = error ? "" : scriptId;
        }

        target.emulationAgent().setTouchEmulationEnabled(current.enabled, current.configuration);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _inspectModeToggled: function(event)
    {
        var domModel = /** @type {!WebInspector.DOMModel} */ (event.target);
        this._applyToTarget(domModel.target());
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var domModel = WebInspector.DOMModel.fromTarget(target);
        if (domModel)
            domModel.addEventListener(WebInspector.DOMModel.Events.InspectModeWillBeToggled, this._inspectModeToggled, this);
        this._applyToTarget(target);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var domModel = WebInspector.DOMModel.fromTarget(target);
        if (domModel)
            domModel.removeEventListener(WebInspector.DOMModel.Events.InspectModeWillBeToggled, this._inspectModeToggled, this);
    }
}


/** @type {?WebInspector.MultitargetTouchModel} */
WebInspector.MultitargetTouchModel._instance = null;

/**
 * @return {!WebInspector.MultitargetTouchModel}
 */
WebInspector.MultitargetTouchModel.instance = function()
{
    if (!WebInspector.MultitargetTouchModel._instance)
        WebInspector.MultitargetTouchModel._instance = new WebInspector.MultitargetTouchModel();
    return /** @type {!WebInspector.MultitargetTouchModel} */ (WebInspector.MultitargetTouchModel._instance);
}
