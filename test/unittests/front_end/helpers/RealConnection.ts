// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';
import * as Host from '../../../../front_end/core/host/host.js';
import * as ProtocolClient from '../../../../front_end/core/protocol_client/protocol_client.js';
import * as Root from '../../../../front_end/core/root/root.js';
import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import * as Main from '../../../../front_end/entrypoints/main/main.js';

import {deinitializeGlobalVars} from './EnvironmentHelpers.js';

// We want to run tests with real connection after all the other tests, so that
// we can do one time bootstrap of the CDP connection and related globals.
// To do that, we expose a function here that is called in a before hook, thus
// after all other tests were registered but before they got to run.
// In describeWithRealConnection we await this promise and call real `describe`
// only when the promise is resolved. This ensures that tests suites with real
// connection get registered last, which makes mocha also run them last.
export interface StaticTestsLoadedEvent {
  hasOnly: boolean;
}

export let markStaticTestsLoaded: (event: StaticTestsLoadedEvent) => void;
const staticTestsLoaded = new Promise<StaticTestsLoadedEvent>(resolve => {
  markStaticTestsLoaded = resolve;
});

let hasOnly = false;
let initialized = false;

interface KarmaConfig {
  config: {remoteDebuggingPort: string};
}

function describeBody(fn: () => void) {
  before(async function() {
    if (initialized) {
      return;
    }
    await deinitializeGlobalVars();
    await import('../../../../front_end/entrypoints/shell/shell.js');
    await import('../../../../front_end/panels/elements/elements-meta.js');
    await import('../../../../front_end/panels/sensors/sensors-meta.js');
    await import('../../../../front_end/entrypoints/inspector_main/inspector_main-meta.js');
    let response = await fetch('/json/list', {method: 'PUT'});
    const targetList = await response.json();

    // There can be more than one target here. When debugging tests, the "main" test suite run and the debug test suite
    // run happen in different contexts and don't share `initialized`, but the do share the same chrome instance and
    // thus target list.
    const mainTarget = targetList.find((t: {title: string}) => t.title === 'Karma');
    if (!mainTarget) {
      console.error(
          'A target could not be found. This can happen if you are accidentally running multiple instances of Karma at once. Make sure you don\'t have any debug sessions active when trying to run the unittests.');
      throw new Error('Main test target not found');
    }

    const originalTargetId = mainTarget.id;
    response = await fetch('/json/new', {method: 'PUT'});
    const target = await response.json();
    await fetch('/json/activate/' + originalTargetId, {method: 'PUT'});
    /* This value comes from the `client.targetDir` setting in `karma.conf.js` */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const {remoteDebuggingPort} = ((globalThis as unknown as {__karma__: KarmaConfig}).__karma__).config;
    Root.Runtime.Runtime.setQueryParamForTesting('ws', `localhost:${remoteDebuggingPort}/devtools/page/${target.id}`);
    const main = new Main.MainImpl.MainImpl();
    await main.readyForTest();
    initialized = true;
  });

  beforeEach(() => {
    resetHostBindingStubState();
    Common.Settings.Settings.instance().clearAll();
  });

  fn();

  afterEach(async () => {
    const runAfterPendingDispatches = ProtocolClient.InspectorBackend.test.deprecatedRunAfterPendingDispatches;
    if (!runAfterPendingDispatches) {
      throw new Error('Missing deprecatedRunAfterPendingDispatches');
    }
    await new Promise<void>(resolve => runAfterPendingDispatches(resolve));
  });
}

export function describeWithRealConnection(title: string, fn: (this: Mocha.Suite) => void) {
  if (fn.toString().match(/(^|\s)(?:describe|it).only\(['|"][^]+['|"],.*\)/)?.length) {
    // eslint-disable-next-line rulesdir/no_only
    describeWithRealConnection.only(title, fn);
    return;
  }
  staticTestsLoaded
      .then(event => {
        if (hasOnly || event.hasOnly) {
          return;
        }
        describe(title, function() {
          describeBody(fn.bind(this));
        });
      })
      .catch(e => {
        throw e;
      });
}

describeWithRealConnection.only = function(title: string, fn: (this: Mocha.Suite) => void) {
  hasOnly = true;
  // eslint-disable-next-line rulesdir/no_only
  describe.only(title, function() {
    describeBody(fn.bind(this));
  });
};

export async function getExecutionContext(runtimeModel: SDK.RuntimeModel.RuntimeModel):
    Promise<SDK.RuntimeModel.ExecutionContext> {
  let executionContexts = runtimeModel.executionContexts();
  if (!executionContexts.length) {
    await new Promise<void>(resolve => {
      const listener = () => {
        runtimeModel.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, listener);
        executionContexts = runtimeModel.executionContexts();
        resolve();
      };
      runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, listener);
    });
  }
  if (!executionContexts.length) {
    throw new Error('Cannot get executionContext');
  }
  return executionContexts[0];
}

function resetHostBindingStubState() {
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedCountHistograms.splice(0);
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedEnumeratedHistograms.splice(0);
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedPerformanceHistograms.splice(0);
}
