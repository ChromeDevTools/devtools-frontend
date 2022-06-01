// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {PrivateAPI} from './ExtensionAPI.js';
import {ExtensionEndpoint} from './ExtensionEndpoint.js';
import {RecorderPluginManager} from './RecorderPluginManager.js';

export class RecorderExtensionEndpoint extends ExtensionEndpoint {
  private readonly name: string;
  private readonly mimeType: string;

  constructor(name: string, mimeType: string, port: MessagePort) {
    super(port);
    this.name = name;
    this.mimeType = mimeType;
  }

  getName(): string {
    return this.name;
  }

  getMimeType(): string {
    return this.mimeType;
  }

  protected handleEvent({event}: {event: string}): void {
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
}
