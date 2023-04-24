/**
 * Copyright 2022 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DeviceRequestPrompt_instances, _DeviceRequestPrompt_client, _DeviceRequestPrompt_timeoutSettings, _DeviceRequestPrompt_id, _DeviceRequestPrompt_handled, _DeviceRequestPrompt_updateDevicesHandle, _DeviceRequestPrompt_waitForDevicePromises, _DeviceRequestPrompt_updateDevices, _DeviceRequestPromptManager_instances, _DeviceRequestPromptManager_client, _DeviceRequestPromptManager_timeoutSettings, _DeviceRequestPromptManager_deviceRequestPromptPromises, _DeviceRequestPromptManager_onDeviceRequestPrompted;
import { assert } from '../util/assert.js';
import { createDeferredPromise, } from '../util/DeferredPromise.js';
/**
 * Device in a request prompt.
 *
 * @public
 */
export class DeviceRequestPromptDevice {
    /**
     * @internal
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}
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
 * const [deviceRequest] = Promise.all([
 *   page.waitForDevicePrompt(),
 *   page.click('#connect-bluetooth'),
 * ]);
 * await devicePrompt.select(
 *   await devicePrompt.waitForDevice(({name}) => name.includes('My Device'))
 * );
 * ```
 *
 * @public
 */
export class DeviceRequestPrompt {
    /**
     * @internal
     */
    constructor(client, timeoutSettings, firstEvent) {
        _DeviceRequestPrompt_instances.add(this);
        _DeviceRequestPrompt_client.set(this, void 0);
        _DeviceRequestPrompt_timeoutSettings.set(this, void 0);
        _DeviceRequestPrompt_id.set(this, void 0);
        _DeviceRequestPrompt_handled.set(this, false);
        _DeviceRequestPrompt_updateDevicesHandle.set(this, __classPrivateFieldGet(this, _DeviceRequestPrompt_instances, "m", _DeviceRequestPrompt_updateDevices).bind(this));
        _DeviceRequestPrompt_waitForDevicePromises.set(this, new Set());
        /**
         * Current list of selectable devices.
         */
        this.devices = [];
        __classPrivateFieldSet(this, _DeviceRequestPrompt_client, client, "f");
        __classPrivateFieldSet(this, _DeviceRequestPrompt_timeoutSettings, timeoutSettings, "f");
        __classPrivateFieldSet(this, _DeviceRequestPrompt_id, firstEvent.id, "f");
        __classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f").on('DeviceAccess.deviceRequestPrompted', __classPrivateFieldGet(this, _DeviceRequestPrompt_updateDevicesHandle, "f"));
        __classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f").on('Target.detachedFromTarget', () => {
            __classPrivateFieldSet(this, _DeviceRequestPrompt_client, null, "f");
        });
        __classPrivateFieldGet(this, _DeviceRequestPrompt_instances, "m", _DeviceRequestPrompt_updateDevices).call(this, firstEvent);
    }
    /**
     * Resolve to the first device in the prompt matching a filter.
     */
    async waitForDevice(filter, options = {}) {
        for (const device of this.devices) {
            if (filter(device)) {
                return device;
            }
        }
        const { timeout = __classPrivateFieldGet(this, _DeviceRequestPrompt_timeoutSettings, "f").timeout() } = options;
        const promise = createDeferredPromise({
            message: `Waiting for \`DeviceRequestPromptDevice\` failed: ${timeout}ms exceeded`,
            timeout,
        });
        const handle = { filter, promise };
        __classPrivateFieldGet(this, _DeviceRequestPrompt_waitForDevicePromises, "f").add(handle);
        try {
            return await promise;
        }
        finally {
            __classPrivateFieldGet(this, _DeviceRequestPrompt_waitForDevicePromises, "f").delete(handle);
        }
    }
    /**
     * Select a device in the prompt's list.
     */
    async select(device) {
        assert(__classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f") !== null, 'Cannot select device through detached session!');
        assert(this.devices.includes(device), 'Cannot select unknown device!');
        assert(!__classPrivateFieldGet(this, _DeviceRequestPrompt_handled, "f"), 'Cannot select DeviceRequestPrompt which is already handled!');
        __classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f").off('DeviceAccess.deviceRequestPrompted', __classPrivateFieldGet(this, _DeviceRequestPrompt_updateDevicesHandle, "f"));
        __classPrivateFieldSet(this, _DeviceRequestPrompt_handled, true, "f");
        return __classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f").send('DeviceAccess.selectPrompt', {
            id: __classPrivateFieldGet(this, _DeviceRequestPrompt_id, "f"),
            deviceId: device.id,
        });
    }
    /**
     * Cancel the prompt.
     */
    async cancel() {
        assert(__classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f") !== null, 'Cannot cancel prompt through detached session!');
        assert(!__classPrivateFieldGet(this, _DeviceRequestPrompt_handled, "f"), 'Cannot cancel DeviceRequestPrompt which is already handled!');
        __classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f").off('DeviceAccess.deviceRequestPrompted', __classPrivateFieldGet(this, _DeviceRequestPrompt_updateDevicesHandle, "f"));
        __classPrivateFieldSet(this, _DeviceRequestPrompt_handled, true, "f");
        return __classPrivateFieldGet(this, _DeviceRequestPrompt_client, "f").send('DeviceAccess.cancelPrompt', { id: __classPrivateFieldGet(this, _DeviceRequestPrompt_id, "f") });
    }
}
_DeviceRequestPrompt_client = new WeakMap(), _DeviceRequestPrompt_timeoutSettings = new WeakMap(), _DeviceRequestPrompt_id = new WeakMap(), _DeviceRequestPrompt_handled = new WeakMap(), _DeviceRequestPrompt_updateDevicesHandle = new WeakMap(), _DeviceRequestPrompt_waitForDevicePromises = new WeakMap(), _DeviceRequestPrompt_instances = new WeakSet(), _DeviceRequestPrompt_updateDevices = function _DeviceRequestPrompt_updateDevices(event) {
    if (event.id !== __classPrivateFieldGet(this, _DeviceRequestPrompt_id, "f")) {
        return;
    }
    for (const rawDevice of event.devices) {
        if (this.devices.some(device => {
            return device.id === rawDevice.id;
        })) {
            continue;
        }
        const newDevice = new DeviceRequestPromptDevice(rawDevice.id, rawDevice.name);
        this.devices.push(newDevice);
        for (const waitForDevicePromise of __classPrivateFieldGet(this, _DeviceRequestPrompt_waitForDevicePromises, "f")) {
            if (waitForDevicePromise.filter(newDevice)) {
                waitForDevicePromise.promise.resolve(newDevice);
            }
        }
    }
};
/**
 * @internal
 */
