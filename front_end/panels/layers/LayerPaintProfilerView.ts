// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as LayerViewer from '../layer_viewer/layer_viewer.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

export class LayerPaintProfilerView extends UI.SplitWidget.SplitWidget {
  _logTreeView: LayerViewer.PaintProfilerView.PaintProfilerCommandLogView;
  _paintProfilerView: LayerViewer.PaintProfilerView.PaintProfilerView;
  constructor(showImageCallback: (arg0?: string|undefined) => void) {
    super(true, false);

    this._logTreeView = new LayerViewer.PaintProfilerView.PaintProfilerCommandLogView();
    this.setSidebarWidget(this._logTreeView);
    this._paintProfilerView = new LayerViewer.PaintProfilerView.PaintProfilerView(showImageCallback);
    this.setMainWidget(this._paintProfilerView);

    this._paintProfilerView.addEventListener(
        LayerViewer.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);

    this._logTreeView.focus();
  }

  reset(): void {
    this._paintProfilerView.setSnapshotAndLog(null, [], null);
  }

  profile(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    snapshot.commandLog().then(log => setSnapshotAndLog.call(this, snapshot, log));

    function setSnapshotAndLog(
        this: LayerPaintProfilerView, snapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null,
        log: SDK.PaintProfiler.PaintProfilerLogItem[]|null): void {
      this._logTreeView.setCommandLog(log || []);
      this._paintProfilerView.setSnapshotAndLog(snapshot, log || [], null);
      if (snapshot) {
        snapshot.release();
      }
    }
  }

  setScale(scale: number): void {
    this._paintProfilerView.setScale(scale);
  }

  _onWindowChanged(): void {
    this._logTreeView.updateWindow(this._paintProfilerView.selectionWindow());
  }
}
