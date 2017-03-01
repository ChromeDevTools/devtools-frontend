// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @return {!Help.ReleaseNote}
 */
Help.latestReleaseNote = function() {
  if (!Help._latestReleaseNote) {
    /** @type {!Help.ReleaseNote} */
    Help._latestReleaseNote = Help._getReleaseNoteByVersion(Help.browserVersion());
  }
  return Help._latestReleaseNote;
};

/**
 * @param {number} version
 * @return {!Help.ReleaseNote}
 */
Help._getReleaseNoteByVersion = function(version) {
  var originalVersion = version;
  while (version) {
    var note = Help.releaseNoteText.find(note => note.version === version);
    if (note)
      return note;
    version--;
  }
  console.error(`Unable to find release note for version ${originalVersion} - using last release note as fallback`);
  return /** @type {!Help.ReleaseNote} */ (Help.releaseNoteText.peekLast());
};

/**
 * @return {!Common.Setting}
 */
Help.releaseNoteVersionSetting = function() {
  if (!Help._releaseNoteVersionSetting) {
    /** @type {!Common.Setting} */
    Help._releaseNoteVersionSetting = Common.settings.createSetting('releaseNoteVersionSeen', 0, false);
  }
  return Help._releaseNoteVersionSetting;
};

Help.showReleaseNoteIfNeeded = function() {
  Help._showReleaseNoteIfNeeded(Help.releaseNoteVersionSetting().get(), Help.browserVersion());
};

/**
 * @param {number} lastSeenVersion
 * @param {number} browserVersion
 */
Help._showReleaseNoteIfNeeded = function(lastSeenVersion, browserVersion) {
  if (!Runtime.experiments.isEnabled('releaseNote'))
    return;
  if (lastSeenVersion >= browserVersion)
    return;
  if (Help.latestReleaseNote().version !== browserVersion)
    return;
  Help.releaseNoteVersionSetting().set(Help.browserVersion());
  UI.inspectorView.showPanel(Help._releaseNoteViewId);
};

/**
 * @return {number}
 */
Help.browserVersion = function() {
  if (!Help._browserVersion) {
    var chromeRegex = new RegExp('(?:^|\\W)Chrome/(\\d+)');
    var chromeMatch = navigator.userAgent.match(chromeRegex);
    /** @type {number} */
    Help._browserVersion = Number(chromeMatch[1]);
  }
  return Help._browserVersion;
};

/**
 * @const
 * @type {string}
 */
Help._releaseNoteViewId = 'release-note';

/** @typedef {!{src: string}} */
Help.ReleaseNoteImage;

/** @typedef {!{text: string, link: (string | undefined)}} */
Help.ReleaseNoteHighlightContent;

/** @typedef {!{contents: !Array<!Help.ReleaseNoteHighlightContent>, featured: (boolean | undefined)}} */
Help.ReleaseNoteHighlight;

/**
 * @typedef {!{version: number, highlights: !Array<!Help.ReleaseNoteHighlight>,
 *    link: string, image: !Help.ReleaseNoteImage}}
 */
Help.ReleaseNote;
