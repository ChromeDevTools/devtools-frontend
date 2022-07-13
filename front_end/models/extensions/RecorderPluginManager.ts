// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type RecorderExtensionEndpoint} from './RecorderExtensionEndpoint.js';

let instance: RecorderPluginManager|null = null;

export class RecorderPluginManager {
  #plugins: Set<RecorderExtensionEndpoint> = new Set();

  static instance(): RecorderPluginManager {
    if (!instance) {
      instance = new RecorderPluginManager();
    }
    return instance;
  }

  addPlugin(plugin: RecorderExtensionEndpoint): void {
    this.#plugins.add(plugin);
  }

  removePlugin(plugin: RecorderExtensionEndpoint): void {
    this.#plugins.delete(plugin);
  }

  plugins(): RecorderExtensionEndpoint[] {
    return Array.from(this.#plugins.values());
  }
}
