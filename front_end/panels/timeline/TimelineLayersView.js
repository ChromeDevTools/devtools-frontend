// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';
export class TimelineLayersView extends UI.SplitWidget.SplitWidget {
    showPaintProfilerCallback;
    rightSplitWidget;
    layerViewHost;
    layers3DView;
    frameLayerTree;
    updateWhenVisible;
    constructor(showPaintProfilerCallback) {
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
        this.layers3DView.addEventListener("PaintProfilerRequested" /* LayerViewer.Layers3DView.Events.PAINT_PROFILER_REQUESTED */, this.onPaintProfilerRequested, this);
        this.rightSplitWidget.setMainWidget(this.layers3DView);
        const layerDetailsView = new LayerViewer.LayerDetailsView.LayerDetailsView(this.layerViewHost);
        this.rightSplitWidget.setSidebarWidget(layerDetailsView);
        layerDetailsView.addEventListener("PaintProfilerRequested" /* LayerViewer.LayerDetailsView.Events.PAINT_PROFILER_REQUESTED */, this.onPaintProfilerRequested, this);
    }
    showLayerTree(frameLayerTree) {
        this.frameLayerTree = frameLayerTree;
        if (this.isShowing()) {
            this.update();
        }
        else {
            this.updateWhenVisible = true;
        }
    }
    wasShown() {
        super.wasShown();
        if (this.updateWhenVisible) {
            this.updateWhenVisible = false;
            this.update();
        }
    }
    async onPaintProfilerRequested(event) {
        const selection = event.data;
        const snapshotWithRect = await this.layers3DView.snapshotForSelection(selection);
        if (snapshotWithRect) {
            this.showPaintProfilerCallback(snapshotWithRect.snapshot);
        }
    }
    update() {
        if (this.frameLayerTree) {
            void this.frameLayerTree.layerTreePromise().then(layerTree => this.layerViewHost.setLayerTree(layerTree));
        }
    }
}
//# sourceMappingURL=TimelineLayersView.js.map