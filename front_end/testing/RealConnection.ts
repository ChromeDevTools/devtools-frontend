// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Main from '../entrypoints/main/main.js';

import {deinitializeGlobalVars} from './EnvironmentHelpers.js';

let initialized = false;

interface KarmaConfig {
  config: {remoteDebuggingPort: string};
}

function describeBody(fn: () => void) {
  before('describeWithRealConnection', async function() {
    if (initialized) {
      return;
    }
    await deinitializeGlobalVars();
    await import('../entrypoints/shell/shell.js');
    await import('../panels/elements/elements-meta.js');
    await import('../panels/sensors/sensors-meta.js');
    await import('../entrypoints/inspector_main/inspector_main-meta.js');
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

  beforeEach('describeWithRealConnection', () => {
    resetHostBindingStubState();
    Common.Settings.Settings.instance().clearAll();
  });

  fn();

  afterEach('describeWithRealConnection', async () => {
    const runAfterPendingDispatches = ProtocolClient.InspectorBackend.test.deprecatedRunAfterPendingDispatches;
    if (!runAfterPendingDispatches) {
      throw new Error('Missing deprecatedRunAfterPendingDispatches');
    }
    await new Promise<void>(resolve => runAfterPendingDispatches(resolve));
  });
}

const realConnectionSuites: {title: string, fn: ((this: Mocha.Suite) => void), only: boolean}[] = [];

/** @deprecated Migrate to `describeWithMockConnection`, e2e tests or web test if needed */
export function describeWithRealConnection(title: string, fn: (this: Mocha.Suite) => void) {
  realConnectionSuites.push({title, fn, only: false});
}
// eslint-disable-next-line mocha/no-exclusive-tests
describeWithRealConnection.only = function(title: string, fn: (this: Mocha.Suite) => void) {
  realConnectionSuites.push({title, fn, only: true});
};

export function flushRealConnectionSuits() {
  for (const {title, fn, only} of realConnectionSuites) {
    if (only) {
      // eslint-disable-next-line mocha/no-exclusive-tests
      describe.only(title, function() {
        describeBody(fn.bind(this));
      });
    } else {
      describe(title, function() {
        describeBody(fn.bind(this));
      });
    }
  }
}

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
