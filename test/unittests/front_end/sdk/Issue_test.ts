// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {StubIssue} from './StubIssue.js';

describe('Issue', () => {
  it('should store the code', () => {
    const code = 'anExampleIssueCodeString';
    const issue = new StubIssue(code, [], []);
    assert.strictEqual(issue.code(), code);
  });
});
