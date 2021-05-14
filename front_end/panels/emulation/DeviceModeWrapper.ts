// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import {DeviceModeModel} from './DeviceModeModel.js';
import {DeviceModeView} from './DeviceModeView.js';
import type {InspectedPagePlaceholder} from './InspectedPagePlaceholder.js'; // eslint-disable-line no-unused-vars

let deviceModeWrapperInstance: DeviceModeWrapper;

export class DeviceModeWrapper extends UI.Widget.VBox {
  _inspectedPagePlaceholder: InspectedPagePlaceholder;
  _deviceModeView: DeviceModeView|null;
  _toggleDeviceModeAction: UI.ActionRegistration.Action|null;
  _showDeviceModeSetting: Common.Settings.Setting<boolean>;

  private constructor(inspectedPagePlaceholder: InspectedPagePlaceholder) {
    super();
    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    this._deviceModeView = null;
    this._toggleDeviceModeAction = UI.ActionRegistry.ActionRegistry.instance().action('emulation.toggle-device-mode');
    const model = DeviceModeModel.instance();
    this._showDeviceModeSetting = model.enabledSetting();
    this._showDeviceModeSetting.setRequiresUserAction(Boolean(Root.Runtime.Runtime.queryParam('hasOtherClients')));
    this._showDeviceModeSetting.addChangeListener(this._update.bind(this, false));
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.ScreenshotRequested,
        this._screenshotRequestedFromOverlay, this);
    this._update(true);
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

  _toggleDeviceMode(): void {
    this._showDeviceModeSetting.set(!this._showDeviceModeSetting.get());
  }

  _captureScreenshot(fullSize?: boolean, clip?: Protocol.Page.Viewport): boolean {
    if (!this._deviceModeView) {
      this._deviceModeView = new DeviceModeView();
    }
    this._deviceModeView.setNonEmulatedAvailableSize(this._inspectedPagePlaceholder.element);
    if (fullSize) {
      this._deviceModeView.captureFullSizeScreenshot();
    } else if (clip) {
      this._deviceModeView.captureAreaScreenshot(clip);
    } else {
      this._deviceModeView.captureScreenshot();
    }
    return true;
  }

  _screenshotRequestedFromOverlay(event: {
    data: Protocol.Page.Viewport,
  }): void {
    const clip = event.data;
    this._captureScreenshot(false, clip);
  }

  _update(force: boolean): void {
    if (this._toggleDeviceModeAction) {
      this._toggleDeviceModeAction.setToggled(this._showDeviceModeSetting.get());
    }
    if (!force) {
      const showing = this._deviceModeView && this._deviceModeView.isShowing();
      if (this._showDeviceModeSetting.get() === showing) {
        return;
      }
    }

    if (this._showDeviceModeSetting.get()) {
      if (!this._deviceModeView) {
        this._deviceModeView = new DeviceModeView();
      }
      this._deviceModeView.show(this.element);
      this._inspectedPagePlaceholder.clearMinimumSize();
      this._inspectedPagePlaceholder.show(this._deviceModeView.element);
    } else {
      if (this._deviceModeView) {
        this._deviceModeView.exitHingeMode();
        this._deviceModeView.detach();
      }
      this._inspectedPagePlaceholder.restoreMinimumSize();
      this._inspectedPagePlaceholder.show(this.element);
    }
  }
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    if (DeviceModeWrapper.instance()) {
      switch (actionId) {
        case 'emulation.capture-screenshot':
          return DeviceModeWrapper.instance()._captureScreenshot();

        case 'emulation.capture-node-screenshot': {
          const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
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
            const result = await object.callFunction(function() {
              const rect = (this as Element).getBoundingClientRect();
              const docRect = (this as Element).ownerDocument.documentElement.getBoundingClientRect();
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
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const page_zoom = !error && response.visualViewport.zoom || 1;
            clip.x *= page_zoom;
            clip.y *= page_zoom;
            clip.width *= page_zoom;
            clip.height *= page_zoom;
            DeviceModeWrapper.instance()._captureScreenshot(false, clip);
          }
          captureClip();
          return true;
        }

        case 'emulation.capture-full-height-screenshot':
          return DeviceModeWrapper.instance()._captureScreenshot(true);

        case 'emulation.toggle-device-mode':
          DeviceModeWrapper.instance()._toggleDeviceMode();
          return true;
      }
    }
    return false;
  }
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }
}
