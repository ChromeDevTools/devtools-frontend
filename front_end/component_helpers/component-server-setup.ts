// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {CSS_RESOURCES_TO_LOAD_INTO_RUNTIME} from './get-stylesheet.js';

/**
 * Houses any setup required to run the component docs server. Currently this is
 * only populating the runtime CSS cache but may be extended in the future.
 */
export async function setup() {
  if (self.Runtime) {
    console.error('poulateRuntimeCacheWithStylesheets found existing Runtime, refusing to overwrite it.');
  }

  self.Runtime = {cachedResources: {}};

  const allPromises = CSS_RESOURCES_TO_LOAD_INTO_RUNTIME.map(resourcePath => {
    return fetch('/' + resourcePath).then(response => response.text()).then(cssText => {
      self.Runtime.cachedResources[resourcePath] = cssText;
    });
  });

  return Promise.all(allPromises);
}
