// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {CookieModel} from './CookieModel.js';
import {CrossOriginEmbedderPolicyIssue} from './CrossOriginEmbedderPolicyIssue.js';
import {AggregatedIssue, Issue} from './Issue.js';  // eslint-disable-line no-unused-vars
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import {NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {Events as ResourceTreeModelEvents, ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';  // eslint-disable-line no-unused-vars
import {SameSiteCookieIssue} from './SameSiteCookieIssue.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars


/**
 * This class generates issues in the front-end based on information provided by the network panel. In the long
 * term, we might move this reporting to the back-end, but the current COVID-19 policy requires us to tone down
 * back-end changes until we are back at normal release cycle.
 */
export class NetworkIssueDetector {
  /**
   * @param {!Target} target
   * @param {!IssuesModel} issuesModel
   */
  constructor(target, issuesModel) {
    this._issuesModel = issuesModel;
    this._networkManager = target.model(NetworkManager);
    if (this._networkManager) {
      this._networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._handleRequestFinished, this);
    }
    for (const request of self.SDK.networkLog.requests()) {
      this._handleRequestFinished({data: request});
    }
  }

  /**
   * @param {!{data:*}} event
   */
  _handleRequestFinished(event) {
    const request = /** @type {!NetworkRequest} */ (event.data);
    const blockedReason = getCoepBlockedReason(request);
    if (blockedReason) {
      this._issuesModel.addIssue(new CrossOriginEmbedderPolicyIssue(blockedReason, request.requestId()));
    }

    /**
     * @param {!NetworkRequest} request
     * @return {?string}
     */
    function getCoepBlockedReason(request) {
      if (!request.wasBlocked()) {
        return null;
      }
      const blockedReason = request.blockedReason() || null;
      if (blockedReason === Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader ||
          blockedReason === Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep ||
          blockedReason === Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage ||
          blockedReason === Protocol.Network.BlockedReason.CorpNotSameSite ||
          blockedReason === Protocol.Network.BlockedReason.CorpNotSameOrigin) {
        return blockedReason;
      }
      return null;
    }
  }

  detach() {
    if (this._networkManager) {
      this._networkManager.removeEventListener(NetworkManagerEvents.RequestFinished, this._handleRequestFinished, this);
    }
  }
}


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
    this._hasSeenMainFrameNavigated = false;

    this._networkManager = target.model(NetworkManager);
    const resourceTreeModel = /** @type {?ResourceTreeModel} */ (target.model(ResourceTreeModel));
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
        ResourceTreeModelEvents.MainFrameNavigated, this._onMainFrameNavigated, this);
    }
    this._networkIssueDetector = null;
    this.ensureEnabled();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onMainFrameNavigated(event) {
    const mainFrame = /** @type {!ResourceTreeFrame} */ (event.data);
    const keptIssues = [];
    for (const issue of this._issues) {
      if (issue.isAssociatedWithRequestId(mainFrame.loaderId)) {
        keptIssues.push(issue);
      }
    }
    this._issues = keptIssues;
    this._aggregatedIssuesByCode.clear();
    for (const issue of this._issues) {
      this._aggregateIssue(issue);
    }
    this._hasSeenMainFrameNavigated = true;
    this.dispatchEventToListeners(Events.FullUpdateRequired);
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
  }

  /**
   * The `IssuesModel` requires at least one `MainFrameNavigated` event. Receiving
   * one implies that we have all the information for accurate issues.
   *
   * @return {boolean}
   */
  reloadForAccurateInformationRequired() {
    return !this._hasSeenMainFrameNavigated;
  }

  ensureEnabled() {
    if (this._enabled) {
      return;
    }

    this._enabled = true;
    this.target().registerAuditsDispatcher(this);
    this._auditsAgent = this.target().auditsAgent();
    this._auditsAgent.enable();
    this._networkIssueDetector = new NetworkIssueDetector(this.target(), this);
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
    this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
    return aggregatedIssue;
  }

  /**
   * @override
   * @param {!Protocol.Audits.InspectorIssue} inspectorIssue
   */
  issueAdded(inspectorIssue) {
    const issues = this._createIssuesFromProtocolIssue(inspectorIssue);
    for (const issue of issues) {
      this.addIssue(issue);
    }
  }

  /**
   * @param {!Issue} issue
   */
  addIssue(issue) {
    this._issues.push(issue);
    this._aggregateIssue(issue);
  }

  /**
   * @return {!Array<!Issue>}
   */
  issues() {
    return this._issues;
  }

  /**
   * Each issue reported by the backend can result in multiple {!Issue} instances.
   * Handlers are simple functions hard-coded into a map. If no handler is found for
   * a given Issue code, the default behavior creates one {!Issue} per incoming backend
   * issue.
   * @param {!Protocol.Audits.InspectorIssue} inspectorIssue} inspectorIssue
   * @return {!Array<!Issue>}
   */
  _createIssuesFromProtocolIssue(inspectorIssue) {
    const handler = issueCodeHandlers.get(inspectorIssue.code);
    if (handler) {
      return handler(this, inspectorIssue.details);
    }

    console.warn(`No handler registered for issue code ${inspectorIssue.code}`);
    return [];
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

/**
 * @type {!Map<!Protocol.Audits.InspectorIssueCode, function(!IssuesModel, !Protocol.Audits.InspectorIssueDetails):!Array<!Issue>>}
 */
const issueCodeHandlers = new Map([
  [
    'SameSiteCookieIssue',
    (model, details) => {
      const issue = new SameSiteCookieIssue('SameSiteCookieIssue', details.sameSiteCookieIssueDetails);
      return [issue];
    }
  ],
]);

/** @enum {symbol} */
export const Events = {
  IssuesCountUpdated: Symbol('IssuesCountUpdated'),
  AggregatedIssueUpdated: Symbol('AggregatedIssueUpdated'),
  FullUpdateRequired: Symbol('FullUpdateRequired'),
};

SDKModel.register(IssuesModel, Capability.Audits, true);
