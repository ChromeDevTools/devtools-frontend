// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import artifactsViewerStyles from './artifactsViewer.css.js';

const {html, render} = Lit;

export interface ViewInput {
  artifacts: [];
}

export const DEFAULT_VIEW = (
    _input: ViewInput,
    _output: Record<string, unknown>,
    target: HTMLElement,
    ): void => {
  // clang-format off
  render(
    html`
      <style>${artifactsViewerStyles}</style>
      <div>
        Artifacts Viewer
      </div>
    `,
    target
  );
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

export class ArtifactsViewer extends UI.Widget.Widget {
  #view: View;
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    void this.requestUpdate();
  }

  override performUpdate(): Promise<void>|void {
    this.#view(
        {
          artifacts: [],
        },
        {},
        this.contentElement,
    );
  }
}
