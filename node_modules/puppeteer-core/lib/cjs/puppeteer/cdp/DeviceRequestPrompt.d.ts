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
import type Protocol from 'devtools-protocol';
import type { CDPSession } from '../api/CDPSession.js';
import type { WaitTimeoutOptions } from '../api/Page.js';
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
/**
 * Device in a request prompt.
 *
 * @public
 */
export declare class DeviceRequestPromptDevice {
    /**
     * Device id during a prompt.
     */
    id: string;
    /**
     * Device name as it appears in a prompt.
     */
    name: string;
    /**
     * @internal
     */
    constructor(id: string, name: string);
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
export declare class DeviceRequestPrompt {
    #private;
    /**
     * Current list of selectable devices.
     */
    devices: DeviceRequestPromptDevice[];
    /**
     * @internal
     */
    constructor(client: CDPSession, timeoutSettings: TimeoutSettings, firstEvent: Protocol.DeviceAccess.DeviceRequestPromptedEvent);
    /**
     * Resolve to the first device in the prompt matching a filter.
     */
    waitForDevice(filter: (device: DeviceRequestPromptDevice) => boolean, options?: WaitTimeoutOptions): Promise<DeviceRequestPromptDevice>;
    /**
     * Select a device in the prompt's list.
     */
    select(device: DeviceRequestPromptDevice): Promise<void>;
    /**
     * Cancel the prompt.
     */
    cancel(): Promise<void>;
}
/**
 * @internal
 */
export declare class DeviceRequestPromptManager {
    #private;
    /**
     * @internal
     */
    constructor(client: CDPSession, timeoutSettings: TimeoutSettings);
    /**
     * Wait for device prompt created by an action like calling WebBluetooth's
     * requestDevice.
     */
    waitForDevicePrompt(options?: WaitTimeoutOptions): Promise<DeviceRequestPrompt>;
}
//# sourceMappingURL=DeviceRequestPrompt.d.ts.map