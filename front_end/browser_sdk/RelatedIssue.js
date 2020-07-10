// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import {IssuesManager} from './IssuesManager.js';

/**
 * @typedef {!SDK.NetworkRequest.NetworkRequest | !SDK.Cookie.Cookie}
 */
// @ts-ignore typedef
export let IssuesAssociatable;

/**
 * @param {!Array<!SDK.Issue.Issue>} issues
 * @param {!SDK.NetworkRequest.NetworkRequest} request
 * @return {!Array<!SDK.Issue.Issue>}
 */
function issuesAssociatedWithNetworkRequest(issues, request) {
  return issues.filter(issue => {
    for (const affectedRequest of issue.requests()) {
      if (affectedRequest.requestId === request.requestId()) {
        return true;
      }
    }
    return false;
  });
}

/**
 * @param {!Array<!SDK.Issue.Issue>} issues
 * @param {string} domain
 * @param {string} name
 * @param {string} path
 * @return {!Array<!SDK.Issue.Issue>}
 */
function issuesAssociatedWithCookie(issues, domain, name, path) {
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
 * @param {!Array<!SDK.Issue.Issue>} issues
 * @param {!IssuesAssociatable} obj
 * @return {!Array<!SDK.Issue.Issue>}
 * @throws In case obj has an unsupported type (i.e. not part of the IssuesAssociatble union).
 */
export function issuesAssociatedWith(issues, obj) {
  if (obj instanceof SDK.NetworkRequest.NetworkRequest) {
    return issuesAssociatedWithNetworkRequest(issues, obj);
  }
  if (obj instanceof SDK.Cookie.Cookie) {
    return issuesAssociatedWithCookie(issues, obj.domain(), obj.name(), obj.path());
  }
  throw new Error(`issues can not be associated with ${JSON.stringify(obj)}`);
}

/**
 * @param {!IssuesAssociatable} obj
 * @return {boolean}
 */
export function hasIssues(obj) {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).length > 0;
}

/**
 * @param {!IssuesAssociatable} obj
 * @param {!SDK.Issue.IssueCategory} category
 * @return {boolean}
 */
export function hasIssueOfCategory(obj, category) {
  const issues = Array.from(IssuesManager.instance().issues());
  return issuesAssociatedWith(issues, obj).some(issue => issue.getCategory() === category);
}

/**
 * @param {!IssuesAssociatable} obj
 * @param {!SDK.Issue.IssueCategory=} category
 * @return {!Promise<undefined | void>}
 */
export async function reveal(obj, category) {
  const issues = Array.from(IssuesManager.instance().issues());
  const candidates = issuesAssociatedWith(issues, obj).filter(issue => !category || issue.getCategory() === category);
  if (candidates.length > 0) {
    return Common.Revealer.reveal(candidates[0]);
  }
}
