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

/** @enum {symbol} */
WebInspector.ComputedStyleModel.Events = {
    ComputedStyleChanged: Symbol("ComputedStyleChanged")
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
        return this._cssModel && this._cssModel.isEnabled() ? this._cssModel : null;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onNodeChanged: function(event)
    {
        this._node = /** @type {?WebInspector.DOMNode} */(event.data);
        this._updateTarget(this._node ? this._node.target() : null);
        this._onComputedStyleChanged(null);
    },

    /**
     * @param {?WebInspector.Target} target
     */
    _updateTarget: function(target)
    {
        if (this._target === target)
            return;
        if (this._targetEvents)
            WebInspector.EventTarget.removeEventListeners(this._targetEvents);
        this._target = target;

        var domModel = null;
        var resourceTreeModel = null;
        if (target) {
            this._cssModel = WebInspector.CSSModel.fromTarget(target);
            domModel = WebInspector.DOMModel.fromTarget(target);
            resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
        }

        if (this._cssModel && domModel && resourceTreeModel) {
            this._targetEvents = [
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetChanged, this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.FontsUpdated, this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.MediaQueryResultChanged, this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.PseudoStateForced, this._onComputedStyleChanged, this),
                this._cssModel.addEventListener(WebInspector.CSSModel.Events.ModelWasEnabled, this._onComputedStyleChanged, this),
                domModel.addEventListener(WebInspector.DOMModel.Events.DOMMutated, this._onDOMModelChanged, this),
                resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.Events.FrameResized, this._onFrameResized, this),
            ];
        }
    },

     /**
     * @param {?WebInspector.Event} event
     */
    _onComputedStyleChanged: function(event)
    {
        delete this._computedStylePromise;
        this.dispatchEventToListeners(WebInspector.ComputedStyleModel.Events.ComputedStyleChanged, event ? event.data : null);
    },

     /**
     * @param {!WebInspector.Event} event
     */
    _onDOMModelChanged: function(event)
    {
        // Any attribute removal or modification can affect the styles of "related" nodes.
        var node = /** @type {!WebInspector.DOMNode} */ (event.data);
        if (!this._node || this._node !== node && node.parentNode !== this._node.parentNode && !node.isAncestor(this._node))
            return;
        this._onComputedStyleChanged(null);
    },

   /**
     * @param {!WebInspector.Event} event
     */
    _onFrameResized: function(event)
    {
        /**
         * @this {WebInspector.ComputedStyleModel}
         */
        function refreshContents()
        {
            this._onComputedStyleChanged(null);
            delete this._frameResizedTimer;
        }

        if (this._frameResizedTimer)
            clearTimeout(this._frameResizedTimer);

        this._frameResizedTimer = setTimeout(refreshContents.bind(this), 100);
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
