// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import {StubIssue} from './StubIssue.js';

describe('issuesAssociatedWith', () => {
  const requestId1 = 'r0' as Protocol.Network.RequestId;
  const requestId2 = 'r1' as Protocol.Network.RequestId;

  it('should return no issues if no issues exist', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        requestId1, Platform.DevToolsPath.EmptyUrlString, Platform.DevToolsPath.EmptyUrlString, null, null, null);
    assert.strictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith([], request).length, 0);
  });

  it('should return no issues if issues dont affect any resources', () => {
    const issue = new StubIssue('code', [], []);
    const request = SDK.NetworkRequest.NetworkRequest.create(
        requestId1, Platform.DevToolsPath.EmptyUrlString, Platform.DevToolsPath.EmptyUrlString, null, null, null);

    assert.strictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith([issue], request).length, 0);
  });

  it('should correctly filter issues associated with a given request id', () => {
    const issue1 = StubIssue.createFromRequestIds([requestId1, requestId2]);
    const issue2 = StubIssue.createFromRequestIds([requestId1]);
    const issues = [issue1, issue2];

    const request1 = SDK.NetworkRequest.NetworkRequest.create(
        requestId1, Platform.DevToolsPath.EmptyUrlString, Platform.DevToolsPath.EmptyUrlString, null, null, null);
    const request2 = SDK.NetworkRequest.NetworkRequest.create(
        requestId2, Platform.DevToolsPath.EmptyUrlString, Platform.DevToolsPath.EmptyUrlString, null, null, null);

    assert.deepStrictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, request1), issues);
    assert.deepStrictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, request2), [issue1]);
  });

  function createTestCookie(name: string): SDK.Cookie.Cookie {
    const cookie = new SDK.Cookie.Cookie(name, '');
    cookie.addAttribute('domain', '');
    cookie.addAttribute('path', '');
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

    assert.deepStrictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, cookie1), [issue1, issue3]);
    assert.deepStrictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, cookie2), [issue1]);
    assert.deepStrictEqual(IssuesManager.RelatedIssue.issuesAssociatedWith(issues, cookie3), [issue2]);
  });
});
