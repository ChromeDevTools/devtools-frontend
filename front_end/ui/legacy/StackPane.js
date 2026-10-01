// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../lit/lit.js';
import { createShadowRootWithCoreStyles } from './UIUtils.js';
import * as View from './View.js';
import { ViewManager } from './ViewManager.js';
import { Widget, widget, widgetConfigs, WrapperWidget } from './Widget.js';
const { html, render } = Lit;
const SLOT_VIEW = (input, _output, target) => {
    render(html `<slot name=${input.name}></slot>`, target);
};
/**
 * Placeholder view for `StackPaneElement`. It holds only `<slot>`. The real
 * pane is a child of `StackPaneElement`. `StackPaneElement` owns `SlotView` and
 * adds it to `StackLocation`.
 */
class SlotView extends View.SimpleView {
    #pane;
    #view;
    constructor(pane, view = SLOT_VIEW) {
        super({ title: pane.title(), viewId: pane.viewId() });
        this.#pane = pane;
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({ name: this.#pane.viewId() }, undefined, this.contentElement);
    }
    toolbarItems() {
        return this.#pane.toolbarItems();
    }
    focus() {
        this.#pane.focus();
    }
}
const STACK_VIEW = (input, _output, target) => {
    render(html `<devtools-widget ${widget(WrapperWidget, { widget: input.location.widget() })}></devtools-widget>`, target);
};
/**
 * Declarative wrapper around `StackLocation`. Lit owns the real views, which
 * are children of this element. `StackLocation` manages only `SlotView`s.
 */
export class StackPaneElement extends HTMLElement {
    #location = ViewManager.instance().createStackLocation();
    #slotViews = new Map();
    #observer = new MutationObserver(() => this.#syncPanes());
    #shadow = createShadowRootWithCoreStyles(this);
    set isVisible(isVisible) {
        this.#location.notifyVisibilityChanged(isVisible);
    }
    connectedCallback() {
        STACK_VIEW({ location: this.#location }, undefined, this.#shadow);
        this.#syncPanes();
        this.#observer.observe(this, { childList: true });
    }
    disconnectedCallback() {
        this.#observer.disconnect();
        for (const [child, slotView] of this.#slotViews) {
            this.#location.removeView(slotView);
            this.#slotViews.delete(child);
        }
    }
    #syncPanes() {
        this.#removeStalePanes();
        this.#addNewPanes();
    }
    #childPanes() {
        const panes = new Map();
        for (const child of this.children) {
            if (child instanceof HTMLElement && widgetConfigs.has(child)) {
                const pane = Widget.getOrCreateWidget(child);
                if (pane instanceof View.SimpleView) {
                    panes.set(child, pane);
                }
            }
        }
        return panes;
    }
    #removeStalePanes() {
        const panes = this.#childPanes();
        for (const [child, slotView] of this.#slotViews) {
            if (!panes.has(child)) {
                this.#location.removeView(slotView);
                this.#slotViews.delete(child);
            }
        }
    }
    #addNewPanes() {
        let next;
        for (const [child, pane] of [...this.#childPanes()].reverse()) {
            if (!this.#slotViews.has(child)) {
                child.slot = pane.viewId();
                const slotView = new SlotView(pane);
                this.#slotViews.set(child, slotView);
                void this.#location.showView(slotView, next);
            }
            next = this.#slotViews.get(child);
        }
    }
}
customElements.define('devtools-stack-pane', StackPaneElement);
//# sourceMappingURL=StackPane.js.map