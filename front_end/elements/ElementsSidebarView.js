// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
WebInspector.ElementsSidebarView = function()
{
}

WebInspector.ElementsSidebarView.prototype = {
    // FIXME: nodeUpdates should also be here.
    /**
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node) { },

    /**
     * @return {!WebInspector.View}
     */
    view: function() { }
}

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 * @param {string} title
 * @param {!WebInspector.ElementsSidebarView} elementsSidebarView
 */
WebInspector.ElementsSidebarViewWrapperPane = function(title, elementsSidebarView)
{
    WebInspector.SidebarPane.call(this, title);
    this._elementsSidebarView = elementsSidebarView;
    this._elementsSidebarView.view().show(this.element);
}

WebInspector.ElementsSidebarViewWrapperPane.prototype = {
    /**
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node)
    {
        this._elementsSidebarView.setNode(node);
    },

    __proto__: WebInspector.SidebarPane.prototype
}
