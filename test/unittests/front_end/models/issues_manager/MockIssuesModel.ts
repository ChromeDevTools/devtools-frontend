// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';

export class MockIssuesModel extends Common.ObjectWrapper.ObjectWrapper<SDK.IssuesModel.EventTypes> {
  private mockIssues: Iterable<IssuesManager.Issue.Issue>;

  constructor(issues: Iterable<IssuesManager.Issue.Issue>) {
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
