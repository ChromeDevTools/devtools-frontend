// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

describeWithMockConnection('ExecutionContext', () => {
  function createExecutionContext(target: SDK.Target.Target, name?: string, isDefault?: boolean) {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    return new SDK.RuntimeModel.ExecutionContext(
        runtimeModel, 42 as Protocol.Runtime.ExecutionContextId, 'uniqueId', name ?? 'name',
        'http://www.example.com' as Platform.DevToolsPath.UrlString, Boolean(isDefault));
  }

  it('can be compared based on target type', () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTargetUnderTab = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(
            createExecutionContext(mainFrameTargetUnderTab),
            createExecutionContext(createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTargetUnderTab}))),
        -1);

    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(
            createExecutionContext(createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTargetUnderTab})),
            createExecutionContext(
                createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: mainFrameTargetUnderTab}))),
        -1);

    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(
            createExecutionContext(
                createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: mainFrameTargetUnderTab})),
            createExecutionContext(
                createTarget({type: SDK.Target.Type.SHARED_WORKER, parentTarget: mainFrameTargetUnderTab}))),
        -1);

    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(
            createExecutionContext(
                createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: mainFrameTargetUnderTab})),
            createExecutionContext(
                createTarget({type: SDK.Target.Type.Worker, parentTarget: mainFrameTargetUnderTab}))),
        -1);
  });

  it('can be compared based on target depth', () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(
            createExecutionContext(mainFrameTarget), createExecutionContext(subframeTarget)),
        -1);
  });

  it('can be compared based on defaultness', () => {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    const defaultExecutionContext = createExecutionContext(target, 'name', /* isDefault=*/ true);
    const notDefaultExecutionContext = createExecutionContext(target, 'name', /* isDefault=*/ false);
    assert.strictEqual(
        SDK.RuntimeModel.ExecutionContext.comparator(defaultExecutionContext, notDefaultExecutionContext), -1);
  });

  it('can be compared based on name', () => {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    const executionContextA = createExecutionContext(target, /* name=*/ 'a');
    const executionContextB = createExecutionContext(target, /* name=*/ 'b');
    assert.strictEqual(SDK.RuntimeModel.ExecutionContext.comparator(executionContextA, executionContextB), -1);
  });
});
