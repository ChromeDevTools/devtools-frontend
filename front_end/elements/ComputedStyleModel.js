// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @extends {WebInspector.Object}
 * @constructor
 */
WebInspector.ComputedStyleModel = function()
{
    WebInspector.Object.call(this);
    this._node = WebInspector.context.flavor(WebInspector.DOMNode);
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this._onNodeChanged, this);
}

WebInspector.ComputedStyleModel.Events = {
    ComputedStyleChanged: "ComputedStyleChanged"
}

WebInspector.ComputedStyleModel.prototype = {
    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._node;
    },

    /**
     * @return {?WebInspector.CSSModel}
     */
    cssModel: function()
    {
        return this._cssModel;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onNodeChanged: function(event)
    {
        this._node = /** @type {?WebInspector.DOMNode} */(event.data);
        this._updateTarget(this._node ? this._node.target() : null);
        this._onComputedStyleChanged();
    },

    /**
     * @param {?WebInspector.Target} target
     */
    _updateTarget: function(target)
    {
        if (this._target === target)
            return;
        if (this._targetEvents) {
            WebInspector.EventTarget.removeEventListeners(this._targetEvents);
            this._targetEvents = null;
        }
        this._target = target;
        var domModel = null;
        if (target) {
            this._cssModel = WebInspector.CSSModel.fromTarget(target);
            domModel = WebInspector.DOMModel.fromTarget(target);
        }

        if (domModel && this._cssModel) {
            this._targetEvents = [
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetAdded,  this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved,  this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetChanged,  this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.MediaQueryResultChanged,  this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.PseudoStateForced,  this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.ModelWasEnabled,  this._onComputedStyleChanged, this),
                domModel.addEventListener(WebInspector.DOMModel.Events.DOMMutated, this._onComputedStyleChanged, this)
            ];
        }
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    _elementNode: function()
    {
        return this.node() ? this.node().enclosingElementOrSelf() : null;
    },

    /**
     * @return {!Promise.<?WebInspector.ComputedStyleModel.ComputedStyle>}
     */
    fetchComputedStyle: function()
    {
        var elementNode = this._elementNode();
        var cssModel = this.cssModel();
        if (!elementNode || !cssModel)
            return Promise.resolve(/** @type {?WebInspector.ComputedStyleModel.ComputedStyle} */(null));

        if (!this._computedStylePromise)
            this._computedStylePromise = cssModel.computedStylePromise(elementNode.id).then(verifyOutdated.bind(this, elementNode));

        return this._computedStylePromise;

        /**
         * @param {!WebInspector.DOMNode} elementNode
         * @param {?Map.<string, string>} style
         * @return {?WebInspector.ComputedStyleModel.ComputedStyle}
         * @this {WebInspector.ComputedStyleModel}
         */
        function verifyOutdated(elementNode, style)
        {
            return elementNode === this._elementNode() && style ? new WebInspector.ComputedStyleModel.ComputedStyle(elementNode, style) : /** @type {?WebInspector.ComputedStyleModel.ComputedStyle} */(null);
        }
    },

    _onComputedStyleChanged: function()
    {
        delete this._computedStylePromise;
        this.dispatchEventToListeners(WebInspector.ComputedStyleModel.Events.ComputedStyleChanged);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {!WebInspector.DOMNode} node
 * @param {!Map.<string, string>} computedStyle
 */
WebInspector.ComputedStyleModel.ComputedStyle = function(node, computedStyle)
{
    this.node = node;
    this.computedStyle = computedStyle;
}
