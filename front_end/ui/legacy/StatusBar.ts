// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../lit/lit.js';

import statusBarStyles from './statusBar.css.js';
import {ViewManager} from './ViewManager.js';
import {ViewLocationValues} from './ViewRegistration.js';
import {type AnyWidget, Widget} from './Widget.js';

const {html, render} = Lit;

export const DEFAULT_VIEW = (_input: undefined, _output: undefined, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${statusBarStyles}</style>
    <div class="status-bar"></div>
  `, target);
  // clang-format on
};

type View = typeof DEFAULT_VIEW;

export class StatusBarWidget extends Widget {
  readonly #view: View;
  #containerElement?: HTMLElement;
  readonly #widgets: AnyWidget[] = [];
  #viewsLoadedPromise?: Promise<void>;

  constructor(
      element: HTMLElement|undefined,
      view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#view = view;
  }

  viewsLoadedForTest(): Promise<void> {
    return this.#viewsLoadedPromise ?? Promise.resolve();
  }

  #attachWidgets(): void {
    if (!this.#containerElement) {
      return;
    }
    for (const widget of this.#widgets) {
      if (!widget.isShowing()) {
        widget.show(this.#containerElement);
      }
    }
  }

  async #loadViews(): Promise<void> {
    const views = ViewManager.instance().viewsForLocation(
        ViewLocationValues.STATUS_BAR,
    );
    for (const view of views) {
      const widget = await view.widget();
      if (widget instanceof Widget && !this.#widgets.includes(widget)) {
        this.#widgets.push(widget);
      }
    }
    this.#attachWidgets();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    this.#viewsLoadedPromise = this.#loadViews();
  }

  override performUpdate(): void {
    this.#view(undefined, undefined, this.contentElement);
    this.#containerElement = this.contentElement.querySelector('.status-bar') ?? undefined;
    this.#attachWidgets();
  }
}
