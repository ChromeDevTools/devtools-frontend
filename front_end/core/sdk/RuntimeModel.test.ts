// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

import type * as Protocol from '../../generated/protocol.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('ExecutionContext', () => {
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  function createExecutionContext(target: SDK.Target.Target, name?: string, isDefault?: boolean) {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    return new SDK.RuntimeModel.ExecutionContext(
        runtimeModel, 42 as Protocol.Runtime.ExecutionContextId, 'uniqueId', name ?? 'name',
        urlString`http://www.example.com`, Boolean(isDefault));
  }

  it('can be compared based on target type', () => {
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTargetUnderTab = universe.createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    assert.strictEqual(SDK.RuntimeModel.ExecutionContext.comparator(
                           createExecutionContext(mainFrameTargetUnderTab),
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.FRAME, parentTarget: mainFrameTargetUnderTab}))),
                       -1);

    assert.strictEqual(SDK.RuntimeModel.ExecutionContext.comparator(
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.FRAME, parentTarget: mainFrameTargetUnderTab})),
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.ServiceWorker, parentTarget: mainFrameTargetUnderTab}))),
                       -1);

    assert.strictEqual(SDK.RuntimeModel.ExecutionContext.comparator(
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.ServiceWorker, parentTarget: mainFrameTargetUnderTab})),
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.SHARED_WORKER, parentTarget: mainFrameTargetUnderTab}))),
                       -1);

    assert.strictEqual(SDK.RuntimeModel.ExecutionContext.comparator(
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.ServiceWorker, parentTarget: mainFrameTargetUnderTab})),
                           createExecutionContext(universe.createTarget(
                               {type: SDK.Target.Type.Worker, parentTarget: mainFrameTargetUnderTab}))),
                       -1);
  });

  it('can be compared based on target depth', () => {
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = universe.createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = universe.createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(
            createExecutionContext(mainFrameTarget), createExecutionContext(subframeTarget)),
        -1);
  });

  it('can be compared based on defaultness', () => {
    const target = universe.createTarget({type: SDK.Target.Type.FRAME});
    const defaultExecutionContext = createExecutionContext(target, 'name', /* isDefault=*/ true);
    const notDefaultExecutionContext = createExecutionContext(target, 'name', /* isDefault=*/ false);
    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(defaultExecutionContext, notDefaultExecutionContext), -1);
  });

  it('can be compared based on name', () => {
    const target = universe.createTarget({type: SDK.Target.Type.FRAME});
    const executionContextA = createExecutionContext(target, /* name=*/ 'a');
    const executionContextB = createExecutionContext(target, /* name=*/ 'b');
    assert.strictEqual(SDK.RuntimeModel.ExecutionContext.comparator(executionContextA, executionContextB), -1);
  });
});
