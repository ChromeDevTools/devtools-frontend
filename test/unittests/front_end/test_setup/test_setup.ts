// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * This file is automatically loaded and run by Karma because it automatically
 * loads and injects all *.js files it finds.
 */
import * as ComponentHelpers from '../../../../front_end/component_helpers/component_helpers.js';
import * as Root from '../../../../front_end/root/root.js';

import {resetTestDOM} from '../helpers/DOMHelpers.js';

beforeEach(resetTestDOM);

interface KarmaConfig {
  config: {targetDir: string}
}

before(async function() {
  /* This value comes from the `client.targetDir` setting in `karma.conf.js` */
  const {targetDir} = ((globalThis as unknown as {__karma__: KarmaConfig}).__karma__).config;

  /* Larger than normal timeout because we've seen some slowness on the bots */
  this.timeout(10000);

  /*
 * The getStylesheet helper in components reads styles out of the runtime cache.
 * In a proper build this is populated but in test runs because we don't load
 * all of DevTools it's not. Therefore we fetch all the CSS files and populate
 * the cache before any tests are run.
 *
 * The out/Release/gen/front_end URL is prepended so within the Karma config we can proxy
 * them through to the right place, respecting Karma's ROOT_DIRECTORY setting.
 */
  const allPromises = ComponentHelpers.GetStylesheet.CSS_RESOURCES_TO_LOAD_INTO_RUNTIME.map(resourcePath => {
    const pathWithKarmaPrefix = `/base/${targetDir}/front_end/${resourcePath}`;
    return fetch(pathWithKarmaPrefix)
        .then(response => {
          if (response.status > 399) {
            throw new Error(`Error preloading CSS file: ${pathWithKarmaPrefix}: ${response.status}`);
          }
          return response.text();
        })
        .then(cssText => {
          Root.Runtime.cachedResources.set(resourcePath, cssText);
        });
  });
  return Promise.all(allPromises);
});

after(() => {
  Root.Runtime.cachedResources.clear();
});
