// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';

import {CookieIssue, CookieIssueSubCategory} from './CookieIssue.js';
import type {Issue, IssueCategory} from './Issue.js';
import {IssuesManager} from './IssuesManager.js';

export type IssuesAssociatable = Readonly<SDK.NetworkRequest.NetworkRequest>|SDK.Cookie.Cookie|string;

function issuesAssociatedWithNetworkRequest(issues: Issue[], request: SDK.NetworkRequest.NetworkRequest): Issue[] {
  return issues.filter(issue => {
    for (const affectedRequest of issue.requests()) {
      if (affectedRequest.requestId === request.requestId()) {
        return true;
      }
    }
    return false;
  });
}

function issuesAssociatedWithCookie(issues: Issue[], domain: string, name: string, path: string): Issue[] {
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
export function issuesAssociatedWith(issues: Issue[], obj: IssuesAssociatable): Issue[] {
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

export function hasIssueOfCategory(obj: IssuesAssociatable, category: IssueCategory): boolean {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).some(issue => issue.getCategory() === category);
}

export function hasThirdPartyPhaseoutCookieIssue(obj: IssuesAssociatable): boolean {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj)
      .some(issue => CookieIssue.getSubCategory(issue.code()) === CookieIssueSubCategory.THIRD_PARTY_PHASEOUT_COOKIE);
}

export function hasThirdPartyPhaseoutCookieIssueForDomain(domain: string): boolean {
  const issues = Array.from(IssuesManager.instance().issues());
  const issuesForDomain = issues.filter(issue => Array.from(issue.cookies()).some(cookie => cookie.domain === domain));
  return issuesForDomain.some(
      issue => CookieIssue.getSubCategory(issue.code()) === CookieIssueSubCategory.THIRD_PARTY_PHASEOUT_COOKIE);
}

export async function reveal(obj: IssuesAssociatable, category?: IssueCategory): Promise<void|undefined> {
  if (typeof obj === 'string') {
    const issue = IssuesManager.instance().getIssueById(obj);
    if (issue) {
      return Common.Revealer.reveal(issue);
    }
  }
  const issues = Array.from(IssuesManager.instance().issues());
  const candidates = issuesAssociatedWith(issues, obj).filter(issue => !category || issue.getCategory() === category);
  if (candidates.length > 0) {
    return Common.Revealer.reveal(candidates[0]);
  }
}
