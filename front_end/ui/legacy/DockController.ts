/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {ActionDelegate} from './ActionRegistration.js';
import {alert} from './ARIAUtils.js';
import type {Context} from './Context.js';
import {type Provider, ToolbarButton, type ToolbarItem} from './Toolbar.js';

const UIStrings = {
  /**
   *@description Text to close something
   */
  close: 'Close',
  /**
   *@description Text to dock the DevTools to the right of the browser tab
   */
  dockToRight: 'Dock to right',
  /**
   *@description Text to dock the DevTools to the bottom of the browser tab
   */
  dockToBottom: 'Dock to bottom',
  /**
   *@description Text to dock the DevTools to the left of the browser tab
   */
  dockToLeft: 'Dock to left',
  /**
   *@description Text to undock the DevTools
   */
  undockIntoSeparateWindow: 'Undock into separate window',
  /**
   *@description Text announced when the DevTools are undocked
   */
  devtoolsUndocked: 'DevTools is undocked',
  /**
   *@description Text announced when the DevTools are docked to the left, right, or bottom of the browser tab
   *@example {bottom} PH1
   */
  devToolsDockedTo: 'DevTools is docked to {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/DockController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let dockControllerInstance: DockController;

export class DockController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private canDockInternal: boolean;
  readonly closeButton: ToolbarButton;
  private readonly currentDockStateSetting: Common.Settings.Setting<DockState>;
  private readonly lastDockStateSetting: Common.Settings.Setting<DockState>;
  private dockSideInternal: DockState|undefined = undefined;
  private titles?: Common.UIString.LocalizedString[];
  private savedFocus?: Element|null;

  constructor(canDock: boolean) {
    super();
    this.canDockInternal = canDock;

    this.closeButton = new ToolbarButton(i18nString(UIStrings.close), 'cross');
    this.closeButton.element.setAttribute('jslog', `${VisualLogging.close().track({click: true})}`);
    this.closeButton.element.classList.add('close-devtools');
    this.closeButton.addEventListener(
        ToolbarButton.Events.CLICK,
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance));

    this.currentDockStateSetting = Common.Settings.Settings.instance().moduleSetting('currentDockState');
    this.lastDockStateSetting = Common.Settings.Settings.instance().createSetting('last-dock-state', DockState.BOTTOM);

    if (!canDock) {
      this.dockSideInternal = DockState.UNDOCKED;
      this.closeButton.setVisible(false);
      return;
    }

    this.currentDockStateSetting.addChangeListener(this.dockSideChanged, this);
    if (states.indexOf(this.currentDockStateSetting.get()) === -1) {
      this.currentDockStateSetting.set(DockState.RIGHT);
    }
    if (states.indexOf(this.lastDockStateSetting.get()) === -1) {
      this.currentDockStateSetting.set(DockState.BOTTOM);
    }
  }

  static instance(opts: {
    forceNew: boolean|null,
    canDock: boolean,
  } = {forceNew: null, canDock: false}): DockController {
    const {forceNew, canDock} = opts;
    if (!dockControllerInstance || forceNew) {
      dockControllerInstance = new DockController(canDock);
    }

    return dockControllerInstance;
  }

  initialize(): void {
    if (!this.canDockInternal) {
      return;
    }

    this.titles = [
      i18nString(UIStrings.dockToRight),
      i18nString(UIStrings.dockToBottom),
      i18nString(UIStrings.dockToLeft),
      i18nString(UIStrings.undockIntoSeparateWindow),
    ];
    this.dockSideChanged();
  }

  private dockSideChanged(): void {
    this.setDockSide(this.currentDockStateSetting.get());
    setTimeout(this.announceDockLocation.bind(this), 2000);
  }

  dockSide(): DockState|undefined {
    return this.dockSideInternal;
  }

  canDock(): boolean {
    return this.canDockInternal;
  }

  isVertical(): boolean {
    return this.dockSideInternal === DockState.RIGHT || this.dockSideInternal === DockState.LEFT;
  }

  setDockSide(dockSide: DockState): void {
    if (states.indexOf(dockSide) === -1) {
      // If the side is invalid, default to a valid one
      dockSide = states[0];
    }

    if (this.dockSideInternal === dockSide) {
      return;
    }

    if (this.dockSideInternal !== undefined) {
      document.body.classList.remove(this.dockSideInternal);
    }
    document.body.classList.add(dockSide);

    if (this.dockSideInternal) {
      this.lastDockStateSetting.set(this.dockSideInternal);
    }

    this.savedFocus = Platform.DOMUtilities.deepActiveElement(document);
    const eventData = {from: this.dockSideInternal, to: dockSide};
    this.dispatchEventToListeners(Events.BEFORE_DOCK_SIDE_CHANGED, eventData);
    console.timeStamp('DockController.setIsDocked');
    this.dockSideInternal = dockSide;
    this.currentDockStateSetting.set(dockSide);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(
        dockSide !== DockState.UNDOCKED, this.setIsDockedResponse.bind(this, eventData));
    this.closeButton.setVisible(this.dockSideInternal !== DockState.UNDOCKED);
    this.dispatchEventToListeners(Events.DOCK_SIDE_CHANGED, eventData);
  }

  private setIsDockedResponse(eventData: ChangeEvent): void {
    this.dispatchEventToListeners(Events.AFTER_DOCK_SIDE_CHANGED, eventData);
    if (this.savedFocus) {
      (this.savedFocus as HTMLElement).focus();
      this.savedFocus = null;
    }
  }

  toggleDockSide(): void {
    if (this.lastDockStateSetting.get() === this.currentDockStateSetting.get()) {
      const index = states.indexOf(this.currentDockStateSetting.get()) || 0;
      this.lastDockStateSetting.set(states[(index + 1) % states.length]);
    }
    this.setDockSide(this.lastDockStateSetting.get());
  }

  announceDockLocation(): void {
    if (this.dockSideInternal === DockState.UNDOCKED) {
      alert(i18nString(UIStrings.devtoolsUndocked));
    } else {
      alert(i18nString(UIStrings.devToolsDockedTo, {PH1: this.dockSideInternal || ''}));
    }
  }
}

