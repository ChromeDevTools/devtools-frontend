// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export class ElementsSidebarPane extends UI.Widget.VBox {
    computedStyleModelInternal;
    updateThrottler;
    updateWhenVisible;
    constructor(computedStyleModel, delegatesFocus) {
        super({ useShadowDom: true, delegatesFocus, classes: ['flex-none'] });
        this.computedStyleModelInternal = computedStyleModel;
        this.computedStyleModelInternal.addEventListener("CSSModelChanged" /* Events.CSS_MODEL_CHANGED */, this.onCSSModelChanged, this);
        this.computedStyleModelInternal.addEventListener("ComputedStyleChanged" /* Events.COMPUTED_STYLE_CHANGED */, this.onComputedStyleChanged, this);
        this.updateThrottler = new Common.Throttler.Throttler(100);
        this.updateWhenVisible = false;
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
    async doUpdate() {
        return;
    }
    update() {
        this.updateWhenVisible = !this.isShowing();
        if (this.updateWhenVisible) {
            return;
        }
        void this.updateThrottler.schedule(innerUpdate.bind(this));
        function innerUpdate() {
            return this.isShowing() ? this.doUpdate() : Promise.resolve();
        }
    }
    wasShown() {
        super.wasShown();
        if (this.updateWhenVisible) {
            this.update();
        }
    }
    onCSSModelChanged(_event) {
    }
    onComputedStyleChanged() {
    }
}
//# sourceMappingURL=ElementsSidebarPane.js.map