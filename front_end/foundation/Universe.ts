// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';

export interface CreationOptions {
  // Settings things
  settingsCreationOptions: Common.Settings.SettingsCreationOptions;
}

export class Universe {
  readonly context = new Root.DevToolsContext.DevToolsContext();

  constructor(options: CreationOptions) {
    // TODO(crbug.com/458180550): Store instance on a "DevToolsContext" instead.
    //                            For now the global is fine as we don't anticipate the MCP server to change settings.
    Common.Settings.Settings.instance({
      forceNew: true,
      ...options.settingsCreationOptions,
    });

    this.context.set(SDK.TargetManager.TargetManager, new SDK.TargetManager.TargetManager());
  }
}
