// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as ThemeSupport from '../../legacy/theme_support/theme_support.js';

/**
 * Houses any setup required to run the component docs server. Currently this is
 * only populating the runtime CSS cache but may be extended in the future.
 */
export async function setup(): Promise<void> {
  const setting = {
    get() {
      return 'default';
    },
  } as Common.Settings.Setting<string>;
  ThemeSupport.ThemeSupport.instance({forceNew: true, setting});
}
