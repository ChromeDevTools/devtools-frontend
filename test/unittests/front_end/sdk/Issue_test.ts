// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Issue, AggregatedIssue} from '../../../../front_end/sdk/Issue.js';
import {StubIssue} from './StubIssue.js';

describe('Issue', () => {
  it('should always require a code', () => {
    const issue = new Issue('code');
    assert.equal(issue.code(), 'code');
  });
});

describe('AggregateIssue', () => {
  it('deduplicates network requests across issues', () => {
    const issue1 = new StubIssue(['id1', 'id2'], []);
    const issue2 = new StubIssue(['id1'], []);

    const aggregatedIssue = new AggregatedIssue('code');
    aggregatedIssue.addInstance(issue1);
    aggregatedIssue.addInstance(issue2);

    const actualRequestIds = [...aggregatedIssue.requests()].map(r => r.requestId).sort();
    assert.deepStrictEqual(actualRequestIds, ['id1', 'id2']);
  });
});
