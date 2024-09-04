// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

export class LayerPaintProfilerView extends UI.SplitWidget.SplitWidget {
  private readonly logTreeView: LayerViewer.PaintProfilerView.PaintProfilerCommandLogView;
  private readonly paintProfilerView: LayerViewer.PaintProfilerView.PaintProfilerView;
  constructor(showImageCallback: (arg0?: string|undefined) => void) {
    super(true, false);
    this.element.setAttribute('jslog', `${VisualLogging.pane('layers.paint-profiler').track({resize: true})}`);

    this.logTreeView = new LayerViewer.PaintProfilerView.PaintProfilerCommandLogView();
    this.setSidebarWidget(this.logTreeView);
    this.paintProfilerView = new LayerViewer.PaintProfilerView.PaintProfilerView(showImageCallback);
    this.setMainWidget(this.paintProfilerView);

    this.paintProfilerView.addEventListener(
        LayerViewer.PaintProfilerView.Events.WINDOW_CHANGED, this.onWindowChanged, this);

    this.logTreeView.focus();
  }

  reset(): void {
    void this.paintProfilerView.setSnapshotAndLog(null, [], null);
  }

  profile(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    void snapshot.commandLog().then(log => setSnapshotAndLog.call(this, snapshot, log));

    function setSnapshotAndLog(
        this: LayerPaintProfilerView, snapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null,
        log: SDK.PaintProfiler.PaintProfilerLogItem[]|null): void {
      this.logTreeView.setCommandLog(log || []);
      void this.paintProfilerView.setSnapshotAndLog(snapshot, log || [], null);
      if (snapshot) {
        snapshot.release();
      }
    }
  }

  setScale(scale: number): void {
    this.paintProfilerView.setScale(scale);
  }

  private onWindowChanged(): void {
    this.logTreeView.updateWindow(this.paintProfilerView.selectionWindow());
  }
}
