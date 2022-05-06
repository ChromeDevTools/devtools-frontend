// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ExtensionServer} from './ExtensionServer.js';
import type * as Platform from '../../core/platform/platform.js';

export class ExtensionTraceProvider {
  private readonly extensionOrigin: string;
  private readonly id: string;
  private readonly categoryName: string;
  private readonly categoryTooltip: string;
  constructor(extensionOrigin: string, id: string, categoryName: string, categoryTooltip: string) {
    this.extensionOrigin = extensionOrigin;
    this.id = id;
    this.categoryName = categoryName;
    this.categoryTooltip = categoryTooltip;
  }

  start(session: TracingSession): void {
    const sessionId = String(++_lastSessionId);
    ExtensionServer.instance().startTraceRecording(this.id, sessionId, session);
  }

  stop(): void {
    ExtensionServer.instance().stopTraceRecording(this.id);
  }

  shortDisplayName(): string {
    return this.categoryName;
  }

  longDisplayName(): string {
    return this.categoryTooltip;
  }

  persistentIdentifier(): string {
    return `${this.extensionOrigin}/${this.categoryName}`;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _lastSessionId = 0;

export interface TracingSession {
  complete(url: Platform.DevToolsPath.UrlString, timeOffsetMicroseconds: number): void;
}
