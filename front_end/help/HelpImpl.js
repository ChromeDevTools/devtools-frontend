// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {releaseNoteText} from './ReleaseNoteText.js';

/**
 * @const
 * @type {string}
 */
export const releaseNoteViewId = 'release-note';

/**
 * @return {!ReleaseNote}
 */
export function latestReleaseNote() {
  if (!Help._latestReleaseNote) {
    /** @type {!ReleaseNote} */
    Help._latestReleaseNote =
        (self.Help.releaseNoteText || releaseNoteText).reduce((acc, note) => note.version > acc.version ? note : acc);
  }
  return Help._latestReleaseNote;
}

export function showReleaseNoteIfNeeded() {
  innerShowReleaseNoteIfNeeded(
      Help._releaseNoteVersionSetting.get(), latestReleaseNote().version,
      Common.Settings.Settings.instance().moduleSetting('help.show-release-note').get());
}

/**
 * @param {number} lastSeenVersion
 * @param {number} latestVersion
 * @param {boolean} showReleaseNote
 */
export function innerShowReleaseNoteIfNeeded(lastSeenVersion, latestVersion, showReleaseNote) {
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
  UI.ViewManager.ViewManager.instance().showView(releaseNoteViewId, true);
}

/**
 * @implements {Common.Runnable.Runnable}
 */
export class HelpLateInitialization {
  /**
   * @override
   */
  async run() {
    if (!Host.InspectorFrontendHost.isUnderTest()) {
      showReleaseNoteIfNeeded();
    }
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ReleaseNotesActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(latestReleaseNote().link);
    return true;
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ReportIssueActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
        'https://bugs.chromium.org/p/chromium/issues/entry?template=DevTools+issue');
    return true;
  }
}

/** @typedef {!{title: string, subtitle: string, link: string}} */
export let ReleaseNoteHighlight;

/**
 * @typedef {!{version: number, header: string, highlights: !Array<!ReleaseNoteHighlight>,
 *    link: string}}
 */
export let ReleaseNote;
