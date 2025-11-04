// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
export class MockIssuesModel extends Common.ObjectWrapper.ObjectWrapper {
    mockIssues;
    constructor(issues) {
        super();
        this.mockIssues = issues;
    }
    issues() {
        return this.mockIssues;
    }
    target() {
        return { id: () => 'fake-id' };
    }
}
//# sourceMappingURL=MockIssuesModel.js.map