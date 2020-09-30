// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {releaseNoteText} from './ReleaseNoteText.js';

export const releaseVersionSeen = 'releaseNoteVersionSeen';

/**
 * @const
 * @type {string}
 */
export const releaseNoteViewId = 'release-note';

/**
 * @type {!ReleaseNote}
 */
let _latestReleaseNote;

/**
 * @return {!ReleaseNote}
 */
export function latestReleaseNote() {
  /**
   * @type {!Array<!ReleaseNote>}
   */
  // @ts-ignore Included only for layout tests.
  const globalReleaseNotes = self.Help.releaseNoteText;
  if (!_latestReleaseNote) {
    _latestReleaseNote =
        (globalReleaseNotes || releaseNoteText).reduce((acc, note) => note.version > acc.version ? note : acc);
  }
  return _latestReleaseNote;
}

export function showReleaseNoteIfNeeded() {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  const releaseNoteVersionSettingValue = releaseNoteVersionSetting.get();
  innerShowReleaseNoteIfNeeded(
      releaseNoteVersionSettingValue, latestReleaseNote().version,
      Common.Settings.Settings.instance().moduleSetting('help.show-release-note').get());
}

/**
 * @param {number} lastSeenVersion
 * @param {number} latestVersion
 * @param {boolean} showReleaseNote
 *
 */
export function innerShowReleaseNoteIfNeeded(lastSeenVersion, latestVersion, showReleaseNote) {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  if (!lastSeenVersion) {
    releaseNoteVersionSetting.set(latestVersion);
    return;
  }
  if (!showReleaseNote) {
    return;
  }
  if (lastSeenVersion >= latestVersion) {
    return;
  }
  releaseNoteVersionSetting.set(latestVersion);
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
// @ts-ignore typedef
export let ReleaseNoteHighlight;

/**
 * @typedef {!{version: number, header: string, highlights: !Array<!ReleaseNoteHighlight>,
 *    link: string}}
 */
// @ts-ignore typedef
export let ReleaseNote;
