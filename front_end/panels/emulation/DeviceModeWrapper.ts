// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';

import {DeviceModeView} from './DeviceModeView.js';
import type {InspectedPagePlaceholder} from './InspectedPagePlaceholder.js';

let deviceModeWrapperInstance: DeviceModeWrapper;

export class DeviceModeWrapper extends UI.Widget.VBox {
  private readonly inspectedPagePlaceholder: InspectedPagePlaceholder;
  private deviceModeView: DeviceModeView|null;
  private readonly toggleDeviceModeAction: UI.ActionRegistration.Action;
  private showDeviceModeSetting: Common.Settings.Setting<boolean>;

  private constructor(inspectedPagePlaceholder: InspectedPagePlaceholder) {
    super();
    this.inspectedPagePlaceholder = inspectedPagePlaceholder;
    this.deviceModeView = null;
    this.toggleDeviceModeAction = UI.ActionRegistry.ActionRegistry.instance().getAction('emulation.toggle-device-mode');
    const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    this.showDeviceModeSetting = model.enabledSetting();
    this.showDeviceModeSetting.setRequiresUserAction(Boolean(Root.Runtime.Runtime.queryParam('hasOtherClients')));
    this.showDeviceModeSetting.addChangeListener(this.update.bind(this, false));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.SCREENSHOT_REQUESTED,
        this.screenshotRequestedFromOverlay, this);
    this.update(true);
  }

  static instance(opts: {
    forceNew: boolean|null,
    inspectedPagePlaceholder: InspectedPagePlaceholder|null,
  } = {forceNew: null, inspectedPagePlaceholder: null}): DeviceModeWrapper {
    const {forceNew, inspectedPagePlaceholder} = opts;
    if (!deviceModeWrapperInstance || forceNew) {
      if (!inspectedPagePlaceholder) {
        throw new Error(
            `Unable to create DeviceModeWrapper: inspectedPagePlaceholder must be provided: ${new Error().stack}`);
      }

      deviceModeWrapperInstance = new DeviceModeWrapper(inspectedPagePlaceholder);
    }

    return deviceModeWrapperInstance;
  }

  toggleDeviceMode(): void {
    this.showDeviceModeSetting.set(!this.showDeviceModeSetting.get());
  }

  isDeviceModeOn(): boolean {
    return this.showDeviceModeSetting.get();
  }

  captureScreenshot(fullSize?: boolean, clip?: Protocol.Page.Viewport): boolean {
    if (!this.deviceModeView) {
      this.deviceModeView = new DeviceModeView();
    }
    this.deviceModeView.setNonEmulatedAvailableSize(this.inspectedPagePlaceholder.element);
    if (fullSize) {
      void this.deviceModeView.captureFullSizeScreenshot();
    } else if (clip) {
      void this.deviceModeView.captureAreaScreenshot(clip);
    } else {
      void this.deviceModeView.captureScreenshot();
    }
    return true;
  }

  private screenshotRequestedFromOverlay(event: Common.EventTarget.EventTargetEvent<Protocol.Page.Viewport>): void {
    const clip = event.data;
    this.captureScreenshot(false, clip);
  }

  private update(force: boolean): void {
    this.toggleDeviceModeAction.setToggled(this.showDeviceModeSetting.get());
    if (!force) {
      const showing = this.deviceModeView && this.deviceModeView.isShowing();
      if (this.showDeviceModeSetting.get() === showing) {
        return;
      }
    }

    if (this.showDeviceModeSetting.get()) {
      if (!this.deviceModeView) {
        this.deviceModeView = new DeviceModeView();
      }
      this.deviceModeView.show(this.element);
      this.inspectedPagePlaceholder.clearMinimumSize();
      this.inspectedPagePlaceholder.show(this.deviceModeView.element);
    } else {
      if (this.deviceModeView) {
        this.deviceModeView.exitHingeMode();
        this.deviceModeView.detach();
      }
      this.inspectedPagePlaceholder.restoreMinimumSize();
      this.inspectedPagePlaceholder.show(this.element);
    }
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'emulation.capture-screenshot':
        return DeviceModeWrapper.instance().captureScreenshot();

      case 'emulation.capture-node-screenshot': {
        const node = context.flavor(SDK.DOMModel.DOMNode);
        if (!node) {
          return true;
        }
        async function captureClip(): Promise<void> {
          if (!node) {
            return;
          }

          const object = await node.resolveToObject();
          if (!object) {
            return;
          }
          const result = await object.callFunction(function(this: Element) {
            const rect = this.getBoundingClientRect();
            const docRect = this.ownerDocument.documentElement.getBoundingClientRect();
            return JSON.stringify({
              x: rect.left - docRect.left,
              y: rect.top - docRect.top,
              width: rect.width,
              height: rect.height,
              scale: 1,
            });
          });
          if (!result.object) {
            throw new Error('Clipping error: could not get object data.');
          }
          const clip = (JSON.parse((result.object.value as string)));
          const response = await node.domModel().target().pageAgent().invoke_getLayoutMetrics();
          const error = response.getError();
          const zoom = !error && response.visualViewport.zoom || 1;
          clip.x *= zoom;
          clip.y *= zoom;
          clip.width *= zoom;
          clip.height *= zoom;
          DeviceModeWrapper.instance().captureScreenshot(false, clip);
        }
        void captureClip();
        return true;
      }

      case 'emulation.capture-full-height-screenshot':
        return DeviceModeWrapper.instance().captureScreenshot(true);

      case 'emulation.toggle-device-mode':
        DeviceModeWrapper.instance().toggleDeviceMode();
        return true;
    }
    return false;
  }
}
