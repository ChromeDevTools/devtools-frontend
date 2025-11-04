// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import { DeviceModeView } from './DeviceModeView.js';
let deviceModeWrapperInstance;
export class DeviceModeWrapper extends UI.Widget.VBox {
    inspectedPagePlaceholder;
    deviceModeView;
    toggleDeviceModeAction;
    showDeviceModeSetting;
    constructor(inspectedPagePlaceholder) {
        super();
        this.inspectedPagePlaceholder = inspectedPagePlaceholder;
        this.deviceModeView = null;
        this.toggleDeviceModeAction = UI.ActionRegistry.ActionRegistry.instance().getAction('emulation.toggle-device-mode');
        const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
        this.showDeviceModeSetting = model.enabledSetting();
        this.showDeviceModeSetting.setRequiresUserAction(Boolean(Root.Runtime.Runtime.queryParam('hasOtherClients')));
        this.showDeviceModeSetting.addChangeListener(this.update.bind(this, false));
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "ScreenshotRequested" /* SDK.OverlayModel.Events.SCREENSHOT_REQUESTED */, this.screenshotRequestedFromOverlay, this);
        this.update(true);
    }
    static instance(opts = { forceNew: null, inspectedPagePlaceholder: null }) {
        const { forceNew, inspectedPagePlaceholder } = opts;
        if (!deviceModeWrapperInstance || forceNew) {
            if (!inspectedPagePlaceholder) {
                throw new Error(`Unable to create DeviceModeWrapper: inspectedPagePlaceholder must be provided: ${new Error().stack}`);
            }
            deviceModeWrapperInstance = new DeviceModeWrapper(inspectedPagePlaceholder);
        }
        return deviceModeWrapperInstance;
    }
    toggleDeviceMode() {
        this.showDeviceModeSetting.set(!this.showDeviceModeSetting.get());
    }
    isDeviceModeOn() {
        return this.showDeviceModeSetting.get();
    }
    captureScreenshot(fullSize, clip) {
        if (!this.deviceModeView) {
            this.deviceModeView = new DeviceModeView();
        }
        this.deviceModeView.setNonEmulatedAvailableSize(this.inspectedPagePlaceholder.element);
        if (fullSize) {
            void this.deviceModeView.captureFullSizeScreenshot();
        }
        else if (clip) {
            void this.deviceModeView.captureAreaScreenshot(clip);
        }
        else {
            void this.deviceModeView.captureScreenshot();
        }
        return true;
    }
    screenshotRequestedFromOverlay(event) {
        const clip = event.data;
        this.captureScreenshot(false, clip);
    }
    update(force) {
        this.toggleDeviceModeAction.setToggled(this.showDeviceModeSetting.get());
        const shouldShow = this.showDeviceModeSetting.get();
        if (!force && shouldShow === this.deviceModeView?.isShowing()) {
            return;
        }
        if (shouldShow) {
            if (!this.deviceModeView) {
                this.deviceModeView = new DeviceModeView();
            }
            this.deviceModeView.show(this.element);
            this.inspectedPagePlaceholder.clearMinimumSize();
            this.inspectedPagePlaceholder.show(this.deviceModeView.element);
        }
        else {
            if (this.deviceModeView) {
                this.deviceModeView.exitHingeMode();
                this.deviceModeView.detach();
            }
            this.inspectedPagePlaceholder.restoreMinimumSize();
            this.inspectedPagePlaceholder.show(this.element);
        }
    }
}
export class ActionDelegate {
    handleAction(context, actionId) {
        switch (actionId) {
            case 'emulation.capture-screenshot':
                return DeviceModeWrapper.instance().captureScreenshot();
            case 'emulation.capture-node-screenshot': {
                const node = context.flavor(SDK.DOMModel.DOMNode);
                if (!node) {
                    return true;
                }
                async function captureClip() {
                    if (!node) {
                        return;
                    }
                    const object = await node.resolveToObject();
                    if (!object) {
                        return;
                    }
                    const result = await object.callFunction(function () {
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
                    const clip = (JSON.parse(result.object.value));
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
//# sourceMappingURL=DeviceModeWrapper.js.map