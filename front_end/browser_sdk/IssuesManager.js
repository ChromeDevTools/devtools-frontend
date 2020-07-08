// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/** @type {?IssuesManager} */
let issuesManagerInstance = null;

/**
 * The `IssuesManager` is the central storage for issues. It collects issues from all the
 * `IssuesModel` instances in the page, and deduplicates them wrt their primary key.
 * It also takes care of clearing the issues when it sees a main-frame navigated event.
 * Any client can subscribe to the events provided, and/or query the issues via the public
 * interface.
 *
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.IssuesModel.IssuesModel>}
 */
export class IssuesManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {!WeakMap<!SDK.IssuesModel.IssuesModel, !Common.EventTarget.EventDescriptor>} */
    this._eventListeners = new WeakMap();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.IssuesModel.IssuesModel, this);
    /** @type {!Map<string, !SDK.Issue.Issue>} */
    this._issues = new Map();
    this._hasSeenTopFrameNavigated = false;
    SDK.FrameManager.FrameManager.instance().addEventListener(
        SDK.FrameManager.Events.TopFrameNavigated, this._onTopFrameNavigated, this);
  }

  /**
   * @param {{forceNew: boolean}} opts
   * @return {!IssuesManager}
   */
  static instance({forceNew} = {forceNew: false}) {
    if (!issuesManagerInstance || forceNew) {
      issuesManagerInstance = new IssuesManager();
    }

    return issuesManagerInstance;
  }

  /**
   * Once we have seen at least one `TopFrameNavigated` event, we can be reasonably sure
   * that we also collected issues that were reported during the navigation to the current
   * page. If we haven't seen a main frame navigated, we might have missed issues that arose
   * during navigation.
   *
   * @return {boolean}
   */
  reloadForAccurateInformationRequired() {
    return !this._hasSeenTopFrameNavigated;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onTopFrameNavigated(event) {
    const {frame} = /** @type {!{frame:!SDK.ResourceTreeModel.ResourceTreeFrame}} */ (event.data);
    const keptIssues = new Map();
    for (const [key, issue] of this._issues.entries()) {
      if (issue.isAssociatedWithRequestId(frame.loaderId)) {
        keptIssues.set(key, issue);
      }
    }
    this._issues = keptIssues;
    this._hasSeenTopFrameNavigated = true;
    this.dispatchEventToListeners(Events.FullUpdateRequired);
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
  }

  /**
   * @override
   * @param {!SDK.IssuesModel.IssuesModel} issuesModel
   */
  modelAdded(issuesModel) {
    const listener = issuesModel.addEventListener(SDK.IssuesModel.Events.IssueAdded, this._issueAdded, this);
    this._eventListeners.set(issuesModel, listener);
  }

  /**
   * @override
   * @param {!SDK.IssuesModel.IssuesModel} issuesModel
   */
  modelRemoved(issuesModel) {
    const listener = this._eventListeners.get(issuesModel);
    if (listener) {
      Common.EventTarget.EventTarget.removeEventListeners([listener]);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _issueAdded(event) {
    const {issuesModel, issue} =
        /** @type {{issuesModel: !SDK.IssuesModel.IssuesModel, issue: !SDK.Issue.Issue}} */ (event.data);
    // Ignore issues without proper description; they are invisible to the user and only cause confusion.
    if (!issue.getDescription()) {
      return;
    }
    const primaryKey = issue.primaryKey();
    if (this._issues.has(primaryKey)) {
      return;
    }
    this._issues.set(primaryKey, issue);
    this.dispatchEventToListeners(Events.IssueAdded, {issuesModel, issue});
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
  }

  /**
   * @return {!Iterable<!SDK.Issue.Issue>}
   */
  issues() {
    return this._issues.values();
  }

  /**
   * @return {number}
   */
  numberOfIssues() {
    return this._issues.size;
  }
}

/** @enum {symbol} */
export const Events = {
  IssuesCountUpdated: Symbol('IssuesCountUpdated'),
  IssueAdded: Symbol('IssueAdded'),
  FullUpdateRequired: Symbol('FullUpdateRequired'),
};
