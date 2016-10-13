/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.PanelWithSidebar}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.LayersPanel = function()
{
    WebInspector.PanelWithSidebar.call(this, "layers", 225);

    /** @type {?WebInspector.LayerTreeModel} */
    this._model = null;

    WebInspector.targetManager.observeTargets(this);
    this._layerViewHost = new WebInspector.LayerViewHost();
    this._layerTreeOutline = new WebInspector.LayerTreeOutline(this._layerViewHost);
    this.panelSidebarElement().appendChild(this._layerTreeOutline.element);
    this.setDefaultFocusedElement(this._layerTreeOutline.element);

    this._rightSplitWidget = new WebInspector.SplitWidget(false, true, "layerDetailsSplitViewState");
    this.splitWidget().setMainWidget(this._rightSplitWidget);

    this._layers3DView = new WebInspector.Layers3DView(this._layerViewHost);
    this._rightSplitWidget.setMainWidget(this._layers3DView);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.LayerSnapshotRequested, this._onSnapshotRequested, this);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._rightSplitWidget.setSidebarWidget(this._tabbedPane);

    this._layerDetailsView = new WebInspector.LayerDetailsView(this._layerViewHost);
    this._tabbedPane.appendTab(WebInspector.LayersPanel.DetailsViewTabs.Details, WebInspector.UIString("Details"), this._layerDetailsView);

    this._paintProfilerView = new WebInspector.LayerPaintProfilerView(this._layers3DView.showImageForLayer.bind(this._layers3DView));
    this._tabbedPane.appendTab(WebInspector.LayersPanel.DetailsViewTabs.Profiler, WebInspector.UIString("Profiler"), this._paintProfilerView);
    this._updateThrottler = new WebInspector.Throttler(100);
}

WebInspector.LayersPanel.DetailsViewTabs = {
    Details: "details",
    Profiler: "profiler"
};

WebInspector.LayersPanel.prototype = {
    focus: function()
    {
        this._layerTreeOutline.focus();
    },

    wasShown: function()
    {
        WebInspector.Panel.prototype.wasShown.call(this);
        if (this._model)
            this._model.enable();
        this._layerTreeOutline.focus();
    },

    willHide: function()
    {
        if (this._model)
            this._model.disable();
        WebInspector.Panel.prototype.willHide.call(this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._model)
            return;
        this._model = WebInspector.LayerTreeModel.fromTarget(target);
        if (!this._model)
            return;
        this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
        this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerPainted, this._onLayerPainted, this);
        if (this.isShowing())
            this._model.enable();
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (!this._model || this._model.target() !== target)
            return;
        this._model.removeEventListener(WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
        this._model.removeEventListener(WebInspector.LayerTreeModel.Events.LayerPainted, this._onLayerPainted, this);
        this._model.disable();
        this._model = null;
    },

    _onLayerTreeUpdated: function()
    {
        this._updateThrottler.schedule(this._update.bind(this));
    },

    /**
     * @return {!Promise<*>}
     */
    _update: function()
    {
        if (this._model)
            this._layerViewHost.setLayerTree(this._model.layerTree());
        return Promise.resolve();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onLayerPainted: function(event)
    {
        if (!this._model)
            return;
        if (this._layerViewHost.selection() && this._layerViewHost.selection().layer() === event.data)
            this._layerDetailsView.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onSnapshotRequested: function(event)
    {
        var layer = /** @type {!WebInspector.Layer} */ (event.data);
        this._tabbedPane.selectTab(WebInspector.LayersPanel.DetailsViewTabs.Profiler);
        this._paintProfilerView.profileLayer(layer);
    },

    __proto__: WebInspector.PanelWithSidebar.prototype
}
