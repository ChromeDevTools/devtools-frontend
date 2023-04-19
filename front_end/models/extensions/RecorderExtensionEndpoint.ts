// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {PrivateAPI} from './ExtensionAPI.js';
import {ExtensionEndpoint} from './ExtensionEndpoint.js';
import {RecorderPluginManager} from './RecorderPluginManager.js';

export class RecorderExtensionEndpoint extends ExtensionEndpoint {
  private readonly name: string;
  private readonly mediaType?: string;
  private readonly capabilities: PrivateAPI.RecordingExtensionPluginCapability[];

  constructor(
      name: string, port: MessagePort, capabilities: PrivateAPI.RecordingExtensionPluginCapability[],
      mediaType?: string) {
    super(port);
    this.name = name;
    this.mediaType = mediaType;
    this.capabilities = capabilities;
  }

  getName(): string {
    return this.name;
  }

  getCapabilities(): PrivateAPI.RecordingExtensionPluginCapability[] {
    return this.capabilities;
  }

  getMediaType(): string|undefined {
    return this.mediaType;
  }

  protected override handleEvent({event}: {event: string}): void {
    switch (event) {
      case PrivateAPI.RecorderExtensionPluginEvents.UnregisteredRecorderExtensionPlugin: {
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
  stringify(recording: Object): Promise<string> {
    return this.sendRequest(PrivateAPI.RecorderExtensionPluginCommands.Stringify, {recording});
  }

  /**
   * In practice, `step` is a Step[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L243
   */
  stringifyStep(step: Object): Promise<string> {
    return this.sendRequest(PrivateAPI.RecorderExtensionPluginCommands.StringifyStep, {step});
  }

  /**
   * In practice, `recording` is a UserFlow[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out potential compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L245
   */
  replay(recording: Object): Promise<void> {
    return this.sendRequest(PrivateAPI.RecorderExtensionPluginCommands.Replay, {recording});
  }
}
