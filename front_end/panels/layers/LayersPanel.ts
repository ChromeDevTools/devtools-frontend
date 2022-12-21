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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

import {LayerPaintProfilerView} from './LayerPaintProfilerView.js';
import {Events, LayerTreeModel} from './LayerTreeModel.js';

const UIStrings = {
  /**
   *@description Text for the details of something
   */
  details: 'Details',
  /**
   *@description Title of the Profiler tool
   */
  profiler: 'Profiler',
};
const str_ = i18n.i18n.registerUIStrings('panels/layers/LayersPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let layersPanelInstance: LayersPanel;

export class LayersPanel extends UI.Panel.PanelWithSidebar implements SDK.TargetManager.Observer {
  private model: LayerTreeModel|null;
  private readonly layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
  private readonly layerTreeOutline: LayerViewer.LayerTreeOutline.LayerTreeOutline;
  private readonly rightSplitWidget: UI.SplitWidget.SplitWidget;
  readonly layers3DView: LayerViewer.Layers3DView.Layers3DView;
  private tabbedPane: UI.TabbedPane.TabbedPane;
  private readonly layerDetailsView: LayerViewer.LayerDetailsView.LayerDetailsView;
  private readonly paintProfilerView: LayerPaintProfilerView;
  private readonly updateThrottler: Common.Throttler.Throttler;
  private layerBeingProfiled?: SDK.LayerTreeBase.Layer|null;
  constructor() {
    super('layers', 225);
    this.model = null;

    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    this.layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    this.layerTreeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(this.layerViewHost);
    this.layerTreeOutline.addEventListener(
        LayerViewer.LayerTreeOutline.Events.PaintProfilerRequested, this.onPaintProfileRequested, this);
    this.panelSidebarElement().appendChild(this.layerTreeOutline.element);
    this.setDefaultFocusedElement(this.layerTreeOutline.element);

    this.rightSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'layerDetailsSplitViewState');
    this.splitWidget().setMainWidget(this.rightSplitWidget);

    this.layers3DView = new LayerViewer.Layers3DView.Layers3DView(this.layerViewHost);
    this.rightSplitWidget.setMainWidget(this.layers3DView);
    this.layers3DView.addEventListener(
        LayerViewer.Layers3DView.Events.PaintProfilerRequested, this.onPaintProfileRequested, this);
    this.layers3DView.addEventListener(LayerViewer.Layers3DView.Events.ScaleChanged, this.onScaleChanged, this);

    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.rightSplitWidget.setSidebarWidget(this.tabbedPane);

    this.layerDetailsView = new LayerViewer.LayerDetailsView.LayerDetailsView(this.layerViewHost);
    this.layerDetailsView.addEventListener(
        LayerViewer.LayerDetailsView.Events.PaintProfilerRequested, this.onPaintProfileRequested, this);
    this.tabbedPane.appendTab(DetailsViewTabs.Details, i18nString(UIStrings.details), this.layerDetailsView);

    this.paintProfilerView = new LayerPaintProfilerView(this.showImage.bind(this));
    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this.onTabClosed, this);
    this.updateThrottler = new Common.Throttler.Throttler(100);
  }

  static instance(opts?: {forceNew: boolean}): LayersPanel {
    if (!layersPanelInstance || opts?.forceNew) {
      layersPanelInstance = new LayersPanel();
    }

    return layersPanelInstance;
  }

  focus(): void {
    this.layerTreeOutline.focus();
  }

  wasShown(): void {
    super.wasShown();
    if (this.model) {
      this.model.enable();
    }
  }

  willHide(): void {
    if (this.model) {
      void this.model.disable();
    }
    super.willHide();
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target !== SDK.TargetManager.TargetManager.instance().mainFrameTarget()) {
      return;
    }
    this.model = target.model(LayerTreeModel);
    if (!this.model) {
      return;
    }
    this.model.addEventListener(Events.LayerTreeChanged, this.onLayerTreeUpdated, this);
    this.model.addEventListener(Events.LayerPainted, this.onLayerPainted, this);
    if (this.isShowing()) {
      this.model.enable();
    }
  }

  targetRemoved(target: SDK.Target.Target): void {
    if (!this.model || this.model.target() !== target) {
      return;
    }
    this.model.removeEventListener(Events.LayerTreeChanged, this.onLayerTreeUpdated, this);
    this.model.removeEventListener(Events.LayerPainted, this.onLayerPainted, this);
    void this.model.disable();
    this.model = null;
  }

  private onLayerTreeUpdated(): void {
    void this.updateThrottler.schedule(this.update.bind(this));
  }

  private update(): Promise<void> {
    if (this.model) {
      this.layerViewHost.setLayerTree(this.model.layerTree());
      const resourceModel = this.model.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
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

  private onLayerPainted({data: layer}: Common.EventTarget.EventTargetEvent<SDK.LayerTreeBase.Layer>): void {
    if (!this.model) {
      return;
    }
    const selection = this.layerViewHost.selection();
    if (selection && selection.layer() === layer) {
      this.layerDetailsView.update();
    }
    this.layers3DView.updateLayerSnapshot(layer);
  }

  private onPaintProfileRequested({data: selection}:
                                      Common.EventTarget.EventTargetEvent<LayerViewer.LayerViewHost.Selection>): void {
    void this.layers3DView.snapshotForSelection(selection).then(snapshotWithRect => {
      if (!snapshotWithRect) {
        return;
      }
      this.layerBeingProfiled = selection.layer();
      if (!this.tabbedPane.hasTab(DetailsViewTabs.Profiler)) {
        this.tabbedPane.appendTab(
            DetailsViewTabs.Profiler, i18nString(UIStrings.profiler), this.paintProfilerView, undefined, true, true);
      }
      this.tabbedPane.selectTab(DetailsViewTabs.Profiler);
      this.paintProfilerView.profile(snapshotWithRect.snapshot);
    });
  }

  private onTabClosed(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    if (event.data.tabId !== DetailsViewTabs.Profiler || !this.layerBeingProfiled) {
      return;
    }
    this.paintProfilerView.reset();
    this.layers3DView.showImageForLayer(this.layerBeingProfiled, undefined);
    this.layerBeingProfiled = null;
  }

  private showImage(imageURL?: string): void {
    if (this.layerBeingProfiled) {
      this.layers3DView.showImageForLayer(this.layerBeingProfiled, imageURL);
    }
  }

  private onScaleChanged(event: Common.EventTarget.EventTargetEvent<number>): void {
    this.paintProfilerView.setScale(event.data);
  }
}

export const DetailsViewTabs = {
  Details: 'details',
  Profiler: 'profiler',
};
