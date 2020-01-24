// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export class ExtensionTraceProvider {
  /**
   * @param {string} extensionOrigin
   * @param {string} id
   * @param {string} categoryName
   * @param {string} categoryTooltip
   */
  constructor(extensionOrigin, id, categoryName, categoryTooltip) {
    this._extensionOrigin = extensionOrigin;
    this._id = id;
    this._categoryName = categoryName;
    this._categoryTooltip = categoryTooltip;
  }

  /**
   * @param {!TracingSession} session
   */
  start(session) {
    const sessionId = String(++_lastSessionId);
    self.Extensions.extensionServer.startTraceRecording(this._id, sessionId, session);
  }

  stop() {
    self.Extensions.extensionServer.stopTraceRecording(this._id);
  }

  /**
   * @return {string}
   */
  shortDisplayName() {
    return this._categoryName;
  }

  /**
   * @return {string}
   */
  longDisplayName() {
    return this._categoryTooltip;
  }

  /**
   * @return {string}
   */
  persistentIdentifier() {
    return `${this._extensionOrigin}/${this._categoryName}`;
  }
}

let _lastSessionId = 0;

/**
 * @interface
 */
export class TracingSession {
  /**
   * @param {string} url
   * @param {number} timeOffsetMicroseconds
   */
  complete(url, timeOffsetMicroseconds) {
  }
}
