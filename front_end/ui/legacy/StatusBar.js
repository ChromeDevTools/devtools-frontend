// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../lit/lit.js';
import statusBarStyles from './statusBar.css.js';
import { ViewManager } from './ViewManager.js';
import { Widget } from './Widget.js';
const { html, render } = Lit;
export const DEFAULT_VIEW = (_input, _output, target) => {
    // clang-format off
    render(html `
    <style>${statusBarStyles}</style>
    <div class="status-bar"></div>
  `, target);
    // clang-format on
};
export class StatusBarWidget extends Widget {
    #view;
    #containerElement;
    #widgets = [];
    #viewsLoadedPromise;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    viewsLoadedForTest() {
        return this.#viewsLoadedPromise ?? Promise.resolve();
    }
    #attachWidgets() {
        if (!this.#containerElement) {
            return;
        }
        for (const widget of this.#widgets) {
            if (!widget.isShowing()) {
                widget.show(this.#containerElement);
            }
        }
    }
    async #loadViews() {
        const views = ViewManager.instance().viewsForLocation("status-bar" /* ViewLocationValues.STATUS_BAR */);
        for (const view of views) {
            const widget = await view.widget();
            if (widget instanceof Widget && !this.#widgets.includes(widget)) {
                this.#widgets.push(widget);
            }
        }
        this.#attachWidgets();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
        this.#viewsLoadedPromise = this.#loadViews();
    }
    performUpdate() {
        this.#view(undefined, undefined, this.contentElement);
        this.#containerElement = this.contentElement.querySelector('.status-bar') ?? undefined;
        this.#attachWidgets();
    }
}
//# sourceMappingURL=StatusBar.js.map