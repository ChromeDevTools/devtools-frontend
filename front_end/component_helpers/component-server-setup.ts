// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as ThemeSupport from '../theme_support/theme_support.js';

import {CSS_RESOURCES_TO_LOAD_INTO_RUNTIME} from './get-stylesheet.js';

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

  const allPromises = CSS_RESOURCES_TO_LOAD_INTO_RUNTIME.map(resourcePath => {
    return fetch('/front_end/' + resourcePath).then(response => response.text()).then(cssText => {
      Root.Runtime.cachedResources.set(resourcePath, cssText);
    });
  });

  await Promise.all(allPromises);
}
