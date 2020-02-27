// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {CookieModel} from './CookieModel.js';
import {Issue} from './Issue.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import {NetworkRequest,  // eslint-disable-line no-unused-vars
        setCookieBlockedReasonToAttribute, setCookieBlockedReasonToUiString,} from './NetworkRequest.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

const connectedIssuesSymbol = Symbol('issues');

/**
 * @implements {Protocol.AuditsDispatcher}
 * @unrestricted
 */
export class IssuesModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._enabled = false;
    this._issues = [];
    this._browserIssues = [];
    this._browserIssuesByCode = new Map();
    this._cookiesModel = target.model(CookieModel);

    const networkManager = target.model(NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._handleRequestFinished, this);
    }

    const resourceTreeModel = /** @type {?ResourceTreeModel} */ (target.model(ResourceTreeModel));
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
        ResourceTreeModelEvents.MainFrameNavigated, this._onMainFrameNavigated, this);
    }
  }

  _onMainFrameNavigated() {
    this._clearIssues();
  }

  _clearIssues() {
    this._issues = [];
    this._browserIssues = [];
    this._browserIssuesByCode = new Map();
    this.dispatchEventToListeners(Events.AllIssuesCleared);
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
   * @override
   * @param {!Protocol.Audits.Issue} payload
   */
  issueAdded(payload) {
    if (!this._browserIssuesByCode.has(payload.code)) {
      const issue = new Issue(payload.code);
      this._browserIssuesByCode.set(payload.code, issue);
      this.dispatchEventToListeners(Events.IssueAdded, issue);
    } else {
      const issue = this._browserIssuesByCode.get(payload.code);
      this.dispatchEventToListeners(Events.IssueUpdated, issue);
    }
  }

  /**
   * @returns {!Iterator<Issue>}
   */
  issues() {
    return this._browserIssuesByCode.values();
  }

   /**
   * @return {number}
   */
  size() {
    return this._browserIssuesByCode.size;
  }

  /**
   * @param {!*} obj
   * @param {!Issue} issue
   */
  static connectWithIssue(obj, issue) {
    if (!obj) {
      return;
    }

    if (!obj[connectedIssuesSymbol]) {
      obj[connectedIssuesSymbol] = [];
    }

    obj[connectedIssuesSymbol].push(issue);
  }

  /**
   * @param {!*} obj
   */
  static hasIssues(obj) {
    if (!obj) {
      return false;
    }

    return obj[connectedIssuesSymbol] && obj[connectedIssuesSymbol].length;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _handleRequestFinished(event) {
    const request = /** @type {!NetworkRequest} */ (event.data);

    const blockedResponseCookies = request.blockedResponseCookies();
    for (const blockedCookie of blockedResponseCookies) {
      const cookie = blockedCookie.cookie;
      if (!cookie) {
        continue;
      }

      const issue = new Issue('SameSiteCookies::SameSiteNoneMissingForThirdParty');

      IssuesModel.connectWithIssue(request, issue);
      IssuesModel.connectWithIssue(cookie, issue);

      this._cookiesModel.addBlockedCookie(
          cookie, blockedCookie.blockedReasons.map(blockedReason => ({
                                                     attribute: setCookieBlockedReasonToAttribute(blockedReason),
                                                     uiString: setCookieBlockedReasonToUiString(blockedReason)
                                                   })));
    }
  }
}

/** @enum {symbol} */
export const Events = {
  Updated: Symbol('Updated'),
  IssueAdded: Symbol('IssueAdded'),
  IssueUpdated: Symbol('IssueUpdated'),
  AllIssuesCleared: Symbol('AllIssuesCleared'),
};

SDKModel.register(IssuesModel, Capability.None, true);
