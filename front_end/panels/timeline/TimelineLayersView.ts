// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

export class TimelineLayersView extends UI.SplitWidget.SplitWidget {
  private readonly showPaintProfilerCallback: (arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void;
  private readonly rightSplitWidget: UI.SplitWidget.SplitWidget;
  private readonly layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
  private readonly layers3DView: LayerViewer.Layers3DView.Layers3DView;
  private frameLayerTree?: TimelineModel.TracingLayerTree.TracingFrameLayerTree;
  private updateWhenVisible?: boolean;
  constructor(showPaintProfilerCallback: (arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void) {
    super(true, false, 'timeline-layers-view');
    this.showPaintProfilerCallback = showPaintProfilerCallback;

    this.element.classList.add('timeline-layers-view');
    this.rightSplitWidget = new UI.SplitWidget.SplitWidget(true, true, 'timeline-layers-view-details');
    this.rightSplitWidget.element.classList.add('timeline-layers-view-properties');
    this.setMainWidget(this.rightSplitWidget);

    const vbox = new UI.Widget.VBox();
    this.setSidebarWidget(vbox);

    this.layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();

    const layerTreeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(this.layerViewHost);
    vbox.element.appendChild(layerTreeOutline.element);

    this.layers3DView = new LayerViewer.Layers3DView.Layers3DView(this.layerViewHost);
    this.layers3DView.addEventListener(
        LayerViewer.Layers3DView.Events.PAINT_PROFILER_REQUESTED, this.onPaintProfilerRequested, this);
    this.rightSplitWidget.setMainWidget(this.layers3DView);

    const layerDetailsView = new LayerViewer.LayerDetailsView.LayerDetailsView(this.layerViewHost);
    this.rightSplitWidget.setSidebarWidget(layerDetailsView);
    layerDetailsView.addEventListener(
        LayerViewer.LayerDetailsView.Events.PAINT_PROFILER_REQUESTED, this.onPaintProfilerRequested, this);
  }

  showLayerTree(frameLayerTree: TimelineModel.TracingLayerTree.TracingFrameLayerTree): void {
    this.frameLayerTree = frameLayerTree;
    if (this.isShowing()) {
      this.update();
    } else {
      this.updateWhenVisible = true;
    }
  }

  override wasShown(): void {
    if (this.updateWhenVisible) {
      this.updateWhenVisible = false;
      this.update();
    }
  }

  private async onPaintProfilerRequested(
      event: Common.EventTarget.EventTargetEvent<LayerViewer.LayerViewHost.Selection>): Promise<void> {
    const selection = event.data;
    const snapshotWithRect = await this.layers3DView.snapshotForSelection(selection);
    if (snapshotWithRect) {
      this.showPaintProfilerCallback(snapshotWithRect.snapshot);
    }
  }

  private update(): void {
    if (this.frameLayerTree) {
      void this.frameLayerTree.layerTreePromise().then(layerTree => this.layerViewHost.setLayerTree(layerTree));
    }
  }
}
