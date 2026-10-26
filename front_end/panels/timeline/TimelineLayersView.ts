// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

import type {TracingFrameLayerTree} from './TracingLayerTree.js';

const {widget, widgetRef} = UI.Widget;

export interface ViewInput {
  layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
  onPaintProfilerRequested: (selection: LayerViewer.LayerViewHost.Selection) => void;
}

export interface ViewOutput {
  snapshotForSelection?:
      (selection: LayerViewer.LayerViewHost.Selection) => Promise<SDK.PaintProfiler.SnapshotWithRect|null>;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // Common.ObjectWrapper.eventMixin(UI.Widget.Widget) dispatches a DOM
  // CustomEvent('PaintProfilerRequested') on the host element, and Lit
  // preserves the case-sensitive event name for addEventListener.
  // clang-format off
  render(html`
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
            ${widget(LayerViewer.Layers3DView.Layers3DView, {layerViewHost: input.layerViewHost})}
            ${widgetRef(LayerViewer.Layers3DView.Layers3DView, view => {
              output.snapshotForSelection = selection => view.snapshotForSelection(selection);
            })}
            @PaintProfilerRequested=${(event: CustomEvent<LayerViewer.LayerViewHost.Selection>) => {
              input.onPaintProfilerRequested(event.detail);
            }}>
        </devtools-widget>
        <devtools-widget
            slot="sidebar"
            ${widget(LayerViewer.LayerDetailsView.LayerDetailsView, {layerViewHost: input.layerViewHost})}
            @PaintProfilerRequested=${(event: CustomEvent<LayerViewer.LayerViewHost.Selection>) => {
              input.onPaintProfilerRequested(event.detail);
            }}>
        </devtools-widget>
      </devtools-split-view>
      <devtools-widget
          slot="sidebar"
          ${widget(LayerViewer.LayerTreeOutline.LayerTreeOutline, {layerViewHost: input.layerViewHost})}>
      </devtools-widget>
    </devtools-split-view>
  `, target);
  // clang-format on
};

export class TimelineLayersView extends UI.Widget.VBox {
  #showPaintProfilerCallback?: (arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void;
  readonly #layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  readonly #onPaintProfilerRequestedBound = this.#onPaintProfilerRequested.bind(this);
  #frameLayerTree?: TracingFrameLayerTree;
  #updateWhenVisible?: boolean;

  constructor(
      showPaintProfilerCallback?: HTMLElement|((arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void),
      view: View = DEFAULT_VIEW,
  ) {
    super(showPaintProfilerCallback instanceof HTMLElement ? showPaintProfilerCallback : undefined);
    this.#view = view;
    if (typeof showPaintProfilerCallback === 'function') {
      this.#showPaintProfilerCallback = showPaintProfilerCallback;
    }
    this.#layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
  }

  get showPaintProfilerCallback(): ((arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void)|undefined {
    return this.#showPaintProfilerCallback;
  }

  set showPaintProfilerCallback(callback: ((arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void)|undefined) {
    this.#showPaintProfilerCallback = callback;
  }

  override performUpdate(): void {
    this.#view(
        {
          layerViewHost: this.#layerViewHost,
          onPaintProfilerRequested: this.#onPaintProfilerRequestedBound,
        },
        this.#viewOutput,
        this.contentElement,
    );
  }

  showLayerTree(frameLayerTree: TracingFrameLayerTree): void {
    this.#frameLayerTree = frameLayerTree;
    if (this.isShowing()) {
      this.update();
    } else {
      this.#updateWhenVisible = true;
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    if (this.#updateWhenVisible) {
      this.#updateWhenVisible = false;
      this.update();
    }
  }

  async #onPaintProfilerRequested(selection: LayerViewer.LayerViewHost.Selection): Promise<void> {
    const snapshotWithRect = await this.#viewOutput.snapshotForSelection?.(selection);
    if (snapshotWithRect) {
      this.#showPaintProfilerCallback?.(snapshotWithRect.snapshot);
    }
  }

  update(): void {
    if (this.#frameLayerTree) {
      void Promise.all([this.#frameLayerTree.layerTreePromise(), this.updateComplete])
          .then(([layerTree]) => this.#layerViewHost.setLayerTree(layerTree));
    }
  }
}
