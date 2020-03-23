// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {CookieModel} from './CookieModel.js';
import {AggregatedIssue, Issue} from './Issue.js';
import {NetworkManager} from './NetworkManager.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

const connectedIssueSymbol = Symbol('issue');

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
    this._issues = this._issues.filter(issue => issue.isAssociatedWithRequestId(mainFrame.loaderId));
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
    const aggregatedIssue = this._aggregateIssue(issue);
    this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
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

  /**
   * @param {!*} obj
   * TODO(chromium:1063765): Strengthen types.
   * @param {!Issue} issue
   */
  static connectWithIssue(obj, issue) {
    if (!obj) {
      return;
    }

    if (!obj[connectedIssueSymbol]) {
      obj[connectedIssueSymbol] = new Set();
    }

    obj[connectedIssueSymbol].add(issue);
  }

  /**
   * @param {!*} obj
   * @returns {boolean}
   */
  static hasIssues(obj) {
    return !!obj && obj[connectedIssueSymbol] && obj[connectedIssueSymbol].size;
  }
}

/** @enum {symbol} */
export const Events = {
  AggregatedIssueUpdated: Symbol('AggregatedIssueUpdated'),
  FullUpdateRequired: Symbol('FullUpdateRequired'),
};

SDKModel.register(IssuesModel, Capability.None, true);
