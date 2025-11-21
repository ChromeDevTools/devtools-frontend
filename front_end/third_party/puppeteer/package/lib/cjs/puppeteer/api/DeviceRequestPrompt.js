"use strict";
/**
 * @license
 * Copyright 2025 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRequestPrompt = exports.DeviceRequestPromptDevice = void 0;
/**
 * Device in a request prompt.
 *
 * @public
 */
class DeviceRequestPromptDevice {
    /**
     * Device id during a prompt.
     */
    id;
    /**
     * Device name as it appears in a prompt.
     */
    name;
    /**
     * @internal
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}
exports.DeviceRequestPromptDevice = DeviceRequestPromptDevice;
/**
 * Device request prompts let you respond to the page requesting for a device
 * through an API like WebBluetooth.
 *
 * @remarks
 * `DeviceRequestPrompt` instances are returned via the
 * {@link Page.waitForDevicePrompt} method.
 *
 * @example
 *
 * ```ts
 * const [devicePrompt] = Promise.all([
 *   page.waitForDevicePrompt(),
 *   page.click('#connect-bluetooth'),
 * ]);
 * await devicePrompt.select(
 *   await devicePrompt.waitForDevice(({name}) => name.includes('My Device')),
 * );
 * ```
 *
 * @public
 */
class DeviceRequestPrompt {
}
exports.DeviceRequestPrompt = DeviceRequestPrompt;
//# sourceMappingURL=DeviceRequestPrompt.js.map