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
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.LayersPanel = class extends WebInspector.PanelWithSidebar {
  constructor() {
    super('layers', 225);

    /** @type {?WebInspector.LayerTreeModel} */
    this._model = null;

    WebInspector.targetManager.observeTargets(this);
    this._layerViewHost = new WebInspector.LayerViewHost();
    this._layerTreeOutline = new WebInspector.LayerTreeOutline(this._layerViewHost);
    this.panelSidebarElement().appendChild(this._layerTreeOutline.element);
    this.setDefaultFocusedElement(this._layerTreeOutline.element);

    this._rightSplitWidget = new WebInspector.SplitWidget(false, true, 'layerDetailsSplitViewState');
    this.splitWidget().setMainWidget(this._rightSplitWidget);

    this._layers3DView = new WebInspector.Layers3DView(this._layerViewHost);
    this._rightSplitWidget.setMainWidget(this._layers3DView);
    this._layers3DView.addEventListener(
        WebInspector.Layers3DView.Events.PaintProfilerRequested, this._onPaintProfileRequested, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ScaleChanged, this._onScaleChanged, this);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._rightSplitWidget.setSidebarWidget(this._tabbedPane);

    this._layerDetailsView = new WebInspector.LayerDetailsView(this._layerViewHost);
    this._layerDetailsView.addEventListener(
        WebInspector.LayerDetailsView.Events.PaintProfilerRequested, this._onPaintProfileRequested, this);
    this._tabbedPane.appendTab(
        WebInspector.LayersPanel.DetailsViewTabs.Details, WebInspector.UIString('Details'), this._layerDetailsView);

    this._paintProfilerView = new WebInspector.LayerPaintProfilerView(this._showImage.bind(this));
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabClosed, this._onTabClosed, this);
    this._updateThrottler = new WebInspector.Throttler(100);
  }

  /**
   * @override
   */
  focus() {
    this._layerTreeOutline.focus();
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (this._model)
      this._model.enable();
    this._layerTreeOutline.focus();
  }

  /**
   * @override
   */
  willHide() {
    if (this._model)
      this._model.disable();
    super.willHide();
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    if (this._model)
      return;
    this._model = WebInspector.LayerTreeModel.fromTarget(target);
    if (!this._model)
      return;
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerPainted, this._onLayerPainted, this);
    if (this.isShowing())
      this._model.enable();
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
    if (!this._model || this._model.target() !== target)
      return;
    this._model.removeEventListener(
        WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
    this._model.removeEventListener(WebInspector.LayerTreeModel.Events.LayerPainted, this._onLayerPainted, this);
    this._model.disable();
    this._model = null;
  }

  _onLayerTreeUpdated() {
    this._updateThrottler.schedule(this._update.bind(this));
  }

  /**
   * @return {!Promise<*>}
   */
  _update() {
    if (this._model)
      this._layerViewHost.setLayerTree(this._model.layerTree());
    return Promise.resolve();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onLayerPainted(event) {
    if (!this._model)
      return;
    var layer = /** @type {!WebInspector.Layer} */ (event.data);
    if (this._layerViewHost.selection() && this._layerViewHost.selection().layer() === layer)
      this._layerDetailsView.update();
    this._layers3DView.updateLayerSnapshot(layer);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onPaintProfileRequested(event) {
    var selection = /** @type {!WebInspector.LayerView.Selection} */ (event.data);
    this._layers3DView.snapshotForSelection(selection).then(snapshotWithRect => {
      if (!snapshotWithRect)
        return;
      this._layerBeingProfiled = selection.layer();
      this._tabbedPane.appendTab(
          WebInspector.LayersPanel.DetailsViewTabs.Profiler, WebInspector.UIString('Profiler'), this._paintProfilerView,
          undefined, true, true);
      this._tabbedPane.selectTab(WebInspector.LayersPanel.DetailsViewTabs.Profiler);
      this._paintProfilerView.profile(snapshotWithRect.snapshot);
    });
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onTabClosed(event) {
    if (event.data.tabId !== WebInspector.LayersPanel.DetailsViewTabs.Profiler || !this._layerBeingProfiled)
      return;
    this._paintProfilerView.reset();
    this._layers3DView.showImageForLayer(this._layerBeingProfiled, undefined);
    this._layerBeingProfiled = null;
  }

  /**
   * @param {string=} imageURL
   */
  _showImage(imageURL) {
    this._layers3DView.showImageForLayer(this._layerBeingProfiled, imageURL);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onScaleChanged(event) {
    this._paintProfilerView.setScale(/** @type {number} */ (event.data));
  }
};

WebInspector.LayersPanel.DetailsViewTabs = {
  Details: 'details',
  Profiler: 'profiler'
};
