// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ExtensionEndpoint } from './ExtensionEndpoint.js';
import { RecorderPluginManager } from './RecorderPluginManager.js';
export class RecorderExtensionEndpoint extends ExtensionEndpoint {
    name;
    mediaType;
    capabilities;
    constructor(name, port, capabilities, mediaType) {
        super(port);
        this.name = name;
        this.mediaType = mediaType;
        this.capabilities = capabilities;
    }
    getName() {
        return this.name;
    }
    getCapabilities() {
        return this.capabilities;
    }
    getMediaType() {
        return this.mediaType;
    }
    handleEvent({ event }) {
        switch (event) {
            case "unregisteredRecorderExtensionPlugin" /* PrivateAPI.RecorderExtensionPluginEvents.UnregisteredRecorderExtensionPlugin */: {
                this.disconnect();
                RecorderPluginManager.instance().removePlugin(this);
                break;
            }
            default:
                throw new Error(`Unrecognized Recorder extension endpoint event: ${event}`);
        }
    }
    /**
     * In practice, `recording` is a UserFlow[1], but we avoid defining this type on the
     * API in order to prevent dependencies between Chrome and puppeteer. Extensions
     * are responsible for working out potential compatibility issues.
     *
     * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L245
     */
    stringify(recording) {
        return this.sendRequest("stringify" /* PrivateAPI.RecorderExtensionPluginCommands.Stringify */, { recording });
    }
    /**
     * In practice, `step` is a Step[1], but we avoid defining this type on the
     * API in order to prevent dependencies between Chrome and puppeteer. Extensions
     * are responsible for working out compatibility issues.
     *
     * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L243
     */
    stringifyStep(step) {
        return this.sendRequest("stringifyStep" /* PrivateAPI.RecorderExtensionPluginCommands.StringifyStep */, { step });
    }
    /**
     * In practice, `recording` is a UserFlow[1], but we avoid defining this type on the
     * API in order to prevent dependencies between Chrome and puppeteer. Extensions
     * are responsible for working out potential compatibility issues.
     *
     * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L245
     */
    replay(recording) {
        return this.sendRequest("replay" /* PrivateAPI.RecorderExtensionPluginCommands.Replay */, { recording });
    }
}
//# sourceMappingURL=RecorderExtensionEndpoint.js.map