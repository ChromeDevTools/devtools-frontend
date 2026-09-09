// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {StubIssue} from '../../testing/StubIssue.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

describe('issuesAssociatedWith', () => {
  const requestId1 = 'r0';
  const requestId2 = 'r1';

  it('should return no issues if no issues exist', () => {
    const request = createNetworkRequest({requestId: requestId1});
    assert.lengthOf(IssuesManager.RelatedIssue.issuesAssociatedWith([], request), 0);
  });

  it('should return no issues if issues dont affect any resources', () => {
    const issue = new StubIssue('code', [], []);
    const request = createNetworkRequest({requestId: requestId1});

    assert.lengthOf(IssuesManager.RelatedIssue.issuesAssociatedWith([issue], request), 0);
  });

  it('should correctly filter issues associated with a given request id', () => {
    const issue1 = StubIssue.createFromRequestIds([requestId1, requestId2]);
    const issue2 = StubIssue.createFromRequestIds([requestId1]);
    const issues = [issue1, issue2];

    const request1 = createNetworkRequest({requestId: requestId1});
    const request2 = createNetworkRequest({requestId: requestId2});

    assert.deepEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, request1), issues);
    assert.deepEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, request2), [issue1]);
  });

  function createTestCookie(name: string): SDK.Cookie.Cookie {
    const cookie = new SDK.Cookie.Cookie(name, '');
    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, '');
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, '');
    return cookie;
  }

  it('should correctly filter issues associated with a cookie', () => {
    const issue1 = StubIssue.createFromCookieNames(['c1', 'c2']);
    const issue2 = StubIssue.createFromCookieNames(['c3']);
    const issue3 = StubIssue.createFromCookieNames(['c1']);
    const issues = [issue1, issue2, issue3];

    const cookie1 = createTestCookie('c1');
    const cookie2 = createTestCookie('c2');
    const cookie3 = createTestCookie('c3');

    assert.deepEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, cookie1), [issue1, issue3]);
    assert.deepEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, cookie2), [issue1]);
    assert.deepEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, cookie3), [issue2]);
  });
});
