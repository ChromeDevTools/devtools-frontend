// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {CookieModel} from './CookieModel.js';
import {AggregatedIssue, Issue} from './Issue.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import {NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import * as RelatedIssue from './RelatedIssue.js';
import {Events as ResourceTreeModelEvents, ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';  // eslint-disable-line no-unused-vars
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
      const resources = {requests: [{requestId: request.requestId()}]};
      const code = `CrossOriginEmbedderPolicy::${this._toCamelCase(blockedReason)}`;
      this._issuesModel.issueAdded({code, resources});
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

  /**
   * @param {string} string
   * @return {string}
   */
  _toCamelCase(string) {
    const result = string.replace(/-\p{ASCII}/gu, match => match.substr(1).toUpperCase());
    return result.replace(/^./, match => match.toUpperCase());
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
      } else {
        this._disconnectIssue(issue);
      }
    }
    this._issues = keptIssues;
    this._aggregatedIssuesByCode.clear();
    for (const issue of this._issues) {
      this._aggregateIssue(issue);
    }
    this._hasSeenMainFrameNavigated = true;
    this.dispatchEventToListeners(Events.FullUpdateRequired);
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
    return aggregatedIssue;
  }

  /**
   * @override
   * TODO(chromium:1063765): Strengthen types.
   * @param {*} inspectorIssue
   */
  issueAdded(inspectorIssue) {
    const issues = this._createIssuesFromProtocolIssue(inspectorIssue);
    this._issues.push(...issues);

    for (const issue of issues) {
      this._connectIssue(issue);
      const aggregatedIssue = this._aggregateIssue(issue);
      this.dispatchEventToListeners(Events.AggregatedIssueUpdated, aggregatedIssue);
    }
  }

  /**
   * Each issue reported by the backend can result in multiple {!Issue} instances.
   * Handlers are simple functions hard-coded into a map. If no handler is found for
   * a given Issue code, the default behavior creates one {!Issue} per incoming backend
   * issue.
   * TODO(chromium:1063765): Strengthen types.
   * @param {*} inspectorIssue} inspectorIssue
   * @return {!Array<!Issue>}
   */
  _createIssuesFromProtocolIssue(inspectorIssue) {
    const handler = issueCodeHandlers.get(inspectorIssue.code);
    if (handler) {
      // TODO(chromium:1063765): Pass the details object here, not the full inspector issue.
      return handler(this, inspectorIssue);
    }

    return [new Issue(inspectorIssue.code, inspectorIssue.resources)];
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

/**
 * TODO(chromium:1063765): Change the type (once the protocol/backend changes have landed) to:
 *   !Map<!Protocol.Audits.InspectorIssueCode, function(!IssuesModel, !Protocol.Audits.InspectorIssueDetails):!Array<!Issue>>
 *
 * @type {!Map<string, function(!IssuesModel, *):!Array<!Issue>>}
 */
const issueCodeHandlers = new Map([]);

/** @enum {symbol} */
export const Events = {
  AggregatedIssueUpdated: Symbol('AggregatedIssueUpdated'),
  FullUpdateRequired: Symbol('FullUpdateRequired'),
};

SDKModel.register(IssuesModel, Capability.Audits, true);
