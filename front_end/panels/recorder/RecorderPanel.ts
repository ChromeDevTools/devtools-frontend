// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type * as Actions from './recorder-actions/recorder-actions.js';
import {RecorderController} from './RecorderController.js';

let recorderPanelInstance: RecorderPanel;

export class RecorderPanel extends UI.Panel.Panel {
  static panelName = 'chrome-recorder';

  #controller: RecorderController;

  constructor() {
    super(RecorderPanel.panelName);
    this.element.setAttribute('jslog', `${VisualLogging.panel('chrome-recorder').track({resize: true})}`);
    this.#controller = new RecorderController();
    this.contentElement.append(this.#controller);
    this.contentElement.style.minWidth = '400px';
  }

  static instance(
      opts: {forceNew: boolean|null} = {forceNew: null},
      ): RecorderPanel {
    const {forceNew} = opts;
    if (!recorderPanelInstance || forceNew) {
      recorderPanelInstance = new RecorderPanel();
    }

    return recorderPanelInstance;
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(RecorderPanel, this);
    // Focus controller so shortcuts become active
    this.#controller.focus();
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(RecorderPanel, null);
  }

  handleActions(actionId: Actions.RecorderActions): void {
    this.#controller.handleActions(actionId);
  }

  isActionPossible(actionId: Actions.RecorderActions): boolean {
    return this.#controller.isActionPossible(actionId);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(
      _context: UI.Context.Context,
      actionId: Actions.RecorderActions,
      ): boolean {
    void (async () => {
      await UI.ViewManager.ViewManager.instance().showView(
          RecorderPanel.panelName,
      );
      const view = UI.ViewManager.ViewManager.instance().view(
          RecorderPanel.panelName,
      );

      if (view) {
        const widget = (await view.widget()) as RecorderPanel;

        widget.handleActions(actionId);
      }
    })();
    return true;
  }
}