export const enum DockState {
  BOTTOM = 'bottom',
  RIGHT = 'right',
  LEFT = 'left',
  UNDOCKED = 'undocked',
}

const states = [DockState.RIGHT, DockState.BOTTOM, DockState.LEFT, DockState.UNDOCKED];

// Use BeforeDockSideChanged to do something before all the UI bits are updated,
// DockSideChanged to update UI, and AfterDockSideChanged to perform actions
// after frontend is docked/undocked in the browser.

export const enum Events {
  BEFORE_DOCK_SIDE_CHANGED = 'BeforeDockSideChanged',
  DOCK_SIDE_CHANGED = 'DockSideChanged',
  AFTER_DOCK_SIDE_CHANGED = 'AfterDockSideChanged',
}

export interface ChangeEvent {
  from: DockState|undefined;
  to: DockState;
}

export type EventTypes = {
  [Events.BEFORE_DOCK_SIDE_CHANGED]: ChangeEvent,
  [Events.DOCK_SIDE_CHANGED]: ChangeEvent,
  [Events.AFTER_DOCK_SIDE_CHANGED]: ChangeEvent,
};

export class ToggleDockActionDelegate implements ActionDelegate {
  handleAction(_context: Context, _actionId: string): boolean {
    DockController.instance().toggleDockSide();
    return true;
  }
}

let closeButtonProviderInstance: CloseButtonProvider;

export class CloseButtonProvider implements Provider {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CloseButtonProvider {
    const {forceNew} = opts;
    if (!closeButtonProviderInstance || forceNew) {
      closeButtonProviderInstance = new CloseButtonProvider();
    }

    return closeButtonProviderInstance;
  }

  item(): ToolbarItem|null {
    return DockController.instance().closeButton;
  }
}
