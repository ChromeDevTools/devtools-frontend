// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import artifactsViewerStyles from './artifactsViewer.css.js';
const { html, render } = Lit;
export const DEFAULT_VIEW = (_input, _output, target) => {
    // clang-format off
    render(html `
      <style>${artifactsViewerStyles}</style>
      <div>
        Artifacts Viewer
      </div>
    `, target);
    // clang-format on
};
export class ArtifactsViewer extends UI.Widget.Widget {
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        void this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            artifacts: [],
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=ArtifactsViewer.js.map