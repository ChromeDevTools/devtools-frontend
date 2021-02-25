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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {LayerPaintProfilerView} from './LayerPaintProfilerView.js';
import {Events, LayerTreeModel} from './LayerTreeModel.js';

export const UIStrings = {
  /**
  *@description Text for the details of something
  */
  details: 'Details',
  /**
  *@description Title of the Profiler tool
  */
  profiler: 'Profiler',
};
const str_ = i18n.i18n.registerUIStrings('layers/LayersPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let layersPanelInstance: LayersPanel;

export class LayersPanel extends UI.Panel.PanelWithSidebar implements SDK.SDKModel.Observer {
  _model: LayerTreeModel|null;
  _layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
  _layerTreeOutline: LayerViewer.LayerTreeOutline.LayerTreeOutline;
  _rightSplitWidget: UI.SplitWidget.SplitWidget;
  _layers3DView: LayerViewer.Layers3DView.Layers3DView;
  _tabbedPane: UI.TabbedPane.TabbedPane;
  _layerDetailsView: LayerViewer.LayerDetailsView.LayerDetailsView;
  _paintProfilerView: LayerPaintProfilerView;
  _updateThrottler: Common.Throttler.Throttler;
  _layerBeingProfiled?: SDK.LayerTreeBase.Layer|null;
  constructor() {
    super('layers', 225);
    this._model = null;

    SDK.SDKModel.TargetManager.instance().observeTargets(this);
    this._layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    this._layerTreeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(this._layerViewHost);
    this._layerTreeOutline.addEventListener(
        LayerViewer.LayerTreeOutline.Events.PaintProfilerRequested, this._onPaintProfileRequested, this);
    this.panelSidebarElement().appendChild(this._layerTreeOutline.element);
    this.setDefaultFocusedElement(this._layerTreeOutline.element);

    this._rightSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'layerDetailsSplitViewState');
    this.splitWidget().setMainWidget(this._rightSplitWidget);

    this._layers3DView = new LayerViewer.Layers3DView.Layers3DView(this._layerViewHost);
    this._rightSplitWidget.setMainWidget(this._layers3DView);
    this._layers3DView.addEventListener(
        LayerViewer.Layers3DView.Events.PaintProfilerRequested, this._onPaintProfileRequested, this);
    this._layers3DView.addEventListener(LayerViewer.Layers3DView.Events.ScaleChanged, this._onScaleChanged, this);

    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._rightSplitWidget.setSidebarWidget(this._tabbedPane);

    this._layerDetailsView = new LayerViewer.LayerDetailsView.LayerDetailsView(this._layerViewHost);
    this._layerDetailsView.addEventListener(
        LayerViewer.LayerDetailsView.Events.PaintProfilerRequested, this._onPaintProfileRequested, this);
    this._tabbedPane.appendTab(DetailsViewTabs.Details, i18nString(UIStrings.details), this._layerDetailsView);

    this._paintProfilerView = new LayerPaintProfilerView(this._showImage.bind(this));
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this._onTabClosed, this);
    this._updateThrottler = new Common.Throttler.Throttler(100);
  }

  static instance(opts = {forceNew: null}): LayersPanel {
    const {forceNew} = opts;
    if (!layersPanelInstance || forceNew) {
      layersPanelInstance = new LayersPanel();
    }

    return layersPanelInstance;
  }

  focus(): void {
    this._layerTreeOutline.focus();
  }

  wasShown(): void {
    super.wasShown();
    if (this._model) {
      this._model.enable();
    }
  }

  willHide(): void {
    if (this._model) {
      this._model.disable();
    }
    super.willHide();
  }

  targetAdded(target: SDK.SDKModel.Target): void {
    if (this._model) {
      return;
    }
    this._model = target.model(LayerTreeModel);
    if (!this._model) {
      return;
    }
    this._model.addEventListener(Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
    this._model.addEventListener(Events.LayerPainted, this._onLayerPainted, this);
    if (this.isShowing()) {
      this._model.enable();
    }
  }

  targetRemoved(target: SDK.SDKModel.Target): void {
    if (!this._model || this._model.target() !== target) {
      return;
    }
    this._model.removeEventListener(Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
    this._model.removeEventListener(Events.LayerPainted, this._onLayerPainted, this);
    this._model.disable();
    this._model = null;
  }

  _onLayerTreeUpdated(): void {
    this._updateThrottler.schedule(this._update.bind(this));
  }

  _update(): Promise<void> {
    if (this._model) {
      this._layerViewHost.setLayerTree(this._model.layerTree());
      const resourceModel = this._model.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (resourceModel) {
        const mainFrame = resourceModel.mainFrame;
        if (mainFrame) {
          const url = mainFrame.url;
          // Add the currently visualized url as an attribute to make it accessibles to e2e tests
          this.element.setAttribute('test-current-url', url);
        }
      }
    }
    return Promise.resolve();
  }

  _onLayerPainted(event: Common.EventTarget.EventTargetEvent): void {
    if (!this._model) {
      return;
    }
    const layer = event.data as SDK.LayerTreeBase.Layer;
    const selection = this._layerViewHost.selection();
    if (selection && selection.layer() === layer) {
      this._layerDetailsView.update();
    }
    this._layers3DView.updateLayerSnapshot(layer);
  }

  _onPaintProfileRequested(event: Common.EventTarget.EventTargetEvent): void {
    const selection = event.data as LayerViewer.LayerViewHost.Selection;
    this._layers3DView.snapshotForSelection(selection).then(snapshotWithRect => {
      if (!snapshotWithRect) {
        return;
      }
      this._layerBeingProfiled = selection.layer();
      if (!this._tabbedPane.hasTab(DetailsViewTabs.Profiler)) {
        this._tabbedPane.appendTab(
            DetailsViewTabs.Profiler, i18nString(UIStrings.profiler), this._paintProfilerView, undefined, true, true);
      }
      this._tabbedPane.selectTab(DetailsViewTabs.Profiler);
      this._paintProfilerView.profile(snapshotWithRect.snapshot);
    });
  }

  _onTabClosed(event: Common.EventTarget.EventTargetEvent): void {
    if (event.data.tabId !== DetailsViewTabs.Profiler || !this._layerBeingProfiled) {
      return;
    }
    this._paintProfilerView.reset();
    this._layers3DView.showImageForLayer(this._layerBeingProfiled, undefined);
    this._layerBeingProfiled = null;
  }

  _showImage(imageURL?: string): void {
    if (this._layerBeingProfiled) {
      this._layers3DView.showImageForLayer(this._layerBeingProfiled, imageURL);
    }
  }

  _onScaleChanged(event: Common.EventTarget.EventTargetEvent): void {
    this._paintProfilerView.setScale(event.data as number);
  }
}

export const DetailsViewTabs = {
  Details: 'details',
  Profiler: 'profiler',
};
