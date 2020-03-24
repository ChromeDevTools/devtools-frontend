// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {CookieModel} from './CookieModel.js';
import {AggregatedIssue, Issue} from './Issue.js';
import {NetworkManager} from './NetworkManager.js';
import {NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import * as RelatedIssue from './RelatedIssue.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars


/**
 * @implements {Protocol.AuditsDispatcher}
 */
export class IssuesModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._enabled = false;
    /** @type {!Array<!Issue>} */
    this._issues = [];
    /** @type {!Map<string, !AggregatedIssue>} */
    this._aggregatedIssuesByCode = new Map();
    this._cookiesModel = target.model(CookieModel);
    /** @type {*} */
    this._auditsAgent = null;

    this._networkManager = target.model(NetworkManager);
    const resourceTreeModel = /** @type {?ResourceTreeModel} */ (target.model(ResourceTreeModel));
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
        ResourceTreeModelEvents.MainFrameNavigated, this._onMainFrameNavigated, this);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onMainFrameNavigated(event) {
    const mainFrame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    const keptIssues = [];
    for (const issue of this._issues) {
      if (issue.isAssociatedWithRequestId(mainFrame.loaderId)) {
        keptIssues.push(issue);
      } else {
        this._disconnectIssue(issue);
      }
    }
    this._issues = keptIssues;
    this._aggregatedIssuesByCode.clear();
    for (const issue of this._issues) {
      this._aggregateIssue(issue);
    }
    this.dispatchEventToListeners(Events.FullUpdateRequired);
  }

  ensureEnabled() {
    if (this._enabled) {
      return;
    }

    this._enabled = true;
    this.target().registerAuditsDispatcher(this);
    this._auditsAgent = this.target().auditsAgent();
    this._auditsAgent.enable();
  }

  /**
   * @param {!Issue} issue
   * @returns {!AggregatedIssue}
   */
  _aggregateIssue(issue) {
    if (!this._aggregatedIssuesByCode.has(issue.code())) {
      this._aggregatedIssuesByCode.set(issue.code(), new AggregatedIssue(issue.code()));
    }
    const aggregatedIssue = this._aggregatedIssuesByCode.get(issue.code());
    aggregatedIssue.addInstance(issue);
    return aggregatedIssue;
  }

  /**
   * @override
   * TODO(chromium:1063765): Strengthen types.
   * @param {*} inspectorIssue
   */
  issueAdded(inspectorIssue) {
    const issue = new Issue(inspectorIssue.code, inspectorIssue.resources);
    this._issues.push(issue);
    this._connectIssue(issue);
    const aggregatedIssue = this._aggregateIssue(issue);
    this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
  }

  /**
   *
   * @param {!Issue} issue
   */
  _connectIssue(issue) {
    const resources = issue.resources();
    if (!resources) {
      return;
    }
    if (resources.requests) {
      for (const resourceRequest of resources.requests) {
        const request =
            /** @type {?NetworkRequest} */ (
                self.SDK.networkLog.requests().find(r => r.requestId() === resourceRequest.requestId));
        if (request) {
          // Connect the real network request with this issue and vice versa.
          RelatedIssue.connect(request, issue.getCategory(), issue);
          resourceRequest.request = request;
        }
      }
    }
  }

  /**
   *
   * @param {!Issue} issue
   */
  _disconnectIssue(issue) {
    const resources = issue.resources();
    if (!resources) {
      return;
    }
    if (resources.requests) {
      for (const resourceRequest of resources.requests) {
        const request =
            /** @type {?NetworkRequest} */ (
                self.SDK.networkLog.requests().find(r => r.requestId() === resourceRequest.requestId));
        if (request) {
          // Disconnect the real network request from this issue;
          RelatedIssue.disconnect(request, issue.getCategory(), issue);
        }
      }
    }
  }

  /**
   * @returns {!Iterable<AggregatedIssue>}
   */
  aggregatedIssues() {
    return this._aggregatedIssuesByCode.values();
  }

  /**
   * @return {number}
   */
  numberOfAggregatedIssues() {
    return this._aggregatedIssuesByCode.size;
  }
}

/** @enum {symbol} */
export const Events = {
  AggregatedIssueUpdated: Symbol('AggregatedIssueUpdated'),
  FullUpdateRequired: Symbol('FullUpdateRequired'),
};

SDKModel.register(IssuesModel, Capability.Network, true);
