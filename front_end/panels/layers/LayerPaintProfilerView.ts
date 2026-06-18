// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

const {html, render} = Lit;
const {widget} = UI.Widget;

export interface ViewInput {
  showImageCallback: (arg0?: string|undefined) => void;
  snapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null;
  log: SDK.PaintProfiler.PaintProfilerLogItem[];
  scale: number;
  selectionWindow: {left: number, right: number}|null;
  onWindowChanged: (window: {left: number, right: number}|null) => void;
}

export type ViewOutput = undefined;

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <devtools-split-view direction="column" jslog=${VisualLogging.pane('layers.paint-profiler').track({resize: true})}>
      <devtools-widget slot="sidebar"
          ${widget(LayerViewer.PaintProfilerView.PaintProfilerCommandLogView, {
            commandLog: input.log,
            selectionWindow: input.selectionWindow,
          })}>
      </devtools-widget>
      <devtools-widget slot="main"
          ${widget(LayerViewer.PaintProfilerView.PaintProfilerView, {
            showImageCallback: input.showImageCallback,
            snapshotAndLog: {snapshot: input.snapshot, log: input.log},
            scale: input.scale,
          })}
          @WindowChanged=${(e: CustomEvent<{left: number, right: number}|null>) => input.onWindowChanged(e.detail)}>
      </devtools-widget>
    </devtools-split-view>
  `, target);
  // clang-format on
};

export class LayerPaintProfilerView extends UI.Widget.VBox {
  readonly #showImageCallback: (arg0?: string|undefined) => void;
  #snapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null = null;
  #log: SDK.PaintProfiler.PaintProfilerLogItem[] = [];
  #scale = 1;
  #selectionWindow: {left: number, right: number}|null = null;
  readonly #view: View;

  constructor(showImageCallback: (arg0?: string|undefined) => void, view: View = DEFAULT_VIEW) {
    super();
    this.#showImageCallback = showImageCallback;
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: ViewInput = {
      showImageCallback: this.#showImageCallback,
      snapshot: this.#snapshot,
      log: this.#log,
      scale: this.#scale,
      selectionWindow: this.#selectionWindow,
      onWindowChanged: this.onWindowChanged,
    };
    this.#view(input, undefined, this.contentElement);
  }

  reset(): void {
    if (this.#snapshot) {
      this.#snapshot.release();
    }
    this.#snapshot = null;
    this.#log = [];
    this.#selectionWindow = null;
    this.requestUpdate();
  }

  profile(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    void snapshot.commandLog().then(log => {
      if (this.#snapshot) {
        this.#snapshot.release();
      }
      this.#snapshot = snapshot;
      this.#log = log || [];
      this.requestUpdate();
    });
  }

  setScale(scale: number): void {
    this.#scale = scale;
    this.requestUpdate();
  }

  private onWindowChanged = (window: {left: number, right: number}|null): void => {
    this.#selectionWindow = window;
    this.requestUpdate();
  };
}
