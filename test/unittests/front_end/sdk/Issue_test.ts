// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Issue, AggregatedIssue} from '../../../../front_end/sdk/Issue.js';
import {StubIssue} from './StubIssue.js';

describe('Issue', () => {
  it('should always require a code', () => {
    const issue = new Issue('code');
    assert.strictEqual(issue.code(), 'code');
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

  it('deduplicates affected cookies across issues', () => {
    const issue1 = new StubIssue([], ['cookie1']);
    const issue2 = new StubIssue([], ['cookie2']);
    const issue3 = new StubIssue([], ['cookie1', 'cookie2']);

    const aggregatedIssue = new AggregatedIssue('code');
    aggregatedIssue.addInstance(issue1);
    aggregatedIssue.addInstance(issue2);
    aggregatedIssue.addInstance(issue3);

    const actualCookieNames = [...aggregatedIssue.cookies()].map(c => c.name).sort();
    assert.deepStrictEqual(actualCookieNames, ['cookie1', 'cookie2']);
  });
});
