// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';

import * as SharedObject from './SharedObject.js';

let isDebugBuild: boolean;
try {
  Platform.DCHECK(() => false);
  isDebugBuild = false;
} catch {
  isDebugBuild = true;
}

const DEVTOOLS_RECORDER_WORLD_NAME = 'devtools_recorder';

class InjectedScript {
  static #injectedScript?: Promise<string>;
  static async get(): Promise<string> {
    if (!this.#injectedScript) {
      this.#injectedScript = (await fetch(
                                  new URL('../injected/injected.generated.js', import.meta.url),
                                  ))
                                 .text();
    }
    return this.#injectedScript;
  }
}

export {isDebugBuild, InjectedScript, DEVTOOLS_RECORDER_WORLD_NAME, SharedObject};
