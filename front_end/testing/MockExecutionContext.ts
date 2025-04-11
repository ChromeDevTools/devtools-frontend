// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';

const {urlString} = Platform.DevToolsPath;

export class MockExecutionContext extends SDK.RuntimeModel.ExecutionContext {
  constructor(target: SDK.Target.Target) {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assertNotNullOrUndefined(runtimeModel);
    super(runtimeModel, 1 as Protocol.Runtime.ExecutionContextId, 'test id', 'test name', urlString`test origin`, true);
  }

  override async evaluate(_options: SDK.RuntimeModel.EvaluationOptions, userGesture: boolean, _awaitPromise: boolean):
      Promise<SDK.RuntimeModel.EvaluationResult> {
    assert.isTrue(userGesture);
    return {error: 'test'};
  }
}
