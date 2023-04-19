// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../front_end/generated/protocol.js';
import {assertNotNullOrUndefined} from '../../../../front_end/core/platform/platform.js';

export class MockExecutionContext extends SDK.RuntimeModel.ExecutionContext {
  constructor(target: SDK.Target.Target) {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assertNotNullOrUndefined(runtimeModel);
    super(
        runtimeModel, 1 as Protocol.Runtime.ExecutionContextId, 'test id', 'test name',
        'test origin' as Platform.DevToolsPath.UrlString, true);
  }

  override async evaluate(options: SDK.RuntimeModel.EvaluationOptions, userGesture: boolean, _awaitPromise: boolean):
      Promise<SDK.RuntimeModel.EvaluationResult> {
    assert.isTrue(userGesture);
    return {error: 'test'};
  }
}
