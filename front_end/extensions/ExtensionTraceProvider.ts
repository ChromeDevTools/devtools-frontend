// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import {ExtensionServer} from './ExtensionServer.js';

export class ExtensionTraceProvider {
  _extensionOrigin: string;
  _id: string;
  _categoryName: string;
  _categoryTooltip: string;
  constructor(extensionOrigin: string, id: string, categoryName: string, categoryTooltip: string) {
    this._extensionOrigin = extensionOrigin;
    this._id = id;
    this._categoryName = categoryName;
    this._categoryTooltip = categoryTooltip;
  }

  start(session: TracingSession): void {
    const sessionId = String(++_lastSessionId);
    ExtensionServer.instance().startTraceRecording(this._id, sessionId, session);
  }

  stop(): void {
    ExtensionServer.instance().stopTraceRecording(this._id);
  }

  shortDisplayName(): string {
    return this._categoryName;
  }

  longDisplayName(): string {
    return this._categoryTooltip;
  }

  persistentIdentifier(): string {
    return `${this._extensionOrigin}/${this._categoryName}`;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _lastSessionId = 0;

/**
 * @interface
 */
export interface TracingSession {
  complete(url: string, timeOffsetMicroseconds: number): void;
}