export class DeviceRequestPromptManager {
    /**
     * @internal
     */
    constructor(client, timeoutSettings) {
        _DeviceRequestPromptManager_instances.add(this);
        _DeviceRequestPromptManager_client.set(this, void 0);
        _DeviceRequestPromptManager_timeoutSettings.set(this, void 0);
        _DeviceRequestPromptManager_deviceRequestPromptPromises.set(this, new Set());
        __classPrivateFieldSet(this, _DeviceRequestPromptManager_client, client, "f");
        __classPrivateFieldSet(this, _DeviceRequestPromptManager_timeoutSettings, timeoutSettings, "f");
        __classPrivateFieldGet(this, _DeviceRequestPromptManager_client, "f").on('DeviceAccess.deviceRequestPrompted', event => {
            __classPrivateFieldGet(this, _DeviceRequestPromptManager_instances, "m", _DeviceRequestPromptManager_onDeviceRequestPrompted).call(this, event);
        });
        __classPrivateFieldGet(this, _DeviceRequestPromptManager_client, "f").on('Target.detachedFromTarget', () => {
            __classPrivateFieldSet(this, _DeviceRequestPromptManager_client, null, "f");
        });
    }
    /**
     * Wait for device prompt created by an action like calling WebBluetooth's
     * requestDevice.
     */
    async waitForDevicePrompt(options = {}) {
        assert(__classPrivateFieldGet(this, _DeviceRequestPromptManager_client, "f") !== null, 'Cannot wait for device prompt through detached session!');
        const needsEnable = __classPrivateFieldGet(this, _DeviceRequestPromptManager_deviceRequestPromptPromises, "f").size === 0;
        let enablePromise;
        if (needsEnable) {
            enablePromise = __classPrivateFieldGet(this, _DeviceRequestPromptManager_client, "f").send('DeviceAccess.enable');
        }
        const { timeout = __classPrivateFieldGet(this, _DeviceRequestPromptManager_timeoutSettings, "f").timeout() } = options;
        const promise = createDeferredPromise({
            message: `Waiting for \`DeviceRequestPrompt\` failed: ${timeout}ms exceeded`,
            timeout,
        });
        __classPrivateFieldGet(this, _DeviceRequestPromptManager_deviceRequestPromptPromises, "f").add(promise);
        try {
            const [result] = await Promise.all([promise, enablePromise]);
            return result;
        }
        finally {
            __classPrivateFieldGet(this, _DeviceRequestPromptManager_deviceRequestPromptPromises, "f").delete(promise);
        }
    }
}
_DeviceRequestPromptManager_client = new WeakMap(), _DeviceRequestPromptManager_timeoutSettings = new WeakMap(), _DeviceRequestPromptManager_deviceRequestPromptPromises = new WeakMap(), _DeviceRequestPromptManager_instances = new WeakSet(), _DeviceRequestPromptManager_onDeviceRequestPrompted = function _DeviceRequestPromptManager_onDeviceRequestPrompted(event) {
    if (!__classPrivateFieldGet(this, _DeviceRequestPromptManager_deviceRequestPromptPromises, "f").size) {
        return;
    }
    assert(__classPrivateFieldGet(this, _DeviceRequestPromptManager_client, "f") !== null);
    const devicePrompt = new DeviceRequestPrompt(__classPrivateFieldGet(this, _DeviceRequestPromptManager_client, "f"), __classPrivateFieldGet(this, _DeviceRequestPromptManager_timeoutSettings, "f"), event);
    for (const promise of __classPrivateFieldGet(this, _DeviceRequestPromptManager_deviceRequestPromptPromises, "f")) {
        promise.resolve(devicePrompt);
    }
    __classPrivateFieldGet(this, _DeviceRequestPromptManager_deviceRequestPromptPromises, "f").clear();
};
//# sourceMappingURL=DeviceRequestPrompt.js.map