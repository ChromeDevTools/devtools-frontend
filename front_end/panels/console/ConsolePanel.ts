// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ConsoleView} from './ConsoleView.js';

const {widget} = UI.Widget;

export interface ViewInput {
  showConsoleView: boolean;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    ${widget(UI.Widget.WrapperWidget, {
      widget: input.showConsoleView ? ConsoleView.instance() : null,
    })}
  `, target, {
    container: {
      attributes: {
        jslog: `${VisualLogging.panel('console').track({resize: true})}`,
      },
    },
  });
  // clang-format on
};

let consolePanelInstance: ConsolePanel|null = null;

export class ConsolePanel extends UI.Panel.Panel {
  readonly #view: View;
  #drawerWasMinimized = false;
  #ownsConsoleView = false;

  constructor(view: View = DEFAULT_VIEW) {
    super('console');
    this.#view = view;
  }

  override performUpdate(): void {
    this.#view(
        {showConsoleView: this.#ownsConsoleView},
        undefined,
        this.contentElement,
    );
  }

  static instance(opts: {
    forceNew: boolean|null,
    view?: View,
  } = {forceNew: null}): ConsolePanel {
    const {forceNew, view} = opts;
    if (!consolePanelInstance || forceNew) {
      consolePanelInstance = new ConsolePanel(view);
    }

    return consolePanelInstance;
  }

  static removeInstance(): void {
    consolePanelInstance = null;
  }

  static updateContextFlavor(): void {
    const consoleView = ConsoleView.instance();
    UI.Context.Context.instance().setFlavor(ConsoleView, consoleView.isShowing() ? consoleView : null);
  }

  override wasShown(): void {
    super.wasShown();
    const inspectorView = UI.InspectorView.InspectorView.instance();
    this.#drawerWasMinimized = inspectorView.isDrawerMinimized();
    const wrapper = wrapperViewInstance;
    // Always take the view away from the wrapper, even when the drawer is
    // minimized or hidden, so that only one of them owns the ConsoleView.
    wrapper?.hideViewInWrapper();
    if (wrapper?.isShowing()) {
      inspectorView.setDrawerMinimized(true);
    }
    this.#ownsConsoleView = true;
    this.performUpdate();
    ConsolePanel.updateContextFlavor();
  }

  override willHide(): void {
    super.willHide();
    this.#ownsConsoleView = false;
    this.performUpdate();
    const inspectorView = UI.InspectorView.InspectorView.instance();
    // The minimized drawer has 0 height, and showing Console inside may set
    // Console's scrollTop to 0. Unminimize before calling show to avoid this.
    // Restore the previous minimized state afterwards.
    inspectorView.setDrawerMinimized(false);
    if (wrapperViewInstance) {
      wrapperViewInstance.showViewInWrapper();
    }
    if (this.#drawerWasMinimized) {
      inspectorView.setDrawerMinimized(true);
    }
    ConsolePanel.updateContextFlavor();
  }

  override searchableView(): UI.SearchableView.SearchableView|null {
    return ConsoleView.instance().searchableView();
  }
}

let wrapperViewInstance: WrapperView|null = null;

export class WrapperView extends UI.Widget.VBox {
  readonly #view: View;
  #ownsConsoleView = false;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override performUpdate(): void {
    this.#view(
        {showConsoleView: this.#ownsConsoleView},
        undefined,
        this.contentElement,
    );
  }

  static instance(opts: {
    forceNew: boolean|null,
    view?: View,
  } = {forceNew: null}): WrapperView {
    const {forceNew, view} = opts;
    if (!wrapperViewInstance || forceNew) {
      wrapperViewInstance = new WrapperView(undefined, view);
    }
    return wrapperViewInstance;
  }

  static removeInstance(): void {
    wrapperViewInstance = null;
  }

  override wasShown(): void {
    super.wasShown();
    if (!ConsolePanel.instance().isShowing()) {
      this.showViewInWrapper();
    } else {
      // Render with showConsoleView: false so the container jslog attribute is
      // still set on contentElement when ConsolePanel owns ConsoleView.
      this.performUpdate();
      UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
    }
    ConsolePanel.updateContextFlavor();
  }

  override willHide(): void {
    super.willHide();
    ConsolePanel.updateContextFlavor();
  }

  showViewInWrapper(): void {
    this.#ownsConsoleView = true;
    // Update synchronously so ConsoleView is mounted before drawer minimize
    // state and ConsoleView context flavor are updated by callers.
    this.performUpdate();
  }

  hideViewInWrapper(): void {
    this.#ownsConsoleView = false;
    // Update synchronously so ConsoleView detaches before ConsolePanel claims it.
    this.performUpdate();
  }

  insertIntoPrompt(text: string): void {
    ConsoleView.instance().insertIntoPrompt(text);
  }
}

export class ConsoleRevealer implements Common.Revealer.Revealer<Common.Console.Console> {
  async reveal(_object: Common.Console.Console): Promise<void> {
    const consoleView = ConsoleView.instance();
    if (consoleView.isShowing()) {
      consoleView.focus();
      return;
    }
    await UI.ViewManager.ViewManager.instance().showView('console-view');
  }
}
