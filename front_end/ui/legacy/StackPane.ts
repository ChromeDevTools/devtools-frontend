// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../lit/lit.js';

import type * as Toolbar from './Toolbar.js';
import {createShadowRootWithCoreStyles} from './UIUtils.js';
import * as View from './View.js';
import {type StackLocation, ViewManager} from './ViewManager.js';
import {Widget, widget, widgetConfigs, WrapperWidget} from './Widget.js';

const {html, render} = Lit;

interface SlotViewInput {
  name: string;
}

const SLOT_VIEW = (input: SlotViewInput, _output: undefined, target: HTMLElement): void => {
  render(html`<slot name=${input.name}></slot>`, target);
};

/**
 * Placeholder view for `StackPaneElement`. It holds only `<slot>`. The real
 * pane is a child of `StackPaneElement`. `StackPaneElement` owns `SlotView` and
 * adds it to `StackLocation`.
 */
class SlotView extends View.SimpleView {
  readonly #pane: View.SimpleView;
  readonly #view: typeof SLOT_VIEW;

  constructor(pane: View.SimpleView, view = SLOT_VIEW) {
    super({title: pane.title(), viewId: pane.viewId() as Lowercase<string>});
    this.#pane = pane;
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({name: this.#pane.viewId()}, undefined, this.contentElement);
  }

  override toolbarItems(): Promise<Toolbar.ToolbarItem[]|Lit.TemplateResult> {
    return this.#pane.toolbarItems();
  }

  override focus(): void {
    this.#pane.focus();
  }
}

interface ViewInput {
  location: StackLocation;
}

const STACK_VIEW = (input: ViewInput, _output: undefined, target: ShadowRoot): void => {
  render(html`<devtools-widget ${widget(WrapperWidget, {widget: input.location.widget()})}></devtools-widget>`, target);
};

/**
 * Declarative wrapper around `StackLocation`. Lit owns the real views, which
 * are children of this element. `StackLocation` manages only `SlotView`s.
 */
export class StackPaneElement extends HTMLElement {
  readonly #location = ViewManager.instance().createStackLocation();
  readonly #slotViews = new Map<HTMLElement, SlotView>();
  readonly #observer = new MutationObserver(() => this.#syncPanes());
  readonly #shadow = createShadowRootWithCoreStyles(this);

  set isVisible(isVisible: boolean) {
    this.#location.notifyVisibilityChanged(isVisible);
  }

  connectedCallback(): void {
    STACK_VIEW({location: this.#location}, undefined, this.#shadow);
    this.#syncPanes();
    this.#observer.observe(this, {childList: true});
  }

  disconnectedCallback(): void {
    this.#observer.disconnect();

    for (const [child, slotView] of this.#slotViews) {
      this.#location.removeView(slotView);
      this.#slotViews.delete(child);
    }
  }

  #syncPanes(): void {
    this.#removeStalePanes();
    this.#addNewPanes();
  }

  #childPanes(): Map<HTMLElement, View.SimpleView> {
    const panes = new Map<HTMLElement, View.SimpleView>();
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

  #removeStalePanes(): void {
    const panes = this.#childPanes();
    for (const [child, slotView] of this.#slotViews) {
      if (!panes.has(child)) {
        this.#location.removeView(slotView);
        this.#slotViews.delete(child);
      }
    }
  }

  #addNewPanes(): void {
    let next: SlotView|undefined;
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

declare global {
  interface HTMLElementTagNameMap {
    'devtools-stack-pane': StackPaneElement;
  }
}
