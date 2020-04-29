// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import {Issue} from '../../../../front_end/sdk/Issue.js';

export class MockIssuesModel extends Common.ObjectWrapper.ObjectWrapper {
  private _issues: Iterable<Issue>;

  constructor(issues: Iterable<Issue>) {
    super();
    this._issues = issues;
  }
  issues() {
    return this._issues;
  }
  target() {
    return {id: () => 'fake-id'};
  }
}
