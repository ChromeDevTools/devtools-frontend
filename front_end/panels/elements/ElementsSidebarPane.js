// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
export class ElementsSidebarPane extends UI.Widget.VBox {
    computedStyleModelInternal;
    constructor(computedStyleModel, options = {}) {
        options.useShadowDom = options.useShadowDom ?? true;
        options.classes = options.classes ?? [];
        options.classes.push('flex-none');
        super(options);
        this.computedStyleModelInternal = computedStyleModel;
        this.computedStyleModelInternal.addEventListener("CSSModelChanged" /* Events.CSS_MODEL_CHANGED */, this.onCSSModelChanged, this);
        this.computedStyleModelInternal.addEventListener("ComputedStyleChanged" /* Events.COMPUTED_STYLE_CHANGED */, this.onComputedStyleChanged, this);
    }
    node() {
        return this.computedStyleModelInternal.node();
    }
    cssModel() {
        return this.computedStyleModelInternal.cssModel();
    }
    computedStyleModel() {
        return this.computedStyleModelInternal;
    }
    async performUpdate() {
        return;
    }
    onCSSModelChanged(_event) {
    }
    onComputedStyleChanged() {
    }
}
//# sourceMappingURL=ElementsSidebarPane.js.map