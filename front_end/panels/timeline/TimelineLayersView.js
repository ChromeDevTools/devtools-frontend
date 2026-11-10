// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';
const { widget, widgetRef } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    // Common.ObjectWrapper.eventMixin(UI.Widget.Widget) dispatches a DOM
    // CustomEvent('PaintProfilerRequested') on the host element, and Lit
    // preserves the case-sensitive event name for addEventListener.
    // clang-format off
    render(html `
    <devtools-split-view
        class="timeline-layers-view"
        direction="column"
        sidebar-position="first"
        name="timeline-layers-view">
      <devtools-split-view
          slot="main"
          class="timeline-layers-view-properties"
          direction="column"
          sidebar-position="second"
          name="timeline-layers-view-details">
        <devtools-widget
            slot="main"
            ${widget(LayerViewer.Layers3DView.Layers3DView, { layerViewHost: input.layerViewHost })}
            ${widgetRef(LayerViewer.Layers3DView.Layers3DView, view => {
        output.snapshotForSelection = selection => view.snapshotForSelection(selection);
    })}
            @PaintProfilerRequested=${(event) => {
        input.onPaintProfilerRequested(event.detail);
    }}>
        </devtools-widget>
        <devtools-widget
            slot="sidebar"
            ${widget(LayerViewer.LayerDetailsView.LayerDetailsView, { layerViewHost: input.layerViewHost })}
            @PaintProfilerRequested=${(event) => {
        input.onPaintProfilerRequested(event.detail);
    }}>
        </devtools-widget>
      </devtools-split-view>
      <devtools-widget
          slot="sidebar"
          ${widget(LayerViewer.LayerTreeOutline.LayerTreeOutline, { layerViewHost: input.layerViewHost })}>
      </devtools-widget>
    </devtools-split-view>
  `, target);
    // clang-format on
};
export class TimelineLayersView extends UI.Widget.VBox {
    #showPaintProfilerCallback;
    #layerViewHost;
    #view;
    #viewOutput = {};
    #onPaintProfilerRequestedBound = this.#onPaintProfilerRequested.bind(this);
    #frameLayerTree;
    #updateWhenVisible;
    constructor(showPaintProfilerCallback, view = DEFAULT_VIEW) {
        super(showPaintProfilerCallback instanceof HTMLElement ? showPaintProfilerCallback : undefined);
        this.#view = view;
        if (typeof showPaintProfilerCallback === 'function') {
            this.#showPaintProfilerCallback = showPaintProfilerCallback;
        }
        this.#layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    }
    get showPaintProfilerCallback() {
        return this.#showPaintProfilerCallback;
    }
    set showPaintProfilerCallback(callback) {
        this.#showPaintProfilerCallback = callback;
    }
    performUpdate() {
        this.#view({
            layerViewHost: this.#layerViewHost,
            onPaintProfilerRequested: this.#onPaintProfilerRequestedBound,
        }, this.#viewOutput, this.contentElement);
    }
    showLayerTree(frameLayerTree) {
        this.#frameLayerTree = frameLayerTree;
        if (this.isShowing()) {
            this.update();
        }
        else {
            this.#updateWhenVisible = true;
        }
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
        if (this.#updateWhenVisible) {
            this.#updateWhenVisible = false;
            this.update();
        }
    }
    async #onPaintProfilerRequested(selection) {
        const snapshotWithRect = await this.#viewOutput.snapshotForSelection?.(selection);
        if (snapshotWithRect) {
            this.#showPaintProfilerCallback?.(snapshotWithRect.snapshot);
        }
    }
    update() {
        if (this.#frameLayerTree) {
            void Promise.all([this.#frameLayerTree.layerTreePromise(), this.updateComplete])
                .then(([layerTree]) => this.#layerViewHost.setLayerTree(layerTree));
        }
    }
}
//# sourceMappingURL=TimelineLayersView.js.map