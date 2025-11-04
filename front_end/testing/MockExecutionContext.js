// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../core/platform/platform.js';
import { assertNotNullOrUndefined } from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
const { urlString } = Platform.DevToolsPath;
export class MockExecutionContext extends SDK.RuntimeModel.ExecutionContext {
    constructor(target) {
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        assertNotNullOrUndefined(runtimeModel);
        super(runtimeModel, 1, 'test id', 'test name', urlString `test origin`, true);
    }
    async evaluate(_options, userGesture, _awaitPromise) {
        assert.isTrue(userGesture);
        return { error: 'test' };
    }
}
//# sourceMappingURL=MockExecutionContext.js.map