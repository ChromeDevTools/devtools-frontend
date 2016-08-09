// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.ElementsSidebarPane = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("flex-none");
    this._computedStyleModel = new WebInspector.ComputedStyleModel();
    this._computedStyleModel.addEventListener(WebInspector.ComputedStyleModel.Events.ComputedStyleChanged, this.onCSSModelChanged, this);

    this._updateThrottler = new WebInspector.Throttler(100);
    this._updateWhenVisible = false;
}

WebInspector.ElementsSidebarPane.prototype = {
    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._computedStyleModel.node();
    },

    /**
     * @return {?WebInspector.CSSModel}
     */
    cssModel: function()
    {
        return this._computedStyleModel.cssModel();
    },

    /**
     * @protected
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        return Promise.resolve();
    },

    update: function()
    {
        this._updateWhenVisible = !this.isShowing();
        if (this._updateWhenVisible)
            return;
        this._updateThrottler.schedule(innerUpdate.bind(this));

        /**
         * @return {!Promise.<?>}
         * @this {WebInspector.ElementsSidebarPane}
         */
        function innerUpdate()
        {
            return this.isShowing() ? this.doUpdate() : Promise.resolve();
        }
    },

    wasShown: function()
    {
        WebInspector.VBox.prototype.wasShown.call(this);
        if (this._updateWhenVisible)
            this.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    onCSSModelChanged: function(event) { },

    __proto__: WebInspector.VBox.prototype
}
