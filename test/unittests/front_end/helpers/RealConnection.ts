// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../../front_end/core/root/root.js';
import * as Main from '../../../../front_end/entrypoints/main/main.js';

import {deinitializeGlobalVars} from './EnvironmentHelpers.js';

// We want to run tests with real connection after all the other tests, so that
// we can do one time bootstrap of the CDP connection and related globals.
// To do that, we expose a function here that is called in a before hook, thus
// after all other tests were registered but before they got to run.
// In describeWithRealConnection we await this promise and call real `describe`
// only when the promise is resolved. This ensures that tests suites with real
// connection get registered last, which makes mocha also run them last.
export let markStaticTestsLoaded: () => void;
const staticTestsLoaded = new Promise<void>(resolve => {
  markStaticTestsLoaded = resolve;
});

let hasOnly = false;
let initialized = false;

interface KarmaConfig {
  config: {remoteDebuggingPort: string};
}

function describeBody(title: string, fn: (this: Mocha.Suite) => void) {
  before(async function() {
    if (initialized) {
      return;
    }
    await deinitializeGlobalVars();
    await import('../../../../front_end/entrypoints/shell/shell.js');
    await import('../../../../front_end/panels/sensors/sensors-meta.js');
    await import('../../../../front_end/entrypoints/inspector_main/inspector_main-meta.js');
    const response = await fetch('/json/new');
    const target = await response.json();
    /* This value comes from the `client.targetDir` setting in `karma.conf.js` */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const {remoteDebuggingPort} = ((globalThis as unknown as {__karma__: KarmaConfig}).__karma__).config;
    Root.Runtime.Runtime.setQueryParamForTesting('ws', `localhost:${remoteDebuggingPort}/devtools/page/${target.id}`);
    const main = new Main.MainImpl.MainImpl();
    await main.readyForTest();
    initialized = true;
  });

  describe(title, fn);
}

export function describeWithRealConnection(title: string, fn: (this: Mocha.Suite) => void) {
  if (fn.toString().match(/(^|\s)it.only\('[^]+',.*\)/)?.length) {
    describeWithRealConnection.only(title, fn);
    return;
  }
  staticTestsLoaded
      .then(() => {
        if (hasOnly) {
          return;
        }
        describe(`real-${title}`, () => {
          describeBody(title, fn);
        });
      })
      .catch(e => {
        throw e;
      });
}

describeWithRealConnection.only = function(title: string, fn: (this: Mocha.Suite) => void) {
  hasOnly = true;
  // eslint-disable-next-line mocha/no-exclusive-tests
  describe.only(`real-${title}`, () => {
    describeBody(title, fn);
  });
};
