// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @const
 * @type {string}
 */
export const releaseNoteViewId = 'release-note';

/**
 * @return {!Help.ReleaseNote}
 */
export function latestReleaseNote() {
  if (!Help._latestReleaseNote) {
    /** @type {!Help.ReleaseNote} */
    Help._latestReleaseNote = Help.releaseNoteText.reduce((acc, note) => note.version > acc.version ? note : acc);
  }
  return Help._latestReleaseNote;
}

function _showReleaseNoteIfNeeded() {
  _innerShowReleaseNoteIfNeeded(
      Help._releaseNoteVersionSetting.get(), latestReleaseNote().version,
      Common.settings.moduleSetting('help.show-release-note').get());
}

/**
 * @param {number} lastSeenVersion
 * @param {number} latestVersion
 * @param {boolean} showReleaseNote
 */
function _innerShowReleaseNoteIfNeeded(lastSeenVersion, latestVersion, showReleaseNote) {
  if (!lastSeenVersion) {
    Help._releaseNoteVersionSetting.set(latestVersion);
    return;
  }
  if (!showReleaseNote) {
    return;
  }
  if (lastSeenVersion >= latestVersion) {
    return;
  }
  Help._releaseNoteVersionSetting.set(latestVersion);
  UI.viewManager.showView(releaseNoteViewId, true);
}

/**
 * @implements {Common.Runnable}
 */
export class HelpLateInitialization {
  /**
   * @override
   */
  async run() {
    if (!Host.isUnderTest()) {
      _showReleaseNoteIfNeeded();
    }
  }
}

/**
 * @implements {UI.ActionDelegate}
 */
export class ReleaseNotesActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    Host.InspectorFrontendHost.openInNewTab(latestReleaseNote().link);
    return true;
  }
}

/**
 * @implements {UI.ActionDelegate}
 */
export class ReportIssueActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    Host.InspectorFrontendHost.openInNewTab(
        'https://bugs.chromium.org/p/chromium/issues/entry?template=DevTools+issue');
    return true;
  }
}

/* Legacy exported object */
self.Help = self.Help || {};

/* Legacy exported object */
Help = Help || {};

Help.releaseNoteViewId = releaseNoteViewId;
Help.latestReleaseNote = latestReleaseNote;
Help._innerShowReleaseNoteIfNeeded = _innerShowReleaseNoteIfNeeded;
Help._showReleaseNoteIfNeeded = _showReleaseNoteIfNeeded;

/** @type {!Common.Setting} */
Help._releaseNoteVersionSetting = Common.settings.createSetting('releaseNoteVersionSeen', 0);

/** @typedef {!{title: string, subtitle: string, link: string}} */
Help.ReleaseNoteHighlight;

/**
 * @typedef {!{version: number, header: string, highlights: !Array<!Help.ReleaseNoteHighlight>,
 *    link: string}}
 */
Help.ReleaseNote;

/**
 * @constructor
 */
Help.HelpLateInitialization = HelpLateInitialization;

/**
 * @constructor
 */
Help.ReleaseNotesActionDelegate = ReleaseNotesActionDelegate;

/**
 * @constructor
 */
Help.ReportIssueActionDelegate = ReportIssueActionDelegate;
