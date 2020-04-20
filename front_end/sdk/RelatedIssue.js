// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {Cookie} from './Cookie.js';
import {Issue, IssueCategory} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';
import {NetworkRequest} from './NetworkRequest.js';
import {TargetManager} from './SDKModel.js';

/**
 * @typedef {!NetworkRequest | !Cookie}
 */
// @ts-ignore typedef
export let IssuesAssociatable;

/**
 * @return {!Array<!Issue>}
 */
function issues() {
  const mainTarget = TargetManager.instance().mainTarget();
  if (mainTarget) {
    const model = /** @type {!IssuesModel} */ (mainTarget.model(IssuesModel));
    return model ? model.issues() : [];
  }
  return [];
}

/**
 * @param {!Array<!Issue>} issues
 * @param {!NetworkRequest} request
 * @return {!Array<!Issue>}
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
 * @param {!Array<!Issue>} issues
 * @param {string} domain
 * @param {string} name
 * @param {string} path
 * @return {!Array<!Issue>}
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
 * @param {!Array<!Issue>} issues
 * @param {!IssuesAssociatable} obj
 * @return {!Array<!Issue>}
 * @throws In case obj has an unsupported type (i.e. not part of the IssuesAssociatble union).
 */
export function issuesAssociatedWith(issues, obj) {
  if (obj instanceof NetworkRequest) {
    return issuesAssociatedWithNetworkRequest(issues, obj);
  }
  if (obj instanceof Cookie) {
    return issuesAssociatedWithCookie(issues, obj.domain(), obj.name(), obj.path());
  }
  throw new Error(`issues can not be associated with ${obj}`);
}

/**
 * @param {!IssuesAssociatable} obj
 * @return {boolean}
 */
export function hasIssues(obj) {
  return issuesAssociatedWith(issues(), obj).length > 0;
}

/**
 * @param {!IssuesAssociatable} obj
 * @param {!IssueCategory} category
 * @return {boolean}
 */
export function hasIssueOfCategory(obj, category) {
  return issuesAssociatedWith(issues(), obj).some(issue => issue.getCategory() === category);
}

/**
 * @param {!IssuesAssociatable} obj
 * @param {!IssueCategory} category
 * @return {!Promise<undefined | void>}
 */
export async function reveal(obj, category) {
  const candidates = issuesAssociatedWith(issues(), obj).filter(issue => issue.getCategory() === category);
  if (candidates.length > 0) {
    return Common.Revealer.reveal(candidates[0]);
  }
}
