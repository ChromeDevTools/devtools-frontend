// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


class Issue {
  constructor(category, name, data) {
    this._category = category;
    this._name = name;
    this._data = data;
  }
}

Issue.Categories = {
  SameSite: Symbol('SameSite'),
};

const connectedIssuesSymbol = Symbol('issues');

/**
 * @unrestricted
 */
export default class IssuesModel extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    const networkManager = target.model(SDK.NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this._handleRequestFinished, this);
    }

    this._cookiesModel = target.model(SDK.CookieModel);

    this._issues = [];
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
   * @param {!Common.Event} event
   */
  _handleRequestFinished(event) {
    const request = /** @type {!SDK.NetworkRequest} */ (event.data);

    const blockedResponseCookies = request.blockedResponseCookies();
    for (const blockedCookie of blockedResponseCookies) {
      const cookie = blockedCookie.cookie;
      if (!cookie) {
        continue;
      }

      const reason = blockedCookie.blockedReasons[0];
      const issue = new Issue(Issue.Categories.SameSite, reason, {request, cookie});

      IssuesModel.connectWithIssue(request, issue);
      IssuesModel.connectWithIssue(cookie, issue);

      this._cookiesModel.addBlockedCookie(
          cookie,
          blockedCookie.blockedReasons.map(
              blockedReason => ({
                attribute: SDK.NetworkRequest.setCookieBlockedReasonToAttribute(blockedReason),
                uiString: SDK.NetworkRequest.setCookieBlockedReasonToUiString(blockedReason)
              })));
    }
  }
}

/* Legacy exported object */
self.SDK = self.SDK || {};

/* Legacy exported object */
SDK = SDK || {};

/** @constructor */
SDK.IssuesModel = IssuesModel;

SDK.SDKModel.register(IssuesModel, SDK.Target.Capability.None, true);
