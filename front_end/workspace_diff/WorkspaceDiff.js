// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Diff from '../diff/diff.js';
import * as Host from '../host/host.js';
import * as Workspace from '../workspace/workspace.js';

export class WorkspaceDiffImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(workspace) {
    super();
    /** @type {!WeakMap<!Workspace.UISourceCode.UISourceCode, !UISourceCodeDiff>} */
    this._uiSourceCodeDiffs = new WeakMap();

    /** @type {!Map<!Workspace.UISourceCode.UISourceCode, !Promise>} */
    this._loadingUISourceCodes = new Map();

    /** @type {!Set<!Workspace.UISourceCode.UISourceCode>} */
    this._modifiedUISourceCodes = new Set();
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyChanged, this._uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, this._uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
    workspace.uiSourceCodes().forEach(this._updateModifiedState.bind(this));
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Promise<?Diff.Diff.DiffArray>}
   */
  requestDiff(uiSourceCode) {
    return this._uiSourceCodeDiff(uiSourceCode).requestDiff();
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {function(!Common.EventTarget.EventTargetEvent)} callback
   * @param {!Object=} thisObj
   */
  subscribeToDiffChange(uiSourceCode, callback, thisObj) {
    this._uiSourceCodeDiff(uiSourceCode).addEventListener(Events.DiffChanged, callback, thisObj);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {function(!Common.EventTarget.EventTargetEvent)} callback
   * @param {!Object=} thisObj
   */
  unsubscribeFromDiffChange(uiSourceCode, callback, thisObj) {
    this._uiSourceCodeDiff(uiSourceCode).removeEventListener(Events.DiffChanged, callback, thisObj);
  }

  /**
   * @return {!Array<!Workspace.UISourceCode.UISourceCode>}
   */
  modifiedUISourceCodes() {
    return Array.from(this._modifiedUISourceCodes);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  isUISourceCodeModified(uiSourceCode) {
    return this._modifiedUISourceCodes.has(uiSourceCode) || this._loadingUISourceCodes.has(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!UISourceCodeDiff}
   */
  _uiSourceCodeDiff(uiSourceCode) {
    if (!this._uiSourceCodeDiffs.has(uiSourceCode)) {
      this._uiSourceCodeDiffs.set(uiSourceCode, new UISourceCodeDiff(uiSourceCode));
    }
    return this._uiSourceCodeDiffs.get(uiSourceCode);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _uiSourceCodeChanged(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data.uiSourceCode);
    this._updateModifiedState(uiSourceCode);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _uiSourceCodeAdded(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
    this._updateModifiedState(uiSourceCode);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _uiSourceCodeRemoved(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
    this._removeUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _projectRemoved(event) {
    const project = /** @type {!Workspace.Workspace.Project} */ (event.data);
    for (const uiSourceCode of project.uiSourceCodes()) {
      this._removeUISourceCode(uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _removeUISourceCode(uiSourceCode) {
    this._loadingUISourceCodes.delete(uiSourceCode);
    const uiSourceCodeDiff = this._uiSourceCodeDiffs.get(uiSourceCode);
    if (uiSourceCodeDiff) {
      uiSourceCodeDiff._dispose = true;
    }
    this._markAsUnmodified(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _markAsUnmodified(uiSourceCode) {
    this._uiSourceCodeProcessedForTest();
    if (this._modifiedUISourceCodes.delete(uiSourceCode)) {
      this.dispatchEventToListeners(Events.ModifiedStatusChanged, {uiSourceCode, isModified: false});
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _markAsModified(uiSourceCode) {
    this._uiSourceCodeProcessedForTest();
    if (this._modifiedUISourceCodes.has(uiSourceCode)) {
      return;
    }
    this._modifiedUISourceCodes.add(uiSourceCode);
    this.dispatchEventToListeners(Events.ModifiedStatusChanged, {uiSourceCode, isModified: true});
  }

  _uiSourceCodeProcessedForTest() {
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _updateModifiedState(uiSourceCode) {
    this._loadingUISourceCodes.delete(uiSourceCode);

    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network) {
      this._markAsUnmodified(uiSourceCode);
      return;
    }
    if (uiSourceCode.isDirty()) {
      this._markAsModified(uiSourceCode);
      return;
    }
    if (!uiSourceCode.hasCommits()) {
      this._markAsUnmodified(uiSourceCode);
      return;
    }

    const contentsPromise = Promise.all([
      this.requestOriginalContentForUISourceCode(uiSourceCode),
      uiSourceCode.requestContent().then(deferredContent => deferredContent.content)
    ]);

    this._loadingUISourceCodes.set(uiSourceCode, contentsPromise);
    const contents = await contentsPromise;
    if (this._loadingUISourceCodes.get(uiSourceCode) !== contentsPromise) {
      return;
    }
    this._loadingUISourceCodes.delete(uiSourceCode);

    if (contents[0] !== null && contents[1] !== null && contents[0] !== contents[1]) {
      this._markAsModified(uiSourceCode);
    } else {
      this._markAsUnmodified(uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Promise<?string>}
   */
  requestOriginalContentForUISourceCode(uiSourceCode) {
    return this._uiSourceCodeDiff(uiSourceCode)._originalContent();
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Promise}
   */
  revertToOriginal(uiSourceCode) {
    /**
     * @param {?string} content
     */
    function callback(content) {
      if (typeof content !== 'string') {
        return;
      }

      uiSourceCode.addRevision(content);
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.RevisionApplied);
    return this.requestOriginalContentForUISourceCode(uiSourceCode).then(callback);
  }
}

export class UISourceCodeDiff extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  constructor(uiSourceCode) {
    super();
    this._uiSourceCode = uiSourceCode;
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeChanged, this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeChanged, this);
    this._requestDiffPromise = null;
    this._pendingChanges = null;
    this._dispose = false;
  }

  _uiSourceCodeChanged() {
    if (this._pendingChanges) {
      clearTimeout(this._pendingChanges);
      this._pendingChanges = null;
    }
    this._requestDiffPromise = null;

    const content = this._uiSourceCode.content();
    const delay = (!content || content.length < 65536) ? 0 : UpdateTimeout;
    this._pendingChanges = setTimeout(emitDiffChanged.bind(this), delay);

    /**
     * @this {UISourceCodeDiff}
     */
    function emitDiffChanged() {
      if (this._dispose) {
        return;
      }
      this.dispatchEventToListeners(Events.DiffChanged);
      this._pendingChanges = null;
    }
  }

  /**
   * @return {!Promise<?Diff.Diff.DiffArray>}
   */
  requestDiff() {
    if (!this._requestDiffPromise) {
      this._requestDiffPromise = this._innerRequestDiff();
    }
    return this._requestDiffPromise;
  }

  /**
   * @return {!Promise<?string>}
   */
  async _originalContent() {
    const originalNetworkContent =
        self.Persistence.networkPersistenceManager.originalContentForUISourceCode(this._uiSourceCode);
    if (originalNetworkContent) {
      return originalNetworkContent;
    }

    const content = await this._uiSourceCode.project().requestFileContent(this._uiSourceCode);
    return content.content || content.error || '';
  }

  /**
   * @return {!Promise<?Diff.Diff.DiffArray>}
   */
  async _innerRequestDiff() {
    if (this._dispose) {
      return null;
    }

    const baseline = await this._originalContent();
    if (baseline.length > 1024 * 1024) {
      return null;
    }
    // ------------ ASYNC ------------
    if (this._dispose) {
      return null;
    }

    let current = this._uiSourceCode.workingCopy();
    if (!current && !this._uiSourceCode.contentLoaded()) {
      current = (await this._uiSourceCode.requestContent()).content;
    }

    if (current.length > 1024 * 1024) {
      return null;
    }

    if (this._dispose) {
      return null;
    }

    if (current === null || baseline === null) {
      return null;
    }
    return Diff.Diff.DiffWrapper.lineDiff(baseline.split(/\r\n|\n|\r/), current.split(/\r\n|\n|\r/));
  }
}

/**
 * @enum {symbol}
 */
export const Events = {
  DiffChanged: Symbol('DiffChanged'),
  ModifiedStatusChanged: Symbol('ModifiedStatusChanged')
};

/** @type {?WorkspaceDiffImpl} */
let _instance = null;

/**
 * @return {!WorkspaceDiffImpl}
 */
export function workspaceDiff() {
  if (!_instance) {
    _instance = new WorkspaceDiffImpl(Workspace.Workspace.WorkspaceImpl.instance());
  }
  return _instance;
}

export class DiffUILocation {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  constructor(uiSourceCode) {
    this.uiSourceCode = uiSourceCode;
  }
}

export const UpdateTimeout = 200;
