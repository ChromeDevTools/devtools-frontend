// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import type * as SDKModule from '../../../../front_end/sdk/sdk.js';

export class MockIssuesModel extends Common.ObjectWrapper.ObjectWrapper {
  private mockIssues: Iterable<SDKModule.Issue.Issue>;

  constructor(issues: Iterable<SDKModule.Issue.Issue>) {
    super();
    this.mockIssues = issues;
  }
  issues() {
    return this.mockIssues;
  }
  target() {
    return {id: () => 'fake-id'};
  }
}
