// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {DeviceModeModel} from './DeviceModeModel.js';
import {DeviceModeView} from './DeviceModeView.js';
import {InspectedPagePlaceholder} from './InspectedPagePlaceholder.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class DeviceModeWrapper extends UI.Widget.VBox {
  /**
   * @param {!InspectedPagePlaceholder} inspectedPagePlaceholder
   */
  constructor(inspectedPagePlaceholder) {
    super();
    DeviceModeView.wrapperInstance = this;
    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    /** @type {?DeviceModeView} */
    this._deviceModeView = null;
    this._toggleDeviceModeAction = self.UI.actionRegistry.action('emulation.toggle-device-mode');
    const model = self.singleton(DeviceModeModel);
    this._showDeviceModeSetting = model.enabledSetting();
    this._showDeviceModeSetting.setRequiresUserAction(!!Root.Runtime.queryParam('hasOtherClients'));
    this._showDeviceModeSetting.addChangeListener(this._update.bind(this, false));
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.ScreenshotRequested,
        this._screenshotRequestedFromOverlay, this);
    this._update(true);
  }

  _toggleDeviceMode() {
    this._showDeviceModeSetting.set(!this._showDeviceModeSetting.get());
  }

  /**
   * @param {boolean=} fullSize
   * @param {!Protocol.Page.Viewport=} clip
   * @return {boolean}
   */
  _captureScreenshot(fullSize, clip) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _screenshotRequestedFromOverlay(event) {
    const clip = /** @type {!Protocol.Page.Viewport} */ (event.data);
    this._captureScreenshot(false, clip);
  }

  /**
   * @param {boolean} force
   */
  _update(force) {
    this._toggleDeviceModeAction.setToggled(this._showDeviceModeSetting.get());
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
        this._deviceModeView.detach();
      }
      this._inspectedPagePlaceholder.restoreMinimumSize();
      this._inspectedPagePlaceholder.show(this.element);
    }
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (DeviceModeView.wrapperInstance) {
      switch (actionId) {
        case 'emulation.capture-screenshot':
          return DeviceModeView.wrapperInstance._captureScreenshot();

        case 'emulation.capture-node-screenshot': {
          const node = self.UI.context.flavor(SDK.DOMModel.DOMNode);
          if (!node) {
            return true;
          }
          async function captureClip() {
            const object = await node.resolveToObject();
            const result = await object.callFunction(function() {
              const rect = this.getBoundingClientRect();
              const docRect = this.ownerDocument.documentElement.getBoundingClientRect();
              return JSON.stringify({
                x: rect.left - docRect.left,
                y: rect.top - docRect.top,
                width: rect.width,
                height: rect.height,
                scale: 1
              });
            });
            const clip =
                /** @type {!Protocol.Page.Viewport} */ (JSON.parse(/** @type {string} */ (result.object.value)));
            const response = await node.domModel().target().pageAgent().invoke_getLayoutMetrics({});
            const page_zoom =
                !response[ProtocolClient.InspectorBackend.ProtocolError] && response.visualViewport.zoom || 1;
            clip.x *= page_zoom;
            clip.y *= page_zoom;
            clip.width *= page_zoom;
            clip.height *= page_zoom;
            DeviceModeView.wrapperInstance._captureScreenshot(false, clip);
          }
          captureClip();
          return true;
        }

        case 'emulation.capture-full-height-screenshot':
          return DeviceModeView.wrapperInstance._captureScreenshot(true);

        case 'emulation.toggle-device-mode':
          DeviceModeView.wrapperInstance._toggleDeviceMode();
          return true;
      }
    }
    return false;
  }
}
