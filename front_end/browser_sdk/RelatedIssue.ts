// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import {IssuesManager} from './IssuesManager.js';

export type IssuesAssociatable = SDK.NetworkRequest.NetworkRequest|SDK.Cookie.Cookie;

function issuesAssociatedWithNetworkRequest(
    issues: SDK.Issue.Issue[], request: SDK.NetworkRequest.NetworkRequest): SDK.Issue.Issue[] {
  return issues.filter(issue => {
    for (const affectedRequest of issue.requests()) {
      if (affectedRequest.requestId === request.requestId()) {
        return true;
      }
    }
    return false;
  });
}

function issuesAssociatedWithCookie(
    issues: SDK.Issue.Issue[], domain: string, name: string, path: string): SDK.Issue.Issue[] {
  return issues.filter(issue => {
    for (const cookie of issue.cookies()) {
      if (cookie.domain === domain && cookie.name === name && cookie.path === path) {
        return true;
      }
    }
    return false;
  });
}

/**
 * @throws In case obj has an unsupported type (i.e. not part of the IssuesAssociatble union).
 */
export function issuesAssociatedWith(issues: SDK.Issue.Issue[], obj: IssuesAssociatable): SDK.Issue.Issue[] {
  if (obj instanceof SDK.NetworkRequest.NetworkRequest) {
    return issuesAssociatedWithNetworkRequest(issues, obj);
  }
  if (obj instanceof SDK.Cookie.Cookie) {
    return issuesAssociatedWithCookie(issues, obj.domain(), obj.name(), obj.path());
  }
  throw new Error(`issues can not be associated with ${JSON.stringify(obj)}`);
}

export function hasIssues(obj: IssuesAssociatable): boolean {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).length > 0;
}

export function hasIssueOfCategory(obj: IssuesAssociatable, category: symbol): boolean {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).some(issue => issue.getCategory() === category);
}

export async function reveal(obj: IssuesAssociatable, category?: symbol): Promise<void|undefined> {
  const issues = Array.from(IssuesManager.instance().issues());
  const candidates = issuesAssociatedWith(issues, obj).filter(issue => !category || issue.getCategory() === category);
  if (candidates.length > 0) {
    return Common.Revealer.reveal(candidates[0]);
  }
}
