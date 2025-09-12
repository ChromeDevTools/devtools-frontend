// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {ActionDelegate} from './ActionRegistration.js';
import {LiveAnnouncer} from './ARIAUtils.js';
import type {Context} from './Context.js';
import {type Provider, ToolbarButton, type ToolbarItem} from './Toolbar.js';

const UIStrings = {
  /**
   * @description Text to close something
   */
  close: 'Close',
  /**
   * @description Text announced when the DevTools are undocked
   */
  devtoolsUndocked: 'DevTools is undocked',
  /**
   * @description Text announced when the DevTools are docked to the left, right, or bottom of the browser tab
   * @example {bottom} PH1
   */
  devToolsDockedTo: 'DevTools is docked to {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/DockController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let dockControllerInstance: DockController;

export class DockController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #canDock: boolean;
  readonly closeButton: ToolbarButton;
  private readonly currentDockStateSetting: Common.Settings.Setting<DockState>;
  private readonly lastDockStateSetting: Common.Settings.Setting<DockState>;
  #dockSide: DockState|undefined = undefined;

  constructor(canDock: boolean) {
    super();
    this.#canDock = canDock;

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
      this.#dockSide = DockState.UNDOCKED;
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
    if (!this.#canDock) {
      return;
    }

    this.dockSideChanged();
  }

  private dockSideChanged(): void {
    this.setDockSide(this.currentDockStateSetting.get());
  }

  dockSide(): DockState|undefined {
    return this.#dockSide;
  }

  /**
   * Whether the DevTools can be docked, used to determine if we show docking UI.
   * Set via `Root.Runtime.Runtime.queryParam('can_dock')`. See https://cs.chromium.org/can_dock+f:window
   *
   * Shouldn't be used as a heuristic for target connection state.
   */
  canDock(): boolean {
    return this.#canDock;
  }

  isVertical(): boolean {
    return this.#dockSide === DockState.RIGHT || this.#dockSide === DockState.LEFT;
  }

  setDockSide(dockSide: DockState): void {
    if (states.indexOf(dockSide) === -1) {
      // If the side is invalid, default to a valid one
      dockSide = states[0];
    }

    if (this.#dockSide === dockSide) {
      return;
    }

    if (this.#dockSide !== undefined) {
      document.body.classList.remove(this.#dockSide);
    }
    document.body.classList.add(dockSide);

    if (this.#dockSide) {
      this.lastDockStateSetting.set(this.#dockSide);
    }

    const eventData = {from: this.#dockSide, to: dockSide};
    this.dispatchEventToListeners(Events.BEFORE_DOCK_SIDE_CHANGED, eventData);
    console.timeStamp('DockController.setIsDocked');
    this.#dockSide = dockSide;
    this.currentDockStateSetting.set(dockSide);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(
        dockSide !== DockState.UNDOCKED, this.setIsDockedResponse.bind(this, eventData));
    this.closeButton.setVisible(this.#dockSide !== DockState.UNDOCKED);
    this.dispatchEventToListeners(Events.DOCK_SIDE_CHANGED, eventData);
  }

  private setIsDockedResponse(eventData: ChangeEvent): void {
    this.dispatchEventToListeners(Events.AFTER_DOCK_SIDE_CHANGED, eventData);
    this.announceDockLocation();
  }

  toggleDockSide(): void {
    if (this.lastDockStateSetting.get() === this.currentDockStateSetting.get()) {
      const index = states.indexOf(this.currentDockStateSetting.get()) || 0;
      this.lastDockStateSetting.set(states[(index + 1) % states.length]);
    }
    this.setDockSide(this.lastDockStateSetting.get());
  }

  announceDockLocation(): void {
    if (this.#dockSide === DockState.UNDOCKED) {
      LiveAnnouncer.alert(i18nString(UIStrings.devtoolsUndocked));
    } else {
      LiveAnnouncer.alert(i18nString(UIStrings.devToolsDockedTo, {PH1: this.#dockSide || ''}));
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

export interface EventTypes {
  [Events.BEFORE_DOCK_SIDE_CHANGED]: ChangeEvent;
  [Events.DOCK_SIDE_CHANGED]: ChangeEvent;
  [Events.AFTER_DOCK_SIDE_CHANGED]: ChangeEvent;
}

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
